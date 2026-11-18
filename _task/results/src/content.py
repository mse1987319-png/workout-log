# Slide texts for build_deck.py, in English and Lithuanian.
# Markup inside strings: **bold**, `code`, [label](url).
ORANGE, TEAL, TEAL_B, BLUE, INK, MUTED, SKY = "F97316", "0F766E", "2DD4BF", "2563EB", "1D2330", "5B6475", "60A5FA"

APP = "https://workout-log-murex-three.vercel.app/"
REPO = "https://github.com/mse1987319-png/workout-log"
BLOB = REPO + "/blob/main/"
TREE = REPO + "/tree/main/"
# v5 (the phone app) was merged into main on 2026-11-18; TREE5 keeps pointing at the release/v5 snapshot branch.
BLOB5 = BLOB
TREE5 = REPO + "/tree/release/v5/"
PRS = REPO + "/pulls?q=is%3Apr+is%3Amerged"
N = "https://app.notion.com/p/"
NOTION_EN = {
    "root": N + "Workout-Log-Project-documentation-4150ecfaf117815bbf2dd6af5ee27323",
    "desc": N + "4160ecfaf117813aa125e98d1d2246b1",
    "tasks": N + "4160ecfaf1178135ab27de5583c3a6c3",
    "decisions": N + "4160ecfaf11781978e9ce85ca8b6adb7",
    "errors": N + "4160ecfaf11781c6bc06e0af7bb74849",
    "links": N + "4160ecfaf1178193bbd9ebc3fd84dc02",
    "tests": N + "4160ecfaf11781bdb131cab7ddf9af3c",
    "manual": N + "4160ecfaf117815b8d31e29bde3fbd61",
}
NOTION_LT = {
    "root": N + "Logify-Projekto-dokumentacija-4160ecfaf1178121a9a7ded3cfc6e929",
    "desc": N + "4160ecfaf117812a8b4bef1872a64e95",
    "tasks": N + "4160ecfaf11781a385e4dee924f6a156",
    "decisions": N + "4160ecfaf1178166b272fe3df12fd13f",
    "errors": N + "4160ecfaf11781558398f92260032249",
    "links": N + "4160ecfaf1178161b3add91cd6e0d83d",
    "tests": N + "4160ecfaf117810fb28ec4bd17d60812",
    "manual": N + "4160ecfaf117814fb910ede8fca1f96d",
}
TASK_EN = "_task/Baigiamasis_projektas_Pilnas_ciklas_nuo_ideijos_iki_produkto_EN2.pptx"
TASK_LT = "_task/Baigiamasis_projektas_Pilnas_ciklas_nuo_ideijos_iki_produkto.pptx"

MARKET = [
    "[Fitbod vs Strong vs Jefit vs Hevy (JEFIT blog)](https://www.jefit.com/blog/fitbod-vs-strong-vs-jefit-vs-hevy)",
    "[10 Best Workout Tracker Apps in 2026 (JEFIT)](https://www.jefit.com/wp/general-fitness/10-best-workout-tracker-apps-in-2026-complete-comparison-guide/)",
    "[Best workout logging apps (Boostcamp)](https://www.boostcamp.app/best/workout-logging)",
    "[Hevy vs Strong vs Fitbod vs JEFIT (Sensai)](https://www.sensai.fit/blog/hevy-vs-strong-vs-fitbod-vs-jefit)",
    "[6 Best Apps to Log Workouts in 2026 (Setgraph)](https://setgraph.app/ai-blog/best-apps-to-log-workouts)",
    "[Best Workout Tracker App Reddit (Setgraph)](https://setgraph.app/ai-blog/best-workout-tracker-app-reddit)",
    "[Hevy Coach (Capterra)](https://www.capterra.com/p/10015732/Hevy-Coach/)",
    "[Hevy Coach (GetApp)](https://www.getapp.com/recreation-wellness-software/a/hevy-coach/)",
    "[Hevy Coach profile (Software Advice)](https://www.softwareadvice.com/personal-trainer/hevy-coach-profile)",
    "[TrueCoach vs Trainerize (Coachway)](https://coachway.io/articles/truecoach-vs-trainerize/)",
    "[Trainerize vs TrueCoach (Exercise.com)](https://www.exercise.com/learn/trainerize-vs-truecoach/)",
    "[TrueCoach vs TrainHeroic (Capterra)](https://www.capterra.com/compare/155784-202308/truecoach-vs-TrainHeroic)",
    "[Coaching platform comparison (FitBudd)](https://www.fitbudd.com/compare)",
    "[What clients say about coaching apps (Coachway)](https://coachway.io/articles/what-clients-say-about-coaching-apps/)",
]

TOOLS = [
    "[Supabase: Database Webhooks](https://supabase.com/docs/guides/database/webhooks)",
    "[Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)",
    "[Zapier Help Center](https://help.zapier.com): Paths, Filter, error handling",
    "[Zapier pricing](https://zapier.com/pricing) · [Supabase pricing](https://supabase.com/pricing) · [Vercel pricing](https://vercel.com/pricing)",
    "[Vercel: environment variables](https://vercel.com/docs/environment-variables)",
    "[Vite: env variables and modes](https://vite.dev/guide/env-and-mode)",
    "[React](https://react.dev) · [React Router](https://reactrouter.com) · [Recharts](https://recharts.org)",
    "[Vitest](https://vitest.dev) · [Testing Library](https://testing-library.com) · [oxlint](https://oxc.rs/docs/guide/usage/linter.html)",
    "[Mermaid](https://mermaid.js.org) (diagrams in the docs)",
]


# =========================================================================
EN = {}
EN["footer"] = "LOGIFY  ·  Capstone project 2026  ·  workout-log-murex-three.vercel.app"

EN["title"] = {
    "kicker": "CAPSTONE PROJECT  ·  THE FULL CYCLE FROM IDEA TO LIVE PRODUCT",
    "title": "Logify: the workout log that tells the coach",
    "sub": "Athletes log strength and cardio sessions. Their instructor gets an email within a minute.",
    "links": [f"Live: [workout-log-murex-three.vercel.app]({APP})",
              f"Code: [github.com/mse1987319-png/workout-log]({REPO})"],
    "year": "2026  ·  React + Vite + PWA  ·  Supabase  ·  Vercel  ·  Zapier  ·  Gmail  ·  Notion",
    "notes": f"""
Timing: ~20 s. The main part takes about 12 minutes (slides 6 and 7 are the v5 phone app); the live demo script is in Appendix A, links in Appendix B, the phone-app screenshots in Appendix C.

Say: Logify is a web workout log. Athletes follow workout plans, log their workouts, and their instructor is emailed automatically about every new workout. Everything shown today runs in production at the link on the slide.

Sources:
- README: {BLOB}README.md
- Live app: {APP}
- Notion project page: {NOTION_EN['root']}
""",
}

EN["problem"] = {
    "title": "The problem and the idea",
    "gap_h": "WHAT EXISTS TODAY",
    "gap": [
        ("Personal loggers", "Strong, Hevy, Fitbod, JEFIT: fast set logging, but built for the athlete alone. "
                             "Data export is often a paid feature.", BLUE),
        ("Coach platforms", "Hevy Coach, TrueCoach, Trainerize, TrainHeroic: priced per client, and the coach "
                            "has to open a dashboard to see anything.", TEAL),
    ],
    "gap_note": "Little sits in between: a simple, free tool that keeps the coach informed without extra effort.",
    "idea_h": "LOGIFY",
    "points": [
        ("The instructor is told, not asked to look",
         "An email within ~1 minute after every workout, and a 7-day progress report on request."),
        ("One free web app for both sides",
         "Athletes and instructors, Lithuanian and English; installs on a phone and works without signal in the gym."),
        ("Progress you can explain",
         "Charts, goals and rule-based suggestions that show the numbers behind them."),
    ],
    "sentence": "**In one sentence:** athletes follow workout plans (their own or assigned by an instructor), log "
                "strength and cardio sessions, and the instructor is emailed automatically about every new workout.",
    "notes": f"""
Timing: ~50 s.

Say: Market research showed two groups. Personal loggers serve the athlete alone. Coach platforms are paid per client, and the coach has to go and look. Logify sits in between: the instructor is told, not asked to look. Every suggestion explains itself, and the app is free for both sides.

Sources:
- Market research: {BLOB}docs/implementation-plan.md (section 14)
- e.g. https://www.jefit.com/blog/fitbod-vs-strong-vs-jefit-vs-hevy , https://coachway.io/articles/truecoach-vs-trainerize/ , https://www.capterra.com/p/10015732/Hevy-Coach/
- Full list: Appendix B, "Market research sources".
""",
}

EN["scope"] = {
    "title": "Scope card: the task's questions answered",
    "kicker": "Task slide 5, as built",
    "head": ["Question (task)", "Answer"],
    "rows": [
        ["Idea in one sentence",
         "A web workout log: athletes follow workout plans (their own or assigned by an instructor), log strength "
         "and cardio sessions, and the instructor is emailed automatically about every new workout."],
        ["Tables A → B (3–4 fields)",
         "**A:** `plans`: id, user_id, name, goal, created_at   →   **B:** `workouts`: id, plan_id → plans.id, "
         "user_id, title, type, duration_min, created_at"],
        ["What a “new record” is",
         "A logged workout: the athlete submits **Log workout** → one INSERT into `workouts` → Supabase Database "
         "Webhook → Zapier."],
        ["Routing field, 2 values",
         "`workouts.type`: **strength** / **other** (cardio, mobility…). Zapier Paths choose the email by it."],
        ["Who gets the email, when",
         "The athlete's **own instructor(s)**, ~1 min after each new workout. Path A (strength): "
         "**“STRENGTH: title”**. Fallback (other): **“New workout: title”**. The email lists the sets."],
        ["Extra event (Extended)",
         "**Send report to instructor** → INSERT into `reports` → second webhook → Zap 2 → progress-report email."],
    ],
    "notes": f"""
Timing: ~45 s.

Say: These are the answers to the scope card on task slide 5. One change since the first draft: the email no longer goes to one fixed Gmail address but to the athlete's own instructor, chosen by the database. Reports are a second event with their own Zap.

Sources:
- Task deck, slide 5: {TASK_EN}
- Implementation plan, section 1: {BLOB}docs/implementation-plan.md
- Notion, 1. Project description: {NOTION_EN['desc']}
""",
}

EN["flow"] = {
    "title": "User flow",
    "athlete": "ATHLETE",
    "instructor": "INSTRUCTOR",
    "steps": [
        ("1", "Sign up, log in", "Pick a role. Language flags on every screen."),
        ("2", "Share", "Type the instructor's code under **Sharing**."),
        ("3", "Pick a plan", "Your own plan, or one the instructor assigned."),
        ("4", "Log workout", "Strength: exercises, sets × reps × kg. Cardio: activity, distance."),
        ("5", "Progress", "Charts, goals and suggestions with their reasons."),
        ("6", "Send report", "A 7-day summary built by the database."),
    ],
    "coach": [
        (0, "a", "Sign up as instructor", "Gets an invite code to give to athletes.", None),
        (2, "b", "Assign a plan", "One plan to many athletes; each logs their own workouts.", None),
        (3, "c", "Email: new workout", "“STRENGTH: Leg day” with the sets, in ~1 min.", "Zap 1"),
        (4, "d", "My athletes", "Read-only view of each athlete's progress.", None),
        (5, "e", "Email: report", "“Progress report: …” for the last 7 days.", "Zap 2"),
    ],
    "notes": f"""
Timing: ~45 s.

Say: There are two roles. The athlete signs up, shares with the instructor by typing a code, logs workouts under a plan, follows their progress and can send a report. The instructor does not need to log in to stay informed: the emails come to them. For details, My athletes shows a read-only view.

Sources:
- User manual, athlete: {BLOB}docs/user-manual/en/athlete.md
- User manual, instructor: {BLOB}docs/user-manual/en/instructor.md
""",
}

EN["arch"] = {
    "title": "Architecture: what connects to what",
    "row": [
        ("Browser", ["React 19 + Vite, JavaScript", "athlete or instructor", "installable PWA (v5)"]),
        ("Supabase (EU)", ["Auth: email + password", "Postgres: 8 tables, RLS", "SQL functions + triggers"]),
        ("Database Webhooks", ["`workouts_to_zapier`", "`reports_to_zapier`", "HTTP POST, JSON"]),
        ("Zapier", ["Zap 1: Filter → Paths", "Zap 2: Filter", "error handlers"]),
        ("Gmail", ["to the athlete's instructor(s)", "STRENGTH / New workout / report"]),
    ],
    "vercel": ("Vercel", "Build + `VITE_` env vars, static hosting, PR previews"),
    "github": ("GitHub", "feature/… branches, 30 merged pull requests"),
    "serves": "serves the app",
    "legend": [
        "**1**  supabase-js with the anon key + the user's JWT; RLS decides what each user sees",
        "**2**  an INSERT into `workouts` or `reports` fires a Database Webhook",
        "**3**  Supabase POSTs the row as JSON to the Zapier Catch Hook",
        "**4**  Gmail sends to `instructor_emails`, set by a database trigger",
    ],
    "callouts": [
        ("No own server", "No backend, no Edge Functions: the logic lives in SQL functions, triggers and RLS."),
        ("Data and code travel apart", "Data: browser → Supabase → Zapier → Gmail. Code: GitHub → Vercel → browser."),
    ],
    "notion": ("Notion + README + docs/", "Written by hand: decisions, errors, tests, manuals (LT / EN)."),
    "notes": f"""
Timing: ~50 s.

Say: Follow the numbers. The browser talks straight to Supabase, and Row Level Security in the database decides what each user may read. When a workout or report row is inserted, Supabase itself posts it to Zapier, so Zapier never needs a database key. Code travels on a separate path: pull requests on GitHub deploy to Vercel.

Sources:
- Architecture, sections 2 and 4: {BLOB}docs/architecture.md
- Task deck, slide 6 ("What connects to what")
""",
}

EN["pwa"] = {
    "title": "Mobile: an installable app that works offline",
    "kicker": "v5  ·  a PWA (progressive web app): same code, no app store, still no own server",
    "phone": "PHONE  ·  THE INSTALLED APP",
    "boxes": [
        ("Service worker", "Caches the whole app, every screen included, so it opens with no signal. A new version waits until you tap **Update**."),
        ("Saved data", "The last result of each screen, per user. Shown with its date when the network is down or slow."),
        ("Outbox", "Workouts logged offline, each with an **id made on the phone** and the time **Save** was pressed. Sent in order, once."),
        ("Draft", "The half-filled Log workout form survives closing the app."),
    ],
    "guard": ("Session guard", "No data request leaves without the user's own token, so an empty answer can never replace saved data. The status line under the header says: offline · N waiting · new version · older database."),
    "vercel": ("Vercel (HTTPS)", "Static files: the app, `manifest.webmanifest` and `sw.js`. The same deploy as the web app; every PR gets a preview."),
    "supabase": ("Supabase (EU)", "`log_workout(p_id, p_logged_at)`: the same id returns the same row, so one row, one webhook, one email. `schema_version()` tells the app which database version it has."),
    "arrows": ["install + updates", "online: network first", "back online: the outbox"],
    "noserver": "Still no own server and no app store: **install from the browser**.",
    "notes": f"""
Timing: ~60 s.

Say: This is v5: the same React app, now a PWA, a progressive web app. You install it from the browser to the home screen. A service worker keeps the whole app on the phone, so it opens with no signal. Online it still goes network first, straight to Supabase. Offline, every screen shows the last data it got, with the date. A workout logged offline waits in an outbox on the phone and is sent when the signal returns. On the server side only one database function changed, to make the send safe to repeat (next slide).

Sources:
- PWA guide: {BLOB5}docs/pwa.md
- Architecture, "Mobile architecture (PWA)": {BLOB5}docs/architecture.md
- Design record: {BLOB5}docs/superpowers/specs/2026-11-16-pwa-offline-design.md
- Live app (v5): {APP}
""",
}

EN["offline"] = {
    "title": "Logging without signal: saved exactly once",
    "kicker": "What happens to a workout logged in a basement gym  ·  v5",
    "steps": [
        ("1", "Save, no signal", "The workout gets an **id** and the time, and goes into the outbox on the phone."),
        ("2", "Waits", "*Waiting to send* in My plans. Survives closing the app."),
        ("3", "Back online", "Sent at once, in order; the app retries every 30 s."),
        ("4", "log_workout", "`p_id` + `p_logged_at`. Was this id saved before?"),
        ("5", "Saved once", "One row, one webhook. A resend returns the same row."),
        ("6", "Email", "The instructor gets it then, with the time of the workout."),
    ],
    "what_h": "WHAT IF…",
    "what_head": ["What if…", "Then…"],
    "what": [
        ["the connection drops during the send", "the same id is sent again: same row, no second email"],
        ["the app is closed while sending", "the workout is *Waiting* again at the next start, and sent once"],
        ["someone else logs in on the same phone", "outbox, saved data and draft are kept per user"],
        ["the database is an older version", "a warning line; the workout is sent the old way, with the send time"],
    ],
    "live": ("Checked on the live database", [
        "A test account (deleted afterwards): a resend returned the **same row**, and there is **1 row** for that id.",
        "The **old app's** request still works, so production was never at risk.",
        "On an older database the app shows a warning and keeps working.",
    ]),
    "notes": f"""
Timing: ~75 s.

Say: The danger of offline logging is a workout saved twice, and a double email to the coach. So the phone makes an id for every workout, and the database function log_workout checks it: if this id was saved before, it returns the saved row and does nothing else. That makes any retry harmless: a dropped connection, a closed app, a second tab. The workout also keeps the time Save was pressed, so charts and "last time" stay right. We checked this on the live database with a test account.

Sources:
- PWA guide, "The outbox": {BLOB5}docs/pwa.md
- Supabase guide, offline logging (v5): {BLOB5}docs/supabase.md
- SQL test: {BLOB5}supabase/tests/log_workout_offline.test.sql
""",
}

EN["erd"] = {
    "title": "Data model (ERD)",
    "plans": ("A · plans", ["**id** uuid PK", "**user_id** → auth.users", "name", "goal", "created_at"]),
    "workouts": ("B · workouts", ["**id** uuid PK", "**plan_id** → plans.id", "**user_id** → auth.users",
                                  "title, duration_min", "**type**: strength | other  ★ routing field",
                                  "activity, distance_km, notes", "sets_summary, instructor_emails", "created_at"]),
    "legend": "Orange: the two tables of the task (A → B). Each workout belongs to one plan; a plan has many workouts.",
    "ext_h": "EXTENDED TABLES (one pull request at a time)",
    "ext": [
        ("workout_sets", "exercise, set_no, reps, kg; n per workout"),
        ("reports", "7-day summary; fires Zap 2"),
        ("goals", "exercise, target kg, date"),
        ("profiles", "role athlete | instructor, invite code"),
        ("instructor_links", "athlete ↔ instructor sharing"),
        ("plan_assignments", "one plan → many athletes"),
    ],
    "rls_h": "Row Level Security",
    "rls": [
        "RLS is on in every table.",
        "`select / update / delete` **using** `user_id = auth.uid()`",
        "`insert` **with check** `user_id = auth.uid()`",
        "No user filters in React: even a modified client can't read other rows.",
        "Instructors read athletes only through `my_athletes()` and `athlete_progress()`, which check the link first.",
        "Assigned plans: extra read-only policies; the owner policies stay unchanged.",
    ],
    "notes": f"""
Timing: ~40 s.

Say: The two task tables are plans and workouts; type is the routing field. Six more tables were added, one pull request at a time. The access rule is the same everywhere: you only see rows whose user_id is you. Instructors never query athlete tables directly; two database functions check the sharing link first.

Sources:
- Schema: {BLOB}supabase/schema.sql
- Architecture, sections 1 and 5: {BLOB}docs/architecture.md
- Supabase guide: {BLOB}docs/supabase.md
- Task deck, slide 9 (data model and RLS)
- Evidence screenshots: Appendix A (Supabase tables, RLS policies)
""",
}

EN["zaps"] = {
    "title": "Automation: Zap 1 and Zap 2",
    "z1_h": "Zap 1  ·  new workout",
    "hook": "Catch Hook",
    "filter": "Filter: type = INSERT and instructor emails exist",
    "paths": "Paths",
    "path_a": "A · record__type = strength → Gmail “STRENGTH: title”",
    "path_b": "Fallback → Gmail “New workout: title”",
    "err": "Each Gmail step has an error handler that alerts the ERROR_EMAIL variable.",
    "z2_h": "Zap 2  ·  progress report",
    "filter2": "Filter: INSERT and instructor emails exist",
    "gmail2": "Gmail “Progress report: athlete, dates”",
    "trap": "**Trap:** the webhook's top-level `type` (INSERT / UPDATE) is not the row's `record__type` "
            "(strength / other). The Filter uses the first, Paths use the second.",
    "shot": "Zap 1 in the Zapier editor (live)",
    "to": "**To:** `record__instructor_emails`, written by a database trigger. No address is typed into Zapier.",
    "notes": f"""
Timing: ~50 s.

Say: Zap 1 catches the webhook. The Filter keeps only new rows that have a recipient; then Paths split by type: strength goes to path A with the STRENGTH subject, everything else to the Fallback. Edits are stopped by the Filter and cost no tasks. Zap 2 does the same for reports. Because the recipient comes from the database, nobody can make my Gmail send mail to an arbitrary address.

Sources:
- Zapier guide: {BLOB}docs/zapier.md
- Task deck, slides 15, 16 and 18
- Zapier help (Paths, Filter, error handling): https://help.zapier.com
""",
}

EN["mail_workout"] = {
    "title": "Who gets an email: a new workout",
    "kicker": "One new user, from sign-up to the instructor's inbox  ·  Zap 1",
    "spine": [
        ("start", "New user signs up"),
        ("dec", "Role at sign-up?"),
        ("proc", "Logs a workout: **Save workout** → one INSERT into `workouts`"),
        ("dec", "Shares with an instructor?"),
        ("dec", "`type` = strength?"),
        ("mail", "**Email “STRENGTH: title”** with the sets, to every linked instructor"),
    ],
    "edges": [None, "Athlete", None, "Yes", "Yes"],
    "downs": [
        (1, "Instructor", "none", "**No email.** Instructors have no **Sharing** screen, so their own workouts "
                                  "reach nobody. They *receive* the emails of athletes who share with them."),
        (2, None, "note", "**Renamed later?** *Edit title* is an UPDATE: the Filter stops it, so no second email."),
        (3, "No", "none", "**No email.** The workout is saved, but its `instructor_emails` is empty: the Filter "
                          "stops the run (0 tasks)."),
        (4, "No", "mail2", "**Email “New workout: title”** to every linked instructor (the Fallback path)."),
    ],
    "facts_h": "GOOD TO KNOW",
    "legend": ["Email sent", "No email"],
    "facts": [
        "**Several instructors?** One email addressed to all of them: 1 Zapier task, not one per instructor.",
        "**Shared later?** Only workouts saved after that are emailed; older ones are not resent. "
        "**Stopped sharing?** The emails stop.",
        "**The athlete gets no copy.** Only instructors are emailed, at the address they signed up with.",
    ],
    "notes": f"""
Timing: ~30 s.

Say: Follow a brand-new user. If they sign up as an instructor, their own workouts email nobody: instructors have no Sharing screen, they are the ones who receive emails. An athlete's workout is emailed only if, at the moment it is saved, they share with at least one instructor. Then the type picks the subject: strength goes down path A, everything else down the Fallback. Renaming a workout later sends nothing.

Behind it: a BEFORE INSERT trigger copies the linked instructors' emails into the row (instructor_emails); the Zapier Filter needs type = INSERT and a non-empty instructor_emails.

Sources:
- Zapier guide, "Who gets the email" and tests Recipient 1–3: {BLOB}docs/zapier.md
- Trigger set_instructor_emails(): {BLOB}supabase/schema.sql
- SQL test: {BLOB}supabase/tests/instructor_emails.test.sql
- User manual, instructor, section 7 "Emails you receive": {BLOB}docs/user-manual/en/instructor.md
""",
}

EN["mail_report"] = {
    "title": "Who gets an email: a progress report",
    "kicker": "The same new user presses Send report to instructor  ·  Zap 2",
    "spine": [
        ("start", "New user signs up"),
        ("dec", "Role at sign-up?"),
        ("proc", "**Progress** → **Send report to instructor**"),
        ("dec", "Sent a report in the last 5 min?"),
        ("dec", "Shares with an instructor?"),
        ("mail", "**Email “Progress report: athlete (dates)”** to every linked instructor"),
    ],
    "edges": [None, "Athlete", None, "No", "Yes"],
    "downs": [
        (1, "Instructor", "none", "**No email.** An instructor's own report is saved, but nobody is linked to "
                                  "them: Zap 2's Filter stops it."),
        (2, None, "note", "**No workouts yet?** Progress shows its empty state; the button appears after the first "
                          "logged workout."),
        (3, "Yes", "none", "**Refused:** “You sent a report a few minutes ago…”. Nothing is saved, no email."),
        (4, "No", "none", "**No email.** The 7-day report is saved without `instructor_emails`: the Filter stops "
                          "Zap 2 (0 tasks)."),
    ],
    "facts_h": "GOOD TO KNOW",
    "legend": ["Email sent", "No email"],
    "facts": [
        "**What is in it:** the last 7 days (workouts, minutes, sets, heaviest lift), written by `send_report()`, "
        "always in English.",
        "**Several instructors?** One email addressed to all of them: 1 Zapier task.",
        "**Recipients** are copied from the sharing links at the moment of sending, by a database trigger. "
        "Nobody can type an address.",
    ],
    "notes": f"""
Timing: ~30 s.

Say: The report follows the same rule, with one more check. The Send report button appears once the athlete has logged a workout. The database refuses a second report within five minutes, so an inbox cannot be flooded. If the athlete shares with nobody, the report is still saved, but Zap 2's Filter stops it and nobody is emailed.

Behind it: send_report() checks the 5-minute rule and inserts one reports row; the same trigger as for workouts fills instructor_emails; the reports_to_zapier webhook starts Zap 2 (Filter → Gmail).

Sources:
- Zapier guide, "Zap 2: progress reports": {BLOB}docs/zapier.md
- send_report() and the trigger: {BLOB}supabase/schema.sql
- User manual, athlete, section 6 "Progress" (Report to your instructor): {BLOB}docs/user-manual/en/athlete.md
""",
}

EN["deploy"] = {
    "title": "Deployment and secrets",
    "pipe": [
        ("Developer machine", "npm test · npm run lint · npm run build; `.env.local` is git-ignored", MUTED),
        ("GitHub", "feature/… branch → pull request → merge to main", INK),
        ("Vercel", "preview for every PR (v5 was tested on one); production on every push to main; `VITE_` vars baked in at build", TEAL),
        ("Supabase · Zapier · Gmail", "Supabase project in eu-west-1; Site URL = the Vercel URL; Zaps on", ORANGE),
    ],
    "sec_h": "Where secrets live",
    "sec_head": ["Secret", "Lives in", "Never in"],
    "secrets": [
        ["Supabase URL + anon key", "Vercel env vars, `.env.local`", "(public; safe only with RLS)"],
        ["service_role / secret key", "admin scripts on my machine", "React, Vercel, the repo"],
        ["Zapier Catch Hook URLs", "Supabase webhook settings", "repo, Notion, screenshots"],
        ["Tokens, demo logins", "`_task/.keys/keys.md` (ignored); AES-256 `keys.zip`", "the repo in plain text"],
    ],
    "tip": "**Lesson:** `VITE_` variables are written into the JavaScript at build time. Change one, then redeploy.",
    "notes": f"""
Timing: ~35 s.

Say: Every pull request gets a Vercel preview; merging to main deploys production. Only the anon key reaches the browser, and that is safe only because RLS is on. The service-role key and the webhook URLs stay where they are; in the screenshots the hook URL is blanked out.

Sources:
- Deployment guide: {BLOB}docs/deployment.md
- Architecture, "Where secrets live": {BLOB}docs/architecture.md
- Task deck, slides 8 and 14
- Vercel env vars: https://vercel.com/docs/environment-variables ; Vite env: https://vite.dev/guide/env-and-mode
""",
}

EN["reqs"] = {
    "title": "Task requirements → what was delivered",
    "kicker": "Task slides 2, 4, 12, 17 and 21",
    "head": ["Part", "Minimum in the task", "Delivered"],
    "rows": [
        ["Code", "GitHub repo, branches, ≥ 3 pull requests", "**30 merged PRs**, one `feature/…` branch per feature, plus the v5 release branch"],
        ["Interface", "React + Vite, JavaScript; 3 screens, 4 states",
         "**8 screens**, each with Loading / Error / Empty / Success; LT / EN; **installable on a phone, works offline (v5)**"],
        ["Data", "Supabase Auth, 2 related tables, RLS", "**8 tables**, RLS on all, SQL functions and triggers"],
        ["Deployment", "Vercel, public URL, env vars", "Live URL, PR previews, `VITE_` env vars"],
        ["Automation", "Webhook → Filter → Paths → Gmail",
         "**Zap 1** with Paths + **Zap 2** for reports; 3 error handlers"],
        ["Documentation", "Notion page, logs, README",
         "Notion (EN + LT): task table, 39 decisions, 17 errors, tests; README, docs/, user manuals"],
        ["Bonus", "A chart from history; an AI feature",
         "**2 charts**, goals, rule-based suggestions (explainable; no AI key in the app)"],
        ["Out of scope", "Payments, realtime, uploads, own server, TypeScript, mobile app",
         "Respected: no server or Edge Functions, no native app: the phone app is a PWA, a web app installed from the browser"],
    ],
    "notes": f"""
Timing: ~45 s.

Say: Every minimum from the task is met, and most go further where that made the product better. The evidence screenshots (Supabase tables and policies, the Zap and its history) are at the end of Appendix A.

Sources:
- Task deck, slides 2, 4, 12, 17, 21: {TASK_EN}
- Merged pull requests: {PRS}
- Notion: 2. Task table {NOTION_EN['tasks']} ; 3. Decision log {NOTION_EN['decisions']} ; 4. Error and fix log {NOTION_EN['errors']}
""",
}

EN["quality"] = {
    "title": "Testing and reliability",
    "tiles": [
        ("524", "unit tests (Vitest), no network", ORANGE),
        ("7", "SQL test suites, each rolls itself back", TEAL_B),
        ("10", "scenarios in the test table", SKY),
        ("~1", "Zapier task per workout or report", ORANGE),
    ],
    "test_h": "Tests",
    "tests": [
        "Unit tests run the real supabase-js client against a fake `fetch`, so they check the exact requests.",
        "SQL tests: RLS between users, sharing, goals, reports, instructor emails, sets summary, saving a workout exactly once.",
        "Test table (task slide 19 + extended): new user, strength / other emails, another user's data, "
        "editing, error state, reports, sharing.",
        "Today's demo: path A and Zap 2 runs are **Successful** in Zap history. v5: offline logging checked live with a test account.",
    ],
    "rel_h": "Reliability",
    "rel": [
        "An error handler on every Gmail step alerts the `ERROR_EMAIL` global variable.",
        "The Filter stops edits and athletes without an instructor: no email, no task.",
        "Cost: ≈ 1 task per workout or report, so 50 workouts ≈ 50 tasks a month.",
        "At most one report per 5 minutes (a database rule).",
        "Four UI states everywhere; plain-language errors with **Try again**.",
    ],
    "notes": f"""
Timing: ~35 s.

Say: 273 unit tests run without a network against a fake backend, and six SQL test suites check the access rules inside the database. Reliability follows task slide 18: error handlers on every Gmail step, an owner in the Zap description, and a cost estimate of about one task per workout.

Sources:
- Unit tests: {TREE}src (files *.test.js / *.test.jsx)
- SQL tests: {TREE}supabase/tests
- Notion, 6. Test table: {NOTION_EN['tests']}
- Zapier guide, sections 6–8 (error handler, cost, cleanup): {BLOB}docs/zapier.md
""",
}

EN["hard"] = {
    "title": "What was hardest",
    "p": "Problem:",
    "f": "Fix:",
    "cards": [
        ("The webhook sees only one row",
         "the email had to list the sets, but sets live in another table and are inserted after the workout.",
         "`log_workout()` saves the workout and its sets in one transaction and writes a one-line "
         "`sets_summary` into the workout row."),
        ("Who gets the email?",
         "a fixed address mails one coach about everybody; an address typed in the app could aim my Gmail at anyone.",
         "a BEFORE INSERT trigger copies the linked instructors' emails into the row; the Filter stops rows "
         "without one."),
        ("type ≠ record__type",
         "the webhook has its own `type` (INSERT / UPDATE) next to the row's `type` (strength / other).",
         "Filter on `type`, Paths on `record__type`; edits reach Zapier but stop at the Filter."),
        ("Env vars on Vercel",
         "the live site said “Missing setting: VITE_SUPABASE_URL”: the integration had created `NEXT_PUBLIC_…` names.",
         "added the two `VITE_` variables for Production and Preview, then redeployed."),
    ],
    "notes": f"""
Timing: ~50 s.

Say: Four things took the longest. First, the webhook only sees the inserted row, so the sets had to be summarised into that row. Second, deciding who gets the email safely: the database does it, not the user. Third, the classic type versus record__type mix-up in Zapier. Fourth, Vercel env var names: Vite only exposes variables that start with VITE_.

Sources:
- Notion, 3. Decision log: {NOTION_EN['decisions']}
- Notion, 4. Error and fix log: {NOTION_EN['errors']}
- Zapier guide: {BLOB}docs/zapier.md ; Deployment guide: {BLOB}docs/deployment.md
""",
}

EN["tco"] = {
    "title": "Total cost of ownership (TCO)",
    "kicker": "Monthly running costs in three scenarios  ·  USD list prices, annual billing, excl. VAT  ·  "
              "checked 16 Nov 2026",
    "head": ["Cost item", ["Course demo", "now, demo users"], ["Club, free for members", "1–2 coaches, 30 athletes"],
             ["Coaching business", "10 coaches, 250 athletes"], "What moves the price"],
    "rows": [
        ["Supabase",
         ["**$0** · Free", "500 MB, 50k users a month"],
         ["**$25** · Pro", "daily backups, never paused"],
         ["**$25** · Pro", "250 of 100k users; data ≪ 8 GB"],
         "Flat until 100k users or 8 GB, then $0.00325 per user and $0.125 per GB. Free pauses after one idle week "
         "and has no backups."],
        ["Zapier",
         ["**$0** on the trial, then **$19.99**", "Pro, 750 tasks; ~50 used"],
         ["**$19.99** · Pro, 750 tasks", "~510 used"],
         ["**$89** · Pro, 5,000 tasks", "~4,250 used"],
         "1 email = 1 task (2–3 ¢). The Free plan can't run these Zaps (no webhooks, Filters or Paths). Over the "
         "limit: pay per task at 1.25×, or new runs wait for the next month."],
        ["Other infra",
         ["**$0**", "Vercel Hobby, Gmail, GitHub, Notion"],
         ["**≈ $1**", "own domain (≈ $11 a year); Resend Free as SMTP"],
         ["**≈ $28**", "Vercel Pro $20, Google Workspace $7, domain"],
         "Vercel Pro once the app earns money (Hobby is non-commercial only); own SMTP to turn sign-up "
         "confirmation back on (Supabase's sender: 2 emails an hour); a branded sender."],
        ["Per month", "**≈ $20**", "**≈ $46**", "**≈ $142**", "Zapier is ≈ 63% of the business bill"],
        ["Per year", "≈ $240", ["≈ $550", "$1.53 per athlete a month"], ["≈ $1,700", "$0.57 per athlete a month"],
         "People time (building, support) not included"],
    ],
    "assume": "**Assumptions:** an active athlete logs 3 workouts and sends 1 report a week ≈ **17 emails = 17 Zapier "
              "tasks a month**. Monthly billing costs more: Zapier $29.99 (750) / $133.50 (5,000), Workspace $8.40.",
    "lever": "**Biggest lever:** Zapier grows with every email, Supabase stays flat. Outside the course rules, a "
             "Supabase Edge Function sending through Resend would replace Zapier (3,000 emails a month free, "
             "50,000 for $20).",
    "notes": f"""
Timing: ~45 s.

Say: Running Logify costs about 20 dollars a month today, and all of it is Zapier: the free plan can't run webhooks or Paths. For a real club with thirty athletes I would move Supabase to Pro for the daily backups: about 46 dollars a month, a dollar and a half per athlete. At 250 athletes it is about 142 dollars, and Zapier is almost two thirds of it, because every email is a task. Supabase stays flat at 25 dollars.

Model: an active athlete logs 3 workouts and sends 1 report a week, about 17 emails a month; each email is one Zapier task (trigger, Filter and Paths steps cost nothing, and runs the Filter stops cost nothing). 30 athletes ≈ 510 tasks, 250 athletes ≈ 4,250 tasks. Prices: USD list prices with annual billing where offered, excluding VAT.

Not in the totals (optional): Supabase point-in-time recovery $100 a month per 7 days; a custom domain for the Supabase API $10 a month; Resend Pro $20 a month (50,000 emails) once sign-up emails pass 3,000 a month or 100 a day.

Sources (checked 2026-11-16):
- Supabase pricing: https://supabase.com/pricing ; built-in auth email limit (2 an hour): https://supabase.com/docs/guides/auth/auth-smtp
- Zapier pricing and overage: https://zapier.com/pricing ; what counts as a task: https://help.zapier.com/hc/en-us/articles/8496196837261
- Vercel pricing: https://vercel.com/pricing ; Hobby is personal, non-commercial only: https://vercel.com/docs/plans/hobby , https://vercel.com/legal/terms
- Google Workspace Business Starter: https://workspace.google.com/pricing ; Resend: https://resend.com/pricing ; .com domain at cost: https://www.cloudflare.com/products/registrar/ (these three from third-party price trackers; check the vendor page)
- Task counts in this project: {BLOB}docs/zapier.md (section 8, Cost)
""",
}

EN["summary"] = {
    "title": "Summary",
    "points": [
        "A live product: **sign up, log a workout, and the instructor gets an email in ~1 minute**.",
        "The task minimum is met and extended: 8 tables, 2 Zaps, charts, goals, suggestions, reports, roles, and (v5) an installable phone app that works offline.",
        "Built in four lectures through 25 pull requests, then v5; documented in Notion, README and docs (LT / EN).",
        "Next: weekly automatic reports (`pg_cron`), custom SMTP to turn email confirmation back on, "
        "an AI summary step in Zap 2.",
    ],
    "next": [
        "Live demo script  →  Appendix A",
        "Links and sources  →  Appendix B   ·   Phone app  →  Appendix C",
        f"[workout-log-murex-three.vercel.app]({APP})",
    ],
    "notes": """
Timing: ~20 s.

Say: To sum up: a live product that closes the loop from a workout in the gym to an email in the coach's inbox. Now let me show it live.

Then switch to the browser and follow Appendix A. If the network fails, use the screenshots in Appendix A.
""",
}

EN["appA"] = {
    "title": "Live demo",
    "subtitle": ["Log a strength workout as an athlete, check progress, send a report, then open the "
                 "instructor's Gmail.",
                 "About 4 minutes  ·  live production site  ·  a screenshot of every step"],
    "notes": "Run this after the main part. If the network fails, click through the screenshots in this appendix. The app screens were retaken from the v5 app with the same "
             "demo data (a mocked API: nothing is saved or emailed); the Gmail, Zapier and Supabase screens are from "
             "the live run on 2026-11-12 (English UI run at 18:54–18:55).",
}

EN["script"] = {
    "title": "Demo script",
    "kicker": "Live site, English UI, about 4 minutes",
    "before_h": "Before you start",
    "before": [
        f"Open [the live site]({APP}) and click the English flag (**EN**, next to the logo).",
        "Log in as `demo.athlete.a@example.com` (password: README → Demo accounts).",
        "Athlete A shares with the instructor `mse1987319+logify@gmail.com` (**Sharing**).",
        "Open Gmail `mse1987319@gmail.com` (switch account at the top right) and search "
        "`to:mse1987319+logify@gmail.com`.",
        "Zapier: both Zaps **On**. One report per 5 min: wait if one was just sent.",
        f"Phone part (optional): open [the live site]({APP}) on a phone (v5 is live since 2026-11-18); screenshots are in Appendix C.",
    ],
    "head": ["#", "Do", "Say", "Time"],
    "steps": [
        ["1", "Log in (EN)", "Each user sees only their own data: RLS.", "0:15"],
        ["2", "My plans → **+ Log workout** on *Strength 5 × 5*", "The instructor assigned this plan.", "0:15"],
        ["3", "Title *Leg day (demo)*, type **Strength**, 55 min", "`type` is the routing field.", "0:20"],
        ["4", "Squat 5 × 5 @ 110 kg; Romanian deadlift 3 × 8 @ 70 kg; a note",
         "“Last time” shows the previous session.", "0:45"],
        ["5", "**Save workout** → **Open it**", "One INSERT → webhook → Zap 1.", "0:15"],
        ["6", "**Progress**: suggestions, goal, charts", "Rule-based; each shows its numbers.", "0:40"],
        ["7", "**Send report to instructor**", "The database builds the report → Zap 2.", "0:15"],
        ["8", "Gmail: open the STRENGTH and the report emails", "Both arrived within a minute.", "0:45"],
    ],
    "fallback": "**If an email is late:** show Zapier → Zap history (runs appear within seconds), or the screenshots "
                "on the next slides.",
    "notes": f"""
Total about 4 minutes. Keep the Gmail tab and the Zapier Zap history tab open in advance.

Demo account logins are documented in the README ("Demo accounts"): {BLOB}README.md#demo-accounts
The demo instructor demo.instructor@example.com is a fake address: Gmail returns an "Address not found" notice for it, which is expected. The real inbox is the alias mse1987319+logify@gmail.com, linked to athlete A under Sharing.
""",
}

EN["demo"] = {"do": "DO", "say": "SAY", "behind": "BEHIND THE SCENES"}

EN["steps"] = [
    {"title": "Step 1 · Log in", "img": ["01-login.jpg"],
     "do": "Open the live site, click the English flag, log in as `demo.athlete.a@example.com`.",
     "say": "Accounts are Supabase Auth. The language choice is kept in the browser.",
     "behind": "The session JWT goes with every request; RLS checks `user_id = auth.uid()`."},
    {"title": "Step 2 · My plans", "img": ["02-plans.jpg"],
     "do": "My plans lists each plan (table A) with its workouts (table B).",
     "say": "*Assigned by your instructor*: the instructor gave this plan to several athletes.",
     "behind": "Assigned plans are readable through an extra, read-only RLS policy."},
    {"title": "Step 3 · Log workout: the empty form", "img": ["03-log-empty.jpg"],
     "do": "Click **+ Log workout** on *Strength 5 × 5*. The plan is preselected.",
     "say": "The hint says the instructor is emailed about every workout; strength ones are flagged."},
    {"title": "Step 4 · Title, type, first exercise", "img": ["04-log-filled-top.jpg"],
     "do": "Title *Leg day (demo)*, type **Strength**, 55 min. Add **Squat**: 5 sets × 5 reps @ 110 kg.",
     "say": "“Last time” shows the previous squat session: 5 × 5 @ 107.5 kg.",
     "behind": "`type = strength` will send Zapier down path A."},
    {"title": "Step 5 · Second exercise and a note", "img": ["05-log-filled-bottom.jpg"],
     "do": "Add **Romanian deadlift** 3 × 8 @ 70 kg and a note, then click **Save workout**.",
     "say": "A new set copies the previous one, so logging in the gym is quick."},
    {"title": "Step 6 · Saved", "img": ["06-log-saved.jpg"],
     "do": "The form confirms *Workout saved: Leg day (demo)*, with links.",
     "behind": "`log_workout()` stores the workout and its sets in one transaction: one INSERT into `workouts` → "
               "one webhook → Zap 1 (18:54)."},
    {"title": "Step 7 · Workout detail", "img": ["07-workout-detail.jpg"],
     "do": "Click **Open it**: sets by exercise, the note, and last time for comparison.",
     "say": "Squat 5 × 5 @ 110 kg, up from 107.5 kg last time."},
    {"title": "Step 8 · Progress: suggestions and goal", "img": ["08-progress-top.jpg"],
     "do": "Open **Progress**.",
     "say": "Suggestions show their numbers: *Romanian deadlift: add 2.5 kg next time*. The squat goal bar "
            "is at 110 / 120 kg.",
     "behind": "Worked out in the browser from the athlete's own sets; no AI key needed."},
    {"title": "Step 9 · Progress: charts", "img": ["09-progress-squat-chart.jpg", "10-progress-minutes-chart.jpg"],
     "caps": ["Heaviest set per session: Squat 90 → 110 kg", "Minutes per week: strength vs other"],
     "do": "Pick **Squat** in the first chart.",
     "say": "+20 kg over 10 sessions; 254 minutes this week.",
     "behind": "Recharts; colors checked for color-blind readers; every chart also has a table view."},
    {"title": "Step 10 · Send report to instructor", "img": ["11-report-before.jpg", "12-report-sent.jpg"],
     "caps": ["Before: the 7-day summary", "After: “Report sent”"],
     "do": "Click **Send report to instructor**.",
     "say": "The instructor gets this summary by email.",
     "behind": "`send_report()` builds the numbers and inserts a `reports` row → webhook → Zap 2. "
               "At most one per 5 min."},
    {"title": "Step 11 · The instructor's Gmail", "img": ["13-gmail-inbox.jpg"], "crop": (0, 0, 0, 0.36),
     "do": "Gmail `mse1987319@gmail.com`, search `to:mse1987319+logify@gmail.com`.",
     "say": "The workout email arrived at 18:54, the report at 18:55.",
     "behind": "Gmail's own interface is in Lithuanian: that is the account's setting, not the app."},
    {"title": "Step 12 · The workout email", "img": ["14-gmail-workout-email.jpg"], "crop": (0, 0, 0, 0.38),
     "do": "Open *STRENGTH: Leg day (demo)*.",
     "say": "The subject comes from path A; the body lists the sets: Squat 5 × 5 @ 110 kg; Romanian deadlift "
            "3 × 8 @ 70 kg.",
     "behind": "*To* = `instructor_emails`. The demo instructor `demo.instructor@example.com` is a fake address, "
               "so Gmail adds an *Address not found* notice under the email."},
    {"title": "Step 13 · The report email", "img": ["15-gmail-report-email.jpg"], "crop": (0, 0, 0, 0.45),
     "do": "Open *Progress report: demo.athlete.a@example.com …*.",
     "say": "6 workouts (4 strength, 2 other), 304 min, 33 sets; heaviest squat 110 kg.",
     "behind": "Zap 2: Catch Hook → Filter → Gmail."},
    {"title": "Behind the scenes · Zap history",
     "img": ["evidence/zapier-history.jpg", "evidence/zapier-run-strength-path.jpg"],
     "caps": ["Zap history: every run Successful", "Run 18:54: the Filter passed, path A (Strength) ran"],
     "do": "Zapier → Zap history; open the 18:54 run.",
     "say": "The Filter passed; the Fallback path did not run.",
     "behind": "Task test 3 (strength → path A) confirmed on the live system."},
    {"title": "Evidence · Supabase tables",
     "img": ["evidence/supabase-workouts-table.jpg", "evidence/supabase-plans-table.jpg"],
     "caps": ["workouts (B): the demo rows are here", "plans (A)"],
     "do": "Supabase → Table Editor.",
     "say": "Table A `plans` and table B `workouts`, linked by `plan_id`."},
    {"title": "Evidence · RLS policies",
     "img": ["evidence/supabase-rls-plans.jpg", "evidence/supabase-rls-workouts.jpg"],
     "caps": ["plans and plan_assignments", "workouts and workout_sets"],
     "do": "Supabase → Database → Policies.",
     "say": "Own rows only; assigned plans add read-only access."},
    {"title": "Evidence · Webhooks and Zap 2",
     "img": ["evidence/supabase-webhooks.jpg", "evidence/zapier-zap2-report.jpg"],
     "caps": ["Database Webhooks (hook URLs hidden)", "Zap 2: Catch Hook → Filter → Gmail + error handler"],
     "do": "Supabase → Integrations → Database Webhooks; Zapier → Zaps.",
     "say": "The hook URLs are secrets, so they are blanked in the screenshots."},
]

EN["appC"] = {
    "title": "Mobile app (PWA)",
    "subtitle": [
        "Install it, use it in the gym, lose the signal, and see the workout arrive once.",
        "About 3 minutes  ·  v5, live since 2026-11-18  ·  the real app on a 390 × 780 px phone, demo data",
    ],
    "notes": f"Run this after Appendix A if the audience asks about phones. Live: open {APP} on a phone (v5 is live since 2026-11-18). The screens here were taken from the real app with a mocked API, so nothing was saved or emailed.",
}

EN["phone"] = [
    {"title": "Phone 1 · Install it",
     "img": ["p01-install.jpg", "p02-ios-install.jpg"],
     "caps": ["Android: the Install button", "iPhone: Share → Add to Home Screen"],
     "do": "Open the site in the phone's browser. Android: tap **Install**. iPhone Safari: **Share**, then **Add to Home Screen**.",
     "say": "No app store: the app is the website, with an icon on the home screen.",
     "behind": "`manifest.webmanifest` + a service worker make it installable; the name and icon come from the manifest."},
    {"title": "Phone 2 · The bottom tab bar",
     "img": ["p03-plans.jpg", "p04-log.jpg", "p05-progress.jpg"],
     "caps": ["My plans", "Log workout", "Progress"],
     "do": "Use the bar at the bottom: My plans, Log, Progress, Sharing (instructors: My athletes).",
     "say": "The same screens as on a computer, laid out for one hand in the gym.",
     "behind": "The same menu becomes the bottom bar at 640 px and below; the layout respects the notch and the home bar."},
    {"title": "Phone 3 · No signal: the last data is still there",
     "img": ["p06-offline-saved.jpg", "p07-offline-log.jpg"],
     "caps": ["Offline: saved data, with its date", "Offline: the form works as usual"],
     "do": "Switch the phone to airplane mode and open the app.",
     "say": "It opens at once. Every screen shows the last data it got, and you can still fill in a workout.",
     "behind": "Service-worker cache + saved data per user in the browser; the session guard stops empty answers from replacing it."},
    {"title": "Phone 4 · Logged offline, sent online",
     "img": ["p08-kept.jpg", "p09-waiting.jpg", "p10-sent.jpg"],
     "caps": ["Saved on this phone", "Waiting to send", "Back online: a normal row"],
     "do": "Press **Save workout** without signal, then switch the connection back on.",
     "say": "The workout waits, then goes out by itself, once. The instructor's email follows.",
     "behind": "The request carries `p_id` + `p_logged_at`; a resend returns the same row: one webhook, one email."},
    {"title": "Phone 5 · Older database, and the instructor",
     "img": ["p11-old-db.jpg", "p12-instructor.jpg"],
     "caps": ["Older database: a warning, the app works", "Instructor: My athletes on a phone"],
     "do": "If the database is an older version, the app shows a warning line. Instructors get the same bottom bar.",
     "say": "The new app can ship before the database change, and nothing breaks.",
     "behind": "`schema_version()` is missing on an older database; the app then sends the old way, without the id."},
]

EN["appB"] = {
    "title": "Links and sources",
    "subtitle": ["Everything this deck is based on: the live product, the repository, the Notion documentation, "
                 "the course task, tool documentation and the market research."],
    "notes": "All links were checked when the deck was made (2026-11-12). The repository is private: "
             "ask the author for access.",
}

EN["links"] = [
    {"title": "Project links",
     "cols": [
         ("Product", [
             f"Live app (v5, installable on a phone): [workout-log-murex-three.vercel.app]({APP})",
             f"Repository: [github.com/mse1987319-png/workout-log]({REPO})",
             f"[Merged pull requests]({PRS})",
             f"[supabase/schema.sql]({BLOB}supabase/schema.sql)",
             f"[supabase/seed.sql]({BLOB}supabase/seed.sql) (demo data)",
             f"[supabase/tests/]({TREE}supabase/tests)",
             f"[release/v5 branch]({TREE5})",
         ]),
         ("Docs in the repository", [
             f"[README]({BLOB}README.md) · [README (LT)]({BLOB}README.lt.md)",
             f"[Architecture: ERD, deployment, mobile]({BLOB}docs/architecture.md)",
             f"[PWA guide: install, offline, outbox]({BLOB5}docs/pwa.md)",
             f"[PWA design record]({BLOB5}docs/superpowers/specs/2026-11-16-pwa-offline-design.md)",
             f"[Implementation plan]({BLOB}docs/implementation-plan.md)",
             f"[Zapier guide]({BLOB}docs/zapier.md)",
             f"[Supabase guide]({BLOB}docs/supabase.md)",
             f"[Deployment guide]({BLOB}docs/deployment.md)",
             f"[Setup]({BLOB}docs/setup.md)",
             f"[User manuals]({BLOB}docs/user-manual/README.md)",
         ]),
         ("Notion", [
             f"[Project documentation]({NOTION_EN['root']})",
             f"[1. Project description]({NOTION_EN['desc']})",
             f"[2. Task table]({NOTION_EN['tasks']})",
             f"[3. Decision log]({NOTION_EN['decisions']})",
             f"[4. Error and fix log]({NOTION_EN['errors']})",
             f"[5. Links]({NOTION_EN['links']})",
             f"[6. Test table]({NOTION_EN['tests']})",
             f"[7. User manual]({NOTION_EN['manual']})",
         ]),
     ]},
    {"title": "Course task, tools and AI",
     "cols": [
         ("Course task", [
             f"Task deck (EN): `{TASK_EN}`",
             f"Task deck (LT): `{TASK_LT}`",
             "Prompts used to scope the idea: `_task/prompts/prompts.md`",
             "This deck's screenshots: `_task/results/screenshots/` (live site, 2026-11-12)",
             "Deck source: `_task/results/src/` (build_deck.py, content.py)",
         ]),
         ("Tool documentation", TOOLS),
         ("AI tools", [
             "[Claude Code](https://claude.com/claude-code): Claude Opus 5.5, Claude Sonnet 5.5",
             "[Google Gemini](https://gemini.google.com)",
             "This deck was generated with Claude Code from the repository docs, Notion and live screenshots.",
         ]),
     ]},
    {"title": "Market research sources", "kicker": "Researched in November 2026 (implementation plan, section 14)",
     "cols": [("Personal loggers", MARKET[:6]), ("Coach platforms", MARKET[6:])], "size": 12},
]


# =========================================================================
LT = {}
LT["footer"] = "LOGIFY  ·  Baigiamasis projektas 2026  ·  workout-log-murex-three.vercel.app"

LT["title"] = {
    "kicker": "BAIGIAMASIS PROJEKTAS  ·  PILNAS CIKLAS NUO IDĖJOS IKI GYVO PRODUKTO",
    "title": "Logify: treniruočių žurnalas, kuris praneša treneriui",
    "sub": "Sportininkai registruoja jėgos ir kardio treniruotes, o jų treneris per minutę gauna el. laišką.",
    "links": [f"Veikianti svetainė: [workout-log-murex-three.vercel.app]({APP})",
              f"Kodas: [github.com/mse1987319-png/workout-log]({REPO})"],
    "year": "2026  ·  React + Vite + PWA  ·  Supabase  ·  Vercel  ·  Zapier  ·  Gmail  ·  Notion",
    "notes": f"""
Laikas: ~20 s. Pagrindinė dalis trunka apie 12 minučių (6 ir 7 skaidrės – v5 telefono programėlė); gyvos demonstracijos scenarijus – A priede, nuorodos – B priede, telefono programėlės ekrano nuotraukos – C priede.

Sakykite: Logify – internetinis treniruočių žurnalas. Sportininkai vykdo treniruočių planus, registruoja treniruotes, o treneris automatiškai gauna el. laišką apie kiekvieną naują treniruotę. Viskas, ką šiandien matysite, veikia gamybinėje aplinkoje adresu, nurodytu skaidrėje.

Šaltiniai:
- README (LT): {BLOB}README.lt.md
- Veikianti svetainė: {APP}
- Notion projekto puslapis: {NOTION_LT['root']}
""",
}

LT["problem"] = {
    "title": "Problema ir idėja",
    "gap_h": "KAS YRA ŠIANDIEN",
    "gap": [
        ("Asmeniniai žurnalai", "Strong, Hevy, Fitbod, JEFIT: greitas serijų registravimas, bet skirta tik "
                                "sportininkui. Duomenų eksportas dažnai mokamas.", BLUE),
        ("Trenerių platformos", "Hevy Coach, TrueCoach, Trainerize, TrainHeroic: kaina pagal klientų skaičių, o "
                                "treneris turi pats atsidaryti skydelį.", TEAL),
    ],
    "gap_note": "Tarp jų beveik nieko nėra: paprasto, nemokamo įrankio, kuris be papildomų pastangų informuotų trenerį.",
    "idea_h": "LOGIFY",
    "points": [
        ("Treneriui pranešama, jam nereikia ieškoti",
         "El. laiškas per ~1 min. po kiekvienos treniruotės ir 7 dienų pažangos ataskaita paprašius."),
        ("Viena nemokama programa abiem pusėms",
         "Sportininkams ir treneriams, lietuvių ir anglų kalbomis; įdiegiama telefone ir veikia be ryšio sporto salėje."),
        ("Paaiškinama pažanga",
         "Diagramos, tikslai ir taisyklėmis pagrįsti pasiūlymai, rodantys savo skaičius."),
    ],
    "sentence": "**Vienu sakiniu:** sportininkai vykdo treniruočių planus (savo arba trenerio priskirtus), "
                "registruoja jėgos ir kardio treniruotes, o treneris automatiškai gauna el. laišką apie kiekvieną "
                "naują treniruotę.",
    "notes": f"""
Laikas: ~50 s.

Sakykite: Rinkos tyrimas parodė dvi grupes. Asmeniniai žurnalai skirti tik sportininkui. Trenerių platformos mokamos pagal klientų skaičių, o treneris turi pats eiti ir žiūrėti. Logify yra per vidurį: treneriui pranešama, jam nereikia ieškoti. Kiekvienas pasiūlymas paaiškina save, o programa nemokama abiem pusėms.

Šaltiniai:
- Rinkos tyrimas: {BLOB}docs/lt/implementation-plan.md (14 skyrius)
- pvz. https://www.jefit.com/blog/fitbod-vs-strong-vs-jefit-vs-hevy , https://coachway.io/articles/truecoach-vs-trainerize/ , https://www.capterra.com/p/10015732/Hevy-Coach/
- Visas sąrašas: B priedas, „Rinkos tyrimo šaltiniai“.
""",
}

LT["scope"] = {
    "title": "Scope kortelė: atsakymai į užduoties klausimus",
    "kicker": "Užduoties 5 skaidrė, kaip įgyvendinta",
    "head": ["Klausimas (užduotis)", "Atsakymas"],
    "rows": [
        ["Idėja vienu sakiniu",
         "Internetinis treniruočių žurnalas: sportininkai vykdo treniruočių planus (savo arba trenerio priskirtus), "
         "registruoja jėgos ir kardio treniruotes, o treneris automatiškai gauna el. laišką apie kiekvieną naują "
         "treniruotę."],
        ["Lentelės A → B (3–4 laukai)",
         "**A:** `plans`: id, user_id, name, goal, created_at   →   **B:** `workouts`: id, plan_id → plans.id, "
         "user_id, title, type, duration_min, created_at"],
        ["Kas yra „naujas įrašas“",
         "Užregistruota treniruotė: sportininkas pateikia formą **Įrašyti treniruotę** → vienas INSERT į "
         "`workouts` → Supabase Database Webhook → Zapier."],
        ["Skirstymo laukas, 2 reikšmės",
         "`workouts.type`: **strength** / **other** (kardio, mobilumas…). Pagal jį Zapier Paths parenka laišką."],
        ["Kas gauna laišką ir kada",
         "Sportininko **treneris (treneriai)**, per ~1 min. po kiekvienos naujos treniruotės. Kelias A (strength): "
         "**„STRENGTH: pavadinimas“**. Fallback (other): **„New workout: pavadinimas“**. Laiške išvardytos serijos."],
        ["Papildomas įvykis (išplėstinis)",
         "**Siųsti ataskaitą treneriui** → INSERT į `reports` → antras webhook → Zap 2 → pažangos ataskaitos laiškas."],
    ],
    "notes": f"""
Laikas: ~45 s.

Sakykite: Tai atsakymai į užduoties 5 skaidrės scope kortelę. Vienas pokytis nuo pirmojo juodraščio: laiškas siunčiamas nebe vienu fiksuotu Gmail adresu, o paties sportininko treneriui, kurį parenka duomenų bazė. Ataskaitos – antras įvykis su savo Zap.

Šaltiniai:
- Užduoties skaidrės, 5 skaidrė: {TASK_LT}
- Įgyvendinimo planas, 1 skyrius: {BLOB}docs/lt/implementation-plan.md
- Notion, 1. Projekto aprašymas: {NOTION_LT['desc']}
""",
}

LT["flow"] = {
    "title": "Naudotojo kelias",
    "athlete": "SPORTININKAS",
    "instructor": "TRENERIS",
    "steps": [
        ("1", "Registracija", "Pasirenkamas vaidmuo. Kalbos vėliavėlės kiekviename ekrane."),
        ("2", "Dalijimasis", "Skiltyje **Dalijimasis** įvedamas trenerio kodas."),
        ("3", "Planas", "Savo planas arba trenerio priskirtas."),
        ("4", "Įrašyti treniruotę", "Jėga: pratimai, serijos × pakartojimai × kg. Kardio: veikla, atstumas."),
        ("5", "Pažanga", "Diagramos, tikslai ir pasiūlymai su priežastimis."),
        ("6", "Siųsti ataskaitą", "7 dienų santrauka, kurią sudaro duomenų bazė."),
    ],
    "coach": [
        (0, "a", "Registracija kaip treneris", "Gauna kodą, kurį duoda sportininkams.", None),
        (2, "b", "Priskirti planą", "Vienas planas daugeliui sportininkų; kiekvienas įrašo savo treniruotes.", None),
        (3, "c", "Laiškas: nauja treniruotė", "„STRENGTH: Kojų diena“ su serijomis, per ~1 min.", "Zap 1"),
        (4, "d", "Mano sportininkai", "Kiekvieno sportininko pažanga, tik skaityti.", None),
        (5, "e", "Laiškas: ataskaita", "„Progress report: …“ už 7 dienas.", "Zap 2"),
    ],
    "notes": f"""
Laikas: ~45 s.

Sakykite: Yra du vaidmenys. Sportininkas užsiregistruoja, įvedęs kodą pasidalija su treneriu, įrašo treniruotes pagal planą, seka pažangą ir gali nusiųsti ataskaitą. Treneriui nereikia jungtis, kad žinotų, kas vyksta: laiškai ateina patys. Jei reikia detalių, skiltis „Mano sportininkai“ rodo tik skaitomą vaizdą.

Šaltiniai:
- Naudotojo vadovas, sportininkas: {BLOB}docs/user-manual/lt/athlete.md
- Naudotojo vadovas, treneris: {BLOB}docs/user-manual/lt/instructor.md
""",
}

LT["arch"] = {
    "title": "Architektūra: kas su kuo jungiasi",
    "row": [
        ("Naršyklė", ["React 19 + Vite, JavaScript", "sportininkas arba treneris", "diegiama PWA (v5)"]),
        ("Supabase (ES)", ["Auth: el. paštas + slaptažodis", "Postgres: 8 lentelės, RLS", "SQL funkcijos ir trigeriai"]),
        ("Database Webhooks", ["`workouts_to_zapier`", "`reports_to_zapier`", "HTTP POST, JSON"]),
        ("Zapier", ["Zap 1: Filter → Paths", "Zap 2: Filter", "klaidų tvarkyklės"]),
        ("Gmail", ["sportininko treneriui (-iams)", "STRENGTH / New workout / ataskaita"]),
    ],
    "vercel": ("Vercel", "Build + `VITE_` aplinkos kintamieji, statinis talpinimas, PR peržiūros"),
    "github": ("GitHub", "feature/… šakos, 30 sulietų pull request"),
    "serves": "pateikia programą",
    "legend": [
        "**1**  supabase-js su anon raktu ir naudotojo JWT; RLS nusprendžia, ką mato kiekvienas",
        "**2**  INSERT į `workouts` arba `reports` paleidžia Database Webhook",
        "**3**  Supabase išsiunčia eilutę kaip JSON į Zapier Catch Hook",
        "**4**  Gmail siunčia adresu `instructor_emails`, kurį įrašo duomenų bazės trigeris",
    ],
    "callouts": [
        ("Jokio savo serverio", "Nėra backend'o ir Edge Functions: logika – SQL funkcijose, trigeriuose ir RLS."),
        ("Duomenys ir kodas keliauja atskirai", "Duomenys: naršyklė → Supabase → Zapier → Gmail. "
                                                "Kodas: GitHub → Vercel → naršyklė."),
    ],
    "notion": ("Notion + README + docs/", "Rašoma ranka: sprendimai, klaidos, testai, vadovai (LT / EN)."),
    "notes": f"""
Laikas: ~50 s.

Sakykite: Sekite numerius. Naršyklė tiesiogiai kalbasi su Supabase, o duomenų bazės Row Level Security nusprendžia, ką kiekvienas naudotojas gali skaityti. Kai įterpiama treniruotės ar ataskaitos eilutė, pati Supabase ją išsiunčia į Zapier, todėl Zapier nereikia jokio duomenų bazės rakto. Kodas keliauja atskiru keliu: pull request GitHub'e diegiami į Vercel.

Šaltiniai:
- Architektūra, 2 ir 4 skyriai: {BLOB}docs/lt/architecture.md
- Užduoties 6 skaidrė („Kas su kuo jungiasi“)
""",
}

LT["pwa"] = {
    "title": "Mobilioji versija: diegiama programėlė be ryšio",
    "kicker": "v5  ·  PWA (progresinė žiniatinklio programėlė): tas pats kodas, jokios programėlių parduotuvės, vis dar be savo serverio",
    "phone": "TELEFONAS  ·  ĮDIEGTA PROGRAMĖLĖ",
    "boxes": [
        ("Service worker", "Išsaugo visą programėlę, įskaitant visus ekranus, todėl ji atsidaro be ryšio. Nauja versija laukia, kol bakstelėsite **Atnaujinti**."),
        ("Išsaugoti duomenys", "Paskutinis kiekvieno ekrano rezultatas, kiekvienam naudotojui atskirai. Rodomas su data, kai tinklo nėra arba jis lėtas."),
        ("Siuntimo eilė", "Be ryšio įrašytos treniruotės; kiekviena turi **telefone sukurtą id** ir laiką, kai paspaudėte **Išsaugoti**. Siunčiamos iš eilės, po vieną kartą."),
        ("Juodraštis", "Pusiau užpildyta treniruotės forma išlieka uždarius programėlę."),
    ],
    "guard": ("Sesijos sargas", "Jokia duomenų užklausa neišeina be paties naudotojo rakto (token), todėl tuščias atsakymas niekada nepakeis išsaugotų duomenų. Būsenos eilutė po antraštės sako: nėra ryšio · N laukia · nauja versija · senesnė duomenų bazė."),
    "vercel": ("Vercel (HTTPS)", "Statiniai failai: programėlė, `manifest.webmanifest` ir `sw.js`. Tas pats diegimas kaip svetainės; kiekvienas PR gauna peržiūrą."),
    "supabase": ("Supabase (ES)", "`log_workout(p_id, p_logged_at)`: tas pats id grąžina tą pačią eilutę, todėl viena eilutė, vienas webhook, vienas laiškas. `schema_version()` pasako programėlei, kokios versijos duomenų bazė."),
    "arrows": ["diegimas + atnaujinimai", "prisijungus: pirma tinklas", "grįžus ryšiui: siuntimo eilė"],
    "noserver": "Vis dar be savo serverio ir be programėlių parduotuvės: **diegiama iš naršyklės**.",
    "notes": f"""
Trukmė: ~60 s.

Sakykite: Tai v5: ta pati React programėlė, dabar PWA, t. y. progresinė žiniatinklio programėlė. Ją įdiegiate iš naršyklės į pradžios ekraną. Service worker laiko visą programėlę telefone, todėl ji atsidaro be ryšio. Prisijungus ji vis dar pirmiausia kreipiasi į tinklą, tiesiai į Supabase. Be ryšio kiekvienas ekranas rodo paskutinius gautus duomenis su data. Be ryšio įrašyta treniruotė laukia siuntimo eilėje telefone ir išsiunčiama, kai ryšys grįžta. Serverio pusėje pasikeitė tik viena duomenų bazės funkcija, kad siuntimą būtų saugu kartoti (kita skaidrė).

Šaltiniai:
- PWA vadovas: {BLOB5}docs/lt/pwa.md
- Architektūra, „Mobilioji architektūra (PWA)“: {BLOB5}docs/lt/architecture.md
- Projektavimo įrašas: {BLOB5}docs/superpowers/specs/2026-11-16-pwa-offline-design.md
- Veikianti svetainė (v5): {APP}
""",
}

LT["offline"] = {
    "title": "Įrašymas be ryšio: išsaugoma lygiai vieną kartą",
    "kicker": "Kas nutinka treniruotei, įrašytai rūsio salėje  ·  v5",
    "steps": [
        ("1", "Išsaugoti be ryšio", "Treniruotė gauna **id** ir laiką ir patenka į siuntimo eilę telefone."),
        ("2", "Laukia", "„Laukia išsiuntimo“ skiltyje Mano planai. Išlieka uždarius programėlę."),
        ("3", "Vėl yra ryšys", "Išsiunčiama iš karto, iš eilės; programėlė bando kas 30 s."),
        ("4", "log_workout", "`p_id` + `p_logged_at`. Ar šis id jau išsaugotas?"),
        ("5", "Išsaugota vieną kartą", "Viena eilutė, vienas webhook. Pakartotinis siuntimas grąžina tą pačią eilutę."),
        ("6", "El. laiškas", "Treneris jį gauna tada, su treniruotės laiku."),
    ],
    "what_h": "O JEI…",
    "what_head": ["O jei…", "Tada…"],
    "what": [
        ["ryšys nutrūksta siunčiant", "tas pats id siunčiamas dar kartą: ta pati eilutė, jokio antro laiško"],
        ["programėlė uždaroma siunčiant", "kitą kartą paleidus treniruotė vėl „laukia“ ir išsiunčiama vieną kartą"],
        ["tame pačiame telefone prisijungia kitas žmogus", "siuntimo eilė, išsaugoti duomenys ir juodraštis laikomi kiekvienam naudotojui atskirai"],
        ["duomenų bazė senesnės versijos", "rodoma įspėjimo eilutė; treniruotė siunčiama senuoju būdu, su išsiuntimo laiku"],
    ],
    "live": ("Patikrinta gyvoje duomenų bazėje", [
        "Bandomoji paskyra (vėliau ištrinta): pakartotinis siuntimas grąžino **tą pačią eilutę**, o tam id yra **1 eilutė**.",
        "**Senosios programėlės** užklausa vis dar veikia, todėl gamybai pavojaus nebuvo.",
        "Senesnėje duomenų bazėje programėlė rodo įspėjimą ir toliau veikia.",
    ]),
    "notes": f"""
Trukmė: ~75 s.

Sakykite: Įrašymo be ryšio pavojus – du kartus išsaugota treniruotė ir dvigubas laiškas treneriui. Todėl telefonas kiekvienai treniruotei sukuria id, o duomenų bazės funkcija log_workout jį tikrina: jei šis id jau išsaugotas, grąžina išsaugotą eilutę ir daugiau nieko nedaro. Todėl bet koks pakartojimas nekenksmingas: nutrūkęs ryšys, uždaryta programėlė, antras skirtukas. Treniruotė taip pat išlaiko laiką, kai paspaudėte Išsaugoti, todėl grafikai ir „praeitas kartas“ lieka teisingi. Tai patikrinome gyvoje duomenų bazėje su bandomąja paskyra.

Šaltiniai:
- PWA vadovas, „Siuntimo eilė“: {BLOB5}docs/lt/pwa.md
- Supabase vadovas, įrašymas be ryšio (v5): {BLOB5}docs/lt/supabase.md
- SQL testas: {BLOB5}supabase/tests/log_workout_offline.test.sql
""",
}

LT["erd"] = {
    "title": "Duomenų modelis (ERD)",
    "plans": ("A · plans", ["**id** uuid PK", "**user_id** → auth.users", "name", "goal", "created_at"]),
    "workouts": ("B · workouts", ["**id** uuid PK", "**plan_id** → plans.id", "**user_id** → auth.users",
                                  "title, duration_min", "**type**: strength | other  ★ skirstymo laukas",
                                  "activity, distance_km, notes", "sets_summary, instructor_emails", "created_at"]),
    "legend": "Oranžinės – dvi užduoties lentelės (A → B). Kiekviena treniruotė priklauso vienam planui; "
              "plane gali būti daug treniruočių.",
    "ext_h": "IŠPLĖSTINĖS LENTELĖS (po vieną pull request)",
    "ext": [
        ("workout_sets", "pratimas, serija, pakart., kg; n vienai treniruotei"),
        ("reports", "7 dienų santrauka; paleidžia Zap 2"),
        ("goals", "pratimas, tikslas kg, data"),
        ("profiles", "vaidmuo athlete | instructor, kodas"),
        ("instructor_links", "sportininko ir trenerio ryšys"),
        ("plan_assignments", "vienas planas → daug sportininkų"),
    ],
    "rls_h": "Row Level Security",
    "rls": [
        "RLS įjungtas visose lentelėse.",
        "`select / update / delete` **using** `user_id = auth.uid()`",
        "`insert` **with check** `user_id = auth.uid()`",
        "React'e nėra naudotojo filtrų: net pakeistas klientas nepasieks svetimų eilučių.",
        "Treneriai sportininkų duomenis skaito tik per `my_athletes()` ir `athlete_progress()`, kurios pirmiausia "
        "tikrina ryšį.",
        "Priskirti planai: papildomos tik skaitymo politikos; savininko politikos nepakeistos.",
    ],
    "notes": f"""
Laikas: ~40 s.

Sakykite: Dvi užduoties lentelės – plans ir workouts; type – skirstymo laukas. Dar šešios lentelės pridėtos po vieną pull request. Prieigos taisyklė visur ta pati: matote tik tas eilutes, kurių user_id esate jūs. Treneriai sportininkų lentelių tiesiogiai neskaito; dvi duomenų bazės funkcijos pirmiausia patikrina dalijimosi ryšį.

Šaltiniai:
- Schema: {BLOB}supabase/schema.sql
- Architektūra, 1 ir 5 skyriai: {BLOB}docs/lt/architecture.md
- Supabase vadovas: {BLOB}docs/lt/supabase.md
- Užduoties 9 skaidrė (duomenų modelis ir RLS)
- Įrodymų ekrano nuotraukos: A priedas (Supabase lentelės, RLS politikos)
""",
}

LT["zaps"] = {
    "title": "Automatizacija: Zap 1 ir Zap 2",
    "z1_h": "Zap 1  ·  nauja treniruotė",
    "hook": "Catch Hook",
    "filter": "Filter: type = INSERT ir yra trenerio el. paštas",
    "paths": "Paths",
    "path_a": "A · record__type = strength → Gmail „STRENGTH: pavadinimas“",
    "path_b": "Fallback → Gmail „New workout: pavadinimas“",
    "err": "Kiekvienas Gmail žingsnis turi klaidų tvarkyklę, kuri praneša ERROR_EMAIL kintamojo adresu.",
    "z2_h": "Zap 2  ·  pažangos ataskaita",
    "filter2": "Filter: INSERT ir yra trenerio el. paštas",
    "gmail2": "Gmail „Progress report: sportininkas, datos“",
    "trap": "**Spąstai:** webhook'o viršutinis `type` (INSERT / UPDATE) nėra eilutės `record__type` "
            "(strength / other). Filter naudoja pirmąjį, Paths – antrąjį.",
    "shot": "Zap 1 Zapier redaktoriuje (gyvai)",
    "to": "**Kam:** `record__instructor_emails`, įrašytas duomenų bazės trigerio. Zapier neįvestas joks adresas.",
    "notes": f"""
Laikas: ~50 s.

Sakykite: Zap 1 pagauna webhook'ą. Filter praleidžia tik naujas eilutes, turinčias gavėją; tada Paths skirsto pagal tipą: jėgos treniruotė eina keliu A su tema STRENGTH, visa kita – Fallback keliu. Redagavimus sustabdo Filter, todėl jie nekainuoja užduočių. Zap 2 tą patį daro su ataskaitomis. Kadangi gavėją parenka duomenų bazė, niekas negali priversti mano Gmail siųsti laiškų bet kokiu adresu.

Šaltiniai:
- Zapier vadovas: {BLOB}docs/lt/zapier.md
- Užduoties 15, 16 ir 18 skaidrės
- Zapier pagalba (Paths, Filter, klaidų valdymas): https://help.zapier.com
""",
}

LT["mail_workout"] = {
    "title": "Kas gauna laišką: nauja treniruotė",
    "kicker": "Vienas naujas naudotojas – nuo registracijos iki trenerio pašto dėžutės  ·  Zap 1",
    "spine": [
        ("start", "Naujo naudotojo registracija"),
        ("dec", "Koks vaidmuo?"),
        ("proc", "Įrašo treniruotę: **Išsaugoti treniruotę** → vienas INSERT į `workouts`"),
        ("dec", "Dalijasi su treneriu?"),
        ("dec", "`type` = strength?"),
        ("mail", "**Laiškas „STRENGTH: pavadinimas“** su serijomis kiekvienam susietam treneriui"),
    ],
    "edges": [None, "Sportininkas", None, "Taip", "Taip"],
    "downs": [
        (1, "Treneris", "none", "**Laiško nėra.** Treneriai neturi skilties **Dalijimasis**, todėl jų pačių "
                                "treniruotės niekam nesiunčiamos. Jie *gauna* su jais besidalijančių sportininkų "
                                "laiškus."),
        (2, None, "note", "**Pervadinta vėliau?** *Redaguoti pavadinimą* – tai UPDATE: Filter jį sustabdo, antro "
                          "laiško nėra."),
        (3, "Ne", "none", "**Laiško nėra.** Treniruotė išsaugoma, bet jos `instructor_emails` tuščias: Filter "
                          "sustabdo paleidimą (0 užduočių)."),
        (4, "Ne", "mail2", "**Laiškas „New workout: pavadinimas“** kiekvienam susietam treneriui (Fallback kelias)."),
    ],
    "facts_h": "SVARBU ŽINOTI",
    "legend": ["Laiškas išsiųstas", "Laiško nėra"],
    "facts": [
        "**Keli treneriai?** Vienas laiškas visiems kartu: 1 Zapier užduotis, ne po vieną kiekvienam.",
        "**Pradėjo dalytis vėliau?** Siunčiamos tik po to išsaugotos treniruotės; senos nesiunčiamos. "
        "**Nustojo dalytis?** Laiškai nebesiunčiami.",
        "**Sportininkas kopijos negauna.** Laiškai siunčiami tik treneriams, jų registracijos el. pašto adresu.",
    ],
    "notes": f"""
Laikas: ~30 s.

Sakykite: Sekime visiškai naują naudotoją. Jei jis registruojasi kaip treneris, jo paties treniruotės niekam nesiunčiamos: treneriai neturi skilties „Dalijimasis“, jie laiškus gauna. Sportininko treniruotė siunčiama tik tada, kai išsaugojimo metu jis dalijasi bent su vienu treneriu. Tada tipas parenka temą: jėgos treniruotė eina keliu A, visa kita – Fallback keliu. Vėliau pervadinus treniruotę, nieko nesiunčiama.

Užkulisiai: BEFORE INSERT trigeris į eilutę nukopijuoja susietų trenerių el. paštus (instructor_emails); Zapier Filter reikalauja type = INSERT ir netuščio instructor_emails.

Šaltiniai:
- Zapier vadovas, „Kas gauna laišką“ ir testai Gavėjas 1–3: {BLOB}docs/lt/zapier.md
- Trigeris set_instructor_emails(): {BLOB}supabase/schema.sql
- SQL testas: {BLOB}supabase/tests/instructor_emails.test.sql
- Naudotojo vadovas, treneris, 7 skyrius „El. laiškai, kuriuos gaunate“: {BLOB}docs/user-manual/lt/instructor.md
""",
}

LT["mail_report"] = {
    "title": "Kas gauna laišką: pažangos ataskaita",
    "kicker": "Tas pats naujas naudotojas spaudžia „Siųsti ataskaitą treneriui“  ·  Zap 2",
    "spine": [
        ("start", "Naujo naudotojo registracija"),
        ("dec", "Koks vaidmuo?"),
        ("proc", "**Pažanga** → **Siųsti ataskaitą treneriui**"),
        ("dec", "Ataskaita jau siųsta per 5 min.?"),
        ("dec", "Dalijasi su treneriu?"),
        ("mail", "**Laiškas „Progress report: sportininkas (datos)“** kiekvienam susietam treneriui"),
    ],
    "edges": [None, "Sportininkas", None, "Ne", "Taip"],
    "downs": [
        (1, "Treneris", "none", "**Laiško nėra.** Trenerio paties ataskaita išsaugoma, bet su juo niekas "
                                "nesusietas: Zap 2 Filter ją sustabdo."),
        (2, None, "note", "**Dar nėra treniruočių?** Pažanga rodo tuščią būseną; mygtukas atsiranda po pirmos "
                          "įrašytos treniruotės."),
        (3, "Taip", "none", "**Atmesta:** „Ataskaitą išsiuntėte prieš kelias minutes…“. Niekas neišsaugoma, "
                            "laiško nėra."),
        (4, "Ne", "none", "**Laiško nėra.** 7 dienų ataskaita išsaugoma be `instructor_emails`: Filter sustabdo "
                          "Zap 2 (0 užduočių)."),
    ],
    "facts_h": "SVARBU ŽINOTI",
    "legend": ["Laiškas išsiųstas", "Laiško nėra"],
    "facts": [
        "**Kas joje:** paskutinės 7 dienos (treniruotės, minutės, serijos, sunkiausias svoris); tekstą rašo "
        "`send_report()`, visada anglų kalba.",
        "**Keli treneriai?** Vienas laiškas visiems kartu: 1 Zapier užduotis.",
        "**Gavėjus** siuntimo akimirką pagal dalijimosi ryšius įrašo duomenų bazės trigeris. Adreso įvesti niekas "
        "negali.",
    ],
    "notes": f"""
Laikas: ~30 s.

Sakykite: Ataskaitai galioja ta pati taisyklė ir dar vienas patikrinimas. Mygtukas „Siųsti ataskaitą“ atsiranda, kai sportininkas įrašo bent vieną treniruotę. Duomenų bazė neleidžia siųsti antros ataskaitos per penkias minutes, todėl pašto dėžutės užversti neįmanoma. Jei sportininkas su niekuo nesidalija, ataskaita vis tiek išsaugoma, bet Zap 2 Filter ją sustabdo ir laiško niekas negauna.

Užkulisiai: send_report() patikrina 5 minučių taisyklę ir įterpia vieną reports eilutę; tas pats trigeris kaip treniruotėms užpildo instructor_emails; webhook reports_to_zapier paleidžia Zap 2 (Filter → Gmail).

Šaltiniai:
- Zapier vadovas, „Zap 2: pažangos ataskaitos“: {BLOB}docs/lt/zapier.md
- send_report() ir trigeris: {BLOB}supabase/schema.sql
- Naudotojo vadovas, sportininkas, 6 skyrius „Pažanga“: {BLOB}docs/user-manual/lt/athlete.md
""",
}

LT["deploy"] = {
    "title": "Diegimas ir paslaptys",
    "pipe": [
        ("Kūrėjo kompiuteris", "npm test · npm run lint · npm run build; `.env.local` įtrauktas į .gitignore", MUTED),
        ("GitHub", "feature/… šaka → pull request → suliejimas į main", INK),
        ("Vercel", "peržiūra kiekvienam PR (v5 išbandyta vienoje); gamybinė versija po kiekvieno push į main; `VITE_` kintamieji – build "
                   "metu", TEAL),
        ("Supabase · Zapier · Gmail", "Supabase projektas eu-west-1; Site URL = Vercel adresas; Zap'ai įjungti",
         ORANGE),
    ],
    "sec_h": "Kur laikomos paslaptys",
    "sec_head": ["Paslaptis", "Kur laikoma", "Niekada ne"],
    "secrets": [
        ["Supabase URL + anon raktas", "Vercel kintamieji, `.env.local`", "(viešas; saugus tik su RLS)"],
        ["service_role / slaptas raktas", "administravimo skriptai mano kompiuteryje", "React, Vercel, saugykla"],
        ["Zapier Catch Hook URL", "Supabase webhook nustatymai", "saugykla, Notion, ekrano nuotraukos"],
        ["Žetonai, demo prisijungimai", "`_task/.keys/keys.md` (ignoruojamas); AES-256 `keys.zip`",
         "saugykla atviru tekstu"],
    ],
    "tip": "**Pamoka:** `VITE_` kintamieji įrašomi į JavaScript build metu. Pakeitus kintamąjį, reikia Redeploy.",
    "notes": f"""
Laikas: ~35 s.

Sakykite: Kiekvienas pull request gauna Vercel peržiūrą; suliejus į main, diegiama gamybinė versija. Į naršyklę patenka tik anon raktas, ir tai saugu tik todėl, kad įjungtas RLS. Service-role raktas ir webhook URL lieka savo vietose; ekrano nuotraukose hook URL paslėptas.

Šaltiniai:
- Diegimo vadovas: {BLOB}docs/lt/deployment.md
- Architektūra, „Kur laikomos paslaptys“: {BLOB}docs/lt/architecture.md
- Užduoties 8 ir 14 skaidrės
- Vercel kintamieji: https://vercel.com/docs/environment-variables ; Vite: https://vite.dev/guide/env-and-mode
""",
}

LT["reqs"] = {
    "title": "Užduoties reikalavimai → kas įgyvendinta",
    "kicker": "Užduoties 2, 4, 12, 17 ir 21 skaidrės",
    "head": ["Dalis", "Užduoties minimumas", "Įgyvendinta"],
    "rows": [
        ["Kodas", "GitHub saugykla, šakos, ≥ 3 pull request", "**30 sulietų PR**, kiekvienai funkcijai `feature/…` šaka, plius v5 išleidimo šaka"],
        ["Sąsaja", "React + Vite, JavaScript; 3 ekranai, 4 būsenos",
         "**8 ekranai**, kiekviename Kraunama / Klaida / Tuščia / Pavyko; LT / EN; **įdiegiama telefone, veikia be ryšio (v5)**"],
        ["Duomenys", "Supabase Auth, 2 susijusios lentelės, RLS", "**8 lentelės**, RLS visose, SQL funkcijos ir trigeriai"],
        ["Diegimas", "Vercel, viešas URL, aplinkos kintamieji", "Veikianti svetainė, PR peržiūros, `VITE_` kintamieji"],
        ["Automatizacija", "Webhook → Filter → Paths → Gmail",
         "**Zap 1** su Paths + **Zap 2** ataskaitoms; 3 klaidų tvarkyklės"],
        ["Dokumentacija", "Notion puslapis, žurnalai, README",
         "Notion (EN + LT): užduotys, 39 sprendimai, 17 klaidų, testai; README, docs/, naudotojo vadovai"],
        ["Papildomi taškai", "Grafikas iš istorijos; DI funkcija",
         "**2 diagramos**, tikslai, taisyklėmis pagrįsti pasiūlymai (paaiškinami; programoje nėra DI rakto)"],
        ["Ko nedarome", "Mokėjimų, realaus laiko, failų įkėlimo, savo serverio, TypeScript, mobiliosios programos",
         "Laikomasi: nėra serverio ir Edge Functions, nėra savos mobiliosios programos: telefono programėlė yra PWA – žiniatinklio programa, įdiegiama iš naršyklės"],
    ],
    "notes": f"""
Laikas: ~45 s.

Sakykite: Visi užduoties minimumai įvykdyti, o dauguma praplėsti ten, kur tai pagerino produktą. Įrodymų ekrano nuotraukos (Supabase lentelės ir politikos, Zap ir jo istorija) – A priedo pabaigoje.

Šaltiniai:
- Užduoties 2, 4, 12, 17, 21 skaidrės: {TASK_LT}
- Sulieti pull request: {PRS}
- Notion: 2. Užduočių lentelė {NOTION_LT['tasks']} ; 3. Sprendimų žurnalas {NOTION_LT['decisions']} ; 4. Klaidų ir taisymų žurnalas {NOTION_LT['errors']}
""",
}

LT["quality"] = {
    "title": "Testavimas ir patikimumas",
    "tiles": [
        ("524", "vienetų testai (Vitest), be tinklo", ORANGE),
        ("7", "SQL testų rinkiniai, kiekvienas atšaukiamas", TEAL_B),
        ("10", "scenarijų testų lentelėje", SKY),
        ("~1", "Zapier užduotis treniruotei ar ataskaitai", ORANGE),
    ],
    "test_h": "Testai",
    "tests": [
        "Vienetų testai naudoja tikrą supabase-js klientą su netikru `fetch`, todėl tikrina tikslias užklausas.",
        "SQL testai: RLS tarp naudotojų, dalijimasis, tikslai, ataskaitos, trenerių el. paštai, serijų santrauka, išsaugojimas lygiai vieną kartą.",
        "Testų lentelė (19 skaidrė + išplėstiniai): naujas naudotojas, strength / other laiškai, svetimi duomenys, "
        "redagavimas, klaidos būsena, ataskaitos, dalijimasis.",
        "Šiandienos demo: kelio A ir Zap 2 paleidimai pažymėti **Successful**. v5: įrašymas be ryšio patikrintas gyvai.",
    ],
    "rel_h": "Patikimumas",
    "rel": [
        "Kiekviename Gmail žingsnyje – klaidų tvarkyklė, pranešanti `ERROR_EMAIL` globaliu kintamuoju.",
        "Filter sustabdo redagavimus ir sportininkus be trenerio: nėra laiško, nėra užduoties.",
        "Kaina: ≈ 1 užduotis treniruotei ar ataskaitai, taigi 50 treniruočių ≈ 50 užduočių per mėnesį.",
        "Ne daugiau kaip viena ataskaita per 5 minutes (duomenų bazės taisyklė).",
        "Keturios sąsajos būsenos visur; klaidos paprasta kalba su **Bandyti dar kartą**.",
    ],
    "notes": f"""
Laikas: ~35 s.

Sakykite: 273 vienetų testai veikia be tinklo su netikru backend'u, o šeši SQL testų rinkiniai tikrina prieigos taisykles pačioje duomenų bazėje. Patikimumas – pagal užduoties 18 skaidrę: klaidų tvarkyklės kiekviename Gmail žingsnyje, savininkas Zap aprašyme ir kainos įvertis – apie vieną užduotį treniruotei.

Šaltiniai:
- Vienetų testai: {TREE}src (failai *.test.js / *.test.jsx)
- SQL testai: {TREE}supabase/tests
- Notion, 6. Testų lentelė: {NOTION_LT['tests']}
- Zapier vadovas, 6–8 skyriai (klaidų tvarkyklė, kaina, tvarkymas): {BLOB}docs/lt/zapier.md
""",
}

LT["hard"] = {
    "title": "Kas buvo sunkiausia",
    "p": "Problema:",
    "f": "Sprendimas:",
    "cards": [
        ("Webhook mato tik vieną eilutę",
         "laiške reikėjo išvardyti serijas, bet jos yra kitoje lentelėje ir įrašomos po treniruotės.",
         "`log_workout()` vienoje transakcijoje išsaugo treniruotę su serijomis ir į treniruotės eilutę įrašo "
         "vienos eilutės `sets_summary`."),
        ("Kas gauna laišką?",
         "fiksuotas adresas siunčia vienam treneriui apie visus; programoje įvestas adresas leistų mano Gmail "
         "siųsti bet kam.",
         "BEFORE INSERT trigeris į eilutę nukopijuoja susietų trenerių el. paštus; Filter sustabdo eilutes be jų."),
        ("type ≠ record__type",
         "webhook turi savo `type` (INSERT / UPDATE) šalia eilutės `type` (strength / other).",
         "Filter pagal `type`, Paths pagal `record__type`; redagavimai pasiekia Zapier, bet sustoja ties Filter."),
        ("Aplinkos kintamieji Vercel",
         "svetainė rodė „Missing setting: VITE_SUPABASE_URL“: integracija buvo sukūrusi `NEXT_PUBLIC_…` pavadinimus.",
         "pridėti du `VITE_` kintamieji Production ir Preview aplinkoms, tada Redeploy."),
    ],
    "notes": f"""
Laikas: ~50 s.

Sakykite: Ilgiausiai užtruko keturi dalykai. Pirma, webhook mato tik įterptą eilutę, todėl serijas reikėjo apibendrinti toje pačioje eilutėje. Antra, saugiai nuspręsti, kas gauna laišką: tai daro duomenų bazė, ne naudotojas. Trečia, klasikinė type ir record__type painiava Zapier. Ketvirta, Vercel kintamųjų pavadinimai: Vite naršyklei perduoda tik VITE_ prasidedančius kintamuosius.

Šaltiniai:
- Notion, 3. Sprendimų žurnalas: {NOTION_LT['decisions']}
- Notion, 4. Klaidų ir taisymų žurnalas: {NOTION_LT['errors']}
- Zapier vadovas: {BLOB}docs/lt/zapier.md ; Diegimo vadovas: {BLOB}docs/lt/deployment.md
""",
}

LT["tco"] = {
    "title": "Bendra nuosavybės kaina (TCO)",
    "kicker": "Mėnesio išlaidos trimis scenarijais  ·  USD kainoraščio kainos, mokant metams, be PVM  ·  "
              "tikrinta 2026-11-16",
    "head": ["Išlaidos", ["Kurso demo", "dabar, demo naudotojai"], ["Nemokamas klubas", "1–2 treneriai, 30 sportininkų"],
             ["Trenerių verslas", "10 trenerių, 250 sportininkų"], "Kas keičia kainą"],
    "rows": [
        ["Supabase",
         ["**0 $** · Free", "500 MB, 50 tūkst. naudotojų"],
         ["**25 $** · Pro", "kasdienės kopijos, nesustabdomas"],
         ["**25 $** · Pro", "250 iš 100 tūkst.; duomenų ≪ 8 GB"],
         "Pastovi iki 100 tūkst. naudotojų ar 8 GB, toliau 0,00325 $ už naudotoją, 0,125 $ už GB. Free sustoja po "
         "savaitės neveiklumo, kopijų neturi."],
        ["Zapier",
         ["**0 $** bandant, vėliau **19,99 $**", "Pro, 750 užd.; naudojama ~50"],
         ["**19,99 $** · Pro, 750 užduočių", "naudojama ~510"],
         ["**89 $** · Pro, 5 000 užduočių", "naudojama ~4 250"],
         "1 laiškas = 1 užduotis (2–3 ct). Free šių Zap nepaleidžia (nėra webhook, Filter, Paths). Viršijus "
         "limitą: 1,25× tarifas arba paleidimai laukia kito mėnesio."],
        ["Kita infrastruktūra",
         ["**0 $**", "Vercel Hobby, Gmail, GitHub, Notion"],
         ["**≈ 1 $**", "domenas (≈ 11 $ per metus); Resend Free SMTP"],
         ["**≈ 28 $**", "Vercel Pro 20 $, Google Workspace 7 $, domenas"],
         "Vercel Pro, kai programa uždirba (Hobby – tik nekomercinė); savas SMTP registracijos patvirtinimui "
         "(Supabase siuntėjas: 2 laiškai per val.); firminis siuntėjas."],
        ["Per mėnesį", "**≈ 20 $**", "**≈ 46 $**", "**≈ 142 $**", "Zapier sudaro ≈ 63 % verslo sąskaitos"],
        ["Per metus", "≈ 240 $", ["≈ 550 $", "1,53 $ sportininkui per mėn."], ["≈ 1 700 $", "0,57 $ sportininkui per mėn."],
         "Žmonių laikas (kūrimas, palaikymas) neįskaičiuotas"],
    ],
    "assume": "**Prielaidos:** aktyvus sportininkas per savaitę įrašo 3 treniruotes ir išsiunčia 1 ataskaitą ≈ "
              "**17 laiškų = 17 Zapier užduočių per mėnesį**. Mokant kas mėnesį brangiau: Zapier 29,99 $ (750) / "
              "133,50 $ (5 000), Workspace 8,40 $.",
    "lever": "**Didžiausias svertas:** Zapier auga su kiekvienu laišku, Supabase lieka pastovus. Už kurso taisyklių "
             "ribų Supabase Edge Function, siunčianti per Resend, pakeistų Zapier (3 000 laiškų per mėn. nemokamai, "
             "50 000 – už 20 $).",
    "notes": f"""
Laikas: ~45 s.

Sakykite: Šiandien Logify išlaikymas kainuoja apie 20 dolerių per mėnesį, ir visa tai – Zapier: nemokamas planas nepaleidžia webhook ir Paths. Tikram klubui su trisdešimt sportininkų Supabase perkelčiau į Pro dėl kasdienių atsarginių kopijų: apie 46 dolerius per mėnesį, pusantro dolerio vienam sportininkui. Su 250 sportininkų – apie 142 dolerius, ir Zapier sudaro beveik du trečdalius, nes kiekvienas laiškas – užduotis. Supabase lieka pastovus – 25 doleriai.

Modelis: aktyvus sportininkas per savaitę įrašo 3 treniruotes ir išsiunčia 1 ataskaitą, apie 17 laiškų per mėnesį; kiekvienas laiškas – viena Zapier užduotis (trigerio, Filter ir Paths žingsniai nekainuoja, Filter sustabdyti paleidimai taip pat). 30 sportininkų ≈ 510 užduočių, 250 sportininkų ≈ 4 250 užduočių. Kainos: USD kainoraščio kainos mokant metams, kur tai siūloma, be PVM.

Neįskaičiuota (pasirinktinai): Supabase atkūrimas į bet kurį laiko tašką (PITR) – 100 $ per mėn. už 7 dienas; savas domenas Supabase API – 10 $ per mėn.; Resend Pro – 20 $ per mėn. (50 000 laiškų), kai registracijos laiškų daugiau nei 3 000 per mėn. arba 100 per dieną.

Šaltiniai (tikrinta 2026-11-16):
- Supabase kainos: https://supabase.com/pricing ; integruoto autentifikacijos pašto limitas (2 per valandą): https://supabase.com/docs/guides/auth/auth-smtp
- Zapier kainos ir viršijimas: https://zapier.com/pricing ; kas laikoma užduotimi: https://help.zapier.com/hc/en-us/articles/8496196837261
- Vercel kainos: https://vercel.com/pricing ; Hobby – tik asmeniniam, nekomerciniam naudojimui: https://vercel.com/docs/plans/hobby , https://vercel.com/legal/terms
- Google Workspace Business Starter: https://workspace.google.com/pricing ; Resend: https://resend.com/pricing ; .com domenas savikaina: https://www.cloudflare.com/products/registrar/ (šios trys – iš trečiųjų šalių kainų apžvalgų; patikrinkite tiekėjo puslapyje)
- Užduočių skaičiai šiame projekte: {BLOB}docs/lt/zapier.md (8 skyrius, Kaina)
""",
}

LT["summary"] = {
    "title": "Santrauka",
    "points": [
        "Veikiantis produktas: **užsiregistruoji, įrašai treniruotę, o treneris per ~1 min. gauna laišką**.",
        "Užduoties minimumas įvykdytas ir praplėstas: 8 lentelės, 2 Zap'ai, diagramos, tikslai, pasiūlymai, "
        "ataskaitos, vaidmenys ir (v5) diegiama telefono programėlė, veikianti be ryšio.",
        "Sukurta per keturias paskaitas, 25 pull request, vėliau v5; dokumentuota Notion, README ir docs (LT / EN).",
        "Toliau: automatinės savaitinės ataskaitos (`pg_cron`), savas SMTP el. pašto patvirtinimui grąžinti, "
        "DI santraukos žingsnis Zap 2.",
    ],
    "next": [
        "Gyvos demonstracijos scenarijus  →  A priedas",
        "Nuorodos ir šaltiniai  →  B priedas   ·   Telefono programėlė  →  C priedas",
        f"[workout-log-murex-three.vercel.app]({APP})",
    ],
    "notes": """
Laikas: ~20 s.

Sakykite: Apibendrinant: veikiantis produktas, uždarantis ratą nuo treniruotės salėje iki laiško trenerio pašte. Dabar parodysiu tai gyvai.

Tada perjunkite į naršyklę ir sekite A priedą. Jei neveiktų internetas, naudokite A priedo ekrano nuotraukas.
""",
}

LT["appA"] = {
    "title": "Gyva demonstracija",
    "subtitle": ["Kaip sportininkas įrašome jėgos treniruotę, peržiūrime pažangą, siunčiame ataskaitą ir "
                 "atidarome trenerio Gmail.",
                 "Apie 4 minutes  ·  veikianti svetainė  ·  kiekvieno žingsnio ekrano nuotrauka"],
    "notes": "Rodykite po pagrindinės dalies. Jei neveiktų internetas, rodykite šio priedo ekrano nuotraukas. Programėlės "
             "ekranai pakartotinai nufotografuoti v5 versijoje su tais pačiais demonstraciniais duomenimis (imituotas API: "
             "nieko neišsaugoma ir nesiunčiama); Gmail, Zapier ir Supabase ekranai – iš gyvo paleidimo 2026-11-12 "
             "(LT sąsajos demo 18:45–18:47).",
}

LT["script"] = {
    "title": "Demonstracijos scenarijus",
    "kicker": "Veikianti svetainė, LT sąsaja, apie 4 minutes",
    "before_h": "Prieš pradedant",
    "before": [
        f"Atidarykite [svetainę]({APP}) ir spustelėkite Lietuvos vėliavėlę (**LT**, šalia logotipo).",
        "Prisijunkite kaip `demo.athlete.a@example.com` (slaptažodis: README → Demonstracinės paskyros).",
        "Sportininkas A dalijasi su treneriu `mse1987319+logify@gmail.com` (**Dalijimasis**).",
        "Atidarykite Gmail `mse1987319@gmail.com` (paskyrą perjunkite viršuje dešinėje) ir ieškokite "
        "`to:mse1987319+logify@gmail.com`.",
        "Zapier: abu Zap'ai **On**. Tik viena ataskaita per 5 min.: jei ką tik siųsta, palaukite.",
        f"Telefono dalis (neprivaloma): telefone atidarykite [svetainę]({APP}) (v5 veikia nuo 2026-11-18); ekrano nuotraukos – C priede.",
    ],
    "head": ["#", "Darykite", "Sakykite", "Laikas"],
    "steps": [
        ["1", "Prisijunkite (LT)", "Kiekvienas mato tik savo duomenis: RLS.", "0:15"],
        ["2", "Mano planai → **+ Įrašyti treniruotę** plane *Strength 5 × 5*", "Šį planą priskyrė treneris.", "0:15"],
        ["3", "Pavadinimas *Kojų diena (demo)*, tipas **Jėga**, 55 min.", "`type` – skirstymo laukas.", "0:20"],
        ["4", "Squat 5 × 5 @ 107,5 kg; Romanian deadlift 3 × 8 @ 70 kg; pastaba",
         "„Praėjusį kartą“ rodo ankstesnę treniruotę.", "0:45"],
        ["5", "**Išsaugoti treniruotę** → **Atidaryti**", "Vienas INSERT → webhook → Zap 1.", "0:15"],
        ["6", "**Pažanga**: pasiūlymai, tikslas, diagramos", "Pagal taisykles; kiekvienas rodo savo skaičius.", "0:40"],
        ["7", "**Siųsti ataskaitą treneriui**", "Ataskaitą sudaro duomenų bazė → Zap 2.", "0:15"],
        ["8", "Gmail: atidarykite STRENGTH ir ataskaitos laiškus", "Abu atėjo per minutę.", "0:45"],
    ],
    "fallback": "**Jei laiškas vėluoja:** parodykite Zapier → Zap history (paleidimai matomi per kelias sekundes) "
                "arba kitų skaidrių ekrano nuotraukas.",
    "notes": f"""
Iš viso apie 4 minutes. Gmail ir Zapier Zap history skirtukus atsidarykite iš anksto.

Demonstracinių paskyrų prisijungimai aprašyti README („Demonstracinės paskyros“): {BLOB}README.lt.md
Demo treneris demo.instructor@example.com – netikras adresas: Gmail dėl jo grąžina pranešimą „Adresas nerastas“, tai normalu. Tikroji pašto dėžutė – alias mse1987319+logify@gmail.com, susietas su sportininku A skiltyje „Dalijimasis“.
""",
}

LT["demo"] = {"do": "DARYKITE", "say": "SAKYKITE", "behind": "UŽKULISIAI"}

LT["steps"] = [
    {"title": "1 žingsnis · Prisijungimas", "img": ["01-login.jpg"],
     "do": "Atidarykite svetainę, spustelėkite Lietuvos vėliavėlę, prisijunkite kaip `demo.athlete.a@example.com`.",
     "say": "Paskyros – Supabase Auth. Kalbos pasirinkimas įsimenamas naršyklėje.",
     "behind": "Sesijos JWT siunčiamas su kiekviena užklausa; RLS tikrina `user_id = auth.uid()`."},
    {"title": "2 žingsnis · Mano planai", "img": ["02-plans.jpg"],
     "do": "Mano planai rodo kiekvieną planą (A lentelė) su jo treniruotėmis (B lentelė).",
     "say": "*Priskyrė jūsų treneris*: treneris šį planą davė keliems sportininkams.",
     "behind": "Priskirti planai skaitomi per papildomą, tik skaitymo RLS politiką."},
    {"title": "3 žingsnis · Įrašyti treniruotę: tuščia forma", "img": ["03-log-empty.jpg"],
     "do": "Spauskite **+ Įrašyti treniruotę** plane *Strength 5 × 5*. Planas parinktas automatiškai.",
     "say": "Užuomina primena, kad treneris gauna laišką apie kiekvieną treniruotę; jėgos treniruotės pažymimos."},
    {"title": "4 žingsnis · Pavadinimas, tipas, pirmas pratimas", "img": ["04-log-filled-top.jpg"],
     "do": "Pavadinimas *Kojų diena (demo)*, tipas **Jėga**, 55 min. Pridėkite **Squat**: 5 serijos × 5 pakart. "
           "@ 107,5 kg.",
     "say": "„Praėjusį kartą“ rodo ankstesnę pritūpimų treniruotę: 5 × 5 @ 105 kg.",
     "behind": "`type = strength` nukreips Zapier į kelią A."},
    {"title": "5 žingsnis · Antras pratimas ir pastaba", "img": ["05-log-filled-bottom.jpg"],
     "do": "Pridėkite **Romanian deadlift** 3 × 8 @ 70 kg ir pastabą, tada spauskite **Išsaugoti treniruotę**.",
     "say": "Nauja serija nukopijuoja ankstesnę, todėl registruoti salėje greita."},
    {"title": "6 žingsnis · Išsaugota", "img": ["06-log-saved.jpg"],
     "do": "Forma patvirtina *Treniruotė išsaugota: Kojų diena (demo)* ir pateikia nuorodas.",
     "behind": "`log_workout()` vienoje transakcijoje išsaugo treniruotę ir serijas: vienas INSERT į `workouts` → "
               "vienas webhook → Zap 1 (18:45)."},
    {"title": "7 žingsnis · Treniruotės informacija", "img": ["07-workout-detail.jpg"],
     "do": "Spauskite **Atidaryti**: serijos pagal pratimą, pastaba ir praėjęs kartas palyginimui.",
     "say": "Squat 5 × 5 @ 107,5 kg, praėjusį kartą buvo 105 kg."},
    {"title": "8 žingsnis · Pažanga: pasiūlymai ir tikslas", "img": ["08-progress-top.jpg"],
     "do": "Atidarykite **Pažanga**.",
     "say": "Pasiūlymai rodo savo skaičius: *Bench press: nedidinkite 60 kg svorio*. Pritūpimų tikslo juosta – "
            "107,5 / 120 kg.",
     "behind": "Skaičiuojama naršyklėje iš paties sportininko serijų; DI rakto nereikia."},
    {"title": "9 žingsnis · Pažanga: diagramos",
     "img": ["09-progress-squat-chart.jpg", "10-progress-minutes-chart.jpg"],
     "caps": ["Sunkiausia serija per treniruotę: Squat 90 → 107,5 kg", "Minutės per savaitę: jėga ir kita"],
     "do": "Pirmoje diagramoje pasirinkite **Squat**.",
     "say": "+17,5 kg per 9 treniruotes; šią savaitę 199 min.",
     "behind": "Recharts; spalvos patikrintos daltonikams; kiekviena diagrama turi ir lentelės rodinį."},
    {"title": "10 žingsnis · Siųsti ataskaitą treneriui", "img": ["11-report-before.jpg", "12-report-sent.jpg"],
     "caps": ["Prieš: 7 dienų santrauka", "Po: „Ataskaita išsiųsta“"],
     "do": "Spauskite **Siųsti ataskaitą treneriui**.",
     "say": "Treneris šią santrauką gaus el. paštu.",
     "behind": "`send_report()` suskaičiuoja ir įterpia `reports` eilutę → webhook → Zap 2. Ne dažniau kaip kas 5 min."},
    {"title": "11 žingsnis · Trenerio Gmail", "img": ["13-gmail-inbox.jpg"], "crop": (0, 0, 0, 0.36),
     "do": "Gmail `mse1987319@gmail.com`, paieška `to:mse1987319+logify@gmail.com`.",
     "say": "Treniruotės laiškas atėjo 18:45, ataskaita – 18:47.",
     "behind": "Laiškų tema ir turinys – anglų kalba: juos rašo Zap ir duomenų bazė, ne programos sąsaja."},
    {"title": "12 žingsnis · Treniruotės laiškas", "img": ["14-gmail-workout-email.jpg"], "crop": (0, 0, 0, 0.38),
     "do": "Atidarykite *STRENGTH: Kojų diena (demo)*.",
     "say": "Tema – iš kelio A; turinyje serijos: Squat 5 × 5 @ 107.5 kg; Romanian deadlift 3 × 8 @ 70 kg.",
     "behind": "*Kam* = `instructor_emails`. Demo treneris `demo.instructor@example.com` – netikras adresas, todėl "
               "Gmail po laišku prideda pranešimą *Adresas nerastas*."},
    {"title": "13 žingsnis · Ataskaitos laiškas", "img": ["15-gmail-report-email.jpg"], "crop": (0, 0, 0, 0.45),
     "do": "Atidarykite *Progress report: demo.athlete.a@example.com …*.",
     "say": "5 treniruotės (3 jėgos, 2 kitos), 249 min., 25 serijos; sunkiausias pritūpimas – 107,5 kg.",
     "behind": "Zap 2: Catch Hook → Filter → Gmail."},
    {"title": "Užkulisiai · Zap history",
     "img": ["evidence/zapier-history.jpg", "evidence/zapier-run-strength-path.jpg"],
     "caps": ["Zap history: visi paleidimai Successful", "Paleidimas 18:54: Filter praleido, vyko kelias A (Strength)"],
     "do": "Zapier → Zap history; atidarykite paleidimą.",
     "say": "Filter praleido; Fallback kelias nevyko.",
     "behind": "Užduoties 3 testas (strength → kelias A) patvirtintas gyvoje sistemoje."},
    {"title": "Įrodymai · Supabase lentelės",
     "img": ["evidence/supabase-workouts-table.jpg", "evidence/supabase-plans-table.jpg"],
     "caps": ["workouts (B): čia matomos demo eilutės", "plans (A)"],
     "do": "Supabase → Table Editor.",
     "say": "A lentelė `plans` ir B lentelė `workouts`, susietos per `plan_id`."},
    {"title": "Įrodymai · RLS politikos",
     "img": ["evidence/supabase-rls-plans.jpg", "evidence/supabase-rls-workouts.jpg"],
     "caps": ["plans ir plan_assignments", "workouts ir workout_sets"],
     "do": "Supabase → Database → Policies.",
     "say": "Tik savos eilutės; priskirti planai prideda tik skaitymo prieigą."},
    {"title": "Įrodymai · Webhooks ir Zap 2",
     "img": ["evidence/supabase-webhooks.jpg", "evidence/zapier-zap2-report.jpg"],
     "caps": ["Database Webhooks (hook URL paslėpti)", "Zap 2: Catch Hook → Filter → Gmail + klaidų tvarkyklė"],
     "do": "Supabase → Integrations → Database Webhooks; Zapier → Zaps.",
     "say": "Hook URL – paslaptis, todėl ekrano nuotraukose jie paslėpti."},
]

LT["appC"] = {
    "title": "Mobilioji programėlė (PWA)",
    "subtitle": [
        "Įdiekite, naudokite salėje, prarandate ryšį ir matote, kaip treniruotė atkeliauja vieną kartą.",
        "Apie 3 minutes  ·  v5, veikia nuo 2026-11-18  ·  tikra programėlė 390 × 780 px telefone, demonstraciniai duomenys",
    ],
    "notes": f"Rodykite po A priedo, jei klausytojai klausia apie telefonus. Gyvai: telefone atidarykite {APP} (v5 veikia nuo 2026-11-18). Čia pateikti ekranai nufotografuoti tikroje programėlėje su imituotu API, todėl nieko neišsaugota ir nesiųsta.",
}

LT["phone"] = [
    {"title": "Telefonas 1 · Įdiegimas",
     "img": ["p01-install.jpg", "p02-ios-install.jpg"],
     "caps": ["Android: mygtukas Įdiegti", "iPhone: Bendrinti → Pridėti prie pradžios ekrano"],
     "do": "Atidarykite svetainę telefono naršyklėje. Android: bakstelėkite **Įdiegti**. iPhone Safari: **Bendrinti**, tada **Pridėti prie pradžios ekrano**.",
     "say": "Jokios programėlių parduotuvės: programėlė yra svetainė su piktograma pradžios ekrane.",
     "behind": "`manifest.webmanifest` ir service worker leidžia ją įdiegti; pavadinimas ir piktograma imami iš manifesto."},
    {"title": "Telefonas 2 · Apatinė kortelių juosta",
     "img": ["p03-plans.jpg", "p04-log.jpg", "p05-progress.jpg"],
     "caps": ["Mano planai", "Įrašyti treniruotę", "Pažanga"],
     "do": "Naudokite juostą apačioje: Mano planai, Įrašyti, Pažanga, Dalijimasis (treneriams: Mano sportininkai).",
     "say": "Tie patys ekranai kaip kompiuteryje, išdėstyti vienai rankai salėje.",
     "behind": "Tas pats meniu tampa apatine juosta, kai plotis ne didesnis nei 640 px; maketas atsižvelgia į iškarpą ir apatinę juostą."},
    {"title": "Telefonas 3 · Be ryšio: paskutiniai duomenys išlieka",
     "img": ["p06-offline-saved.jpg", "p07-offline-log.jpg"],
     "caps": ["Be ryšio: išsaugoti duomenys su data", "Be ryšio: forma veikia kaip įprasta"],
     "do": "Įjunkite telefono lėktuvo režimą ir atidarykite programėlę.",
     "say": "Atsidaro iš karto. Kiekvienas ekranas rodo paskutinius gautus duomenis, o treniruotę vis tiek galima užpildyti.",
     "behind": "Service worker talpykla + išsaugoti duomenys kiekvienam naudotojui naršyklėje; sesijos sargas neleidžia tuščiam atsakymui jų pakeisti."},
    {"title": "Telefonas 4 · Įrašyta be ryšio, išsiųsta prisijungus",
     "img": ["p08-kept.jpg", "p09-waiting.jpg", "p10-sent.jpg"],
     "caps": ["Išsaugota šiame telefone", "Laukia išsiuntimo", "Vėl yra ryšys: įprasta eilutė"],
     "do": "Be ryšio paspauskite **Išsaugoti treniruotę**, tada vėl įjunkite ryšį.",
     "say": "Treniruotė palaukia, tada išeina pati, vieną kartą. Po to seka trenerio laiškas.",
     "behind": "Užklausoje yra `p_id` + `p_logged_at`; pakartotinis siuntimas grąžina tą pačią eilutę: vienas webhook, vienas laiškas."},
    {"title": "Telefonas 5 · Senesnė duomenų bazė ir treneris",
     "img": ["p11-old-db.jpg", "p12-instructor.jpg"],
     "caps": ["Senesnė duomenų bazė: įspėjimas, programėlė veikia", "Treneris: Mano sportininkai telefone"],
     "do": "Jei duomenų bazė senesnės versijos, programėlė rodo įspėjimo eilutę. Treneriai gauna tą pačią apatinę juostą.",
     "say": "Nauja programėlė gali pasirodyti prieš duomenų bazės pakeitimą ir niekas nesugenda.",
     "behind": "Senesnėje duomenų bazėje nėra `schema_version()`; tada programėlė siunčia senuoju būdu, be id."},
]

LT["appB"] = {
    "title": "Nuorodos ir šaltiniai",
    "subtitle": ["Viskas, kuo remiasi šis pristatymas: veikiantis produktas, saugykla, Notion dokumentacija, kurso "
                 "užduotis, įrankių dokumentacija ir rinkos tyrimas."],
    "notes": "Visos nuorodos patikrintos ruošiant pristatymą (2026-11-12). Saugykla privati: dėl prieigos "
             "kreipkitės į autorių.",
}

LT["links"] = [
    {"title": "Projekto nuorodos",
     "cols": [
         ("Produktas", [
             f"Veikianti svetainė (v5, įdiegiama telefone): [workout-log-murex-three.vercel.app]({APP})",
             f"Saugykla: [github.com/mse1987319-png/workout-log]({REPO})",
             f"[Sulieti pull request]({PRS})",
             f"[supabase/schema.sql]({BLOB}supabase/schema.sql)",
             f"[supabase/seed.sql]({BLOB}supabase/seed.sql) (demo duomenys)",
             f"[supabase/tests/]({TREE}supabase/tests)",
             f"[release/v5 šaka]({TREE5})",
         ]),
         ("Dokumentai saugykloje", [
             f"[README (LT)]({BLOB}README.lt.md) · [README (EN)]({BLOB}README.md)",
             f"[Architektūra: ERD, diegimas, mobilioji]({BLOB}docs/lt/architecture.md)",
             f"[PWA vadovas: diegimas, be ryšio, siuntimo eilė]({BLOB5}docs/lt/pwa.md)",
             f"[PWA projektavimo įrašas]({BLOB5}docs/superpowers/specs/2026-11-16-pwa-offline-design.md)",
             f"[Įgyvendinimo planas]({BLOB}docs/lt/implementation-plan.md)",
             f"[Zapier vadovas]({BLOB}docs/lt/zapier.md)",
             f"[Supabase vadovas]({BLOB}docs/lt/supabase.md)",
             f"[Diegimo vadovas]({BLOB}docs/lt/deployment.md)",
             f"[Paruošimas]({BLOB}docs/lt/setup.md)",
             f"[Naudotojo vadovai]({BLOB}docs/user-manual/README.md)",
         ]),
         ("Notion", [
             f"[Projekto dokumentacija]({NOTION_LT['root']})",
             f"[1. Projekto aprašymas]({NOTION_LT['desc']})",
             f"[2. Užduočių lentelė]({NOTION_LT['tasks']})",
             f"[3. Sprendimų žurnalas]({NOTION_LT['decisions']})",
             f"[4. Klaidų ir taisymų žurnalas]({NOTION_LT['errors']})",
             f"[5. Nuorodos]({NOTION_LT['links']})",
             f"[6. Testų lentelė]({NOTION_LT['tests']})",
             f"[7. Naudotojo vadovas]({NOTION_LT['manual']})",
         ]),
     ]},
    {"title": "Kurso užduotis, įrankiai ir DI",
     "cols": [
         ("Kurso užduotis", [
             f"Užduoties skaidrės (LT): `{TASK_LT}`",
             f"Užduoties skaidrės (EN): `{TASK_EN}`",
             "Idėjai apibrėžti naudotos užklausos: `_task/prompts/prompts.md`",
             "Šio pristatymo ekrano nuotraukos: `_task/results/screenshots/` (veikianti svetainė, 2026-11-12)",
             "Pristatymo šaltinis: `_task/results/src/` (build_deck.py, content.py)",
         ]),
         ("Įrankių dokumentacija", TOOLS),
         ("DI įrankiai", [
             "[Claude Code](https://claude.com/claude-code): Claude Opus 5.5, Claude Sonnet 5.5",
             "[Google Gemini](https://gemini.google.com)",
             "Šis pristatymas sugeneruotas su Claude Code iš saugyklos dokumentų, Notion ir gyvų ekrano nuotraukų.",
         ]),
     ]},
    {"title": "Rinkos tyrimo šaltiniai", "kicker": "Tyrimas atliktas 2026 m. lapkritį (įgyvendinimo planas, 14 skyrius)",
     "cols": [("Asmeniniai žurnalai", MARKET[:6]), ("Trenerių platformos", MARKET[6:])], "size": 12},
]

TOOLS_LT = [t.replace("Paths, Filter, error handling", "Paths, Filter, klaidų valdymas")
             .replace("[Zapier pricing]", "[Zapier kainos]").replace("[Supabase pricing]", "[Supabase kainos]")
             .replace("[Vercel pricing]", "[Vercel kainos]")
             .replace("[Vercel: environment variables]", "[Vercel: aplinkos kintamieji]")
             .replace("[Vite: env variables and modes]", "[Vite: aplinkos kintamieji ir režimai]")
             .replace("(diagrams in the docs)", "(diagramos dokumentacijoje)") for t in TOOLS]
LT["links"][1]["cols"][1] = ("Įrankių dokumentacija", TOOLS_LT)

CONTENT = {"EN": EN, "LT": LT}
