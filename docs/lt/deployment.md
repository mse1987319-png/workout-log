# Diegimas: Vercel

*[English](../deployment.md) · Lietuviškai*

3 paskaita (kurso 14 skaidrė). Suteikia programai viešą adresą (žr. [diegimo diagramą](architecture.md#2-diegimas-ir-infrastruktūra)). Kodas keliauja GitHub → Vercel; kiekvienas push į `main` diegia produkciją, o kiekvienas pull request gauna peržiūros nuorodą. Nuo v5 tie patys statiniai failai „Logify“ paverčia ir įdiegiama telefono programėle, veikiančia be ryšio; ko tam reikia iš Vercel, aprašyta [6 skyriuje](#6-telefono-programėlė-pwa-per-vercel), o v5 išleidimo tvarka – [7 skyriuje](#7-v5-išleidimas).

## 1. Saugyklos importavimas

1. Vercel → **Add New… → Project** → importuokite GitHub saugyklą. Saugykla privati, todėl paprašyti leiskite Vercel GitHub programai ją pasiekti.
2. Nustatymai aptinkami automatiškai. Patikrinkite juos:

   | Nustatymas | Reikšmė |
   |---|---|
   | Framework preset | Vite |
   | Build command | `npm run build` |
   | Output directory | `dist` |

## 2. Aplinkos kintamieji prieš pirmąjį diegimą

Skiltyje **Environment Variables** pridėkite abu, **Production** ir **Preview** aplinkoms:

| Pavadinimas | Reikšmė |
|---|---|
| `VITE_SUPABASE_URL` | tokia pati kaip jūsų `.env.local` |
| `VITE_SUPABASE_ANON_KEY` | tokia pati kaip jūsų `.env.local` (publishable / anon raktas) |

`VITE_` kintamieji įrašomi į JavaScript kūrimo metu. Jei juos pridedate ar keičiate vėliau, paleiskite **Deployments → ⋯ → Redeploy**, kitaip svetainė išlaikys senas reikšmes. Čia niekada nepridėkite `service_role` rakto ar Zapier Catch Hook adreso.

Tada paspauskite **Deploy** ir atidarykite Vercel suteiktą adresą, pvz., `https://workout-log.vercel.app`.

## 3. Pasakykite Supabase apie naują adresą

Supabase → **Authentication → URL Configuration** (daugiau – [supabase.md](supabase.md#3-url-nustatymai)):

| Nustatymas | Reikšmė |
|---|---|
| Site URL | jūsų produkcinis adresas, pvz., `https://workout-log.vercel.app` |
| Redirect URLs | `https://workout-log.vercel.app/**`, palikite `http://localhost:5173/**`, o peržiūros nuorodoms – `https://*-<jūsų-vercel-paskyra>.vercel.app/**` |

## 4. Patikrinkite kaip pašalinis naudotojas (kurso 14 skaidrė, 14 žingsnis)

1. Atidarykite veikiančią nuorodą **privačiame / inkognito** lange.
2. **Susikurkite paskyrą** su nauju el. paštu → tikimasi: Tuščios būsenos, *Planų dar nėra* (kurso 1 testas).
3. Sukurkite planą ir įrašykite treniruotę → tikimasi: *Treniruotė išsaugota*. Kai Zapier paruoštas ([zapier.md](zapier.md)), trenerio laiškas ateina maždaug per minutę.
4. Perkraukite puslapį adresu `/log`: jis turi įsikelti, o ne rodyti 404. Saugyklos `vercel.json` nukreipia kiekvieną kelią į `index.html`, todėl kliento pusės maršrutai išlieka perkrovus.

Veikiančią nuorodą įrašykite į README (viršuje) ir Notion projekto puslapį.

## 5. Pull request peržiūros

Kiekvienas pull request gauna savo peržiūros diegimą. Atidarykite jo nuorodą ir prieš suliedami patikrinkite, ar pakeitimas veikia (kurso 13 skaidrė, 4 žingsnis). Peržiūra pateikiama per HTTPS, todėl tikrame telefone ją galima ir įdiegti, ir išbandyti be ryšio ([6 skyrius](#6-telefono-programėlė-pwa-per-vercel)).

## 6. Telefono programėlė (PWA) per Vercel

Telefono programėlei Vercel nieko nereikia nustatyti: jokio naujo aplinkos kintamojo, jokio nustatymo. `npm run build` service worker (`sw.js`), manifestą (`manifest.webmanifest`) ir piktogramas įdeda į `dist/` kartu su likusia programa, o Vercel jas pateikia kaip bet kurį kitą statinį failą. Kas svarbu:

- **Reikia HTTPS.** Naršyklė service worker užregistruoja tik per HTTPS (arba `localhost`). Vercel produkciją ir kiekvieną peržiūrą pateikia per HTTPS, todėl įdiegti ir naudoti be ryšio galima abiem, iš tikro telefono. Paprastas `http://` adresas, pavyzdžiui, kūrimo serveris, atidarytas pagal LAN IP, service worker neturi ir jo įdiegti negalima. `npm run dev` sąmoningai veikia be jo; norėdami išbandyti service worker savo kompiuteryje, naudokite `npm run build` ir `npm run preview` ([setup.md](setup.md#išbandykite-telefono-programėlę-vietoje)).
- **`sw.js` ir `manifest.webmanifest` turi būti pateikiami tokie, kokie yra, ir niekada ilgam nekešuojami.** `vercel.json` turi vieną taisyklę, kuri kiekvieną kelią nukreipia į `index.html`. Vercel pateikia egzistuojantį failą (`sw.js`, manifestą, piktogramas, `assets/…`) anksčiau, nei taiko tą taisyklę, todėl taisyklė sugauna tik kliento pusės maršrutus, pavyzdžiui, `/log`. Faile nėra `headers` skilties, todėl galioja Vercel numatytoji statinių failų reikšmė: `Cache-Control: public, max-age=0, must-revalidate`, dėl kurios naršyklė kaskart paklausia iš naujo. Būtent tai leidžia rasti naują programos versiją. Patikrinta v5 peržiūroje: `/sw.js` grįžta kaip `application/javascript`, o `/manifest.webmanifest` – kaip `application/manifest+json`, abu su šia antrašte. Nepridėkite `headers` taisyklės, dėl kurios jie taptų ilgaamžiai, ir nekeiskite nukreipimo taip, kad jis juos sugautų: service worker failas, kuris grąžina `index.html`, neužsiregistruoja, o metams užkešuoto manifesto pataisyti neįmanoma.
- **Manifesto nuorodoje yra `crossorigin="use-credentials"`** (`index.html`), todėl peržiūrą, apsaugotą Vercel slaptažodžiu ar prisijungimu, vis tiek galima įdiegti: naršyklė su manifesto užklausa išsiunčia savo slapuką.
- **Naujas diegimas telefonus pasiekia kaip pasiūlymas.** Telefonas naują versiją atsisiunčia fone, o būsenos eilutė parašo *Paruošta nauja Logify versija.* su **Atnaujinti**. Atidaryta programa klausia kas valandą, o paleista programa – taip pat. Niekas pats neperkraunama. Žr. [pwa.md](pwa.md#atnaujinimai).
- **Jei peržiūra rodo „Programėlė dar nesukonfigūruota“**, du Supabase kintamieji neįjungti Vercel aplinkai **Preview** ([2 žingsnis](#2-aplinkos-kintamieji-prieš-pirmąjį-diegimą)).

## 7. v5 išleidimas

v5 – tai kodo ir duomenų bazės pakeitimas, o duomenų bazės pakeitimas yra **suderinamas atgal**: nauji `log_workout()` parametrai neprivalomi, todėl programa iš laikų prieš v5, esanti `main`, toliau veikia su v5 duomenų baze. Tai ir lemia tvarką. Pagrindimas aprašytas [v5 projekte](../superpowers/specs/2026-11-16-pwa-offline-design.md#7-compatibility-in-both-directions) (angliškai).

1. **Pirmiausia duomenų bazė.** Supabase SQL Editor paleiskite visą [`supabase/schema.sql`](../../supabase/schema.sql) iš `release/v5` (galima paleisti pakartotinai; v5 blokas pakeičia `log_workout()` ir prideda `schema_version()`), tada [`supabase/tests/log_workout_offline.test.sql`](../../supabase/tests/log_workout_offline.test.sql), kuris turi baigtis *TESTS PASSED*. Žingsniai ir ką tikrinti: [supabase.md](supabase.md#v5-pritaikymas-esamam-projektui). Patikrinkite, ar veikianti programa vis dar išsaugo treniruotę.
2. **Išbandykite peržiūrą.** Tikrame telefone atidarykite `release/v5` peržiūrą iš Vercel **Deployments**: įdiekite ją, išjunkite ryšį, įrašykite treniruotę, vėl įjunkite ryšį. Būsenos eilutė neturi rodyti senesnės duomenų bazės įspėjimo.
3. **Tada suliekite** `release/v5` į `main`. Vercel įdiegia produkciją, ir nuo tada veikianti svetainė turi service worker ir įdiegimo kortelę.
4. **Įdiegtiems telefonams** nauja versija pasiūloma, kaip aprašyta aukščiau.

> **Įspėjimas: niekada nepaleiskite `main` senojo `supabase/schema.sql` v5 duomenų bazėje.** `schema.sql` iš laikų prieš v5 yra ankstesnis nei v5: `main` esantis, kol `release/v5` nesuliesta, o vėliau – bet kuri senesnė kopija ar senesnis klonas. Jis sukuria aštuonių parametrų `log_workout()` šalia v5 versijos, ir kiekvienas kvietimas su aštuoniais pradiniais parametrais tada nepavyksta su `PGRST203`. Sprendimas yra [Supabase trikčių šalinimo lentelėje](supabase.md#trikčių-šalinimas): ištrinkite aštuonių parametrų versiją ir dar kartą paleiskite v5 `schema.sql`.

## Trikčių šalinimas

| Simptomas | Priežastis | Sprendimas |
|---|---|---|
| „The app is not set up yet… Missing setting: VITE_…“ | Kintamojo Vercel nėra arba jis pridėtas po kūrimo | 2 žingsnis, tada Redeploy |
| Tuščias puslapis | Kūrimas iš laikų, kai šios patikros dar nebuvo, arba JavaScript klaida | Atidarykite naršyklės konsolę; perskaitykite Vercel kūrimo žurnalą |
| Prisijungimas ar el. laiškų nuorodos veda į localhost | Supabase Site URL / Redirect URLs vis dar rodo į localhost | 3 žingsnis |
| 404 perkraunant `/log` | Įdiegtame commit trūksta `vercel.json` | Įsitikinkite, kad commit yra `vercel.json`, tada Redeploy |
| Kūrimas nepavyksta | Perskaitykite Vercel kūrimo žurnalą. Patikrinkite aplinkos kintamųjų pavadinimus ir ar pakeitimas yra `main` (kurso 14 skaidrė) | Vite 8 reikia Node 20.19+ arba 22.12+: **Settings → Build and Deployment → Node.js Version** |
| Telefonas nesiūlo **Įdiegti**, o programa neatsidaro be ryšio | Adresas ne HTTPS (arba tai `npm run dev`), todėl service worker nėra | Naudokite Vercel adresą arba `npm run build` + `npm run preview` per localhost ([6 skyrius](#6-telefono-programėlė-pwa-per-vercel)) |
| `/sw.js` rodo programą vietoje „JavaScript“, arba naršyklė praneša apie service worker MIME tipo klaidą | Nukreipimas `vercel.json` sugauna failą, arba įdiegtoje versijoje nėra `sw.js` | Palikite vieną nukreipimo taisyklę; patikrinkite, ar `npm run build` sukuria `dist/sw.js` |
| Įdiegti telefonai lieka su sena versija | Nauja versija laukia **Atnaujinti**, arba programa po to neatidaryta | Atidarykite programą ir būsenos eilutėje paspauskite **Atnaujinti** ([pwa.md](pwa.md#atnaujinimai)) |
| Po SQL paleidimo `log_workout()` kvietimai nepavyksta su `PGRST203` | Senesnis `schema.sql` buvo paleistas v5 duomenų bazėje | [7 skyrius](#7-v5-išleidimas), įspėjimas; sprendimas [supabase.md](supabase.md#trikčių-šalinimas) |

## Susiję

[architecture.md](architecture.md#2-diegimas-ir-infrastruktūra) (diegimo diagrama, o telefono pusė – [7 skyriuje](architecture.md#7-mobilioji-architektūra-pwa)) · [pwa.md](pwa.md) (telefono programėlė) · [supabase.md](supabase.md) (duomenų bazė, v5 pritaikymas) · [setup.md](setup.md) (vietinis paruošimas ir PWA bandymas) · [zapier.md](zapier.md) (laiškai)
