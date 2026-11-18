# Screenshot tool

Takes the screenshots of the user manuals and of the results deck's demo (desktop and phone) from the **real app**: Vite's dev server, driven by Playwright's Chromium. Every request to `*.supabase.co` is answered by a mock, so nothing reaches the live project and no Zapier email is ever sent. Images are never edited by hand: after a UI change, run the tool again.

## Run it

1. Start the app in the repo root: `npm run dev` (port 5173; `BASE_URL` changes that).
2. Playwright is **not** in `package.json`. Point the tool at an install: set `PLAYWRIGHT_PATH` to its package folder (`…/node_modules/playwright`), or run from a folder where `require('playwright')` works. If Playwright cannot find its own Chromium, the tool looks for any `chromium_headless_shell-*` in Playwright's cache; `PLAYWRIGHT_CHROMIUM` names an executable explicitly.
3. From this folder:

```
node run.cjs M              # user manuals, both languages
node run.cjs M lt           # one language (en | lt | both)
node run.cjs R              # the capstone deck's demo pictures (desktop); P: its phone pictures
node run.cjs M en --only=40-plans,athlete-progress   # scene names or image names
node run.cjs M both --out=/tmp/shots   # same folder layout under /tmp/shots; replaces nothing
```

The run prints every image with its pixel size, then the requests the mock could not answer (the list must be **none**) and any failure. The exit code is 1 on a failure, an unanswered request or an image of the wrong size.

Rules the runner enforces: an image must have the **pixel size of the file it replaces** (a new file needs `size: [w, h]` in its scene), and nothing may leave the machine except requests to `localhost`. To check that a scene repeats, run it twice with `--out` and compare the two folders.

## What is here

```
run.cjs               the runner:  node run.cjs <set> [lang]
lib/harness.cjs       Playwright, the signed-in session, the clock, offline, scrolling, screenshots, highlights
lib/steps.cjs         UI steps several sets share (plan cards, adding an exercise, waiting for the saved copy)
lib/mock.cjs          the Supabase mock: sign-in, PostgREST tables, the database functions (rpc)
lib/postgrest.cjs     the bit of PostgREST's query language the app uses (select, embeds, order, filters)
lib/world.cjs         helpers to write made-up data
lib/time.cjs          local ("2026-11-10 18:05", Vilnius) to UTC
worlds/               the data: manual.cjs (the manuals' people), demo.cjs (the deck's demo accounts); index.cjs lists the worlds
sets/                 the image sets: manual.cjs (M), results.cjs (R), phone.cjs (P); index.cjs lists the sets
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
  // all optional: viewport {width,height}, scale, now (ISO), userAgent, world, worldOptions, schemaVersion: 'missing',
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
| `s.setNow('2026-11-12 18:55')` | moves the clock on (Vilnius time): the page's `Date` and the time the database stamps new rows with, for a demo that took minutes |
| `s.scrollTo(target, y)`, `s.scrollToBottom()` | scroll so the element's top edge is `y` CSS px below the top of the window, or to the very bottom |
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

`worlds/manual.cjs` builds the people of the user manuals with the helpers in `lib/world.cjs` (`addUser`, `addPlan`, `addWorkout`, `addGoal`, `addReport`, `link`, `assign`). `build()` returns `{ world, personas }`; a scene's `persona` is a key of `personas`. A new world is a new file in `worlds/` listed in `worlds/index.cjs`, then `world: 'demo'` on the set or a scene. `build(options)` gets `{ lang, ...worldOptions }` (a set or a scene may add `worldOptions`), so a world can differ by language. Times are written as local wall-clock text, or as UTC when they end in `Z`.

### A set

A file in `sets/` exporting `{ id, name, world, worldOptions, outDir(lang), format, quality, scrollbars, defaults: { viewport, scale, now }, scenes }`, listed in `sets/index.cjs`. `format: 'jpeg'` writes `.jpg` at `quality` (default 88); `scrollbars: true` keeps the browser's scrollbars (a headless browser hides them). The images of a set go where `outDir(lang)` says; names and pixel sizes are the contract with whoever uses them.

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

## Sets R and P: the capstone deck

Both use the world `worlds/demo.cjs`: the live demo project on 2026-11-12, that is `supabase/seed.sql` (demo.athlete.a with 8 weeks of training, demo.athlete.b, demo.instructor with the code GYM234) plus what had been done on the live site by then, and write JPEGs (quality 88) under `_task/results/screenshots/`. Every number on the deck's slides can be checked in that file. The mock answers like the database, so the slide numbers (the report, the charts, "Last time") are worked out from the data and nothing is typed into a picture.

**Set R**, `node run.cjs R [lang]`: the demo walkthrough, `{en,lt}/01-login.jpg` to `12-report-sent.jpg`, 1510 x 812 at scale 1 with scrollbars, as the old pictures were taken. Two scenes: `demo-login` (01) and `demo-athlete` (02 to 12, one session: plans, log, save, open, progress, report). The two languages are two live runs, so their data differ: the Lithuanian demo ran first (workout "Kojų diena (demo)" 5 x 5 @ 107.5 kg at 18:45, report at 18:47); the English demo followed (18:54 and 18:55) and found those two rows, which is why its "Last time" says 107.5 kg and it logs 110 kg. `build({ lang })` does that (`afterLtDemo`); `s.setNow` moves the clock to the minute each demo saved and sent. The per-language constants of the walkthrough (title, kg, note, where the old picture was scrolled to) are at the top of `sets/results.cjs`. `13` to `15` (Gmail) and `evidence/` are screens of other products: not made here.

**Set P**, `node run.cjs P [lang]`: the phone pictures of Appendix C, `{en,lt}/phone/p01-install.jpg` to `p12-instructor.jpg`, 390 x 780 at 2x (780 x 1560). The athlete at 18:50 with the Lithuanian demo's workout already there, so the logged workout is Squat 5 x 5 @ 110 kg after "Last time … 107.5 kg"; the live-test plan "Martin's Plan" is left out (`martinsPlan: false`), so the plan a workout is logged under is the first card and a "Waiting to send" row fits on the screen. `p02` uses an iPhone Safari user agent (the how-to card), `p01` dispatches `beforeinstallprompt` (the Install button), `p11` has the mock answer `rpc/schema_version` as an older database does (404, PGRST202; the warning line is not hidden), `p12` is the instructor's phone with athletes A and B. `p06` to `p10` are one scene: offline with saved data, the form filled in offline, **Save**, the waiting row, then back online. The script asserts that exactly one `rpc/log_workout` was sent and that its body has `p_id` and `p_logged_at` (it prints the keys).

Check that a set repeats: run it twice with `--out` into two folders and compare them (`diff -r`); the pictures are byte for byte the same.
