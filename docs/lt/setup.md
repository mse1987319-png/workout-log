# Aplinkos paruošimas

*[English](../setup.md) · Lietuviškai*

Kaip nuo šviežio klonavimo nueiti iki programos, veikiančios adresu `http://localhost:5173`.

Viską, ką galima paleisti lokaliai, automatizuoja vienas skriptas, [`scripts/setup.ps1`](../../scripts/setup.ps1). Rankomis lieka tai, kam reikia prisijungimo naršyklėje: Supabase, Vercel ir Zapier paskyros.

## Greita pradžia („Windows“)

Iš saugyklos šaknies, PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

Tada įrašykite dvi Supabase reikšmes į `.env.local` ([kur jas rasti](#aplinkos-kintamieji)) ir paleiskite programą:

```powershell
npm.cmd run dev
```

Skriptą saugu paleisti iš naujo bet kada. Kiekvienas žingsnis patikrina, ar jau atliktas, ir jei taip – praleidžia save.

| Žingsnis | Ką daro skriptas | Praleidžiama, kai |
|---|---|---|
| 1. Įrankiai | Su `winget` įdiegia Git ir Node.js LTS | Jie jau įdiegti |
| 2. Programa | Į saugyklą sukuria Vite + React (JavaScript) programos karkasą ir pašalina laikiną `index.js` | Yra `vite.config.*` failas |
| 3. Priklausomybės | Paleidžia `npm install` ir prideda `@supabase/supabase-js` bei `react-router-dom` | Niekada; nieko nepasikeitus vyksta greitai |
| 4. Aplinka | Sukuria `.env.example` ir `.env.local` | Failai jau yra |
| 5. Patikra | Paleidžia `npm run build` | Naudojamas `-CheckOnly` |

2 žingsnis niekada neperrašo jūsų failų. Jis palieka esamą `README.md`, į `.gitignore` tik *prideda* trūkstamas taisykles ir `package.json` pakeičia tik tol, kol jis dar yra IDE laikinasis failas be priklausomybių.

### Skripto parametrai

| Parametras | Poveikis |
|---|---|
| `-CheckOnly` | Praneša, ko trūksta, ir nieko nekeičia. Jei ko nors trūksta, grąžina išėjimo kodą 1. |
| `-SupabaseUrl <url>` | Įrašo `VITE_SUPABASE_URL` į `.env.local`. |
| `-SupabaseAnonKey <key>` | Įrašo `VITE_SUPABASE_ANON_KEY` į `.env.local`. |
| `-WithGitHubCli` | Papildomai įdiegia neprivalomą GitHub CLI (`gh`). |

Pavyzdys, viskas iš karto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -SupabaseUrl "https://<project-ref>.supabase.co" -SupabaseAnonKey "<anon key>"
```

## Ko jums reikia

### Įrankiai

| Įrankis | Versija | Kam naudojamas | Ar įdiegia skriptas |
|---|---|---|---|
| Git | bet kuri nauja | Šakos ir pull request | Taip (`Git.Git`) |
| Node.js + npm | **22.12 ar naujesnė** | Vite kūrimo serveris ir kūrimas | Taip (`OpenJS.NodeJS.LTS`), jei Node nėra |
| GitHub CLI (`gh`) | bet kuri | Neprivaloma: saugyklai ir PR kurti iš terminalo | Su `-WithGitHubCli` |

Node 22.12 yra žemiausia versija, tenkinanti ir Vite 8 (`^20.19 || >=22.12`), ir `@supabase/supabase-js` (`>=22`). Jei įdiegta senesnė Node, skriptas sustoja ir apie tai praneša, o ne atnaujina, nes ją gali valdyti versijų tvarkyklė arba ji gali būti reikalinga kitam projektui.

Supabase CLI, Vercel CLI ar Docker nereikia: šis projektas naudoja talpinamus skydelius.

### npm paketai

| Paketas | Iš kur | Paskirtis |
|---|---|---|
| `react`, `react-dom` | Vite šablonas | Sąsaja |
| `vite`, `@vitejs/plugin-react` | Vite šablonas | Kūrimo serveris ir kūrimas |
| `oxlint` | Vite šablonas | Linteris (`npm run lint`) |
| `@supabase/supabase-js` | Prideda skriptas | Auth ir duomenų bazės klientas |
| `react-router-dom` | Prideda skriptas | Naršymas tarp ekranų |
| `vitest`, `jsdom`, `@testing-library/*` | `package.json` (dev) | Vienetų testai (`npm test`); jie niekada nesikreipia į Supabase |

`recharts` reikia tik papildomai Pažangos diagramai. Pridėkite jį tos funkcijos šakoje: `npm install recharts`.

### Paskyros

Jų negalima sukurti skriptu. Sukurkite jas vieną kartą naršyklėje.

| Paslauga | Kam reikia | Paskaita |
|---|---|---|
| GitHub | Viešoji saugykla, pull request | 1 |
| Supabase | Auth, lentelės, RLS, Database Webhook | 1 |
| Vercel | Viešas adresas | 3 |
| Zapier + Gmail | Laiškas apie naują treniruotę | 3 |
| Notion | Projekto dokumentacija | 1 |

## Aplinkos kintamieji

Programa skaito dvi reikšmes, abi iš Supabase → **Project Settings → API**:

| Kintamasis | Reikšmė |
|---|---|
| `VITE_SUPABASE_URL` | Projekto URL, `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Viešasis `anon` raktas (naujesniuose skydeliuose vadinamas „publishable“; tinka abu) |

- `.env.local` laiko tikras reikšmes. Jis ignoruojamas git ir lieka jūsų kompiuteryje.
- `.env.example` laiko pavadinimus su vietos žymekliais. Jis komituojamas, kad šviežias klonas žinotų, ką užpildyti.
- Tuos pačius du kintamuosius nustatykite Vercel → Project → Settings → Environment Variables **prieš** pirmąjį diegimą.
- Vite aplinkos failus skaito tik paleidžiant: pakeitę `.env.local`, paleiskite `npm run dev` iš naujo.

Niekada neįrašykite `service_role` rakto ar Zapier Catch Hook adreso į jokį iš šių failų. Žr. [implementation-plan.md §8](implementation-plan.md#8-raktai-ir-paslaptys-8-skaidrė).

## Talpinamos paslaugos, rankomis

Trumpas sąrašas; kiekvienas žingsnis turi savo žingsnis po žingsnio vadovą.

1. **Supabase:** naujas projektas ES regione → paleiskite [`supabase/schema.sql`](../../supabase/schema.sql) (lentelės `plans` ir `workouts` su RLS) → paleiskite [`supabase/seed.sql`](../../supabase/seed.sql) (demonstracinės paskyros ir duomenys; žr. README skiltį *Demonstracinės paskyros*) → Authentication: el. pašto prisijungimas įjungtas, *Confirm email* išjungtas, Site URL `http://localhost:5173`. Vadovas: [supabase.md](supabase.md).
2. **`.env.local`:** įrašykite projekto URL ir viešąjį (anon) raktą (arba perduokite juos skriptui).
3. **Vercel** (3 paskaita): importuokite GitHub saugyklą → pridėkite abu `VITE_` kintamuosius → įdiekite → Supabase Site URL ir Redirect URLs nustatykite į Vercel nuorodą. Vadovas: [deployment.md](deployment.md).
4. **Zapier** (3 paskaita): Catch Hook → Supabase Database Webhook lentelėje `workouts` → Filter → Paths → Gmail. Vadovas: [zapier.md](zapier.md).

## Rankinis paruošimas (macOS, Linux arba be winget)

Patys įdiekite [Git](https://git-scm.com/downloads) ir [Node.js 22.12+](https://nodejs.org/), tada iš saugyklos šaknies paleiskite bash suderinamoje komandų eilutėje („Windows“ tinka Git Bash).

**Vieną kartą, kol saugykloje nėra `vite.config.js`** – sukurkite karkasą šalia saugyklos ir nukopijuokite šabloną, palikdami projekto `README.md`:

```bash
npm create --yes vite@latest ../workout-log-template -- --template react --no-interactive
rm ../workout-log-template/README.md
cat ../workout-log-template/.gitignore >> .gitignore && rm ../workout-log-template/.gitignore
cp -R ../workout-log-template/. . && rm -rf ../workout-log-template index.js
npm pkg set name=workout-log
npm install @supabase/supabase-js react-router-dom
printf 'VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co\nVITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY\n' > .env.example
```

`create-vite` nepaleidžiamas tiesiai saugyklos aplanke, nes netuščiame aplanke jis arba prašo viską ištrinti, arba perrašo `README.md` ir `.gitignore`.

**Kiekvienas šviežias klonas po to:**

```bash
npm install
cp .env.example .env.local     # tada įrašykite dvi reikšmes
npm run dev
```

## Patikra

| Komanda | Tikimasi |
|---|---|
| `powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -CheckOnly` | Kiekviena eilutė yra `[ok]`; pabaigoje „Environment is ready“ |
| `npm run dev` | Vite išveda `Local: http://localhost:5173/`; puslapis atsidaro |
| `npm run build` | Baigiasi `✓ built in …`; rezultatas `dist/` |
| `npm test` | Kiekvienas testų failas praeina |
| `git status` | `.env.local`, `node_modules/` ir `dist/` **nėra** sąraše |

## Trikčių šalinimas

| Simptomas | Priežastis | Sprendimas |
|---|---|---|
| `setup.ps1 cannot be loaded … not digitally signed` | Kompiuterio PowerShell vykdymo politika blokuoja nepasirašytus skriptus | Paleiskite taip, kaip parodyta aukščiau, su `powershell -ExecutionPolicy Bypass -File …`. Tai galioja tik tam vienam paleidimui. |
| `npm.ps1 cannot be loaded … not digitally signed` PowerShell įvedus `npm` | Ta pati politika; PowerShell parenka `npm.ps1`, o ne `npm.cmd` | Įveskite `npm.cmd` vietoj `npm` (taip pat `npx.cmd`) arba naudokite Git Bash, cmd ar IDE npm įrankių langą. |
| `winget is not available` | winget nėra arba jį blokuoja įmonės politika | Įdiekite Git ir Node.js iš nuorodų skiltyje [Rankinis paruošimas](#rankinis-paruošimas-macos-linux-arba-be-winget), tada vėl paleiskite skriptą. |
| `Node.js … was installed but is not on PATH yet` | Terminalas buvo atidarytas prieš diegimą | Atidarykite naują terminalą ir vėl paleiskite skriptą. |
| `Node.js <version> is too old` | Node senesnė nei 22.12 | `winget upgrade OpenJS.NodeJS.LTS` arba pakeiskite versiją versijų tvarkyklėje. |
| Programa rodo Supabase klaidą arba `supabaseUrl is required` | `.env.local` vis dar turi vietos žymeklius arba kūrimo serveris nebuvo paleistas iš naujo | Užpildykite abi reikšmes, tada paleiskite `npm run dev` iš naujo. |
| Prievadas 5173 užimtas | Veikia kitas kūrimo serveris | Sustabdykite jį arba priimkite kitą Vite siūlomą prievadą ir pridėkite tą adresą į Supabase Redirect URLs. |
