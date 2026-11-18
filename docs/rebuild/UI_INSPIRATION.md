# UI-inspiráció – hova kerülhet a konfigurátorban

Dátum: 2026-11-18 · Forrás: Ádám képei (`ref/inspiracio/01–09`).
Állapot: **elemzés, kód nem változik.** Elemenként Ádám dönt, a modul építésekor.

## 1. A képek és a javasolt helyük

| Kép | Mi ez | Javasolt hely a Lamelixben | Modul |
|---|---|---|---|
| 01 – sötét sáv, „kivágott” bemélyedés a zöld aktív körrel | Lépéssáv: az aktív lépés egy körben ül, a sáv körülötte „befolyik” | **A 7 lépéses lépéssáv** (asztalon felül középen, mobilon alul). Az aktív kör a lépés ikonja, alatta/mellette a neve; a kör lépésváltáskor átúszik. | M01 |
| 02 – sötét sáv, „púp” a színes aktív körrel | Ugyanez, kidomborodó formával | **Alternatíva a 01-hez.** Mobilon alul jobb (a púp felfelé, a 3D felé mutat), asztalon felül a 01-es bemélyedés. | M01 |
| 03 – a képernyő széléhez „olvadó” fekete eszközsáv | Élhez tapadó, lekerekített átmenetű függőleges sáv | **Eszköztár (Nézet, Környezet, Berendezés, Bemutató)**. Ma jobb oldalon van (`variant: 'rail'`); mivel jobbra kerül a lépéskártya és az ársáv, javaslat: **bal szélre tapadva**. | M13, M16 |
| 04 – íves „kerék” választó, ikon + felirat | Görgethető, ívre fűzött opciólista, középen a kiválasztott | **Oldaltípus-választó** a 4. lépésben (10 típus: ZIP, tolóüveg, lamellafal…) vagy a **kameranézetek** (5). Mobilon különösen jó: hüvelykujjal görgethető. | M08 vagy M13 |
| 05 – „liquid glass” lencse (fénytörés) | Az Apple-féle folyékony üveg anyag | **Az összes lebegő elem anyaga** (lépéssáv aktív köre, gombok, kártya széle). Lásd a technikai korlátot lent. | M01-től |
| 06 – matt üvegmenü a nappali fölött | Füstös, matt üvegpanel fehér szöveggel, a jelenet átlátszik | **A lépéskártya (jobb oldali lebegő panel) mintája** – pont ez a „3D fölött lebegő üveg” irány. Válasz az „üveg színe” kérdésre: **füstös-szürke matt üveg, fehér szöveg**. | M01 |
| 07 – narancs folyékony csúszka mélyedésben | Tapintható, „anyagszerű” csúszka értékkel | **Méretcsúszkák** (szélesség, mélység) a 2. lépésben, értékkel („4,00 m”) a sáv végén. | M03 |
| 08–09 – üveggomb, amely egy íves pályán fut (világos és sötét) | Íves pályán mozgó csúszka | **Lamellaszög 0–90°** a Tető lépésben: a pálya íve maga a lamella elfordulása. Ez a legerősebb illesztés, mert a mozdulat a valós mechanikát mutatja. | M06 |
| (09-es kép alja) függőleges vonalzó izzó jelölővel | Függőleges skálás érték | **Oszlopmagasság** – függőleges, mert a magasság függőleges. | M03 |
| (09-es kép alja) fém kapcsoló | Fizikai hatású kapcsoló | **Be/ki opciók** (LED, szenzor, hang) a Komfort lépésben. | M11 |

## 2. Elrendezés a képekkel (asztal)

```
┌──────────────────────────────────────────────────────────────┐
│ [logó]        ( 01/02 lépéssáv: ● Termék  Méret  Tető … )  [ár ▸] │
│▐                                                    ┌────────┐│
│▐ 03 eszközsáv                                       │ 06     ││
│▐ (bal szélre                3D                      │ üveg-  ││
│▐  olvadva)                                          │ kártya ││
│▐                                                    │ 07/08  ││
│▐                                                    │ elemek ││
│                                                     └────────┘│
└──────────────────────────────────────────────────────────────┘
```
Mobilon: lépéssáv alul (02), fölötte felhúzható üveglap (06), az eszközsáv a bal szélen összecsukva.

## 3. Technikai megvalósíthatóság

- **01, 02 (folyó lépéssáv):** SVG-alakzat vagy maszk, az aktív kör helye animálva. A repóban már van `gsap`, új függőség nem kell.
- **03 (élhez olvadó sáv):** SVG-sarkok (inverz lekerekítés) + `backdrop-filter`. Egyszerű.
- **04 (íves kerék):** saját komponens görgetéssel és érintéssel; billentyűvel is kezelhető kell legyen (akadálymentesség). Közepes munka.
- **05 (valódi fénytörés):** SVG-szűrő (`feDisplacementMap`) a háttéren. **Korlát:** a háttér valódi torzítása csak Chromium-alapú böngészőben működik; Safari/iPhone alatt matt elmosás lesz helyette. A 3D vászon fölött a fénytörés minden képkockánál újraszámol, ezért csak kis felületre (gombok, aktív kör) javaslom, a nagy kártyára a matt üveget (06).
- **06 (matt üveg):** `backdrop-filter: blur()` – minden modern böngészőben megy; a meglévő `?style=glass` réteg (`src/lib/uiStyle.ts`) jó alap.
- **07, 08–09 (anyagszerű csúszkák):** CSS-rétegek és árnyékok, a tényleges érték a meglévő `SliderField` logikájából; az íves pálya SVG-ív. Natív `input range` marad alatta a billentyű- és képernyőolvasó-kezelés miatt.
- **Teljesítmény:** sok `backdrop-filter` a 3D fölött gyengébb telefonon akadhat; ezt modulonként mérem (képkocka-idő), és ha kell, mobilon egyszerűsítünk – a hatást nem dobjuk el, más mobilos megoldást adunk.

## 4. Ádám döntései (kitöltendő az M01 előtt)

- [ ] Lépéssáv: 01 (bemélyedés) vagy 02 (púp)? Asztalon és mobilon ugyanaz, vagy asztalon 01, mobilon 02?
- [ ] Üvegkártya: a 06-os füstös-szürke matt üveg?
- [ ] Eszközsáv (03): a bal szélre kerüljön?
