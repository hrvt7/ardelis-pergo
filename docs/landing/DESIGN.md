# Lamelix nyitóoldal – design-rendszer (2026-11-16)

## Koncepció: „Az asztalon a termék”
A terméket nem képernyőképként mutatjuk, hanem a darabjait: az ár-dokk, a lépéssáv, a színchipek, a beérkező lead és az admin kártyái kódból újrarajzolva, valódi adatokkal lebegnek és dolgoznak. Az oldal úgy olvasható, mint egy rendezett munkaasztal: fehér lapok a világosszürke alapon, egy-egy Vanilla kiemeléssel.

## Szín (60 / 25 / 15)
| Token | Érték | Szerep |
|---|---|---|
| `--lx-bg` | #ECECEF | alap (60) |
| `--lx-card` | #FFFFFF | lapok |
| `--lx-ghost` | #F6F5FA | belső felület, sávok |
| `--lx-ink` | #212121 | szöveg, vonalrajz, elsődleges gomb (25) |
| `--lx-muted` | #5C5E64 | másodlagos szöveg (≥ 5,4:1 az alapon) |
| `--lx-vanilla` | #EFF0A3 | a hangos hang: kijelölés, kiemelés-aláfestés (15) |
| `--lx-green` | #CFDECA | siker, „kész” állapot, kiegészítő felület |
| `--lx-blue` | #D8DFE9 | ég, adat, másodlagos felület |
Szekció-ritmus (color blocking): az admin-szekció Ink alapon (sötét lap), a záró CTA Vanilla.
Tilos: neon-lime, lila–kék AI-gradiens, glassmorphism-tenger.

## Tipográfia
Urbanist Variable (latin-ext: á é í ó ö ő ú ü ű rendben). Display 300–400 súly, -0,045em betűköz, line-height ≥ 0,98 (ékezetek). Szám- és címkeszöveg: Urbanist 600, tabular-nums, nagybetűs címkék .14em betűközzel. Nincs második betűcsalád: a karaktert a súlykontraszt (300 vs 700) és a Vanilla aláfestés adja.

## Vonalrajz-nyelv
Minden illusztráció kódból rajzolt SVG: 1,5 px ink körvonal, lekerekített végek, kitöltés csak Vanilla / Honeydew / Alice Blue, árnyék nélkül. A termék valódi geometriáját rajzoljuk (lamellák, oszlopok, ZIP-kazetta), nem általános ikont.

## Mozgás-szókincs (12, saját nevekkel)
1. **Lamellanyitás** – a héró 3D tetejének lamellái a görgetéssel és a kurzorral nyílnak (valódi LouvreRoof).
2. **Pasztell ég** – a 3D jelenet mögött lassan áramló Vanilla–Honeydew–Alice Blue shader.
3. **Lebegő lapok** – a UI-kártyák három mélységi síkon, kurzorra eltérő mértékben dőlnek és csúsznak (parallax-tilt).
4. **Kiemelő filc** – a címek kiemelt szava alá a Vanilla sáv balról jobbra „húzódik be”.
5. **Soremelés** – a címsorok maszk mögül felúsznak (ékezet-biztos maszk).
6. **Árpörgetés** – az irányár odométerként gördül a valódi árazó motor értékei között.
7. **Összeszerelés** – képsorozat a valódi konfigurátorból: a robbantott szerkezet összeáll, majd a lamellák kinyílnak, görgetésre.
8. **Lépésváltó** – a 7 konfigurátor-lépés kártyája a képsorozattal szinkronban vált, a lépéssáv pöttye halad.
9. **Rendrakás** – a probléma-kollázs szétszórt papírjai (Excel, telefon, PDF, e-mail) görgetésre egyetlen Lamelix-lapba rendeződnek.
10. **Élő vonalrajz** – a funkciókártyák SVG-jelenetei csak láthatóan futnak (nap ív, árnyék, AR-padló, költségsáv).
11. **Lead-utazás** – az admin-szekcióban a lead-kártya oszlopról oszlopra lép (Új → Kapcsolatban → Ajánlat → Megnyert).
12. **Elmosott rács** – a záró CTA mögött a vonalrajz-csempék rácsa lassan úszik, a sáv fölött élesen a gomb.

## Mobil (390 px)
Egy oszlop; a héróban a 3D jelenet a cím alatt, a lebegő lapok közül kettő marad, kisebb méretben, a szélekre húzva. A képsorozat mobilon is görgetésre fut (rögzítés nélkül, beúszó lépéskártyákkal). Kurzor-tilt helyett lassú lebegés.

## Teljesítmény
3D és shader csak tétlen időben; képsorozat 40 képkocka webp (1200 / 720 px), csak a szekció közelében töltődik. `prefers-reduced-motion`: minden végállapotban.
