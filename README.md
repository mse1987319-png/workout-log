# Workout Log

A web workout log. Athletes follow workout plans (their own, or ones an instructor assigned to them), log strength and cardio sessions, and the instructor is emailed automatically about every new workout.

Capstone project for the course *"The full cycle from idea to live product"*: one app that runs online, stores data, separates users, and reports every important event by email.

> **Status: Core tier live.** Sign-up/login, the plans list and workout logging run on Vercel against Supabase, and a Supabase Database Webhook sends every new or edited workout to Zapier. Still to do: confirm the Zap's paths and emails, the reliability checks (error handler, cost) and the demo.
>
> **Live:** https://workout-log-murex-three.vercel.app/

## What it does

- **Accounts**: sign up and log in with email and password. Every user sees only their own plans and workouts, enforced in the database with Row Level Security.
- **My plans** (list): each plan (table A) with the workouts (table B) logged under it; a workout's title can be edited.
- **Log workout** (create): create a plan; log a workout under a plan with title, type (`strength` / `other`) and duration.
- **Email to the instructor**: each new workout → Supabase Database Webhook → Zapier → Gmail. Strength workouts arrive as *STRENGTH: title*, others as *New workout: title*.
- **Four states** on every screen that loads or saves: Loading, Error (plain language, with *Try again*), Empty, Success.

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

- **Data**: table A `plans` → table B `workouts` (`plan_id → plans.id`), defined in [`supabase/schema.sql`](supabase/schema.sql).
- **Event**: a logged workout is one `INSERT` into `workouts`.
- **Routing field**: `workouts.type` is `strength` or `other` (cardio, mobility, etc.); Zapier Paths picks the email from it.

## Stack

| Part | Tool |
|---|---|
| Code | GitHub (feature branches + pull requests) |
| Interface | React 19 + Vite, JavaScript, React Router, plain CSS |
| Data and auth | Supabase (Auth, 2 tables, RLS) |
| Deployment | Vercel |
| Automation | Zapier (Webhook → Filter → Paths → Gmail) |
| Tests | Vitest + Testing Library |
| Documentation | Notion + this README |

## Run it locally

Needs Node.js 22.12 or newer. On Windows, `scripts\setup.ps1` installs the tools and creates the env files ([setup.md](docs/setup.md)).

```bash
npm install
cp .env.example .env.local     # then fill in the two values
npm run dev                    # http://localhost:5173
```

The Supabase project needs a one-time setup: run `supabase/schema.sql` and turn off *Confirm email* ([docs/supabase.md](docs/supabase.md)).

| Command | What it does |
|---|---|
| `npm run dev` | Development server at `http://localhost:5173` |
| `npm test` | Unit tests (Vitest); they never contact Supabase |
| `npm run lint` | Linter (oxlint) |
| `npm run build` | Production build into `dist/` |

## Environment variables

Names only; never commit values. `.env.local` is git-ignored; set the same two variables in Vercel.

| Variable | Where to get it | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → Data API | No |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys (publishable / anon key) | Safe only with RLS enabled |

The Supabase `service_role` key and the Zapier Catch Hook URL must **never** go into the app, Vercel or this repo.

## Documentation

| File | Contents |
|---|---|
| [docs/implementation-plan.md](docs/implementation-plan.md) | Scope tiers, data model, Zapier design, test table, lecture plan |
| [docs/setup.md](docs/setup.md) | Tools, packages and environment setup |
| [docs/supabase.md](docs/supabase.md) | Tables, Row Level Security, sign-up and URL settings; tests 1 and 4 |
| [docs/deployment.md](docs/deployment.md) | Vercel: env vars, Supabase URLs, incognito test |
| [docs/zapier.md](docs/zapier.md) | Webhook → Zap → Gmail, error handler, cost, cleanup; tests 2, 3 and 5 |

## Repository layout

```
src/
  pages/          Login, My plans (list), Log workout (create)
  components/     header, plan card, workout row, forms, the four UI states
  auth/           session provider and route guard
  api/            Supabase queries for plans and workouts
  lib/            Supabase client, settings check, error messages
  test/           test setup and fakes (no network)
supabase/schema.sql   tables + Row Level Security
docs/                 guides (see Documentation)
scripts/setup.ps1     automated setup for Windows (safe to re-run)
vercel.json           lets client-side routes survive a page reload
_task/                course task decks (LT / EN) and the prompts used to scope the idea
```

## Roadmap

Built in four lectures, one `feature/…` branch and pull request per feature:

1. **Foundation:** scope card, Notion page, repo, Vite app, Supabase project and tables.
2. **Users and interface:** Auth, 3 screens with 4 states (loading, error, empty, success), RLS. *Code done: `feature/auth`, `feature/plans-workouts`.*
3. **Deployment and automation:** Vercel with env vars, Supabase webhook, Zap with Filter and Paths, Gmail. *Live on Vercel; the webhook delivers to Zapier.*
4. **Verification and presentation:** test table, error handling, README and Notion, 5-minute demo.

Extended ideas (exercises/sets/reps, instructor role, plan assignment, progress reports by email, charts) are tracked in the implementation plan.
