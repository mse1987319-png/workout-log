# Deployment: Vercel

*English · [Lietuviškai](lt/deployment.md)*

Lecture 3 (deck slide 14). Gives the app a public URL (see the [deployment diagram](architecture.md#2-deployment-and-infrastructure)). Code travels GitHub → Vercel; every push to `main` deploys production, and every pull request gets a preview link. Since v5 the same static files also make Logify an installable phone app that works without signal; what that needs from Vercel is in [section 6](#6-the-phone-app-pwa-on-vercel), and the order for releasing v5 is in [section 7](#7-releasing-v5).

## 1. Import the repo

1. Vercel → **Add New… → Project** → import the GitHub repository. The repo is private, so let Vercel's GitHub app access it when asked.
2. Settings are detected automatically. Check them:

   | Setting | Value |
   |---|---|
   | Framework preset | Vite |
   | Build command | `npm run build` |
   | Output directory | `dist` |

## 2. Environment variables, before the first deploy

Under **Environment Variables**, add both, for **Production** and **Preview**:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | same as in your `.env.local` |
| `VITE_SUPABASE_ANON_KEY` | same as in your `.env.local` (the publishable / anon key) |

`VITE_` variables are written into the JavaScript at build time. If you add or change them later, run **Deployments → ⋯ → Redeploy**, or the site keeps the old values. Never add the `service_role` key or the Zapier Catch Hook URL here.

Then press **Deploy** and open the URL Vercel gives you, e.g. `https://workout-log.vercel.app`.

## 3. Tell Supabase about the new address

Supabase → **Authentication → URL Configuration** (details in [supabase.md](supabase.md#3-url-configuration)):

| Setting | Value |
|---|---|
| Site URL | your production URL, e.g. `https://workout-log.vercel.app` |
| Redirect URLs | `https://workout-log.vercel.app/**`, keep `http://localhost:5173/**`, and for preview links `https://*-<your-vercel-account>.vercel.app/**` |

## 4. Test as an outside user (deck slide 14, step 14)

1. Open the live URL in a **private/incognito** window.
2. **Create an account** with a new email → expected: the Empty state, *No plans yet* (deck test 1).
3. Create a plan and log a workout → expected: *Workout saved*. Once Zapier is set up ([zapier.md](zapier.md)), the instructor's email arrives within about a minute.
4. Reload the page on `/log`: it must load, not show a 404. The repo's `vercel.json` sends every path to `index.html`, so client-side routes survive a reload.

Put the live URL into the README (top) and the Notion project page.

## 5. Pull request previews

Every pull request gets its own preview deployment. Open its link and check the change works before merging (deck slide 13, step 4). A preview is served over HTTPS, so on a real phone you can also install it and try it without signal ([section 6](#6-the-phone-app-pwa-on-vercel)).

## 6. The phone app (PWA) on Vercel

The phone app needs nothing to be set up in Vercel: no new environment variable, no setting. `npm run build` puts the service worker (`sw.js`), the manifest (`manifest.webmanifest`) and the icons into `dist/` with the rest of the app, and Vercel serves them like any other static file. What matters:

- **HTTPS is required.** A browser registers a service worker only on HTTPS (or `localhost`). Vercel serves production and every preview over HTTPS, so installing and offline use work on both, from a real phone. A plain `http://` address, such as the dev server opened by its LAN IP, has no service worker and can't be installed. `npm run dev` runs without one on purpose; to try the service worker on your computer, use `npm run build` and `npm run preview` ([setup.md](setup.md#try-the-phone-app-locally)).
- **`sw.js` and `manifest.webmanifest` must be served as themselves, and never cached for long.** `vercel.json` has a single rule, which sends every path to `index.html`. Vercel serves a file that exists (`sw.js`, the manifest, the icons, `assets/…`) before it applies that rule, so the rule only catches client-side routes such as `/log`. The file has no `headers` section, so Vercel's default for static files applies: `Cache-Control: public, max-age=0, must-revalidate`, which makes the browser ask again each time. That is what lets a new version of the app be found. Checked on the v5 preview: `/sw.js` comes back as `application/javascript` and `/manifest.webmanifest` as `application/manifest+json`, both with that header. Do not add a `headers` rule that makes them long-lived, and do not change the rewrite so that it catches them: a service worker file that returns `index.html` cannot register, and a manifest cached for a year can't be corrected.
- **The manifest link carries `crossorigin="use-credentials"`** (in `index.html`), so a preview protected by Vercel's password protection or login can still be installed: the browser sends its cookie with the manifest request.
- **A new deployment reaches installed phones as an offer.** The phone downloads the new version in the background and the status line says *A new version of Logify is ready.* with **Update**. An open app asks every hour, and an app that is started asks as well. Nothing reloads by itself. See [pwa.md](pwa.md#updates).
- **If a preview shows "The app is not set up yet"**, the two Supabase variables aren't enabled for Vercel's **Preview** environment ([step 2](#2-environment-variables-before-the-first-deploy)).

## 7. Releasing v5

v5 was a code change and a database change, and the database change is **backward compatible**: the new parameters of `log_workout()` are optional, so the pre-v5 app on `main` kept working against the v5 database. That decided the order, and the same order suits any later database change that the previous app can live with. v5 was merged into `main` on 2026-11-18 ([PR #28](https://github.com/mse1987319-png/workout-log/pull/28)). The design behind it is in the [v5 design](superpowers/specs/2026-11-16-pwa-offline-design.md#7-compatibility-in-both-directions).

1. **The database first.** In the Supabase SQL Editor, run the whole of [`supabase/schema.sql`](../supabase/schema.sql) from the release branch (it is safe to run again; the v5 block replaces `log_workout()` and adds `schema_version()`), then [`supabase/tests/log_workout_offline.test.sql`](../supabase/tests/log_workout_offline.test.sql), which must end with *TESTS PASSED*. Steps and what to check: [supabase.md](supabase.md#applying-v5-to-an-existing-project). Check that the live app still saves a workout.
2. **Try the preview.** Open the release branch's preview from Vercel's **Deployments** on a real phone: install it, go offline, log a workout, come back online. The status line must not show the older-database warning.
3. **Then merge** the release branch into `main` (`release/v5` stays as the v5 snapshot, like `release/v2` to `release/v4`: each is also tagged `v2` to `v5`, and a repository rule freezes the four branches, so they can't be changed or deleted by accident). For the next version, tag `main` at release time instead of cutting a new release branch, unless an old version has to be maintained. Vercel deploys production, and from then on the live site has the service worker and the install card.
4. **Installed phones** are offered the new version as described above.

> **Warning: never run `main`'s old `supabase/schema.sql` on a v5 database.** A `schema.sql` from before v5 is the pre-v5 one: `main`'s own until 2026-11-18, and any older checkout or pasted copy since. It creates the eight-parameter `log_workout()` next to the v5 one, and every call with the eight original parameters then fails with `PGRST203`. The fix is in the [Supabase troubleshooting table](supabase.md#troubleshooting): drop the eight-parameter version and run the v5 `schema.sql` again.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "The app is not set up yet… Missing setting: VITE_…" | The variable is missing in Vercel, or was added after the build | Step 2, then Redeploy |
| Blank page | A build from before this check existed, or a JavaScript error | Open the browser console; read the Vercel build log |
| Login or email links lead to localhost | Supabase Site URL / Redirect URLs still point to localhost | Step 3 |
| 404 when reloading `/log` | `vercel.json` missing from the deployed commit | Make sure the commit includes `vercel.json`, then Redeploy |
| Build fails | Read the Vercel build log. Check the env var names and that the change is on `main` (deck slide 14) | Vite 8 needs Node 20.19+ or 22.12+: **Settings → Build and Deployment → Node.js Version** |
| The phone offers no **Install**, and the app doesn't open offline | The address isn't HTTPS (or it is `npm run dev`), so there is no service worker | Use the Vercel URL, or `npm run build` + `npm run preview` on localhost ([section 6](#6-the-phone-app-pwa-on-vercel)) |
| `/sw.js` shows the app instead of JavaScript, or the browser reports a service worker MIME type error | The rewrite in `vercel.json` catches the file, or the deployed build has no `sw.js` | Keep the single rewrite rule; check that `npm run build` makes `dist/sw.js` |
| Installed phones keep the old version | The new version is waiting for **Update**, or the app hasn't been opened since | Open the app and press **Update** in the status line ([pwa.md](pwa.md#updates)) |
| Calls to `log_workout()` fail with `PGRST203` after an SQL run | An older `schema.sql` was run on a v5 database | [Section 7](#7-releasing-v5), warning; fix in [supabase.md](supabase.md#troubleshooting) |

## Related

[architecture.md](architecture.md#2-deployment-and-infrastructure) (deployment diagram, and the phone side in [section 7](architecture.md#7-mobile-architecture-pwa)) · [pwa.md](pwa.md) (the phone app) · [supabase.md](supabase.md) (the database, applying v5) · [setup.md](setup.md) (local setup and testing the PWA) · [zapier.md](zapier.md) (the emails)
