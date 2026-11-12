# Diegimas: Vercel

*[English](../deployment.md) · Lietuviškai*

3 paskaita (kurso 14 skaidrė). Suteikia programai viešą adresą (žr. [diegimo diagramą](architecture.md#2-diegimas-ir-infrastruktūra)). Kodas keliauja GitHub → Vercel; kiekvienas push į `main` diegia produkciją, o kiekvienas pull request gauna peržiūros nuorodą.

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

Kiekvienas pull request gauna savo peržiūros diegimą. Atidarykite jo nuorodą ir prieš suliedami patikrinkite, ar pakeitimas veikia (kurso 13 skaidrė, 4 žingsnis).

## Trikčių šalinimas

| Simptomas | Priežastis | Sprendimas |
|---|---|---|
| „The app is not set up yet… Missing setting: VITE_…“ | Kintamojo Vercel nėra arba jis pridėtas po kūrimo | 2 žingsnis, tada Redeploy |
| Tuščias puslapis | Kūrimas iš laikų, kai šios patikros dar nebuvo, arba JavaScript klaida | Atidarykite naršyklės konsolę; perskaitykite Vercel kūrimo žurnalą |
| Prisijungimas ar el. laiškų nuorodos veda į localhost | Supabase Site URL / Redirect URLs vis dar rodo į localhost | 3 žingsnis |
| 404 perkraunant `/log` | Įdiegtame commit trūksta `vercel.json` | Įsitikinkite, kad commit yra `vercel.json`, tada Redeploy |
| Kūrimas nepavyksta | Perskaitykite Vercel kūrimo žurnalą. Patikrinkite aplinkos kintamųjų pavadinimus ir ar pakeitimas yra `main` (kurso 14 skaidrė) | Vite 8 reikia Node 20.19+ arba 22.12+: **Settings → Build and Deployment → Node.js Version** |
