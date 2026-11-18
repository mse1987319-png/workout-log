# Zapier: email the athlete's instructor about every new workout

*English · [Lietuviškai](lt/zapier.md)*

Lecture 3–4. Builds Zap 1 from the [implementation plan §7](implementation-plan.md#7-automation-zapier): every workout logged in the app becomes an email within about a minute. Exact button names in Zapier and Supabase change between versions; the wording below is the closest current one.

```
Log workout in the app  →  INSERT into workouts
  → Supabase Database Webhook (HTTP POST, JSON)
  → Zapier: Catch Hook → Filter (type = INSERT and instructor emails exist) → Paths
        Path A "Strength": record__type = strength → Gmail "STRENGTH: <title>"
        Fallback:          everything else         → Gmail "New workout: <title>"
        Gmail "To" = record__instructor_emails (the athlete's own instructors)
```

**Who gets the email.** Not a fixed address in Zapier: the database decides. A trigger on `workouts` (and on `reports`, for Zap 2) writes the emails of every instructor the athlete shares with into the row's `instructor_emails` column, so the webhook carries them and Gmail's *To* is just that field. An athlete who shares with nobody has no recipient: the Filter stops the run, with no email and no task. Nobody can type a recipient, because only the trigger sets the column.

**Workouts logged offline (v5).** A workout logged on a phone without signal reaches the database, and so Zapier, only when the phone sends it. The email therefore arrives when the workout is *sent* (when the phone has signal again and the app is open), which can be hours after the workout. Nothing in the Zaps changes: the `INSERT`, the webhook payload and every field the Zaps use are the same as before. Three things to know:

- **`record__created_at` is the time Save was pressed on the phone** (shown as *Logged at* in the email body), as long as that was within the last 30 days and not in the future; otherwise it is the time of the send. It is the only field with a new meaning, and nothing in the Zaps depends on it: the Filter reads `type` and `record__instructor_emails`, Paths read `record__type`, and Gmail uses `record__instructor_emails`, `record__title` and the body fields.
- **The recipients are those the athlete shares with when the workout is sent**, because the trigger fills `instructor_emails` on that INSERT.
- **Exactly one email per workout**, however many times the phone retries: a repeated send finds the saved workout and inserts nothing, so there is no second INSERT, no second webhook and no second Zap run ([supabase.md](supabase.md#6-offline-logging-v5)).

Reports (Zap 2) need a connection, so they are emailed at once; offline logging covers workouts only.

## Before you start

- A Zapier account with the **Pro trial active**: Webhooks by Zapier and Paths do not work on the free plan (deck slide 8).
- A Gmail account to send from.
- The app running (locally or on Vercel) with at least one plan, so you can send a sample workout.
- The latest [`supabase/schema.sql`](../supabase/schema.sql) run in Supabase: it adds the `instructor_emails` column and its trigger (running it again is safe).
- **A Zapier global variable `ERROR_EMAIL`** holding the address that should receive failure alerts (yours): Zap editor → any *To* field → **+** → **Variables** → **Manage variables** → **Global** → **Create Global variable**, name `ERROR_EMAIL`, type Text. Both Zaps' error handlers use it, so the address lives in one place. Zapier warns against putting secrets in variables; an email address is fine.
- **A test instructor and a linked athlete.** Sign up an *instructor* with an address you can read (a Gmail alias such as `you+coach@gmail.com` works), then, as an athlete, enter that instructor's code under **Sharing**. Without that link the samples below have no recipient and the Filter stops them.

> **The Catch Hook URL is a secret.** Anyone who has it can make your Zap send email. It belongs only in the Supabase webhook settings: never in the repo, the README, Notion or a screenshot (blur it).

## 1. Trigger: Catch Hook

1. Zapier → **Create → Zaps**. Name it `Workout Log: new workout`.
2. Trigger: **Webhooks by Zapier** → event **Catch Hook** → Continue (leave *Pick off a child key* empty).
3. Copy the webhook URL (`https://hooks.zapier.com/hooks/catch/…`). Keep the tab open: **Test trigger** waits for the first request.

## 2. Supabase: Database Webhook

Supabase → **Database → Webhooks** (newer dashboards: **Integrations → Database Webhooks**). Press **Enable webhooks** if asked, then **Create a new hook**:

| Field | Value |
|---|---|
| Name | `workouts_to_zapier` |
| Table | `workouts` |
| Events | **Insert** and **Update** |
| Type | HTTP Request |
| Method | `POST` |
| URL | the Catch Hook URL |
| HTTP headers | `Content-Type: application/json` (the default) |

Why **Update** too: deck slide 15 says *Insert*, but deck test 5 expects to see the Filter stop an edit, and an edit only reaches Zapier if Update is on. The Filter (step 4) drops these runs, so they send no email and use no Zapier tasks. This is open question 3 for the lecturer in the plan.

## 3. Send a sample

In the app, as the **linked athlete**, log a **Strength** workout (for example *Test strength*, 30 min). In Zapier, press **Test trigger**. The request shows these fields:

| Zapier field | Example | Meaning |
|---|---|---|
| `type` | `INSERT` | The database event: INSERT or UPDATE |
| `table` | `workouts` | |
| `record__title` | `Test strength` | |
| `record__type` | `strength` | The routing field: `strength` or `other` |
| `record__duration_min` | `30` | |
| `record__activity` | `run` | Cardio only; may be empty |
| `record__distance_km` | `5` | Cardio only; may be empty |
| `record__notes` | `Felt easy` | May be empty |
| `record__sets_summary` | `Squat: 2 × 5 @ 100 kg; Pull-up: 3 × 8 (bodyweight)` | Strength workouts with sets; empty otherwise |
| `record__instructor_emails` | `you+coach@gmail.com` | The athlete's instructors, comma-separated: **the Gmail *To***. Empty if the athlete shares with nobody |
| `record__user_id` | `3f6c…` | Who logged it |
| `record__plan_id` | `9a1e…` | |
| `record__created_at` | `2026-11-11T18:00:00.123+00:00` | When the workout was logged: for one logged offline, the time Save was pressed (within 30 days), not the time it was sent |
| `old_record…` | (empty) | Filled only for UPDATE |

The sets themselves live in their own table (`workout_sets`), which the webhook does not watch. So that the email can list them anyway, `log_workout()` also writes a one-line summary into the workout row it inserts: `record__sets_summary`. If your Zap was set up before this field existed, log a strength workout with sets and press **Test trigger** again so Zapier learns the new field. The same goes for `record__instructor_emails`: see [Upgrading Zaps that are already published](#upgrading-zaps-that-are-already-published).

> **Watch out:** `type` (INSERT / UPDATE) and `record__type` (strength / other) are different fields. The Filter uses `type`, Paths use `record__type`. Mixing them up is the most likely first bug; if it happens, put it in the Notion error log.

## Faster: build steps 4–6 with Zapier Copilot

Zapier Copilot, the AI assistant in the Zap editor, can add the Filter, Paths and Gmail steps from a description. Either follow steps 4–6 by hand, or paste the prompts below, then **check the result against steps 4–6**. Copilot can pick the wrong field, and `type` versus `record__type` is the classic mix-up.

Before you prompt:

- **Extend the Zap you already have.** Open it and prompt Copilot there. If Copilot builds a *new* Zap, it also makes a new Catch Hook with a **new URL**, and the Supabase webhook (`workouts_to_zapier`) keeps sending to the old one. If that happens, put the new URL into the webhook (Supabase → Database Webhooks → edit).
- **Send a sample first** (step 3), so Copilot sees the real field names.
- Replace `<your email>`, `<your name>` and `<date>` **in Zapier only**, never in this repo. There is no instructor address to fill in: the recipients come from the data.
- Copilot's default *Auto-build* sets up as much as it can at once; switch to *Ask as you build* to approve each step.

**Prompt 1: Filter, Paths and both emails** (one sentence on purpose: Zapier advises combining related instructions so Copilot treats them as one task)

```text
This Zap's trigger is a Webhooks by Zapier Catch Hook that receives Supabase Database Webhook events for the "workouts" table, where the top-level field "type" is INSERT or UPDATE and the row is under "record" (Record Title = record__title, Record Type = record__type, plus record__duration_min, record__user_id, record__instructor_emails and record__created_at); keep this trigger and after it add a Filter by Zapier step that only continues when BOTH the top-level "type" field exactly matches INSERT (not record__type) AND record__instructor_emails exists, then add Paths by Zapier with two branches: path A named "Strength", whose rule is that record__type exactly matches strength (lowercase) and which uses Gmail to send an email to record__instructor_emails with the subject "STRENGTH: " followed by record__title, and a second branch set as the Fallback path, which runs whenever path A does not match and uses Gmail to send an email to record__instructor_emails with the subject "New workout: " followed by record__title; in both emails the body lists the title, type, duration in minutes, the sets (record__sets_summary), user id and created-at time from the record.
```

**Prompt 2: error handlers** (deck slide 18)

```text
For each of the two Gmail "Send Email" steps, add an error handler that uses Gmail to send an email to the global variable ERROR_EMAIL (pick it from Variables, do not type an address) with the subject "Workout Log Zap failed" and the error message in the body, so that a failed send shows up as a handled error in Zap history.
```

If Copilot can't add error handlers, add them by hand (step 6).

**Prompt 3: name and owner** (deck slide 18)

```text
Rename this Zap to "Workout Log: new workout" and set its description to "Owner: <your name>, <your email>, <date>. Emails the instructor about every new workout in Workout Log."
```

If Copilot can't change these, set them in the Zap's settings.

**Prompt 4: add the sets to a Zap you already built**

```text
In both Gmail "Send Email" steps, add a line to the body that reads "Sets: " followed by record__sets_summary (Record Sets Summary), right after the duration line.
```

**Prompt 5: send to the athlete's own instructors, in a Zap you already built** (see [Upgrading](#upgrading-zaps-that-are-already-published))

```text
In the Filter step, keep the rule "type (Text) exactly matches INSERT" and add a second rule joined with AND: "record__instructor_emails (Record Instructor Emails) exists". Then, in both Gmail "Send Email" steps, replace the To field with the record__instructor_emails field (Record Instructor Emails) instead of a typed address.
```

**If the check finds a mistake**, these fix-up prompts target the usual ones:

```text
The Filter must use the top-level "type" field (INSERT or UPDATE), not record__type: change its rule to "type (Text) exactly matches INSERT".
```

```text
Path A must use record__type, not the top-level "type" field: change its rule to "record__type (Text) exactly matches strength", in lowercase.
```

```text
Make the second branch of the Paths step the Fallback path, so that it runs whenever path A's rule does not match.
```

**Check what Copilot built**, then publish and run the tests in step 7:

| Step | Must be |
|---|---|
| Filter | top-level `Type` exactly matches `INSERT` **and** `Record Instructor Emails` exists |
| Path A "Strength" | `Record Type` exactly matches `strength` → Gmail, subject `STRENGTH: ` + `Record Title` |
| Fallback | set as the *Fallback* branch → Gmail, subject `New workout: ` + `Record Title` |
| Gmail *To* | the `Record Instructor Emails` field (not a typed address), in both paths |
| Error handlers | on both Gmail steps (step 6), *To* = the `ERROR_EMAIL` variable |

## 4. Filter: new workouts only

Add **Filter by Zapier**: *Only continue if…*

| | Rule |
|---|---|
| 1 | `Type` (the top-level field, **not** `Record Type`) **(Text) Exactly matches** `INSERT` |
| **AND** 2 | `Record Instructor Emails` **(Text) Exists** |

Rule 2 stops the workouts of an athlete who shares with nobody: there is no one to email, and without the rule Gmail would fail on an empty *To*.

## 5. Paths and Gmail

Add **Paths by Zapier** with two branches:

| Branch | Rule | Action |
|---|---|---|
| **A: Strength** | `Record Type` (Text) Exactly matches `strength` | Gmail → **Send Email** |
| **Fallback** | Set as the *Fallback* branch: it runs when path A does not match | Gmail → **Send Email** |

Gmail fields (deck slide 16):

| Field | Path A | Fallback |
|---|---|---|
| To | `Record Instructor Emails` | the same |
| Subject | `STRENGTH: ` + `Record Title` | `New workout: ` + `Record Title` |
| Body | the text below | the same |

```
A new workout was logged in Workout Log.

Title: {{Record Title}}
Type: {{Record Type}}
Duration: {{Record Duration Min}} min
Sets: {{Record Sets Summary}}
User id: {{Record User Id}}
Logged at: {{Record Created At}}
```

(Insert the fields with Zapier's field picker; the names in braces are how they appear there. For *To*, pick `Record Instructor Emails` from the picker and type nothing else. Several instructors arrive as one comma-separated value, which Gmail accepts.)

Why the Fallback sends an email: deck slide 16 shows no email on the fallback branch, but deck test 2 expects "New workout: …" for `type = other`. This setup sends one (open question 2 in the plan).

## 6. Reliability (deck slide 18)

- **Error handler**: on each Gmail step, open the **⋯** menu → **Add error handler**. In the error branch, add Gmail → Send Email **to yourself**: *To* = the global variable `ERROR_EMAIL` (data picker → **Variables** → **Global**), subject `Workout Log Zap failed`, body = the error message field the handler provides.
- **Owner**: Zap settings → **Description**: `Owner: <your name>, <your email>, <date>. Emails the instructor about every new workout in Workout Log.`
- **Publish** the Zap (turn it on).

## 7. Tests

| No. | Do this | Expected |
|---|---|---|
| 2 | Log a workout with type **Other** | 1 new row in `workouts`; Zap history shows the **Fallback** path; an email *New workout: …* arrives |
| 3 | Log a **Strength** workout | Zap history shows **path A**; an email *STRENGTH: …* arrives |
| 5 | **My plans → Edit title** on a workout | Zap history shows the run **stopped by the Filter**; no email |
| Error test | In path A's Gmail step, replace the `Record Instructor Emails` field in *To* with a bad address (e.g. `not-an-address`), log a strength workout | Zap history shows **Handled error**; the error email reaches you. Then put the `Record Instructor Emails` field back |
| Recipient 1 | Log a workout as an athlete linked to instructor X | The email goes to X and to nobody else |
| Recipient 2 | Link the athlete to a second instructor Y, then log a workout | One email, addressed to X and Y |
| Recipient 3 | **Sharing → Stop sharing** with everyone, then log a workout | Zap history shows the run **stopped by the Filter**; no email, no task |
| Offline (v5) | On the preview or `npm run preview`, set DevTools → Network to **Offline**, log a workout, wait a minute, then set the network back to **No throttling** | No Zap run while offline. Once the workout is sent, **one** run and one email; *Logged at* shows the time Save was pressed ([pwa.md](pwa.md#7-testing-it-offline)) |

Screenshots for the submission (checklist item 4): the Zap editor showing the Paths, and Zap history for tests 2 and 3.

## 8. Cost (deck slide 18)

| Per month | Zap runs | Tasks |
|---|---|---|
| 50 new workouts (athletes linked) | 50 | **50**: one Gmail action each, however many instructors are in *To* |
| Title edits | stopped by the Filter | 0 |
| Workouts of athletes who share with nobody | stopped by the Filter | 0 |
| Failed sends | error handler email | 1 per failure (the failed step itself counts as 0) |

Only successful action steps count as tasks. The trigger, Filter and Paths steps do not, and a run the Filter stops uses none ([Zapier: Tasks in Zapier](https://help.zapier.com/hc/en-us/articles/8496196837261)). Check the number against the rules from course topics 23 and 26, and write it, with the plan you are on (Pro trial / Professional) and that plan's monthly task allowance, into Notion.

## 9. Cleanup after delivery

1. Turn the Zap **off**.
2. Supabase → Database Webhooks → delete `workouts_to_zapier`.
3. Supabase → **Authentication → Users** → delete the test users. Their plans and workouts are deleted with them (`on delete cascade`).

## Zap 2: progress reports (Extended)

When an athlete presses **Send report to instructor** on the Progress screen, the database function `send_report()` stores a row in `reports`: their own numbers for the last 7 days, at most one report per 5 minutes. A second Database Webhook sends that row to Zap 2, which emails the athlete's instructors. As in Zap 1, a trigger puts their addresses into the row (`record__instructor_emails`); no instructor address is stored in Zapier.

1. **Trigger:** Zapier → **Create → Zaps**, name it `Workout Log: progress report`. Trigger: **Webhooks by Zapier → Catch Hook**; copy the URL (a secret, like Zap 1's).
2. **Supabase:** **Database Webhooks → Create a new hook**. Name `reports_to_zapier`, table `reports`, events **Insert** only (reports are never edited), `POST` to the Catch Hook URL.
3. **Sample:** in the app, send a report; in Zapier press **Test trigger**. The fields:

   | Zapier field | Example |
   |---|---|
   | `record__athlete_email` | `athlete@example.com` |
   | `record__instructor_emails` | `you+coach@gmail.com` (empty if the athlete shares with nobody) |
   | `record__period_start`, `record__period_end` | `2026-11-06`, `2026-11-12` |
   | `record__summary` | `Nov 6 – Nov 12: 4 workouts (3 strength, 1 other), 215 min, 42 sets. Heaviest: Squat 110 kg.` |
   | `record__stats__workouts`, `record__stats__minutes`, `record__stats__sets`, … | the numbers behind the summary |

4. **Filter** (right after the trigger): `Type` exactly matches `INSERT` **and** `Record Instructor Emails` exists. Then **Gmail → Send Email:** To = `Record Instructor Emails`; Subject = `Progress report: ` + `Record Athlete Email` + ` (` + `Record Period Start` + ` – ` + `Record Period End` + `)`; Body = `Record Summary`.
5. **AI summary (optional bonus, deck slide 4):** before the Gmail step, add an AI step (for example **AI by Zapier** or **ChatGPT**) with the prompt *"Write a short, encouraging note (3–4 sentences) for a fitness instructor about this athlete's week. Use only these numbers: {{Record Summary}}"*, and put its output above the numbers in the email body. The AI key stays in Zapier, never in the app or the repo.
6. **Reliability:** an error handler on the Gmail step (*To* = the `ERROR_EMAIL` variable, subject `Workout Report Zap failed`), the owner in the Zap description, then **Publish**.

**Cost:** 1 task per report (2 with the AI step). With a report per athlete per week, that is about 4 tasks a month per athlete.

**Copilot prompt** (in the new Zap, after creating the Catch Hook trigger):

```text
This Zap's trigger is a Webhooks by Zapier Catch Hook that receives Supabase Database Webhook events for the "reports" table, with the row under "record" (record__athlete_email, record__period_start, record__period_end, record__summary); keep this trigger and after it add a Filter by Zapier step that only continues when the top-level "type" field exactly matches INSERT AND record__instructor_emails exists, then a Gmail "Send Email" step to record__instructor_emails with the subject "Progress report: " followed by record__athlete_email and the period from record__period_start to record__period_end, and record__summary as the body.
```

## Upgrading Zaps that are already published

Zaps built before the `instructor_emails` column mailed one fixed address typed into Gmail's *To*. To send to each athlete's own instructors instead, do this once. **No new Zap, no new Catch Hook URL, and nothing changes in Supabase's webhooks.**

**0. Create `ERROR_EMAIL` (once).** See *Before you start*. One global variable serves all three error handlers, so changing where alerts go is one edit under **Manage variables → Global**, not three.

**1. Database (once).** Supabase → SQL Editor: run the *Who gets the email* block at the end of [`supabase/schema.sql`](../supabase/schema.sql) (or the whole file; it is safe to run again). Optionally run [`supabase/tests/instructor_emails.test.sql`](../supabase/tests/instructor_emails.test.sql): it must end with *TESTS PASSED*.

**2. Teach Zapier the new field.** As the linked athlete, log a workout (Zap 1) and send a report (Zap 2). In each Zap, open the trigger → **Test** → **Find new records**, so the sample shows `Record Instructor Emails`. Without this the field is missing from the field picker.

**3. Change the Zaps.**

| Zap | Step | Change |
|---|---|---|
| **Zap 1** `Workout Log: new workout` | Filter | Keep `Type` exactly matches `INSERT`; **add** an AND rule: `Record Instructor Emails` **Exists** |
| | Path A "Strength" → Gmail | *To*: delete the typed address, insert the `Record Instructor Emails` field |
| | Fallback → Gmail | The same *To* change |
| | Error handlers (steps 6 and 9) | *To*: delete the typed address, insert the global variable `ERROR_EMAIL` (data picker → **Variables** → **Global**) |
| **Zap 2** `Workout Log: progress report` | Filter | **Add** a Filter after the trigger: `Type` exactly matches `INSERT` **and** `Record Instructor Emails` **Exists** (the report webhook is Insert only, but the field must exist) |
| | Gmail | *To*: delete the typed address, insert `Record Instructor Emails` |
| | Error handler (step 4) | *To*: delete the typed address, insert the global variable `ERROR_EMAIL` |
| | AI step | No change |

Copilot can do the Zap 1 and Zap 2 changes from **Prompt 5** and the Zap 2 prompt above; check the result against the tables in steps 4–5. Publish both Zaps again.

**4. Check.** Run the *Recipient 1–3* tests in step 7 and the report test: the email must reach the instructor the athlete is linked to, and nobody else.

**Behaviour to know.**

- A **new** webhook payload decides: the recipients are those the athlete shared with *when the workout reached the database (for one logged offline, when it was sent) or the report was sent*. Linking later does not resend old workouts.
- An athlete who shares with nobody gets **no** email any more (before: it went to the fixed address). That is intended: sharing is the athlete's choice.
- With several instructors, one email goes to all of them (they see each other's addresses). One Gmail task, not one per instructor.
- The two demo instructors' addresses end in `@example.com`, so mail to them bounces. To see real delivery, sign up an instructor with an address you can read and link a demo athlete to them under **Sharing**.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every run stops at the Filter, although the type is INSERT | `record__instructor_emails` is empty: the athlete is not linked to an instructor, or `schema.sql` was not re-run so the column is never filled | Link the athlete under **Sharing**; in Supabase, `select instructor_emails from workouts order by created_at desc limit 5;` |
| `Record Instructor Emails` is missing from the field picker | Zapier's sample predates the column | Log a workout as a linked athlete and **Test trigger** again |
| The email goes to the old fixed address | *To* still holds the typed address | Replace it with the `Record Instructor Emails` field (step 5) |
| Gmail fails with *Invalid To header* | An instructor's account email is malformed, or the field was typed as text instead of picked | Re-pick the field; check `profiles.email` |
| Zapier receives nothing | Webhook on the wrong table or event, wrong URL, or the Zap is off | Check the hook in Supabase. To see what Supabase sent, run `select status_code, content, created from net._http_response order by created desc limit 10;` in the SQL Editor (kept for a few hours) |
| Every run stops at the Filter | The Filter uses `Record Type` instead of the top-level `Type` | Step 4 |
| Strength workouts go to Fallback | Path A uses `Type` instead of `Record Type`, or compares with `Strength` (the app sends lowercase `strength`) | Step 5 |
| Two emails for one workout | No Filter, so the edit (UPDATE) also emails | Step 4 |
| The email doesn't arrive | The wrong Gmail account is connected, the email is in Spam, or the Zap is off | Check Zap history first, then the Gmail connection |
| The email for a workout arrives hours after the workout | It was logged without signal and sent later | Expected: the email goes out when the phone sends the workout. *Logged at* shows when Save was pressed. A workout still marked *Waiting to send* in the app hasn't been sent yet |

## Related

[supabase.md](supabase.md) (the webhooks, `instructor_emails`, and exactly-once saving in [section 6](supabase.md#6-offline-logging-v5)) · [pwa.md](pwa.md) (logging offline and sending later) · [architecture.md](architecture.md#4-data-flows) (how a workout becomes an email) · [deployment.md](deployment.md) (Vercel) · [setup.md](setup.md) (local setup)
