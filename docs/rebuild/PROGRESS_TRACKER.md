# Lamelix konfigurátor – haladási lista

> A dokumentációt minden modul után frissítem. Állapotok: `NEM INDULT` · `DÖNTÉSRE VÁR` (Ádám választ) · `FOLYAMATBAN` · `JÓVÁHAGYÁSRA VÁR` (kész, ellenőrzésre vár) · `KÉSZ` (Ádám jóváhagyta).

## Összkép

| Fázis | Állapot | Dátum |
|---|---|---|
| 1. Teljes technikai audit (`FULL_AUDIT.md`) | JÓVÁHAGYÁSRA VÁR | 2026-11-18 |
| 2. Funkcióleltár (`FEATURE_INVENTORY.md`, 129 funkció) | JÓVÁHAGYÁSRA VÁR | 2026-11-18 |
| 3. Függőségi térkép (`DEPENDENCY_MAP.md`) | JÓVÁHAGYÁSRA VÁR | 2026-11-18 |
| 4. Újraépítési terv (`REBUILD_ROADMAP.md`, M00–M19) | JÓVÁHAGYÁSRA VÁR | 2026-11-18 |
| 5. Dokumentáció a repóban (`docs/rebuild/`) | KÉSZ | 2026-11-18 |
| 6. Visszaállítási pont | NEM INDULT (az M00 első lépése) | – |
| 7. Lecsupaszítás (M00) | DÖNTÉSRE VÁR (3 kérdés, lásd lent) | – |
| 8. A 3D önálló tesztje | NEM INDULT | – |

## Modulok

| Kód | Modul | Állapot | Ádám döntése | Megjegyzés |
|---|---|---|---|---|
| M00 | Lecsupaszítás | DÖNTÉSRE VÁR | – | Hely: `?mod=ujraepites` (A megoldás, jóváhagyva 2026-11-18) |
| M01 | Panelkeret és lépésnavigáció | NEM INDULT | – | |
| M02 | Elhelyezés | NEM INDULT | – | |
| M03 | Méretek és modulok | NEM INDULT | – | |
| M04 | Visszavonás, újra, alaphelyzet | NEM INDULT | – | |
| M05 | Élő ár és kalkuláció | NEM INDULT | – | |
| M06 | Tetőrendszer és tetőmozgatás | NEM INDULT | – | |
| M07 | Tetőelemek | NEM INDULT | – | |
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
| D1 | M00: az üres panelkeret maradjon, vagy a 3D töltse ki a képernyőt? | – (ízlés kérdése) | |
| D2 | M00: a 3D-n belüli kattintások (oldal kijelölése, üveg/ajtó nyitása) kikapcsolva? | Igen, az M08 hozza vissza | |
| D3 | M00: kiinduló terv a gyártó alapterve, vagy a böngésző utolsó terve? | Gyártói alapterv | |

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
| 2026-11-18 | Elkészült az audit, a leltár, a függőségi térkép és a terv (`docs/rebuild/`), kódmódosítás nélkül. |
