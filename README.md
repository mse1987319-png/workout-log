# Workout Log

A web workout log. Athletes follow workout plans (their own, or ones an instructor assigned to them), log strength and cardio sessions, and the instructor is emailed automatically about every new workout.

Capstone project for the course *"The full cycle from idea to live product"*: one app that runs online, stores data, separates users, and reports every important event by email.

> **Status: planning.** The product scope and implementation plan are written; the app itself is not scaffolded yet (`index.js` is a placeholder). See [docs/implementation-plan.md](docs/implementation-plan.md).

## How it works

```
browser (React + Vite)
   │  supabase-js, anon key
   ▼
Supabase  (Auth + tables + RLS)
   │  Database Webhook: INSERT into workouts
   ▼
Zapier  (Catch Hook → Filter → Paths)
   ├─ Path A, type = strength → Gmail "STRENGTH: <title>"
   └─ Fallback, type = other  → Gmail "New workout: <title>"

Code path (separate): GitHub → Vercel → public URL
```

- **Users:** sign-up and login; every user sees only their own data (Row Level Security).
- **Data:** table A `plans` and table B `workouts` (`plan_id → plans.id`).
- **Event:** a logged workout is one `INSERT` into `workouts`.
- **Routing field:** `workouts.type` is `strength` or `other` (cardio, mobility, etc.); Zapier Paths picks the email path from it.

## Stack

| Part | Tool |
|---|---|
| Code | GitHub (feature branches + pull requests) |
| Interface | React + Vite, JavaScript |
| Data and auth | Supabase (Auth, 2 tables, RLS) |
| Deployment | Vercel |
| Automation | Zapier (Webhook → Filter → Paths → Gmail) |
| Documentation | Notion + this README |

## Environment variables

Names only; never commit values. Create `.env.local` yourself (it is git-ignored) and set the same two variables in Vercel.

| Variable | Where to get it | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API | No |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Safe only with RLS enabled |

The Supabase `service_role` key and the Zapier Catch Hook URL must **never** go into the app, Vercel or this repo.

## Repository layout

```
docs/implementation-plan.md   high-level plan: scope tiers, data model, Zapier, test table
_task/                        course task decks (LT / EN) and the prompts used to scope the idea
index.js, package.json        placeholder; the Vite app is added in lecture 1
```

## Roadmap

Built in four lectures, one `feature/…` branch and pull request per feature:

1. **Foundation:** scope card, Notion page, repo, Vite app, Supabase project and tables.
2. **Users and interface:** Auth, 3 screens with 4 states (loading, error, empty, success), RLS.
3. **Deployment and automation:** Vercel with env vars, Supabase webhook, Zap with Filter and Paths, Gmail.
4. **Verification and presentation:** test table, error handling, README and Notion, 5-minute demo.

Extended ideas (exercises/sets/reps, instructor role, plan assignment, progress reports by email, charts) are tracked in the implementation plan.
