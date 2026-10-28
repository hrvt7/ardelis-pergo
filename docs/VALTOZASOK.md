# Változások

## 3.5 — Hibavadászat (2026. 10. 28.)

Automatikus végigkattintás minden funkción (tests/e2e), kódátnézés, javítás, újrafuttatás — az utolsó körben 0 hiba.

**Javított hibák**
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
