# Zapier: el. laiškas sportininko treneriui apie kiekvieną naują treniruotę

*[English](../zapier.md) · Lietuviškai*

3–4 paskaita. Sukuria Zap 1 pagal [įgyvendinimo plano §7](implementation-plan.md#7-automatizacija-zapier): kiekviena programoje įrašyta treniruotė maždaug per minutę tampa el. laišku. Tikslūs mygtukų pavadinimai Zapier ir Supabase skirtingose versijose keičiasi; žemiau pateikti artimiausi dabartiniai.

> **Apie kalbą.** Zapier ir Supabase sąsajos angliškos, todėl mygtukų, laukų ir žingsnių pavadinimai čia palikti angliški. Zapier Copilot užklausos ir laiškų temos bei turinys taip pat paliekami angliški (jie ir siunčiami angliškai).

```
Treniruotės įrašymas programoje  →  INSERT į workouts
  → Supabase Database Webhook (HTTP POST, JSON)
  → Zapier: Catch Hook → Filter (type = INSERT ir yra trenerių el. paštai) → Paths
        Kelias A „Strength“: record__type = strength → Gmail „STRENGTH: <title>“
        Fallback:            visa kita               → Gmail „New workout: <title>“
        Gmail „To“ = record__instructor_emails (paties sportininko treneriai)
```

**Kas gauna laišką.** Ne fiksuotas adresas Zapier: sprendžia duomenų bazė. Trigeris lentelėje `workouts` (ir `reports`, Zap 2 atveju) į eilutės stulpelį `instructor_emails` įrašo kiekvieno trenerio, su kuriuo sportininkas dalijasi, el. paštą, todėl webhook juos atsiunčia, o Gmail *To* yra tiesiog šis laukas. Sportininkas, kuris nesidalija su niekuo, gavėjo neturi: Filter sustabdo paleidimą, laiško ir užduoties nėra. Gavėjo įvesti negali niekas, nes stulpelį nustato tik trigeris.

**Be ryšio įrašytos treniruotės (v5).** Telefone be ryšio įrašyta treniruotė į duomenų bazę, o kartu ir į Zapier, patenka tik tada, kai telefonas ją išsiunčia. Todėl laiškas ateina, kai treniruotė *išsiunčiama* (kai telefonas vėl turi ryšį ir programa atidaryta), o tai gali būti praėjus kelioms valandoms po treniruotės. Zap niekas nesikeičia: `INSERT`, webhook turinys ir visi laukai, kuriuos naudoja Zap, tokie patys kaip anksčiau. Verta žinoti tris dalykus:

- **`record__created_at` yra laikas, kada telefone paspaustas Išsaugoti** (laiško turinyje rodomas kaip *Logged at*), jei tai buvo per pastarąsias 30 dienų ir ne ateityje; kitaip tai išsiuntimo laikas. Tai vienintelis laukas, kurio prasmė nauja, ir nuo jo Zap niekas nepriklauso: Filter skaito `type` ir `record__instructor_emails`, Paths skaito `record__type`, o Gmail naudoja `record__instructor_emails`, `record__title` ir turinio laukus.
- **Gavėjai yra tie, su kuriais sportininkas dalijasi treniruotės išsiuntimo metu**, nes trigeris `instructor_emails` užpildo per tą INSERT.
- **Lygiai vienas laiškas kiekvienai treniruotei**, kad ir kiek kartų telefonas bandytų: pakartotinis siuntimas randa išsaugotą treniruotę ir nieko neįterpia, todėl nėra antro INSERT, antro webhook ir antro Zap paleidimo ([supabase.md](supabase.md#6-treniruočių-įrašymas-be-ryšio-v5)).

Ataskaitoms (Zap 2) reikia ryšio, todėl jos išsiunčiamos iškart; be ryšio įrašymas taikomas tik treniruotėms.

## Prieš pradedant

- Zapier paskyra su **aktyviu Pro bandomuoju laikotarpiu**: Webhooks by Zapier ir Paths neveikia nemokamame plane (kurso 8 skaidrė).
- Gmail paskyra, iš kurios siųsite.
- Veikianti programa (lokaliai ar Vercel) su bent vienu planu, kad galėtumėte išsiųsti pavyzdinę treniruotę.
- Naujausias [`supabase/schema.sql`](../../supabase/schema.sql), paleistas Supabase: jis prideda stulpelį `instructor_emails` ir jo trigerį (paleisti pakartotinai saugu).
- **Zapier globalus kintamasis `ERROR_EMAIL`** su adresu, į kurį turi eiti pranešimai apie klaidas (jūsų): Zap redaktorius → bet kuris *To* laukas → **+** → **Variables** → **Manage variables** → **Global** → **Create Global variable**, pavadinimas `ERROR_EMAIL`, tipas Text. Abiejų Zap klaidų tvarkyklės jį naudoja, todėl adresas laikomas vienoje vietoje. Zapier perspėja kintamuosiuose nelaikyti paslapčių; el. pašto adresas tinka.
- **Bandomasis treneris ir susietas sportininkas.** Užregistruokite *trenerį* su adresu, kurį galite skaityti (tinka Gmail alias, pvz., `you+coach@gmail.com`), tada kaip sportininkas skiltyje **Sharing** įveskite to trenerio kodą. Be šios nuorodos žemiau pateikti pavyzdžiai neturi gavėjo, ir Filter juos sustabdo.

> **Catch Hook adresas yra paslaptis.** Kas jį turi, gali priversti jūsų Zap siųsti laiškus. Jis turi būti tik Supabase webhook nustatymuose: niekada saugykloje, README, Notion ar ekrano nuotraukoje (užtemdykite).

## 1. Trigeris: Catch Hook

1. Zapier → **Create → Zaps**. Pavadinkite `Workout Log: new workout`.
2. Trigeris: **Webhooks by Zapier** → įvykis **Catch Hook** → Continue (*Pick off a child key* palikite tuščią).
3. Nukopijuokite webhook adresą (`https://hooks.zapier.com/hooks/catch/…`). Palikite kortelę atidarytą: **Test trigger** laukia pirmos užklausos.

## 2. Supabase: Database Webhook

Supabase → **Database → Webhooks** (naujesniuose skydeliuose: **Integrations → Database Webhooks**). Paprašyti paspauskite **Enable webhooks**, tada **Create a new hook**:

| Laukas | Reikšmė |
|---|---|
| Name | `workouts_to_zapier` |
| Table | `workouts` |
| Events | **Insert** ir **Update** |
| Type | HTTP Request |
| Method | `POST` |
| URL | Catch Hook adresas |
| HTTP headers | `Content-Type: application/json` (numatytasis) |

Kodėl ir **Update**: kurso 15 skaidrė sako *Insert*, bet kurso 5 testas tikisi pamatyti, kaip Filter sustabdo redagavimą, o redagavimas pasiekia Zapier tik tada, kai įjungtas Update. Filter (4 žingsnis) tokius paleidimus atmeta, todėl jie nesiunčia laiško ir nenaudoja Zapier užduočių. Tai 3-iasis atviras klausimas dėstytojui plane.

## 3. Išsiųskite pavyzdį

Programoje, kaip **susietas sportininkas**, įrašykite **Strength** treniruotę (pavyzdžiui, *Test strength*, 30 min.). Zapier paspauskite **Test trigger**. Užklausoje matysite šiuos laukus:

| Zapier laukas | Pavyzdys | Prasmė |
|---|---|---|
| `type` | `INSERT` | Duomenų bazės įvykis: INSERT arba UPDATE |
| `table` | `workouts` | |
| `record__title` | `Test strength` | |
| `record__type` | `strength` | Maršrutizavimo laukas: `strength` arba `other` |
| `record__duration_min` | `30` | |
| `record__activity` | `run` | Tik kardio; gali būti tuščias |
| `record__distance_km` | `5` | Tik kardio; gali būti tuščias |
| `record__notes` | `Felt easy` | Gali būti tuščias |
| `record__sets_summary` | `Squat: 2 × 5 @ 100 kg; Pull-up: 3 × 8 (bodyweight)` | Jėgos treniruotėms su serijomis; kitaip tuščias |
| `record__instructor_emails` | `you+coach@gmail.com` | Sportininko treneriai, atskirti kableliais: **Gmail *To***. Tuščias, jei sportininkas nesidalija su niekuo |
| `record__user_id` | `3f6c…` | Kas įrašė |
| `record__plan_id` | `9a1e…` | |
| `record__created_at` | `2026-11-11T18:00:00.123+00:00` | Kada treniruotė įrašyta: be ryšio įrašytos treniruotės atveju – laikas, kada paspaustas Išsaugoti (per 30 dienų), o ne išsiuntimo laikas |
| `old_record…` | (tuščia) | Užpildoma tik UPDATE atveju |

Pačios serijos laikomos savo lentelėje (`workout_sets`), kurios webhook nestebi. Kad laiške jas vis tiek būtų galima išvardyti, `log_workout()` į įrašomą treniruotės eilutę taip pat įrašo vienos eilutės santrauką: `record__sets_summary`. Jei jūsų Zap buvo nustatytas dar prieš atsirandant šiam laukui, įrašykite jėgos treniruotę su serijomis ir dar kartą paspauskite **Test trigger**, kad Zapier išmoktų naują lauką. Tas pats galioja `record__instructor_emails`: žr. [Jau publikuotų Zap atnaujinimas](#jau-publikuotų-zap-atnaujinimas).

> **Atsargiai:** `type` (INSERT / UPDATE) ir `record__type` (strength / other) yra skirtingi laukai. Filter naudoja `type`, Paths – `record__type`. Jų sumaišymas yra labiausiai tikėtina pirmoji klaida; jei taip nutiks, įrašykite ją į Notion klaidų žurnalą.

## Greičiau: 4–6 žingsnius sukurkite su Zapier Copilot

Zapier Copilot – DI asistentas Zap redaktoriuje – pagal aprašymą gali pridėti Filter, Paths ir Gmail žingsnius. Arba atlikite 4–6 žingsnius rankomis, arba įklijuokite žemiau esančias užklausas ir tada **patikrinkite rezultatą pagal 4–6 žingsnius**. Copilot gali pasirinkti netinkamą lauką, o `type` ir `record__type` – klasikinis sumaišymas.

Prieš pateikdami užklausą:

- **Plėskite jau turimą Zap.** Atidarykite jį ir užklausą pateikite ten. Jei Copilot sukuria *naują* Zap, jis sukuria ir naują Catch Hook su **nauju adresu**, o Supabase webhook (`workouts_to_zapier`) toliau siunčia į seną. Jei taip nutiko, naują adresą įrašykite į webhook (Supabase → Database Webhooks → edit).
- **Pirmiausia išsiųskite pavyzdį** (3 žingsnis), kad Copilot matytų tikrus laukų pavadinimus.
- `<your email>`, `<your name>` ir `<date>` pakeiskite **tik Zapier**, niekada šioje saugykloje. Trenerio adreso įrašyti nereikia: gavėjai ateina iš duomenų.
- Copilot numatytasis *Auto-build* iš karto sudaro kuo daugiau; perjunkite į *Ask as you build*, kad patvirtintumėte kiekvieną žingsnį.

Užklausos paliktos angliškos, nes taip Copilot veikia geriausiai, o laiškų temos angliškos.

**1 užklausa: Filter, Paths ir abu laiškai** (sąmoningai vienas sakinys: Zapier pataria sujungti susijusias instrukcijas, kad Copilot jas laikytų viena užduotimi)

```text
This Zap's trigger is a Webhooks by Zapier Catch Hook that receives Supabase Database Webhook events for the "workouts" table, where the top-level field "type" is INSERT or UPDATE and the row is under "record" (Record Title = record__title, Record Type = record__type, plus record__duration_min, record__user_id, record__instructor_emails and record__created_at); keep this trigger and after it add a Filter by Zapier step that only continues when BOTH the top-level "type" field exactly matches INSERT (not record__type) AND record__instructor_emails exists, then add Paths by Zapier with two branches: path A named "Strength", whose rule is that record__type exactly matches strength (lowercase) and which uses Gmail to send an email to record__instructor_emails with the subject "STRENGTH: " followed by record__title, and a second branch set as the Fallback path, which runs whenever path A does not match and uses Gmail to send an email to record__instructor_emails with the subject "New workout: " followed by record__title; in both emails the body lists the title, type, duration in minutes, the sets (record__sets_summary), user id and created-at time from the record.
```

**2 užklausa: klaidų tvarkyklės** (kurso 18 skaidrė)

```text
For each of the two Gmail "Send Email" steps, add an error handler that uses Gmail to send an email to the global variable ERROR_EMAIL (pick it from Variables, do not type an address) with the subject "Workout Log Zap failed" and the error message in the body, so that a failed send shows up as a handled error in Zap history.
```

Jei Copilot negali pridėti klaidų tvarkyklių, pridėkite jas rankomis (6 žingsnis).

**3 užklausa: pavadinimas ir savininkas** (kurso 18 skaidrė)

```text
Rename this Zap to "Workout Log: new workout" and set its description to "Owner: <your name>, <your email>, <date>. Emails the instructor about every new workout in Workout Log."
```

Jei Copilot šito negali pakeisti, nustatykite Zap nustatymuose.

**4 užklausa: pridėkite serijas į jau sukurtą Zap**

```text
In both Gmail "Send Email" steps, add a line to the body that reads "Sets: " followed by record__sets_summary (Record Sets Summary), right after the duration line.
```

**5 užklausa: siųskite paties sportininko treneriams, jau sukurtame Zap** (žr. [Atnaujinimas](#jau-publikuotų-zap-atnaujinimas))

```text
In the Filter step, keep the rule "type (Text) exactly matches INSERT" and add a second rule joined with AND: "record__instructor_emails (Record Instructor Emails) exists". Then, in both Gmail "Send Email" steps, replace the To field with the record__instructor_emails field (Record Instructor Emails) instead of a typed address.
```

**Jei patikra randa klaidą**, šios taisomosios užklausos skirtos dažniausioms:

```text
The Filter must use the top-level "type" field (INSERT or UPDATE), not record__type: change its rule to "type (Text) exactly matches INSERT".
```

```text
Path A must use record__type, not the top-level "type" field: change its rule to "record__type (Text) exactly matches strength", in lowercase.
```

```text
Make the second branch of the Paths step the Fallback path, so that it runs whenever path A's rule does not match.
```

**Patikrinkite, ką sukūrė Copilot**, tada publikuokite ir paleiskite 7 žingsnio testus:

| Žingsnis | Turi būti |
|---|---|
| Filter | aukščiausio lygio `Type` tiksliai atitinka `INSERT` **ir** `Record Instructor Emails` egzistuoja |
| Kelias A „Strength“ | `Record Type` tiksliai atitinka `strength` → Gmail, tema `STRENGTH: ` + `Record Title` |
| Fallback | nustatytas kaip *Fallback* šaka → Gmail, tema `New workout: ` + `Record Title` |
| Gmail *To* | laukas `Record Instructor Emails` (ne įvestas adresas) abiejuose keliuose |
| Klaidų tvarkyklės | abiejuose Gmail žingsniuose (6 žingsnis), *To* = kintamasis `ERROR_EMAIL` |

## 4. Filter: tik naujos treniruotės

Pridėkite **Filter by Zapier**: *Only continue if…*

| | Taisyklė |
|---|---|
| 1 | `Type` (aukščiausio lygio laukas, **ne** `Record Type`) **(Text) Exactly matches** `INSERT` |
| **AND** 2 | `Record Instructor Emails` **(Text) Exists** |

2 taisyklė sustabdo sportininko, kuris nesidalija su niekuo, treniruotes: nėra ko informuoti, o be šios taisyklės Gmail nepavyktų dėl tuščio *To*.

## 5. Paths ir Gmail

Pridėkite **Paths by Zapier** su dviem šakomis:

| Šaka | Taisyklė | Veiksmas |
|---|---|---|
| **A: Strength** | `Record Type` (Text) Exactly matches `strength` | Gmail → **Send Email** |
| **Fallback** | Nustatyta kaip *Fallback* šaka: veikia, kai kelias A neatitinka | Gmail → **Send Email** |

Gmail laukai (kurso 16 skaidrė):

| Laukas | Kelias A | Fallback |
|---|---|---|
| To | `Record Instructor Emails` | tas pats |
| Subject | `STRENGTH: ` + `Record Title` | `New workout: ` + `Record Title` |
| Body | žemiau esantis tekstas | tas pats |

```
A new workout was logged in Workout Log.

Title: {{Record Title}}
Type: {{Record Type}}
Duration: {{Record Duration Min}} min
Sets: {{Record Sets Summary}}
User id: {{Record User Id}}
Logged at: {{Record Created At}}
```

(Laukus įterpkite su Zapier laukų parinkikliu; riestiniuose skliaustuose esantys pavadinimai yra tokie, kokie jie ten rodomi. Laukui *To* iš parinkiklio pasirinkite `Record Instructor Emails` ir daugiau nieko neįrašykite. Keli treneriai ateina kaip viena kableliais atskirta reikšmė, kurią Gmail priima.)

Kodėl Fallback siunčia laišką: kurso 16 skaidrė fallback šakoje laiško nerodo, bet kurso 2 testas tikisi „New workout: …“, kai `type = other`. Šis nustatymas jį siunčia (2-asis atviras klausimas plane).

## 6. Patikimumas (kurso 18 skaidrė)

- **Klaidų tvarkyklė**: kiekviename Gmail žingsnyje atidarykite **⋯** meniu → **Add error handler**. Klaidos šakoje pridėkite Gmail → Send Email **sau**: *To* = globalus kintamasis `ERROR_EMAIL` (duomenų parinkiklis → **Variables** → **Global**), tema `Workout Log Zap failed`, turinys = klaidos pranešimo laukas, kurį pateikia tvarkyklė.
- **Savininkas**: Zap nustatymai → **Description**: `Owner: <your name>, <your email>, <date>. Emails the instructor about every new workout in Workout Log.`
- **Publikuokite** Zap (įjunkite).

## 7. Testai

| Nr. | Ką daryti | Tikimasi |
|---|---|---|
| 2 | Įrašykite treniruotę, kurios tipas **Kita** | 1 nauja eilutė `workouts`; Zap istorijoje rodomas **Fallback** kelias; ateina laiškas *New workout: …* |
| 3 | Įrašykite **Jėgos** treniruotę | Zap istorijoje rodomas **kelias A**; ateina laiškas *STRENGTH: …* |
| 5 | **Mano planai → Redaguoti pavadinimą** treniruotei | Zap istorijoje matyti, kad vykdymą **sustabdė Filter**; laiško nėra |
| Klaidos testas | Kelio A Gmail žingsnyje lauką `Record Instructor Emails` laukelyje *To* pakeiskite bloga reikšme (pvz., `not-an-address`), įrašykite jėgos treniruotę | Zap istorijoje rodoma **Handled error**; klaidos laiškas pasiekia jus. Tada grąžinkite lauką `Record Instructor Emails` |
| Gavėjas 1 | Įrašykite treniruotę kaip sportininkas, susietas su treneriu X | Laiškas ateina X ir niekam kitam |
| Gavėjas 2 | Susiekite sportininką su antru treneriu Y ir įrašykite treniruotę | Vienas laiškas, adresuotas X ir Y |
| Gavėjas 3 | **Sharing → Stop sharing** su visais, tada įrašykite treniruotę | Zap istorijoje matyti, kad vykdymą **sustabdė Filter**; laiško ir užduoties nėra |
| Be ryšio (v5) | Veikiančioje svetainėje arba su `npm run preview` DevTools → Network nustatykite **Offline**, įrašykite treniruotę, palaukite minutę, tada tinklą grąžinkite į **No throttling** | Kol nėra ryšio, Zap nepaleidžiamas. Kai treniruotė išsiunčiama – **vienas** paleidimas ir vienas laiškas; *Logged at* rodo laiką, kada paspaustas Išsaugoti ([pwa.md](pwa.md#7-bandymas-be-ryšio)) |

Pateikimo ekrano nuotraukos (kontrolinio sąrašo 4 punktas): Zap redaktorius, rodantis Paths, ir Zap istorija 2 ir 3 testams.

## 8. Kaina (kurso 18 skaidrė)

| Per mėnesį | Zap paleidimai | Užduotys (tasks) |
|---|---|---|
| 50 naujų treniruočių (sportininkai susieti) | 50 | **50**: po vieną Gmail veiksmą, nesvarbu, kiek trenerių yra *To* |
| Pavadinimų redagavimai | sustabdo Filter | 0 |
| Sportininkų, kurie nesidalija su niekuo, treniruotės | sustabdo Filter | 0 |
| Nepavykę siuntimai | klaidos tvarkyklės laiškas | 1 už kiekvieną nesėkmę (pats nepavykęs žingsnis skaičiuojamas kaip 0) |

Užduotimis skaičiuojami tik sėkmingi veiksmų žingsniai. Trigeris, Filter ir Paths žingsniai neskaičiuojami, o paleidimas, kurį sustabdo Filter, nenaudoja nė vienos ([Zapier: Tasks in Zapier](https://help.zapier.com/hc/en-us/articles/8496196837261)). Palyginkite skaičių su kurso 23 ir 26 temų taisyklėmis ir įrašykite jį į Notion kartu su planu, kuriame esate (Pro bandomasis / Professional), ir to plano mėnesio užduočių limitu.

## 9. Sutvarkymas po pateikimo

1. **Išjunkite** Zap.
2. Supabase → Database Webhooks → ištrinkite `workouts_to_zapier`.
3. Supabase → **Authentication → Users** → ištrinkite bandomuosius naudotojus. Jų planai ir treniruotės ištrinami kartu (`on delete cascade`).

## Zap 2: pažangos ataskaitos (išplėstinė)

Kai sportininkas Pažangos ekrane paspaudžia **Siųsti ataskaitą treneriui**, duomenų bazės funkcija `send_report()` išsaugo `reports` eilutę: paties sportininko skaičius už pastarąsias 7 dienų, ne daugiau kaip vieną ataskaitą per 5 minutes. Antrasis Database Webhook siunčia tą eilutę į Zap 2, kuris el. paštu praneša sportininko treneriams. Kaip ir Zap 1, jų adresus į eilutę (`record__instructor_emails`) įrašo trigeris; Zapier jokio trenerio adreso nelaikoma.

1. **Trigeris:** Zapier → **Create → Zaps**, pavadinkite `Workout Log: progress report`. Trigeris: **Webhooks by Zapier → Catch Hook**; nukopijuokite adresą (paslaptis, kaip ir Zap 1).
2. **Supabase:** **Database Webhooks → Create a new hook**. Name `reports_to_zapier`, table `reports`, events tik **Insert** (ataskaitos niekada neredaguojamos), `POST` į Catch Hook adresą.
3. **Pavyzdys:** programoje išsiųskite ataskaitą; Zapier paspauskite **Test trigger**. Laukai:

   | Zapier laukas | Pavyzdys |
   |---|---|
   | `record__athlete_email` | `athlete@example.com` |
   | `record__instructor_emails` | `you+coach@gmail.com` (tuščias, jei sportininkas nesidalija su niekuo) |
   | `record__period_start`, `record__period_end` | `2026-11-06`, `2026-11-12` |
   | `record__summary` | `Nov 6 – Nov 12: 4 workouts (3 strength, 1 other), 215 min, 42 sets. Heaviest: Squat 110 kg.` |
   | `record__stats__workouts`, `record__stats__minutes`, `record__stats__sets`, … | skaičiai, kuriais remiasi santrauka |

4. **Filter** (iškart po trigerio): `Type` tiksliai atitinka `INSERT` **ir** `Record Instructor Emails` egzistuoja. Tada **Gmail → Send Email:** To = `Record Instructor Emails`; Subject = `Progress report: ` + `Record Athlete Email` + ` (` + `Record Period Start` + ` – ` + `Record Period End` + `)`; Body = `Record Summary`.
5. **DI santrauka (neprivalomas priedas, kurso 4 skaidrė):** prieš Gmail žingsnį pridėkite DI žingsnį (pavyzdžiui, **AI by Zapier** ar **ChatGPT**) su užklausa *„Write a short, encouraging note (3–4 sentences) for a fitness instructor about this athlete's week. Use only these numbers: {{Record Summary}}“*, o jo rezultatą laiško turinyje įdėkite virš skaičių. DI raktas lieka Zapier, niekada programoje ar saugykloje.
6. **Patikimumas:** klaidų tvarkyklė Gmail žingsnyje (*To* = kintamasis `ERROR_EMAIL`, tema `Workout Report Zap failed`), savininkas Zap aprašyme, tada **Publish**.

**Kaina:** 1 užduotis vienai ataskaitai (2 su DI žingsniu). Jei kiekvienas sportininkas siunčia ataskaitą kas savaitę, tai apie 4 užduotis per mėnesį vienam sportininkui.

**Copilot užklausa** (naujame Zap, sukūrus Catch Hook trigerį):

```text
This Zap's trigger is a Webhooks by Zapier Catch Hook that receives Supabase Database Webhook events for the "reports" table, with the row under "record" (record__athlete_email, record__period_start, record__period_end, record__summary); keep this trigger and after it add a Filter by Zapier step that only continues when the top-level "type" field exactly matches INSERT AND record__instructor_emails exists, then a Gmail "Send Email" step to record__instructor_emails with the subject "Progress report: " followed by record__athlete_email and the period from record__period_start to record__period_end, and record__summary as the body.
```

## Jau publikuotų Zap atnaujinimas

Zap, sukurti prieš atsirandant stulpeliui `instructor_emails`, siuntė į vieną fiksuotą adresą, įvestą Gmail *To*. Kad laiškai eitų kiekvieno sportininko treneriams, atlikite tai vieną kartą. **Naujo Zap nereikia, naujo Catch Hook adreso nereikia, o Supabase webhook nekeičiami.**

**0. Sukurkite `ERROR_EMAIL` (vieną kartą).** Žr. *Prieš pradedant*. Vienas globalus kintamasis aptarnauja visas tris klaidų tvarkykles, todėl pakeisti, kur eina pranešimai, reikia vienos vietos (**Manage variables → Global**), o ne trijų.

**1. Duomenų bazė (vieną kartą).** Supabase → SQL Editor: paleiskite bloką *Who gets the email* [`supabase/schema.sql`](../../supabase/schema.sql) gale (arba visą failą; pakartotinai paleisti saugu). Pasirinktinai paleiskite [`supabase/tests/instructor_emails.test.sql`](../../supabase/tests/instructor_emails.test.sql): jis turi baigtis *TESTS PASSED*.

**2. Išmokykite Zapier naujo lauko.** Kaip susietas sportininkas įrašykite treniruotę (Zap 1) ir išsiųskite ataskaitą (Zap 2). Kiekviename Zap atidarykite trigerį → **Test** → **Find new records**, kad pavyzdyje atsirastų `Record Instructor Emails`. Be to laukas laukų parinkiklyje nerodomas.

**3. Pakeiskite Zap.**

| Zap | Žingsnis | Pakeitimas |
|---|---|---|
| **Zap 1** `Workout Log: new workout` | Filter | Palikite `Type` exactly matches `INSERT`; **pridėkite** AND taisyklę: `Record Instructor Emails` **Exists** |
| | Kelias A „Strength“ → Gmail | *To*: ištrinkite įvestą adresą, įterpkite lauką `Record Instructor Emails` |
| | Fallback → Gmail | Tas pats *To* pakeitimas |
| | Klaidų tvarkyklės (6 ir 9 žingsniai) | *To*: ištrinkite įvestą adresą, įterpkite globalų kintamąjį `ERROR_EMAIL` (duomenų parinkiklis → **Variables** → **Global**) |
| **Zap 2** `Workout Log: progress report` | Filter | **Pridėkite** Filter po trigerio: `Type` exactly matches `INSERT` **ir** `Record Instructor Emails` **Exists** (ataskaitų webhook yra tik Insert, bet laukas turi egzistuoti) |
| | Gmail | *To*: ištrinkite įvestą adresą, įterpkite `Record Instructor Emails` |
| | Klaidų tvarkyklė (4 žingsnis) | *To*: ištrinkite įvestą adresą, įterpkite globalų kintamąjį `ERROR_EMAIL` |
| | DI žingsnis | Nekeičiama |

Copilot Zap 1 ir Zap 2 pakeitimus gali atlikti pagal **5 užklausą** ir aukščiau esančią Zap 2 užklausą; rezultatą patikrinkite pagal 4–5 žingsnių lenteles. Abu Zap publikuokite iš naujo.

**4. Patikra.** Paleiskite 7 žingsnio testus *Gavėjas 1–3* ir ataskaitos testą: laiškas turi ateiti treneriui, su kuriuo sportininkas susietas, ir niekam kitam.

**Ką žinoti.**

- Sprendžia **naujo** webhook turinys: gavėjai yra tie, su kuriais sportininkas dalijosi *tada, kai treniruotė pasiekė duomenų bazę (be ryšio įrašytos – kai buvo išsiųsta), arba ataskaitos išsiuntimo metu*. Vėliau susiejus senos treniruotės iš naujo nesiunčiamos.
- Sportininkas, kuris nesidalija su niekuo, laiško daugiau **negauna** (anksčiau jis eidavo fiksuotu adresu). Taip ir numatyta: dalijimasis yra sportininko pasirinkimas.
- Su keliais treneriais vienas laiškas eina visiems (jie mato vienas kito adresus). Viena Gmail užduotis, o ne po vieną kiekvienam treneriui.
- Abiejų demonstracinių trenerių adresai baigiasi `@example.com`, todėl laiškai jiems grįžta. Norėdami pamatyti tikrą pristatymą, užregistruokite trenerį su adresu, kurį galite skaityti, ir skiltyje **Sharing** susiekite su juo demonstracinį sportininką.

## Trikčių šalinimas

| Simptomas | Priežastis | Sprendimas |
|---|---|---|
| Kiekvienas paleidimas sustoja ties Filter, nors tipas INSERT | `record__instructor_emails` tuščias: sportininkas nesusietas su treneriu arba `schema.sql` nebuvo paleistas iš naujo ir stulpelis niekada neužpildomas | Susiekite sportininką skiltyje **Sharing**; Supabase: `select instructor_emails from workouts order by created_at desc limit 5;` |
| `Record Instructor Emails` nėra laukų parinkiklyje | Zapier pavyzdys senesnis už stulpelį | Įrašykite treniruotę kaip susietas sportininkas ir dar kartą paspauskite **Test trigger** |
| Laiškas eina senu fiksuotu adresu | *To* vis dar turi įvestą adresą | Pakeiskite jį lauku `Record Instructor Emails` (5 žingsnis) |
| Gmail nepavyksta su *Invalid To header* | Trenerio paskyros el. paštas netinkamas arba laukas įvestas kaip tekstas, o ne pasirinktas | Pasirinkite lauką iš naujo; patikrinkite `profiles.email` |
| Zapier nieko negauna | Webhook ne ant tos lentelės ar įvykio, neteisingas adresas arba Zap išjungtas | Patikrinkite webhook Supabase. Norėdami pamatyti, ką išsiuntė Supabase, SQL Editor paleiskite `select status_code, content, created from net._http_response order by created desc limit 10;` (saugoma kelias valandas) |
| Kiekvienas paleidimas sustoja ties Filter | Filter naudoja `Record Type` vietoj aukščiausio lygio `Type` | 4 žingsnis |
| Jėgos treniruotės patenka į Fallback | Kelias A naudoja `Type` vietoj `Record Type` arba lygina su `Strength` (programa siunčia mažosiomis `strength`) | 5 žingsnis |
| Du laiškai už vieną treniruotę | Nėra Filter, todėl redagavimas (UPDATE) taip pat siunčia laišką | 4 žingsnis |
| Laiškas neateina | Prijungta netinkama Gmail paskyra, laiškas Spam aplanke arba Zap išjungtas | Pirmiausia patikrinkite Zap istoriją, tada Gmail ryšį |
| Laiškas apie treniruotę ateina praėjus kelioms valandoms po jos | Ji buvo įrašyta be ryšio ir išsiųsta vėliau | Taip ir numatyta: laiškas išeina, kai telefonas išsiunčia treniruotę. *Logged at* rodo, kada paspaustas Išsaugoti. Treniruotė, programoje vis dar pažymėta *Laukia išsiuntimo*, dar neišsiųsta |

## Susiję

[supabase.md](supabase.md) (webhook, `instructor_emails` ir išsaugojimas lygiai vieną kartą [6 skyriuje](supabase.md#6-treniruočių-įrašymas-be-ryšio-v5)) · [pwa.md](pwa.md) (įrašymas be ryšio ir siuntimas vėliau) · [architecture.md](architecture.md#4-duomenų-srautai) (kaip treniruotė tampa laišku) · [deployment.md](deployment.md) (Vercel) · [setup.md](setup.md) (vietinis paruošimas)
