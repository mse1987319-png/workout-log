# Architektūra

*[English](../architecture.md) · Lietuviškai*

Kaip sukurta baigta programa: duomenų modelis (ERD), kur viskas veikia (diegimo diagrama), kaip keliauja užklausa ir el. laiškas, ir kas ką gali skaityti. Diagramos sukurtos su [Mermaid](https://mermaid.js.org/), kurį GitHub atvaizduoja tiesiogiai.

Pradinė apimtis aprašyta [implementation-plan.md](implementation-plan.md); šiame puslapyje aprašyta, kas buvo **sukurta**, įskaitant tai, kuo skiriasi nuo plano.

## 1. Duomenų modelis (ERD)

Dvi pradinės užduoties lentelės, **`plans`** (A lentelė) ir **`workouts`** (B lentelė), paryškintos. Visa kita – išplėstinė apimtis, pridėta lentelė po lentelės vėlesniuose pull request. `auth.users` yra paties Supabase lentelė.

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "turi vieną"
  AUTH_USERS ||--o{ PLANS : "valdo"
  PLANS ||--o{ WORKOUTS : "turi"
  WORKOUTS ||--o{ WORKOUT_SETS : "turi serijas"
  AUTH_USERS ||--o{ GOALS : "nustato"
  AUTH_USERS ||--o{ REPORTS : "siunčia"
  PROFILES ||--o{ INSTRUCTOR_LINKS : "trenerio pusė"
  PROFILES ||--o{ INSTRUCTOR_LINKS : "sportininko pusė"
  PLANS ||--o{ PLAN_ASSIGNMENTS : "priskiriamas"
  PROFILES ||--o{ PLAN_ASSIGNMENTS : "sportininkas gauna"

  PLANS:::initial {
    uuid id PK
    uuid user_id FK "numatyta auth.uid()"
    text name
    text goal
    timestamptz created_at
  }
  WORKOUTS:::initial {
    uuid id PK
    uuid plan_id FK
    uuid user_id FK "numatyta auth.uid()"
    text title
    text type "strength arba other: Zapier maršrutizavimo laukas"
    int duration_min
    text activity "run, bike, swim, walk, row, other"
    numeric distance_km
    text notes
    text sets_summary "viena eilutė laiškui"
    timestamptz created_at
  }
  WORKOUT_SETS {
    uuid id PK
    uuid workout_id FK
    uuid user_id FK
    text exercise
    int set_no
    int reps
    numeric weight_kg "0 = savo svoris"
    timestamptz created_at
  }
  GOALS {
    uuid id PK
    uuid user_id FK
    text exercise
    numeric target_kg
    date target_date
    timestamptz created_at
  }
  REPORTS {
    uuid id PK
    uuid user_id FK
    text athlete_email
    date period_start
    date period_end
    text summary
    jsonb stats
    timestamptz created_at
  }
  PROFILES {
    uuid id PK, FK
    text email
    text role "athlete arba instructor"
    text invite_code "tik treneriams"
    timestamptz created_at
  }
  INSTRUCTOR_LINKS {
    uuid instructor_id PK, FK
    uuid athlete_id PK, FK
    timestamptz created_at
  }
  PLAN_ASSIGNMENTS {
    uuid plan_id PK, FK
    uuid athlete_id PK, FK
    uuid assigned_by FK
    timestamptz created_at
  }
  AUTH_USERS {
    uuid id PK
    text email
  }

  classDef initial stroke:#f97316,stroke-width:5px
```

| Lentelė | Lygis | Paskirtis |
|---|---|---|
| `plans` | **Pradinė užduotis (A)** | Treniruočių planas. Priklauso vienam naudotojui; trenerio planą galima priskirti sportininkams |
| `workouts` | **Pradinė užduotis (B)** | Viena įrašyta treniruotė pagal planą. **Jos INSERT paleidžia pirmąjį webhook** (Zap 1) |
| `workout_sets` | Išplėstinė | Jėgos treniruotės pratimas, serijos numeris, pakartojimai ir kg |
| `goals` | Išplėstinė | Pratimas, tikslinis svoris ir data; ar tikslas pasiektas ar pavėluotas, apskaičiuojama iš serijų |
| `reports` | Išplėstinė | Pažangos ataskaita, rašoma tik per `send_report()`. **Jos INSERT paleidžia antrąjį webhook** (Zap 2) |
| `profiles` | Išplėstinė | Po vieną kiekvienam naudotojui: registruojantis pasirinktas vaidmuo (`athlete` / `instructor`) ir trenerio kvietimo kodas |
| `instructor_links` | Išplėstinė | Sportininkas dalijasi su treneriu (sukuria `link_instructor(code)`) |
| `plan_assignments` | Išplėstinė | Vienas planas daugeliui sportininkų |

`user_id` lentelėse `workouts` ir `workout_sets` yra patogumo sumetimais laikoma savininko kopija, todėl kiekviena Row Level Security politika yra paprasta `user_id = auth.uid()` patikra. Visos lentelės yra [`supabase/schema.sql`](../../supabase/schema.sql).

## 2. Diegimas ir infrastruktūra

```mermaid
flowchart LR
  subgraph DEV["Kūrėjo kompiuteris"]
    CODE["Kodas saugykloje<br/>React + Vite, JavaScript<br/>npm test · lint · build"]
    ENV[".env.local<br/>ignoruojamas git"]
    KEYS["_task/.keys<br/>keys.md ignoruojamas git,<br/>keys.zip užšifruotas"]
  end

  subgraph GH["GitHub (privati saugykla)"]
    PR["feature/… šakos<br/>pull request"]
    MAIN["main"]
  end

  subgraph VERCEL["Vercel"]
    BUILD["Kūrimas: npm run build"]
    CDN["Statinis talpinimas + CDN<br/>viešas adresas"]
    VENV["Aplinkos kintamieji (kūrimo metu)<br/>VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY"]
  end

  USER(["Naudotojo naršyklė<br/>sportininkas arba treneris"])

  subgraph SB["Supabase projektas, eu-west-1"]
    AUTH["Auth<br/>el. paštas + slaptažodis"]
    API["REST API (PostgREST)<br/>lentelės + rpc funkcijos"]
    DB[("Postgres<br/>lentelės · RLS politikos<br/>funkcijos · trigeriai")]
    HOOKS["Database Webhooks<br/>workouts_to_zapier<br/>reports_to_zapier"]
  end

  subgraph ZP["Zapier"]
    Z1["Zap 1: Catch Hook → Filter<br/>→ Paths → Gmail"]
    Z2["Zap 2: Catch Hook → Gmail"]
  end

  GMAIL["Gmail<br/>trenerio pašto dėžutė"]
  NOTION["Notion<br/>projekto dokumentacija"]

  CODE -->|push| PR
  PR -->|"merge"| MAIN
  PR -.->|"peržiūros diegimas"| BUILD
  MAIN -->|"produkcinis diegimas"| BUILD
  VENV --> BUILD
  BUILD --> CDN
  USER -->|HTTPS| CDN
  USER -->|"supabase-js, anon key + user JWT"| AUTH
  USER --> API
  API --> DB
  AUTH --> DB
  DB --> HOOKS
  HOOKS -->|"HTTPS POST, JSON"| Z1
  HOOKS -->|"HTTPS POST, JSON"| Z2
  Z1 --> GMAIL
  Z2 --> GMAIL
  ENV -.->|"tos pačios dvi reikšmės, vietiniam kūrimui"| CODE
  KEYS -.->|"tik administravimo skriptams: niekada programoje"| SB
  CODE -.->|"dokumentuojama rankomis"| NOTION
```

| Dalis | Kur veikia | Ką daro |
|---|---|---|
| React programa | Vercel (statiniai failai CDN tinkle) | Viskas, ką mato naudotojas. Su Supabase kalbasi tiesiogiai iš naršyklės |
| Auth, API, duomenų bazė | Supabase, ES regionas | Paskyros, duomenys, prieigos taisyklės ir webhook |
| Automatizacija | Zapier | Webhook paverčia el. laišku (Filter ir Paths pagal `workouts.type` parenka temą) |
| El. paštas | Gmail | Pristato treneriui |
| Šaltinis ir peržiūra | GitHub | Viena `feature/…` šaka ir vienas pull request kiekvienai funkcijai; push į `main` diegia produkciją, kiekvienas pull request gauna peržiūros versiją |
| Dokumentacija | Notion ir ši saugykla | Užduočių lentelė, sprendimai, klaidos, testai |

### Kur laikomos paslaptys

| Paslaptis | Kur ji yra | Kur jos niekada neturi būti |
|---|---|---|
| Supabase URL ir viešasis (anon) raktas | Vercel aplinkos kintamieji, `.env.local` | Saugu atskleisti, bet **tik todėl, kad įjungtas RLS** |
| Supabase `service_role` / secret raktas | Tik administravimo skriptuose kūrėjo kompiuteryje | React, Vercel, saugykla |
| Zapier Catch Hook adresai | Dviejuose Supabase webhook (duomenų bazės trigeriuose) ir Zapier | Saugykla, README, Notion, ekrano nuotraukos, Vercel |
| Zapier, Notion, Vercel ir Supabase raktai, demonstraciniai prisijungimai | `_task/.keys/keys.md` (ignoruojamas git); saugykloje laikomas tik slaptažodžiu apsaugotas, AES-256 užšifruotas `keys.zip` | Saugykla atviru tekstu |

## 3. Kaip organizuotas kodas

| Sluoksnis | Aplankas | Taisyklė |
|---|---|---|
| Ekranai | `src/pages`, `src/components` | Rodo keturias būsenas (kraunama, klaida, tuščia, pavyko); patys duomenų neprieina |
| Duomenų prieiga | `src/api` | Viena funkcija vienam klausimui ar įrašymui: `from(...)` užklausos ir `rpc(...)` kvietimai; vienintelė vieta, kuri žino lentelių ir funkcijų pavadinimus |
| Logika | `src/lib` | Grynosios funkcijos be įvesties/išvesties: pažangos skaičiavimai, tikslai, pasiūlymai, formatavimas. Lengva testuoti |
| Tekstai | `src/i18n` | Kiekvienas sąsajos tekstas yra `translations.js` (lietuvių ir anglų, tie patys raktai). `t(key, params)` įstato `{vietoženklius}` ir parenka daugiskaitos formas (lietuvių kalboje jų trys); pasirinkta kalba saugoma `localStorage`, o komponentai ją skaito per `useLanguage()`. Numatytoji kalba – lietuvių |
| Auth | `src/auth` | Sesijos tiekėjas; vaidmuo meniu imamas iš registracijos metaduomenų |
| Duomenų bazė | `supabase/schema.sql` | Lentelės, politikos, funkcijos, trigeriai; galima paleisti pakartotinai. `seed.sql` prideda demonstracinius duomenis į tuščią projektą |

Testai veikia be tinklo: tikras `supabase-js` klientas kalbasi su netikru `fetch` (`src/test/fakeBackend.js`), todėl jie tikrina tikslias HTTP užklausas. Duomenų bazė turi savo testus aplanke `supabase/tests`, kurių kiekvienas pats save atšaukia.

## 4. Duomenų srautai

**Treniruotės įrašymas.** Forma kviečia `log_workout()` (viena transakcija: treniruotė ir jos serijos). `INSERT` į `workouts` vieną kartą paleidžia webhook, o `sets_summary` jau yra eilutėje, todėl Zap 1 gali įtraukti serijas į laišką. Jei kas nors nepavyksta, nieko neišsaugoma ir nieko nesiunčiama.

**Ataskaitos siuntimas.** Mygtukas kviečia `send_report()`, kuri sudaro skaičius iš kvietėjo paties pastarųjų 7 dienų, išsaugo `reports` eilutę (daugiausia vieną per 5 minutes) ir taip paleidžia antrąjį webhook.

**Tikslai ir pasiūlymai.** Tikslai saugomi duomenų bazėje; ar tikslas pasiektas ar pavėluotas, ir kiekvienas pasiūlymas skaičiuojami naršyklėje iš sportininko serijų, todėl kiekvienas gali nurodyti savo priežastį. Jokio DI rakto niekur.

**Dalijimasis.** Sportininkas įveda trenerio kodą; `link_instructor()` sukuria ryšį. Tada treneris skaito tą sportininką per dvi funkcijas (žemiau).

## 5. Kas ką gali skaityti

Row Level Security yra prieigos kontrolė; naršyklė niekada nefiltruoja pagal naudotoją.

| Duomenys | Savininkas | Susietas treneris |
|---|---|---|
| `plans`, `workouts`, `workout_sets`, `goals`, `reports` | Pilna prieiga prie savo eilučių (ataskaitos: tik skaityti) | Per lenteles – nieko |
| Sportininko pažanga | netaikoma | Per `my_athletes()` ir `athlete_progress()`, kurios pirmiausia patikrina ryšį; tik skaityti |
| Trenerio sportininkui priskirtas planas | netaikoma | Sportininkas gali jį skaityti ir pagal jį registruoti savo treniruotes (papildančios politikos) |

**Planų redagavimas ir trynimas.** Planą redaguoti ar ištrinti gali tik savininkas (priskirtas planas sportininkui yra tik skaitomas). Ištrynus planą, kartu ištrinamos jo treniruotės ir jų serijos, todėl programa pirmiausia paklausia. Trigeris atsisako trinti planą, pagal kurį treniruotes įrašė *kiti žmonės* (trenerio planą su sportininkų treniruotėmis), todėl treneris negali ištrinti sportininkų istorijos; paskyros ištrynimas vis tiek veikia.

**Kuo skiriasi nuo plano:** plane buvo siūloma treneriams pridėti papildomas `select` politikas sportininkų lentelėse. Jos būtų sumaišiusios sportininkų eilutes su paties trenerio ekranais, todėl treneriai skaito per funkcijas, o lentelėse paliekama „tik savo eilutės“. Žr. [supabase.md](supabase.md#1-lentelės-ir-politikos).

## Susiję

[supabase.md](supabase.md) (lentelės, politikos, dalijimasis) · [deployment.md](deployment.md) (Vercel) · [zapier.md](zapier.md) (abu Zap) · [setup.md](setup.md) (vietinis paruošimas)
