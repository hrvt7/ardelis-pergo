# Változások

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
