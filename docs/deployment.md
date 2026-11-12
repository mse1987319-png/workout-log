# Deployment: Vercel

*English · [Lietuviškai](lt/deployment.md)*

Lecture 3 (deck slide 14). Gives the app a public URL (see the [deployment diagram](architecture.md#2-deployment-and-infrastructure)). Code travels GitHub → Vercel; every push to `main` deploys production, and every pull request gets a preview link.

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

Every pull request gets its own preview deployment. Open its link and check the change works before merging (deck slide 13, step 4).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "The app is not set up yet… Missing setting: VITE_…" | The variable is missing in Vercel, or was added after the build | Step 2, then Redeploy |
| Blank page | A build from before this check existed, or a JavaScript error | Open the browser console; read the Vercel build log |
| Login or email links lead to localhost | Supabase Site URL / Redirect URLs still point to localhost | Step 3 |
| 404 when reloading `/log` | `vercel.json` missing from the deployed commit | Make sure the commit includes `vercel.json`, then Redeploy |
| Build fails | Read the Vercel build log. Check the env var names and that the change is on `main` (deck slide 14) | Vite 8 needs Node 20.19+ or 22.12+: **Settings → Build and Deployment → Node.js Version** |
