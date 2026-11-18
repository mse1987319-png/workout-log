# Logify v5: a phone app that works without signal (design)

Date: 2026-11-16 · Branch: `release/v5`, cut from `main` at `8e30f1b` · Status: implemented and merged into `main` on 2026-11-18 ([PR #28](https://github.com/mse1987319-png/workout-log/pull/28))

## Why

Logify is used on the phone at the gym, and gyms often have weak or no signal (basements, thick walls). Today everything needs a connection:

- With no signal the app doesn't open at all; with a weak one a screen can sit on "Loading…" for a long time.
- If the phone is offline and the last sign-in refresh was more than about an hour ago, the app sends you to Login: supabase-js can't refresh the access token, so it reports "no session" (the session is still in storage, but the app can't tell).
- A workout typed in with no signal can't be saved, and the half-filled form is lost if the phone closes the app in the background.

v5 turns Logify into an installable phone app (a PWA) that opens and works without signal. You can see your plans, history and progress, and log a workout. The workout is sent, and your instructor is emailed, when the signal returns.

## What the user decided

1. **Offline scope: view + log workouts.** The app opens offline and shows the last-synced plans, history and progress (instructors: their athletes). A workout logged offline waits on the phone and is sent, with the instructor's email, when the signal returns. New plans, goals, reports, sharing and plan assignment still need a connection.
2. **The database change is applied by Claude** to the live Supabase project, with the token in `_task/.keys/keys.md`, followed by the SQL tests.
3. **Git:** commit on `release/v5` and push it, so Vercel builds a preview to test on a real phone. No pull request. `main` and the live site stay untouched.
4. **Phones get a bottom tab bar** (native-app style). The manuals' phone screenshots would otherwise be out of date.
5. **On approval:** "make sure that existing prod won't be broken, and new phone app will do fine if the existing DB will point to an older version of DB with a warning." See section 7.

## Goals

- Installable on Android (Chrome's install prompt or "Add to Home screen") and on iPhone (Safari → Share → Add to Home Screen). It opens full-screen in portrait, with the Logify icon.
- It opens with no network, on every screen, including screens loaded on demand that were never opened (Progress, Workout detail, an athlete's page).
- A signed-in user stays signed in offline, even after the access token has expired.
- When the network is down or too slow, every screen that reads data shows the last data it got, with a note that it's saved data and from when.
- Logging a workout works offline. The workout is kept on the phone, shown under its plan as *Waiting to send*, and sent automatically while the app is open and online. Each workout is saved, and emailed, exactly once, however many times a send is retried.
- On phones, a bottom tab bar: My plans · Log · Progress · Sharing (athletes) or My athletes (instructors). The header shrinks to one row.
- Every new text in Lithuanian and English, tests for every new behavior, and the docs (EN + LT) updated.

## Non-goals

- Other changes offline: new, edited or deleted plans, workout renames, goals, reports, sharing, plan assignment. They still need a connection and fail with today's "Can't reach the server" message.
- Background sync while the app is closed. iPhone doesn't support it, and on Android it would need the session inside the service worker. Sending happens while the app is open.
- Push notifications, app-store packaging, offline sign-up or login.
- Desktop layout changes. Above 640 px the header and menu stay as they are.

## Anti-goals (a failure even if it technically works)

- A workout saved twice, or an instructor emailed twice, because a send was retried.
- A workout logged offline silently lost: closing the app, an update, logging out, or a server error.
- One user seeing another user's saved data on a shared phone.
- Saved (old) data presented as if it were fresh.
- The live app on `main` breaking because of the database change.
- An update that reloads the page and wipes a half-filled workout.

## How it works

### 1. Installable app

- **vite-plugin-pwa 2.x** (Workbox; supports Vite 8) in `vite.config.js`, `generateSW` strategy. It precaches the built app: HTML, every JS chunk (including the lazily loaded ones), CSS and icons. It serves `index.html` for any navigation, so every route opens offline. The service worker doesn't touch Supabase requests (they're cross-origin and not routed).
- **Manifest:** name and short name *Logify*; `display: standalone`; `orientation: portrait`; `start_url`, `scope` and `id` are `/`; theme color `#0f766e` (today's teal); background `#f5f6f8` (the app's light background); icons 192 and 512 (any) plus 512 maskable. Shortcuts *Log workout* → `/log` and *Progress* → `/progress` (Android, long-press the icon). The manifest can't follow the language switch, so its texts are in Lithuanian, the app's default (`lang: lt`).
- **Icons** are generated once from `public/favicon.svg` with `@vite-pwa/assets-generator` (run with `npx` at a pinned version). Both the PNGs and the generator's config are committed, so the build needs no image tools. Sizes: 64, 192 and 512 transparent; 512 maskable; 180 apple-touch-icon. The last two have padding in `#0f172a`, the icon's own edge color, so the padding can't be seen.
- **`index.html`:** apple-touch-icon, `apple-mobile-web-app-title`, and `viewport-fit=cover` for the notch and home-indicator areas. The manifest link has `crossorigin="use-credentials"`, so Vercel's preview protection can't block it.
- **Updates:** `registerType: 'prompt'`. When a new version is ready, a bar says *A new version of Logify is ready* with **Update**. The app never reloads by itself. While it's open, it checks for a new version every hour.

### 2. Staying signed in offline

supabase-js keeps the session in localStorage. It deletes the session only when the server rejects it. A network failure leaves it in place but reports "no session".

`AuthProvider` will handle that case. When Supabase reports no session but a stored session is still there, it uses the stored one: signed in, offline. When the connection returns, supabase-js refreshes the token by itself: every 30 s while the app is visible, and before any request. One limit is Supabase's own: after a failed refresh it waits up to a minute before trying again. So if the sign-in expired while offline, things resume within about a minute of reconnecting. If the server rejects the session, supabase-js signs out and the app goes to Login, as today. Login itself needs a connection, and offline the Login screen says so.

### 3. Saved data for reading

- **`useLoad(load, key)`** gets an optional cache key. After every successful load it saves the result in localStorage under the signed-in user's id, with the time (`logify.cache.v1.<user id>.<key>`).
  - **When the load fails because of the network, or takes more than about 4 s,** and there is saved data, the screen shows it in the Success state with a note: *Offline: showing data saved on 16 Nov, 18:42* and **Try again**. If fresh data arrives later, it replaces the saved data.
  - **When the phone knows it's offline** (`navigator.onLine` is false), saved data shows straight away.
  - **Real errors** (for example no permission) still show the Error state. With no saved data, a screen behaves as it does today, except that offline its Error state says *You're offline, and this hasn't been saved on this phone yet*.
- `setData` (local updates after a rename, a delete or a new goal) also updates the saved copy.
- **What is saved:** plans, plan options, progress, `workout:<id>`, instructors, athletes, `athlete:<id>`, report.
- **Hints while logging:** exercise names and *Last time* fall back to the saved Progress data (all of the user's sets) when offline. `listProgress` also selects `set_no`, so the order within a workout is known.
- **Warm-up:** right after sign-in, or on app start with a connection, the app quietly loads plan options and Progress (instructors: My athletes too). So offline works even for screens not opened yet.
- **Limits:** on log out, that user's saved data is deleted from the phone. At most 30 workout and athlete detail entries are kept, oldest dropped first. If the phone's storage is full, the oldest saved data goes first. Workouts waiting to be sent are never dropped.

### 4. Logging a workout offline (the outbox)

- **Every workout gets an id made on the phone** (`crypto.randomUUID()`) and the time **Save** was pressed. It is written to the outbox first (localStorage, per user), then sent.
- **Online:** Save sends it right away, with a 15 s limit. On success: *Workout saved*, as today.
- **Offline, or the send fails because of the network or the time limit:** *Saved on this phone. It will be sent when you're back online, and your instructor gets the email then.* The form clears.
- **Any other error on Save** (for example the plan was deleted, or the instructor stopped assigning it): the workout is not kept. The form shows the error, as today, so it can be fixed.
- **Sending the outbox:** in order, one at a time. It runs when the app starts, comes back online or becomes visible again, right after a save, and every 30 s while something is waiting and the app is open. It first checks there is a usable session; if not, it waits.
  - **Try again later** (the workout stays *Waiting to send* and the round ends): no response, the time limit, an HTTP 5xx, an expired or rejected sign-in (401), or a duplicate id (23505, see section 5).
  - **Any other error** marks that workout *Couldn't send: <reason>*, with **Try again** and **Delete** (which asks first) in My plans. The round goes on with the next workout.
- **My plans** shows outbox workouts at the top of their plan with a *Waiting to send* or *Couldn't send* badge. If the plan isn't in the list (for example it was deleted), they show in a *Waiting to send* card at the top of the page. These rows aren't links: there is no detail page until a workout is sent. Once sent, a workout becomes a normal row.
- **Progress, suggestions and reports count only sent workouts.**
- **A status line under the header:** *Offline* with no connection; *N workouts waiting to send* with **Send now**; *Sending…*.
- **Log out with workouts waiting** asks first: they stay on this phone and are sent the next time that user logs in here.
- **Log out works offline.** Online it stays as today (signs out everywhere). Offline it signs out on this phone only, because the server can't be reached; the server session then simply expires.
- **Unsaved form (draft):** the Log workout form is saved on the phone as you type, so an app restart or update, or the phone closing the app in the background, doesn't lose it. A restored draft says *Unsaved workout restored* with **Start over**. It is cleared when the workout is saved or kept, and on log out. If the form is opened from a plan's **+ Log workout**, that plan wins over the draft's plan.

### 5. Database change: a workout is saved exactly once

`log_workout()` gets two optional parameters. Old calls keep working, so the live app on `main` is unaffected.

- **`p_id uuid`:** the id made on the phone. If this user already has a workout with that id, the function returns it and inserts nothing: no second row, no second webhook, no second email. If two sends race, the second hits the primary key (23505). The app then tries again later, and the function finds the workout and returns it. The app never assumes a workout was saved without the server returning it.
- **`p_logged_at timestamptz`:** when Save was pressed. It becomes `created_at` (and the sets' `created_at`) if it is within the last 30 days and not in the future; otherwise the server's time is used. So a workout sent hours later still lands on the right day in the charts and *Last time*.
- `schema.sql` drops the old 8-parameter version first, because PostgREST can't choose between two versions that both match. It keeps the grants and stays safe to re-run.
- **New `schema_version()`** returns `5` (section 7).
- **New SQL test** `supabase/tests/log_workout_offline.test.sql`, rolled back like the others. It checks that the same id sent twice gives one row and one webhook request, that the logged time is used, that future and over-30-day-old times are replaced, that an old-style call still works, and that `schema_version()` returns 5.
- **Applied to the live project in one transaction,** then all SQL tests are run there.

### 6. Phone layout: bottom tab bar

- **At 640 px and below,** the main menu becomes a bar fixed to the bottom of the screen: an icon and a label each for My plans, Log, Progress, and Sharing or My athletes. The active tab is in the accent color. The bar is about 56 px tall plus the iPhone home-indicator area.
- **It's the same `<nav>`, restyled,** so no link is duplicated. *Log* shows only on phones; the desktop menu stays as it is.
- **The header becomes one row:** logo, LT/EN and Log out. The email is hidden on the smallest screens, as today.
- **Pages get bottom padding** so nothing hides under the bar, and the header and bar keep clear of the notch and home indicator (`env(safe-area-inset-*)`).
- **The status line** (offline, waiting, new version, older database) sits just under the header.
- **Install card on My plans:**
  - Android: when the browser offers installing, *Install Logify: it opens like an app and works without signal*, with **Install** and **Not now**.
  - iPhone Safari: a short how-to (Share → Add to Home Screen).
  - Hidden once the app is installed, or after **Not now**.

### 7. Compatibility in both directions

**The live app on `main` with the new database must not break.**

- `log_workout()`'s new parameters are optional, so the call the live app sends (eight named parameters) still matches. Nothing else the live app uses changes.
- The change runs in one transaction: there is no moment without a `log_workout()`.
- Webhooks, triggers, policies and the Zaps are untouched.
- **Checked on the live project after the change:**
  - all SQL tests, which make old-style calls;
  - an HTTP request with exactly the body the live app sends, made as a temporary account that shares with no instructor (so no email), deleted afterwards.
- Pushing `release/v5` builds a Vercel preview only. Production deploys from `main`, which isn't touched, so the live site gets no service worker.

**The new app with an older database must work, with a warning.**

- **The database tells its version.** A new function `schema_version()` returns `5` and is callable by `anon` and `authenticated`. An older database doesn't have it.
  - The app asks once per start while online, and keeps the last answer on the phone.
  - "Function not found" (PGRST202 / HTTP 404) means older than v5.
  - No answer (offline) keeps the last known value.
- **Belt and braces:** if `log_workout()` answers "function not found" to the new parameters (for example a database rolled back, or PostgREST's schema cache not yet reloaded), the app marks the database as older and repeats that send the old way at once.
- **On an older database, everything works,** including logging offline, with two differences:
  - The send leaves out `p_id` and `p_logged_at`, so a workout logged offline gets the time it is sent.
  - A send is never cut off by the 15 s limit. The form still stops waiting after 15 s (*kept on this phone, sending in the background*) while the request runs to its end, because cutting it off could leave a saved workout looking unsaved. Only a connection that really drops mid-send can still cause a second copy.
- **The warning** is in the status line, one line, with **Hide** for the rest of the session: *Logify's database is an older version than this app: workouts logged offline get the time they're sent, and after a dropped connection one could be saved twice. The fix is updating the database (`supabase/schema.sql`).* It disappears by itself once the database reports version 5.
- **Tests:** unit tests on the fake backend for both directions. Live, the new app is first run against the database as it is now (warning, logging works), before the change is applied.

## Constraints

- The stack stays: React 19, Vite 8, plain CSS, JavaScript, Supabase, Vercel. Tests use Vitest and Testing Library on the fake backend, with no network. Lint uses oxlint.
- Browser minimums are unchanged (Chrome 111, Safari 16.4, Firefox 121). `crypto.randomUUID`, `AbortSignal.timeout` and service workers all exist there.
- Service workers need HTTPS. They work on Vercel (production and previews) and on localhost. `npm run dev` runs without one, to avoid stale-cache confusion; testing uses `npm run build` and `npm run preview`.
- Every user-facing text in LT + EN, with the same keys in both.
- The live Supabase project is shared with the production app on `main`.

## Claude's calls (please check these)

1. vite-plugin-pwa with Workbox `generateSW`, not a hand-written service worker.
2. Network first with saved data as the fallback: shown at once when the phone is offline, after about 4 s when the network is slow. Not "saved first, then refresh", which would flash old data at online users.
3. localStorage, not IndexedDB, for saved data and the outbox. The data is small, it's synchronous, and it works in the existing tests. Size is guarded.
4. Sending only while the app is open, with no Background Sync.
5. The Log workout draft saved on the phone. Not asked for, but it protects a workout typed in over an hour at the gym.
6. The install card on My plans, and the home-screen shortcuts *Log workout* and *Progress*. Not asked for.
7. Manifest texts in Lithuanian.
8. An update prompt, not an automatic update.
9. A 30-day window for the logged time.
10. The *Log* tab only on phones.
11. A light gray splash-screen background.
12. Logging out offline signs out on this phone only.

## Testing and verification

- **Unit and component tests on the fake backend:**
  - the saved-data store: write, fallback, separation between users, wipe on log out;
  - `useLoad`: the offline and slow-network paths;
  - the outbox: queue, order, retry after a network error, the *Couldn't send* state, 23505 counted as sent, waiting without a session;
  - Log workout online, offline and on a slow network;
  - My plans' waiting rows and badges;
  - the offline session in `AuthProvider`;
  - the tab bar for each role, the status line, draft restore and the install card;
  - timeouts counted as network errors.
- **SQL tests** on the live project, rolled back.
- **`npm run lint`, `npm test` and `npm run build` all pass.** The build contains `sw.js`, the manifest, the icons, and a precache of all chunks.
- **Browser check of the production build** (`npm run preview`) at phone size:
  - the manifest is installable and the service worker is active;
  - the app opens with the server stopped;
  - with the network simulated as down, saved data shows and a workout can be logged;
  - it syncs on reconnect against the live Supabase. This uses a temporary account that shares with no instructor, so no email is sent, and the account is deleted afterwards.
- **Order on the live project:**
  1. the new app against the database as it is now (warning, logging works);
  2. the database change and all SQL tests;
  3. the live app's exact request still works, and the new app shows no warning and saves exactly once;
  4. the temporary account is deleted.
- **After the push,** the Vercel preview of `release/v5` serves the manifest and the service worker. If the preview shows "not set up", the two Supabase variables aren't enabled for Vercel's Preview environment; that is reported to the user, not changed. The final test on a real phone is the user's.

## Docs

- **`README.md` and `README.lt.md`:** installing on a phone, what works offline, the stack (vite-plugin-pwa), the repository layout.
- **New `docs/pwa.md` and `docs/lt/pwa.md`:** how the offline parts work, how to test offline, how to regenerate the icons, the limits.
- **`docs/architecture.md` (+ LT):** the offline layer, and a sequence diagram of logging offline and syncing.
- **`docs/supabase.md` (+ LT):** the new `log_workout` parameters and test.
- **User manuals** (athlete and instructor, EN + LT): installing on a phone, the bottom bar, using Logify without signal. The two phone screenshots (80 and 81) are retaken in both languages. They also note that on iPhone the installed app keeps its own storage, so you log in once more inside it.

## Left to the builder

- Module layout under `src/` (for example `src/offline/`), file names and test structure.
- CSS details and the tab-bar icon drawings (inline SVG, no icon library).
- Exact wording of the new texts, in the existing tone.
- Exact timeouts and intervals, within the ranges above.

## As built (after approval)

What changed or was added while building and in the whole-branch review, compared with the text above. The sections above are left as approved. Short commit ids are on `release/v5`. How it all works now is in [docs/pwa.md](../../pwa.md) and [docs/architecture.md](../../architecture.md#7-mobile-architecture-pwa).

**Changed from the design**

- **The unsaved Log workout form is dropped the moment the outbox holds the workout** (section 4 said: when it is saved or kept). Reason: if the app closed during the up-to-15 s send, the next start would send the outbox copy and also restore the form, and a second Save would make a second workout and email (f3e50a7). If the server then refuses the workout, the form keeps its fields and saves them as the draft again.
- **Nothing is written to the draft while the form is saving.** Reason: pressing Enter in an exercise name, or a late blur as the fields lock, could write the draft again and bring the workout back after a reload (dfd3230).
- **The form's fields are locked while saving.** Reason: the form clears once the workout is saved or kept, so anything typed during *Saving…* was lost without a word (ae87305).
- **A cold start offline uses the stored session at once** (after 3 s when online but slow); section 2 only said the stored session is used when Supabase reports none. Reason: with an expired access token supabase-js reports the session only after its retries give up, about 25 s with no signal, and the app sat on *Checking your session…* (10770c8).
- **The log-out question counts only workouts that will be sent by themselves** (waiting or sending); section 4 said "waiting". Reason: one that *Couldn't send* is never sent automatically, so it no longer makes Log out ask, and the question closes by itself if the count drops to 0 (ae87305).
- **The *A new version is ready* line is hidden while a workout is being sent.** Reason: **Update** reloads the page and would cut the send off (on an older database that can mean a second copy) (ec5b239).
- **When the phone says it is offline, *Last time* and the exercise-name suggestions come from the saved Progress at once**, without a request. Reason: asking the server would only fail after supabase-js's retries, about 7 s (ec5b239).
- **The language switch is two flags** (Lithuanian, British) right next to the logo, with the names *Lietuvių* and *English* as accessible names; **Log out is an icon** whose tooltip reads *Log out (email)*; the email is cut with … instead of being hidden on the smallest screens (section 6 said logo, LT/EN and Log out). Reason: a tighter phone header that never overlaps (checked at 320–1024 px) (234c413).
- **If the phone can't keep a workout in the outbox** because its storage is full, online it is sent directly (with no phone id, so not protected against a second copy) and offline the form says it couldn't be kept; the design only said saved data goes first. Reason: never lose a workout, and never say a workout was saved when it wasn't.

**Added to the design**

- **A load that started before a local change never overwrites it:** its answer (data or error) is dropped and the load runs again, with the current data kept on screen. Reason: reconnecting reloads My plans while the outbox sends a workout, and the stale list wiped the row just added (291e217).
- **A local change always reaches the saved copy, without making its *saved on* time newer** (the design wrote the copy only while fresh data was shown). Reason: on a slow reconnect the saved copy came back without the change (465d4f6).
- **A workout sent while My plans is closed is added to the saved My plans copy** (`src/offline/plansCache.js`). Reason: only My plans' own listener added it, so a workout sent from the Log workout screen, or by the outbox, was missing offline (fe9956d).
- **My plans' saved copy also keeps the Log workout plan list (`planOptions`) in step**, unless that list is newer. Reason: offline, the Log screen could miss a plan created on My plans since the warm-up, or offer a deleted one (fe9956d).
- **A session guard** (`src/lib/sessionGuard.js`) refuses a data request that would go out without the user's token, as if the connection had dropped. Reason: with an expired token supabase-js sends only the project key, Row Level Security answers with empty lists, and a screen would save them over good data. **`schema_version()` passes through it**: anyone may call it and it returns a constant, so the version is learned as soon as the phone is back online (ec5b239).
- **Each send checks that Supabase holds this user's own session**, not just a usable one. Reason: a workout must never go out under someone else's token on a shared phone.
- **Workbox `clientsClaim` is on** (`skipWaiting` stays off). Reason: the very first session after installing then works offline; updates still wait for **Update** (ec5b239).
- **The hourly update check swallows its failure.** Reason: offline it rejected every hour as an unhandled rejection; the next hour simply checks again (ae87305).
- **Outbox ids work outside a secure context** (a version 4 UUID from `getRandomValues` when `crypto.randomUUID` is missing). Reason: the dev server opened by LAN IP over http has no `randomUUID` (159356d).
- **An outbox workout left *sending* by a page that closed becomes *waiting* again at the next sign-in.** Reason: a send can't outlive the page that started it.
- **`schema.sql` of `main` must not be run on a v5 database** (it re-creates the eight-parameter `log_workout()` next to the v5 one, and calls fail with `PGRST203`); a troubleshooting row in [supabase.md](../../supabase.md#troubleshooting) says how to fix it, and the v5 SQL test detects it (88140bb).

**Numbers at the end of the build:** 524 unit tests in 49 files, 7 SQL test files, and the live database is v5 (`schema_version()` returns 5). The Vercel preview of `release/v5` serves `sw.js` and the manifest with `Cache-Control: public, max-age=0, must-revalidate`; production (`main`) was the pre-v5 app until `release/v5` was merged on 2026-11-18; since then production serves v5.
