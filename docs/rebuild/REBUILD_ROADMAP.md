# Lamelix konfigurátor – újraépítési terv (hivatalos útvonal)

> Állapot: 2026-11-18 · `main` @ `f99acce` (5.03) · alap: `FEATURE_INVENTORY.md` (129 funkció), `DEPENDENCY_MAP.md`.
> A modulkódok (M00–M19) ebben a tervben, a funkciókódok (A01, C02…) a leltárban élnek. Minden modul végén frissül a `PROGRESS_TRACKER.md`.

## 0. Szabályok minden modulra

1. **Egyszerre egy modul.** A következő csak Ádám jóváhagyása után indul.
2. **Ádám dönt:** mely funkciók jönnek vissza, milyen lehetőségekkel, hol, hogyan néznek ki és működnek. Saját design- vagy funkciódöntést nem hozok; ahol technikai döntés kell, röviden leírom a lehetőségeket, és kérdezek.
3. **Minden modul menete:** (1) bemutatom a modult és a hozzá tartozó meglévő funkciókat, (2) Ádám kiválasztja, mi jön vissza, (3) egyeztetjük a lehetőségeket, (4) az elrendezést és a kinézetet, (5) csak azt építem meg, (6) tesztelem, (7) frissítem a dokumentációt és a haladási listát, (8) várok a jóváhagyásra.
4. **Az éles felület nem változik.** Minden új elem csak az újraépítési módban (`?mod=ujraepites`) látszik, amíg a M19 át nem kapcsolja.
5. **Újrahasznosítás:** ahol a meglévő komponens vagy logika megfelel Ádám döntésének, azt használom, nem írok újat.
6. **Minden modul után kötelező:** lint, típusellenőrzés, tesztek, build; a 3D önálló ellenőrzése (lásd 3. pont); `docs/VALTOZASOK.md` bejegyzés; deploy READY; az éles felület változatlanságának ellenőrzése.

## 1. A sorrend és az indoklás

| Kód | Modul | Leltár | Mire épül | Miért itt |
|---|---|---|---|---|
| **M00** | Lecsupaszítás: újraépítési mód, csak a 3D | Z, minden UI rejtve | – | Az alap |
| **M01** | Panelkeret és lépésnavigáció | A01–A03, A05, A06, A12 | M00 | Ide kerül minden további modul |
| **M02** | Elhelyezés (rögzítés) | C01, G06 | M01 | A geometria alapja: oszlopok, fal, ház |
| **M03** | Méretek és modulok | C02–C07 | M02 | A rögzítés után van értelme |
| **M04** | Visszavonás, újra, alaphelyzet | K05, K06, A07 (részben) | M01 | Az első szerkeszthető mezők után mindenhol kell |
| **M05** | Élő ár és kalkuláció | I01–I05, I08, A04 | M03 | Innentől minden modul ára azonnal látszik |
| **M06** | Tetőrendszer és tetőmozgatás | D01, D02, D04, D05 | M03 | A tető a méretre épül |
| **M07** | Tetőelemek | D06–D08 | M06 | Tetőfüggő mezők |
| **M08** | Oldalzárások | E01–E07 | M02, M06 | A fal a rögzítéstől és a dőléstől függ |
| **M09** | Szerkezet- és tetőszín | F01–F03, F06 | M06 | A kéttónusú szín tetőfüggő |
| **M10** | Ház és környezet | G01–G05, F05 | M02, M09 | A ház a rögzítéshez és a színhez igazodik |
| **M11** | Komfort és vezérlés | H01–H08, J03 | M06, M08 | A szenzor és a fűtés tető-/oldalfüggő |
| **M12** | Építménytípus: veranda, télikert, carport | B01–B07, O03 | M06, M08, M11 | Ezek mezőit kényszerből átírja (`DEPENDENCY_MAP` 5.1) |
| **M13** | Nézet és jelenet-beállítások | V01–V12, V14, A09, A10 | M00 | Független, de a teljes jelenethez illeszkedik |
| **M14** | Összegzés, mentés, megosztás, export | K01–K04, K07, K09–K11 | M05 | Az árat és a teljes tervet foglalja össze |
| **M15** | Ajánlatkérés | L01–L04, L06, I06 | M14 | Az összegzés végén |
| **M16** | Bemutató eszközök | N01–N11, D03, F04, V13 | M06, M11, M13 | Egyenként, eszközönként jóváhagyva |
| **M17** | Döntéstámogatók | B08, J01, J02, J04–J06 | M03–M12 | Teljes tervet állítanak be (`DEPENDENCY_MAP` 5.4) |
| **M18** | Különleges módok: modulház, bővítés | O01, O02, L05 | M12, M15 | Külön motor, illetve zárolt mód |
| **M19** | Élesítés és takarítás | – | mind | Az új felület lesz az alapértelmezett |

A háttérfunkciók (I05 árszámítás, I07 viszonteladói ár, I09 szerveroldali újraárazás, K08 piszkozat, L02 beküldés, P04 gyártói adatok, P05 webapp) **nem** rejtődnek el, mert nincs saját felületük; a hozzájuk tartozó modullal válnak láthatóvá.

## 2. Modulok részletesen

### M00 – Lecsupaszítás: újraépítési mód, csak a 3D

**Feladatok**
1. Visszaállítási pont: `git tag rebuild-alap-2026-11-18` a mostani `main`-re, push a tagre. A munkakönyvtár tiszta-e (ellenőrzés).
2. `src/lib/rebuildMode.ts`: az újraépítési mód felismerése (`?mod=ujraepites`), és egy modulregiszter (`M01…M18 → látható-e`). Élesben (paraméter nélkül) minden a mai módon jelenik meg, a regiszter nem hat.
3. `PergoStudio`: újraépítési módban:
   - a konfiguráció a gyártó alaptervéből indul (nem a böngésző piszkozatából vagy linkből), és **nem írja felül** a mentett piszkozatot;
   - nem küld mérést (P01–P03), nem nyit AR-ablakot `?ar=1`-re;
   - elrejti: fejléc, oldalpanel tartalma, mobil alsó lap és ársáv, eszközsáv, minden lebegő panel és felugró ablak, értesítések, címsor és lábléc a 3D-n, visszatérő látogató, forgatási tipp, bővítési sáv, esőautomata-jelzés, esti hangulat panel, kanapé-tipp, ügyfél-bemutató felirat, kezdőlap-link;
   - a 3D-ben kikapcsolja: oldalkijelölés kattintásra, hotspotok, 3D-feliratok (kattintási tippek).
4. Megmarad: a 3D vászon, a betöltés (nyitó animáció, poszter), a kamera kezelése (forgatás, nagyítás, mozgatás), az automatikus minőség, a jelenlegi elrendezés kerete (a döntés szerint).
5. Teszt: `tests/rebuildMode.test.ts` – a paraméter felismerése; paraméter nélkül minden modul látható (az éles felület változatlan); újraépítési módban egyik sem.

**Érintett fájlok:** `src/lib/rebuildMode.ts` (új), `src/pages/PergoStudio.tsx`, `src/components/PergolaScene.tsx` (csak a kattintás és a feliratok kapcsolója), `src/index.css` vagy `src/studio-float.css` (csak ha a panelkeret üresen marad), `tests/rebuildMode.test.ts` (új).
**Nem változik:** semmilyen komponens, állapot, függvény, árazás, szabály, adatstruktúra törlése nélkül.

**Ádám döntései az M00 előtt**
1. Az üres panelkeret maradjon a helyén (az elrendezés megmarad, a 3D a mai helyén), vagy a 3D töltse ki az egész képernyőt?
2. A 3D-n belüli kattintások (oldal kijelölése, üveg/ajtó nyitása) legyenek kikapcsolva? Javaslat: igen, az oldalak modulja (M08) hozza vissza őket.
3. Kiinduló terv: a gyártó alapterve (javaslat), vagy a böngészőben mentett utolsó terv?

**Tesztelési ellenőrzőlista**
- [ ] `/konfigurator?mod=ujraepites` asztalon (1440 × 900) és telefonon (390 × 844, fekvő is): csak a 3D látszik.
- [ ] A 3D betölt, forgatható, nagyítható, mozgatható; konzolhiba nincs.
- [ ] `?mod=ujraepites&freeze=2` két betöltése azonos képet ad.
- [ ] `/konfigurator` (paraméter nélkül) képernyőképe megegyezik a módosítás előttivel.
- [ ] A mentett piszkozat az újraépítési mód megnyitása után is érintetlen.
- [ ] Nincs mérési esemény újraépítési módban (hálózati napló).
- [ ] Kapu zöld, deploy READY.

**Kész, ha:** a fenti lista minden pontja teljesül, és Ádám jóváhagyta.

---

A további modulok szerkezete azonos. A **feladatlista** mindig ugyanaz a 8 lépés (0. pont 3.); az alábbiak a modulspecifikus részek. A „Feladatok” sor a modul tartalmi alfeladatai, amelyekből Ádám választ.

### M01 – Panelkeret és lépésnavigáció
- **Feladatok:** panelkeret (asztal, telefon alsó lap, fekvő telefon oldalsáv) · lépésfülek csak a már visszaépített lépésekkel · Vissza / Következő · panelszélesség húzással · értesítések (toast).
- **Fájlok:** `ConfiguratorControls.tsx` (keret, `useSheetGesture`, `panel-dock`), `src/lib/configSteps.ts`, `studio/PanelResizer.tsx`, `src/lib/panelResize.ts`, `src/lib/viewport.ts`, PergoStudio (`sheet`, `step`, `toast`).
- **Döntések:** a panel helye és kinézete; a lépések neve és sorrendje; mobilon alsó lap vagy más megoldás; a stílusváltozatok (`soft`, `glass`, `studio`, `light`) közül melyik marad.
- **Tesztek:** a lépésváltás a 3D-t nem rontja (kamera, minőség); 375, 390, 768, 1024, 1440 px; fekvő telefon; billentyűzetes bejárhatóság.
- **Kész, ha:** üres lépésekkel is működő, Ádám által jóváhagyott keret.

### M02 – Elhelyezés (rögzítés)
- **Feladatok:** 5 rögzítési mód (gyártónként szűrve), ikonok, a ház és a házszárny a 3D-ben.
- **Fájlok:** Controls (`mount-options`, `MountIcon`), `src/lib/mount.ts`, Scene (`WallAttachment`, `SideWallAttachment`, `House`, `HouseWings`), `src/lib/sceneLayout.ts`.
- **Tesztek:** minden rögzítésnél helyes oszlopszám és fal (`mount.test.ts`); a ház nem metszi a pergolát; kamera-keretezés.
- **Kész, ha:** mind az 5 mód (vagy a kiválasztottak) helyesen jelenik meg a 3D-ben.

### M03 – Méretek és modulok
- **Feladatok:** szélesség, mélység, oszlopmagasság (csúszka + cm-mező), 1–4 modul, középoszlop-figyelmeztetés, méretjavaslat.
- **Fájlok:** Controls (`SliderField`, modulválasztó), `src/lib/modules.ts`, `src/lib/specification.ts`, `tenant.limits`.
- **Tesztek:** a gyártói korlátokat betartja; modulnál a teljes szélesség helyes; a 3D és a kamera követi; a gyors csúszkahúzás nem akad.
- **Kész, ha:** minden méret a gyártói korláton belül állítható, és a 3D hibátlanul követi.

### M04 – Visszavonás, újra, alaphelyzet
- **Feladatok:** visszavonás és újra (gomb, Ctrl/Cmd+Z/Y), csúszkánál összevont lépés, alaphelyzet megerősítéssel.
- **Fájlok:** PergoStudio (`history`, `undo`, `redo`), `studio/StudioChrome.tsx` (`StudioHeader`), `Dialogs.tsx` (`ResetDialog`).
- **Tesztek:** 40 lépés; szövegmezőben a böngésző saját visszavonása marad; az alaphelyzet a házat nem állítja vissza.
- **Kész, ha:** minden addig visszaépített mező visszavonható.

### M05 – Élő ár és kalkuláció
- **Feladatok:** élő bruttó ár, részletes kalkuláció (nettó, ÁFA, bruttó, tételes sorok), változásjelző visszavonással, mobil ársáv „Tovább” gombbal, havi részletpélda (kell-e?), helyi árszerkesztő `?admin=1` (kell-e?).
- **Fájlok:** `studio/PanelPrice.tsx`, `PricePanel.tsx`, `studio/StudioChrome.tsx` (`ChangePill`), PergoStudio (`mobileBar`, `delta`, `change`), `src/lib/pricing.ts` (változatlan).
- **Tesztek:** az ár egyezik a szerver újraszámolásával (`lead.test.ts`, `priceMatrix.test.ts`); HUF és EUR; az ár nem ugrik betöltéskor.
- **Kész, ha:** az ár minden visszaépített mező változását azonnal és helyesen mutatja.

### M06 – Tetőrendszer és tetőmozgatás
- **Feladatok:** 6 tetőrendszer (gyártónként szűrve, átnevezhető), lamellaszög vagy tetőnyitás, tetődőlés, tetőváltás memóriája.
- **Fájlok:** Controls (`RoofPicker`, `RoofControl`, `RoofIcon`), `src/lib/roofs.ts`, Scene (`RoofSwap`, `LouvreRoof`, `GlazedRoof`, `FabricRoof`, `Tilt`), PergoStudio (`roofStash`).
- **Tesztek:** minden tető megjelenik; a lamellák ütközésmentesek (`louvreClearance.test.ts`); a dőlés a falakat helyesen emeli.
- **Kész, ha:** minden kiválasztott tető helyesen jelenik meg és mozog.

### M07 – Tetőelemek
- **Feladatok:** üvegezés (5), tetőárnyékoló (felett/alatt, 4 ponyvaszín, kihúzás), napelemes tető.
- **Fájlok:** Controls (`GlazingPicker`, `SolarToggle`), `SideAndExtras.tsx` (`RoofShadeOption`), `src/lib/roofShade.ts`, `src/lib/solar.ts`, Scene (`RoofShadeModel`), `SceneExtras.tsx`.
- **Tesztek:** csak illő tetőnél választható (`normalizeConfig`); a 3D és az ár követi.

### M08 – Oldalzárások
- **Feladatok:** oldalválasztó (ábra és 3D-kattintás), 10 oldaltípus, osztott oldal, ajtó tükrözése, ZIP nyitottság, nyitás a 3D-ben, oldalcsík.
- **Fájlok:** `SideAndExtras.tsx` (`SideSettings`, `SideIcon`, `SideStrip`), Controls (`SideDiagram`), `src/lib/sides.ts`, `src/lib/mechanics.ts`, Scene (`SidePlacement` és a fal-komponensek), `src/lib/clearance.ts`.
- **Tesztek:** ajtó-ütközésvizsgálat (`doorClearance.test.ts`, ~6000 konfiguráció); falas oldal nem zárható; a kamera az oldalra fordul.

### M09 – Szerkezet- és tetőszín
- **Feladatok:** alapszínek, RAL-katalógus kereséssel (81 szín, 7 csoport), egyedi kód, kéttónusú kivitel, színlap fülek.
- **Fájlok:** `ColorPicker.tsx`, `src/lib/colors.ts`, `src/lib/powderCoat.ts`, Scene (`getCoat`, `useColorFade`).
- **Tesztek:** a felár csak nem alapszínnél; a 3D szín a RAL-értéknek felel meg.

### M10 – Ház és környezet
- **Feladatok:** környezet (családi ház / csak a termék), háztípus (3), homlokzat anyaga és színe, ablakszín, ablakhoz igazított pergolaszín, ház memória.
- **Fájlok:** `HouseLook.tsx`, `src/lib/house.ts`, Controls (`SceneSettingsPanel` megfelelő része, `HouseContext`), Scene (`House`, `StyledHouse`).
- **Tesztek:** a háztípus-váltás stúdióból a családi házra vált (`houseStylePatch.test.ts`); a ház nem metszi a pergolát.

### M11 – Komfort és vezérlés
- **Feladatok:** LED, RGB, hangrendszer, fűtés (darab), ventilátor, szenzor, okosotthon, üzemeltetési költség.
- **Fájlok:** Controls (`extras` lépés), `SideAndExtras.tsx` (`RgbOption`, `FanOption`, `SmartHomeOption`), `src/lib/comfort.ts`, `src/lib/fans.ts`, `src/lib/energy.ts`, `EnergyDialog.tsx`.
- **Tesztek:** a szenzor csak mozgó tetőnél vagy ZIP-nél; a fűtés ára egységesen jelölve (a 2026-11-17-i #5 hiba ne térjen vissza).

### M12 – Építménytípus
- **Feladatok:** pergola, veranda, télikert, carport (a modulház az M18-ban), falüvegezés, klíma, alap, engedélyezési figyelmeztetés, szabályok és egy kattintásos javítás.
- **Fájlok:** `BuildingControls.tsx`, `src/lib/buildings.ts`, `src/lib/issueFixes.ts`, `configSteps.ISSUE_STEP`, PergoStudio (`buildingStash`).
- **Tesztek:** oda-vissza váltásnál a korábbi tető és oldalak visszajönnek (`buildings.test.ts`); a figyelmeztetés csak a saját lépésében jelenik meg.

### M13 – Nézet és jelenet-beállítások
- **Feladatok:** kameranézetek, napszak, napirány, bútorcsomag (17), figura, méretcímkék, műszaki jelölések, 3D-feliratok, automata forgatás, követő kamera, 3D minőség, bemutató eszköz mód, forgatási tipp, címsor és lábléc a 3D-n.
- **Fájlok:** Controls (`SceneSettingsPanel`), `FurniturePicker.tsx`, `src/lib/furniture.ts`, `src/lib/usePacks.ts`, `studio/CameraViewMenu.tsx`, `studio/StudioChrome.tsx` (`SceneToolbar`), `DemoDevicePanel.tsx`, `src/lib/quality.ts`.
- **Tesztek:** minőségi szintek váltása; bútor-helyigény (`furnitureLayout.test.ts`, `furniture-sets.test.ts`); minden nézet keretezése.

### M14 – Összegzés, mentés, megosztás, export
- **Feladatok:** összegzés lépés, a terv neve, PDF, márkázott kép, körbejáró videó, megosztó link, visszatérő látogató, A/B változatok, szöveg másolása.
- **Fájlok:** `SummaryPanel.tsx`, `src/lib/exportPdf.ts`, `src/lib/pdfDocument.ts`, `src/lib/drawing.ts`, `src/lib/showcase.ts`, `src/lib/turntableVideo.ts`, `src/lib/shareCode.ts`, `studio/StudioChrome.tsx` (`WelcomeBack`).
- **Tesztek:** a PDF-ben a pergola középen van (2026-11-17 #4); a link oda-vissza kódolás (`share.test.ts`); videó valódi iPhone-on és Androidon (IGAZOLANDÓ).

### M15 – Ajánlatkérés
- **Feladatok:** felmérési űrlap, regionális felár, beküldés, köszönőképernyő időpontfoglalással, lead-pontozás, előnézeti mód.
- **Fájlok:** `LeadForm.tsx`, `src/lib/leadValidation.ts`, `src/lib/booking.ts`, `src/lib/engagement.ts`, `src/lib/leadScore.ts`, `server/lead.ts` (változatlan).
- **Tesztek:** a szerver újraáraz és elutasítja a hamis árat; a hozzájárulás naplózódik; éles tesztlead a demó gyártónál.
- **Megjegyzés:** az újraépítési módban a beküldés a demó gyártónál valódi leadet hoz létre. Ádám dönti el, hogy ezt engedjük, vagy előnézeti módban marad.

### M16 – Bemutató eszközök
- **Feladatok (eszközönként külön jóváhagyással):** árnyékelemzés és okos lamella · esti hangulat · fotóba helyezés és szín a fotóról · működés-bemutató · robbantott nézet · eső · bejárás · AR · eszközsáv · ügyfél-bemutató mód · kanapé-tipp.
- **Fájlok:** `SunStudyPanel.tsx`, `ShadeProbe.tsx`, `MoodPanel.tsx`, `PhotoBar.tsx`, `PhotoRig.tsx`, `MechanismPanel.tsx`, `WalkOverlay.tsx`, `WalkController.tsx`, `ArDialog.tsx` és a hozzájuk tartozó `src/lib` modulok.
- **Tesztek:** egyszerre csak egy eszköz nyitott (a 2026-11-17 #3 hiba ne térjen vissza); valódi eszközös próba (AR, fotó).

### M17 – Döntéstámogatók
- **Feladatok:** kiinduló csomagok, tanácsadó (és kártyája), költségkeret-tervező, javaslatok.
- **Fájlok:** Controls (`preset-list`, `AdvisorCard`), `AdvisorDialog.tsx`, `src/lib/advisor.ts`, `BudgetDialog.tsx`, `src/lib/budget.ts`, `src/lib/advice.ts`.
- **Tesztek:** csak látható mezőket állítanak be; a tanácsadó javaslata a gyártói kínálaton belül marad.

### M18 – Különleges módok
- **Feladatok:** modulház (saját modell, lépések, ár), bővítési mód a tulajdonosi oldalról, bővítési kérés.
- **Fájlok:** `useModularStudio.tsx`, `ModularHouseScene.tsx`, `ModularHouseControls.tsx`, `src/products/modularHouse.ts`, `src/lib/expansion.ts`, `src/lib/installations.ts`.
- **Tesztek:** a modulház és a pergola közti váltás megőrzi a pergola tervét; bővítésnél a zárolt lépések nem szerkeszthetők.

### M19 – Élesítés és takarítás
- **Feladatok:** (1) az új felület lesz az alapértelmezett, a régi a `?mod=regi` paraméterrel még elérhető (biztonsági háló); (2) éles ellenőrzés a demó és a valódi gyártói oldalakon, beágyazásban is; (3) Ádám jóváhagyása után a régi felület és a kapcsoló eltávolítása külön commitban.
- **Tesztek:** teljes regresszió (egységtesztek, böngészős tesztek, kézi próba asztalon és telefonon); a beágyazó kód változatlanul működik.
- **Kész, ha:** élesben az új felület fut, és a régi eltávolítása után is minden teszt zöld.

## 3. A 3D önálló ellenőrzése (minden modul után)

1. `/konfigurator?mod=ujraepites`: a 3D betölt, nincs konzolhiba.
2. Forgatás, nagyítás, mozgatás egérrel és érintéssel.
3. A modul minden új beállítása azonnal és helyesen látszik a 3D-ben; a kamera nem ugrik.
4. `?freeze=` képpár: a módosítás előtti és utáni kép csak a várt részen tér el.
5. A teljesítmény nem romlik (a minőségi szint nem lép vissza magától).
6. Az éles `/konfigurator` (paraméter nélkül) változatlan.
