# Supabase setup

*English · [Lietuviškai](lt/supabase.md)*

What to click in the Supabase dashboard so the app works: tables and Row Level Security, sign-up settings, and redirect URLs. About 10 minutes. Exact menu names change between dashboard versions; the wording below is the closest current one.

The Database Webhook to Zapier is a separate step in lecture 3: [zapier.md](zapier.md).

## 1. Tables and policies

1. Supabase → your project → **SQL Editor** → **New query**.
2. Paste the whole of [`supabase/schema.sql`](../supabase/schema.sql) and press **Run**.
   Expected: `Success. No rows returned`. Running it again later is safe.
3. **Demo data** (recommended for a new project): **New query** → paste the whole of [`supabase/seed.sql`](../supabase/seed.sql) → **Run**.
   - **What it adds:** on an empty project, the three demo accounts from the [README](../README.md#demo-accounts) (password `WorkoutLog-demo-2026`). They come with plans, workouts and sets, goals, a progress report, and instructor sharing.
   - **Dates:** they count back from today, so the charts and suggestions look current.
   - **Safe to re-run:** if the project already has users, it changes nothing.
   - **No emails:** if the Zapier webhooks already exist, they're switched off while it runs.
4. Check:
   - **Table Editor** lists `plans`, `workouts`, `workout_sets`, `reports`, `goals`, `profiles`, `instructor_links` and `plan_assignments`.
   - **Authentication → Policies** (or **Database → Policies**) shows RLS **enabled** on all eight tables, with these policies:

     | Table | Policies |
     |---|---|
     | `plans` | Read own plans · Add own plans · Edit own plans · Delete own plans · *Read plans assigned to me* |
     | `workouts` | Read own workouts · Add workouts to own plans · Edit own workouts · Delete own workouts · *Add workouts to assigned plans* · *Edit own workouts on assigned plans* |
     | `workout_sets` | Read own sets · Add sets to own workouts · Edit own sets · Delete own sets |
     | `reports` | Read own reports (no write policy: only `send_report()` writes) |
     | `goals` | Read own goals · Add own goals · Edit own goals · Delete own goals |
     | `profiles` | Read own profile (no write policy: a trigger creates it at sign-up) |
     | `instructor_links` | Read own links · End own links (no insert policy: only `link_instructor()` links) |
     | `plan_assignments` | Read own assignments · Assign own plans to own athletes · Unassign own assignments |

     The policies in *italics* are the additive sharing policies (see **Instructor sharing** below).

5. Take the submission screenshots now (checklist item 3): the Table Editor with both tables, and the Policies page.

What the schema does, in short:

| | `plans` (table A) | `workouts` (table B) | `workout_sets` (Extended) |
|---|---|---|---|
| Key fields | `name`, `goal` | `plan_id → plans.id`, `title`, `type`, `duration_min`; optional `activity`, `distance_km`, `notes`, `sets_summary` | `workout_id → workouts.id`, `exercise`, `set_no`, `reps`, `weight_kg` |
| `user_id` | `default auth.uid()`; the app never sends it | same | same |
| Checks | name 1–100 characters | `type` is `strength` or `other`; duration 1–1440 min; `activity` is run/bike/swim/walk/row/other | reps 1–1000; weight 0–1000 kg (0 = bodyweight); up to 100 sets per workout |
| RLS | `user_id = auth.uid()` for select, insert, update, delete | same, and a workout can only be filed under one of your own plans | same, and sets can only be added to your own workouts |

The app saves a workout through the database function **`log_workout()`**: the workout and its sets in one transaction, as the signed-in user (so every policy above applies). The INSERT into `workouts` still fires the Database Webhook once per workout; if anything fails, nothing is saved and nothing is sent. Because the webhook only sees the workout row, `log_workout()` also writes a one-line summary of the sets into it (`sets_summary`, built by **`format_sets()`**), so the instructor's email can list them. Since v5 the function can also take the workout's id and time from the phone, so a workout logged offline is saved exactly once: see [section 6](#6-offline-logging-v5).

[`supabase/tests/sets_summary.test.sql`](../supabase/tests/sets_summary.test.sql) tests both functions. Paste it into the SQL Editor and run it: it always ends with an error that rolls everything back, reading *TESTS PASSED (…)* when all is well, so it never saves a workout or sends an email.

**Progress reports.** **`report_stats(days)`** returns the caller's numbers for the last 7 calendar days with a one-line summary (the app's preview). **`send_report()`** is the only way to create a row in `reports`: it stores the caller's own numbers and email, at most once per 5 minutes, and the INSERT fires the second Database Webhook (`reports_to_zapier`, Zap 2 in [zapier.md](zapier.md#zap-2-progress-reports-extended)). [`supabase/tests/reports.test.sql`](../supabase/tests/reports.test.sql) tests both, the same rolled-back way.

**Who gets the emails.** `workouts` and `reports` have an `instructor_emails` column: the emails of every instructor the athlete shares with (comma-separated), or empty if there is none. The trigger `set_instructor_emails()` fills it on every INSERT, before the webhook fires, so the Zap's Gmail *To* is just that field and no instructor address is stored in Zapier. The column can't be set from the app (the trigger overwrites it) and an edit keeps the original value. [`supabase/tests/instructor_emails.test.sql`](../supabase/tests/instructor_emails.test.sql) tests this, the same rolled-back way. Existing Zaps need a small change: [zapier.md](zapier.md#upgrading-zaps-that-are-already-published).

**Goals.** `goals` holds an exercise, a target weight (`target_kg`, more than 0 and up to 1000) and a date (`target_date`), with the same four owner-only policies as `plans`. Whether a goal is reached or overdue is worked out in the app from `workout_sets`, so no column has to be kept up to date. The suggestions on the Progress screen are worked out in the browser too, from the same data. [`supabase/tests/goals.test.sql`](../supabase/tests/goals.test.sql) tests the policies and the checks, the same rolled-back way.

**Instructor sharing.** The roles and links work like this:
- **Roles.** Each user has a **profile** with the role chosen on the sign-up form (`athlete` or `instructor`). The trigger `on_auth_user_created` creates it; users who signed up earlier became athletes. Instructors get a 6-character **invite code**.
- **Linking.** An athlete shares by typing that code (`link_instructor()`), and either side can end the link.

What a linked instructor can read:
- **Through two functions only.** `my_athletes()` and `athlete_progress()` are `security definer` functions that first check the link with `is_my_athlete()`.
- **Tables unchanged.** `workouts`, `workout_sets`, `goals` and `reports` keep their *own rows only* policies, so an instructor's own screens never mix in athletes' rows. The "RLS, not filters in React" rule still holds.
- **The one widening is additive.** An instructor assigns their own plan to athletes who share with them (`plan_assignments`). An athlete can then read that plan and log their own workouts under it. The owner policies above are untouched, because permissive policies are OR-ed.

[`supabase/tests/sharing.test.sql`](../supabase/tests/sharing.test.sql) checks all of this, rolled back. It creates a test instructor inside the transaction.

To make an **existing** account an instructor (the role is normally chosen at sign-up), run this in the SQL Editor with its email:

```sql
update public.profiles set role = 'instructor', invite_code = public.new_invite_code()
where email = 'coach@example.com';
-- the app's menu reads the role from the user's metadata:
update auth.users set raw_user_meta_data = raw_user_meta_data || '{"role": "instructor"}'
where email = 'coach@example.com';
```

## 2. Sign-up without email confirmation

**Authentication → Sign In / Providers** (older dashboards: **Providers → Email**):

- **Email** provider: enabled.
- **Confirm email**: **off**.

Why: Supabase's built-in mailer only delivers to members of your Supabase organization, at about 2 emails per hour. Any other test user (deck tests 1 and 4, the incognito test) would never receive the confirmation link and could not log in.

Trade-off: anyone can sign up with an address they don't own. That is acceptable for a course demo. To keep confirmation on, set up your own SMTP server under **Authentication → Emails → SMTP Settings**. The app already handles both settings: with confirmation on, sign-up shows "Check your email…".

The minimum password length stays at Supabase's default of 6; the app checks the same rule before sending.

## 3. URL configuration

**Authentication → URL Configuration**:

| Setting | Now (local) | After deployment (lecture 3) |
|---|---|---|
| Site URL | `http://localhost:5173` | your Vercel URL, e.g. `https://workout-log.vercel.app` |
| Redirect URLs | `http://localhost:5173/**` | add `https://<your-app>.vercel.app/**` |

These matter for links in Supabase emails (password reset, or confirmation if you turn it back on). Without the Vercel entries, those links send users to localhost (deck slide 20).

## 4. Connect the app

Put the two values into `.env.local` (see [setup.md](setup.md#environment-variables)):

| Variable | Where in Supabase |
|---|---|
| `VITE_SUPABASE_URL` | **Project Settings → Data API** (Project URL) |
| `VITE_SUPABASE_ANON_KEY` | **Project Settings → API Keys**: the *publishable* key (older projects: the `anon` key) |

Restart `npm run dev` after editing `.env.local`.

## 5. Check it (deck tests 1 and 4)

1. Open `http://localhost:5173`, choose **Create an account** and sign up as user A.
   Expected: you land on **My plans** with *No plans yet — create your first plan.* (the Empty state). **Authentication → Users** lists user A. *(Test 1)*
2. **My plans → New plan** → create a plan, then **+ Log workout** on its card → log a workout.
   Expected: *Workout saved*. In the Table Editor, both new rows carry user A's id in `user_id`.
3. **Log out**. In a private/incognito window, sign up as user B.
   Expected: user B sees the Empty state, with nothing of user A's. *(Test 4: RLS works)*
4. The Table Editor shows everyone's rows. That's expected: the dashboard works as an admin and bypasses RLS. The app never does.

## 6. Offline logging (v5)

v5 makes Logify a phone app that works without signal ([pwa.md](pwa.md)). A workout logged offline is kept on the phone and sent later, so the database has to save it **exactly once** and put it on the day it was logged, however many times the phone repeats the send. Two things change in `supabase/schema.sql`:

**`log_workout()` gets two optional parameters** (after the existing eight):

| Parameter | What it does |
|---|---|
| `p_id uuid` | The workout's id, made on the phone. If this user already has a workout with that id, the function **returns it and inserts nothing**: no second row, no second set, no second webhook, no second email. If two sends race, the second hits the primary key (error `23505`); the app then tries again, and the function finds the workout and returns it |
| `p_logged_at timestamptz` | When Save was pressed. It becomes the workout's `created_at` (and its sets' `created_at`) if it is within the last 30 days and not in the future; otherwise the server's time is used. So a workout sent hours later still lands on the right day in the charts and *Last time* |

Both default to `null`, so the call the app made before v5 (eight named parameters) still works unchanged: the live app on `main` is unaffected. `schema.sql` drops the old eight-parameter version first, because PostgREST can't choose between two versions that both match a call; it keeps the grants (only `authenticated` may call it) and stays safe to re-run.

**`schema_version()`** is a new function that returns `5`. It is callable by `anon` and `authenticated`. The app asks it once per start to learn whether the database is current; an older database doesn't have it ("function not found"), and the app then shows a warning and sends the old way ([pwa.md](pwa.md#5-the-older-database-warning)).

[`supabase/tests/log_workout_offline.test.sql`](../supabase/tests/log_workout_offline.test.sql) tests all of this, rolled back like the others. It checks that:

- `schema_version()` returns 5;
- the id and time from the phone are kept, on the workout and on its sets;
- the same id sent twice gives one workout, one set of sets and one webhook request;
- a time in the future, or more than 30 days old, is replaced by the server's time;
- an old-style call (no `p_id`, no `p_logged_at`) still works.

It needs at least one plan in the project (the seed data has them); on an empty project it checks `schema_version()` and says so.

### Applying v5 to an existing project

Your project already has the tables, so there is nothing to recreate:

1. Supabase → **SQL Editor** → **New query**, paste the whole of [`supabase/schema.sql`](../supabase/schema.sql) and press **Run**. It is re-runnable, and it applies the v5 block: the old `log_workout()` is replaced by the new one and `schema_version()` is added.
2. **New query** → paste the whole of [`supabase/tests/log_workout_offline.test.sql`](../supabase/tests/log_workout_offline.test.sql) → **Run**. Expected: an error ending in *TESTS PASSED (…)*, which is the test rolling itself back. Run the other tests in `supabase/tests` the same way if you want to check everything (there are seven test files).
3. Check the version: `select public.schema_version();` returns `5`. Reload the app; the older-database warning is gone once the app learns the version is 5.

**This is safe for an app that is already live.** The new parameters are optional, so the call the app sends today still matches, and nothing else the app uses changes (tables, policies, triggers and the webhooks are untouched). Apply the database first and merge the code afterwards: see [Releasing v5](deployment.md#7-releasing-v5). The Supabase project behind the live demo is already on v5.

> **Do not run `main`'s old `schema.sql` on a v5 database.** A `schema.sql` from before v5 is the pre-v5 one: `main`'s own until `release/v5` is merged, and any older checkout or pasted copy afterwards. It creates the eight-parameter `log_workout()` next to the v5 one, and calls with the eight original parameters then fail with `PGRST203`. The fix is in the [troubleshooting table](#troubleshooting) below.

If you skip this step, a v5 app still works against the older database, with a warning: workouts logged offline get the time they are sent, and after a dropped connection one could be saved twice.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Could not find the table 'public.plans' in the schema cache` | `schema.sql` was not run, or ran in a different project | Run it in the project your `.env.local` points to |
| The list is empty although rows exist | The rows belong to another user (RLS), or `user_id` is empty | Compare `user_id` in the Table Editor with the user's id under **Authentication → Users** |
| "You don't have permission to do that." when saving | The insert policy is missing | Run `schema.sql` again |
| Sign-up says "Check your email…" | **Confirm email** is still on | Step 2 |
| "Too many attempts. Wait a few minutes…" | Supabase's auth rate limit | Wait, or turn **Confirm email** off (step 2) |
| "Can't reach the server…" after ~7 s | Wrong `VITE_SUPABASE_URL`, or offline. The client retries 3 times before showing the error | Fix `.env.local`, restart `npm run dev` |
| "The app is not set up yet…" | A variable is missing or still a placeholder | Fill in `.env.local`, restart `npm run dev` |
| The line under the header says the database is *an older version than this app* | `schema.sql` has not been re-run since v5 | [Applying v5 to an existing project](#applying-v5-to-an-existing-project) |
| Calls to `log_workout()` fail with `PGRST203` (*Could not choose the best candidate function between…*), or the SQL Editor says *function public.log_workout(…) is not unique* | There are two versions of `log_workout()`, for example because an older `schema.sql` was run on a v5 database: a call with the eight original parameters matches both | Run `drop function public.log_workout(uuid, text, text, integer, text, numeric, text, jsonb);`, then run the v5 `schema.sql` again. The v5 test (`supabase/tests/log_workout_offline.test.sql`) detects this state: it stops with that error instead of ending in *TESTS PASSED* |

## Related

[architecture.md](architecture.md) (ERD, who may read what, and the phone side in [section 7](architecture.md#7-mobile-architecture-pwa)) · [pwa.md](pwa.md) (the phone app, and what the older-database warning means) · [deployment.md](deployment.md#7-releasing-v5) (releasing v5: the database first) · [setup.md](setup.md) (local setup) · [zapier.md](zapier.md) (the webhooks and emails)
