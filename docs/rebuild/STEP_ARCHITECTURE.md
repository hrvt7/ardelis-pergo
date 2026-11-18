# Lépés-architektúra – mi melyik lépésben állítható

Dátum: 2026-11-18 · Állapot: **javaslat, Ádám jóváhagyására vár** (kód nem változik).
Alap: `FEATURE_INVENTORY.md` (129 funkció), `REFERENCE_CONFIGURATORS.md` (BMW, Porsche, Polestar, Renson), D1–D6 döntések.
Egy funkció sem törlődik, csak a helye változik.

## 1. Szabályok, amikből a sorrend következik

1. **Nagytól a kicsi felé.** Minden lépés csak a korábbiaktól függ: a típus dönti el, milyen rögzítés és tető lehet; a rögzítés, hogy melyik oldal szabad; a méret, hogy mekkora mező és hány oszlop; a tető, hogy kell-e esőszenzor. Visszalépésnél semmi nem „törik” előre.
2. **A lépésekben csak az van, ami az árat vagy a szerkezetet változtatja.** Ami csak bemutat (napszak, kamera, ház kinézete, bútor, AR), az a lebegő eszköztárba kerül, mindig elérhetően. Ez a BMW és a Renson logikája, és ettől lesz rövid minden panel.
3. **Egy lépés = egy kérdés.** A panel tetején a kérdés („Hová kerül és mekkora?”), alatta a fő döntés nagy kártyákkal, alatta a finomhangolás. Ritka beállítás lenyitható „További beállítások” alá kerül.
4. **Minden opción látszik a felár** („+ 380 000 Ft” / „Alapár része”), D5 szerint becsült árként.
5. **Ugyanaz a sorrend asztalon és mobilon.**

## 2. A 7 lépés

| # | Lépés (kérdés) | Fő döntés | Finomhangolás | „További beállítások” | Kamera |
|---|---|---|---|---|---|
| 1 | **Termék** – Mit építesz? | Típus: pergola · veranda · télikert · carport · modulház (B01) | Kiindulás: Alap · Komfort · Prémium csomag (B08) | Tanácsadó: „Nem tudom, segíts” (J01, J06) | áttekintő |
| 2 | **Hely és méret** – Hová kerül és mekkora? | Rögzítés: falhoz · L-sarok · U-fülke · önálló (C01) | Szélesség, mélység, magasság csúszkával **és** cm-mezővel, kiírt min/max (C02–C04) | Modulok száma (C05); méretjavaslat „hány főnek elég” (C07); középoszlop-figyelmeztetés (C06) | felülről |
| 3 | **Tető** – Milyen tető legyen? | Tetőrendszer kártyákon, felárral (D01) | Lamella/nyitás kipróbálása (D02, bemutató, nem árazott); dőlés (D04); üvegezés (D06, csak üveg/poli tetőnél) | Tetőárnyékoló (D07); napelem (D08) | kívülről, tető felé |
| 4 | **Oldalak** – Mi zárja az oldalakat? | Oldal kiválasztása ábrán (E01), majd típusa (E02) | ZIP nyitottság (E05); ajtó nyitásiránya (E04) | Osztott oldal (E03); falüvegezés zárt építménynél (B03) | a kiválasztott oldal felé |
| 5 | **Szín** – Milyen színű legyen? | Alapszínek felár nélkül (F01) | RAL-katalógus és keresés (F02); kéttónusú tető (F03) | Szín a ház fotójáról (F04); ablakhoz igazítás (F05) | részlet |
| 6 | **Komfort** – Mivel használod kényelmesebben? | Világítás: LED (H01), színváltós (H02) | Fűtés (H04), ventilátor (H05), hang (H03) | Eső-/szélszenzor (H06, csak mozgó tetőnél vagy ZIP-nél); okosotthon (H07); télikertnél klíma és alap (B04, B05); üzemeltetési költség (J03, információ) | alulról / esti |
| 7 | **Összegzés** – Ez lesz a terved | Teljes ár bontva: alap + opciók (+ szerelés, ha a gyártó megadja) (I02, I05) | Csoportonként „Módosítás” link a lépésre (BMW/Porsche-minta); javaslatok és figyelmeztetések (J04, B07) | PDF (K02), link (K07), A/B változat (K10), kép (K03), videó (K04), szöveg (K11); felmérési űrlap (L01) | körbeforgó |

### Miért ez a sorrend
- **Termék elöl:** a típus szűri az összes többi opciót (carportnál nincs ZIP, télikertnél kötelező az alap).
- **Méret a tető előtt:** a tetőrendszerek fesztávja és a modulok száma a mérettől függ; így a tetőkártyán már a valós ár látszik.
- **Oldalak a tető után:** a ZIP és a tolóüveg a tetőszerkezethez rögzül; a falhoz rögzített oldal itt már nem választható.
- **Szín a szerkezet után:** a szín mindenre vonatkozik, ezért akkor érdemes, amikor már minden elem a helyén van.
- **Komfort a végén:** kiegészítők, és a szenzor a tetőtől/ZIP-től függ.

## 3. Ami kikerül a lépésekből – lebegő eszköztárak

| Hol | Mi | Funkciók |
|---|---|---|
| Felül középen | Lépéssáv „3 / 7” | A02, A05 |
| Felül jobbra | Ársáv (becsült teljes ár, Részletek, havi példa) + „Ajánlatot kérek” másodlagos gomb | I01–I04, L01 (D4–D6) |
| Fejléc bal | Logó, visszavonás/újra, alaphelyzet, megosztás | A07, K05, K06, K07 |
| Bal alul, ikonsor | **Nézet:** kameranézetek, napszak, napirány, méretek, 180 cm-es figura, automata forgatás | V01–V03, V05–V09 |
| Bal alul, ikonsor | **Környezet:** családi ház / stúdió, háztípus, homlokzat, ablakszín | G01–G05 |
| Bal alul, ikonsor | **Berendezés:** bútorcsomagok helyigény-ellenőrzéssel | V04 |
| Bal alul, ikonsor | **Bemutató:** napjárás, fotó a saját kertre, AR, séta, hangulat, mechanika | N csoport |

A háttérfolyamatok (piszkozat, lead-pontozás, analitika, viszonteladói ár, szerveroldali újraárazás) nem kapnak felületet, maradnak.

## 4. Változás a mostanihoz képest

- A lépések neve és sorrendje gyakorlatilag marad (Típus → Méret → Tető → Oldalak → Szín → Komfort → Összegzés); a tartalmuk tisztul.
- **A ház kinézete kikerül a Szín lépésből** (most „Pergola / A házad” fül, F06) a Környezet eszköztárba.
- **A jelenet-beállítások panel** (SceneSettingsPanel) szétválik Nézet és Környezet ikonra.
- **A kiinduló csomagok** az 1. lépés második sorába kerülnek, a Porsche „javasolt konfiguráció” mintájára.
- **A tetőárnyékoló és a napelem** marad a Tető lépésben, de a „További beállítások” alá kerül, hogy a tetőválasztás ne vesszen el.
- **A modulok száma** a méretcsúszkák alá kerül (most előttük van), mert a legtöbb vevőnek egy mező kell.

## 5. Ádám döntései (kitöltendő)

- [ ] A 7 lépés és a sorrend jó?
- [ ] A ház és környezet kikerül a lépésekből az eszköztárba?
- [ ] A bútor („Mire használod?”) az eszköztárba kerül, vagy a 2. lépésbe a méret mellé, mert a helyigényt ellenőrzi?
