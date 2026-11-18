# Environment setup

*English · [Lietuviškai](lt/setup.md)*

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
| `recharts` | `package.json` | The Progress charts |
| `vite-plugin-pwa` | `package.json` (dev) | Builds the service worker and the manifest (the phone app, [pwa.md](pwa.md)). A build-time tool: it adds nothing to the app at run time |
| `vitest`, `jsdom`, `@testing-library/*` | `package.json` (dev) | Unit tests (`npm test`); they never contact Supabase |

`npm install` installs all of these from `package.json`, so the script and a plain `npm install` give the same result; the script's own list (`@supabase/supabase-js`, `react-router-dom`) only matters for a project that doesn't have them in `package.json` yet.

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

Short checklist; each step has its own step-by-step guide.

1. **Supabase:** new project in an EU region → run [`supabase/schema.sql`](../supabase/schema.sql) (tables `plans` and `workouts` with RLS) → run [`supabase/seed.sql`](../supabase/seed.sql) (demo accounts and data; see the README's *Demo accounts*) → Authentication: email login on, *Confirm email* off, Site URL `http://localhost:5173`. Guide: [supabase.md](supabase.md).
2. **`.env.local`:** copy the project URL and the publishable (anon) key in (or pass them to the script).
3. **Vercel** (lecture 3): import the GitHub repo → add both `VITE_` variables → deploy → set Supabase Site URL and Redirect URLs to the Vercel link. Guide: [deployment.md](deployment.md).
4. **Zapier** (lecture 3): Catch Hook → Supabase Database Webhook on `workouts` → Filter → Paths → Gmail. Guide: [zapier.md](zapier.md).

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

## Try the phone app locally

Logify is also an installable phone app that works without signal ([pwa.md](pwa.md)). **`npm run dev` has no service worker**, on purpose, so a stale cache never confuses development. The service worker and the manifest exist only in the production build, so test them there:

```bash
npm run build
npm run preview        # http://localhost:4173
```

1. Open `http://localhost:4173` in Chrome and log in **with a connection**. The service worker installs, and the warm-up saves some data. A service worker works on `localhost` without HTTPS.
2. DevTools → **Application**: *Manifest* shows the name, the icons and that the app is installable; *Service Workers* shows `sw.js` as activated; *Cache Storage* holds the precache; *Local Storage* shows the `logify.*` keys.
3. Open My plans, Log workout and Progress once. Then tick **Application → Service Workers → Offline** (or **Network → Offline**) and reload: the app opens, and the status line says you are offline.
4. Log a workout: it is kept on the phone and shows *Waiting to send* on My plans. Untick Offline: it is sent, and the line goes away.
5. To start from scratch, **Application → Storage → Clear site data**; it also removes the service worker.

The full walk-through and the limits are in [pwa.md](pwa.md#7-testing-it-offline). To try it on a real phone, open a Vercel preview or the live site: they are served over HTTPS ([deployment.md](deployment.md#6-the-phone-app-pwa-on-vercel)). The dev server opened by its LAN IP is plain `http://`, so a phone gets no service worker there.

## Screenshots

The screenshots in the [user manuals](user-manual/README.md) are retaken with a screenshot tool rather than by hand, so that they match the app after a UI change. The tool lives in `_task/results/src/screenshots/`; its README says what it needs and how to run it: [`_task/results/src/screenshots/README.md`](../_task/results/src/screenshots/README.md).

## Verify

| Command | Expected |
|---|---|
| `powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -CheckOnly` | Every line is `[ok]`; ends with "Environment is ready" |
| `npm run dev` | Vite prints `Local: http://localhost:5173/`; the page opens (no service worker) |
| `npm run build` | Ends with `✓ built in …`; output in `dist/`, including `sw.js` and `manifest.webmanifest` |
| `npm run preview` | Serves the build at `http://localhost:4173`; DevTools → Application shows the manifest and an activated service worker |
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
| The service worker doesn't show up in DevTools, or the app doesn't open offline | You are on `npm run dev` (no service worker), on a plain `http://` address that isn't `localhost`, or you haven't opened the app once with a connection | Use `npm run build` + `npm run preview` on `localhost`, and log in with a connection first ([above](#try-the-phone-app-locally)) |

## Related

[deployment.md](deployment.md) (Vercel, the PWA on Vercel, releasing v5) · [supabase.md](supabase.md) (the database, applying v5) · [pwa.md](pwa.md) (the phone app and how to test it offline) · [architecture.md](architecture.md) (how the pieces fit, including the phone side) · [zapier.md](zapier.md) (the emails)
