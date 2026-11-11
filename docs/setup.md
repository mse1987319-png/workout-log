# Environment setup

How to get from a fresh clone to the app running at `http://localhost:5173`.

Everything that can run locally is automated by one script, [`scripts/setup.ps1`](../scripts/setup.ps1). What is left by hand is the part that needs a browser sign-in: the Supabase, Vercel and Zapier accounts.

## Quick start (Windows)

From the repository root, in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

Then put your two Supabase values into `.env.local` ([where to find them](#environment-variables)) and start the app:

```powershell
npm.cmd run dev
```

The script is safe to run again at any time. Each step checks whether it is already done and skips itself if so.

| Step | What the script does | Skipped when |
|---|---|---|
| 1. Tools | Installs Git and Node.js LTS with `winget` | They are already installed |
| 2. App | Scaffolds the Vite + React (JavaScript) app into the repo and removes the placeholder `index.js` | A `vite.config.*` file exists |
| 3. Dependencies | Runs `npm install` and adds `@supabase/supabase-js` and `react-router-dom` | Never; it is quick when nothing changed |
| 4. Environment | Creates `.env.example` and `.env.local` | The files exist |
| 5. Verify | Runs `npm run build` | `-CheckOnly` is used |

Step 2 never overwrites your files. It keeps the existing `README.md`, only *adds* missing rules to `.gitignore`, and replaces `package.json` only while it is still the IDE placeholder with no dependencies.

### Script options

| Option | Effect |
|---|---|
| `-CheckOnly` | Reports what is missing and changes nothing. Exit code 1 if anything is missing. |
| `-SupabaseUrl <url>` | Writes `VITE_SUPABASE_URL` into `.env.local`. |
| `-SupabaseAnonKey <key>` | Writes `VITE_SUPABASE_ANON_KEY` into `.env.local`. |
| `-WithGitHubCli` | Also installs the optional GitHub CLI (`gh`). |

Example, everything in one go:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -SupabaseUrl "https://<project-ref>.supabase.co" -SupabaseAnonKey "<anon key>"
```

## What you need

### Tools

| Tool | Version | Used for | Installed by the script |
|---|---|---|---|
| Git | any recent | Branches and pull requests | Yes (`Git.Git`) |
| Node.js + npm | **22.12 or newer** | Vite dev server and build | Yes (`OpenJS.NodeJS.LTS`), when Node is missing |
| GitHub CLI (`gh`) | any | Optional: create the repo and PRs from the terminal | With `-WithGitHubCli` |

Node 22.12 is the lowest version that satisfies both Vite 8 (`^20.19 || >=22.12`) and `@supabase/supabase-js` (`>=22`). If an older Node is installed, the script stops and tells you instead of upgrading it, because it may be managed by a version manager or needed by another project.

No Supabase CLI, Vercel CLI or Docker is needed: this project uses the hosted dashboards.

### npm packages

| Package | Comes from | Purpose |
|---|---|---|
| `react`, `react-dom` | Vite template | Interface |
| `vite`, `@vitejs/plugin-react` | Vite template | Dev server and build |
| `oxlint` | Vite template | Linter (`npm run lint`) |
| `@supabase/supabase-js` | Added by the script | Auth and database client |
| `react-router-dom` | Added by the script | Navigation between the screens |
| `vitest`, `jsdom`, `@testing-library/*` | `package.json` (dev) | Unit tests (`npm test`); they never contact Supabase |

`recharts` is needed only for the bonus Progress chart. Add it in that feature's branch: `npm install recharts`.

### Accounts

These cannot be scripted. Create them once, in the browser.

| Service | Needed for | Lecture |
|---|---|---|
| GitHub | Public repo, pull requests | 1 |
| Supabase | Auth, tables, RLS, Database Webhook | 1 |
| Vercel | Public URL | 3 |
| Zapier + Gmail | New-workout email | 3 |
| Notion | Project documentation | 1 |

## Environment variables

The app reads two values, both from Supabase → **Project Settings → API**:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL, `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The `anon` public key (newer dashboards label it "publishable"; either works) |

- `.env.local` holds the real values. It is git-ignored and stays on your computer.
- `.env.example` holds the names with placeholders. It is committed, so a fresh clone knows what to fill in.
- Set the same two variables in Vercel → Project → Settings → Environment Variables **before** the first deploy.
- Vite reads env files only at start-up: restart `npm run dev` after editing `.env.local`.

Never put the `service_role` key or a Zapier Catch Hook URL into any of these files. See [implementation-plan.md §8](implementation-plan.md#8-keys-and-secrets-slide-8).

## Hosted services, by hand

Short checklist; the details are in [implementation-plan.md](implementation-plan.md) (§5 data model, §7 Zapier, §9 lecture plan).

1. **Supabase:** new project in an EU region → create tables `plans` and `workouts` with RLS policies → Authentication: email login on, Site URL `http://localhost:5173`.
2. **`.env.local`:** copy the project URL and anon key in (or pass them to the script).
3. **Vercel** (lecture 3): import the GitHub repo → add both `VITE_` variables → deploy → set Supabase Site URL and Redirect URLs to the Vercel link.
4. **Zapier** (lecture 3): Catch Hook → Supabase Database Webhook on `workouts` → Filter → Paths → Gmail.

## Manual setup (macOS, Linux, or no winget)

Install [Git](https://git-scm.com/downloads) and [Node.js 22.12+](https://nodejs.org/) yourself, then run from the repository root in a bash-compatible shell (Git Bash works on Windows).

**Once, while the repo has no `vite.config.js`** — scaffold next to the repo and copy the template in, keeping the project's own `README.md`:

```bash
npm create --yes vite@latest ../workout-log-template -- --template react --no-interactive
rm ../workout-log-template/README.md
cat ../workout-log-template/.gitignore >> .gitignore && rm ../workout-log-template/.gitignore
cp -R ../workout-log-template/. . && rm -rf ../workout-log-template index.js
npm pkg set name=workout-log
npm install @supabase/supabase-js react-router-dom
printf 'VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co\nVITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY\n' > .env.example
```

`create-vite` is not run directly in the repo folder because, for a non-empty folder, it either asks to wipe it or overwrites `README.md` and `.gitignore`.

**Every fresh clone after that:**

```bash
npm install
cp .env.example .env.local     # then fill in the two values
npm run dev
```

## Verify

| Command | Expected |
|---|---|
| `powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -CheckOnly` | Every line is `[ok]`; ends with "Environment is ready" |
| `npm run dev` | Vite prints `Local: http://localhost:5173/`; the page opens |
| `npm run build` | Ends with `✓ built in …`; output in `dist/` |
| `npm test` | Every test file passes |
| `git status` | `.env.local`, `node_modules/` and `dist/` are **not** listed |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `setup.ps1 cannot be loaded … not digitally signed` | The machine's PowerShell execution policy blocks unsigned scripts | Start it as shown above, with `powershell -ExecutionPolicy Bypass -File …`. This applies to that one run only. |
| `npm.ps1 cannot be loaded … not digitally signed` when typing `npm` in PowerShell | Same policy; PowerShell picks `npm.ps1` over `npm.cmd` | Type `npm.cmd` instead of `npm` (same for `npx.cmd`), or use Git Bash, cmd, or the IDE's npm tool window. |
| `winget is not available` | winget is missing or blocked by company policy | Install Git and Node.js from the links under [Manual setup](#manual-setup-macos-linux-or-no-winget), then run the script again. |
| `Node.js … was installed but is not on PATH yet` | The terminal was opened before the install | Open a new terminal and run the script again. |
| `Node.js <version> is too old` | Node is older than 22.12 | `winget upgrade OpenJS.NodeJS.LTS`, or switch version in your version manager. |
| The app shows a Supabase error or `supabaseUrl is required` | `.env.local` still has placeholders, or the dev server was not restarted | Fill in both values, then restart `npm run dev`. |
| Port 5173 is in use | Another dev server is running | Stop it, or accept the next port Vite offers and add that URL to Supabase Redirect URLs. |
