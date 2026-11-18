# Logify user manual · Naudotojo vadovas

| | English | Lietuviškai |
|---|---|---|
| **Athletes** · Sportininkams | [Athlete manual](en/athlete.md) | [Sportininko vadovas](lt/athlete.md) |
| **Instructors** · Treneriams | [Instructor manual](en/instructor.md) | [Trenerio vadovas](lt/instructor.md) |

Each manual walks through the app screen by screen with screenshots in the matching language. Screenshots live in `images/en/` and `images/lt/`; the people, plans and workouts in them are made-up demo data. The two manuals link to each other where an athlete's and an instructor's view meet (sharing, assigned plans, emails).

Logify is also an installable phone app that works without signal. The phone, install and offline sections of the manuals (athlete: sections 8–10, instructor: section 8) say what you see; **how it works (technical)** · **kaip tai veikia (techniškai)** is in [docs/pwa.md](../pwa.md) · [docs/lt/pwa.md](../lt/pwa.md).

## Importing into Notion

Notion can import Markdown with images from a `.zip`: **Settings → Import → Text & Markdown**, then pick a zip that contains `en/`, `lt/` and `images/` side by side (this folder, zipped). Keep that folder structure, because the manuals point to `../images/<lang>/…`.

## Regenerating the screenshots

The screenshots were taken from the real app (`npm run dev`) running against a throwaway in-memory mock of the Supabase API with fake people, so nothing touched the live database and no Zapier emails were sent. After a UI change, retake them the same way rather than editing images by hand, and keep the names (`NN-name.png`) the manuals use. The phone screenshots are `80-phone-plans`, `81-phone-log`, `82-phone-install`, `83-phone-offline`, `84-phone-saved-on-phone` and `85-phone-waiting` (athlete manual) and `111-phone-athletes` (instructor manual). The tool that takes them lives in `_task/results/src/screenshots/` ([README](../../_task/results/src/screenshots/README.md)): start `npm run dev`, then run `node run.cjs M` there to retake every image in both languages from the same mock data (a scene per screen, so changing one is a few lines).
