# Telefono programėlė ir darbas be ryšio

*[English](../pwa.md) · Lietuviškai*

„Logify“ yra progresyvioji internetinė programa (PWA): ją galima įdėti į telefono pradžios ekraną, ji atsidaro per visą ekraną kaip programėlė ir veikia be ryšio. Matote savo planus, istoriją ir pažangą (treneriai – savo sportininkus) ir galite įrašyti treniruotę. Treniruotė lieka telefone ir, grįžus ryšiui, išsiunčiama kartu su trenerio laišku.

Šiame puslapyje paaiškinta, kaip veikia dalys be ryšio, kaip jas išbandyti ir kur yra ribos. Naudotojo požiūriu žr. [sportininko vadovą](../user-manual/lt/athlete.md#10-logify-naudojimas-be-ryšio); kodo sluoksnius – [architecture.md](architecture.md#6-veikimo-be-ryšio-sluoksnis).

## 1. Įdiegiama programėlė

| Dalis | Kas tai | Kur |
|---|---|---|
| Service worker | Telefone laiko pačios programos failus, todėl kiekvienas ekranas atsidaro be tinklo. Kūrimo metu jį sugeneruoja [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox, `generateSW`) | `vite.config.js` → `dist/sw.js` |
| Manifestas | Pavadinimas ir trumpas pavadinimas *Logify*, `display: standalone`, stačias ekranas, temos spalva `#0f766e`, fono spalva `#f5f6f8`, pradžios puslapis `/`. Du trumpiniai „Android“ (ilgai spaudžiama piktograma): *Įrašyti treniruotę* → `/log` ir *Pažanga* → `/progress`. Jo tekstai lietuviški, nes manifestas negali sekti kalbos jungiklio | `vite.config.js` → `dist/manifest.webmanifest` |
| Piktogramos | 64, 192 ir 512 px, 512 px „maskable“ piktograma ir 180 px „Apple touch“ piktograma, visos sukurtos iš `public/favicon.svg` ir įtrauktos į saugyklą | `public/*.png` |
| Puslapio žymės | „Apple touch“ piktograma, pavadinimas iPhone pradžios ekrane ir `viewport-fit=cover`, kad programa užpildytų ekraną aplink įpjovą. Manifesto nuorodoje yra `crossorigin="use-credentials"`, todėl Vercel peržiūros slaptažodžio apsauga jo neužblokuoja | `index.html` |
| Įdiegimo kortelė | Skiltyje **Mano planai**: „Android“ ir „Chrome“ gauna *Įdiegti* (paties naršyklės siūlymas), iPhone „Safari“ – žingsnius „Bendrinti“ → „Pridėti prie pradžios ekrano“. Paslepiama įdiegus programėlę, o paspaudus *Ne dabar* / *Supratau* – visam laikui | `src/components/InstallCard.jsx`, `src/pwa/installPrompt.js` |

Service worker laiko tik sukurtą programą: HTML, kiekvieną „JavaScript“ dalį (taip pat ir kraunamas pagal poreikį, pavyzdžiui, Pažangos), CSS ir paveikslėlius. Bet kokiu adresu jis pateikia `index.html`, todėl ir maršrutas, pavyzdžiui, `/progress`, atsidaro be ryšio. Jis **neliečia** užklausų į Supabase (jos eina į kitą kilmę ir nėra nukreipiamos); duomenys imami iš žemiau aprašytų išsaugotų duomenų.

`npm run dev` veikia be service worker, kad pasenusi talpykla nesumaišytų kūrimo. Norėdami jį pamatyti, naudokite `npm run build` ir `npm run preview` (7 skyrius).

### Atnaujinimai

Nauja versija atsisiunčiama fone ir laukia. Eilutė po antrašte parašo *Paruošta nauja Logify versija.* su **Atnaujinti**; programa niekada pati nesiperkrauna, todėl pusiau užpildyta treniruotė niekada nedingsta. Atidaryta programa kas valandą pasiteirauja, ar yra nauja versija (`UPDATE_CHECK_MS` faile `src/pwa/serviceWorker.js`). Paspaudus **Atnaujinti**, puslapis persikrauna į naują versiją; neišsaugota treniruotė grįžta iš juodraščio (4 skyrius).

## 2. Kas laikoma telefone ir kur

Visa, kas žemiau, kur nurodyta, yra atskira kiekvienam naudotojui, todėl du žmonės, naudojantys tą patį telefoną, niekada nemato vienas kito duomenų.

| Kas | Kur | Pastabos |
|---|---|---|
| Programos failai | Cache Storage (service worker) | Pakeičiami įdiegus naują versiją |
| Išsaugoti duomenys | `localStorage` · `logify.cache.v1.<naudotojo id>.<raktas>` | Paskutiniai duomenys, kuriuos įkėlė kiekvienas ekranas, su laiku. Raktai: `plans`, `planOptions`, `progress`, `workout:<id>`, `instructors`, `athletes`, `athlete:<id>`, `report` |
| Išsiuntimo laukiančios treniruotės | `localStorage` · `logify.outbox.v1.<naudotojo id>` | Žr. 4 skyrių |
| Neišsaugota treniruotės įrašymo forma | `localStorage` · `logify.draft.v1.<naudotojo id>` | Po vieną naudotojui |
| Duomenų bazės versija | `localStorage` · `logify.dbVersion` | Paskutinis `schema_version()` atsakymas, kad versija būtų žinoma be ryšio |
| Įdiegimo kortelė paslėpta | `localStorage` · `logify.installCard.dismissed` | |
| Senesnės duomenų bazės įspėjimas paslėptas | `sessionStorage` · `logify.oldDbWarning.hidden` | Tik likusiai sesijai |
| Prisijungimas | `localStorage` · `sb-…-auth-token` | Laiko supabase-js; „Logify“ jį tik skaito |
| Kalba | `localStorage` · `logify.language` | |

Išsaugotų duomenų ribos:

- Daugiausia **30** išsaugotų `workout:*` įrašų ir **30** išsaugotų `athlete:*` įrašų vienam naudotojui (paskutiniai atidaryti); seniausi šalinami pirmi.
- Jei telefono atmintis pilna, to naudotojo seniausi išsaugoti duomenys šalinami, kol telefone telpa naujas įrašas. Išsiuntimo laukiančios treniruotės ir juodraštis niekada nešalinami vietai išsaugotiems duomenims atlaisvinti.
- **Atsijungus** to naudotojo išsaugoti duomenys ir juodraštis ištrinami iš telefono. Išsiuntimo laukiančios treniruotės lieka (4 skyrius).

## 3. Išsaugotų duomenų rodymas

Kiekvienas ekranas, kuris skaito duomenis (`useLoad` faile `src/lib/useLoad.js`), pirmiausia bando tinklą ir išsaugo tai, ką gavo.

| Situacija | Ką rodo ekranas |
|---|---|
| Yra ryšys ir greita | Šviežius duomenis. Jie išsaugomi kitam kartui |
| Telefonas sako, kad ryšio nėra | Iškart išsaugotus duomenis |
| Tinklas sutrinka (nėra signalo, nutrūko) arba lėtesnis nei **4 sekundės** | Išsaugotus duomenis su eilute *Nėra ryšio: rodomi duomenys, išsaugoti {laikas}.* ir **Bandyti dar kartą**. Jei šviežiai duomenys atkeliauja vėliau, jie pakeičia išsaugotus |
| Vėl yra ryšys, o rodomi išsaugoti duomenys | Ekranas pats įkelia iš naujo ir pakeičia šviežiais (be Kraunama mirksėjimo) |
| Tikra klaida (pavyzdžiui, nėra teisės) | Klaidos būsena, kaip visada |
| Nėra ryšio ir nieko dar neišsaugota | Klaidos būsena: *Nėra ryšio, o šie duomenys šiame telefone dar neišsaugoti.* |

**Pasiruošimas.** Iškart po prisijungimo arba paleidus programą su ryšiu, programa tyliai įkelia planų parinktis ir Pažangą (treneriams – ir Mano sportininkus) ir juos išsaugo, todėl be ryšio veikia ir ekranai, kurių dar neatidarėte. `src/offline/warmUp.js`.

**„Mano planai“ ir įrašymo ekrano planų sąrašas sutampa.** Kai skiltis „Mano planai“ išsaugo savo planus (įkėlus juos, pervadinus ar ištrynus planą), iš jų išsaugomas ir treniruotės įrašymo ekrano planų sąrašas, nebent tas sąrašas išsaugotas vėliau. Kiekviena serverio gauta treniruotė pridedama po savo planu ir išsaugotoje „Mano planai“ kopijoje, net jei ši skiltis neatidaryta. Todėl be ryšio įrašymo ekranas siūlo ir po pasiruošimo sukurtą planą, o „Mano planai“ rodo iš įrašymo ekrano išsiųstą treniruotę. `src/offline/plansCache.js`.

**Užuominos įrašant.** Be ryšio pratimų pavadinimų siūlymai ir *Praėjusį kartą* imami iš išsaugotų Pažangos duomenų (`src/offline/hints.js`).

**Jokių duomenų užklausų be prisijungimo.** Po ilgo laiko be ryšio prieigos raktas būna pasibaigęs. Kol supabase-js dar neturi tinkamos sesijos (grįžus ryšiui jis gali palaukti iki minutės, kol ją atnaujins), duomenų bazės užklausas jis siųstų tik su projekto raktu, o Row Level Security atsakytų tuščiais sąrašais, kuriuos ekranas išsaugotų vietoje gerų duomenų. `src/lib/sessionGuard.js` tokią užklausą priverčia nepavykti kaip nutrūkusį ryšį, todėl ekranai išlaiko savo išsaugotus duomenis, o siuntimo eilė laukia.

### Prisijungęs išlieka be ryšio

supabase-js sesiją laiko `localStorage` ir ištrina tik tada, kai serveris ją atmeta. Be ryšio, kai prieigos raktas pasibaigęs, jis negali jo atnaujinti ir praneša „nėra sesijos“, nors sesija vis dar saugoma. `AuthProvider` tai sutvarko: kai paleidus Supabase pranešia, kad sesijos nėra, bet yra pilna išsaugota, naudojama išsaugotoji, todėl šiame telefone lieka prisijungta (`src/auth/AuthProvider.jsx`, `src/auth/storedSession.js`). Šio pranešimo nelaukiama: kai prieigos raktas pasibaigęs, supabase-js apie sesiją praneša tik tada, kai nustoja bandyti ją atnaujinti (be ryšio – maždaug po 25 s), todėl pilna išsaugota sesija naudojama iškart, jei telefonas be ryšio, o esant lėtam ryšiui – po 3 sekundžių; toliau lemia tai, ką praneša Supabase. Grįžus ryšiui, supabase-js pats atnaujina raktą; jei serveris jį atmeta, esate atjungiami ir nukreipiami į prisijungimą, kaip anksčiau. **Prisijungimui** (ir registracijai) ryšio reikia, o be ryšio prisijungimo ekranas tai pasako.

**Atsijungimas be ryšio** atjungia tik šiame telefone, nes serverio pasiekti nepavyksta; serverio sesija tiesiog baigiasi savaime. Su ryšiu atjungia visur, kaip anksčiau.

## 4. Treniruotės įrašymas be ryšio: siuntimo eilė

Siuntimo eilė (angl. outbox) yra `src/offline/outbox.js` (kas laikoma) ir `src/offline/sync.js` (kas siunčiama).

1. Paspaudus **Išsaugoti treniruotę**, telefonas sukuria treniruotės id (UUID) ir užsirašo laiką. Treniruotė pirmiausia įrašoma į eilę, tada siunčiama.
2. **Su ryšiu:** ji siunčiama iškart, laukiant daugiausia **15 sekundžių**. Jei serveris ją gavo, matote *Treniruotė išsaugota*, kaip anksčiau.
3. **Be ryšio, nėra atsakymo arba jo nėra per 15 sekundžių:** forma parašo *Išsaugota šiame telefone. Treniruotė bus išsiųsta, kai tik atsiras ryšys; tada treneris gaus ir laišką.* ir išsivalo. Skiltyje **Mano planai** treniruotė po savo planu rodoma kaip **Laukia išsiuntimo**.
4. **Bet kuri kita klaida** (pavyzdžiui, planas ištrintas arba treneris nebepriskiria jo): treniruotė nesaugoma, o forma parodo klaidą, kad ją būtų galima ištaisyti.
5. **Jei telefono atmintis pilna:** išsaugoti duomenys šalinami vietai atlaisvinti. Jei treniruotės vis tiek išsaugoti nepavyksta, forma tai pasako ir niekada nesako, kad ji išsaugota.

**Siuntimas.** Laukiančios treniruotės siunčiamos nuo seniausios, po vieną, kol programa atidaryta: paleidus programą, grįžus ryšiui, programai vėl atsidūrus ekrane, iškart po sėkmingo išsaugojimo, kas **30 sekundžių**, kol kas nors laukia, ir paspaudus **Siųsti dabar** būsenos eilutėje. Prieš kiekvieną siuntimą patikrinama, ar Supabase turi *šio naudotojo paties* sesiją; jei ne, laukiama.

| Rezultatas | Kas vyksta |
|---|---|
| Išsiųsta | Treniruotė palieka eilę ir tampa įprasta eilute |
| Nėra atsakymo, viršytas laiko limitas, HTTP 5xx, pasibaigęs ar atmestas prisijungimas (401) arba pasikartojantis id (`23505`) | **Bandoma vėliau**: lieka *Laukia išsiuntimo*, o ratas baigiamas |
| Bet kuri kita klaida | **Nepavyko išsiųsti: {priežastis}** su **Bandyti dar kartą** ir **Ištrinti** (pastarasis pirmiausia paklausia), skiltyje **Mano planai**; ratas tęsiamas su kita treniruote |

Jei treniruotės plano sąraše nebėra (ištrintas ar nebepriskirtas), treniruotė rodoma kortelėje **Išsiuntimo laukiančios treniruotės** Mano planų viršuje. Laukianti eilutė nėra nuoroda: kol neišsiųsta, jos puslapio nėra. Pažanga, pasiūlymai ir ataskaitos skaičiuoja tik tas treniruotes, kurias serveris turi.

**Atsijungimas, kai yra laukiančių treniruočių,** pirmiausia paklausia: jos lieka šiame telefone ir išsiunčiamos, kai tas naudotojas kitą kartą čia prisijungs. Kitas naudotojas, prisijungęs tame pačiame telefone, jų nei mato, nei siunčia.

**Neišsaugota forma.** Treniruotės įrašymo forma telefone išsaugoma jums rašant, todėl programos paleidimas iš naujo, atnaujinimas ar telefono uždaryta programa fone jos neprarandama. Atkurta forma parašo *Atkurta neišsaugota treniruotė.* su **Pradėti iš naujo**. Ji išvaloma, kai treniruotė išsaugoma ar paliekama telefone, ir atsijungus. Jei forma atidaroma plano mygtuku **+ Įrašyti treniruotę**, tas planas laimi prieš juodraščio planą.

### Lygiai vieną kartą

Treniruotė niekada neturi būti išsaugota du kartus, o treneris niekada neturi gauti dviejų laiškų, kad ir kiek kartų siuntimas būtų kartojamas (telefonas gali niekada nematyti serverio atsakymo). Todėl:

- programa į `log_workout()` siunčia telefone sukurtą id kaip `p_id`, o laiką, kada paspaustas Išsaugoti, kaip `p_logged_at`;
- jei tas naudotojas jau turi treniruotę su tuo id, funkcija ją grąžina ir nieko neįterpia: jokios antros eilutės, jokio antro webhook, jokio antro laiško;
- jei du siuntimai lenktyniauja, antrasis atsitrenkia į pirminį raktą (`23505`); programa bando vėliau, ir funkcija tada randa bei grąžina treniruotę. Programa niekada nemano, kad treniruotė išsaugota, jei serveris jos negrąžino;
- `p_logged_at` tampa treniruotės `created_at`, jei yra per pastarąsias **30 dienų** ir ne ateityje; kitaip naudojamas serverio laikas. Todėl po kelių valandų išsiųsta treniruotė diagramose ir *Praėjusį kartą* vis tiek patenka į teisingą dieną.

Duomenų bazės pusė aprašyta [supabase.md](supabase.md#6-treniruočių-įrašymas-be-ryšio-v5); visas kelias nubraižytas [architecture.md](architecture.md#6-veikimo-be-ryšio-sluoksnis).

## 5. Senesnės duomenų bazės įspėjimas

Programa veikia ir su duomenų baze iš laikų prieš v5 (todėl ta pati versija gali veikti su projektu, kuriame `supabase/schema.sql` dar nepaleista iš naujo). Duomenų bazė pati pasako savo versiją: funkcija `schema_version()` grąžina `5`, o programa paklausia vieną kartą per paleidimą, kai yra ryšys, ir atsakymą įsimena (`src/offline/dbVersion.js`, `src/api/schema.js`). „Funkcija nerasta“ reiškia, kad versija senesnė nei v5; jei atsakymo nėra (be ryšio), lieka paskutinė žinoma reikšmė.

Jei `log_workout()` į naujus parametrus atsako „funkcija nerasta“ (duomenų bazė buvo atšaukta atgal arba PostgREST schemos talpykla dar neatsinaujino), programa pažymi duomenų bazę kaip senesnę ir tą siuntimą iškart pakartoja senuoju būdu.

Senesnėje duomenų bazėje veikia viskas, įskaitant įrašymą be ryšio, su dviem skirtumais:

- siuntime nėra `p_id` ir `p_logged_at`, todėl be ryšio įrašytai treniruotei priskiriamas jos **išsiuntimo** laikas;
- siuntimo niekada nenutraukia 15 sekundžių limitas (forma vis tiek po 15 sekundžių nustoja laukti ir parašo, kad treniruotė laikoma telefone), nes nutraukimas galėtų palikti išsaugotą treniruotę atrodančią neišsaugota. Tada antrą kopiją gali sukelti tik ryšys, kuris tikrai nutrūksta siuntimo metu.

Tai pasako būsenos eilutė po antrašte, su **Slėpti** likusiai sesijai:

> Logify duomenų bazė senesnė nei ši programėlė: be ryšio įrašytoms treniruotėms priskiriamas išsiuntimo laikas, o nutrūkus ryšiui ta pati treniruotė gali būti išsaugota du kartus. Sprendimas – atnaujinti duomenų bazę (supabase/schema.sql).

Ji išnyksta pati, kai tik duomenų bazė praneša versiją 5. Norėdami tai ištaisyti, dar kartą paleiskite `supabase/schema.sql` ([supabase.md](supabase.md#v5-pritaikymas-esamam-projektui)).

## 6. Būsenos eilutė

Viena eilutė po antrašte, rodoma tik tada, kai yra ką pasakyti (`src/components/StatusBar.jsx`):

| Eilutė | Kada |
|---|---|
| *Paruošta nauja Logify versija.* **Atnaujinti** | Atsisiųsta nauja versija |
| *Nėra ryšio. Įrašytos treniruotės saugomos šiame telefone.* | Nėra ryšio |
| *Siunčiama…* | Siunčiama treniruotė |
| *{n} treniruočių laukia išsiuntimo* **Siųsti dabar** | Treniruotės laukia (mygtukas tik su ryšiu) |
| *Nepavyko išsiųsti {n} treniruočių: žr. „Mano planai“.* | Kai kurias serveris atmetė |
| Senesnės duomenų bazės įspėjimas, **Slėpti** | Duomenų bazė senesnė nei v5 |

## 7. Bandymas be ryšio

Service worker reikia HTTPS arba `localhost`, o su `npm run dev` jis neaktyvus. Išbandykite produkcinę versiją:

```bash
npm run build
npm run preview        # http://localhost:4173
```

1. Atidarykite peržiūrą „Chrome“ ir prisijunkite **turėdami ryšį**. Taip įdiegiamas service worker ir paleidžiamas pasiruošimas. (DevTools → Application → Service Workers turi rodyti jį kaip *activated*; Application → Manifest rodo manifestą ir piktogramas.)
2. Kartą atidarykite Mano planus, Įrašyti treniruotę ir Pažangą, kad būtų išsaugotų duomenų, į kuriuos galima grįžti.
3. DevTools → **Network** → nustatykite ribojimą **Offline** (arba sustabdykite peržiūros serverį ir perkraukite).
4. Perkraukite puslapį. Programa atsidaro. Būsenos eilutė parašo *Nėra ryšio…*, o ekranai rodo *Nėra ryšio: rodomi duomenys, išsaugoti …*.
5. Įrašykite treniruotę. Forma parašo, kad ji išsaugota telefone, o **Mano planai** rodo ją kaip *Laukia išsiuntimo*.
6. Grąžinkite ribojimą į **No throttling**. Po akimirkos (arba paspaudus **Siųsti dabar**) būsenos eilutė išnyksta, o treniruotė tampa įprasta eilute.

Vienetų testams nieko iš to nereikia: jie niekada nenaudoja tinklo (tikras `supabase-js` klientas veikia su netikru `fetch`, `src/test/fakeBackend.js`).

Norėdami išbandyti tikrame telefone, atidarykite Vercel peržiūrą ar veikiančią svetainę per HTTPS. Jei peržiūra rodo „Programėlė dar nesukonfigūruota“, du Supabase kintamieji neįjungti Vercel aplinkai Preview ([deployment.md](deployment.md)).

## 8. Piktogramų atkūrimas

Piktogramos kuriamos iš `public/favicon.svg`, o PNG failai įtraukti į saugyklą, todėl kūrimui nereikia paveikslėlių įrankių. Pasikeitus logotipui, vieną kartą paleiskite tai ir įtraukite naujus failus:

```bash
npx --yes @vite-pwa/assets-generator@2.0.0 --config pwa-assets.config.js
```

Versija užfiksuota, o generatorius nėra projekto priklausomybė. `pwa-assets.config.js` nurodo, ką kurti: 64, 192 ir 512 px skaidrias piktogramas, 512 px „maskable“ piktogramą ir 180 px „Apple touch“ piktogramą. Pastarosios dvi turi paraštes spalva `#0f172a` – tai paties paveikslėlio krašto spalva, todėl paraštės nesimato.

## 9. Ribos

| Riba | Kodėl |
|---|---|
| **Jokio sinchronizavimo fone.** Treniruotė siunčiama tik kol programa atidaryta (ar matoma) | iPhone nepalaiko Background Sync, o „Android“ sistemoje reikėtų sesijos service worker viduje |
| **Be ryšio veikia tik treniruočių įrašymas.** Nauji, redaguoti ar ištrinti planai, treniruočių pervadinimas, tikslai, ataskaitos, dalijimasis ir planų priskyrimas reikalauja ryšio ir rodo *Nepavyksta pasiekti serverio…* | Kiekvienam reikėtų savo konfliktų taisyklių; apimtis – „peržiūra + įrašymas“ |
| **iPhone: įdiegta programėlė turi savo atmintį.** Prisijungus „Safari“, prie įdiegtos pradžios ekrano programėlės neprisijungiama: prisijunkite joje dar kartą. Jos išsaugoti duomenys ir laukiančios treniruotės atskiri nuo „Safari“ | iOS pradžios ekrano programėlei skiria savo atmintį, atskirą nuo „Safari“ kortelės |
| **iPhone: „Safari“ gali išvalyti svetainės atmintį** po tam tikro nenaudojimo laiko. Įdiegtai pradžios ekrano programėlei ši taisyklė netaikoma | Naršyklės taisyklė, ne programos valioje; dar viena priežastis ją įdiegti ir nepalikti treniruočių laukti savaitėmis |
| **Įrašymo laikas skaičiuojamas tik 30 dienų.** Senesnė treniruotė arba su laiku ateityje išsaugoma su jos išsiuntimo laiku | Duomenų bazė ignoruoja neįtikėtiną `p_logged_at` |
| **Supabase vienos minutės pauzė.** Jei prisijungimas pasibaigė be ryšio, po nepavykusio atnaujinimo supabase-js laukia iki minutės, kol bando vėl, todėl viskas atsigauna maždaug per minutę nuo ryšio grįžimo | supabase-js elgesys |
| **Išsaugoti duomenys yra kopija.** Jie tokie seni, kada ekranas paskutinį kartą įsikėlė; eilutė pasako kada. Laikoma tik 30 paskutinių atidarytų treniruočių ir sportininkų | Telefono atmintis nedidelė |
| **Naršyklių minimumai:** „Chrome“ 111, „Safari“ 16.4, „Firefox“ 121 | `crypto.randomUUID`, `AbortSignal.timeout` ir service worker |
