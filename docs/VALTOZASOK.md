# Változások

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
