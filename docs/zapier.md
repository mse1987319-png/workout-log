# Zapier: email the instructor about every new workout

Lecture 3–4. Builds Zap 1 from the [implementation plan §7](implementation-plan.md#7-automation-zapier): every workout logged in the app becomes an email within about a minute. Exact button names in Zapier and Supabase change between versions; the wording below is the closest current one.

```
Log workout in the app  →  INSERT into workouts
  → Supabase Database Webhook (HTTP POST, JSON)
  → Zapier: Catch Hook → Filter (type = INSERT) → Paths
        Path A "Strength": record__type = strength → Gmail "STRENGTH: <title>"
        Fallback:          everything else         → Gmail "New workout: <title>"
```

## Before you start

- A Zapier account with the **Pro trial active**: Webhooks by Zapier and Paths do not work on the free plan (deck slide 8).
- A Gmail account to send from, and the instructor's address. For the course, that is your own Gmail.
- The app running (locally or on Vercel) with at least one plan, so you can send a sample workout.

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

In the app, log a **Strength** workout (for example *Test strength*, 30 min). In Zapier, press **Test trigger**. The request shows these fields:

| Zapier field | Example | Meaning |
|---|---|---|
| `type` | `INSERT` | The database event: INSERT or UPDATE |
| `table` | `workouts` | |
| `record__title` | `Test strength` | |
| `record__type` | `strength` | The routing field: `strength` or `other` |
| `record__duration_min` | `30` | |
| `record__user_id` | `3f6c…` | Who logged it |
| `record__plan_id` | `9a1e…` | |
| `record__created_at` | `2026-11-11T18:00:00.123+00:00` | |
| `old_record…` | (empty) | Filled only for UPDATE |

> **Watch out:** `type` (INSERT / UPDATE) and `record__type` (strength / other) are different fields. The Filter uses `type`, Paths use `record__type`. Mixing them up is the most likely first bug; if it happens, put it in the Notion error log.

## 4. Filter: new workouts only

Add **Filter by Zapier**: *Only continue if…* `Type` (the top-level field, **not** `Record Type`) **(Text) Exactly matches** `INSERT`.

## 5. Paths and Gmail

Add **Paths by Zapier** with two branches:

| Branch | Rule | Action |
|---|---|---|
| **A: Strength** | `Record Type` (Text) Exactly matches `strength` | Gmail → **Send Email** |
| **Fallback** | Set as the *Fallback* branch: it runs when path A does not match | Gmail → **Send Email** |

Gmail fields (deck slide 16):

| Field | Path A | Fallback |
|---|---|---|
| To | the instructor's address | the same |
| Subject | `STRENGTH: ` + `Record Title` | `New workout: ` + `Record Title` |
| Body | the text below | the same |

```
A new workout was logged in Workout Log.

Title: {{Record Title}}
Type: {{Record Type}}
Duration: {{Record Duration Min}} min
User id: {{Record User Id}}
Logged at: {{Record Created At}}
```

(Insert the fields with Zapier's field picker; the names in braces are how they appear there.)

Why the Fallback sends an email: deck slide 16 shows no email on the fallback branch, but deck test 2 expects "New workout: …" for `type = other`. This setup sends one (open question 2 in the plan).

## 6. Reliability (deck slide 18)

- **Error handler**: on each Gmail step, open the **⋯** menu → **Add error handler**. In the error branch, add Gmail → Send Email **to yourself**: subject `Workout Log Zap failed`, body = the error message field the handler provides.
- **Owner**: Zap settings → **Description**: `Owner: <your name>, <your email>, <date>. Emails the instructor about every new workout in Workout Log.`
- **Publish** the Zap (turn it on).

## 7. Tests

| No. | Do this | Expected |
|---|---|---|
| 2 | Log a workout with type **Other** | 1 new row in `workouts`; Zap history shows the **Fallback** path; an email *New workout: …* arrives |
| 3 | Log a **Strength** workout | Zap history shows **path A**; an email *STRENGTH: …* arrives |
| 5 | **My plans → Edit title** on a workout | Zap history shows the run **stopped by the Filter**; no email |
| Error test | Put a bad *To* address (e.g. `not-an-address`) in path A's Gmail step, log a strength workout | Zap history shows **Handled error**; the error email reaches you. Then restore the address |

Screenshots for the submission (checklist item 4): the Zap editor showing the Paths, and Zap history for tests 2 and 3.

## 8. Cost (deck slide 18)

| Per month | Zap runs | Tasks |
|---|---|---|
| 50 new workouts | 50 | **50**: one Gmail action each |
| Title edits | stopped by the Filter | 0 |
| Failed sends | error handler email | 1 per failure (the failed step itself counts as 0) |

Only successful action steps count as tasks. The trigger, Filter and Paths steps do not, and a run the Filter stops uses none ([Zapier: Tasks in Zapier](https://help.zapier.com/hc/en-us/articles/8496196837261)). Check the number against the rules from course topics 23 and 26, and write it, with the plan you are on (Pro trial / Professional) and that plan's monthly task allowance, into Notion.

## 9. Cleanup after delivery

1. Turn the Zap **off**.
2. Supabase → Database Webhooks → delete `workouts_to_zapier`.
3. Supabase → **Authentication → Users** → delete the test users. Their plans and workouts are deleted with them (`on delete cascade`).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Zapier receives nothing | Webhook on the wrong table or event, wrong URL, or the Zap is off | Check the hook in Supabase. To see what Supabase sent, run `select status_code, content, created from net._http_response order by created desc limit 10;` in the SQL Editor (kept for a few hours) |
| Every run stops at the Filter | The Filter uses `Record Type` instead of the top-level `Type` | Step 4 |
| Strength workouts go to Fallback | Path A uses `Type` instead of `Record Type`, or compares with `Strength` (the app sends lowercase `strength`) | Step 5 |
| Two emails for one workout | No Filter, so the edit (UPDATE) also emails | Step 4 |
| The email doesn't arrive | The wrong Gmail account is connected, the email is in Spam, or the Zap is off | Check Zap history first, then the Gmail connection |
