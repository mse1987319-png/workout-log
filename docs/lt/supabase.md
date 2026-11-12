# Supabase nustatymas

*[English](../supabase.md) · Lietuviškai*

Ką spustelėti Supabase skydelyje, kad programa veiktų: lentelės ir Row Level Security, registracijos nustatymai ir nukreipimo adresai. Apie 10 minučių. Tikslūs meniu pavadinimai skirtingose skydelio versijose keičiasi; žemiau pateikti artimiausi dabartiniai.

Database Webhook į Zapier yra atskiras 3 paskaitos žingsnis: [zapier.md](zapier.md).

## 1. Lentelės ir politikos

1. Supabase → jūsų projektas → **SQL Editor** → **New query**.
2. Įklijuokite visą [`supabase/schema.sql`](../../supabase/schema.sql) ir paspauskite **Run**.
   Tikimasi: `Success. No rows returned`. Vėliau paleisti dar kartą saugu.
3. **Demonstraciniai duomenys** (rekomenduojama naujam projektui): **New query** → įklijuokite visą [`supabase/seed.sql`](../../supabase/seed.sql) → **Run**.
   - **Ką prideda:** tuščiame projekte – tris demonstracines paskyras iš [README](../../README.lt.md#demonstracinės-paskyros) (slaptažodis `WorkoutLog-demo-2026`). Jos ateina su planais, treniruotėmis ir serijomis, tikslais, pažangos ataskaita ir dalijimusi su treneriu.
   - **Datos:** jos skaičiuojamos atgal nuo šiandienos, todėl diagramos ir pasiūlymai atrodo šiuolaikiški.
   - **Saugu paleisti pakartotinai:** jei projekte jau yra naudotojų, nieko nekeičia.
   - **Jokių laiškų:** jei Zapier webhook jau yra, vykdant jį jie išjungiami.
4. Patikrinkite:
   - **Table Editor** išvardija `plans`, `workouts`, `workout_sets`, `reports`, `goals`, `profiles`, `instructor_links` ir `plan_assignments`.
   - **Authentication → Policies** (arba **Database → Policies**) rodo RLS **įjungtą** visose aštuoniose lentelėse su šiomis politikomis:

     | Lentelė | Politikos |
     |---|---|
     | `plans` | Read own plans · Add own plans · Edit own plans · Delete own plans · *Read plans assigned to me* |
     | `workouts` | Read own workouts · Add workouts to own plans · Edit own workouts · Delete own workouts · *Add workouts to assigned plans* · *Edit own workouts on assigned plans* |
     | `workout_sets` | Read own sets · Add sets to own workouts · Edit own sets · Delete own sets |
     | `reports` | Read own reports (rašymo politikos nėra: rašo tik `send_report()`) |
     | `goals` | Read own goals · Add own goals · Edit own goals · Delete own goals |
     | `profiles` | Read own profile (rašymo politikos nėra: jį registracijos metu sukuria trigeris) |
     | `instructor_links` | Read own links · End own links (insert politikos nėra: ryšį sukuria tik `link_instructor()`) |
     | `plan_assignments` | Read own assignments · Assign own plans to own athletes · Unassign own assignments |

     *Kursyvu* pažymėtos papildančios dalijimosi politikos (žr. **Dalijimasis su treneriu** žemiau). Politikų pavadinimai paliekami angliški, tokie, kokie yra duomenų bazėje.

5. Dabar padarykite pateikimo ekrano nuotraukas (kontrolinio sąrašo 3 punktas): Table Editor su abiem lentelėmis ir Policies puslapį.

Trumpai, ką daro schema:

| | `plans` (A lentelė) | `workouts` (B lentelė) | `workout_sets` (išplėstinė) |
|---|---|---|---|
| Pagrindiniai laukai | `name`, `goal` | `plan_id → plans.id`, `title`, `type`, `duration_min`; neprivalomi `activity`, `distance_km`, `notes`, `sets_summary` | `workout_id → workouts.id`, `exercise`, `set_no`, `reps`, `weight_kg` |
| `user_id` | `default auth.uid()`; programa jo niekada nesiunčia | tas pats | tas pats |
| Patikros | name 1–100 simbolių | `type` yra `strength` arba `other`; trukmė 1–1440 min; `activity` yra run/bike/swim/walk/row/other | reps 1–1000; svoris 0–1000 kg (0 = savo svoris); iki 100 serijų treniruotėje |
| RLS | `user_id = auth.uid()` select, insert, update, delete | tas pats, o treniruotę galima priskirti tik vienam iš savo planų | tas pats, o serijas galima pridėti tik prie savo treniruočių |

Programa treniruotę išsaugo duomenų bazės funkcija **`log_workout()`**: treniruotė ir jos serijos vienoje transakcijoje, kaip prisijungęs naudotojas (todėl taikomos visos aukščiau esančios politikos). `INSERT` į `workouts` vis dar vieną kartą vienai treniruotei paleidžia Database Webhook; jei kas nors nepavyksta, nieko neišsaugoma ir nieko nesiunčiama. Kadangi webhook mato tik treniruotės eilutę, `log_workout()` į ją taip pat įrašo vienos eilutės serijų santrauką (`sets_summary`, sudaro **`format_sets()`**), kad trenerio laiške jas būtų galima išvardyti.

[`supabase/tests/sets_summary.test.sql`](../../supabase/tests/sets_summary.test.sql) testuoja abi funkcijas. Įklijuokite jį į SQL Editor ir paleiskite: jis visada baigiasi klaida, kuri viską atšaukia, o viskam gerai – parašo *TESTS PASSED (…)*, todėl niekada neišsaugo treniruotės ir nesiunčia laiško.

**Pažangos ataskaitos.** **`report_stats(days)`** grąžina kvietėjo skaičius už pastarąsias 7 kalendorines dienas su vienos eilutės santrauka (programos peržiūra). **`send_report()`** yra vienintelis būdas sukurti `reports` eilutę: ji išsaugo paties kvietėjo skaičius ir el. paštą, ne dažniau kaip kartą per 5 minutes, o `INSERT` paleidžia antrąjį Database Webhook (`reports_to_zapier`, Zap 2 faile [zapier.md](zapier.md#zap-2-pažangos-ataskaitos-išplėstinė)). [`supabase/tests/reports.test.sql`](../../supabase/tests/reports.test.sql) testuoja abi tokiu pačiu atšaukiamu būdu.

**Kas gauna laiškus.** `workouts` ir `reports` turi stulpelį `instructor_emails`: kiekvieno trenerio, su kuriuo sportininkas dalijasi, el. paštai (atskirti kableliais) arba tuščia, jei trenerio nėra. Trigeris `set_instructor_emails()` užpildo jį kiekvieno INSERT metu, prieš paleidžiant webhook, todėl Zap Gmail *To* yra tiesiog šis laukas, o Zapier jokio trenerio adreso nelaikoma. Stulpelio negalima nustatyti iš programos (trigeris jį perrašo), o redagavimas palieka pradinę reikšmę. [`supabase/tests/instructor_emails.test.sql`](../../supabase/tests/instructor_emails.test.sql) tai testuoja tokiu pačiu atšaukiamu būdu. Esamus Zap reikia šiek tiek pakeisti: [zapier.md](zapier.md#jau-publikuotų-zap-atnaujinimas).

**Tikslai.** `goals` laiko pratimą, tikslinį svorį (`target_kg`, daugiau nei 0 ir iki 1000) ir datą (`target_date`) su tomis pačiomis keturiomis tik savininko politikomis kaip `plans`. Ar tikslas pasiektas ar pavėluotas, programa apskaičiuoja iš `workout_sets`, todėl nereikia prižiūrėti jokio stulpelio. Pažangos ekrano pasiūlymai taip pat skaičiuojami naršyklėje iš tų pačių duomenų. [`supabase/tests/goals.test.sql`](../../supabase/tests/goals.test.sql) tokiu pačiu atšaukiamu būdu testuoja politikas ir patikras.

**Dalijimasis su treneriu.** Vaidmenys ir ryšiai veikia taip:
- **Vaidmenys.** Kiekvienas naudotojas turi **profilį** su registracijos formoje pasirinktu vaidmeniu (`athlete` arba `instructor`). Jį sukuria trigeris `on_auth_user_created`; anksčiau užsiregistravę naudotojai tapo sportininkais. Treneriai gauna 6 simbolių **kvietimo kodą**.
- **Susiejimas.** Sportininkas dalijasi įvesdamas tą kodą (`link_instructor()`), o ryšį bet kuri pusė gali nutraukti.

Ką gali skaityti susietas treneris:
- **Tik per dvi funkcijas.** `my_athletes()` ir `athlete_progress()` yra `security definer` funkcijos, kurios pirmiausia patikrina ryšį su `is_my_athlete()`.
- **Lentelės nepakeistos.** `workouts`, `workout_sets`, `goals` ir `reports` išlaiko savo politikas *tik savo eilutės*, todėl paties trenerio ekranuose niekada nesimaišo sportininkų eilutės. Taisyklė „RLS, o ne filtrai React“ galioja toliau.
- **Vienintelis išplėtimas – papildomas.** Treneris savo planą priskiria su juo besidalijantiems sportininkams (`plan_assignments`). Tada sportininkas gali tą planą skaityti ir pagal jį registruoti savo treniruotes. Aukščiau aprašytos savininko politikos nepaliestos, nes leidžiamosios politikos jungiamos per OR.

[`supabase/tests/sharing.test.sql`](../../supabase/tests/sharing.test.sql) patikrina viską šią, atšaukiamai. Jis transakcijos viduje sukuria bandomąjį trenerį.

Norėdami **esamą** paskyrą paversti trenerio (vaidmuo paprastai pasirenkamas registruojantis), SQL Editor paleiskite tai su jos el. paštu:

```sql
update public.profiles set role = 'instructor', invite_code = public.new_invite_code()
where email = 'coach@example.com';
-- programos meniu vaidmenį skaito iš naudotojo metaduomenų:
update auth.users set raw_user_meta_data = raw_user_meta_data || '{"role": "instructor"}'
where email = 'coach@example.com';
```

## 2. Registracija be el. pašto patvirtinimo

**Authentication → Sign In / Providers** (senesniuose skydeliuose: **Providers → Email**):

- **Email** tiekėjas: įjungtas.
- **Confirm email**: **išjungtas**.

Kodėl: įtaisytasis Supabase siuntėjas pristato tik jūsų Supabase organizacijos nariams, maždaug 2 laiškus per valandą. Bet kuris kitas bandomasis naudotojas (kurso 1 ir 4 testai, inkognito testas) niekada negautų patvirtinimo nuorodos ir negalėtų prisijungti.

Kompromisas: kiekvienas gali užsiregistruoti su adresu, kurio neturi. Kurso demonstracijai tai tinka. Norėdami palikti patvirtinimą įjungtą, nustatykite savo SMTP serverį skiltyje **Authentication → Emails → SMTP Settings**. Programa abu nustatymus jau palaiko: įjungus patvirtinimą, registracija rodo „Patikrinkite savo el. paštą…“.

Mažiausias slaptažodžio ilgis lieka Supabase numatytasis, 6; programa prieš siųsdama tikrina tą pačią taisyklę.

## 3. URL nustatymai

**Authentication → URL Configuration**:

| Nustatymas | Dabar (lokaliai) | Po diegimo (3 paskaita) |
|---|---|---|
| Site URL | `http://localhost:5173` | jūsų Vercel adresas, pvz., `https://workout-log.vercel.app` |
| Redirect URLs | `http://localhost:5173/**` | pridėkite `https://<jūsų-programa>.vercel.app/**` |

Tai svarbu nuorodoms Supabase laiškuose (slaptažodžio atstatymas arba patvirtinimas, jei jį vėl įjungsite). Be Vercel įrašų tos nuorodos nukreipia naudotojus į localhost (kurso 20 skaidrė).

## 4. Programos prijungimas

Dvi reikšmes įrašykite į `.env.local` (žr. [setup.md](setup.md#aplinkos-kintamieji)):

| Kintamasis | Kur Supabase |
|---|---|
| `VITE_SUPABASE_URL` | **Project Settings → Data API** (Project URL) |
| `VITE_SUPABASE_ANON_KEY` | **Project Settings → API Keys**: *publishable* raktas (senesniuose projektuose – `anon` raktas) |

Pakeitę `.env.local`, paleiskite `npm run dev` iš naujo.

## 5. Patikra (kurso 1 ir 4 testai)

1. Atidarykite `http://localhost:5173`, pasirinkite **Susikurti paskyrą** ir užsiregistruokite kaip naudotojas A.
   Tikimasi: patenkate į **Mano planai** su užrašu *Planų dar nėra – sukurkite pirmąjį planą.* (Tuščia būsena). **Authentication → Users** išvardija naudotoją A. *(1 testas)*
2. **Mano planai → Naujas planas** → sukurkite planą, tada jo kortelėje paspauskite **+ Įrašyti treniruotę** → įrašykite treniruotę.
   Tikimasi: *Treniruotė išsaugota*. Table Editor abi naujos eilutės `user_id` stulpelyje turi naudotojo A id.
3. **Atsijunkite**. Privačiame / inkognito lange užsiregistruokite kaip naudotojas B.
   Tikimasi: naudotojas B mato Tuščią būseną be nieko iš naudotojo A. *(4 testas: RLS veikia)*
4. Table Editor rodo visų eilutes. Taip ir turi būti: skydelis veikia kaip administratorius ir apeina RLS. Programa to niekada nedaro.

## Trikčių šalinimas

| Simptomas | Priežastis | Sprendimas |
|---|---|---|
| `Could not find the table 'public.plans' in the schema cache` | `schema.sql` nebuvo paleista arba paleista kitame projekte | Paleiskite ją projekte, į kurį rodo jūsų `.env.local` |
| Sąrašas tuščias, nors eilučių yra | Eilutės priklauso kitam naudotojui (RLS) arba `user_id` tuščias | Palyginkite `user_id` Table Editor su naudotojo id skiltyje **Authentication → Users** |
| „Neturite teisės to daryti.“ saugant | Trūksta insert politikos | Paleiskite `schema.sql` dar kartą |
| Registracija rodo „Patikrinkite savo el. paštą…“ | **Confirm email** vis dar įjungtas | 2 žingsnis |
| „Per daug bandymų. Palaukite kelias minutes…“ | Supabase autentifikacijos užklausų riba | Palaukite arba išjunkite **Confirm email** (2 žingsnis) |
| „Nepavyksta pasiekti serverio…“ po ~7 s | Neteisingas `VITE_SUPABASE_URL` arba nėra ryšio. Klientas prieš rodydamas klaidą bando 3 kartus | Pataisykite `.env.local`, paleiskite `npm run dev` iš naujo |
| „Programėlė dar nesukonfigūruota…“ | Trūksta kintamojo arba jis vis dar vietos žymeklis | Užpildykite `.env.local`, paleiskite `npm run dev` iš naujo |
