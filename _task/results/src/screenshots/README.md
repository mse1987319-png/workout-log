# Screenshot tool

Takes the screenshots of the user manuals (and, with more sets, of the results deck) from the **real app**: Vite's dev server, driven by Playwright's Chromium. Every request to `*.supabase.co` is answered by a mock, so nothing reaches the live project and no Zapier email is ever sent. Images are never edited by hand: after a UI change, run the tool again.

## Run it

1. Start the app in the repo root: `npm run dev` (port 5173; `BASE_URL` changes that).
2. Playwright is **not** in `package.json`. Point the tool at an install: set `PLAYWRIGHT_PATH` to its package folder (`…/node_modules/playwright`), or run from a folder where `require('playwright')` works. If Playwright cannot find its own Chromium, the tool looks for any `chromium_headless_shell-*` in Playwright's cache; `PLAYWRIGHT_CHROMIUM` names an executable explicitly.
3. From this folder:

```
node run.cjs M              # user manuals, both languages
node run.cjs M lt           # one language (en | lt | both)
node run.cjs M en --only=40-plans,athlete-progress   # scene names or image names
node run.cjs M both --out=/tmp/shots   # same folder layout under /tmp/shots; replaces nothing
```

The run prints every image with its pixel size, then the requests the mock could not answer (the list must be **none**) and any failure. The exit code is 1 on a failure, an unanswered request or an image of the wrong size.

Rules the runner enforces: an image must have the **pixel size of the file it replaces** (a new file needs `size: [w, h]` in its scene), and nothing may leave the machine except requests to `localhost`. To check that a scene repeats, run it twice with `--out` and compare the two folders.

## What is here

```
run.cjs               the runner:  node run.cjs <set> [lang]
lib/harness.cjs       Playwright, the signed-in session, the fixed clock, offline, screenshots, highlights
lib/mock.cjs          the Supabase mock: sign-in, PostgREST tables, the database functions (rpc)
lib/postgrest.cjs     the bit of PostgREST's query language the app uses (select, embeds, order, filters)
lib/world.cjs         helpers to write made-up data
lib/time.cjs          local ("2026-11-10 18:05", Vilnius) to UTC
worlds/               the data: manual.cjs (the manuals' people); index.cjs lists the worlds
sets/                 the image sets: manual.cjs (Set M); index.cjs lists the sets
```

### How a scene runs

* The mock holds the data as plain arrays (a **world**), so what a scene does sticks: a plan created in step 1 is on My plans in step 2, a logged workout counts in Progress, an assigned plan shows for the athlete. Row Level Security is imitated from the request's bearer token. `report_stats`, `send_report`, `log_workout` (also exactly-once by `p_id`), `link_instructor`, `my_athletes`, `athlete_progress` and the rest follow `supabase/schema.sql`.
* The signed-in session is put in `localStorage` (`sb-<project ref>-auth-token`, the ref read from `.env.local`, never printed) with a far-future expiry, and the language in `logify.language`, before the app starts. No sign-in request is made.
* The clock is fixed with `clock.setFixedTime`, so "42 days left", "this week" and every date repeat. The browser is in the `Europe/Vilnius` zone.
* Anything the mock does not know is **refused** and listed, never answered with a guess.
* Vite's hot-reload socket is switched off, so going offline and online again never reloads the page.

### A scene

```js
{
  name: 'athlete-sharing',          // scene name (for --only and the log)
  persona: 'jonas',                 // who is signed in (a key of the world); null = logged out
  images: ['70-sharing'],           // the files it writes; the runner checks them
  path: '/sharing',                 // opened first (default '/')
  // all optional: viewport {width,height}, scale, now (ISO), userAgent, world, schemaVersion: 'missing',
  // hasTouch, isMobile, init (a script run before the app)
  async run(s) {
    await s.page.getByText('coach@example.com').waitFor()
    await s.settle()
    await s.shot('70-sharing', { highlight: [{ target: '.some-selector', pad: 3 }] })
  },
}
```

`s` has:

| | |
|---|---|
| `s.page`, `s.context` | Playwright's page and context: click, fill, … as usual |
| `s.t(key, params)` | the app's own text for a key, in the scene's language (`src/i18n/translations.js`): scenes follow copy changes and work in `en` and `lt` |
| `s.settle(ms)` | fonts ready, nothing says "Loading…", then `ms` (default 500) more |
| `s.shot(name, opts)` | writes one image; `opts`: `element` (selector or locator: that element's box), `height` (CSS px, or `'page'`; from the top of the page or the element), `highlight` (`[{ target, pad, padX, padY, radius }]`: the manuals' red frame, only for this image), `size: [w, h]` (image px, for a new file) |
| `s.goOffline()`, `s.goOnline()` | the phone loses / regains its connection (the mock goes dark too) |
| `s.offerInstall()` | Chrome's "install this app" offer arrives: the install card shows **Install** |
| `s.mock` | `mock.calls.log_workout` (the request bodies, for asserting `p_id` / `p_logged_at`), `mock.requests`, `mock.state.schemaVersion` (`'current'` / `'missing'`) |
| `s.world`, `s.persona` | the data and the signed-in person |

Notes that save time:

* A shot with no `element` and no `height` is what is on screen now (the phone's tab bar stays in place); with `height` it is a clip from the top of the page. Mouse hover and keyboard focus are removed before every shot.
* Offline, **reach screens through the app** (tab bar clicks), not `goto`: `npm run dev` has no service worker, so a reload with no signal cannot load the page. The app must have loaded its data once online (it saves it as it goes: wait for it, see `savedOnPhone` in `sets/manual.cjs`).
* Find elements by role, label or `s.t(...)` text, not by a date or number from the data, so the same scene works in Lithuanian.

### Data: worlds and personas

`worlds/manual.cjs` builds the people of the user manuals with the helpers in `lib/world.cjs` (`addUser`, `addPlan`, `addWorkout`, `addGoal`, `addReport`, `link`, `assign`). `build()` returns `{ world, personas }`; a scene's `persona` is a key of `personas`. A new world (say the results deck's demo athletes and instructor) is a new file in `worlds/` listed in `worlds/index.cjs`, then `world: 'demo'` on the set or a scene. Times are written as local wall-clock text.

### A set

A file in `sets/` exporting `{ id, name, world, outDir(lang), format, quality, defaults: { viewport, scale, now }, scenes }`, listed in `sets/index.cjs`. `format: 'jpeg'` writes `.jpg`. The images of a set go where `outDir(lang)` says; names and pixel sizes are the contract with whoever uses them.

## Set M: the user manuals

Writes `docs/user-manual/images/{en,lt}/`: the 46 images of the manuals plus `82-phone-install`, `83-phone-offline`, `84-phone-saved-on-phone`, `85-phone-waiting` and `111-phone-athletes`. Desktop images are 1100 x 800 CSS px at 1.5x (1650 x 1200); card pictures are 728 CSS px wide (1092); phone images 390 x 780 at 2x (780 x 1560). All scenes run on 2026-11-12 at 15:40 Vilnius time.

| Scene | Who | Images |
|---|---|---|
| `login` | logged out | 01, 02, 03, 04 |
| `first-steps` | mantas (new athlete) | 10, 11, 12, 20, 21, 22, 23 |
| `sharing-first-time` | mantas | 30, 31, 32 |
| `athlete-plans` | jonas | 40 to 47 |
| `athlete-details` | jonas | 50, 51 |
| `athlete-progress` | jonas | 60 to 68 |
| `athlete-sharing` | jonas | 70 |
| `phone-basics` | jonas | 80, 81 |
| `phone-install`, `phone-offline` | jonas | 82, 83, 84, 85 |
| `instructor` | coach | 100 to 108, 110 |
| `phone-instructor` | coach | 111 |

Two details of the old screenshots the mock keeps: an instructor's page lists an athlete's goals in the order they were added (the SQL function sorts them by date), and `report_stats` is worked out from the data, so the report numbers always match the workouts shown.
