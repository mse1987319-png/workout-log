# Supabase setup

What to click in the Supabase dashboard so the app works: tables and Row Level Security, sign-up settings, and redirect URLs. About 10 minutes. Exact menu names change between dashboard versions; the wording below is the closest current one.

The Database Webhook to Zapier is a separate step in lecture 3: [zapier.md](zapier.md).

## 1. Tables and policies

1. Supabase → your project → **SQL Editor** → **New query**.
2. Paste the whole of [`supabase/schema.sql`](../supabase/schema.sql) and press **Run**.
   Expected: `Success. No rows returned`. Running it again later is safe.
3. Check:
   - **Table Editor** lists `plans` and `workouts`.
   - **Authentication → Policies** (or **Database → Policies**) shows RLS **enabled** on both tables, with 4 policies each:

     | Table | Policies |
     |---|---|
     | `plans` | Read own plans · Add own plans · Edit own plans · Delete own plans |
     | `workouts` | Read own workouts · Add workouts to own plans · Edit own workouts · Delete own workouts |

4. Take the submission screenshots now (checklist item 3): the Table Editor with both tables, and the Policies page.

What the schema does, in short:

| | `plans` (table A) | `workouts` (table B) |
|---|---|---|
| Key fields | `name`, `goal` | `plan_id → plans.id`, `title`, `type`, `duration_min` |
| `user_id` | `default auth.uid()`; the app never sends it | same |
| Checks | name 1–100 characters | `type` is `strength` or `other`; duration 1–1440 min |
| RLS | `user_id = auth.uid()` for select, insert, update, delete | same, and a workout can only be filed under one of your own plans |

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
2. **Log workout** → create a plan → log a workout.
   Expected: *Workout saved*. In the Table Editor, both new rows carry user A's id in `user_id`.
3. **Log out**. In a private/incognito window, sign up as user B.
   Expected: user B sees the Empty state, with nothing of user A's. *(Test 4: RLS works)*
4. The Table Editor shows everyone's rows. That's expected: the dashboard works as an admin and bypasses RLS. The app never does.

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
