# Lamelix konfigurátor – teljes technikai audit (újraépítéshez)

> Állapot: 2026-11-18 · `main` @ `f99acce` (5.03) · csak vizsgálat, kódmódosítás nélkül.
> Az előző, teljes rendszerre kiterjedő audit (2026-11-17: 147 funkció, 7 terület) a `docs/AUDIT-2026-11-17.md`-ben és a projekt `claude/07-audit-vezetoi-osszefoglalo.md` dokumentumában van. Ez a dokumentum arra épül, és a vevői konfigurátorra szűkít.

## A. Projektstruktúra

| Rész | Hely | Megjegyzés |
|---|---|---|
| Belépési pont | `src/main.tsx` → `src/App.tsx` (react-router 7) | A konfigurátor útvonalai: `/konfigurator`, `/konfigurator/:termék`, `/k/:gyártó`, `/k/:gyártó/:termék`, `/embed/:gyártó` |
| Gyártóválasztás | `src/pages/TenantStudio.tsx` | Gyártó és termékcsalád az útvonalból; admin-beállítások letöltése (≤1,5 s); viszonteladói link (`?h=`) |
| Termékcsaládok | `src/products/*` (`studios.tsx`, `index.ts`) | Élő: teraszfedés (pergola, veranda, télikert, carport, modulház). Rejtett: kerítés/kapu, garázskapu, kerti ház |
| Pergola stúdió | `src/pages/PergoStudio.tsx` (644 sor) | Az egész konfigurátor állapota és összeállítása |
| Kezelőfelület | `src/components/*` (56 fájl), `src/components/studio/*` | Fő fájl: `ConfiguratorControls.tsx` (538 sor) |
| 3D | `src/components/PergolaScene.tsx` (3453 sor), `LouvreRoof.tsx`, `SceneEffects.tsx`, `ModularHouseScene.tsx` | Egyetlen nagy jelenetfájl |
| Üzleti logika | `src/lib/*` (115 fájl) | Tiszta TypeScript, nagy része tesztelve |
| Gyártók | `src/tenants/*` | Kódban (demó: `demo.ts`, `demo-at`), admin-felülírással (`overrides.ts`) |
| Szerver | `api/*` (Vercel Edge) → `server/*` | Lead, ajánlat, admin, telepítés, szerviz |
| Adat | Supabase (REST, service role) | Leadek, beállítások, ajánlatok, telepítések, szerviz |
| Statikus anyagok | `public/assets` | HDR, PBR textúrák, GLB modellek |
| Tesztek | `tests/*` (vitest), `e2e/*` (Playwright) | 771+ egységteszt |
| Dokumentáció | `docs/*`, `AGENTS.md`, `.claude/skills/*` | Változásnapló: `docs/VALTOZASOK.md` |

**Fő függőségek:** React 19, Vite 7, three 0.186, @react-three/fiber 9, drei, @react-three/postprocessing, zod 4, pdfmake, qrcode, @vercel/analytics, lucide-react, Radix/shadcn UI-készlet (nagyrészt nem használt, lásd F).

## B. 3D rendszer

| Kérdés | Válasz |
|---|---|
| Technológia | three.js react-three-fiberrel; utófeldolgozás: N8AO (környezeti árnyék), Bloom, tónusleképezés; HDR ég |
| Modellek betöltése | A pergola nagyrészt **kódból épül** (gerendák, oszlopok, lamellák, falak: `PergolaModel` és alkomponensei). GLB csak a házhoz, a bútorokhoz, a kerthez és a modulházhoz (`useGLTF`, glTF-Transform tömörítéssel). A betöltés fokozatos (`progressiveStage`), a jelenet a nyitó animáció után épül (`IntroSceneGate`). |
| 3D objektumok | Váz (SB 400 méretek: `lib/sb400.ts`), 6 tetőtípus, 10 oldaltípus, LED, fűtés, ventilátor, napelem, tetőárnyékoló, eső, ház és házszárnyak, kert, 17 bútorcsomag, 180 cm-es figura, méretvonalak, hotspotok, autók (carport), modulház |
| Méretezés | A geometria közvetlenül a `config.width/depth/height` méterértékeiből épül (1 egység = 1 m); modulos kivitelnél mezőnként (`lib/modules.ts`) |
| Mozgatás, forgatás | `CameraController`: egér, érintés, billentyű; nézetenkénti kamerapozíciók, időalapú átmenetek; automata forgatás; keretezés a méret szerint (`lib/cameraFit.ts`, `lib/desktopCamera.ts`) |
| Anyagok, színek | Porszórt bevonat (`getCoat`, finomstruktúra 5.03), fa, üveg (`GlassMaterial`), PBR textúrák; színátúsztatás (`useColorFade`) |
| Konfiguráció → 3D | Egyirányú: a `config` és a `scene` objektum minden változása újrarajzolja az érintett részeket. A 3D visszafelé csak a jelenet-állapotot írja (`onSceneChange`: ajtó, üveg, árnyékoló nyitása kattintásra) és az oldalkijelölést (`onSideSelect`). |
| Teljesítmény | Négy minőségi szint, automatikus eszközfelismerés, futásidejű visszaléptetés (6 óráig megjegyezve), árnyék-költségvetés |

**Melyik funkció hogyan hat a 3D-re:** a `FEATURE_INVENTORY.md` minden sorában a „3D” oszlop mutatja (`közvetlen` / `jelenet` / `nincs`).

## C. Konfigurációs funkciók

129 kezelőfelületi funkció 16 modulban; a részletes leltár a `FEATURE_INVENTORY.md`-ben van. Számszerűen a fő választási lehetőségek:

| Terület | Lehetőségek |
|---|---|
| Építménytípus | 4 + modulház |
| Rögzítés | 5 |
| Méret | szélesség, mélység, magasság, 1–4 modul (gyártói korlátokkal) |
| Tető | 6 rendszer, 5 üvegezés, 2 árnyékoló × 4 ponyvaszín, napelem, dőlés, lamellaszög |
| Oldalak | 10 típus oldalanként, osztható, ajtó tükrözhető |
| Szín | 4 alapszín, 81 RAL katalógusszín, egyedi kód, kéttónusú |
| Ház | 3 háztípus, 3 homlokzatanyag színekkel, ablakszínek |
| Komfort | LED, RGB, hang, fűtés (darab), ventilátor (0–2), szenzor, okosotthon |
| Zárt építmény | 3 falüvegezés, 3 klíma, alap |
| Bútor | 17 csomag |
| Ár | élő ár, tételes kalkuláció, részletpélda, regionális felár, viszonteladói ár |
| Kimenet | PDF, kép, videó, link, szöveg, A/B, felmérési űrlap |

## D. UI/UX rendszer

| Elem | Asztal | Telefon |
|---|---|---|
| Elrendezés | Bal panel (húzható szélesség) + 3D; float elrendezésnél lebegő panel | 3D felül, háromállású alsó lap; fekvő telefonon oldalsáv |
| Navigáció | 7 lépésfül, Vissza / Következő | Lépéspillek, „Tovább: …” gomb az ársávban |
| Panelek | Lépéstartalom, „Nézet” lebegő panel, eszközlista, felugró ablakok (tanácsadó, keret, energia, AR, info, alaphelyzet) | ugyanez, teljes képernyős ablakokkal |
| Animációk | Lépésváltás iránya, árszámláló, ár-változás jelző, kameraátmenetek, színátúsztatás, tető-csere, „építés” animáció | ugyanez, rezgés érintésre |
| Stílusváltozatok | `soft` (alap), `glass`, `studio`, `light` (`?style=`) | – |
| Ismert UX-hibák | lásd F (2026-11-17 audit 14–20. pontja) | – |

## E. Működési logika

| Téma | Megvalósítás |
|---|---|
| Állapot | Helyi React-állapot a `PergoStudio`-ban (nincs külön store). Termék: `config`; jelenet: `scene`; felület: `step`, `sheet`, `view`, `modal` stb. |
| Eseménykezelés | Callbackek lefelé (`onChange`, `onSceneChange`, `onStepChange`); billentyűparancsok (Ctrl+Z/Y, ESC) |
| Szabályok | `normalizeConfig` (gyártói kínálat, kompatibilitás, korlátok) minden módosításkor; építményszabályok és javaslatok (`lib/buildings.ts`, `lib/advice.ts`) |
| Árazás | `calculatePrice` (kliens és szerver ugyanazzal a kóddal); ármátrix vagy m²-ár; regionális felár és viszonteladói árrés a gyártói szabályokból |
| Mentés | Piszkozat localStorage-ban gyártónként; A/B változatok; fotó IndexedDB-ben; megosztó link a URL-ben |
| Adatátadás | Lead: `POST /api/lead` (szerveroldali ellenőrzés, újraárazás, e-mail, Supabase) |
| Hibakezelés | WebGL-hiba esetén rajz (`FallbackDrawing`); kontextusvesztés-figyelő; hibahatár az opcionális 3D-elemeken (`OptionalSceneAsset`); felhasználói hibaüzenetek toastban |
| Külső integrációk | Supabase, Resend, Vercel Analytics, GeoNames (irányítószám → hely), opcionális CRM-webhook, időpontfoglaló link |

## F. Minőség és hibák (a konfigurátort érintők)

**Ellenőrzött állapot (2026-11-17/18):** lint 0 hiba, `tsc` 0 hiba, minden egységteszt zöld, build sikeres. Konzolhiba nincs.

| Súlyosság | Hiba | Forrás |
|---|---|---|
| Magas (javítva 4.90) | Esti hangulat panel nyitva marad más eszköznél; exportkép jobbra csúszik; két különböző fűtésár | AUDIT-2026-11-17 #3–5 |
| Közepes, nyitott | 375 px-en a lépéspillek levágva; a panel tartalma keményen levágva az árlábléc alatt; üzemeltetési költség kerekítési eltérése; a költségkeret és az árnyékelemzés „Számolás…”-ban maradhat; márkaszíntől eltérő narancs a paneleken, eltérő bezárógombok; „Következő” vs. „Tovább”; 13 px alatti feliratok | AUDIT-2026-11-17 #14–20 |
| Igazolandó | AR, körbejáró videó, fotóba helyezés valódi iPhone-on és Androidon; 3D teljesítmény gyenge tableten (Redmi Pad 2 akadozik) | 2026-11-17 audit, Ádám jelzése |
| Technikai adósság | `PergolaScene.tsx` 3453 sor egy fájlban; a `PergoStudio.tsx` minden állapotot egy helyen tart; 4 felületi stílus párhuzamosan; 53 nem használt UI-komponens (`src/components/ui`), 43 nem használt függőség | 2026-11-17 audit |
| Kompatibilitás | WebGL nélkül csak rajz; Safari/iOS AR Quick Look és Android WebXR eltérő úton; a service worker offline gyorsítótára régi verziót tarthat (frissítési kártya kezeli) | kód |

## G. Ami a lecsupaszításhoz fontos

1. **A kezelőfelület leválasztható.** Minden kezelőelem a `PergoStudio`-ban vagy a `ConfiguratorControls`-ban jelenik meg, és csak callbacken keresztül hat. Feltételes megjelenítéssel elrejthető, a logika érintetlen marad.
2. **A 3D önállóan működik** az alapkonfigurációval (`productDefaultConfig`) és az alapjelenettel (`DEFAULT_SCENE`).
3. **Magától megjelenő elemek**, amelyeket a lecsupaszított módban külön el kell nyomni: esti hangulat panel (éjszakai napszaknál), visszatérő látogató, forgatási tipp, bővítési sáv, AR-ablak `?ar=1`-nél, esőautomata állapot, kanapé-tipp, 3D-beli kattintási feliratok és hotspotok.
4. **Az éles oldalt nem szabad érinteni.** A `main` minden pusha azonnal élesedik, ezért a lecsupaszítás egy URL-kapcsoló mögé kerül (A megoldás, Ádám döntése 2026-11-18).
