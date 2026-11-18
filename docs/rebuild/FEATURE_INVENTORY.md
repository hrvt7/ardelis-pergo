# Lamelix konfigurátor – funkcióleltár (újraépítéshez)

> Állapot: 2026-11-18 · kód: `hrvt7/ardelis-pergo` `main` @ `f99acce` (5.03) · készült a forráskódból, kódmódosítás nélkül.
> Hatókör: a vevői 3D konfigurátor (`/konfigurator`, `/k/:gyártó`, `/embed/:gyártó`). A gyártói admin, a tulajdonosi oldal, az online ajánlat és a nyitóoldal **nem** része a lecsupaszításnak; csak ott szerepelnek, ahol a konfigurátor függ tőlük.
> Kapcsolódó dokumentumok: `DEPENDENCY_MAP.md` (függőségek), `REBUILD_ROADMAP.md` (sorrend), `FULL_AUDIT.md` (technika, hibák).

## Jelmagyarázat

- **Állapot:** `KÉSZ` = működik és teszt fedi · `JAVÍTANDÓ` = működik, de ismert hibája van · `IGAZOLANDÓ` = valódi eszközön még nem ellenőrzött · `REJTETT` = a kódban van, a felületen ma nem érhető el.
- **3D:** `közvetlen` = a modell geometriáját vagy anyagát változtatja · `jelenet` = a környezetet, a fényt vagy a kamerát · `nincs` = csak adat vagy ár.
- A fájlútvonalak a repó gyökeréhez képest értendők. A `PergoStudio` = `src/pages/PergoStudio.tsx`, a `Controls` = `src/components/ConfiguratorControls.tsx`, a `Scene` = `src/components/PergolaScene.tsx`.

## Összesítés

| # | Modul | Funkciók | Fő fájlok |
|---|---|---|---|
| A | Keret, navigáció, márka | 12 | PergoStudio, Controls, studio/StudioChrome |
| B | Termék- és építménytípus | 8 | BuildingControls, lib/buildings |
| C | Elhelyezés és méret | 7 | Controls (mount), lib/mount, lib/modules |
| D | Tetőrendszer és tetőelemek | 9 | Controls (roof), lib/roofs, SideAndExtras, lib/roofShade, lib/solar |
| E | Oldalzárások | 7 | SideAndExtras, lib/sides, lib/mechanics |
| F | Színek | 6 | ColorPicker, lib/colors |
| G | Ház és környezet | 6 | HouseLook, lib/house, Controls (SceneSettingsPanel) |
| H | Komfort és vezérlés | 8 | Controls (extras), SideAndExtras |
| I | Ár és költség | 9 | lib/pricing, PricePanel, studio/PanelPrice, tenants/pricingRules |
| J | Döntéstámogatók | 6 | AdvisorDialog, BudgetDialog, EnergyDialog, lib/advice, BuildingIssues |
| K | Összegzés, mentés, megosztás, export | 11 | SummaryPanel, lib/exportPdf, lib/showcase, lib/turntableVideo |
| L | Ajánlatkérés és adatbekérés | 6 | LeadForm, server/lead.ts |
| V | Nézet és jelenet-beállítások | 14 | Controls (SceneSettingsPanel), FurniturePicker, StudioChrome |
| N | Bemutató eszközök | 11 | SunStudyPanel, PhotoBar, MechanismPanel, WalkOverlay, ArDialog, MoodPanel |
| O | Különleges módok | 4 | useModularStudio, lib/expansion |
| P | Mérés és háttérfolyamatok | 5 | lib/analytics, lib/engagement, lib/funnelEvents |
| | **Összesen** | **129** | |

A 3D jelenet maga (nem kezelőfelület) a **0. modul**: a lecsupaszítás után is megmarad, ezért a végén külön szerepel (Z).

---

## A – Keret, navigáció, márka

| ID | Funkció | Jelenlegi működés és választási lehetőségek | Komponens / fájl | 3D | Függ | Állapot és adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| A01 | Oldalpanel (asztal) | Bal oldali panel lépésfülekkel, görgethető tartalommal, alul ár és lépésnavigáció | Controls, `src/index.css`, `src/studio-float.css` | jelenet (a nézet eltolása: `viewShiftX`) | – | `step`, `uiStyle` | Panelkeret, a fülek egyenként jönnek vissza |
| A02 | Lépésfülek (7) | Típus · Méret · Tető · Oldalak · Szín · Komfort · Összegzés; kész lépés pipával | `src/lib/configSteps.ts` (`STEPS`), Controls | jelenet (lépésváltáskor kamera: `goStep`) | A01 | `step` | A lépéslista modulonként bővül |
| A03 | Mobil alsó lap | Háromállású (kicsi/fél/teljes), húzható; fekvő telefonon oldalsáv | Controls (`useSheetGesture`), `src/lib/viewport.ts` | jelenet (`viewShift` 0,2) | A01 | `sheet` | – |
| A04 | Mobil ársáv + „Tovább” | Bruttó ár és a következő lépés gombja; az utolsó lépésen „Felmérést kérek” | PergoStudio (`mobileBar`), `configSteps.mobileBarAction` | nincs | A02, I01 | – | I01 után |
| A05 | Lépésnavigáció | Vissza / Következő, az utolsón „Felmérést kérek” | Controls (`panel-dock`) | nincs | A02 | – | – |
| A06 | Panelszélesség húzással | Asztalon és fekvő telefonon; dupla kattintás = alapérték | `studio/PanelResizer.tsx`, `src/lib/panelResize.ts` | jelenet (`viewShiftX`) | A01 | localStorage `PANEL_WIDTH_KEY` | – |
| A07 | Fejléc | Logó/kezdőlap, visszavonás, újra, ügyfél-bemutató, információ, alaphelyzet | `studio/StudioChrome.tsx` (`StudioHeader`) | jelenet (kezdőlap = áttekintő kamera) | K05, K06, N11 | – | Gombok egyenként |
| A08 | Felületi stílus | `soft` (alap), `glass`, `studio`, `light`, float elrendezés (`?style=`) | `src/lib/uiStyle.ts` | jelenet (ciklorama, kezdő napszak) | – | localStorage `UI_STYLE_KEY` | Csak egy stílus kell? → döntés |
| A09 | Fejléc-címsor a 3D felett | Tető neve / szélesség, alcím; modulháznál a ház neve és területe | PergoStudio (`viewer-heading`) | nincs | C, D | – | – |
| A10 | Láblécsor a 3D alatt | „1 egység = 1 méter”, alapterület, „Lamelix” jelzés (kikapcsolható: `platformCredit`) | PergoStudio (`viewer-footer`) | nincs | I01 | – | – |
| A11 | White-label | Gyártói név, logó, színek, favicon; beágyazott módban nincs kezdőlap-link | `src/tenants/*`, `TenantContext`, PergoStudio (favicon) | nincs | – | `tenant.brand` | Megmarad a háttérben |
| A12 | Értesítések (toast) | 3,6 s-ig látszó üzenet bezárógombbal | PergoStudio (`toast`) | nincs | – | `toast` | Közös szolgáltatás, korán vissza kell |

## B – Termék- és építménytípus

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| B01 | „Mit építesz?” választó | Pergola · Veranda · Télikert · Carport · Modulház (ha a gyártó kínálja) | `BuildingControls.tsx` (`BuildingPicker`) | közvetlen (zárt falak, tető, autók carportnál) | C, D, E | `config.building` | Az építménytípus átállítja a tetőt és az oldalakat (`buildingStash`) |
| B02 | Típusváltás memóriája | Pergolára visszaváltva a korábbi tető, oldalak, dőlés visszajön | PergoStudio (`applyConfig`, `buildingStash`) | közvetlen | B01 | `buildingStash` ref | B01-gyel együtt |
| B03 | Falüvegezés | Egyrétegű · kétrétegű · háromrétegű (csak zárt építménynél) | `WallGlazingPicker` | közvetlen (üveg színe, átlátszóság) | B01, E | `wallGlazing` | – |
| B04 | Klíma (télikert) | Split · padlófűtés · mindkettő; a 3D-ben légáram és padlófény | `ClimateSection`, Scene (`SplitUnits`, `FloorGlow`) | közvetlen | B01 | `climate`, `scene.climateRun` | – |
| B05 | Alap és szigetelt padló | Télikertnél kötelező, verandánál választható | `ClimateSection` | közvetlen (`SlabRise`) | B01 | `foundation` | – |
| B06 | Engedélyezési figyelmeztetés | Zárt építménynél tájékoztató szöveg | `PermitNotice` | nincs | B01 | – | – |
| B07 | Építményszabályok és javítás | Pl. rövid ajtó, nyitott oldal télikertnél, carport mérete; egy kattintásos javítás | `BuildingIssues`, `lib/buildings.ts`, `lib/issueFixes.ts`, `configSteps.ISSUE_STEP` | közvetlen (a javítás után) | B01, C, D, E | – | Lépésenként, a hozzá tartozó modullal |
| B08 | Kiinduló csomagok | Gyártónként (demó: Alap, Komfort, Prémium, Veranda); típus szerint szűrve | Controls (`preset-list`), `tenant.presets` | közvetlen (teljes csere) | minden konfig-modul | `tenant.presets` | A végén, mert minden mezőt beállít |

## C – Elhelyezés és méret

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| C01 | Rögzítési mód | Falhoz · L-sarok bal · L-sarok jobb · U-fülke · önálló (gyártónként szűrve) | Controls (`mount-options`), `lib/mount.ts` | közvetlen (fal, oszlopok, házszárnyak) | – | `mount`, `tenant.mounts` | Elsőként a méret előtt |
| C02 | Szélesség | Csúszka + cm-mező, 5 cm-es lépés, gyártói korlát | Controls (`SliderField`) | közvetlen | C01 | `width`, `limits.width` | – |
| C03 | Mélység | Mint C02 | Controls | közvetlen | C01 | `depth` | – |
| C04 | Oszlopmagasság | Mint C02 | Controls | közvetlen | – | `height` | – |
| C05 | Modulok | 1–4 összekapcsolt mező közös oszlopokkal (ha a gyártó kínálja) | Controls, `lib/modules.ts` | közvetlen | C02 | `modules`, `limits.maxModules` | – |
| C06 | Középoszlop-figyelmeztetés | 6 m feletti mezőnél | Controls (`smart-warning`) | nincs | C02 | – | – |
| C07 | Méretjavaslat | Mire elég a méret (pl. hány fő) | `lib/specification.ts` (`getSizeRecommendation`) | nincs | C02, C03 | – | – |

## D – Tetőrendszer és tetőelemek

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| D01 | Tetőrendszer | Aero (motoros lamellás) · Glide (eltolható lamellás) · Velum (textil) · Lumen (üveg) · Opal (polikarbonát) · Line (fix alumínium); gyártónként szűrve és átnevezhető | Controls (`RoofPicker`), `lib/roofs.ts` | közvetlen (`RoofSwap`, `LouvreRoof`, `GlazedRoof`, `FabricRoof`) | B01 | `roof`, `tenant.roofs` | – |
| D02 | Tetőmozgatás | Lamellaszög 0–90° vagy tetőnyitás 0–100% (a tető fajtája szerint); fix tetőnél nincs | Controls (`RoofControl`) | közvetlen | D01 | `louverAngle` | – |
| D03 | Okos lamella | A lamellák a napot követik (a legnagyobb nyitás árnyékban) | Controls (`RoofControl`), `lib/smartLouver.ts` | közvetlen | D02, N01 | `scene.smartLouver` | N01 után |
| D04 | Tetődőlés | 0–N fok; a hátsó él emelkedik | Controls (`SliderField`), Scene (`Tilt`) | közvetlen | D01 | `pitch` | – |
| D05 | Tető memória | Tetőváltáskor az üvegezés, árnyékoló, napelem, tetőszín megmarad és visszajön | PergoStudio (`roofStash`) | közvetlen | D01 | `roofStash` ref | D01-gyel |
| D06 | Üvegezés | Tiszta · matt · opál · hővisszaverő · színezett (üveg- és polikarbonát tetőnél) | Controls (`GlazingPicker`), `lib/roofs.ts` | közvetlen | D01 | `glazing` | – |
| D07 | Tetőárnyékoló | Nincs · tető felett · tető alatt; ponyvaszín: fehér, homok, szürke, antracit; kihúzás a 3D-ben | `SideAndExtras` (`RoofShadeOption`), `lib/roofShade.ts`, Scene (`RoofShadeModel`) | közvetlen | D01 | `roofShade`, `shadeFabric`, `scene.shadeOut` | – |
| D08 | Napelemes tető | Fix tetőre; teljesítmény, termelés, érték | Controls (`SolarToggle`), `lib/solar.ts`, `SceneExtras` (`SolarPanels`) | közvetlen | D01 | `solar` | – |
| D09 | Kéttónusú tetőszín | Lásd F03 | – | – | – | – | Az F modulban |

## E – Oldalzárások

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| E01 | Oldalválasztó | Felülnézeti ábra (4 oldal + tető), vagy kattintás a 3D modellen | Controls (`SideDiagram`), Scene (`onSideSelect`) | jelenet (a kamera az oldalra fordul) | C01 | `selectedSide` | – |
| E02 | Oldaltípus | Nyitott · ZIP screen · tolóüveg · keretes tolóüveg · fix üveg · nyíló ajtós üvegfal · tolóajtós üvegfal · lamellafal · alu lécfal · fa lécfal (gyártónként szűrve) | `SideAndExtras` (`SideSettings`), `lib/sides.ts` | közvetlen (`SidePlacement` és az egyes fal-komponensek) | E01, C01 | `sides`, `tenant.sides` | – |
| E03 | Osztott oldal | Egy oldal két fele eltérő típussal | `SideSettings` (`half`), `lib/mechanics.ts` (`sideSegmentPlacements`) | közvetlen | E02 | `split` | – |
| E04 | Ajtó nyitásiránya | „Nyitás a másik oldalra” (tükrözés) | `SideSettings`, `lib/mechanics.ts` | közvetlen | E02 | `doorMirror` | – |
| E05 | ZIP nyitottság | 0–100% | Controls (`inline-setting`) | közvetlen | E02 | `screenOpen` | – |
| E06 | Mozgatás a 3D-ben | Tolóüveg, lamellafal és ajtó nyitása kattintásra; a dézsák elkerülik az ajtót | Scene (`GlassWall`, `LouverWall`, `DoorWall`), `lib/sceneLayout.ts`, `lib/clearance.ts` | közvetlen | E02 | `scene.glassOpen`, `doorOpen`, `wallLouverOpen` | – |
| E07 | Oldalcsík (összefoglaló) | Az oldal kiválasztott elemeinek rövid sora | `SideStrip` | nincs | E02 | – | – |

## F – Színek

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| F01 | Alapszínek | Gyártónként (demó: antracit, fekete, fehér, bronz) felár nélkül | `ColorPicker.tsx`, `tenant.colors` | közvetlen (porszórt anyag, színátúsztatás) | – | `frameColor` | – |
| F02 | RAL-katalógus és keresés | 81 RAL szín 7 csoportban (szürke, fehér, fekete, barna, metál, fa hatású, színes), név vagy kód szerint keresve, egyedi kód is | `ColorPicker`, `lib/colors.ts` | közvetlen | F01 | `frameColor: 'custom'`, `customRal` | – |
| F03 | Kéttónusú kivitel | Külön tető/lamella szín (alumínium tetőnél, ha a gyártó kínálja) | `ColorPicker` | közvetlen | F01, D01 | `roofColor`, `roofRal` | – |
| F04 | Szín a saját fotóról | A ház fotójáról színmintavétel, a legközelebbi RAL színek | `ColorPicker` (`PhotoColorDialog`) | közvetlen | F02, N03 | – | N03 után |
| F05 | Ablakhoz igazítás | Javaslat: a pergola színe a nyílászárókhoz | `HouseLook` (`WindowMatch`) | közvetlen | F01, G | – | G után |
| F06 | Színlap fülek | „Pergola” és „A házad” fül egy lépésben | Controls (`color-tabs`) | – | F01, G03 | `colorTab` | – |

## G – Ház és környezet

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| G01 | Környezet | Családi ház · csak a termék (stúdió) | `SceneSettingsPanel` | jelenet (ház, kert, ciklorama) | – | `scene.ground` | – |
| G02 | Háztípus | Fa–cink (klasszikus) · lapostetős · nyeregtetős; stúdióból a családi házra vált | `SceneSettingsPanel`, `HouseLook`, `lib/house.ts` (`houseStylePatch`) | jelenet | G01 | `scene.houseStyle` | – |
| G03 | Homlokzat | Anyag: vakolat · tégla · cédrus; színek anyagonként + szabad szín | `HouseLook` | jelenet | G01 | `wallFinish`, `wallColor` | – |
| G04 | Nyílászáró színe | Előre megadott ablakszínek | `HouseLook` | jelenet | G01 | `windowColor` | – |
| G05 | Ház memória | A ház beállítása böngészőnként megmarad | `lib/house.ts` (`saveHouseLook`) | – | G02–G04 | localStorage | – |
| G06 | Ház a fal-rögzítéshez | Fali és sarokrögzítésnél házfal/házszárny a 3D-ben | Scene (`House`, `StyledHouse`, `HouseWings`), `lib/sceneLayout.ts` | jelenet | C01, G01 | – | C01-gyel |

## H – Komfort és vezérlés

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| H01 | Periméter LED | Be/ki, ár folyóméterenként | Controls (`Toggle`) | közvetlen (`LedLighting`, esti nézetre vált egyszer) | – | `led` | – |
| H02 | Színváltós LED | RGB+W, előnézeti színek | `SideAndExtras` (`RgbOption`) | közvetlen | H01 | `ledRgb`, `scene.ledColor` | H01 után |
| H03 | Hangrendszer | Bluetooth hangszórópár | Controls | nincs (csak ár) | – | `speakers` | – |
| H04 | Infravörös fűtés | 0–N darab (gyártói korlát) | Controls (`stepper-row`) | közvetlen (izzás) | – | `heaters`, `limits.maxHeaters` | – |
| H05 | Mennyezeti ventilátor | 0–2 darab | `SideAndExtras` (`FanOption`), `lib/fans.ts` | közvetlen (forgás, alulnézetre vált) | – | `fans`, `scene.fanOn` | – |
| H06 | Eső- és szélszenzor | Mozgó tetőhöz vagy ZIP-hez | Controls | jelenet (esőnél „Esőautomata aktív”, a tető zár) | D01 vagy E02 | `sensors` | – |
| H07 | Okosotthon-vezérlés | Átjáró: telefon, hang, időzítés | `SideAndExtras` (`SmartHomeOption`), `lib/comfort.ts` | nincs | – | `smartHome` | – |
| H08 | Carport komfort | Carportnál csak LED (a napelem a Tető lépésben) | Controls | közvetlen | B01, H01 | – | B01 után |

## I – Ár és költség

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| I01 | Élő ár (panel alján) | Bruttó irányár animálva | `studio/PanelPrice.tsx`, `PricePanel` (`AnimatedPrice`) | nincs | I05 | `price` (`useMemo`) | Korán, a méret után |
| I02 | Részletes kalkuláció | Nettó / ÁFA / bruttó, tételes sorok, változásjelzés | `PricePanel.tsx` | nincs | I05 | `detailsOpen` | – |
| I03 | Változásjelző | „+X Ft · Szélesség”, visszavonással; rezgés érintőképernyőn | `StudioChrome` (`ChangePill`), `PriceDeltaPop` | nincs | I01, K05 | `change`, `delta` | – |
| I04 | Havi részletpélda | 60 havi példa (kikapcsolható: `installmentMonths: 0`) | `PricePanel` | nincs | I01 | `tenant` | Döntés: kell-e |
| I05 | Árszámítás | m²-ár tetőnként vagy ármátrix; felárak egységárakból; nettó, ÁFA, bruttó; pénznem HUF/EUR | `src/lib/pricing.ts` (`calculatePrice`), `lib/priceMatrix.ts`, `lib/money.ts` | nincs | – | `tenant.prices` | Logika marad, nem UI |
| I06 | Regionális felár | Megyénként százalék vagy fix összeg (a felmérési űrlapon) | `src/tenants/pricingRules.ts` | nincs | L01 | `pricingRules` | L-lel |
| I07 | Viszonteladói ár | `?h=` linkkel a viszonteladó árrésével | `TenantStudio`, `pricingRules` | nincs | I05 | `dealer` | Háttér, marad |
| I08 | Admin árszerkesztő (helyi) | `?admin=1` mellett árak szerkesztése a böngészőben | `Dialogs` (`PriceSettingsDialog`) | nincs | I05 | `prices` | Döntés: kell-e még |
| I09 | Szerveroldali újraárazás | A lead beküldésekor a szerver újraszámol | `server/lead.ts` | nincs | I05 | – | Háttér, marad |

## J – Döntéstámogatók

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| J01 | Tanácsadó | 4 kérdés → javasolt pergola + bútor, indoklással | `AdvisorDialog.tsx`, `lib/advisor.ts` | közvetlen (teljes csere) | B–H | `modal` | A konfig-modulok után |
| J02 | Költségkeret-tervező | Keretösszegből a beleférő terv | `BudgetDialog.tsx`, `lib/budget.ts` | közvetlen | B–H, I05 | – | – |
| J03 | Üzemeltetési költség | Éves áramköltség valós lakossági tarifával (csak HUF) | `EnergyDialog.tsx`, `lib/energy.ts` | nincs | H | `energyUsage` | H után |
| J04 | Javaslatok | Beállításfüggő magyarázó javaslatok | `lib/advice.ts`, `SummaryPanel` | nincs | B–H | – | – |
| J05 | Figyelmeztetés + javítás | Lásd B07 | – | – | – | – | – |
| J06 | Tanácsadó kártya | A Típus lépés tetején | Controls (`AdvisorCard`) | nincs | J01 | – | J01-gyel |

## K – Összegzés, mentés, megosztás, export

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| K01 | Összegzés lépés | A terv neve, fő adatok, javaslatok, gombok, űrlap | `SummaryPanel.tsx` | jelenet (körbeforgó kamera) | B–I | `projectName` | – |
| K02 | PDF-összefoglaló | 4 oldal: látványterv, anyaglista, tételes ár, méretarányos rajz, QR | `lib/exportPdf.ts`, `lib/pdfDocument.ts`, `lib/drawing.ts` | jelenet (pillanatkép) | I05 | – | – |
| K03 | Márkázott kép | 1080 × 1350 kép árral, „a családnak” | `lib/showcase.ts` | jelenet | I05 | – | – |
| K04 | Körbejáró videó | ~10 s MP4/WebM | `lib/turntableVideo.ts` | jelenet | – | – | IGAZOLANDÓ (valódi iPhone, Android) |
| K05 | Visszavonás / újra | 40 lépés, csúszkánál összevonva; Ctrl/Cmd+Z, Y | PergoStudio (`history`) | közvetlen | – | `history` ref | Korán, mert minden modul használja |
| K06 | Alaphelyzet | Megerősítés után az alapkonfiguráció (a ház marad) | `Dialogs` (`ResetDialog`) | közvetlen | – | – | – |
| K07 | Megosztó link | Az egész terv egy rövid hash-ben (`#c=`), vágólapra | `lib/shareCode.ts`, `lib/config.ts` | nincs | – | URL hash | – |
| K08 | Piszkozat | A terv böngészőnként automatikusan mentődik | `lib/config.ts` (`persistConfig`) | nincs | – | localStorage | Háttér, marad |
| K09 | Visszatérő látogató | „Folytatod?” ajánlat a piszkozatból | `StudioChrome` (`WelcomeBack`) | nincs | K08 | – | – |
| K10 | A/B változatok | Két mentett változat képpel és árral, összehasonlító csúszka | `SummaryPanel` (`CompareSlider`) | jelenet (pillanatkép) | I05 | localStorage | – |
| K11 | Szöveg másolása | A terv szöveges összefoglalója vágólapra | `SummaryPanel` | nincs | I05 | – | – |

## L – Ajánlatkérés és adatbekérés

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| L01 | Felmérési űrlap | Kötelező: név, telefon vagy e-mail, település; nem kötelező: megye, irányítószám, cím, megjegyzés; adatkezelési hozzájárulás | `LeadForm.tsx`, `lib/leadValidation.ts`, `lib/privacyVersion.ts` | nincs | I05 | – | – |
| L02 | Beküldés | Szerveroldali ellenőrzés és újraárazás, e-mail a gyártónak (Resend), mentés (Supabase) | `server/lead.ts` | nincs | L01 | – | Háttér, marad |
| L03 | Köszönőképernyő | Azonosító, időpontfoglaló link (ha a gyártó megadta) | `LeadForm`, `lib/booking.ts` | nincs | L02 | – | – |
| L04 | Lead-pontozás | Viselkedési jelek (PDF, AR, megosztás, visszatérés stb.) a kérelemmel | `lib/engagement.ts`, `lib/leadScore.ts` | nincs | L02 | sessionStorage | Háttér, marad |
| L05 | Bővítési kérés | Tulajdonosi oldalról: csak a különbözet ára | `LeadForm`, `lib/expansion.ts` | nincs | O02 | – | O02-vel |
| L06 | Előnézeti mód | Bemutató buildben nem küld | `LeadForm` | nincs | – | – | – |

## V – Nézet és jelenet-beállítások

A 3D feletti „Nézet” panel és a kameragombsor. A **kamera forgatása, nagyítása, mozgatása** a 3D-hez tartozik (Z), nem ide.

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| V01 | Kameranézetek | Kívülről · alulról · felülről · részlet · kanapé (carportnál nincs kanapé) | `studio/CameraViewMenu.tsx`, `lib/cameraViews.ts` | jelenet | – | `view` | Korán: a 3D vizsgálatához is kell |
| V02 | Napszak | Csúszka 6–23 óra + nappal / aranyóra / éjszaka gombok | `SceneSettingsPanel`, `StudioChrome` (gyorsváltó) | jelenet | – | `time`, `dayTime` | – |
| V03 | Napirány | 0–360° | `SceneSettingsPanel` | jelenet | – | `sunDirection` | – |
| V04 | Bútorcsomag | 17 csomag 3 csoportban (otthon, konyha-étkezés, vendéglátás), helyigény-ellenőrzéssel | `FurniturePicker.tsx`, `lib/furniture.ts`, `lib/usePacks.ts` | jelenet | C | `scene.furniture` | – |
| V05 | 180 cm-es figura | Méretérzékeltetés | `SceneSettingsPanel` | jelenet | – | `showPerson` | – |
| V06 | Méretcímkék | Méretek cm-ben a 3D-ben | `SceneSettingsPanel`, Scene (`DimensionGuides`) | jelenet | – | `showDimensions` | – |
| V07 | Műszaki jelölések | Hotspotok és SB 400 adatkártyák | Scene (`Hotspots`), `lib/sb400Details.ts` | jelenet | D01 | `showHotspots` | – |
| V08 | Feliratok a 3D-ben | Kattintási tippek, Működés-címkék | Scene, `LouvreRoof` | jelenet | – | `labels` | – |
| V09 | Automata forgatás | Koppintásra megáll | Scene (`CameraController`, `TurntableDriver`) | jelenet | – | `autoRotate` | – |
| V10 | Követő kamera | A kamera a választáshoz fordul | PergoStudio (`reactToChange`, `goStep`) | jelenet | – | `autoCamera` | – |
| V11 | 3D minőség | Automatikus · ultra · magas · közepes · alacsony; figyelmeztetés gyenge gépen | `SceneSettingsPanel`, `lib/quality.ts` | jelenet | – | `quality` | – |
| V12 | Bemutató eszköz mód | Fix ultra minőség az üzletkötő tabletjén | `DemoDevicePanel.tsx`, `lib/demoDevice.ts` | jelenet | V11 | localStorage | – |
| V13 | Robbantott nézet (kapcsoló) | Lásd N05 | – | – | – | – | – |
| V14 | Forgatási tipp | Első alkalommal „Húzd a forgatáshoz” | PergoStudio (`rotateHint`) | nincs | – | localStorage | – |

## N – Bemutató eszközök

| ID | Funkció | Működés, lehetőségek | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| N01 | Árnyékelemzés | Valós napállás irányítószám, tájolás, dátum és óra szerint; árnyékmérés | `SunStudyPanel.tsx`, `ShadeProbe.tsx`, `lib/sun.ts`, `lib/sunSite.ts` | jelenet | – | `sunStudy`, `sunDate`, `sunHour`, `site`, `facing` | – |
| N02 | Esti hangulat panel | Éjszaka: LED-fényerő, színhőmérséklet, fűtés, ventilátor | `MoodPanel.tsx` | közvetlen | H | `ledLevel`, `ledKelvin`, `heatersOn`, `fanOn` | JAVÍTANDÓ: más eszköznél is nyitva marad; két különböző fűtésár |
| N03 | Fotóba helyezés | Saját teraszfotó háttérnek, mozgatás, méret, forgatás, dőlés, látószög; csak a böngészőben tárolva | `PhotoBar.tsx`, `PhotoRig.tsx`, `lib/photoPlacement.ts`, `lib/photoStore.ts` | jelenet (átlátszó háttér) | – | `photoMode`, `photoUrl`, `photoX…photoLens` | – |
| N04 | Működés-bemutató | Lamellahajtás mozgásban SB 400 adatokkal (csak lamellás tetőnél) | `MechanismPanel.tsx`, `lib/louvreSystem.ts`, `LouvreRoof` | közvetlen | D01 = Aero | `mechanism` | – |
| N05 | Robbantott nézet | A szerkezeti elemek szétválnak | Scene (`ExplodePart`) | közvetlen | – | `exploded` | – |
| N06 | Eső | Eső be/ki; szenzorral a tető zár | Scene (`Rain`), PergoStudio | jelenet | H06 | `rain` | – |
| N07 | Bejárás | Első személy 175 cm-en, joystick és billentyű, ütközéssel | `WalkOverlay.tsx`, `WalkController.tsx`, `lib/walkArea.ts`, `lib/walkInput.ts` | jelenet | – | `walking` | – |
| N08 | AR | iOS AR Quick Look, Android WebXR; asztalon QR-kód | `ArDialog.tsx`, `lib/arExport.ts`, `lib/arSupport.ts` | jelenet (GLB-export) | – | `arPath` | IGAZOLANDÓ valódi eszközön |
| N09 | Eszközsáv | Gyorsgombok (bejárás, eső, AR) és eszközlista | `StudioChrome` (`SceneToolbar`) | – | N01–N08 | – | A sáv maga keret, az eszközök egyenként jönnek |
| N10 | Kanapé-panoráma tipp | Kanapé nézetben magyarázó sor | PergoStudio (`pov-note`) | nincs | V01 | – | V01-gyel |
| N11 | Ügyfél-bemutató mód | A panelek eltűnnek, csak a 3D és egy felirat; ESC vissza | `studio/studioState.ts` (`usePresentation`) | jelenet | – | `presentation` | – |

## O – Különleges módok

| ID | Funkció | Működés | Fájl | 3D | Függ | Adat | Visszaépítéskor |
|---|---|---|---|---|---|---|---|
| O01 | Modulház | Saját modell, lépések, ár és nézetek ugyanazon a vásznon (A45); a „Mit építesz?” választóból | `useModularStudio.tsx`, `ModularHouseScene.tsx`, `ModularHouseControls.tsx`, `src/products/modularHouse.ts` | közvetlen (modellcsere) | B01 | `modularMode`, localStorage | Önálló modul, a pergola-modulok után |
| O02 | Bővítési mód | A tulajdonosi oldalról: a meglévő szerkezet zárolt, csak hozzáadni lehet | `lib/expansion.ts`, `lib/installations.ts` (`clampExpansion`), Controls (`LOCKED_STEPS`) | közvetlen | E, H, L | sessionStorage | A végén |
| O03 | Carport | Az építménytípusból: autók, saját nézetek | B01, Scene (`CarportCars`) | közvetlen | B01 | – | B01-gyel |
| O04 | Félretett termékcsaládok | Kerítés/kapu, garázskapu, kerti ház: a kódban van, a felületen rejtett | `src/products/*`, `CatalogScene`, `GarageScene` | – | – | – | REJTETT, a lecsupaszítás nem érinti |

## P – Mérés és háttérfolyamatok

| ID | Funkció | Működés | Fájl | Megjegyzés |
|---|---|---|---|---|
| P01 | Névtelen konverziómérés | Megnyitás, első módosítás, PDF, AR, megosztás | `lib/analytics.ts` | Lecsupaszított módban kikapcsolandó (lásd a tervet) |
| P02 | Lépésenkénti lemorzsolódás, betöltési idő | Eseményenként egyszer | `lib/funnelEvents.ts` | Mint P01 |
| P03 | Viselkedési jelek a leadhez | Lépések, idő, visszatérés | `lib/engagement.ts` | Mint P01 |
| P04 | Gyártói adatok betöltése | Az admin beállításai max. 1,5 s várakozással | `TenantStudio.tsx` | Marad |
| P05 | Offline / webapp | Service worker, frissítési kártya, telepítés | `lib/swClient.ts`, `SwUpdateBanner.tsx` | Marad, nem konfigurátor-UI |

---

## Z – A 3D modell és jelenet (a lecsupaszítás után is megmarad)

| ID | Elem | Fájl | Megjegyzés |
|---|---|---|---|
| Z01 | Vászon, renderelő, árnyék, utófeldolgozás | `PergolaScene.tsx` (`SceneContent`), `SceneEffects.tsx`, `lib/quality.ts` | Automatikus minőség, teljesítmény-védőháló (`FrameGovernor`) |
| Z02 | Pergola modell | `PergolaModel`, `LouvreRoof`, `lib/sb400.ts`, `lib/louvreSystem.ts` | A konfigurációból épül; alapkonfigurációval jelenik meg |
| Z03 | Anyagok | Porszórt bevonat (5.03), fa, üveg, PBR textúrák (`public/assets`) | – |
| Z04 | Környezet | Ég (HDR), talaj, kert, ház, ciklorama | `Ground`, `Garden`, `House`, `Cyclorama`; a G01 alapértéke dönti el |
| Z05 | Kamera | Forgatás, nagyítás, mozgatás (egér, érintés), keretezés, átmenetek | `CameraController`, `lib/desktopCamera.ts`, `lib/cameraFit.ts` |
| Z06 | Betöltés | Nyitó animáció, poszter, fokozatos betöltés, WebGL-hiba esetén rajz | `IntroSceneGate`, `ScenePoster`, `FallbackDrawing`, `lib/progressiveStage.ts` |
| Z07 | Kimerevítés | `?freeze=` (4.96) | `lib/sceneClock.ts` |
