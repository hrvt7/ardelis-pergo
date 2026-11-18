# Lamelix konfigurátor – haladási lista

> A dokumentációt minden modul után frissítem. Állapotok: `NEM INDULT` · `DÖNTÉSRE VÁR` (Ádám választ) · `FOLYAMATBAN` · `JÓVÁHAGYÁSRA VÁR` (kész, ellenőrzésre vár) · `KÉSZ` (Ádám jóváhagyta).

## Összkép

| Fázis | Állapot | Dátum |
|---|---|---|
| 1. Teljes technikai audit (`FULL_AUDIT.md`) | JÓVÁHAGYÁSRA VÁR | 2026-11-18 |
| 2. Funkcióleltár (`FEATURE_INVENTORY.md`, 129 funkció) | JÓVÁHAGYVA | 2026-11-18 |
| 3. Függőségi térkép (`DEPENDENCY_MAP.md`) | JÓVÁHAGYVA | 2026-11-18 |
| 4. Újraépítési terv (`REBUILD_ROADMAP.md`, M00–M19) + lépés-architektúra (`STEP_ARCHITECTURE.md`) | JÓVÁHAGYVA | 2026-11-18 |
| 5. Dokumentáció a repóban (`docs/rebuild/`) | KÉSZ | 2026-11-18 |
| 6. Visszaállítási pont | KÉSZ: `rebuild-alap-2026-11-18` ág a `25f586c` commiton (git tagot a proxy nem enged pusholni, ezért ág) | 2026-11-18 |
| 7. Lecsupaszítás (M00) | KÉSZ, JÓVÁHAGYÁSRA VÁR | 2026-11-18 |
| 8. A 3D önálló tesztje | KÉSZ (lásd napló) | 2026-11-18 |

## Modulok

| Kód | Modul | Állapot | Ádám döntése | Megjegyzés |
|---|---|---|---|---|
| M00 | Lecsupaszítás | KÉSZ | D1–D3 | `?mod=ujraepites`: teljes képernyős 3D, a gyártó alaptervéből, mérés és böngészőírás nélkül, 3D-kattintások ki (5.06) |
| M01 | Panelkeret és lépésnavigáció | KÉSZ | D8 | Gyűrűs lépéssáv a lépéskártya tetején (asztal) / a lap tetején (telefon), folyékony üveg kártya (5.07–5.11) |
| M02 | Elhelyezés | KÉSZ | D9 | A 2. lépésben (Hely és méret), 5.12 |
| M03 | Méretek és modulok | KÉSZ | D9 | A 2. lépésben (Hely és méret), 5.12 |
| M04 | Visszavonás, újra, alaphelyzet | NEM INDULT | – | |
| M05 | Élő ár és kalkuláció | KÉSZ, JÓVÁHAGYÁSRA VÁR | D4, D5 | Ársáv felül jobbra + Részletek (5.14); hátra: gyártónkénti ármód-kapcsoló (új admin-beállítás) |
| M06 | Tetőrendszer és tetőmozgatás | KÉSZ, JÓVÁHAGYÁSRA VÁR | D7 | A 3. lépésben (Tető), 5.15 |
| M07 | Tetőelemek | KÉSZ, JÓVÁHAGYÁSRA VÁR | D7 | A 3. lépésben (Tető), 5.15 |
| M08 | Oldalzárások | NEM INDULT | – | |
| M09 | Szerkezet- és tetőszín | NEM INDULT | – | |
| M10 | Ház és környezet | NEM INDULT | – | |
| M11 | Komfort és vezérlés | NEM INDULT | – | |
| M12 | Építménytípus | NEM INDULT | – | |
| M13 | Nézet és jelenet-beállítások | NEM INDULT | – | |
| M14 | Összegzés, mentés, megosztás, export | NEM INDULT | – | |
| M15 | Ajánlatkérés | NEM INDULT | – | |
| M16 | Bemutató eszközök | NEM INDULT | – | |
| M17 | Döntéstámogatók | NEM INDULT | – | |
| M18 | Különleges módok | NEM INDULT | – | |
| M19 | Élesítés és takarítás | NEM INDULT | – | |

## Nyitott döntések (Ádám)

| # | Kérdés | Javaslat | Válasz |
|---|---|---|---|
| D1 | M00: az üres panelkeret maradjon, vagy a 3D töltse ki a képernyőt? | – (ízlés kérdése) | **2026-11-18: a 3D az egész képernyőt kitölti.** A kalkuláció és a többi panel később lebegő, Apple-stílusú üvegablakként épül (alap: a meglévő `?style=glass` réteg, `src/lib/uiStyle.ts`). Referencia: a 2026-11-15-i UI/UX kutatás (Porsche, Polestar, Apple, Tylko, ALUX, Renson, Weinor). |
| D2 | M00: a 3D-n belüli kattintások (oldal kijelölése, üveg/ajtó nyitása) kikapcsolva? | Igen, az M08 hozza vissza | **2026-11-18: igen** (Ádám: „csináld így, kezdjük”) |
| D3 | M00: kiinduló terv a gyártó alapterve, vagy a böngésző utolsó terve? | Gyártói alapterv | **2026-11-18: gyártói alapterv** |
| D7 | Lépés-architektúra (`STEP_ARCHITECTURE.md`) | 7 lépés; ház és környezet az eszköztárba; bútor a 2. lépésbe | **2026-11-18: jóváhagyva a javaslat szerint.** A modulok sorrendje ehhez igazodik (M01 = lebegő lépéssáv és üvegpanel). |
| D8 | M01 megjelenés (`UI_INSPIRATION.md`) | – | **2026-11-18:** asztalon a lépéssáv a kártya tetején, a 03-as minta stílusában (gyűrűs dokk, a kártya széléhez olvadva); telefonon ugyanez a felhúzható lap tetején, összecsukva csak Vissza / Tovább; kártya folyékony üvegből; az eszköztár a bal szélre tapad (M13/M16). Panelszélesség-húzás nincs (fix kártya). |
| D9 | 2. lépés megjelenése | – | **2026-11-18:** folyékony üveg csúszka lime színnel (mindhárom méretre); rögzítés 2 oszlopos rácsban rajzokkal; a bútor lenyitható „Mire használod?” részben. |
| D10 | 2. lépés kiegészítés | – | **2026-11-18:** méretcímkék automatikusan, alapterület, tájolás (É/K/D/Ny), felmérési megjegyzés. |
| D4 | Ársáv helye | Felül jobbra | **2026-11-18: felül jobbra**, a lépéssáv mellett, mindig látható lebegő üvegelem. |
| D5 | Alapértelmezett ármód új gyártónál | Becsült teljes ár | **2026-11-18: becsült teljes ár** „becsült” felirattal; a gyártó átkapcsolhatja „-tól” árra vagy rejtett árra. |
| D6 | Ajánlatkérés helye | Minden lépésből | **2026-11-18: minden lépésből** elérhető másodlagos gombként; a fő gomb marad a „Tovább”. |

## Ismert hibák (a konfigurátorban, a 2026-11-17-i auditból)

Nyitottak; a hozzájuk tartozó modul visszaépítésekor javítandók, ha Ádám úgy dönt:

| Hiba | Modul |
|---|---|
| 375 px-en a lépéspillek levágva, nincs görgetésjelzés | M01 |
| A panel tartalma keményen levágva az árlábléc alatt | M01 |
| „Következő” (asztal) vs. „Tovább” (telefon) | M01 |
| 13 px alatti feliratok (bruttó irányár, kártyák) | M01, M05 |
| Üzemeltetési költség kerekítési eltérése | M11 |
| Költségkeret és árnyékelemzés „Számolás…”-ban maradhat | M16, M17 |
| Márkaszíntől eltérő színek, eltérő bezárógombok a paneleken | M16 |
| AR, videó, fotó valódi eszközön nem ellenőrzött | M14, M16 |

## Napló

| Dátum | Esemény |
|---|---|
| 2026-11-18 | Ádám jóváhagyta: újraépítés modulonként, az A megoldással (`?mod=ujraepites`, az éles felület érintetlen). |
| 2026-11-18 | D1 eldőlt: teljes képernyős 3D, a panelek lebegő üvegablakként jönnek vissza. |
| 2026-11-18 | D4–D6 eldőlt a referencia-kutatás alapján (`REFERENCE_CONFIGURATORS.md`): ársáv felül jobbra, becsült ár alapból (kapcsolható), ajánlatkérés minden lépésből. |
| 2026-11-18 | M00 kész (5.06): `src/lib/rebuildMode.ts` + `tests/rebuildMode.test.ts`; ellenőrizve 1440×900 és 390×844 méreten: csak a 3D látszik (a vászon kitölti a képernyőt, egyetlen gomb sincs), a húzás forgat, nincs `/api/track` kérés, a böngészőben mentett piszkozat érintetlen, a hash nem íródik. Az éles `/konfigurator` képe pixelre azonos a módosítás előttivel (asztalon 176 px élsimítási eltérés a Tanácsadó kártya ikonján, mobilon 0). |
| 2026-11-18 | M01 kész (5.07): ellenőrizve 1440×900 és 390×844 méreten: lépésváltás sávról és Tovább gombbal, a kör a helyére úszik, konzolhiba nincs; az éles felület képe 0 pixel eltérés. |
| 2026-11-18 | Elkészült az audit, a leltár, a függőségi térkép és a terv (`docs/rebuild/`), kódmódosítás nélkül. |
