# Logify v5: PWA and Offline Implementation Plan

> **Status:** Implemented on `release/v5`; see the design spec's *As built* section for what changed during the build ([design spec](../specs/2026-11-16-pwa-offline-design.md#as-built-after-approval)).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Logify an installable phone app (PWA) that opens and works without signal. Saved data covers reading, workouts logged offline are sent exactly once when back online, phones get a bottom tab bar, and the app works with the database in both directions: the live app on the new database, and the new app on an older database with a warning.

**Architecture:**
- **PWA:** vite-plugin-pwa (Workbox `generateSW`) precaches the app shell and serves `index.html` for every route.
- **Offline layer:** a small layer in `src/offline/`, localStorage-backed and per user. It adds saved data behind `useLoad`, an outbox plus a sync engine for workouts, a draft for the Log workout form, and a database-version store.
- **Database:** `log_workout()` gains `p_id` and `p_logged_at` for exactly-once saves. `schema_version()` lets the app detect an older database and fall back.

**Tech Stack:**
- React 19.3, Vite 8.3, vite-plugin-pwa 2.0.0 (Workbox 7.4), supabase-js 2.119
- Vitest 5 + Testing Library + jsdom, oxlint
- Supabase Postgres (PL/pgSQL)
- Playwright, used only from the scratchpad, for live checks and screenshots

**Spec:** `docs/superpowers/specs/2026-11-16-pwa-offline-design.md`. Read it first; this plan argues from it.

## Global Constraints

**Git**
- Work only on `release/v5`; nothing is committed to `main`, and there is no PR.
- Push once, in Task 13: `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -u origin release/v5`.
- Commit subjects are plain sentences in the repo's style ("Add …", "Show …"). Every commit message ends with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01N4d25BDEFtTiBnLU4Xv8YT`

**Code and dependencies**
- JavaScript only; plain CSS in `src/index.css`; inline SVG icons, no icon library.
- No new runtime dependency. One new devDependency: `vite-plugin-pwa` `2.0.0`, exact.
- Every user-facing text goes in `src/i18n/translations.js`, with the same key in `en` and `lt` (`translations.test.js` checks this). Plural keys use `.one` / `.few` / `.other`. The copy given in this plan is exact.

**Tests**
- Tests never use the network: the real supabase-js client on `src/test/fakeBackend.js` (`db.retry` is off there).
- `npm test` and `npm run lint` pass at the end of every task.

**Storage**
- localStorage keys (exact): `logify.cache.v1.<userId>.<key>`, `logify.outbox.v1.<userId>`, `logify.draft.v1.<userId>`, `logify.dbVersion`, `logify.installCard.dismissed`.
- sessionStorage key: `logify.oldDbWarning.hidden`.
- Never write or delete other keys (`logify.language`, `sb-*-auth-token`).

**Values from the spec**
- Fast fallback 4000 ms; send limit 15000 ms; outbox retry every 30000 ms; update check every 3600000 ms.
- Logged-time window 30 days.
- At most 30 saved `workout:*` entries and 30 saved `athlete:*` entries per user.
- `schema_version()` returns `5`; `SCHEMA_VERSION = 5`.

**Browser minimums** stay at Chrome 111, Safari 16.4, Firefox 121.

**Live Supabase**
- Reached only through the Management API (`POST https://api.supabase.com/v1/projects/<ref>/database/query`).
- The token is the "Supabase | PAT" row of `_task/.keys/keys.md`; the project ref comes from `VITE_SUPABASE_URL` in `.env.local`. Scripts live in the scratchpad and are never committed, and the PAT is never printed.
- The real database change happens only in Task 13. Task 1's dry runs always roll back.

**Temporary live account:** `logify-v5-check-<unix seconds>@example.com`, shares with no instructor (so no email is sent), deleted at the end of Task 13 even if a step fails.

**`<scratchpad>`** = `C:\Users\DENISG~1\AppData\Local\Temp\claude\590f6c4c39860a14\281f866c-f83d-44c1-8d7d-53071de0dc67\scratchpad`

## Review Focus

1. **Two people on one phone.** A logs out (offline, with a workout waiting) and B logs in. B sees none of A's saved data or waiting workouts, and A's workout is sent when A logs in again. *Tests: Tasks 3, 6, 9.*
2. **The app is closed or reloaded mid-send.** On the next start the workout is *Waiting to send* again and is sent once. *Test: Task 6.*
3. **The phone's storage is full.** Saved data is dropped to make room. If a workout still can't be kept, the form says so and never says "Saved on this phone". *Tests: Tasks 3, 6, 7.*
4. **The plan is deleted or unassigned while a workout waits.** It shows *Couldn't send: …* (in the *Workouts waiting to send* card when the plan is gone), with Try again and Delete. *Tests: Tasks 6, 8.*
5. **The sign-in expired while offline.** On reconnect nothing is sent with the anon key; the outbox waits until Supabase has a session, then sends. *Test: Task 6.*

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/schema.sql` | `log_workout()` v5 (`p_id`, `p_logged_at`), `schema_version()` |
| `supabase/tests/log_workout_offline.test.sql` | Exactly-once, logged time and old-call checks (rolled back) |
| `src/offline/storage.js` | Safe JSON read/write on localStorage (quota-aware) |
| `src/offline/currentUser.js` | Who is signed in, for per-user keys (set by `AuthProvider`) |
| `src/offline/network.js` | `isOnline()`, online/offline events, `useOnline()` |
| `src/offline/savedData.js` | Saved data per user and key, limits, wipe on log out |
| `src/offline/hints.js` | Exercise names and *Last time* from saved Progress |
| `src/offline/warmUp.js` | Quietly saves what offline use needs after sign-in |
| `src/offline/dbVersion.js` | Last known database version, older-database checks |
| `src/offline/outbox.js` | The outbox store (per user, read-through snapshot) |
| `src/offline/sync.js` | Sending: `saveWorkout`, `syncOutbox`, triggers, sent events |
| `src/offline/draft.js` | The unsaved Log workout form |
| `src/offline/useBackgroundSync.js` | Starts the version check, warm-up and outbox sync for a signed-in user |
| `src/api/schema.js` | `getSchemaVersion()` |
| `src/auth/storedSession.js` | Reads supabase-js's stored session |
| `src/pwa/serviceWorker.js` | Registers the service worker; update-ready store |
| `src/pwa/installPrompt.js` | `beforeinstallprompt` store, iOS / standalone detection |
| `src/components/SavedDataNotice.jsx` | *Offline: showing data saved on …* + Try again |
| `src/components/OutboxItem.jsx` | A waiting / couldn't-send workout row |
| `src/components/StatusBar.jsx` | Offline, waiting, sending, failed, older database, new version |
| `src/components/InstallCard.jsx` | Install card (Android prompt, iPhone how-to) |
| `src/components/NavIcons.jsx` | Tab bar icons |
| `src/test/pwaRegisterStub.js` | Test stand-in for `virtual:pwa-register/react` |
| `pwa-assets.config.js`, `public/*.png` | Icon generator config and the committed icons |
| `docs/pwa.md`, `docs/lt/pwa.md` | How the PWA and offline parts work |

Modified, besides the above: `vite.config.js`, `index.html`, `package.json`, `src/App.jsx`, `src/main.jsx`, `src/auth/AuthProvider.jsx`, `src/lib/useLoad.js`, `src/lib/errors.js`, `src/api/workouts.js`, `src/api/progress.js`, `src/api/sharing.js`, every page with a `useLoad`, `src/components/{WorkoutForm,ExercisesEditor,LastTime,Layout,PlanCard,ReportCard}.jsx`, `src/index.css`, `src/i18n/translations.js`, `src/test/{setup,fakeBackend,fakeSupabase}.js`, and the docs listed in Task 12.

---

### Task 1: Database v5: exactly-once `log_workout()` and `schema_version()`

**Files:**
- Modify: `supabase/schema.sql`. Replace the block that starts at the comment `-- Log a workout and its sets in ONE transaction` (line 251) and ends at the `grant execute on function public.log_workout(…) to authenticated;` statement (line 297). Add `schema_version()` right after it.
- Create: `supabase/tests/log_workout_offline.test.sql`
- Scratchpad only: `<scratchpad>/sql/run-sql.mjs`

**Interfaces:**
- Produces (database):
  - `public.log_workout(p_plan_id uuid, p_title text, p_type text, p_duration_min integer, p_activity text = null, p_distance_km numeric = null, p_notes text = null, p_sets jsonb = '[]', p_id uuid = null, p_logged_at timestamptz = null) returns public.workouts`, executable by `authenticated` only.
  - `public.schema_version() returns integer` (5), executable by `anon` and `authenticated`.
  - The v5 block of `schema.sql` runs from the line `-- Log a workout and its sets in ONE transaction` through the line `grant execute on function public.schema_version() to anon, authenticated;`. Task 13 applies exactly that block.

- [ ] **Step 1: Write the SQL test** `supabase/tests/log_workout_offline.test.sql`. Copy the header comment of `sets_summary.test.sql`, adapted. It is one `do $$ … $$;` block:

```sql
do $$
declare
  checks int := 0;
  athlete uuid;
  plan uuid;
  saved public.workouts;
  wid uuid := gen_random_uuid();
  logged timestamptz := now() - interval '2 hours';
  n int;
  queued_before bigint;
begin
  if public.schema_version() is distinct from 5 then
    raise exception 'FAIL: schema_version() should be 5';
  end if;
  checks := checks + 1;

  select p.user_id, p.id into athlete, plan from public.plans p order by p.created_at limit 1;
  if athlete is null then
    raise exception 'TESTS PASSED (% checks; log_workout skipped: no user with a plan yet): rolling back', checks;
  end if;
  select count(*) into queued_before from net.http_request_queue;
  perform set_config('request.jwt.claims', json_build_object('sub', athlete, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  -- The id made on the phone and the time Save was pressed are kept (sets too).
  saved := public.log_workout(plan, 'Offline test', 'strength', 30, null, null, null,
    '[{"exercise": "Squat", "set_no": 1, "reps": 5, "weight_kg": 100}]'::jsonb, wid, logged);
  if saved.id is distinct from wid then raise exception 'FAIL: the workout should keep the id from the phone'; end if;
  if saved.created_at is distinct from logged then raise exception 'FAIL: created_at should be the logged time, got %', saved.created_at; end if;
  if (select min(created_at) from public.workout_sets where workout_id = wid) is distinct from logged then
    raise exception 'FAIL: the sets should get the logged time';
  end if;
  checks := checks + 3;

  -- Sent again: the saved workout comes back, nothing is saved twice.
  saved := public.log_workout(plan, 'Offline test', 'strength', 30, null, null, null,
    '[{"exercise": "Squat", "set_no": 1, "reps": 5, "weight_kg": 100}]'::jsonb, wid, logged);
  select count(*) into n from public.workouts where id = wid;
  if saved.id is distinct from wid or n <> 1 then raise exception 'FAIL: a resend should return the saved workout, rows: %', n; end if;
  select count(*) into n from public.workout_sets where workout_id = wid;
  if n <> 1 then raise exception 'FAIL: a resend should not save the sets again, sets: %', n; end if;
  checks := checks + 2;

  -- A time in the future or older than 30 days is replaced by the server's time.
  saved := public.log_workout(plan, 'Future', 'other', 20, null, null, null, '[]'::jsonb, gen_random_uuid(), now() + interval '1 hour');
  if saved.created_at is distinct from now() then raise exception 'FAIL: a future time should become now()'; end if;
  saved := public.log_workout(plan, 'Too old', 'other', 20, null, null, null, '[]'::jsonb, gen_random_uuid(), now() - interval '31 days');
  if saved.created_at is distinct from now() then raise exception 'FAIL: a time older than 30 days should become now()'; end if;
  checks := checks + 2;

  -- The call the live app on main sends (no p_id, no p_logged_at) still works.
  saved := public.log_workout(plan, 'Old style', 'other', 25, null, null, null, '[]'::jsonb);
  if saved.id is null or saved.created_at is distinct from now() then raise exception 'FAIL: the old-style call should still work'; end if;
  checks := checks + 1;

  -- One webhook request per saved workout (4), none for the resend.
  perform set_config('role', 'postgres', true);
  if exists (select 1 from pg_trigger where tgname = 'workouts_to_zapier' and tgrelid = 'public.workouts'::regclass) then
    if (select count(*) from net.http_request_queue) - queued_before <> 4 then
      raise exception 'FAIL: expected 4 webhook requests (one per saved workout, none for the resend)';
    end if;
    checks := checks + 1;
  end if;

  raise exception 'TESTS PASSED (% checks): rolling back', checks;
end
$$;
```

- [ ] **Step 2: Write the scratchpad runner** `<scratchpad>/sql/run-sql.mjs`. Usage: `node run-sql.mjs [--block] [--commit] <file> [<file>…]`.
  - It reads the PAT from `_task/.keys/keys.md` (the table row whose first two cells are `Supabase` and `PAT`; the value is in backticks) and the project ref from the `VITE_SUPABASE_URL` host in `.env.local`.
  - `--block` takes the v5 block out of the first file, using the start and end lines given under Interfaces.
  - `--commit` wraps the query in `begin; … commit;` and appends `notify pgrst, 'reload schema';`. Without it, nothing the runner sends is meant to persist: the tests always end by raising, which rolls everything back.
  - It joins everything into one query and POSTs it, then prints the HTTP status and the response body's `message` (or JSON). It never prints the PAT.

- [ ] **Step 3: Run the new test against the live database as it is now**

Run: `node <scratchpad>/sql/run-sql.mjs supabase/tests/log_workout_offline.test.sql`
Expected: an error containing `function public.schema_version() does not exist`. This proves the live database is the older version and the test exercises the new code.

- [ ] **Step 4: Write the v5 block in `schema.sql`.** The existing comment above `log_workout` stays, extended with one paragraph on `p_id` and `p_logged_at`. Then:

```sql
-- v5 (offline logging): the old 8-parameter version goes first, because
-- PostgREST can't choose between two versions that both match a call.
drop function if exists public.log_workout(uuid, text, text, integer, text, numeric, text, jsonb);

create or replace function public.log_workout(
  p_plan_id      uuid,
  p_title        text,
  p_type         text,
  p_duration_min integer,
  p_activity     text        default null,
  p_distance_km  numeric     default null,
  p_notes        text        default null,
  p_sets         jsonb       default '[]'::jsonb,
  p_id           uuid        default null,
  p_logged_at    timestamptz default null
)
returns public.workouts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved public.workouts;
  logged_at timestamptz := case
    when p_logged_at between now() - interval '30 days' and now() then p_logged_at
    else now()
  end;
begin
  -- Sent again (the phone never got the answer): return what was saved.
  if p_id is not null then
    select * into saved from public.workouts where id = p_id;
    if found then
      return saved;
    end if;
  end if;

  if p_type <> 'strength' and jsonb_array_length(coalesce(p_sets, '[]'::jsonb)) > 0 then
    raise exception 'Only strength workouts have sets' using errcode = '22023';
  end if;

  insert into public.workouts (id, plan_id, title, type, duration_min, activity, distance_km, notes, sets_summary, created_at)
  values (coalesce(p_id, gen_random_uuid()), p_plan_id, p_title, p_type, p_duration_min, p_activity, p_distance_km,
          p_notes, public.format_sets(p_sets), logged_at)
  returning * into saved;

  insert into public.workout_sets (workout_id, exercise, set_no, reps, weight_kg, created_at)
  select saved.id, s.exercise, s.set_no, s.reps, coalesce(s.weight_kg, 0), saved.created_at
  from jsonb_to_recordset(coalesce(p_sets, '[]'::jsonb))
    as s(exercise text, set_no integer, reps integer, weight_kg numeric);

  return saved;
end;
$$;

revoke execute on function public.log_workout(uuid, text, text, integer, text, numeric, text, jsonb, uuid, timestamptz)
  from public, anon;
grant execute on function public.log_workout(uuid, text, text, integer, text, numeric, text, jsonb, uuid, timestamptz)
  to authenticated;

-- The database's version, so a newer app can tell it is talking to an older
-- database (where this function doesn't exist) and fall back.
create or replace function public.schema_version()
returns integer
language sql
immutable
set search_path = ''
as $$ select 5 $$;

revoke execute on function public.schema_version() from public;
grant execute on function public.schema_version() to anon, authenticated;
```

- [ ] **Step 5: Dry-run the change with the new test, rolled back**

Run: `node <scratchpad>/sql/run-sql.mjs --block supabase/schema.sql supabase/tests/log_workout_offline.test.sql`
Expected: an error message `TESTS PASSED (10 checks): rolling back` (9 if the webhook trigger is absent). Any `FAIL:` means fix the block and repeat.

- [ ] **Step 6: Dry-run the change with every existing SQL test, rolled back.** Run one command per test file:

Run: `node <scratchpad>/sql/run-sql.mjs --block supabase/schema.sql supabase/tests/<name>.test.sql` for `goals`, `instructor_emails`, `plans`, `reports`, `sets_summary` and `sharing`.
Expected: each prints `TESTS PASSED (…)`.

- [ ] **Step 7: Prove nothing was committed on live**

Run the runner on an inline file containing `select pg_get_function_identity_arguments(oid) as args from pg_proc where proname in ('log_workout','schema_version');`
Expected: one row, the 8-argument `log_workout` signature, and no `schema_version`.

- [ ] **Step 8: Commit** `supabase/schema.sql` and `supabase/tests/log_workout_offline.test.sql`. Subject: "Save a workout exactly once with an id from the phone, and report the database version".

---

### Task 2: Offline foundations

**Files:**
- Create: `src/offline/storage.js`, `src/offline/storage.test.js`
- Create: `src/offline/currentUser.js`
- Create: `src/offline/network.js`, `src/offline/network.test.js`
- Modify: `src/lib/errors.js`, `src/lib/errors.test.js`
- Modify: `src/i18n/translations.js`
- Modify: `src/test/setup.js`

**Interfaces:**
- Produces:
  - `storage.js`: `readJson(key) → any | null` (null when missing, unreadable or blocked); `writeJson(key, value) → boolean` (false when full or blocked); `removeKey(key) → void`; `keysStartingWith(prefix) → string[]`.
  - `currentUser.js`: `setCurrentUser(id: string | null) → void` (notifies on change); `getCurrentUser() → string | null`; `subscribeCurrentUser(listener) → () => void`.
  - `network.js`: `isOnline() → boolean` (`navigator.onLine`; `true` if undefined); `subscribeOnline(listener) → () => void` (window `online` / `offline`); `useOnline() → boolean`.
  - `errors.js`: `isNetworkError(error) → boolean` and `friendlyError` (both below).
    - `isNetworkError` is true when `error.name` is `AbortError`, `TimeoutError` or `AuthRetryableFetchError`, or when `error.message` matches `/failed to fetch|load failed|networkerror|network request failed|aborterror|timeouterror|timed out/i`.
    - `friendlyError` uses it for `errors.network`.
    - `KNOWN_CODES` gains `offline_not_saved` and `storage_full`.

- [ ] **Step 1: Write the failing tests**
  - `storage.test.js`:
    - *reads back what it wrote*
    - *gives null for a missing or unreadable value* (`localStorage.setItem('k', '{oops')` → `readJson('k')` is `null`)
    - *reports false when storage is full* (`vi.spyOn(Storage.prototype, 'setItem')` throws `new DOMException('full', 'QuotaExceededError')`)
    - *lists keys by prefix*
  - `network.test.js`: *follows the online and offline events*. Spy on the `navigator.onLine` getter, dispatch `offline` and `online`, and assert `isOnline()` and that the listener was called twice.
  - `errors.test.js`:
    - `isNetworkError` is true for `{ message: 'TypeError: Failed to fetch' }`, `{ message: 'TimeoutError: signal timed out' }` and `{ name: 'AuthRetryableFetchError', message: 'x' }`.
    - It is false for `{ code: '42501', message: 'permission denied for function log_workout' }`.
    - `friendlyError({ code: 'offline_not_saved' })` is `"You're offline, and this hasn't been saved on this phone yet."`
    - `friendlyError({ code: 'storage_full' })` is `"This phone's storage is full, so the workout couldn't be kept here. Free some space, or save it when you're online."`

- [ ] **Step 2: Run them and see them fail.** Run `npx vitest run src/offline src/lib/errors.test.js`. Expected: FAIL, with modules not found and assertion errors.

- [ ] **Step 3: Implement the three modules and the `errors.js` changes.** Add the translations:

| key | en | lt |
|---|---|---|
| `errors.code.offline_not_saved` | You're offline, and this hasn't been saved on this phone yet. | Nėra ryšio, o šie duomenys šiame telefone dar neišsaugoti. |
| `errors.code.storage_full` | This phone's storage is full, so the workout couldn't be kept here. Free some space, or save it when you're online. | Šio telefono atmintis pilna, todėl treniruotės čia išsaugoti nepavyko. Atlaisvinkite vietos arba išsaugokite, kai bus ryšys. |

- [ ] **Step 4: Update `src/test/setup.js`.** In `beforeEach`, before `setLanguage('en')`, run `localStorage.clear(); sessionStorage.clear(); setCurrentUser(null)`.

- [ ] **Step 5: Run everything.** Run `npm test && npm run lint`. Expected: all pass.

- [ ] **Step 6: Commit.** Subject: "Add the offline foundations: safe storage, the signed-in user, network status".

---

### Task 3: Saved data behind `useLoad`

**Files:**
- Create: `src/offline/savedData.js`, `src/offline/savedData.test.js`
- Create: `src/offline/hints.js`, `src/offline/hints.test.js`
- Modify: `src/lib/useLoad.js`; create `src/lib/useLoad.test.jsx`
- Create: `src/components/SavedDataNotice.jsx`
- Modify: `src/api/progress.js` (select `workout_id, exercise, set_no, reps, weight_kg, created_at` for sets), `src/api/progress.test.js`
- Modify: `src/i18n/translations.js`

**Interfaces:**
- Consumes: Task 2's `readJson`, `writeJson`, `removeKey`, `keysStartingWith`, `getCurrentUser`, `isOnline`, `subscribeOnline`, `isNetworkError`.
- Produces:
  - `savedData.js`:
    - `saveData(key: string, data: any, savedAt = Date.now()) → void`. It does nothing without a current user. It stores `{ savedAt, data }` at `logify.cache.v1.<user>.<key>`. A key starting `workout:` or `athlete:` keeps at most 30 of its kind (oldest `savedAt` removed). On a failed write it removes this user's oldest saved entry and retries, up to 20 times.
    - `readSaved(key) → { data, savedAt } | null`
    - `clearSavedData(userId: string) → void`, which removes only `logify.cache.v1.<userId>.*`.
  - `useLoad.js`: `useLoad(load, key = null) → { status, data, error, reload, setData, savedAt }`. `savedAt` is `null` for fresh data and a ms timestamp for saved data. Exports `FAST_FALLBACK_MS = 4000`.
  - `SavedDataNotice.jsx`: default export `SavedDataNotice({ savedAt, onRetry })`. It renders `<p className="state state-saved" role="status">` with `t('offline.savedData', { time: formatDateTime(savedAt) })` and a `link-button` **Try again** (`common.tryAgain`).
  - `hints.js`:
    - `savedExerciseNames() → string[]`: from saved `progress` sets, most recent first, unique by lower-case name.
    - `savedLastSession(exercise, { before } = {}) → { date, sets } | null | undefined`. It returns `undefined` without saved progress and `null` for an unknown exercise. It reuses `lastSessionFrom` from `src/lib/sets.js` on matching rows sorted by `created_at` desc, then `set_no` asc, keeping only rows `created_at < before` when `before` is given.

`useLoad` rules (spec §3):
1. **Offline at start:** with a key, saved data, and `!isOnline()`, show the saved data at once (`status: 'success'`, `savedAt`), and still call `load()`.
2. **Otherwise** call `load()` and start a `FAST_FALLBACK_MS` timer. If it fires first and saved data exists, show the saved data.
3. **The load resolves:** show the fresh data (`savedAt: null`) and `saveData(key, data)`.
4. **The load rejects with `isNetworkError`:**
   - with saved data, show the saved data;
   - with none while offline, set error `{ code: 'offline_not_saved', message }`;
   - with none while online, the Error state with the original error.
5. **Any other error** gives the Error state, even if saved data is shown.
6. **`setData`** also calls `saveData(key, next)` while the shown data is fresh.
7. **Back online:** while saved data is shown, a window `online` event re-runs `load()` without going back to Loading.
8. **No key or no signed-in user:** exactly today's behavior.

- [ ] **Step 1: Write the failing tests**
  - `savedData.test.js`:
    - *keeps each user's data apart*: user-1 saves; `setCurrentUser('user-2')` → `readSaved` is null; back to user-1 → the data. *(Review Focus 1)*
    - *clearSavedData removes only that user's saved data*: user-2's entry and `logify.outbox.v1.user-1` stay.
    - *keeps at most 30 saved workouts, dropping the oldest*
    - *makes room by dropping the oldest saved data when storage is full*: `setItem` throws for the first call, then works; the oldest entry is gone and the new one is there. *(Review Focus 3)*
  - `useLoad.test.jsx` (`renderHook`; `setCurrentUser('user-1')` unless stated), one test per rule:
    - *saves the loaded data for the signed-in user*
    - *shows saved data with its time when the network fails* (saved at `Date.parse('2026-11-16T16:42:00Z')`; `load` rejects `{ message: 'TypeError: Failed to fetch' }` → `status 'success'`, saved data, `savedAt` that time)
    - *keeps the Error state for other errors even with saved data* (`{ code: '42501' }`)
    - *shows saved data straight away when the phone is offline* (onLine false; `load` never settles)
    - *shows saved data after 4 s on a slow network, then the fresh data* (fake timers: 3999 ms → loading; +1 ms → saved; resolve → fresh, `savedAt` null)
    - *offline with nothing saved gives offline_not_saved*
    - *setData updates the saved copy*
    - *loads again when the connection comes back while saved data is shown* (`load` called twice; fresh shown)
    - *without a signed-in user nothing is saved or read*
  - `hints.test.js`:
    - *lists exercise names from the saved progress, most recent first, once each*
    - *finds the last session of an exercise, case-insensitively, before a time*
    - *gives undefined without saved progress and null for a new exercise*
  - `progress.test.js`: the sets `select` includes `set_no`.

- [ ] **Step 2: Run them and see them fail.** Run `npx vitest run src/offline src/lib/useLoad.test.jsx src/api/progress.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement.** Add the translation:

| key | en | lt |
|---|---|---|
| `offline.savedData` | Offline: showing data saved on {time}. | Nėra ryšio: rodomi duomenys, išsaugoti {time}. |

- [ ] **Step 4: Run everything.** Run `npm test && npm run lint`. Expected: all pass, since existing page tests have no signed-in user and so keep today's behavior.

- [ ] **Step 5: Commit.** Subject: "Show saved data when the network is down or slow".

---

### Task 4: Every screen uses saved data; warm-up; hints offline

**Files:**
- Modify: `src/api/sharing.js`. Add `getAthletesOverview() → Promise<{ profile, athletes }>`, moved from `AthletesPage`'s local `loadAthletes`.
- Modify: each screen below. Pass the key, and render `{savedAt && <SavedDataNotice savedAt={savedAt} onRetry={reload} />}` right under the `<h1>`.
  - `PlansPage` → `'plans'`
  - `LogWorkoutPage` → `'planOptions'`
  - `WorkoutDetailPage` → `` `workout:${id}` ``
  - `ProgressPage` → `'progress'`
  - `SharingPage` → `'instructors'`
  - `AthletesPage` → `'athletes'`
  - `AthletePage` → `` `athlete:${id}` ``
  - `ReportCard` → `'report'`, with no notice: the page's notice covers it.
- Modify: `src/components/LastTime.jsx`. On a network rejection use `savedLastSession(name, { before })`; on `undefined`, show nothing, as today.
- Modify: `src/components/ExercisesEditor.jsx`. On rejection, `setNames(savedExerciseNames())`.
- Create: `src/offline/warmUp.js`, `src/offline/warmUp.test.js`
- Tests: one new test in each of the eight screens' test files, plus `LastTime` and `ExercisesEditor` (in `LogWorkoutPage.test.jsx`).

**Interfaces:**
- Consumes: Task 3's `useLoad(load, key)`, `SavedDataNotice`, `saveData`, `savedLastSession`, `savedExerciseNames`; Task 2's `isOnline`, `getCurrentUser`.
- Produces: `warmUp(role: 'athlete' | 'instructor') → Promise<void>`. It does nothing offline or without a user. Otherwise it saves `'planOptions'` (`listPlanOptions`) and `'progress'` (`listProgress`), plus `'athletes'` (`getAthletesOverview`) for instructors. Each error is ignored.

- [ ] **Step 1: Write the failing tests.** For each screen, *shows the saved … offline, with when it was saved*:
  - `setCurrentUser(ATHLETE.id)` and `saveData(<key>, <fixture>, Date.parse('2026-11-16T16:42:00Z'))`
  - `backend.networkDown(<method>, <path>)`
  - render, then assert a fixture value is visible and `screen.getByText(/Offline: showing data saved on/)` is shown.
  - Also:
    - *Last time falls back to the saved progress offline* (`GET /rest/v1/workout_sets` network down; saved progress has Squat sets → "Last time (…): 5 @ 100 kg")
    - *suggests exercise names from the saved progress offline* (datalist option values)
    - `warmUp.test.js`: *saves plan options and progress, and athletes for instructors*; *does nothing offline*.

- [ ] **Step 2: Run them and see them fail.** Run `npm test`. Expected: the new tests FAIL.

- [ ] **Step 3: Implement.** No new texts.

- [ ] **Step 4: Run everything.** Run `npm test && npm run lint`. Expected: all pass.

- [ ] **Step 5: Commit.** Subject: "Use saved data on every screen and for the logging hints".

---

### Task 5: Database version and the new `log_workout` parameters in the API

**Files:**
- Create: `src/api/schema.js`, `src/api/schema.test.js`
- Create: `src/offline/dbVersion.js`, `src/offline/dbVersion.test.js`
- Modify: `src/api/workouts.js`, `src/api/workouts.test.js`
- Modify: `src/test/fakeBackend.js`. Record `signal: init.signal` on each request.

**Interfaces:**
- Consumes: Task 2's `readJson`, `writeJson`, `isNetworkError`.
- Produces:
  - `schema.js`:
    - `SCHEMA_VERSION = 5`
    - `getSchemaVersion() → Promise<number>`: `rpc('schema_version')`. An error with code `PGRST202` resolves `0`; every other error is thrown.
  - `dbVersion.js`:
    - `getDbVersion() → number | null`, a read-through snapshot of `logify.dbVersion` (`{ version, checkedAt }`)
    - `subscribeDbVersion(listener) → () => void`
    - `useDbVersion() → number | null`
    - `checkDbVersion() → Promise<void>`: stores the answer. Any error keeps the last value, and it never throws.
    - `markDbOlder() → void`: stores version 0.
    - `supportsExactlyOnce() → boolean`: true when the version is `null` or `>= SCHEMA_VERSION`.
    - `isDbOlder() → boolean`: the version is not null and `< SCHEMA_VERSION`.
  - `workouts.js`: `createWorkout({ planId, title, type, durationMin, activity = null, distanceKm = null, notes = null, sets = [], id = null, loggedAt = null, signal = null })`.
    - The body has the eight existing params, plus `p_id` only when `id` is given and `p_logged_at` only when `loggedAt` is given.
    - When `signal` is given, the call uses `.abortSignal(signal)`.
    - A thrown error carries `status`, the HTTP status (0 for no response): `throw Object.assign(error, { status })`.

- [ ] **Step 1: Write the failing tests**
  - `schema.test.js`:
    - *reads the database version* (200 → `5`)
    - *treats a missing schema_version() as an older database* (404 `{ code: 'PGRST202', message: 'Could not find the function public.schema_version without parameters in the schema cache' }` → `0`)
    - *throws network errors*
  - `dbVersion.test.js`:
    - *remembers the version on this phone*
    - *keeps the last known version when offline*
    - *counts an unknown version as exactly-once*
    - *markDbOlder makes the database older*
  - `workouts.test.js`:
    - *sends the id made on the phone and the time Save was pressed*: the body contains `p_id: 'b2c4…'` and `p_logged_at: '2026-11-16T16:42:00.000Z'`.
    - *leaves both out when not given*: the existing `toEqual` body stays as is.
    - *reports the HTTP status with an error*: 403 → `status` 403.

- [ ] **Step 2: Run them and see them fail.** Run `npx vitest run src/api src/offline/dbVersion.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run everything.** Run `npm test && npm run lint`. Expected: all pass.

- [ ] **Step 5: Commit.** Subject: "Ask the database for its version and send the new log_workout parameters".

---

### Task 6: The outbox and sending

**Files:**
- Create: `src/offline/outbox.js`, `src/offline/outbox.test.js`
- Create: `src/offline/sync.js`, `src/offline/sync.test.js`

**Interfaces:**
- Consumes: `createWorkout` and `supportsExactlyOnce` / `markDbOlder` (Task 5); `clearSavedData`, `getCurrentUser`, `subscribeCurrentUser`, `isOnline`, `isNetworkError`, `readJson`, `writeJson` (Tasks 2–3); `supabase.auth.getSession()`.
- Produces:
  - **Item shape:** `{ id, loggedAt, workout: { planId, title, type, durationMin, activity, distanceKm, notes, sets }, planName, status: 'waiting' | 'sending' | 'failed', error: { message, code } | null }`. Here `id` comes from `crypto.randomUUID()` and `loggedAt` from `now.toISOString()`.
  - **`outbox.js`:**
    - `getOutbox() → item[]`: the current user's items, a read-through snapshot of `logify.outbox.v1.<user>`, with the same reference until it changes.
    - `subscribeOutbox(listener) → () => void`, which also follows the window `storage` event for that key.
    - `useOutbox() → item[]`
    - `addToOutbox({ workout, planName, status = 'waiting', now = new Date() }) → item`. If the write fails, it calls `clearSavedData(user)` and retries once. If that also fails, it throws `{ code: 'storage_full', message }`.
    - `updateItem(id, changes) → void`, `removeItem(id) → void`
    - When the current user changes, that user's stored items with status `'sending'` are rewritten to `'waiting'`: a send can't survive a page load.
  - **`sync.js`:**
    - `SEND_LIMIT_MS = 15000`, `RETRY_EVERY_MS = 30000`
    - `sendItem(item) → Promise<{ outcome: 'sent', row } | { outcome: 'retry' } | { outcome: 'failed', error }>` (algorithm below)
    - `syncOutbox() → Promise<void>`: runs one round at a time per user (a user change resets it). For each `'waiting'` item in order it marks `'sending'` and then:
      - **sent:** `removeItem`, then notify the sent listeners with `(row, item)`;
      - **retry:** back to `'waiting'`, and the round ends;
      - **failed:** `'failed'` with `{ message, code }`, and it carries on.
    - `saveWorkout({ workout, planName }) → Promise<{ saved: row } | { kept: item }>`, the form's entry point:
      - **Offline:** `addToOutbox` with status `'waiting'`, then return `{ kept }`.
      - **Online:** add as `'sending'`, then race `sendItem` against `SEND_LIMIT_MS`.
        - sent → remove, notify, return `{ saved: row }`;
        - retry → `'waiting'`, return `{ kept }`;
        - failed → remove, then throw the error;
        - the limit comes first → return `{ kept }`. When the send settles later: sent → remove and notify; retry → `'waiting'`; failed → `'failed'`, kept.
      - **If `addToOutbox` throws `storage_full`:** online, send directly with `createWorkout` (no id) and return `{ saved }` or throw that error; offline, throw the `storage_full` error.
    - `retryItem(id) → void`: `'failed'` → `'waiting'` with `error: null`, then `syncOutbox()`.
    - `deleteItem(id) → void`
    - `onWorkoutSent(listener: (row, item) => void) → () => void`
    - `startOutboxSync() → stop: () => void`. It runs `syncOutbox()` now, on window `online`, on `visibilitychange` to visible, and every `RETRY_EVERY_MS` while an item is `'waiting'` and the page is visible.

`sendItem` algorithm:
1. If `(await supabase.auth.getSession()).data.session` is null, return `retry`.
2. `exactlyOnce = supportsExactlyOnce()`.
3. Call `createWorkout({ ...item.workout, ...(exactlyOnce ? { id: item.id, loggedAt: item.loggedAt, signal: AbortSignal.timeout(SEND_LIMIT_MS) } : {}) })`.
4. If that fails with `exactlyOnce` and code `PGRST202`: `markDbOlder()` and repeat at once the old way.
5. **Classify a failure** as `retry` when any of these holds; anything else is `failed`:
   - `isNetworkError(error)`
   - `status >= 500`
   - `status === 401`
   - `code` is one of `PGRST301`, `PGRST302`, `PGRST303`, `23505`

- [ ] **Step 1: Write the failing tests.** All use `supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })` and `setCurrentUser(ATHLETE.id)` unless stated. `sync.test.js`:
  - *saves a workout right away when online and leaves nothing in the outbox* (body `p_id` = the returned item's id; `p_logged_at` ISO string)
  - *keeps the workout when the network is down and sends the same workout in the next round* (networkDown, then 200; second body `toEqual` the first)
  - *keeps the workout without trying when the phone is offline*
  - *stops waiting after 15 s and keeps the workout* (fake timers; `hang`)
  - *drops the workout and throws when the server refuses it* (403 `42501`)
  - *sends waiting workouts in order, one at a time*
  - *marks a refused workout Couldn't send and goes on with the next* (409 `{ code: '23503' }` for the first) *(Review Focus 4)*
  - *tries later after a duplicate id, a server error or an expired sign-in* (`it.each` for `23505` 409, 503, and 401 `PGRST301`)
  - *does not send without a usable session*: the fake auth's `getSession` resolves `{ session: null }`; no POST; the item is waiting. *(Review Focus 5)*
  - *falls back to the old call on an older database and remembers it*: the first POST gets 404 `PGRST202`; the second body has no `p_id` / `p_logged_at`; `getDbVersion()` is `0`.
  - *on an older database the send is not cut off*: `markDbOlder()`; `hang`; the recorded request's `signal` is `undefined`; after 15 s `saveWorkout` resolves `{ kept }`.
  - *announces a workout sent after the form stopped waiting* (`onWorkoutSent` gets the row)
  - *retryItem sends a Couldn't send workout again; deleteItem removes it*
  - *runs one round at a time* (two `syncOutbox()` calls → one POST per item)
  - *keeps each user's outbox apart*: A adds; `setCurrentUser(B)` → empty; back to A → the item. *(Review Focus 1)*
  - *a workout left Sending by a closed app is waiting again after a reload*: stored with status `'sending'`; then `setCurrentUser` → `'waiting'`; `syncOutbox()` sends it once. *(Review Focus 2)*
  - *sends directly when the phone can't keep the workout, and says so offline*: `setItem` throws for `logify.outbox.v1.*`. Online → POST and `{ saved }`; offline → rejects with `code: 'storage_full'`. *(Review Focus 3)*
  - *sends when the connection comes back* (`startOutboxSync`; dispatch `online`)
  - *retries every 30 s while something waits* (fake timers)

- [ ] **Step 2: Run them and see them fail.** Run `npx vitest run src/offline`. Expected: FAIL.

- [ ] **Step 3: Implement `outbox.js` and `sync.js`.**

- [ ] **Step 4: Run everything.** Run `npm test && npm run lint`. Expected: all pass.

- [ ] **Step 5: Commit.** Subject: "Keep workouts logged offline in an outbox and send each one exactly once".

---

### Task 7: Log workout: outbox save and the draft

**Files:**
- Create: `src/offline/draft.js`, `src/offline/draft.test.js`
- Modify: `src/components/WorkoutForm.jsx`
- Modify: `src/components/ExercisesEditor.jsx`. Export `withFreshKeys(exercises) → exercises`, which gives restored exercises and sets new `draft-N` keys.
- Modify: `src/pages/LogWorkoutPage.jsx`, `src/pages/LogWorkoutPage.test.jsx`
- Modify: `src/i18n/translations.js`

**Interfaces:**
- Consumes: Task 6's `saveWorkout`; `getCurrentUser`, `readJson`, `writeJson`.
- Produces:
  - `draft.js`:
    - `readDraft() → { planId, title, type, duration, exercises, activity, distance, notes, savedAt } | null`, for the current user
    - `saveDraft(fields) → void`, which adds `savedAt`
    - `clearDraft(userId = getCurrentUser()) → void`
  - `WorkoutForm`:
    - **Initial state** comes from `readDraft()`, with exercises through `withFreshKeys`. A restored draft shows `<p className="state state-restored" role="status">` with `workout.draftRestored` and a **Start over** (`workout.startOver`) button that resets every field and calls `clearDraft()`.
    - **While typing,** every change calls `saveDraft` while any field (or `planId`) is non-empty, and `clearDraft` otherwise.
    - **`save()`** calls `saveWorkout({ workout, planName })`:
      - `{ saved }` → today's message;
      - `{ kept }` → `<SuccessMessage>{t('workout.kept')} <Link to="/">{t('workout.seeInPlans')}</Link></SuccessMessage>`;
      - both clear the form and `clearDraft()`;
      - a thrown error is shown as today, with the form kept.
  - `LogWorkoutPage`: the initial `chosenPlanId` is `searchParams.get('plan') ?? readDraft()?.planId ?? ''`.

- [ ] **Step 1: Update and add tests** in `LogWorkoutPage.test.jsx`:
  - In both `describe` blocks' `beforeEach`: `supabase.auth = createFakeAuth({ session: sessionFor(ATHLETE) })` and `setCurrentUser(ATHLETE.id)`.
  - In the existing exact-body assertions, add `p_id: expect.any(String), p_logged_at: expect.any(String)`.
  - Replace *explains a failed save, keeps the form and retries* with:
    - *keeps the workout on the phone when the network fails, and later sends the same workout*: networkDown, then 200. The status reads "Saved on this phone. It will be sent as soon as there's a connection, and your instructor gets the email then."; the form clears. `await syncOutbox()` makes a second POST whose body `toEqual`s the first.
    - *explains a refused save, keeps the form and retries*: 403 `42501`, then 200. Alert "You don't have permission to do that."; the title is kept; **Try again** saves.
  - Add:
    - *keeps the workout on the phone when offline and says so* (onLine false; no POST)
    - *restores an unsaved workout when the page is opened again* (type a title, unmount, render again → title restored and "Unsaved workout restored." shown)
    - *Start over clears the restored workout*
    - *a plan picked from My plans wins over the draft's plan*
    - *says the workout couldn't be kept when the phone is full and offline*: the alert has the `storage_full` text, and "Saved on this phone" is absent. *(Review Focus 3)*
  - `draft.test.js`: *keeps the draft per user*; *clearDraft removes it*.

- [ ] **Step 2: Run them and see them fail.** Run `npx vitest run src/pages/LogWorkoutPage.test.jsx src/offline/draft.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement.** Add the translations:

| key | en | lt |
|---|---|---|
| `workout.kept` | Saved on this phone. It will be sent as soon as there's a connection, and your instructor gets the email then. | Išsaugota šiame telefone. Treniruotė bus išsiųsta, kai tik atsiras ryšys; tada treneris gaus ir laišką. |
| `workout.draftRestored` | Unsaved workout restored. | Atkurta neišsaugota treniruotė. |
| `workout.startOver` | Start over | Pradėti iš naujo |

- [ ] **Step 4: Run everything.** Run `npm test && npm run lint`. Expected: all pass.

- [ ] **Step 5: Commit.** Subject: "Log workouts offline and keep the unsaved form on the phone".

---

### Task 8: My plans shows waiting workouts

**Files:**
- Create: `src/components/OutboxItem.jsx`
- Modify: `src/components/PlanCard.jsx`. New prop `waiting = []`; those items render as `OutboxItem`s above the plan's workouts, and "No workouts yet" is hidden while any are present.
- Modify: `src/pages/PlansPage.jsx`, `src/pages/PlansPage.test.jsx`
- Modify: `src/i18n/translations.js`

**Interfaces:**
- Consumes: `useOutbox`, `retryItem`, `deleteItem`, `onWorkoutSent` (Task 6); `friendlyError`.
- Produces:
  - `OutboxItem({ item })`: an `<li className="workout workout-waiting">` that is not a link.
    - It shows the title, type badge, `t('unit.min', …)`, `formatDateTime(item.loggedAt)`, and a badge: `outbox.waiting`, or `outbox.badgeFailed` for failed items.
    - A failed item also shows `t('outbox.failed', { reason: friendlyError(item.error) })`, with **Try again** (`retryItem`) and **Delete**.
    - **Delete** opens an inline `confirm-delete` group with `outbox.confirmDelete`, and the buttons `common.delete` (calls `deleteItem`) and `common.cancel`.
  - `PlansPage`:
    - It groups `useOutbox()` items by `workout.planId`.
    - Items whose plan isn't in `plans` go in a `<section className="card">` titled `outbox.cardTitle`, at the top of the list.
    - `onWorkoutSent(row)` → `setData` inserts `row` at the front of its plan's `workouts`, unless that id is already there.

- [ ] **Step 1: Write the failing tests** in `PlansPage.test.jsx` (fake auth plus `setCurrentUser(ATHLETE.id)`; outbox items via `addToOutbox`):
  - *lists a waiting workout under its plan with a Waiting to send badge, not as a link*
  - *shows a waiting workout whose plan is gone in its own card* *(Review Focus 4)*
  - *shows why a workout couldn't be sent, with Try again and Delete*: the item is failed with `{ code: '23503', message: 'insert or update on table "workouts" violates foreign key constraint' }`. **Try again** POSTs; **Delete** then the confirmation removes it.
  - *turns a sent workout into a normal row*: `await syncOutbox()`, then a link with the title appears and the badge is gone.

- [ ] **Step 2: Run them and see them fail.** Run `npx vitest run src/pages/PlansPage.test.jsx`. Expected: FAIL.

- [ ] **Step 3: Implement.** Add the translations:

| key | en | lt |
|---|---|---|
| `outbox.waiting` | Waiting to send | Laukia išsiuntimo |
| `outbox.badgeFailed` | Couldn't send | Nepavyko išsiųsti |
| `outbox.failed` | Couldn't send: {reason} | Nepavyko išsiųsti: {reason} |
| `outbox.cardTitle` | Workouts waiting to send | Išsiuntimo laukiančios treniruotės |
| `outbox.confirmDelete` | Delete “{title}”? It was never sent, so it will be gone. | Ištrinti „{title}“? Ji nebuvo išsiųsta, todėl dings visam laikui. |

- [ ] **Step 4: Run everything.** Run `npm test && npm run lint`. Expected: all pass.

- [ ] **Step 5: Commit.** Subject: "Show workouts waiting to send in My plans".

---

### Task 9: Signed in offline

**Files:**
- Create: `src/auth/storedSession.js`, `src/auth/storedSession.test.js`
- Modify: `src/auth/AuthProvider.jsx`, `src/auth/AuthProvider.test.jsx`
- Modify: `src/test/fakeSupabase.js`. `createFakeAuth` gets a `storageKey: 'sb-test-auth-token'` property, and its `signOut(options)` accepts options.
- Modify: `src/pages/LoginPage.jsx`, `src/pages/LoginPage.test.jsx`
- Modify: `src/i18n/translations.js`

**Interfaces:**
- Consumes: `setCurrentUser`, `getCurrentUser`, `isOnline`, `isNetworkError`, `clearSavedData`, `clearDraft`.
- Produces:
  - `storedSession.js`: `readStoredSession(storageKey: string) → session | null`. It returns the parsed `localStorage[storageKey]` when it has `access_token`, `refresh_token` and `user.id`.
  - `AuthProvider`:
    - **No session but one in storage:** on `INITIAL_SESSION` with a null session and `readStoredSession(supabase.auth.storageKey)` non-null, use the stored session (`status: 'ready'`).
    - **The current user** is set with `setCurrentUser(session?.user?.id ?? null)` on every change.
    - **`signOut()`**, in order:
      1. Offline: `supabase.auth.signOut({ scope: 'local' })`. Online: `supabase.auth.signOut()`, and on a network error, `signOut({ scope: 'local' })`.
      2. Then `clearSavedData(userId)` and `clearDraft(userId)`. The outbox is kept.
  - `LoginPage`: when `!isOnline()`, a `<p className="hint" role="status">` with `login.offline` above the form.

- [ ] **Step 1: Write the failing tests**
  - `AuthProvider.test.jsx`:
    - *stays signed in offline with the session saved on the phone*: the fake auth emits `INITIAL_SESSION` null; `localStorage['sb-test-auth-token']` holds `sessionFor(ATHLETE)` → user is ATHLETE.
    - *sends a visitor with nothing saved to Login as before*
    - *tells the app who is signed in* (`getCurrentUser()` is `ATHLETE.id`, then `null` after sign-out)
    - *logs out on this phone only when offline* (`signOut` called with `{ scope: 'local' }`)
    - *falls back to logging out on this phone when the server can't be reached*: the first `signOut` resolves `{ error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' } }`.
    - *deletes the user's saved data and draft on log out, but keeps unsent workouts* *(Review Focus 1)*
  - `storedSession.test.js`: *reads a complete stored session*; *ignores missing or broken ones*.
  - `LoginPage.test.jsx`: *says that logging in needs a connection when offline*.

- [ ] **Step 2: Run them and see them fail.** Run `npx vitest run src/auth src/pages/LoginPage.test.jsx`. Expected: FAIL.

- [ ] **Step 3: Implement.** Add the translation:

| key | en | lt |
|---|---|---|
| `login.offline` | You're offline. Logging in needs a connection. | Nėra ryšio. Prisijungti galima tik turint ryšį. |

- [ ] **Step 4: Run everything.** Run `npm test && npm run lint`. Expected: all pass.

- [ ] **Step 5: Commit.** Subject: "Stay signed in offline and log out on this phone when there is no connection".

---

### Task 10: Installable app and the install card

**Files:**
- Modify: `package.json`, `package-lock.json`. Run `npm install -D vite-plugin-pwa@2.0.0 --save-exact`.
- Modify: `vite.config.js`. Add `VitePWA(…)` (below), and `test.alias: [{ find: 'virtual:pwa-register/react', replacement: fileURLToPath(new URL('./src/test/pwaRegisterStub.js', import.meta.url)) }]`.
- Create: `pwa-assets.config.js` (plain object, no import):
  - `preset.transparent`: `{ sizes: [64, 192, 512] }`
  - `preset.maskable`: `{ sizes: [512], padding: 0.2, resizeOptions: { background: '#0f172a' } }`
  - `preset.apple`: `{ sizes: [180], padding: 0.2, resizeOptions: { background: '#0f172a' } }`
  - `images: ['public/favicon.svg']`
- Create (generated, committed): `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`
- Modify: `index.html`. Viewport `width=device-width, initial-scale=1.0, viewport-fit=cover`; add `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />`, `<meta name="apple-mobile-web-app-title" content="Logify" />` and `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`.
- Create: `src/pwa/serviceWorker.js`, `src/pwa/serviceWorker.test.jsx`, `src/test/pwaRegisterStub.js`
- Create: `src/pwa/installPrompt.js`, `src/components/InstallCard.jsx`, `src/components/InstallCard.test.jsx`
- Modify: `src/App.jsx` (call `useRegisterServiceWorker()` once, at the top), `src/main.jsx` (call `listenForInstallPrompt()` before render), `src/pages/PlansPage.jsx` (`<InstallCard />` under the page head)
- Modify: `src/i18n/translations.js`

**`VitePWA` options (exact):**

```js
VitePWA({
  registerType: 'prompt',
  injectRegister: false,
  useCredentials: true,
  includeAssets: ['favicon.svg', 'logo.svg', 'apple-touch-icon-180x180.png'],
  manifest: {
    id: '/',
    name: 'Logify',
    short_name: 'Logify',
    description: '<the lt "meta.description" text from translations.js>',
    lang: 'lt',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#0f766e',
    background_color: '#f5f6f8',
    categories: ['health', 'fitness', 'sports'],
    icons: [
      { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Įrašyti treniruotę', url: '/log', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'Pažanga', url: '/progress', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
  },
})
```

**Interfaces:**
- Produces:
  - `serviceWorker.js`:
    - `UPDATE_CHECK_MS = 3600000`
    - `useRegisterServiceWorker() → void`. It wraps `useRegisterSW` with `onRegisteredSW(url, registration)`, which calls `registration.update()` every `UPDATE_CHECK_MS`. It publishes `needRefresh` and `updateServiceWorker` to a tiny store.
    - `useUpdateReady() → { updateReady: boolean, update: () => void }`, where `update` calls `updateServiceWorker(true)`.
  - `pwaRegisterStub.js`: `useRegisterSW()` returns `{ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: async () => {} }`.
  - `installPrompt.js`:
    - `listenForInstallPrompt() → void`: on `beforeinstallprompt`, call `preventDefault` and keep the event; on `appinstalled`, forget it.
    - `useInstallPrompt() → { canInstall: boolean, install: () => Promise<void> }`
    - `isStandalone() → boolean`: `matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true`
    - `isIos() → boolean`: `/iphone|ipad|ipod/i` on the user agent, or `MacIntel` with `maxTouchPoints > 1`
  - `InstallCard()`:
    - **Hidden** when `isStandalone()` or when `localStorage['logify.installCard.dismissed'] === '1'`.
    - **When `canInstall`:** `install.title`, `install.text`, an **Install** button (`install()`) and **Not now**, which sets the dismissed flag.
    - **When not `canInstall` and `isIos()`:** `install.title`, `install.ios` and **Got it**, which also sets the flag.
    - **Otherwise** nothing.

- [ ] **Step 1: Write the failing tests**
  - `InstallCard.test.jsx`:
    - *offers Install when the browser allows it, and shows the browser's prompt*: dispatch `Object.assign(new Event('beforeinstallprompt'), { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) })`; **Install** calls `prompt`.
    - *Not now hides it for good*
    - *explains Add to Home Screen on iPhone* (spy the `navigator.userAgent` getter)
    - *shows nothing once installed* (stub `window.matchMedia` → matches)
  - `serviceWorker.test.jsx`: *reports a waiting update and applies it*. `vi.mock` the stub to return `needRefresh: [true, …]` and an `updateServiceWorker` spy; `update()` calls it with `true`.

- [ ] **Step 2: Run them and see them fail.** Run `npx vitest run src/components/InstallCard.test.jsx src/pwa`. Expected: FAIL.

- [ ] **Step 3: Install, configure and implement.**
  1. Generate the icons with `npx --yes @vite-pwa/assets-generator@<latest 1.x, pinned in a comment at the top of pwa-assets.config.js>`.
  2. Look at `public/maskable-icon-512x512.png` (Read tool). The whole mark must sit inside the central circle of radius 40% (205 px). If it doesn't, raise `padding` and regenerate.
  3. Add the translations below.

| key | en | lt |
|---|---|---|
| `install.title` | Install Logify | Įdiekite Logify |
| `install.text` | It opens like an app and works without signal. | Logify atsidaro kaip programėlė ir veikia be ryšio. |
| `install.button` | Install | Įdiegti |
| `install.notNow` | Not now | Ne dabar |
| `install.ios` | On iPhone: tap Share, then Add to Home Screen. | iPhone: bakstelėkite „Bendrinti“, tada „Pridėti prie pradžios ekrano“. |
| `install.gotIt` | Got it | Supratau |

- [ ] **Step 4: Run tests and the build.**

Run: `npm test && npm run lint && npm run build`
Expected:
- all tests pass;
- `dist/sw.js` and `dist/manifest.webmanifest` exist, and the manifest's fields equal the options above;
- `dist/index.html` contains `rel="manifest"` with `crossorigin="use-credentials"`;
- `grep -c "ProgressPage" dist/sw.js` ≥ 1, so the lazy chunk is precached.

- [ ] **Step 5: Commit.** Subject: "Make Logify installable: manifest, icons, service worker, update prompt and install card".

---

### Task 11: Phone layout: bottom tab bar and status line

**Files:**
- Create: `src/components/NavIcons.jsx`. Exports `PlansIcon`, `LogIcon`, `ProgressIcon`, `SharingIcon` and `AthletesIcon`: 24×24 stroke SVGs with `className="nav-icon"`, `aria-hidden="true"` and `focusable="false"`.
- Create: `src/components/StatusBar.jsx`, `src/components/StatusBar.test.jsx`
- Create: `src/offline/useBackgroundSync.js`
- Modify: `src/components/Layout.jsx`; create `src/components/Layout.test.jsx`
- Modify: `src/index.css`, `src/i18n/translations.js`

**Interfaces:**
- Consumes:
  - `useOnline` (Task 2), `useOutbox` and `syncOutbox` (Task 6), `useDbVersion` and `isDbOlder` (Task 5)
  - `useUpdateReady` (Task 10)
  - `warmUp` (Task 4), `checkDbVersion` (Task 5), `startOutboxSync` (Task 6)
- Produces:
  - `useBackgroundSync({ userId, role }) → void`. With a `userId`: `checkDbVersion()`, `warmUp(role)`, and `startOutboxSync()`, whose stop function is the cleanup.
  - `StatusBar()` renders nothing when no line applies. Otherwise a `<div className="status-bar">` with these lines, in order:
    1. **Update ready:** `status.update` + **Update** (`update()`).
    2. **Offline:** `status.offline`.
    3. **Any item `'sending'`:** `status.sending`.
    4. **Waiting count > 0:** `status.waiting` (count) + **Send now** (`syncOutbox()`), online only.
    5. **Failed count > 0:** `status.failed` (count).
    6. **`isDbOlder()` and not hidden:** `status.oldDb` + **Hide**, which sets `sessionStorage['logify.oldDbWarning.hidden'] = '1'`.
  - `Layout`:
    - **Menu:** links get icons. A `NavLink to="/log" className="nav-phone-only"` (`nav.log`) goes after My plans, and the My athletes link gets `className="nav-athletes"`.
    - **Status line:** `<StatusBar />` right after `</header>`.
    - **Background work:** `useBackgroundSync({ userId: user?.id, role })`.
    - **Log out with waiting workouts** (`useOutbox().length > 0`): **Log out** opens an inline `confirm-delete` group with `account.unsent` (count) and the buttons **Log out** (`account.logOut`, signs out) and **Cancel**.
  - **CSS, at `max-width: 640px`:**
    - `.nav` becomes a bar fixed to the bottom: grid columns `1fr` each; `padding-bottom: env(safe-area-inset-bottom)`; `--surface` background; top border.
    - `.nav a`: icon over a 0.72rem label, min-height 56px; active in `--accent` with no pill.
    - `.nav-athletes` gets `order: 4`.
    - `.page` gets `padding-bottom: calc(56px + env(safe-area-inset-bottom) + 1.5rem)`.
    - The header is one row.
  - **CSS, all widths:**
    - The header pads with `env(safe-area-inset-top/left/right)`.
    - `.nav-icon` and `.nav-phone-only` are `display: none` above 640px.
    - Styles for `.status-bar`, `.state-saved`, `.state-restored`, `.badge-waiting`, `.badge-failed` and `.install-card`, using the existing tokens, in light and dark.

- [ ] **Step 1: Write the failing tests.** `useBackgroundSync` makes requests of its own. So `Layout.test.jsx` and `App.test.jsx` (which asserts the order of requests) `vi.mock('../offline/useBackgroundSync')` (path relative to the test) as a no-op, and its own behavior is covered by the tests of `checkDbVersion`, `warmUp` and `startOutboxSync`.
  - `Layout.test.jsx` (render `Layout` in a `MemoryRouter` with an `AuthContext.Provider` value):
    - *shows the tabs for an athlete: My plans, Log, Progress, Sharing*
    - *shows My athletes instead of Sharing for an instructor*
    - *warns before logging out when workouts are waiting*: one item; **Log out** shows "1 workout hasn't been sent yet. It stays on this phone and is sent the next time you log in here."; confirming calls `signOut`.
    - *logs out straight away when nothing is waiting*
  - `StatusBar.test.jsx`:
    - *says when the phone is offline*
    - *counts waiting workouts and sends them on Send now*
    - *warns about an older database and can hide the warning*
    - *offers the new version* (`vi.mock('../pwa/serviceWorker')`)
    - *shows nothing when all is well*

- [ ] **Step 2: Run them and see them fail.** Run `npx vitest run src/components/Layout.test.jsx src/components/StatusBar.test.jsx`. Expected: FAIL.

- [ ] **Step 3: Implement.** Add the translations:

| key | en | lt |
|---|---|---|
| `nav.log` | Log | Įrašyti |
| `status.offline` | You're offline. Workouts you log are kept on this phone. | Nėra ryšio. Įrašytos treniruotės saugomos šiame telefone. |
| `status.waiting.one` | {count} workout waiting to send | {count} treniruotė laukia išsiuntimo |
| `status.waiting.few` | (en has none) | {count} treniruotės laukia išsiuntimo |
| `status.waiting.other` | {count} workouts waiting to send | {count} treniruočių laukia išsiuntimo |
| `status.sendNow` | Send now | Siųsti dabar |
| `status.sending` | Sending… | Siunčiama… |
| `status.failed.one` | {count} workout couldn't be sent: see My plans. | Nepavyko išsiųsti {count} treniruotės: žr. „Mano planai“. |
| `status.failed.few` | (en has none) | Nepavyko išsiųsti {count} treniruočių: žr. „Mano planai“. |
| `status.failed.other` | {count} workouts couldn't be sent: see My plans. | Nepavyko išsiųsti {count} treniruočių: žr. „Mano planai“. |
| `status.update` | A new version of Logify is ready. | Paruošta nauja Logify versija. |
| `status.updateNow` | Update | Atnaujinti |
| `status.oldDb` | Logify's database is an older version than this app: workouts logged offline get the time they're sent, and after a dropped connection one could be saved twice. The fix is updating the database (supabase/schema.sql). | Logify duomenų bazė senesnė nei ši programėlė: be ryšio įrašytoms treniruotėms priskiriamas išsiuntimo laikas, o nutrūkus ryšiui ta pati treniruotė gali būti išsaugota du kartus. Sprendimas – atnaujinti duomenų bazę (supabase/schema.sql). |
| `status.hide` | Hide | Slėpti |
| `account.unsent.one` | {count} workout hasn't been sent yet. It stays on this phone and is sent the next time you log in here. | {count} treniruotė dar neišsiųsta. Ji liks šiame telefone ir bus išsiųsta, kai kitą kartą čia prisijungsite. |
| `account.unsent.few` | (en has none) | {count} treniruotės dar neišsiųstos. Jos liks šiame telefone ir bus išsiųstos, kai kitą kartą čia prisijungsite. |
| `account.unsent.other` | {count} workouts haven't been sent yet. They stay on this phone and are sent the next time you log in here. | {count} treniruočių dar neišsiųsta. Jos liks šiame telefone ir bus išsiųstos, kai kitą kartą čia prisijungsite. |

If `translations.test.js` requires identical key sets, add the `.few` keys to `en` with the `.other` text.

- [ ] **Step 4: Run everything and look at it.**
  1. Run `npm test && npm run lint && npm run build`. Expected: all pass.
  2. Run `npm run preview` and open it at 390×844 (Playwright from the scratchpad, or Chrome).
  3. Check: the bar sits at the bottom with four tabs; the content isn't hidden under it; the header is one row; dark mode looks right.

- [ ] **Step 5: Commit.** Subject: "Add the bottom tab bar on phones and the offline status line".

---

### Task 12: Docs (EN + LT)

**Files:**
- Modify:
  - `README.md` and `README.lt.md`: status line; *Browsers and devices* (install on Android and iPhone, the bottom bar, what works offline); Stack (vite-plugin-pwa / Workbox); Repository layout (`src/offline`, `src/pwa`, icons); Environment (none new).
  - `docs/architecture.md` and `docs/lt/architecture.md`: an offline-layer section, and a Mermaid `sequenceDiagram` covering Save offline → outbox → back online → `log_workout(p_id, p_logged_at)` → webhook once.
  - `docs/supabase.md` and `docs/lt/supabase.md`: the new `log_workout` parameters, `schema_version()`, the new test, and how to apply v5 to an existing project (re-run `schema.sql`).
  - `docs/user-manual/en/athlete.md` and `docs/user-manual/lt/athlete.md`:
    - §8 is rewritten for the bottom bar, with new sections *Install on your phone* and *Using Logify without signal*.
    - It notes that on iPhone the installed app keeps its own storage, so you log in once more there.
    - The messages table gets the new messages.
  - `docs/user-manual/en/instructor.md` and `docs/user-manual/lt/instructor.md`: the bottom bar, and offline viewing of athletes.
- Create: `docs/pwa.md` and `docs/lt/pwa.md`:
  - what is cached and where;
  - saved data, the outbox and exactly-once;
  - the older-database warning;
  - testing offline (DevTools → Network → Offline; `npm run build && npm run preview`);
  - regenerating the icons (the `npx` command and its pinned version);
  - the limits (no background sync, iPhone storage, 30-day logged time, Supabase's one-minute refresh pause).

- [ ] **Step 1: Write the docs.** Same tone and structure as the existing files; each EN page is linked to its LT twin, as the others are.
- [ ] **Step 2: Check the links.** Run `grep -o "](\.\{0,2\}/\?[^)#]*\.md" -r README*.md docs | sort -u` and confirm each target file exists. Expected: none missing.
- [ ] **Step 3: Commit.** Subject: "Document the phone app: install, offline use, the outbox and the v5 database".

---

### Task 13: Live checks, the database change, screenshots, push

Scratchpad only:
- `<scratchpad>/live/` holds a Playwright install. `npm i playwright@<version whose Chromium revision is already in %LOCALAPPDATA%\ms-playwright>`; check with `npx playwright --version` and the `chromium-*` folders.
- Scripts live there too, plus `run-sql.mjs` from Task 1.

- [ ] **Step 1: Gate.**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 2: The new app against the database as it is now (older).**
  1. `npm run preview`.
  2. A Playwright script with a phone context (`devices['Pixel 7']`, service workers allowed) signs up the temporary account.
  3. Expect the older-database warning on My plans.
  4. Create a plan, then log a workout online: it's saved. The request has no `p_id`, because the app remembered version 0 or fell back after a PGRST202.
  5. Run `context.setOffline(true)`, log a second workout, and expect "Saved on this phone…" and *Waiting to send*.
  6. Run `context.setOffline(false)`: it's sent within 30 s, and the status line clears.
  7. Record the run in `<scratchpad>/live/report-old-db.md`.

- [ ] **Step 3: Apply the change for real.**

Run: `node <scratchpad>/sql/run-sql.mjs --block --commit supabase/schema.sql`. Here `--commit` wraps the block in `begin; … commit;` and adds `notify pgrst, 'reload schema';`.
Then run every `supabase/tests/*.test.sql` file as is.
Expected: the block returns success; each test prints `TESTS PASSED (…)`, and the new one shows 10 checks.

- [ ] **Step 4: Production's exact request still works.**
  1. Get a JWT for the temporary account: `POST https://<ref>.supabase.co/auth/v1/token?grant_type=password` with the anon key from `.env.local`.
  2. `POST /rest/v1/rpc/log_workout` with the exact eight-key body the app on `main` sends.

Expected: HTTP 200, a row with server time.

- [ ] **Step 5: The new app against the new database.**
  1. Reload the preview: the warning is gone, and `schema_version` answers 5.
  2. Log a workout offline, then reconnect. The request carries `p_id`, and the saved row's `id` equals it, with `created_at` equal to the time Save was pressed.
  3. POST the same body again by HTTP. Expected: the same row comes back, and `select count(*) from workouts where id = '<p_id>'` is 1.
  4. Stop the preview server and reload the page. Expected: the app shell still opens, from the service worker.

- [ ] **Step 6: Delete the temporary account.** Run `delete from auth.users where email like 'logify-v5-check-%@example.com'` through the runner with `--commit`, then count `plans` and `workouts` for that user id. Expected: 0. This step also runs if an earlier step fails.

- [ ] **Step 7: Retake the phone screenshots** `docs/user-manual/images/{en,lt}/80-phone-plans.png` and `81-phone-log.png`. Take them the way the manual's README says: the real app (`npm run dev`) against a mocked Supabase API with made-up people, so nothing touches the live database.
  - Use Playwright `page.route('**/rest/v1/**')` with fixtures matching the current images (account `jonas@example.com`, plans *Winter strength block* assigned and *Running base*).
  - Seed a stored session in localStorage under the `sb-<ref>-auth-token` key with a far-future `expires_at`.
  - Viewport 390×780 at `deviceScaleFactor: 2`, so the images stay 780×1560, in both languages.
  - Look at all four images.
  - Commit them (subject: "Retake the phone screenshots with the bottom tab bar").

- [ ] **Step 8: Push and check the preview.**
  1. Push with the command in Global Constraints.
  2. Find the preview URL: `gh api repos/mse1987319-png/workout-log/deployments?ref=release/v5`, then its statuses' `environment_url`.
  3. Check that `<url>/manifest.webmanifest` and `<url>/sw.js` return 200, and that the page loads.
  4. If the page says the app is not set up, report that the two Supabase variables aren't enabled for Vercel's Preview environment. Don't change Vercel.

- [ ] **Step 9: Report.** Tell the user:
  - what was verified, with the evidence;
  - the preview URL;
  - that the database is now v5 and the live app on `main` still works;
  - what's left for them: installing on their own phone from the preview URL.
