# Változások

## 3.10 — Több oldalfal-típus, félbe osztott oldal, RGB LED, ventilátor, okosotthon (2026. 10. 29.)

**Oldalfalak: 8 típus.** Nyitott, ZIP screen, keret nélküli tolóüveg, **keretes tolóüveg**, **fix üveg**,
lamellafal (állítható), **alumínium lécfal**, **hőkezelt fa lécfal**. Egy helyen definiálva
(`src/lib/sides.ts`: név, leírás, árkulcs, link- és rajzkód, költségkeret-érték), minden más innen olvas.

**Félbe osztott oldal.** Bármely nem fali oldal két félre osztható, felenként más típussal
(pl. fele tolóüveg, fele lécfal). Elöl/hátul bal és jobb fél, oldalt elülső és hátsó fél.
A két fél között osztóprofil fut (külön ártétel); 6 m feletti elülső oldalon a középoszlop
váltja ki. Megjelenik a 3D-ben, a tételes árban, az anyaglistában, a konfigurációs kódban
(pl. `(G/Z)`), a szöveges összefoglalóban, a PDF-ben, a műszaki rajz mindhárom nézetében,
a megosztó linkben és a gyártói lead-e-mailben.

**Felület.** Az Oldalak lépésben kétállású kapcsoló (Egész oldal / Két fél), fél-fülek a két
fél aktuális típusával, típuskártyák saját ikonnal, rövid leírással és a teljes bruttó ár
változásával. A felülnézeti oldalválasztóban kis sáv mutatja oldalanként a típust és az osztást.

**Komfort-opciók** (az Extrák lépés három csoportba rendezve: világítás · hő és légmozgás ·
vezérlés és energia):
- **Színváltós RGB+W LED** — a LED al-opciója, folyóméteres felárral. Színminták az Extrákban
  és az esti hangulat panelen; koppintásra esti nézetben mutatja a teraszt az adott színnel.
- **Mennyezeti ventilátor** (0–2 db) — tartógerendával, 3D-ben forgatható (≈30 fps-re
  korlátozva, hogy mobilon ne merítse az akkut). 2,55 m oszlopmagasság alatt figyelmeztet
  (lapátok alatt 2,1 m). A rajz alaprajzán Ø132-es lapátkörrel jelölve.
- **Okosotthon-vezérlés** — a kártya megmutatja, mit kapcsol az app ebben a tervben
  (tető, ZIP-ek, LED, fűtés, ventilátor).

**Árak (nettó, telepítés nélkül, szerkeszthetők az admin árlistában):** keretes tolóüveg
95 000 Ft/m², fix üveg 80 000, alu lécfal 55 000, fa lécfal 45 000, osztóprofil 35 000 Ft/db,
RGB+W felár 4 000 Ft/fm, ventilátor 130 000 Ft/db, okosotthon-központ 120 000 Ft.

**Energia.** Ventilátor 35 W × 3 óra × 92 nyári nap darabonként; okosotthon-központ 0,9 W
készenlét; RGB+W szalag ×1,3 fogyasztás; a félbe osztott oldalak ZIP-jei is motorként számítanak.

**Költségkeret-tervező.** A fél oldalakat külön-külön is le tudja adni, és a ventilátort,
az RGB-t és az okosotthont is.

**PDF.** Sok tételnél (osztott oldalak, sok opció) tömörebb tördelés: az ár egy lapon marad,
a „Hogyan tovább?” és a tudnivalók külön lapra kerülnek (5 oldal); egyszerű tervnél
változatlanul 4 oldal.

**Kompatibilitás.** A régi linkek változatlanul nyílnak; az új opciók a link végére kerülnek
(`r`, `v1`/`v2`, `h`, `s….`). Az alap demó ára nem változott (5 648 000 Ft).

## 3.9 — Piaci árakhoz igazított bemutató árlista (2026. 10. 29.)
A demó árai magyar középkategóriás piaci szintre kerültek (korábban kb. 40%-kal drágábbak voltak).
Példák bruttó, telepítéssel: 5 × 4 m motoros lamellás csupaszon **4,6 M Ft** (az alap demó LED-del,
ZIP-pel, szenzorral 5,6 M Ft — korábban 8,1 M), 4 × 3 m lamellás 2,8 M, eltolható lamellás 7,7 M,
textiltető 4,5 M, üvegtető 3,8 M, polikarbonát 2,9 M, fix alumínium 3,3 M, napelemmel +1,6 M Ft.

| Tétel (nettó, telepítés nélkül) | Új | Régi |
|---|---|---|
| Motoros lamellás tető | 165 000 Ft/m² | 220 000 |
| Eltolható lamellás | 240 000 Ft/m² | 340 000 |
| Textiltető | 125 000 Ft/m² | 195 000 |
| Üvegtető | 105 000 Ft/m² | 150 000 |
| Polikarbonát | 70 000 Ft/m² | 95 000 |
| Fix alumínium | 85 000 Ft/m² | 80 000 |
| ZIP screen | 45 000 Ft/m² | 85 000 |
| Tolóüveg (keret nélküli) | 105 000 Ft/m² | 165 000 |
| Fix lamellafal | 70 000 Ft/m² | 120 000 |
| LED | 10 000 Ft/fm | 12 000 |
| Infrapanel | 200 000 Ft/db | 220 000 |
| Hangrendszer | 220 000 Ft/pár | 280 000 |
| Eső- és szélérzékelő | 95 000 Ft | 180 000 |
| Napelem | 330 000 Ft/kWp | 320 000 |
| Telepítés | 10% | 12% |

Források: hazai gyártói árlisták és webshopok, tudjukki.hu/daibau.hu átlagárak, ZIP- és
tolóüveg-forgalmazói árlisták, napelemkalauz.hu (2026). Ezek tájékoztató középárak; az éles gyártó
a saját árlistáját állítja be az admin felületen.

## 3.8 — Tanácsadó, téli nézet, üzemeltetési költség, napelemes tető (2026. 10. 29.)
- **Tanácsadó** (fejléc + az első lépések elején): 4 kérdés (használat, időjárás, fény, hely)
  → javasolt pergola indoklással, árral és egy olcsóbb alternatívával; egy kattintással a 3D-be,
  bútorral együtt. Csak a gyártó kínálatából választ; mind a 108 válaszkombináció tesztelve.
- **Téli nézet** (Tél gomb): hó a kertben, a ház tetején és a teraszon a tető vetületén kívül
  (alatta száraz), havazás, kopasz fák, téli fény. Lamellás tető zárva, textiltető behúzva.
  Tájékoztató panel a tervhez szabva (tető, oldalak), egy kattintásos tolóüveg/fűtés ajánlattal.
- **Üzemeltetési költség**: éves áramköltség a 2026. októberi lakossági tarifával
  (36,386 Ft/kWh 2523 kWh/év-ig, felette 70,104 Ft/kWh). Ismeretlen háztartási fogyasztásnál a
  felső sávval (óvatos becslés); megadott fogyasztásnál sávhatár-átlépéssel is pontosan.
  Fogyasztók: fűtés (gyártói kW, állítható óraszám, fél teljesítmény), LED (10 W/fm), motorok,
  hangrendszer, készenlét. Az árpanelen, az Extrák lépésben, az összegzésben és a PDF-ben.
- **Napelemes tető** (gyártónként kapcsolható, fix tetőre): valós panelkiosztás (1134 × 1762 mm,
  430 Wp), 3D-modulok, kWp-ár, termelés (900 kWh/kWp/év, óvatos), éves érték bruttó elszámolással
  (betáplálás ~5 Ft/kWh), megtérülés, figyelmeztetés szaldós rendszer bővítésére és az elosztói
  engedélyre. Link, kód (-PV), anyaglista, műszaki rajz, PDF, költségkeret-tervező.
- A demó napelem-ár (320 000 Ft/kWp nettó) **becsült érték**, a gyártó adja meg a sajátját.
- Telefonon a gyorsgombok függőleges sávba kerültek; 63 automatikus teszt.

## 3.7 — Új PDF: méretarányos műszaki rajzzal (2026. 10. 28.)
- Teljesen újratervezett, 4 oldalas PDF, Manrope betűvel (beágyazva, ő/ű rendben):
  1. **Borító** — 3D-kép, fő adatok, bruttó irányár, havi példa, QR-kód a 3D tervhez.
  2. **Konfiguráció + anyaglista + tudnivalók** — csoportosítva (szerkezet, tető, oldalak, kiegészítők).
  3. **Árkalkuláció + teendők** — tételes ár részletezéssel, 3 lépéses folyamat, kapcsolat.
  4. **Műszaki rajz (A4 fekvő)** — homlokzat, A–A metszet, alaprajz (vízszintes metszet +1,00 m-en),
     szabványos méretarány (1:50 / 1:75), méretláncok cm-ben, szintjelek m-ben, falmetszet-vonalkázás,
     oszlopkiosztás, oldalzárások jelölése, rajzi fejléc **üres tervezői aláírás- és pecsétmezővel**.
- A rajz ugyanabból az adatból készül, mint a 3D és az ár — nem térhet el tőlük.
- Minden rögzítési módra, tetőtípusra és szélső méretre automatikusan tesztelve (53 teszt).
- Javítva: „Bal oldali oldal” → „Bal oldal” az ártételekben; a 0 db-os anyaglista-sorok kimaradnak.

## 3.6 — Választható tetőtípusok (2026. 10. 28.)
- Az **Oldalak** lépésben a diagram közepére (a „Tető” kockára) kattintva cserélhető a tető.
- 6 piaci tetőtípus: motoros lamellás (Aero), eltolható lamellás (Glide),
  behúzható textiltető (Velum), üvegtető (Lumen), polikarbonát (Opal), fix alumínium (Line).
- Minden kártyán: árnyék / eső / mozgás tulajdonság és az **árkülönbség** a mostani tervhez.
- Mozgatható tetőnél csúszka: lamellaszög (°) vagy tetőnyitás (%), a 3D-ben animálva.
- Saját 3D-modell: bordázott üveg (átlátszó, nem vet árnyékot), opál polikarbonát,
  harmonikásan behúzható ponyva.
- Végig összekötve: ár, megosztó link, konfigurációs kód, anyaglista, PDF,
  költségkeret-tervező, esőautomatika, árnyékelemzés (pl. üvegtető 29%, fix alu 69% árnyék).
- A gyártó az admin árbeállításban m²-áron árazza, és kikapcsolhatja, amit nem gyárt.
  A demó árak (textil 195e, üveg 150e, polikarbonát 95e Ft/m² nettó) **becsült értékek**.
- 6 új automatikus teszt (összesen 50).
- Javítva: a motoros lamellás tető az eltolható után félig összetolva maradt — most mindig a teljes tetőt fedi, csak a lamellaszög állítható.
- A tetőválasztó csak az Oldalak lépésben van (a Rögzítésből kikerült).

## 3.5 — Hibavadászat (2026. 10. 28.)

Automatikus végigkattintás minden funkción (tests/e2e), kódátnézés, javítás, újrafuttatás — az utolsó körben 0 hiba.

**Javított hibák**
- **Távolról nézve kifakult a ház:** a köd fix távolságtól indult, így kinagyított nézetben a ház is párás lett. Most a köd a kamerával együtt távolodik (csak a horizontot olvasztja), a talaj nagyobb lett.
- **Összecsukható árpanel** (asztali nézet): a ›-gombbal kis ár-címkévé csukható a jobb alsó sarokba, így nem takarja a 3D képet; a böngésző megjegyzi.
- **Tolóüveg kicsúszott a pergolából** bizonyos szélességeknél (pl. 535 cm), mert páratlan számú panel lett, és az utolsó mozgó panelnek nem volt párja. Most mindig páros a panelszám; teszt ellenőrzi 2,5–7 m között 5 cm-enként, hogy nyitva-zárva minden panel a kereten belül marad.
- **Elveszett ajánlatkérések:** a robotszűrő a böngésző és a szerver órájának különbségével számolt; ha a vásárló
  gépének órája néhány másodperccel előrébb járt, a kérelmet csendben eldobta. Most a böngésző maga méri a kitöltési időt.
- **Megosztott link + frissítés:** megosztott linkről megnyitva, módosítás után frissítéskor a régi link felülírta a
  változtatásokat. Most a címsor linkje követi a módosításokat.
- **Egyedi RAL-kód zárójellel / aposztróffal** („RAL 7016 (matt)”) a megosztott linket érvénytelenné tette. Javítva; 1000 véletlen konfigurációs oda-vissza teszt.
- **Méret beírása + Enter** nem lépett érvénybe (csak a mezőből kilépve). Most Enterre is, a határokhoz igazítva.
- **Ctrl+Y** (ismétlés) nem működött, és csúszkán állva a Ctrl+Z sem. Javítva.
- **Hibás e-mail / telefonszám** esetén csak általános hibaüzenet jött; most megmondja, melyik mezőt kell javítani, és a böngésző már beküldés előtt jelzi.
- **iPhone HEIC fotó** feltöltésekor üres kép lett; most érthető üzenetet ad (JPG/PNG kell).
- **Beágyazott nézetből megosztva** a címsor útvonala /k/-ra váltott az iframe-ben; most csak a hash frissül.
- **Költségkeret 100 000 Ft alatt** „Adj meg egy összeget” üzenet jött; most megmondja a legolcsóbb elérhető árat.
- **Esti hangulat:** a LED/fűtés ki-be kapcsolása az összes anyag újrafordítását okozta (mobilon akadás) — a fényforrások száma most állandó.
- **Kanapé nézetben** a bútor helyigény-jelölése belelógott a képbe — ott elrejtve.
- 375 px széles mobilon a fejléc 2 px-et túllógott.
- Árnyéktérkép-figyelmeztetés a konzolban (PCFSoft) megszüntetve.
- A LED megnevezése semleges lett (a fény színe a vásárló hangulatbeállításától függ).

**Biztonság**
- Visszaélés-fék az ajánlatkérésen: rövid idő alatt címenként max. 6, e-mail-címenként max. 3 kérelem
  (különben bárki tömegesen küldethetne „visszaigazoló” e-mailt egy idegen címre).
- Az e-mail tárgyából kiszűrve a sortörés és vezérlőkarakter.

Tesztek: 45 egység- és integrációs teszt + 4 böngészős ellenőrzőszkript.

## 3.4 — Bútor, költségkeret, esti hangulat (2026. 10. 28.)

**„Mit szeretnél alatta?” (Méret lépés)**
- Bútorcsomagok: pihenősarok (4–5 fő), étkező 6 és 8 főre, pihenő + étkező együtt, üresen. A 3D-ben megjelenik.
- Helyigény mozgástérrel (székek kihúzása 75 cm, közlekedés ≥ 60 cm) a pergola hasznos belső méretéhez
  mérve: kényelmes / szűkös / nem fér el; a 3D-ben zöld–sárga–piros jelöléssel.
- Ha nem fér el: egy gombos méretjavaslat az árkülönbséggel, a gyártói határokon belül; ha elforgatva fér el, úgy rendezi.
- A „X főnek ajánlott” tipp mostantól ugyanezzel a számítással megy (korábban 5 × 4 m-re azt írta, hogy
  étkező és pihenősarok együtt is elfér, pedig az 6 m hosszú helyet igényel).
- A „Kanapé” nézet a választott bútor egyik ülőhelyéről néz a kertre.

**Költségkeret („Van keretösszeged?” az árpanelen és az összegzésben)**
- A vásárló beírja, mennyit szán rá; a gyártó árlistájával 3 tervet kap: legjobb egyensúly, méret megtartva,
  felszereltség megtartva — mindegyiknél a pontos ár és a változások listája; egy gombbal alkalmazható, visszavonható.
- Funkcionálisan értelmes cserék (üveg → ZIP → nyitott), a választott bútor helyigénye alá nem kicsinyít;
  ha belefér, megmondja a maradékot; ha irreális, a legkisebb elérhető árat.

**Esti hangulat (Éjszaka nézetben)**
- LED fényerő és színhőmérséklet (2200–4000 K), a fény a 3D-ben valóban ilyen színű és erősségű.
- Teraszfűtés be/ki (izzás + meleg fény a panelek alatt).
- Ha még nincs a tervben LED vagy fűtés: „próbáld ki” gomb az árral.

Tesztek: 38 (bútor-helyigény, költségkeret-tervek a kereten belül és a valós árral).

## 3.3 — Árnyékelemzés valós napállással (2026. 10. 28.)

Új „Árnyék” gomb a jelenet felett. A vásárló megadja az irányítószámát, a napot és hogy merre néz
a pergola kert felőli eleje; a 3D-ben a nap valós irányból süt, a panel pedig megmutatja, a pergola alatti
terület hány százaléka van árnyékban, és ez hogyan alakul a nap folyamán.

**Pontosság (mérve, nem becsülve):**
- Napállás: NOAA/Meeus algoritmus, a NREL SPA referenciához (pvlib) képest 5 helyszín × 8 nap × 7 időpont
  alapján az azimut és a magasság eltérése < 0,02°; napkelte/napnyugta/delelés < 1 perc (tests/sun.test.ts).
- Nyári/téli időszámítás (Europe/Budapest) pontos, az átállás napjain is.
- Árnyék-%: a pergola alapterületén 196 mintapontból sugárkövetés a Nap felé, a jelenet valódi geometriáján
  (lamellák a beállított szögben, gerendák, ZIP-roló, lamellás fal, ház, házszárny). Az üveg átengedi a fényt.
  Ellenőrzés: fix tetős pergola, Vép, jún. 21., delelés → kézi geometriai számítás 78,6%, a rendszer 79%.
- Helyszín: 3046 magyar irányítószám koordinátája (GeoNames, CC BY 4.0), offline, ~2–5 km pontos —
  ez a napállásban 0,05° alatti eltérés.

**Ami a pontosságot ténylegesen meghatározza:** a tájolás. 10° tévedés a tájolásban többet számít,
mint minden más együtt. Ezért van 8 gyorsgomb, fokra pontos csúszka, és telefonon iránytűs mérés
(mágneses elhajlással korrigálva, 1,5 s átlag; a fal közelében a vasszerkezet zavarhatja).

**Nincs a modellben:** a szomszéd épületei, a valódi fák, a terep lejtése, és a ház valódi magassága
(a 3D ház általános, egyszintes + tetőtér).

- A 3D-ben iránytű jelöli a valós északot; az égbolt képe úgy fordul, hogy a látható nap is a valós irányban legyen.
- Mobilon a beállítások összecsukhatók, hogy az árnyék látszódjon.
- Első bekapcsoláskor július 15. az alapértelmezett nap (nyáron számít az árnyék).
- Javítva közben: az árnyékmérés késleltetett újramérése a régi időpontot használta (79% helyett 68%-ot mutatott).

## 3.2 — a pergola a házfalon ül (2026. 10. 28.)

- Javítva: falhoz rögzített módban a pergola a ház előtti teraszlemez szélén állt, kb. 0,5 m-re
  a homlokzattól, az eresz alatt réssel. Most a fali profil közvetlenül a homlokzaton ül
  (falmenti, L és U módban is); a ház előtti teraszlemez ilyenkor elrejtve, a pergola terasza veszi át.
- A ház mérete a pergola magasságához igazodik: az eresz mindig a pergola fölé esik (3,2 m-nél is).
- A hátsó sarokba tett cserepes növény nem lóg bele a falba.
- U-fülkénél a „Részlet” nézet távolabbról mutatja a szárny és a gerenda csatlakozását.
- Teszthez: `?arDebug=1` mellett `__pergolaWorldBoxes()` kiírja az elemek világkoordinátás befoglalóit.

## 3.1 — gyorsabb betöltés, minőségvesztés nélkül (2026. 10. 28.)

- **Textúrák WebP-ben:** 15,7 MB → 6,9 MB. Fájlonként addig emeltük a minőséget, amíg az eltérés
  az eredetitől vizuálisan nem észlelhető (PSNR ≥ 42 dB, a kevés kivétel 40,5–41,6 dB, zajos normáltérképek);
  ahol a WebP nem lett érdemben kisebb, maradt a JPG.
- **3D modellek tömörítve (meshopt, veszteségmentes):** fa, bokor, cserepes növény, asztal ~25%-kal kisebb;
  a méretarány-ember 3,1 MB → 0,7 MB.
- **Párhuzamos előtöltés:** a ház, az égbolt, a teraszburkolat és a kerti elemek már akkor töltődnek, amikor
  a böngésző még az első képkockát készíti, nem utána.
- Induláskor letöltött adat: 18,8 MB → 11,7 MB (−38%).
- Ellenőrzés: a régi és az új verzió ugyanabból a nézetből renderelve 46–58 dB egyezés, szemmel azonos.
- Gyorsítótár (Vercel): a modellek/textúrák/HDR 1 napig gyorsítótárazva, háttérben frissülnek; a buildelt
  JS/CSS változatlanul „immutable”.
- Előnézet: a bináris fájlok visszaalakítása fájlonként egyszer történik (az előtöltés és a betöltés közösen használja).

## 3. kör — L/U alakú ház, fény és árnyék, előnézeti link (2026. 10. 28.)

### A ház maga lesz L vagy U alakú
- A különálló téglafalak helyett L-sarok módban egy, U-fülke módban két **valódi házszárny**
  épül a főház mellé: lábazat, homlokzat, lapos cinktető szegéllyel, ablakok
  keretezéssel, és a pergola felé néző tolóajtó.
- A szárny a főház anyagait használja (keret, üveg, kő), így egy épületnek látszik.
- Homlokzat választható: **fa, mint a ház** (alapértelmezett), vakolt, tégla. Az anyagminta méterhez
  igazított, nem nyúlik meg kis vagy nagy pergolánál.
- A szárny magassága, mélysége és az ablakok száma a pergola méretéhez igazodik
  (2,5 × 2,5 m-től 7 × 5 × 3,2 m-ig ellenőrizve).
- Éjszaka a szárny ablakai belülről meleg fénnyel világítanak.
- Fotós nézetben a szárnyak elrejthetők, mint eddig a falak.

### Fény és árnyék
- Javítva: a napszak váltásakor az árnyékok nem frissültek (a lamellák csíkos árnyéka
  csak újratöltés után jelent meg).
- Új fényegyensúly: erősebb nap, kevesebb szórt fény, így a pergola valódi, éles árnyékot vet
  a teraszra; a belső nézetek sem sötétülnek be.
- Fülke módban a nyitó kamera távolabbról, magasabbról néz be, hogy a két szárny ne takarjon.

### „Alulról” nézet javítva
- Hiba volt: a kamera nem tudott felfelé nézni (a forgatás vízszintesen meg volt állítva),
  ezért a tető alja tömör sötét sávnak látszott.
- Most a terasz közepéről kb. 50°-ban felfelé nézünk a lamellák dőlésével egy irányba:
  a lamellák között látszik az ég. Ebben a nézetben szabadon lehet felfelé forgatni.

### Kattintható előnézet
- `npm run build:preview` → `dist-preview/`: aloldalról is futó változat belső útválasztással,
  az ajánlatkérés csak szimulált („Előnézeti mód”, e-mail nem megy ki).
- A tárhely nem szolgál ki bizonyos bináris fájltípusokat, ezért ezek a build végén base64
  szövegként kerülnek fel, és egy csak itt betöltődő réteg alakítja vissza őket
  (`src/lib/binaryShim.ts`, `scripts/encode-binaries.mjs`). Az éles buildbe nem kerül bele.

### Ellenőrizve
- TypeScript, ESLint, 23 egységteszt, éles build.
- Mind az 5 rögzítési mód × 5 kameranézet × nappal/éjszaka: nincs üres vagy fekete kép, nincs konzolhiba.
- Előnézet aloldalról: 3D betölt, ár 8 080 000 Ft, ajánlatkérés, főoldal, AR QR, nincs hibás kérés.

## 2. kör — rögzítési módok, prémium látvány, AR (2026. 10. 28.)

### Rögzítési módok
- Öt rögzítés: **falhoz**, **sarokba bal / jobb fallal (L)**, **fülkébe (U, három fal)**, **önálló**.
- A 3D-ben paraméteres oldalfal jelenik meg fedkővel és lábazattal, három burkolattal:
  vakolt, tégla, fa (csak látvány, az árat nem befolyásolja).
- A szerkezet követi a módot: oszlopszám (sarok: 1, fülke: 0, 6 m felett középoszlop),
  oldalfali csatlakozó profil vízvetővel és konzolokkal, lefolyó a megfelelő
  oszlopban, fülkében falon vezetett lefolyócső.
- A falas oldalakra nem tehető oldalzárás (felület, ár, PDF, e-mail egységesen).
- Ár: „Oldalfali rögzítés” (Ft/fm) és „Elmaradó oszlop” jóváírás (Ft/db) — gyártónként állítható.
- A kamera, a méretvonalak, a terasz és a növények a falakhoz igazodnak.
- Közös logika: `src/lib/mount.ts` (3D, ár, anyaglista, PDF, e-mail ugyanebből dolgozik).

### Prémium megjelenítés (asztali gépen)
- Ambient occlusion, bloom (a LED és a fűtés éjjel valóban világít), filmes tónusleképezés, élsimítás.
- Csak asztali minőségnél töltődik be (külön csomag); mobilon és fotós nézetben nem.
- `?effects=0` kapcsolóval kikapcsolható (hibakereséshez).
- Védőlépcső a túlcsorduló csúcsfények ellen — javította a fülke módban jelentkező fekete képet.

### AR — „Nézd meg a kertedben”
- iPhone: Apple AR Quick Look; Android: WebXR (ARCore-képes Chrome); a pergola valós méretben.
- Asztali gépen QR-kód: a telefon ugyanazt a konfigurációt nyitja meg, és onnan indul az AR.
- Az AR-modell csak a terméket tartalmazza (ház, falak, bútor nélkül); a hivatalos
  glTF-ellenőrző szerint hibátlan.
- Beágyazott (iframe) módban az AR új lapon, az önálló oldalon nyílik.
- A `model-viewer` (Google, Apache-2.0) a `public/vendor/` mappában van, csak AR-kor töltődik be.

### Rövid megosztó link
- `#c=500_400_260_L_l_a_0WWz_…` formátum (~40 karakter a korábbi ~400 helyett):
  olvasható QR-kód, SMS-be is fér. A régi `#k=` linkek továbbra is működnek.

### Ellenőrizve
- 23 automatikus teszt (rögzítési módok, ár, anyaglista, spec-kód, megosztó link, lead-e-mail).
- 5 rögzítés × 5 kameranézet × nappal/éjjel = 50 kombináció képernyőn, üres vagy hibás kép nélkül.
- Produkciós build: ismételt betöltés, konzolhiba nélkül; mobilon az utófeldolgozás nem töltődik le.

---

## 1. kör — gyártói kiadás (2026. 10. 28.)

A felület, a 3D-jelenet és az arculat **változatlan**. A változások a
működést, az eladhatóságot és a hibákat érintik.

## Gyártói (white-label) rendszer
- `src/tenants/`: gyártónként egy fájl — név, logó, termékek, árlista,
  méretkorlátok, elérhető opciók, színek, csomagok, lead-címzettek.
- A konfigurátor minden része ebből dolgozik: vezérlők, árpanel, összegzés,
  PDF, információs ablak, űrlap, 3D-szín.
- Új útvonalak: `/k/{gyarto}` (önálló) és `/embed/{gyarto}` (iframe, noindex,
  nincs kifelé mutató link, konverziós `postMessage`).

## Érdeklődők (leadek)
- Új végpont: `server/lead.ts` (Vercelen `api/lead.ts`).
- Az árat a szerver a gyártói árlistából **újraszámolja**; a konfigurációt a
  gyártó kínálatához igazítja.
- E-mail a gyártónak (ügyfél, konfiguráció, tételes ár, anyaglista, 3D link,
  reply-to az ügyfél), visszaigazoló e-mail az ügyfélnek (Resend).
- Opcionális mentés Supabase-be (`supabase/leads.sql`).
- Kézbesítés nélkül élesben 503-as hibát ad, nem hamis sikert.
- Robotszűrés: rejtett mező + 2,5 mp-es kitöltési minimum.

## Kimi-függőség megszüntetve
- `package-lock.json`: 382 csomag a Kimi belső npm-tükréről települt volna
  (kívülről elérhetetlen) → nyilvános npm.
- Kimi OAuth, Kimi inspect plugin, MySQL/Drizzle, tRPC, AI SDK, S3 kivéve
  (166 csomag kevesebb).
- A böngészős naplózó nem küld többé minden hibát a nem létező `/api/log`-ra,
  és nem írja át a globális `fetch`-et.
- A piactér-réteg (partnerek, megyei kiosztás, jutalék, admin) az
  `_marketplace/` mappába került, változatlanul, a buildből kivéve.

## Javított hibák
- A nyilvános oldalon bárki átírhatta az árakat → csak `?admin=1` mellett látszik,
  és a szerver úgyis a gyártói árral számol.
- Az Extrák lépés a gyári alapárat mutatta a szerkesztett ár helyett.
- A fűtés maximuma (4 db) és a méretkorlátok be voltak égetve.
- A PDF-ben a konfigurációs táblázat átcsúszott egy szinte üres oldalra → 2 oldal.
- Az ékezetes RAL-név (pl. „Zöld 6005”) elrontotta a megosztó linket.
- A mentett A/B konfigurációk ellenőrzés nélkül töltődtek vissza.
- A menüben és láblécben a megszűnt piactér-oldalakra mutató linkek voltak.
- Lint-hiba: `setState` effectben (méretmezők).

## Teljesítmény
- 3D-modellek meshopt-tömörítése (fa, cserép, bokor, asztal): **~5 MB-tal
  kevesebb letöltés** mobilon, vizuális változás nélkül.
- Kezdő JS-csomag 503 KB → 278 KB; a 3D-motor külön, gyorsítótárazható csomagban.
- Használaton kívüli HDR, textúra és modell (~5 MB) kikerült a `public/` mappából (`_unused_assets/`).

## Ellenőrizve
- TypeScript, ESLint: hibamentes. 12 automatikus teszt (árazás, szabályok,
  lead-végpont) zöld. Build rendben.
- Böngészőben: demó, `/k/`, `/embed/`, ismeretlen gyártó (404), admin mód,
  mobil, teljes lead-folyamat, PDF-letöltés, korlátozott kínálatú gyártó.
  Konzolhiba nélkül.
