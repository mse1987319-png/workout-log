# Logify user manual · Naudotojo vadovas

| | English | Lietuviškai |
|---|---|---|
| **Athletes** · Sportininkams | [Athlete manual](en/athlete.md) | [Sportininko vadovas](lt/athlete.md) |
| **Instructors** · Treneriams | [Instructor manual](en/instructor.md) | [Trenerio vadovas](lt/instructor.md) |

Each manual walks through the app screen by screen with screenshots in the matching language. Screenshots live in `images/en/` and `images/lt/`; the people, plans and workouts in them are made-up demo data.

## Importing into Notion

Notion can import Markdown with images from a `.zip`: **Settings → Import → Text & Markdown**, then pick a zip that contains `en/`, `lt/` and `images/` side by side (this folder, zipped). Keep that folder structure, because the manuals point to `../images/<lang>/…`.

## Regenerating the screenshots

The screenshots were taken from the real app (`npm run dev`) running against a throwaway in-memory mock of the Supabase API with fake people, so nothing touched the live database and no Zapier emails were sent. After a UI change, retake them the same way rather than editing images by hand, and keep the names (`NN-name.png`) the manuals use.
