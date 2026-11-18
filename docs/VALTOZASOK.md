# Változások

## 5.15 – Újraépítési mód: 3. lépés – Tető (M06–M07)

- **Tetőrendszer:** a gyártó által kínált tetők (zárt építménynél csak a megengedettek) egy oszlopban: ikon, név, rövid leírás, árnyék és eső, és a felár / megtakarítás a jelenlegi tervhez képest.
- **Üveg / polikarbonát típusa** (ha a tető ilyen): 2 oszlopos kártyák fény- és hőértékkel (tájékoztató) és m²-enkénti felárral.
- **Próbáld ki: lamellaszög** íves üveggombbal (Ádám videós mintája): a gomb negyedkörön fut 0° és 90° között, a forgásponton a lamella metszete együtt fordul; húzással, kattintással és billentyűvel (nyilak, PageUp/Down, Home/End) is állítható. Eltolható tetőnél „Tetőnyitás %” csúszka. Jelölve: bemutató, az árat nem befolyásolja.
- **Dőlés:** folyékony csúszka fokban, a hátsó él emelkedésének magyarázatával; a lépés szabályfigyelmeztetései.
- **További beállítások** (lenyitható): tetőárnyékoló és napelemes tető a meglévő komponensekkel.
- A csúszka már fokot és százalékot is kezel (nem csak cm-t).
- **Hiba:** az újraépített felület osztálynevei (`lx-`) ütköztek a nyitóoldal azonos előtagú stílusaival (a tetőkártyák szövege eltűnt); minden új osztály `rb-` előtagot kapott.
- Tesztek: `rebuildSlider.test.ts` (fok/százalék beírás, az íves csúszka szögszámítása), `rebuildMode.test.ts`.

## 5.14 – Újraépítési mód: ársáv (M05)

- **Ársáv (D4–D5):** felül jobbra, a lépéskártya mellett lebegő üvegelem: „Becsült ár – bruttó, szereléssel”, animált összeg, változásnál rövid „+/− összeg” jelzés. Telefonon kis ár-pirula a képernyő tetején.
- **Részletek:** alatta lenyíló tételes kalkuláció a meglévő árszámításból (tételek nettóban, szerelés, nettó, ÁFA, becsült bruttó ár), a gyártói havi részletpéldával (ha be van állítva), és a „tájékoztató, becsült ár, nem ajánlattétel” megjegyzéssel. Kívülre kattintva vagy Esc-re bezárul.
- Ellenőrizve: a szélesség 400 → 600 cm-re állítása az árat 5 648 000 Ft-ról 6 598 000 Ft-ra frissíti (asztal és telefon).
- Az ármód gyártónkénti kapcsolója (pontos / „-tól” / rejtett) még nincs: ehhez új gyártói beállítás kell (admin), külön feladat.

## 5.13 – Újraépítési mód: Hely és méret kiegészítve (méretcímkék, alapterület, tájolás)

- **Méretcímkék:** a Hely és méret lépésben a 3D-ben automatikusan látszik a szélesség, a mélység és a magasság cm-ben; a lépésből kilépve visszaáll a korábbi beállítás.
- **Alapterület** (m²) élőben a csúszkák alatt, az árszámítás területéből.
- **Tájolás:** „Merre néz a terasz eleje?” (É, K, D, Ny) – a meglévő napirány- és tájolás-beállítást állítja együtt, így a 3D napjárása és árnyékai, valamint az árnyékelemzés is ehhez igazodik.
- Megjegyzés a lépés alján: „A pontos méretet a helyszíni felmérés véglegesíti.”
- Tesztek: `rebuildSteps.test.ts` (a tájolás → napív-elforgatás, és hogy a jelenet napja ugyanarról az oldalról süt, mint a valós nap).

## 5.12 – Újraépítési mód: 2. lépés – Hely és méret (M02–M03)

- **Rögzítés:** 2 oszlopos rács felülnézeti rajzokkal (ház falai, pergolakeret, oszlopok), a gyártó által kínált módokkal; a kiválasztott leírása alatta.
- **Méretek:** szélesség, mélység, oszlopmagasság folyékony üveg csúszkával (Ádám mintája, lime): a fogantyú átlátszó lencse, amely felnagyítja az alatta futó sávot; mellette centiméteres mező (5 cm-re kerekít, a gyártói határok közé szorít), alatta a minimum és a maximum. Alatta valódi csúszkavezérlő van (billentyű, képernyőolvasó).
- **Modulok száma** (ha a gyártó kínálja), középoszlop-figyelmeztetés 6 m felett, méretjavaslat, a lépés szabályfigyelmeztetései egy kattintásos javítással – a meglévő logikával.
- **„Mire használod?”** lenyitható részben: a meglévő bútorválasztó helyigény-ellenőrzéssel.
- Tesztek: `rebuildSlider.test.ts` (csúszkahelyzet, centiméter → méter kerekítés és határok), `rebuildMode.test.ts` (M02–M03 látható).

## 5.11 – Újraépítési mód: telefonon is a lap tetején a lépéssáv, összecsukva csak Vissza / Tovább

- **Telefon:** a gyűrűs lépéssáv a felhúzható lap tetejére került (mint asztalon a kártya tetején); az alsó bemélyedéses sáv megszűnt.
- **Összecsukott lap:** csak a fogantyú és a Vissza / Tovább: következő lépés gomb látszik (96 px), így a 3D szinte a teljes képernyőt kapja. Kinyitva: lépéssáv, kérdés, beállítások.
- A már nem használt bemélyedéses sáv kódja és tesztjei kikerültek.

## 5.10 – Újraépítési mód: lépéssáv a kártya tetején, gyűrűs dokkban

- **Lépéssáv (Ádám döntése, a 03-as minta stílusában):** asztalon a lépéskártya tetején egy sötét dokk, amely homorú ívvel olvad a kártya felső széléhez. Lépésenként gyűrű + saját ikon + rövid név (Termék, Méret, Tető, Oldalak, Szín, Komfort, Összegzés). A gyűrű a haladást mutatja: a kész lépéseké tele (halványabb), az aktuálisé kiemelt fénnyel, a hátralévőké üres; lépésváltáskor a gyűrűk simán töltődnek.
- A függőleges sín és az alsó elhelyezés kikerült; telefonon a bemélyedéses sáv alul marad.
- A lépéskártya 400 px széles lett (a hét név kényelmesen elfér).
- Tesztek: `rebuildSteps.test.ts` (a dokk alakja, a rövid nevek hossza).

## 5.09 – Újraépítési mód: függőleges lépéssín a kártya jobb szélén

- **Lépéssín (Ádám rajza és a 03-as minta szerint):** asztalon a lépések a lépéskártya jobb szélére tapadó sötét sínen, lágy átmenettel a kártya széléhez; az aktív lépés köre a sín bal oldali bemélyedéséből lóg ki, és ugyanazzal a GPU-áttűnéssel úszik. A kártya tartalma helyet hagy a sínnek, így jól elkülönül.
- Kipróbálható a többi elhelyezés is: `?sav=kartya` (vízszintesen a kártya tetején), `?sav=lent` (alul középen). Telefonon a sáv alul marad.
- Tesztek: `rebuildSteps.test.ts` (a függőleges bemélyedés geometriája).

## 5.08 – Újraépítési mód: simább lépéssáv, saját ikonok, két asztali elhelyezés

- **Simább átváltás:** a kör, a bemélyedés és a felirat egyetlen, a GPU-n futó áttűnéssel mozog (a sáv egy dupla széles, középen bemélyedéses csík, amely eltolódik); képkockánként semmi nem számolódik, így a 3D kameramozgása mellett telefonon sem akad. A lap üvegének elmosása telefonon kisebb (kevesebb terhelés).
- **Saját lépésikonok:** pergolakeret, alaprajz méretnyíllal, lamellák, screen, festékcsepp, függőlámpa, lap pipával; az aktív lépés neve a kör alatt jelenik meg, az ikon finoman beúszik.
- **Asztali elhelyezés:** alapból a lépéskártya tetején; `?sav=lent` mellett alul középen (Ádám döntéséig mindkettő kipróbálható). Telefonon alul.

## 5.07 – Újraépítési mód: lépéssáv bemélyedéssel és folyékony üveg lépéskártya (M01)

- **Lépéssáv:** a 7 lépés (Termék, Hely és méret, Tető, Oldalak, Szín, Komfort, Összegzés) sötét sávon, az aktív lépés a sávba „süllyedő” akcentkörben; lépésváltáskor a kör és a bemélyedés átúszik (időalapú animáció, csökkentett mozgásnál azonnal). Asztalon felül, a kártya nélküli rész közepén; telefonon alul.
- **Lépéskártya:** jobbra lebegő folyékony üveg panel („3 / 7 · Tető”, a lépés kérdése, Vissza / Tovább: következő lépés). Chromium-alapú böngészőben egérrel valódi peremtörés (SVG elmozdítási térkép a háttéren), máshol és telefonon matt üveg. Telefonon alulról felhúzható lap két állásban.
- A pergola asztalon a kártya nélküli rész közepére kerül. A lépésváltás a meglévő kameralogikát használja.
- Csak `?mod=ujraepites` alatt látszik; az éles felület képe pixelre azonos (asztal és telefon).
- Tesztek: `rebuildSteps.test.ts` (lépéssorrend a meglévő logikával egyezik, bemélyedés-geometria, a szélső lépések is a bemélyedésben), `liquidGlass.test.ts` (elmozdítási térkép), `rebuildMode.test.ts` (M01 látható).

## 5.06 – Újraépítési mód: csak a 3D (M00)

- **Újraépítési mód:** a `/konfigurator?mod=ujraepites` címen a 3D kitölti a teljes képernyőt, minden felületi elem nélkül. A terv mindig a gyártó alaptervéből indul; a mód nem ír a böngészőbe (piszkozat, ház, változatok), nem mér, nem nyit AR-t, nem írja a címsort. A 3D forgatható, nagyítható, mozgatható; a 3D-n belüli kattintások (oldal kijelölése, ajtó- és üvegnyitás), a feliratok és a műszaki jelölések kikapcsolva – a modulok hozzák vissza őket.
- Az éles felület (paraméter nélkül) nem változott; egy funkció sem törlődött.
- Visszaállítási pont: `rebuild-alap-2026-11-18` ág.
- Tesztek: `rebuildMode.test.ts` (paraméter felismerése, modulregiszter: élesben minden látszik, újraépítési módban még semmi).

## 5.05 – Referencia-konfigurátorok kalkulátorfelépítése (kutatás)

- **Kutatás:** `docs/rebuild/REFERENCE_CONFIGURATORS.md` – BMW, Porsche, Polestar, Renson, Brustor és SaleSqueze kalkulátorfelépítése (lépések, árkijelzés, csomagok, összegzés, lezárás), képernyőképekkel (`docs/rebuild/ref/`) és javaslattal a lebegő üvegpanelekhez. Kódváltozás nincs.

## 5.04 – Újraépítési dokumentáció: audit, funkcióleltár, függőségi térkép, terv

- **Csak dokumentáció, kódmódosítás nélkül.** Új mappa: `docs/rebuild/` – `FULL_AUDIT.md`, `FEATURE_INVENTORY.md` (129 kezelőfelületi funkció 16 modulban, fájllal, 3D-kapcsolattal, függőséggel), `DEPENDENCY_MAP.md`, `REBUILD_ROADMAP.md` (M00–M19, sorrend a függőségek szerint), `PROGRESS_TRACKER.md`.
- A konfigurátor lecsupaszítása (M00) a jóváhagyás után az `?mod=ujraepites` kapcsoló mögé kerül; az éles felület nem változik.

## 5.03 – Matt porszórt bevonat a 3D-ben: a sötét színek a valódi árnyalatukban

- **Mi változott:** a pergola (és minden porszórt alumínium elem) bevonata a 3D-ben matt, finomstruktúrás festékként viselkedik: alacsony fémesség, tompa csillanás, vékony lakk. Korábban félig fémes volt, ezért az antracit (RAL 7016, 7021) kékesfeketének látszott, és az égbolt tükröződött rajta; most szürkének látszik, az oldalak árnyalása olvasható.
- **Metál színek:** a DB 701–703 és a RAL 9006/9007 megtartja a korábbi fémes, lakkozott megjelenést; a fa hatású és a corten felület nem változott.
- **Egy helyen hangolható:** az értékek a `src/lib/powderCoat.ts`-ben vannak (három minőségi szint, matt és metál).
- **Ellenőrzés:** előnézeti telepítésen, a demó konfigurátor stúdió nézetében RAL 7016 és RAL 9016 színnel (a fehér nem ég ki). Más környezetben (terasz, kert, éjszaka) és mobilon nem néztem meg.
- Tesztek: `powderCoat.test.ts` (matt és metál értéktartomány, metál színkészlet, a jelenet a közös leírást használja).

## 5.02 – Előrenderelt nyitóoldal: a héró kész HTML-ként érkezik

- **Mi változott:** a build első lépése (`vite build --ssr src/entry-prerender.ts`) a nyitóoldal első képernyőjét – fejléc, héró, „Hét lépés” – kész HTML-ként írja a `dist/index.html`-be és a `dist/en/index.html`-be. A böngésző ezt nem rajzolja újra, hanem hidratálja (`src/main.tsx`), így a látogató a JavaScript letöltése előtt is a valódi oldalt látja. A lenti szakaszok továbbra is a böngészőben, fokozatosan épülnek fel.
- **JavaScript az első kirajzolás után:** az előrenderelt oldalon az alkalmazás csomagja az első kirajzolást követő képkockában indul, így a stíluslap, a betű és a héró képe kapja az első sávszélességet.
- **Tartalék-oldal:** a többi útvonal (konfigurátor, admin, ajánlat stb.) és az offline mód az előrenderelt tartalom nélküli `app.html`-t kapja (`vercel.json` átirányítás, service worker). Horgonnyal érkezve (`/#arak`) az oldal a korábbi módon, tisztán renderel, és a célra görget.
- **Héró, csökkentett mozgás:** a kezdő lépés mindig 4 (ezt rendereli a szerver is); csökkentett mozgásnál a hidratálás után a 6. lépés áll – a látható végállapot ugyanaz, mint eddig.
- **Ellenőrzés:** hidratálási hiba nincs (magyar, angol, asztali, mobil, csökkentett mozgás); a nyitóoldal 14 görgetési helyzete és 10 további oldal képre azonos az előző éles verzióval; JavaScript nélkül is megjelenik a fejléc és a héró.
- **Mérés (Lighthouse mobil, helyi éles build, 5 futás):** teljesítmény 69–81 → 75–83, első tartalom 2,5 → 1,9 s, legnagyobb tartalom 3,7 s (változatlan), elrendezés-ugrás 0. Valódi böngészőben mérve a héró ~0,3 s alatt kirajzolódik (korábban a JavaScript lefutása után).
- Tesztek: `ssrPrerender.test.ts` (előrenderelt tartalom HU/EN, hidratálási feltétel, build-lépés, tartalék-oldal); `landingV2.test.ts` frissítve a csökkentett mozgás új megoldására.

## 5.01 – „Új verzió elérhető”: felülről beugró, animált kártya

- **A frissítés-jelzés már nem alul ugrik fel** (ott a telefonon rálógott a kalkulációs sávra): felülről, a fejléc alá érkezik egy rugós beugró animációval, lélegző ikon-gyűrűvel és egyszeri fényvillanással a „Frissítés” gombon. Tableten és asztalon a 3D nézet fölött, jobbra áll, így a bal oldali panelt és lépéssávot sem takarja. Világos és sötét felülethez is igazodik; csökkentett mozgás beállításnál csak elhalványul.
- A nyitó animáció után jelenik meg (nem a betöltés pillanatában), a „Frissítés” gomb forgó ikonnal jelzi az újratöltést, az X-re felfelé kicsúszva eltűnik. A futó munkamenetet továbbra sem szakítja meg magától; a konfiguráció a böngészőben megmarad.
- Tesztek: `swUpdateBanner.test.ts` (felül, animációval, csak a nyitó animáció után és csak gombnyomásra), `cssSplit.test.ts`; böngészős próba (`tests/e2e/offline.cjs`, az új oldalsó eszközsorhoz igazítva): a jelzés a képernyő felső felében, frissítés után a régi tár törlődik – mind zöld. Képernyőképen ellenőrizve telefonon (iPhone 14 Pro méret) és tableten.
- Nem ellenőrzött: valódi iPhone-on és iPaden.

## 5.00 – Javítás: a mintaoldal betűi és a stílus-sorrend az alkalmazás-oldalakon

- **Hiba:** a 4.98 után a mintaoldalon (`/minta`) a fejléc és a címek betűje megváltozott, mert az alkalmazás közös stíluslapja (`index.css`) az oldal saját stíluslapja *után* töltődött, és felülírta.
- **Javítás:** az `App.tsx` minden alkalmazás-oldal előtt előbb a közös stílust (`src/appStyles.ts`: `index.css` + alkalmazás-betűk) tölti be, utána az oldalt; így a sorrend ugyanaz, mint a szétválasztás előtt.
- **Ellenőrzés:** az előző (4.97) és az új build helyben, képpontra összevetve: mintaoldal, adatkezelés, belépés, admin, 404, ajánlat- és tulajdonosi oldal 11–11 görgetési helyzetben asztali és mobil méreten, valamint a konfigurátor felülete – eltérés nincs.
- Tesztek: `cssSplit.test.ts` (az alkalmazás-stílus minden alkalmazás-oldal előtt töltődik).

## 4.99 – Szerviz: munkalap (felelős, határidő, javítás, költség) és hibastatisztika

- **Munkalap minden hibabejelentéshez:** felelős (a korábban megadott nevekből választható), határidő, diagnózis, elvégzett munka, felhasznált alkatrész, munkaidő (perc), garanciális vagy fizetős, nettó költség, eredmény (megjavítva, ideiglenes, nem javítható, nem volt hiba). A szerver csak a ténylegesen változó mezőket menti. Az üres mező törlést jelent. A lezárás ideje automatikus, újranyitáskor törlődik.
- **Szűrők:** „Késésben” (nyitott jegy lejárt határidővel, piros jelzés) és felelős szerint (köztük „Nincs felelős”).
- **Hibastatisztika (új nézet a Szerviz fülön):** nyitott, késésben lévő és lezárt jegyek; a megoldási idő mediánja; hibák komponens és modell (tetőrendszer) szerint, a telepített darabszámhoz mért aránnyal; havi bejelentések (6 hónap); garanciális és fizetős költség, munkaidő, eredmények; visszatérő hibák (ugyanaz a termék és komponens legalább kétszer). Leíró kimutatás. 20 telepítés és 10 bejelentés alatt „kis minta” figyelmeztetést mutat, és kimondja, hogy az együttjárás nem bizonyít okot.
- **Napló:** a munkalap módosítása `service_update` eseményként naplózódik, csak a mezők nevével (a tartalom nem kerül a naplóba). Az állapotváltás továbbra is `status_change`.
- **Demó:** a demó adminban a Szerviz fül kitalált telepítésekkel és 14 bejelentéssel mutatja be a munkalapot és a statisztikát. A módosítások csak helyben élnek. A Telepítések fül demóban üres marad, mert a tulajdonosi link valódi rekordot igényel.
- **Adatbázis:** `service_requests` új oszlopai (assignee, due_date, diagnosis, work_done, parts_used, labor_minutes, warranty_case, cost_net, outcome, closed_at, updated_at), részleges index a nyitott jegyek határidejére, az `installation_events` új eseménytípusa. Csak bővítés; élesítve a `service_requests_worksheet` migrációval, a `supabase/installations.sql` is frissült.
- Tesztek: `serviceStats.test.ts` (késés, medián, komponens és modell szerinti arány, oldalzárások összevonása, visszatérő hiba, költségek, hónapok, kis minta, a demó adatok konzisztenciája), `serviceRequests.test.ts` (munkalap mentése, csak a változó mezők, napló tartalom nélkül, lezárási idő, érvénytelen értékek, idegen gyártó 404).

## 4.98 – Kisebb első stíluslap és könnyebb belépő animáció a nyitóoldalon

- **Stíluslap szétválasztva:** a `src/base.css` a közös alap (Tailwind, színváltozók, alapstílusok, frissítési sáv), ezt minden oldal betölti. Az `index.css` (konfigurátor, admin, ajánlat, belépés, mintaoldal) csak a saját útvonalán töltődik. A nyitóoldal renderelést blokkoló stíluslapja tömörítve 137 KB → 41 KB.
- **Betűk:** a nyitóoldal csak a ténylegesen használt betűket tölti (Plus Jakarta Sans, Urbanist, Geist 700); az Inter, Manrope, Outfit, Poppins és Cormorant az `src/appFonts.ts`-ben, az alkalmazás-oldalakon. Betűfájlt többé nem ágyaz a build base64-ként a CSS-be.
- **Belépő animáció:** a szakaszok elemeinek beúszása CSS-átmenettel és egyetlen IntersectionObserverrel fut (ugyanaz a mozgás: 1 s, 46 px, 90 ms lépcső), nem elemenkénti GSAP-tweennel; a felépüléskor így kevesebb a hosszú feladat. A „Hét lépés” vonala továbbra is GSAP-pal rajzolódik.
- **Ellenőrzés:** 10 oldal (nyitóoldal HU/EN, belépés, mintaoldal, adatkezelés, 404, ajánlat, tulajdonosi oldal, admin, konfigurátor) asztali és mobil képernyőképe, a nyitóoldal hat szakasza animáció után, valamint a nyitóoldalról a konfigurátorba és a belépésre navigálás képre azonos az előző éles verzióval (eltérés csak a betöltési pillanatban és a mozgó elemeknél).
- **Mérés (Lighthouse mobil, ugyanazon a gépen, 5–5 futás):** teljesítmény 64–69 → 69–81, első tartalom 2,9 → 2,5 s, legnagyobb tartalom 4,2 → 3,7 s, elrendezés-ugrás 0. Akadálymentesség, bevált gyakorlatok, SEO: 100.
- Tesztek: `cssSplit.test.ts` (alap- és alkalmazás-stílus, betűk, beágyazás tiltása, CSS-es belépő animáció).

## 4.97 – Gyorsabb mobil indulás a nyitóoldalon

- **Mi változott:** a nyitóoldal először csak a hérót és a „Hét lépés” szakaszt építi fel, a többi szakasz az első megjelenés után, üresjáratban, négy csoportban, megszakítható rendereléssel kerül az oldalra. A böngésző így nem fagy le induláskor egyetlen hosszú feladattal. Ha a látogató horgonylinkkel érkezik (pl. `/#arak`), vagy korán kattint a menüre, azonnal minden felépül, és a görgetés a célra igazít.
- **Előtöltés:** a nyitóoldal HTML-je a héró nagy felhőképét és az Urbanist betűt már a JavaScript előtt kéri.
- **Mérés (Lighthouse, helyi éles build, mobil profil):** teljesítmény 37 → 70–75, blokkolási idő 4 510 → 280–480 ms, legnagyobb tartalom 6,3 → 4,1–4,2 s, elrendezés-ugrás 0. Asztali: 68 → 99. A végső oldal képre azonos az előzővel.
- Tesztek: `progressiveStage.test.ts` (kezdő szakasz horgonnyal, csoportos felépítés, korai horgonykattintás, előtöltés).

## 4.96 – Ütközésvizsgálat a mozgó elemekre, kimerevíthető jelenet

- **Közös kinematika (`src/lib/mechanics.ts`):** a nyíló és a tolóajtó minden helyzete egyetlen fázisból (0 = zárva, 1 = nyitva) számolódik. A 3D jelenet ebből mozgatja a szárnyat, az ütközésteszt pedig ugyanezt söpri végig. Az oldalszakaszok helye és hossza (osztóprofil, középoszlop) is innen jön.
- **Ajtók ütközésvizsgálata (`src/lib/clearance.ts`):** a szárny teljes útját ellenőrzi a dézsák, ültetőládák, kerti lámpák, bútorok, a ház, a házszárnyak, az oszlopok és a többi oldalfal ellen. A vizsgálat ~6000 konfigurációt fed le: minden rögzítés, méret, oldal, egész és fél oldal, tükrözés, háztípus, modulos pergola, télikert és stúdió. A régi dézsahelyet (a 3.61-ben javított hibát) azonnal megtalálja.
- **Hiba: a tolószárny a sarokoszlopba csúszott.** A belső oldalon futott, az oszlopok viszont a falsíktól befelé állnak, ezért kis falszakaszon kb. 10 cm-t belecsúszott az oszlopba. Mostantól a fix tábla külső oldalán fut.
- **Hiba: a szélső lamellák belefordultak a záró profilba.** 0–5° között 1–3 mm-t lógtak bele. A záró profil most a lamella forgási burkolókörén kívül kezdődik, 3 mm hézaggal.
- **Lamellák ütközésvizsgálata:** 0 és 110° között fokonként ellenőrzi, hogy a szomszédos lamellák, a záró profilok és a gerendák keresztmetszete nem metszi egymást. Ezt az SB 400 valós profiljával, 11 mélységnél vizsgálja.
- **Időtől determinisztikus jelenet (`src/lib/sceneClock.ts`):** a `?freeze=<másodperc>` URL-paraméter kimerevíti a jelenetet. A Működés-bemutató az adott pillanat állását mutatja, a szél és a részecskék ebből a fix időből számolnak, az átmenetek (ajtó, kamera, csillapítás) azonnal a célállásba ugranak. Ugyanaz az URL mindig ugyanazt a képet adja, ez vizuális regressziós képekhez használható. Az ajtó mozgása is időalapú lett, a képkockaszámtól már nem függ.
- Tesztek: `doorClearance.test.ts` (kinematika, önellenőrzés, teljes konfigurációs rács), `louvreClearance.test.ts` (szomszédos lamellák, záró profil, gerenda), `sceneClock.test.ts` (freeze paraméter, determinisztikus bemutató).

## 4.95 – Reszponzív átnézés: telefon, tablet, laptop, monitor

- **Mérés:** 26 képernyőméreten (telefon 9:16 és fekvő, tablet 4:3, 16:10, 3:2, laptop, 1080p–3440 px monitor) gépi ellenőrzés: vízszintes kilógás, levágott szöveg, 12 px alatti betű, 44 px alatti érintési célpont, egymásra lógó szöveg.
- **Hiba: nyitóoldal, fekvő telefon** – a „Hét lépés” képsorozat asztali elrendezése nem fért ki 390–412 px magas képernyőn, a lépéslista a következő szakasz szövegére lógott. Alacsony ablakon most csak a kép, az aktuális lépés és az irányár látszik.
- **Hiba: konfigurátor, 360 px széles telefon** – a 7. lépés kilógott a lépéscsíkról; most mind a 7 kifér. A betöltő kártya nem csúszik a fekete eszközfül alá.
- **Érintés:** telefonon és tableten 44 px-es célpontok az eszközfülön, a nézetválasztón, a fejléc gombjain, az admin gombjain, állapotválasztóján és jelölőnégyzetein, az ajánlatoldal elfogadó jelölőjén, a nyitóoldal fejlécén, demógombjain, csúszkáin és a tulajdonosi oldal adatkezelési linkjén.
- **Olvashatóság:** 11 px alatti címkék (admin márkanév és szemöldökcímek, ajánlat táblafejléc, „Bruttó irányár”, „gyártóknak”) 12–13 px-re nőttek; a csomagválasztó ára nem törik szét keskeny képernyőn.
- Tesztek: `responsive.test.ts` (alacsony elrendezés, 44 px-es célpontok, 7 lépés 360 px-en, tulajdonosi link).

## 4.94 – Szervizfotók: hozzáfűzött képek metaadata és telepítésenkénti korlát (hibakeresés 6.)

- **Hiba: a szerveroldali metaadat-szűrés az első kép után hozzáfűzött képeket (iPhone/Samsung MPF, gain map) bájtra átengedte**, a saját EXIF/GPS-adatukkal együtt (ha egy kliens kihagyja a böngészős újrakódolást). Most a képadat az első valódi záró jelölőnél véget ér, ami utána jön, lekerül; a progresszív képek szkennjei közti APPn/COM szegmensek is lekerülnek. Az ellenőrző (`hasMetadata`) a teljes fájlban keres EXIF-fejlécet.
- **Hiba: a szervizfotó-feltöltésnek nem volt telepítésenkénti felső korlátja** (csak IP-nkénti), egy kiszivárgott QR-linkkel a tárhely korlátlanul tölthető volt. Most egy termékhez legfeljebb 60 fotó tárolható; afölött barátságos hibaüzenet.
- Nyitva: a bejelentéshez végül nem csatolt fotók automatikus takarítása (most a telepítés törlésekor törlődnek).
- Tesztek: `serviceRequests.test.ts` (hozzáfűzött kép, fotókorlát).

## 4.93 – CRM-webhook: bővítésnél a különbözet, és nem lassítja a választ (hibakeresés 5.)

- **Hiba: bővítési kérésnél a CRM-be a teljes új konfiguráció ára ment** (pl. 30,9 ezer € egy 900 €-s LED-bővítésre), az adminban és az e-mailben viszont a különbözet. Most a `lead.created` esemény a bővítés becsült különbözetét küldi (`price.estimate: true`), `source: "expansion"`-nel, és külön `expansion` blokkban a telepítés azonosítóját, a hozzáadott tételeket és a teljes konfiguráció árát.
- **Hiba: a webhook kézbesítése visszatartotta a választ** (5 mp időkorlát + újrapróbálás): ha a fogadó lassú volt, a vevő a felmérés-kérésnél, a gyártó az ajánlat küldésénél akár 10 mp-ig várt. Élesben (Vercel Edge `waitUntil`) a kézbesítés most a válasz után fut le; helyben és tesztben továbbra is megvárjuk.
- Tesztek: `auditFixes.test.ts` (bővítési adat, háttérben kézbesítés).

## 4.92 – Szerver: megőrzési törlés minden gyártónál, árrés nem látszik (hibakeresés 4.)

- **Hiba: a megőrzési idő utáni automatikus törlés elakadhatott.** A napi futás mindig ugyanazt a 100 legrégebbi telepítést kérte le. Ha ezek egy hosszú megőrzésű gyártóé voltak, a többi gyártó lejárt telepítései (fotók, bejelentések) soha nem törlődtek, holott az adatkezelési oldal automatikus törlést ír. Most lapozva, id szerint halad végig, futásonként legfeljebb 100 törléssel és 20 mp időkerettel.
- **Hiba: a viszonteladó árrés-százaléka bárki számára kiolvasható volt** a `/api/tenant?id=…&h=…` válaszból (a `?h=` értékek próbálgatásával). Most a szerver a már felszorzott árlistát küldi, az árrés a böngészőben 0. A vevő által látott ár változatlan; ezt teszt ellenőrzi.
- Tesztek: `installationsAdmin.test.ts` (több gyártó, lapozás), `pricing-rules.test.ts` (árrés nem kerül ki, azonos ár).

## 4.91 – Admin: a teendők kora a státuszváltástól számít (hibakeresés 3.)

- **Hiba: hamis „lejárt” teendők.** A „Teendők” kora eddig a lead beérkezésétől számított: egy 10 napos érdeklődő, akinek ma ment ki az ajánlat, azonnal „10 napja kiment · lejárt” lett (a demóban 18-ból 15 lejárt). Most a legutóbbi státuszváltástól számít; az „új” továbbra is a beérkezéstől.
- **Új oszlop: `leads.status_changed_at`** (supabase/leads.sql, az éles adatbázison migrálva). Minden státuszírás kitölti: admin (lista, kanban, panel), ajánlat kiküldése, ajánlat elfogadása, telepítés rögzítése. Ha egy gyártó adatbázisában még nincs meg, a szerver nélküle ír és olvas.
- Régi soroknál, ahol a váltás ideje nem ismert, a teendő megjelenik, de nem jelöljük lejártnak, és nem írunk kitalált napszámot.
- **Hiba: az ajánlat elfogadása visszaállíthatta a „Felszerelve” állapotot „Megnyert”-re**; javítva. A telepítésnél a lead-állapot írásának sikertelensége most naplózódik.
- Tesztek: `adminWorkspace.test.ts`, `auditFixes.test.ts`.

## 4.90 – Konfigurátor: Esti hangulat panel, középre vágott képek, egységes infrapanel-ár (hibakeresés 2.)

- **Hiba: az „Esti hangulat” panel nyitva maradt**, amikor a vevő másik eszközt választott a fülben: eltakarta a pergolát és a következő eszköz visszajelzését (az AR és a Fotóba helyezés emiatt látszólag nem csinált semmit). Most bármelyik másik eszköz választásakor bezárul; a Napszak gomb újra megnyitja.
- **Hiba: a PDF-, ajánlat- és megosztókép jobbra csúszott** az alapstílusban (a lebegő elrendezés nézet-eltolása, 4.76 óta). A pillanatkép most az eltolás szerint vág, a pergola a képen középen van.
- **Hiba: az infrapanelnek két ára látszott** (a Komfort lépésben nettó egységár „200 000 Ft / db”, az Esti hangulat panelen bruttó különbözet „+279 000 Ft”, jelölés nélkül). Most mindkét helyen ugyanaz a bruttó különbözet áll, „bruttó” jelöléssel.
- Tesztek: `auditFixes.test.ts` (vágódoboz, panel bezárása, ár-egységesség).

## 4.89 – Admin: telefonos navigáció, Szerviz, kanban és állapotgombok (hibakeresés 1.)

- **Hiba: telefonon a „Beállítások” lelógott** az alsó navigációról, mióta 6 fül van (Szerviz). Most csak az aktív fül írja ki a nevét (13 px, Vanilla alapon), a többi 44 px-es ikon; a nevük a képernyőolvasónak megmarad.
- **Hiba: a Szerviz oldal telefonon szélesebb volt a képernyőnél** (levágott szöveg, szűrők, üres állapot): a görgethető szűrősor kitolta az oszlopot. Javítva, minden fül tartalma a képernyőn belül marad.
- **Kanban:** a jobb szél elhalványul, jelezve, hogy oldalra további oszlopok (Felszerelve, Elveszett) vannak.
- **Részletes panel:** az állapotgombok két oszlopban, a „Kapcsolatba léptünk” felirat teljesen olvasható.
- Tesztek: `adminWorkspace.test.ts`.

## 4.88 – Konfigurátor mobilon és telepített webappként: tisztább alsó lap, rövidebb fül

- **Telepített webapp (kezdőképernyő):** a munkafelület magassága levonja az állapotsort is. Eddig a jelenet a képernyő alá lógott: a felhúzott lap a fejlécre csúszott, az eszközfül majdnem rálógott az alsó lapra. A fül alja az alsó biztonsági sávval is számol.
- **Alsó lap (összecsukva):** nincs „Beállítások” sor, csak a húzócsík, a lépések (1–7), az irányár és a Tovább gomb. A húzócsíkra koppintva vagy húzva nyílik.
- **Fejléc:** a „motoros lamellás · 4,0 m mély” címke kikerült, a típus és a szélesség marad.
- Tesztek: `studioFloat.test.ts`.

## 4.87 – Új nyitó animáció: „Zsalu” (9 mp)

- **A nyitó animáció lecserélve** a „Lamelix logó – Zsalu” videóra (9:16, 9 mp, 3D: zsalulamellák → összeálló „L” → lamellák, tükröződő padló). Minden úton ez fut: videó, hardveres dekóder (tiltott automatikus lejátszásnál), animált kép, és a zárókocka állóképe; a nyitókép háttérszíne az új videóhoz igazítva.
- Méret: videó 0,83 MB (720×1280, jó minőség), animált tartalék 0,25 MB. `scripts/intro-assets.sh` mostantól a minőséget is fogadja (`CRF=…`).
- Tesztek: `introSplash.test.ts` (216 képkocka, 9 mp, az index a videóhoz tartozik), `tests/e2e/intro.cjs`: zöld; a dekóderes út Chrome-ban és a Safari motorjában is végigfut (9,2–9,7 mp).
- Nem ellenőrzött: valódi iPhone-on és iPaden.

## 4.86 – Nyitóoldal: „Digitális termékkönyv” szakasz

- **Új szakasz a gyártói nyitóoldalon (`/` és `/en`), az admin-tábla után:** „Az eladás után is Önnél marad a vevő.” Négy lépés (QR-matrica, garancia komponensenként, hibabejelentés fotóval, bővítés), mellette kódból rajzolt telefon a tulajdonosi oldal egyszerűsített képernyőivel és egy QR-matricával. A lépések kattinthatók; amíg a szakasz látszik és a látogató nem választott, maguktól lépnek (csökkentett mozgásnál nem). A minta-QR valódi, beolvasható kód, a szakaszra mutat. Mobilon: cím → telefon → lépések.
- **Csak amit a kód tud:** legfeljebb 4 fotó, helyadat eltávolítása, zárolt szerkezet a bővítésnél, becsült bővítési ár; kimondva, hogy a rendszer nem azonosít alkatrészt és nem rendel automatikusan; a garancia feltételeit a gyártó szerződése adja. Demóadatok, jelölve.
- `llms.txt`: a leírás kiegészült a digitális termékkönyvvel.
- Tesztek: `productPassport.test.ts` (HU/EN szerkezet, tiltott ígéretek hiánya, a 4 fotós korlát a kódból, elhelyezés). Böngészőben ellenőrizve asztali, tablet és mobil nézetben, magyarul és angolul; vízszintes túlcsordulás nincs, a QR visszaolvasható.

## 4.85 – Telepítések 6/6: nyomtatható QR-matrica

- **QR-matrica a termékre:** a telepítés részleteinél letölthető PDF (80 × 100 mm, nyomtatáshoz) és PNG (1000 × 1250 px). Rajta a gyártó logója (ha PNG/JPEG és a böngésző letöltheti; különben a gyártó neve), „Digitális termékkönyv”, a QR-kód a tulajdonosi oldalra (Q szintű hibajavítással), a termék neve és a weboldal címe. A token szövegként nem kerül a matricára, csak a QR-kódba.
- Javítás: az admin telepítés-részleteiben a garancialista csak a termékben ténylegesen lévő komponenscsoportokat mutatja (mint a tulajdonosi oldal), az „Egyéb / nem tudom” bejelentési választás nem hoz létre külön sort.
- Tesztek: `qrSticker.test.ts` (oldalméret, QR, token nincs a szövegben, logó/név, fájlnév). Böngészőben ellenőrizve: a letöltött PDF és PNG QR-kódja visszaolvasva a tulajdonosi linket adja.

## 4.84 – Telepítések 5/6: bővítés a tulajdonosi oldalról

- **„Bővíteném” gomb a tulajdonosi oldalon:** a gyártó konfigurátora a felszerelt (befagyasztott) változatból indul. A méret, a rögzítés és a szín lépés zárolt, a tetőnél csak a tetőárnyékoló választható, a nyitott oldalak zárhatók le, a Komfort lépésben LED, fűtés, ventilátor, szenzor, hangrendszer, okosotthon adható hozzá; ami már megvan, nem vehető el. A felület tetején/alján „Bővítés” sáv, kilépés gombbal.
- **A token nem kerül az URL-be:** a böngészőfül munkamenet-tárolójában van (2 óráig), a konfigurátor csak `?bovites=1` mellett és ugyanannál a gyártónál veszi át. A bővítés nem írja felül a látogató saját piszkozatát.
- **A szerver dönt:** a lead a meglévő lead-flow-n megy, de a szerver ellenőrzi a tokent és a gyártót, a beküldött konfigurációt visszazárolja az eredetire (csak hozzáadás), új elem nélkül elutasítja. A lead `expansion` forrással, az eredeti telepítésre hivatkozva (`installation_id`), „[Bővítés] Eredeti: … Hozzáadva: …” megjegyzéssel mentődik; az irányár a bővítés becsült ára (a teljes új konfiguráció mai ára mínusz a meglévő rész mai ára), ezt a gyártói és a vevői e-mail is így mutatja. A napló `expansion_request` eseményt kap.
- Tesztek: `expansion.test.ts` (szerveroldali zár, különbözeti ár, hivatkozás és napló, új elem nélkül 422, idegen/érvénytelen token, munkamenet-szabályok). Böngészőben ellenőrizve: zárolt lépések, „Oldalak” kezdőlépés, a befagyasztott terv betöltése.

## 4.83 – Telepítések 4/6: hibabejelentés és Szerviz nézet

- **Hibabejelentés a tulajdonosi oldalon:** komponens a telepítés zárt listájából, leírás, legfeljebb 4 fotó (eredetileg egyenként max. 8 MB), kötelező hozzájárulás. A böngésző a fotót vásznon keresztül JPEG-be kódolja újra (max. 2560 px, ≤ 4 MB): ez eldobja az EXIF-et (GPS, eszköz, időpont); a szerver ellenőrzi, hogy JPEG-e, és második védvonalként eltávolít minden metaadat-szegmenst (`server/jpeg.ts`). A fotók a privát `service-photos` tárhelyre kerülnek, a tárolási utat a szerver képzi (gyártó / telepítés / véletlen azonosító).
- **Hozzájárulás naplózása:** a bejelentés a hozzájárulás időpontját és a tájékoztató verzióját tárolja; a verzió `2026-11.2` lett, az adatkezelési tájékoztató új résszel bővült (tulajdonosi oldal, hibabejelentés; a gyártó az adatkezelő, a Lamelix adatfeldolgozó — jogi átnézés javasolt).
- **Értesítés:** a gyártó e-mailt kap (Resend) a komponenssel, a leírással és a Szerviz nézet linkjével; a fotók csak belépés után nyithatók meg.
- **Új admin fül: Szerviz.** Bejelentések állapotszűrővel (új, folyamatban, lezárva), a fotók 10 percig érvényes aláírt linkkel, az ügyfél elérhetősége a hozzá tartozó érdeklődőből; az állapotváltás naplózódik. A nézet kimondja: a rendszer nem azonosít alkatrészt és nem rendel; az anyaglista tájékoztató.
- **Visszaélés-fék:** IP-nként óránként 5 bejelentés és 10 percenként 16 fotó; telepítésenként naponta legfeljebb 10 bejelentés. A telepítés törlése a félbehagyott feltöltéseket is törli.
- Tesztek: `serviceRequests.test.ts` (EXIF/GPS eltávolítás valódi fotón, nem JPEG/csonka/túl nagy, zárt komponenslista, hozzájárulás és verzió, idegen fotóazonosító, visszaélés-fék, tenant-elkülönítés a Szerviz nézetben, árva fotók törlése). Böngészőben (headless Chrome) ellenőrizve: a feltöltött bájtokban már nincs EXIF.

## 4.82 – Árazási szabályok (regionális felár, viszonteladói árrés, %-os engedmény) és CRM-webhook

- **Viszonteladói árrés:** a gyártó viszonteladónként saját linket ad (`…/k/:gyártó?h=:viszonteladó`, beágyazókóddal). Az árrés a gyártó egységáraira és ármátrixára kerül (nem a végösszegre), így a vevő tételes kalkulációja egységes, az árrés külön nem látszik. Egy viszonteladói link csak a saját árrését tölti le (`/api/tenant?h=`), a többiekét és az e-mail-címeket nem. A lead a viszonteladóval érkezik (e-mail tárgy, CRM), a viszonteladó másolatot kap, ha van e-mail-címe.
- **Regionális felár:** régiónként (megye / Bundesland) százalékos és/vagy fix nettó felár, külön tételként, a telepítési arány nélkül. Az ajánlatkérő űrlapon a régió kiválasztása után azonnal látszik; ilyenkor a régió a kötelező mezők között van és nincs előre kiválasztva (a rejtett alapérték csendben rossz árat adott volna). A lead, az e-mail, a CRM és az ajánlat ugyanígy számol.
- **Százalékos engedmény** az ajánlatnál (összeg vagy százalék; az összeget a szerver számolja).
- **CRM-webhook:** aláírt JSON-események (`lead.created`, `quote.sent`, `quote.accepted`, `quote.declined`) a gyártó címére: HMAC-SHA256 aláírás időbélyeggel, 5 mp időkorlát, egy újrapróbálás 5xx/hálózati hibánál, átirányítás nem követve. Csak nyilvános https-cím (belső, privát, localhost, metaadat-cím tiltva). Make, n8n, Zapier közvetlenül; HubSpot ezeken át. A webhook hibája nem akasztja meg a leadet vagy az ajánlatot. Admin: cím, titok-generálás, események, tesztküldés mentés nélkül, minta-payload, Node-os ellenőrző kód, beállítási útmutató.
- **Hiba: az ajánlat a kódban lévő alapárakkal számolt**, nem a gyártó adminban szerkesztett áraival (a lead már a szerkesztettekkel). Mostantól az ajánlatkezelő is a ráfésült beállításból számol.
- **Hiba: feloldatlan git-ütközésjelző (`=======`) az admin CSS-ében** (4.81) — a `.ws-interest` szabály emiatt nem érvényesült. Eltávolítva, és új teszt figyeli az összes forrásfájlt.
- **Adatbázis:** új, nem kötelező `leads.dealer_id` oszlop (`supabase/leads.sql`). Ha hiányzik, a lead nélküle mentődik, az ajánlat nélküle olvas.
- **Bemutató:** `/k/demo-at?h=graz` (12% árrés), az űrlapon Tirol / Vorarlberg / Salzburg / Kärnten választásakor fix felár (kitalált bemutató értékek).
- **Korlát:** az árazási szabályok csak a teraszfedés (pergola) árára vonatkoznak; az admin felülete magyar.
- Tesztek: `pricing-rules.test.ts` (árrés és régiós felár számítása, HUF/EUR kerekítés, %-os engedmény, beállítás-ellenőrzés, böngészőbe kerülő adatok szűrése, SSRF-védelem, HMAC-aláírás Node-os ellenőrzéssel, újrapróbálás, tesztküldés, lead és ajánlat végponttól végpontig, régi adatbázis `dealer_id` nélkül, az ajánlat-árhiba), `no-conflict-markers.test.ts`.

## 4.81 – Gyártói admin: egységes kinézet minden aloldalon

- **Érdeklődők – kanban:** a kártyák ugyanúgy néznek ki, mint az áttekintő „Új érdeklődők” kártyái: monogramos kör, település és tető, forrás-címkék, érdeklődés szintje és pontszáma öt pöttyel, irányár és idő, Vanilla hívásgomb, sarokkivágásban a részletek gomb. Az oszlopfej a munkaterület szakaszfeje (cím, darabszám, összérték), az oszlopok olvasható szélességűek, vízszintes sínen; a nevek nem vágódnak. A színes „áthelyezés” pöttyök kikerültek (áthelyezés húzással vagy a részletes panelen).
- **Érdeklődők – tábla és mobillista:** a régi pontszám-címke helyett ugyanaz az öt pöttyös jelzés (új „Érdeklődés” oszlop), monogramos kör, kártyán ülő sorok; a szűrők és az eszközsor a munkaterület pill-gombjai.
- **Részletes panel:** nagy monogram, a pontszám mellett az öt pötty, az állapotgombok egyforma rácsban.
- **Beágyazás és beállítások:** ugyanaz a kártya- és szakaszcím-lépték, mint az áttekintőn.
- **Hiba:** az előző beadásnál (f39a463) ütközésjelölő maradt az `admin-workspace.css`-ben, ezért a Vercel build elbukott; javítva, a párhuzamos „Telepítések” stílusai megmaradtak.
- A kanbankártyán az érdeklődés szintje balra, a pöttyök jobbra, nem csúsznak össze.
- Tesztek: `adminWorkspace.test.ts` (közös érdeklődés-jelző, kanbankártya, oszlopszélesség).
## 4.80 – Telepítések 3/6: tulajdonosi oldal (/t/:token)

- **Tulajdonosi oldal bejelentkezés nélkül:** a titkos linkkel a tulajdonos látja a terméket forgatható 3D-ben (a rögzítéskor befagyasztott konfigurációból, nem szerkeszthető), a garanciát csoportonként lejárati dátummal és állapottal, a komponenslistát, a műszaki adatokat és a gyártó elérhetőségét, a gyártó arculatával és nyelvén.
- **Adatvédelem:** a válaszban nincs személyes adat (név, cím, telefon, e-mail), belső megjegyzés, ár, lead-azonosító, és a token sem jön vissza. Érvénytelen formátumú tokennél adatbázis-hívás sincs; IP-nként percenként 60 megnyitás.
- **Nem indexelt, nem mért:** `noindex` meta és `X-Robots-Tag` fejléc, `Disallow: /t/` a robots.txt-ben, nincs a sitemapben, a szolgáltatásmunkás nem tárolja. A token nem kerül a webanalitikába, a naplóba és az `og:url`-be (`src/lib/privatePath.ts`; az ajánlatoldal tokenjére is érvényes).
- Tesztek: `installationPublic.test.ts` (érvénytelen/ismeretlen/archivált token, személyes adat hiánya, befagyasztás a gyártó későbbi átnevezése után, visszaélés-fék, redakció, robots/SW/sitemap).

## 4.79 – Telepítések 2/6: rögzítés az adminban

- **Új állapot: „Felszerelve”** a „Megnyert” után (táblázat, kanban, szűrők, havi riport). A mutatókban megnyertnek számít.
- **Telepítés rögzítése:** „Megnyert” vagy „Felszerelve” érdeklődő paneljén. Mezők: telepítés napja (nem lehet jövőbeli), garancia hónapban négy csoportra (szerkezet, motor és elektronika, LED, egyéb), belső megjegyzés. A szerver befagyasztja a konfigurációt, a megosztási kódot, a zárt komponenslistát és az árat (elfogadott ajánlat, ha van; különben a rögzítéskori árlista), 256 bites tulajdonosi tokent ad, naplót ír, és a leadet „Felszerelve” állapotba teszi. Egy leadhez egy telepítés.
- **Új admin fül: Telepítések.** Lista, részletek (garancia csoportonként lejárati dátummal, komponensek, tulajdonosi link), végleges törlés (fotókkal, bejelentésekkel, naplóval).
- **Beállítások:** gyártói garancia-alapértékek és megőrzési idő (12–360 hónap, alapból 120). A napi cron (`/api/followup`) a lejártakat fotókkal együtt törli; ez e-mail-kulcs nélkül is lefut, próbafutásnál nem.
- Tesztek: `installationsAdmin.test.ts` (rögzítés és befagyasztás, ajánlati ár, állapot- és dátumszabályok, tenant-elkülönítés memóriabeli adatbázissal, törlés, megőrzés), `adminLeads.test.ts` (Felszerelve = megnyert), `followup.test.ts` (megőrzési törlés Resend nélkül is).

## 4.78 – Telepítések (digitális ikerpéldány) 1/6: adatmodell és migráció

- **Új táblák (Supabase, `supabase/installations.sql`):** `installations` (befagyasztott pillanatkép: konfiguráció, megosztási kód, zárt komponenslista, az akkori ár, sémaverzió, ujjlenyomat; telepítés napja, garancia komponenscsoportonként), `service_requests` (hibabejelentés: komponens, leírás, legfeljebb 4 fotóút, állapot, hozzájárulás ideje és verziója, üres `ai_suggestion` a B-lépéshez), `installation_events` (csak hozzáfűzhető napló; módosítást trigger tilt) és `component_part_numbers` (B-lépés, opcionális). A `leads` tábla új `installation_id` oszlopot kapott (bővítési kérés). Privát `service-photos` tárhely (csak JPEG, ≤ 4 MB).
- **Hozzáférés:** minden táblán RLS, az anon/authenticated szerepkör semmit nem lát; csak a szerver (service role) ír és olvas, a tenant-elkülönítést a szerver a `tenant_id` szűrővel biztosítja.
- **Közös logika (`src/lib/installations.ts`):** 256 bites nyilvános token, pillanatkép és SHA-256 ujjlenyomat, komponenslista a konfigurációból, garancia-lejárat, a bővítés szabályai (a szerkezet zárolt, csak hozzáadni lehet). Felület még nincs.
- Tesztek: `installations.test.ts` (token, befagyasztás árváltozás után, zárt komponenslista, garancia, bővítési zár, séma).

## 4.77 – Konfigurátor: a régi, megjegyzett stílus nem írja felül az új elrendezést

- **Hiba:** aki korábban `?style=soft` (vagy más) címmel nyitotta meg a konfigurátort, annak a böngészője ezt megjegyezte, ezért frissítés után is a régi, sötét felületet látta az új lebegő elrendezés helyett. **Javítás:** új tárolókulcs (`lamelix-ui-style-v2`), így mindenki az alapértelmezett világos, lebegő elrendezést kapja; a `?style=` paraméter továbbra is választ, és azt megjegyzi.
- Tesztek: `studioFloat.test.ts` (új kulcs, alapértelmezés, paraméteres választás).

## 4.76 – Konfigurátor: lebegő elrendezés és oldalsó eszközfül

- **Új elrendezés** Ádám referenciái alapján (világos, alapértelmezett stílus): a 3D jelenet kitölti a munkafelületet, a lépéspanel balra lebeg fehér kártyán. A pergola a panel és az eszközfül közötti szabad rész közepére kerül (nézet-eltolás, `floatViewShiftX`).
- **Eszközfül:** minden jelenet-eszköz (kameranézet, napszak, bejárás, eső, AR, nézet és vizualizáció, árnyékelemzés, fotóba helyezés, működés, robbantott nézet, költségkeret, üzemeltetés, tanácsadó, bemutató, PDF, megosztás) a jobb szélből kinövő fekete fülben, két homorú lekerekítéssel, kerek ikongombokkal. A bekapcsolt eszköz Vanilla gyűrűt kap. A fülre mutatva minden felirat egyszerre kinyílik; az „Eszközök” menü ebben a stílusban megszűnt. Az árnyékelemzés saját ikont kapott (nem azonos a napszakéval).
- **Mobil:** ugyanaz a fül kisebb gombokkal, görgethető; felhúzott lapnál elbújik, a pergola a fül nélküli rész közepén.
- A többi stílus (`?style=soft`, `glass`, `studio`) és a többi termék-stúdió változatlan.
- Tesztek: `studioFloat.test.ts` (bekapcsolási feltétel, nézet-eltolás, fül szerkezete, lekerekítések, bal panel).

## 4.75 – Gyártói admin: a 2. kritikus forduló javításai

- **Egy kiemelés:** csak a legfontosabb teendő Vanilla, a nyitott érték számkártyája sötét (Vanilla számmal). Mobilon a teendők a számkártyák előtt jönnek, így a hívásgomb az első képernyőn van.
- **Grafikon:** a napi érdeklődők egyenes szakaszokkal, a simított görbe nem létező hullámokat rajzolt.
- **Lejárt jelölés:** csengő-gomb helyett csendes „lejárt” címke a sorban; a teendő címe rövidebb („Ajánlat követése”), egy sorban marad.
- **Kanban és panel:** az oszlopfej és a kártyanév egy sorban (levágással), az állapotgombok rácsban, vágás nélkül; az apró magyarázó szövegek 13 px-esek.
- Tesztek: `adminWorkspace.test.ts` (egyenes grafikon, egyetlen Vanilla számkártya).

## 4.74 – Gyártói admin: UX-kritikus kör javításai

- **Áttekintés átrendezve:** felül négy egyforma számkártya (nyitott érdeklődő, megnyert, nyerési arány, nyitott érték), utána **elsőként a Teendők** rácsban, vízszintes görgetés nélkül, a lejártak elöl, minden kártyán hívás- és e-mail-gomb; szűrők darabszámmal (Mind / Lejárt / Esedékes / Forró), legfeljebb 6 kártya + „Összes teendő”. Az „Új érdeklődők” tömör kártyákon (legfeljebb 3), hívásgombbal.
- **Ismétlések törölve:** a második KPI-sor, a „Legfrissebb”, a „Státuszok” és a lábjegyzet. A konverzió, lépések, tetőtípusok és települések egy összecsukható „Látogatottság és statisztika” kártyába kerültek. A napi grafikon y-tengelyt kapott.
- **Sarokkivágás maszk nélkül:** a kerek gombok fordított sugarú fülben ülnek (a felület színével festve), nem takarja őket semmi.
- **Egy hangcsalád:** az állapot- és pontszámszínek Vanilla / pasztell kék / homok / zöld / szürke; a címkék semleges alapon színes pöttyel. Az érdeklődés pöttyei egyszínűek.
- **Érdeklődők:** a táblában körvonalas hívásgomb, a kereső belső doboz nélkül, a kanban öt oszlopa elfér, a pontszám-címke saját sorban. Részletes panel: állapotgombok egy sorban, a telefonszám és az e-mail kattintható, Vanilla „Hívás”.
- **Beállítások:** látható mezőhatár, nagyobb címkék, átnevezett mezők, ragadós Mentés; a mentési hiba szakszó nélkül.
- **Mobil:** alcím nélküli fejléc, a ritka műveletek (CSV, Frissítés, Kanban) asztali gépen, görgethető szűrősávok, lebegő alsó navigáció egyetlen aktív jelzéssel.
- Tesztek: `adminWorkspace.test.ts` (teendők elöl, rács, hívásgombok, nincs ismétlődő KPI-sor, nincs maszk, harmonizált színek, hibaüzenet).

## 4.73 – Gyártói admin: sötét „munkaterület” dizájn

- **Új megjelenés** Ádám referenciája alapján (sötét CRM-felület): fekete alap, nagy, lekerekített kártyák, fülszerű sarokkivágás kerek gombokkal, pill-szűrők, kerek ikongombos oldalsáv, Urbanist betű. A kiemelő szín a márka Vanilla-ja (#EFF0A3), egy CSS-változóban (`--ws-accent`) cserélhető.
- **Áttekintés – munkaterület:** nagy számok (nyitott / megnyert / elveszett érdeklődő, nyitott érték); **„Új érdeklődők”** kártyasor (monogram, település · tető · méret, forrás- és viselkedési chipek, érdeklődés 5 pöttyel a lead-pontszámból, szűrők: Mind / Forró / Új / Ma); **„Mai teendők”** kártyasor kiemelt első kártyával (első hívás, utánkövetés, ajánlat nyomon követése; lejárt jelzés; a státusz a kártyán módosítható, egy koppintásos hívás és e-mail). Alatta a meglévő mutatók és grafikonok az új stílusban.
- Minden adat valódi: fotó helyett monogram (a vevőkről nem tárolunk képet), a pöttyök a meglévő lead-pontozásból, a chipek csak a valóban megtörtént jelekből (PDF, AR, megosztás, visszatérés). Videóhívás és naptár nincs a termékben, ezért nem is látszik.
- Érdeklődők (tábla, kanban), részletes panel, beágyazás, beállítások és a belépés ugyanabban a sötét rendszerben.
- Tesztek: `adminWorkspace.test.ts` (pöttyök, chipek, teendők, felület), `lightReadability.test.ts` frissítve.

## 4.72 – Nyitóoldal: a 2. kritikus kör javításai

- **Hiba: a „Hét lépés” címkéje („A vevő szemével”) a cím sorai közé csúszott;** most a cím fölött áll.
- A redőny zárt tetején a címke „A gyártó oldalán” (eddig „a vevő oldalán” – nem volt egyértelmű, kinek szól az „Ön”).
- A héró ár-lapján „Példa” jelölés (a lead-lapon már volt); az első érvben ott az egyszeri bevezetés is („59 000 Ft/hó-tól (+ áfa, + egyszeri bevezetés)”); az árak bevezetőjében a projektérték „becslésünk szerint”.
- Palettán belüli megtérülés-kalkulátor (ink sáv, Vanilla eredmény, nincs neonzöld), kis „β” címke a nagy fekete pötty helyett, fehér demóűrlap jól látható mezőkkel, olvashatóbb inaktív funkciócímek; mobilon az élő demó gombjai nem ütköznek.
- Tesztek: `landingAudit.test.ts` (+1 őr).

## 4.71 – Nyitóoldal: a független kritikus-audit hibáinak javítása

- **Hiba: a demókérő űrlap és a GYIK kétszer szerepelt** az oldalon (kétszeres `id="demo"`); most egyszer.
- **Héró:** az első képernyőn mindhárom érv látszik (magyarul, forintban, havidíj 59 000 Ft-tól + áfa; a vevő hazaviszi a tervet: PDF, QR-kód, AR; indulás 5–10 munkanap, hűségidő nélkül), telefonon is. Alacsony asztali képernyőn a laptop kisebb, hogy ne takarja.
- **Árak egy képernyőn:** minden csomag havidíja a fülön, a kártyán „+ egyszeri 490 000 Ft bevezetés · minden ár nettó, +27% áfa”. Két új GYIK-kérdés: teljes költség és a bevezetési díj tartalma (a valódi árakkal).
- **Megtérülés-kalkulátor:** az eredmény „Becsült”, a Start csomaggal és 3 plusz megrendeléssel indul (eddig Pro és 6).
- **Nincs túlígérés:** az előtte–utána kép bemutató jelenetként szerepel (eddig „egy fotóból”), „az ajánlat generálódik” helyett „az irányár és a terv már a kérésben van”. Új záró szöveg („Kérdés helyett kész terv érkezik.”); magázó gombfelirat az élő demónál; a redőny mondata nem ismétli a következő címet, és már záródás közben megjelenik.
- **Vizuális rendszer:** közös bal él és szélesség minden szakaszban, egységes szakaszcím-méret; a Vanilla csak kiemelés (a gombfény, pötty és ikonháttér semleges); semmi 13 px alatt, sötétebb placeholder; palettán kívüli színek ki („Négy lépés”); a „Miért éri meg?” rajzai a termékből (lamellás tető árcímkével, PDF-terv QR-kóddal, beépített konfigurátor); a statisztika-sáv állítással és nagy számokkal; a felhőképek széle elhalványul; a laptop kijelzője betöltés előtt sem üres; a záró CTA csak vonalrajz-csempékkel, tömör Vanilla sávval; a probléma-kollázs lapjai nem csúsznak a címre.
- **Navigáció:** az „Élő demó” link kikerült a fejlécből (a hérón és a láblécben megvan), a linkek kattintási területe legalább 44 px, átlátszatlanabb sáv.
- **Útvonal a célhoz:** „Kérek demót” gomb az előtte–utána és a „Négy lépés” szakasz végén; mobilon az előtte–utána lista elmarad (a kollázs már elmondja).
- Ellenőrzés: átfedés-vizsgálat 15 képernyőméreten tiszta; szövegméret-vizsgálat: nincs 13 px alatti olvasható szöveg.
- Tesztek: `landingAudit.test.ts` (10 őr).

## 4.70 – Héró: nem csúsznak egymásra a szövegek és a laptop

- **Hiba: telefonon a laptop és az ár-lap a gombokra és a leírásra csúszott** (valódi iPhone, böngészősávokkal kisebb látható magasság). Telefonon és álló tableten a laptop mostantól normál elrendezésben, a gombok alatt áll, így semmilyen képernyőmagasságnál nem takarhat szöveget; az ár-lap a laptop képernyőjére került.
- Ha a laptop nem fér ki a képernyőre (alacsony telefon), a görgetés első szakaszában a tartalom felcsúszik, és a laptop teljesen előjön, mielőtt a lamellák bezáródnak (a redőny ezért kicsit később indul; telefonon a héró 160 → 190 vh).
- **Hiba: alacsony asztali képernyőn (1280×720, 1366×768, 1536×864) a laptop a cím utolsó sorára csúszott.** A laptop jobbra került, a mérete a képernyő magasságához is igazodik, a cím mérete alacsony képernyőn kisebb; görgetéskor a laptop már nem úszik fel a címre.
- **Hiba: álló tableten az ár-lap a pipás listára lógott.**
- Ellenőrzés: automatikus átfedés-vizsgálat 15 képernyőméreten (360×640-től 1920×1080-ig), betöltéskor és görgetés közben: nincs átfedés, nincs vízszintes túlcsordulás, a laptop mindenhol teljesen előjön.
- Tesztek: `heroSky.test.ts` (elrendezés-szabályok).

## 4.69 – Héró: lebegő laptop a kézben tartott telefon rajza helyett

- **Új főkép** (Ádám kérése): a vonalas kéz a telefonnal megszűnt. Helyette letisztult, kódból épített laptop lebeg a felhők felett (grafit keret, ezüst alap, finom lebegés), a kijelzőn a valódi asztali konfigurátor képe a Tető lépésnél (Aero tető, 5 648 000 Ft bruttó irányár). A laptop a kurzor felé dől, görgetéskor kissé előrebillen; körülötte maradnak a lebegő lapok.
- Külön elrendezés asztali gépre, alacsony képernyőre (a pipás lista elrejtve), fekvő és álló tabletre, valamint telefonra.
- Törölve: `HandPhone.tsx`, `handGeometry.ts`, `phone-screen.webp`.
- Tesztek: `heroSky.test.ts` (laptop, valódi képernyőkép, mozgáscsökkentés).

## 4.68 – Héró-átvezetés: „Lamella-redőny” a ráközelítés helyett

- **Új átvezetés a héró és a „Hét lépés” között** (Ádám választása): a ráközelítés megszűnt. A héró végén felülről sorban 12 lamella fordul be és záródik (90° → 0°), mint egy bezáródó lamellás tető; a zárt tetőn egy mondat áll („Hét lépés a vevőnek, kész ajánlatkérés Önnek.”). A „Hét lépés” szakasz elején a lamellák felülről sorban kinyílnak, és alattuk már az a szakasz áll (a szakasz a héró utolsó képernyője alá csúszik, a csere a zárt lamellák mögött történik).
- A héró rövidebb lett (240 → 170 vh, telefonon 210 → 160 vh); a kéz, a lapok és a felhők finom parallaxszal mozognak.
- Csak transform-animáció (12 GPU-réteg), mozgáscsökkentésnél nincs redőny.
- Tesztek: `heroSky.test.ts` frissítve (redőny, sorrend, mobil, mozgáscsökkentés).

## 4.67 – Gyorsabb, akadásmentes animációk a nyitóoldalon

- **Héró: nincs több teljes újraszámolás képkockánként.** A görgetés és a kurzor eddig CSS-változókat írt a héró gyökerére, ami minden képkockán a teljes részfa (benne a kéz több száz SVG-eleme) stílusát újraszámoltatta. Most egyetlen rAF-ben, közvetlenül a néhány mozgó elem transform/opacity értéke változik; a kurzor-parallax simítása is itt történik (a minden képkockán újrainduló CSS-átmenetek megszűntek). A telefon mozgás közben saját GPU-rétegen csúszik, nagyításkor a tinta-szűrő kikapcsol.
- **Cím:** a betűnkénti belépés rövidebb és elmosás-szűrő nélküli; a súly-lencse nem olvas elrendezést mozgás közben (eddig betűnként olvas-ír-olvas volt).
- **„Hét lépés”:** a folyamatsáv React-renderelés nélkül frissül, képernyőn kívül a szakasz nem számol.
- **Funkciók és záró sáv:** a folyamatosan animált rajzokról lekerült a tinta-szűrő (minden képkockán újraszámolódott); az álló rajzokon (kollázs, „miért” ikonok, a héró keze nyugalomban) megmaradt. A képernyőn kívüli szakaszok végtelen animációi szünetelnek.
- **Élő SB 400 demó:** görgetés közben nem töltődik be magától (ez okozott akadást), helyette a demóról készült álló kép látszik; kattintásra indul, rögtön interaktívan.
- A héró belépő animációi gyorsabbak, a sima görgetés kicsit fürgébb (Lenis lerp 0,14).
- Mérés (fej nélküli Chromium, szoftveres renderelés, ezért csak arányaiban mérvadó): funkciók szakasz 350 → 17 ms/képkocka, élő demó környéke 1 200–1 800 → 17–20 ms, héró JS-ideje képkockánként kb. 10 → 2,5 ms.
- Tesztek: `heroSky.test.ts` (teljesítmény-szabályok).

## 4.66 – Új nyitó animáció: „Lamellafal” (10 mp)

- **A nyitó animáció lecserélve** a „Lamelix logó – Lamellafal” videóra (9:16, 10 mp: lamellafal → szétnyíló lamellák → logó és felirat). Minden úton ez fut: videó, hardveres dekóder (tiltott automatikus lejátszásnál), animált kép, és a zárókocka állóképe.
- Az új videó egyszerűbb grafika, így kisebb is: videó 0,47 MB (eddig 2,8 MB), animált tartalék 0,2 MB (eddig 1,7 MB); jobb minőséggel kódolva (a sötét háttér színátmenete nem sávosodik). A nyitókép háttérszíne az új videóhoz igazítva.
- Új: `scripts/intro-assets.sh <forrás.mp4>` – egy paranccsal előállítja a négy fájlt (videó, dekóder-index, animált tartalék, logós állókép) a következő cseréhez.
- Tesztek: `introSplash.test.ts` (240 képkocka, 10 mp, az index a videóhoz tartozik), `tests/e2e/intro.cjs`: zöld; a dekóderes út Chrome-ban és a Safari motorjában is végigfut (10,3–10,6 mp).
- Nem ellenőrzött: valódi iPhone-on és iPaden.

## 4.65 – Héró „Felhők felett”: kéz a telefonnal, betűnkénti cím, ráközelítés a képernyőre

- **Új héró.** Pasztell ég három réteg felhővel (mélységi parallax egérre és görgetésre), középen kódból rajzolt, tollrajz-hatású kéz a telefonnal; a képernyőn a valódi mobil konfigurátor (3/7 Tető lépés). Mellette lebegő lapok: valódi irányár gördülő számokkal, lépéssáv, beérkező kérelem („Példa” jelöléssel).
- **Kinetikus cím.** A cím betűnként úszik fel; asztali gépen a kurzor közelében a betűk elvékonyodnak (változó Urbanist-súly). Képernyőolvasó a teljes címet egyben kapja.
- **Ráközelítés görgetésre.** Görgetéskor a telefon kiegyenesedik és ráközelít a képernyőre, a felhők szétnyílnak; innen közvetlenül a „Hét lépés” képsorozat jön (a sorrendben a statisztika és a kollázs elé került). Telefonon külön elrendezés, ugyanazzal a hatással; mozgáscsökkentésnél nincs zoom és betű-animáció.
- **Hiba: a „Hét lépés” kockái élesen hiányoztak.** A `.gitignore` `build/` szabálya a `public/assets/landing/build/` 80 képkockáját is kizárta, ezért élesen 404 volt; most bekerülnek a repóba.
- A héró már nem tölti a 3D-s HeroLouvre-t, így könnyebb az első betöltés.
- Tesztek: `heroSky.test.ts` (képek, betűbontás, zoom-geometria, mozgáscsökkentés, sorrend, mobil elrendezés, gitignore), `landingV2.test.ts` frissítve.

## 4.64 – Helyes kapcsolati e-mail

- **Javítás: kapcsolati e-mail.** A cím mindenhol a helyes `hrvthadam.7@icloud.com` (nyitóoldal, GYIK, adatkezelési tájékoztató, admin „elfelejtett jelszó”, demókérés-hiba visszaesés, strukturált adatok); az elírt régi cím megszűnt.
- Tesztek: `contactEmail.test.ts`.

## 4.63 – Új nyitóoldal: az asztalon a termék

- **Új nyitóoldal („az asztalon a termék”):** Ádám referenciái (TrainerFlow, Kiwi) alapján, a világos pasztell rendszerben. A héróban a valódi 3D lamellás tető pasztell shader-égen, körülötte a konfigurátor kódból újrarajzolt darabjai lebegnek (lépéssáv, ár-dokk valódi árakkal, lamellaszög- és színválasztó, beérkező kérelem „Példa” jelöléssel), kurzorra mélység szerint dőlnek. Új cím: „Pergolák 3D-ben, saját arculattal, a weboldalán.”
- **Rendrakás:** a mai ajánlatkérés szétszórt papírjai (Excel, telefon, PDF, cetli) görgetésre egyetlen tervlappá rendeződnek, kódból rajzolt vonalas SVG-vel.
- **Hét lépés képsorozat:** a valódi konfigurátorból képkockánként rögzített 40 kép (robbantott nézet → összeállás → lamellanyitás), görgetésre, mellette a hét lépés és az irányár a valódi árazó motorból (4 610 000 → 5 264 000 → 5 648 000 Ft, demó-árlista).
- **Miért éri meg?** sáv a brief három érvével; **funkció-bemutató** nagy színpaddal és élő vonalrajz-jelenetekkel (telefonon lapozható sín); **admin pipeline** ink lapon, oldalról oldalra lépő lead-kártyával; **csomagváltó** egyetlen nagy lappal és gördülő havidíjjal; **GYIK beszélgetésként** (kérdés-csipek, válasz-buborék); **záró CTA** Vanilla sávon, úszó vonalrajz-csempék előtt.
- Kézi tinta-vonal szűrő a vonalrajzokon (a line-art-animation könyvtár paramétereivel, MIT, forrás megjelölve). A tartalmat takaró ragadós „Élő demó” sáv megszűnt; a fő cél a fejlécben és szakaszonként érhető el.
- A nyitóoldal képernyőképei helyett a régi „Bemutató” szakasz kikerült; fejlesztői képkocka-rögzítő horog csak dev módban (élesben nem fut).
- Ellenőrzés: 3 kör független kritikus (design-loop), kontrasztszkenner 0 hiba asztalon és mobilon, 390 px-en nincs túlcsordulás, copy-gate tiszta. Nyitott pontok: docs/landing/progress.md.
- Tesztek: `landingV2.test.ts` (az árak a valódi motorból, képkockák, nyelvi szerkezet, tinta-szűrő, dev-horog, mozgáscsökkentés), `landingUi.test.ts` frissítve.

## 4.62 – Egységes világos design minden oldalon

- **Egységes világos design mindenhol:** a nyitóoldal (HU és EN), a gyártói belépés, az adatkezelési tájékoztató, a 404-es oldal és a mintaoldal is a konfigurátor és az admin világos, pasztell rendszerét kapja: Urbanist betű, #ECECEF alap, fehér kártyák, fekete pill gombok, Vanilla kiemelés (a dőlt serif kiemelés helyett Vanilla aláfestés), Honeydew/Alice Blue díszítő színátmenet. A sötét zöldesfekete háttér és a neon-lime eltűnt.
- A nyitóoldal termékképei (konfigurátor, admin áttekintés, érdeklődők, mobil lead-adatlap) újra készültek az új, világos felületről, így a bemutató a valódi mai kinézetet mutatja.
- A Lamelix logó a világos oldalakon a sötét változatot használja; a nyelvváltó aktív gombja fehér felirattal.
- A 404-es oldal saját, egyszerű világos kártyát kapott, a Lamelix kezdőlapra mutat.
- A mintaoldal fotós, „esti” jelenetei továbbra is sötét fotón ülnek (a kép miatt), a betű és a kiemelés ott is az új rendszeré.
- Ellenőrzés: kontrasztszkenner a nyitóoldalon (HU, EN, mobil), belépésen, adatkezelésen, 404-en: 0 hiba; a mintaoldalon a valódi hibák javítva (a maradék jelzés fotón ülő szöveg, ahol a szkenner nem látja a képet).
- Tesztek: `lightReadability.test.ts` bővítve (főoldal tokenjei, lime nélkül; performative-ui elemek; jogi oldalak és logók; mintaoldal).

## 4.61 – Nyitó animáció hardveres dekóderrel iPhone-on és iPaden is, ha a videó automatikus lejátszása tiltott

- **Hiba: iPhone 14 Pro-n az animáció szaggatott.** Mivel a telefon tiltja a videó automatikus indítását, a tartalék animált AVIF kép futott. Az AVIF-et az A16 chip (iPhone 14 Pro) nem tudja hardveresen kibontani (erre csak az A17 Pro-tól képes), ezért szoftveresen, szaggatva játszotta le.
- **Javítás:** tiltott automatikus lejátszásnál ugyanaz a videó a hardveres H.264-dekóderrel (WebCodecs) kerül vászonra (`src/intro/decoderPlayer.ts`). Erre a tiltás nem vonatkozik, és ugyanúgy a hardver dolgozik, mint a sima videólejátszásnál. A minták helye előre ki van számolva (`public/assets/intro/lamelix-intro.json`, 6 KB, a videóból generálva; teszt ellenőrzi, hogy egyezik). Az animált kép csak akkor jön, ha a böngésző ezt sem tudja.
- Mérés (tiltott videó, csak a lejátszás alatt): Chrome-ban a leghosszabb képkocka-kihagyás 33 ms; a Safari motorjában ebben a gyenge, hardveres dekóder nélküli környezetben 107 ms (az animált képnél 246 ms volt). A zárókockáig, 9,2–9,5 mp-ig végigfut.
- Tesztek: `introSplash.test.ts` (az index a videóhoz tartozik: 216 minta, érvényes NAL-hosszak, egyező avcC; tiltásnál előbb a dekóder, utána az animált kép), `tests/e2e/intro.cjs` (dekóderes vászon fut és mozog, gomb nincs, végigfut; dekóder nélkül animált kép): mind zöld.
- Nem ellenőrzött: valódi iPhone 14 Pro-n és iPaden.

## 4.60 – Javítás: a nyitó animáció szaggatott, és a konfigurátor a logó előtt bejött

- **Hiba:** az animáció közben épült fel a felület és a 3D jelenet; ez a fő szálat és a grafikus processzort lefoglalta, ezért az animált kép (amit az iPad a tiltott videó helyett játszik le) szaggatott, és lemaradt az időzítőhöz képest, így a konfigurátor már az animáció közepén bejött.
- **Javítás:** amíg az animáció fut, sem a felület, sem a 3D nem épül (a fájlok a service worker tárából jönnek, a letöltés nem akad). Az animáció végigfut a logóig, a logós zárókép áll, és mögötte épül fel a konfigurátor; a nyitókép akkor tűnik el, amikor a 3D kész (legfeljebb 10 mp). Ha az animáció 4 mp alatt sem indul el (lassú hálózat), a konfigurátor a nyitókép mögött épülhet.
- Mérés (Safari motorja, iPad-nézet, tiltott videó, ebben a gyenge, grafikus gyorsítás nélküli környezetben): a leghosszabb akadás 1515 ms → 246 ms, a 100 ms feletti akadások 14 → 4, és az animáció a teljes 9 mp-ig fut (eddig ~5 mp után megszakadt).
- Tesztek: `introSplash.test.ts` (a felület és a három 3D-stúdió a jelzőre vár, a nyitókép csak a vég után zárul), `tests/e2e/intro.cjs` (az animáció alatt nincs 3D vászon, végigfut, utána a logó áll): mind zöld; `tests/e2e/offline.cjs` is zöld.
- Nem ellenőrzött: valódi iPaden. A leggördülékenyebb továbbra is a videó: ha az iPaden be van kapcsolva a „Videók automatikus lejátszása” és nincs energiatakarékos mód, animált kép helyett videó fut.

## 4.59 – Olvashatóság a világos felületen, egységes admin

- **Olvashatóság a világos felületen:** az Eszközök menü, a Nézet és vizualizáció panel, a kameramenü, az ár részletei, a Tudnivalók, a tanácsadó, a költségkeret, az energia- és az újrakezdés-ablak, az értesítések és a jelenet fölötti jelzések (esőautomata, bejárás) eddig sötét háttéren sötét szöveggel jelentek meg. Most fehér kártyák sötét szöveggel; a body-ba portált ablakok (fotós színmintavétel) a `body.ui-light` osztályon át ugyanezt kapják.
- A másodlagos szöveg színe `#5C5E64` lett: fehér, Ghost White, alap-, Vanilla és Honeydew háttéren is legalább 4,5:1 kontraszt (WCAG AA). A sötét téma neon-lime kiemelései helyett világosan Vanilla kijelölés és fekete gyűrű; a „PDF összefoglaló” gomb fekete pill fehér szöveggel.
- Automatikus kontrasztszkenner (WCAG) futott mind a 7 lépésen, asztali, álló és fekvő mobil nézetben, és minden menün és ablakon: 0 hiba.
- **Admin egységesítve:** ugyanaz a világos, pasztell rendszer (Urbanist betű, #ECECEF alap, világos oldalsáv fehér kártyán, fekete pill elsődleges gomb, Vanilla kijelölés, fekete grafikonvonal, pasztell sávok); a Lamelix logó sötét változata a világos oldalsávon. Kontrasztszkenner az admin négy nézetén és a lead-fiókon: 0 hiba.
- Tesztek: `lightReadability.test.ts` (kontrasztarányok számolva, lebegő felületek felülírásai, body-osztály, admin tokenek és logó).

## 4.58 – Világos felület magas/ultra minőségen: nem sötét, nincs horizontvonal

- **Hiba: a világos felület magas és ultra 3D-minőségen (erősebb asztali gépek) sötétnek, „koszosnak” hatott,** és látszott a padló és a háttér határvonala. Világos stúdió-háttérnél az utófeldolgozás most lágyabb árnyékolást (AO 2,6 helyett 1,25) használ, nincs sötét vignetta, a kép kissé világosabb; a háttér horizontja pontosan a köd színe, így nincs vonal. A sötét felület (`?style=soft`) változatlan.
- Tesztek: `studioStyle.test.ts` (utófeldolgozás világos stílusban, horizontszín).

## 4.57 – Világos, pasztell konfigurátor-felület (alapértelmezett)

- **Új, világos, pasztell felület a konfigurátorban (alapértelmezett):** a kért referenciák alapján Urbanist betű; világosszürke alap; Ghost White panel és fehér kártyák nagy (24–32 px) lekerekítéssel és puha árnyékkal; fekete „pill” fő gombok fehér felirattal, körvonalas másodlagos gombok; pasztell kiemelések: Vanilla (#EFF0A3) a kiválasztott kártyán, Honeydew (#CFDECA) a tanácsadón és a kész lépéseken, Alice Blue (#D8DFE9) a betöltősávon. A lépéssávban az aktív lépés fekete pill vanília számmal. A „Pergola / A házad” választó és a jelenet eszközsora fehér pill.
- **3D jelenet:** világos, kékesszürke stúdióháttér, semleges nappali fény; a betöltő kártya és a poszter is világos.
- **Kevesebb címke:** kicker-feliratok, léptékjelzés és „Konfiguráció 01/07” sor nélkül; a Lamelix logó sötét változata.
- A korábbi sötét felület továbbra is elérhető: `?style=soft` (a választást a böngésző megjegyzi).
- Új függőség: `@fontsource-variable/urbanist` (a kért Urbanist betű, helyben kiszolgálva, külső betűszerver nélkül).
- Tesztek: `studioStyle.test.ts`, `uiStyle.test.ts` (alapértelmezett stílus, paletta, betű, gombok, világos stúdióháttér).

## 4.56 – Javítás: iPaden play-jel jelent meg a nyitó animáción, rákoppintva a konfigurátor jött

- **Hiba:** ha az iPad tiltja a videók automatikus lejátszását (energiatakarékos mód, vagy Kisegítő lehetőségek → Mozgás → „Videók automatikus lejátszása” kikapcsolva), az iOS a videóra a saját play-jelét tette; a videó nem indult, és a 3D elkészültekor a nyitókép bezárult.
- **Javítás:** ilyenkor ugyanez az animáció animált AVIF képként fut le (`public/assets/intro/lamelix-intro.avif`, 720×1280, 1,7 MB) – a képekre ez a tiltás nem vonatkozik, így gomb nélkül, magától indul, teljes képernyőn. A végén a logós állókép (`lamelix-intro-logo.webp`) áll, amíg a 3D kész; amíg az animáció betölt, szintén ez látszik. Az iOS play-jele CSS-sel rejtve, a videó elem tiltásnál el is tűnik. Mindkét fájl benne van az offline letöltésben.
- Tesztek: `introSplash.test.ts` (tartalék fájlok, offline, a play-jel rejtése, a tartalékra váltás). Böngészős próba (`tests/e2e/intro.cjs`, tiltott automatikus lejátszás): az animált kép fut és mozog, nincs gomb, a végén eltűnik; WebKit-motorral (Safari motorja, iPad-nézet) is lefut.
- Nem ellenőrzött: valódi iPaden. Ha az iPaden az „Animált képek automatikus lejátszása” is ki van kapcsolva, a tartalék is állna – ilyenkor a logós kép látszik.

## 4.55 – Nyitó animáció gombok nélkül, teljes képernyőn

- **A nyitó animáció magától indul, teljes képernyőn, és végigfut:** nincs „Kihagyás” és „Lejátszás” gomb, az érintés nem zárja be (és nem jut át a háttérben töltődő konfigurátorra). Minden kijelzőn kitölti a képernyőt (fekvő telefonon is).
- Ha a rendszer tiltja az automatikus lejátszást (iOS energiatakarékos mód – ezt weboldal nem írhatja felül), gomb helyett a videó logós zárókockája (Lamelix logó + felirat) áll, amíg a 3D betölt, utána eltűnik. Elakadt lejátszásnál 22 mp után mindenképp eltűnik.
- Tesztek: `introSplash.test.ts` (nincs gomb az indító szkriptben, zárási szabályok), `tests/e2e/intro.cjs` (nincs gomb, érintésre nem zárul, teljes képernyő, tiltott lejátszásnál a logós kocka áll és a 3D elkészültekor eltűnik): mind zöld.
- Nem ellenőrzött: valódi iPaden.

## 4.54 – Kipróbálható stúdió stílus (?style=studio)

- **Új, kipróbálható stílus: `?style=studio`** (letisztult, modernebb változat; az alapértelmezett nézet nem változik, a választást a böngésző megjegyzi, visszaállítás: `?style=soft`).
  - **Stúdió-jelenet:** a 3D háttér színátmenetes, hajlított stúdióháttér (mint egy fotóstúdió körfala), a padló semleges szürke, és varrat nélkül olvad a háttérbe; a jelenet semleges nappali fényben indul (a naplemente rózsaszínes tónust adott a világos háttérnek). A háttér a kamerával mozgó gömb, tónusleképezve, így nincs látható horizontvonal.
  - **Kevesebb címke:** eltűntek a nagybetűs kicker-feliratok („ÉLŐ ÉPÍTÉSZETI JELENET”, „KONFIGURÁCIÓ 01/07”, „01 · MIT ÉPÍTESZ”, „ÉPÍTÉSZETI KONFIGURÁTOR”) és a léptékjelzés; egyetlen hierarchia: lépés címe → lehetőségek.
  - **Visszafogott lime:** a kiválasztott kártyák semleges fehér gyűrűt kapnak lime keret és háttér helyett; a lime a fő gombon és az aktív lépésen marad.
  - **Egy áttetsző eszközsor** a jeleneten a különálló kerek gombok helyett; az aktív gomb fehér.
  - **Egy betűcsalád** (Inter), nagy, táblázatos számjegyű ár.
- Tesztek: `studioStyle.test.ts` (stílusválasztás, kezdő fény, stúdióháttér, CSS-szabályok).

## 4.53 – Javítás: a nyitó animáció iPaden csak felvillant, aztán a konfigurátor jött

- **Hiba:** a nyitókép két esetben azonnal bezárt: (1) ha a rendszer tiltotta az automatikus lejátszást (iOS energiatakarékos mód és hasonlók) – ilyenkor csak az első képkocka villant fel; (2) ha a videó 2,5 mp alatt nem indult el (első indítás lassabb wifin, a 2,8 MB még nincs tárban).
- **Javítás:** tiltott automatikus lejátszásnál a nyitókép marad az első képkockán egy „Lejátszás” gombbal, koppintásra (vagy a videóra koppintva) elindul; ha senki nem koppint, a 3D elkészültekor eltűnik. Lassú betöltésnél a videót legfeljebb 12 mp-ig várja (de a kész 3D-t nem tartja vissza egy álló képpel). Lejátszás közben a véletlen érintés már nem zárja be, csak a „Kihagyás” gomb; elakadt lejátszásnál 22 mp után mindenképp eltűnik.
- Tesztek: `introSplash.test.ts` (a két hibát bemutató esetek: lassú betöltés, tiltott lejátszás; végső biztosíték). Böngészős próba (`tests/e2e/intro.cjs`) új lépései: tiltott automatikus lejátszás → „Lejátszás” gomb → koppintásra indul; 4 mp-cel késleltetett videó → kivárja és lejátssza. Élesben WebKit-motorral (Safari motorja, iPad-nézet) első és második (SW-tárból) indításkor is végigfutott. Mind zöld.
- Nem ellenőrzött: valódi iPaden; hogy nálad melyik eset (energiatakarékos mód vagy lassú betöltés) okozta, nem tudtam megállapítani.

## 4.52 – A háztípus (fa–cink, lapostetős, nyeregtetős) újra könnyen megtalálható

- **Hiba:** a háztípus-választó csak a Szín lépés „A házad” fülén volt, és mióta az alapkörnyezet a semleges stúdió („Csak a pergola”), a választásnak nem volt látható hatása – úgy tűnt, mintha eltűnt volna.
- **Javítás:** a háztípus a Nézet és vizualizáció panelen, a Környezet alatt is választható (ikonnal). Stúdió háttérből egy háztípust választva a jelenet a „Családi ház” környezetre vált, így a ház azonnal látszik; a Szín lépésben ugyanez történik, és egy rövid megjegyzés jelzi.
- A vevő saját homlokzatszínét a háztípus-váltás nem írja felül (csak az eredeti alapszínt cseréli fa ↔ vakolat).
- Tesztek: `houseStylePatch.test.ts` (környezetváltás stúdióból, homlokzat-alapszín cseréje, a saját szín megtartása).

## 4.51 – Nyitó animáció a telepített webapp indításakor (mobil, tablet)

- **Lamelix logó-animáció (9:16, 9 mp):** a kezdőképernyőről indított webapp konfigurátor-oldalain (/konfigurator, /k/<id>, /embed/<id>) érintőképernyős eszközön lejátszódik, miközben a háttérben betölt a 3D konfigurátor. Inline szkriptként indul az alkalmazás JavaScriptje előtt, így nincs üres képernyő. A végén eltűnik, ha a 3D kész; ha még nem, legfeljebb 6 mp-ig a logós zárókockán áll. „Kihagyás” gombbal (vagy koppintással) azonnal bezárható.
- Munkamenetenként egyszer fut (a „Frissítés” utáni újratöltésnél már nem); böngészőfülön, asztali gépen, a nyitóoldalon, az adminban és csökkentett mozgás beállításnál nem. `?intro=1` böngészőben is elindítja (bemutatóhoz), `?intro=0` tiltja. Ha a videó 2,5 mp alatt sem indul el (pl. iOS energiatakarékos mód tiltja az automatikus lejátszást), azonnal eltűnik és a szokásos betöltés látszik.
- Videó: `public/assets/intro/lamelix-intro.mp4`, az eredeti 23 MB-os, 1080p, hangos fájlból 720×1280, H.264, hang nélkül (némított automatikus lejátszás), 2,8 MB. Benne van az offline letöltésben; a service worker mostantól a videó tartomány-kéréseit (Safari) is a tárolt fájlból szolgálja ki, így offline is lejátszik.
- Tesztek: `introSplash.test.ts` (mikor fut, mikor tűnik el, a fájl mérete és offline útvonala, az indító szkript kicsi és lefordul), `swRoutes.test.ts` (tartomány-kérés értelmezése). Böngészős próba: `tests/e2e/intro.cjs` (Chrome, telefonnézet) – indulás, háttérbetöltés, eltűnés, kihagyás, munkamenetenként egyszer, nyitóoldalon nem, offline lejátszás: mind zöld.
- Nem ellenőrzött: valódi iPaden/iPhone-on és Android-tableten telepített appként (a standalone mód böngészőben nem emulálható, a próba `?intro=1`-gyel futott).

## 4.50 – Az ársáv a panelbe került, német fordítási hibák, színnevek

- **Az irányár-sáv nem foglal külön helyet:** telefonon (álló és fekvő) az ár és a „Tovább” gomb a beállítópanel saját alsó sora lett, nem egy külön, mindig látható sáv a képernyő alján. A 3D nézet így a képernyő aljáig ér; összecsukott panelnél csak a fogantyú, a lépéssáv és ez az egy sor látszik. Az ár és a gomb továbbra is mindig elérhető.
- **Hiba: fekvő telefonon az ársáv nem illeszkedett a panelhez** (kilógott jobbra, a „Tovább: Méret” két sorba tört). Most a panel része, egysoros, és figyelembe veszi a notch melletti sávot.
- **Hiba: a német nyelvű konfigurátorban magyar feliratok maradtak** („Nyitott oldalak” címke, „· alap” a színeknél, a tanácsadó összegzése, a műszaki rajz fejlécében „Tartalom”). Mind fordítva.
- **Színminták neve:** két sorban kiírva („Antracitszürke”, „Közlekedési fehér”) a levágott „Antracitszü…” helyett; egérrel fölé állva a kód és a teljes név is látszik.
- Tesztek: `sheetBar.test.ts` (a sor a panelen belül, teljes magasságú 3D nézet, német feliratok, színnevek).

## 4.49 – Húzható panelszél, fekvő telefonos nézet rendbetétele

- **Húzható panelszél:** a beállítópanel bal szélén lévő fogantyúval a panel szélessége állítható, asztali gépen és elforgatott (fekvő) telefonon egyaránt; billentyűzettel (← →) is. Dupla kattintás visszaállítja az alapot. A választott szélesség böngészőnként, elrendezésenként külön megmarad. A 3D nézetnek mindig marad hely: fekvő telefonon legalább 40%, asztalon legalább 50%.
- **Hiba: fekvő telefonon a feliratok egymásra csúsztak.** A modell neve rácsúszott a jelenet gombjaira, a lépéssávból kilógott a 7. lépés, a panel túl keskeny és zsúfolt volt. Most fekvő telefonon:
  - a jelenet szélén csak 3 gomb marad (nézet, napszak, Eszközök), a többi felirattal az Eszközök menüben;
  - a modell neve rövidítve fér el, az alcím és a léptékjelzés rejtve;
  - a 7 lépés kifér, és a sáv görgethető is;
  - a panel alapszélessége a képernyő 42%-a (300–380 px), figyelembe veszi a notch melletti biztonsági sávot;
  - a fejléc és a gombok tömörebbek.
- **Kis álló telefonok (≤ 380 px):** tömörebb jelenetfelirat, lépéssáv és ársáv.
- Tesztek: `panelResize.test.ts` (alapszélesség, tartomány, tárolás elrendezésenként, üveges nézeteltolás a beállított szélességgel, fekvő telefonos szabályok).

## 4.48 – Német PDF, ajánlatoldal és e-mailek; a szerver a gyártó nyelvén beszél

- **Szerver a gyártó nyelvén:** a nyelvfüggő szövegtárak (tetők, oldalak, színek, építmények stb.) mostantól a hozzáféréskor, az aktuális nyelven jönnek létre (`localized()`, nyelvenként egyszer). A szerver kérésenként a gyártó nyelvén számol és ír (`withLocale(tenant.locale)`), utána visszaáll magyarra, így egy osztrák kérés nem szivárog át egy magyar gyártóhoz.
- **Németül (osztrák gyártónál):** a gyártói és a vevői lead-e-mail (tárgy, specifikáció, tételes ár, anyaglista), a lead-végpont hibaüzenetei, az ajánlat tételei és specifikációja, az ajánlat e-mailjei (kiküldés, elfogadás, elutasítás, visszaigazolás), az utánkövető levelek (3. nap: vevő, 7. nap: gyártó), a vevői PDF-összefoglaló a műszaki rajzzal, és az ajánlatoldal (a nyelvet és a pénznemet az ajánlat adja, mert nem gyártói URL-en fut).
- **Magyar gyártónál nincs változás** (teszttel ellenőrizve).
- **Még magyar:** a gyártói admin és a havi riport, az adatkezelési tájékoztató (német jogi szöveg jogi átnézést igényel), az ajánlatoldal betöltés előtti üzenetei, a fa hatású színek rendelési kódja.
- Tesztek: `server-locale.test.ts` (osztrák lead végponttól végpontig: mindkét e-mail németül, euróban, magyar szöveg nélkül; magyar ellenpróba; német hibaüzenet; a nyelv nem szivárog át; ajánlatoldal németül EUR-ral; utánkövető levelek németül), `locale.test.ts` bővítve (a vevői PDF szövegében és rajzán nincs magyar szöveg).

## 4.47 – Modulház: valódi anyagok (vakolat, betoncserép, betonlábazat), közelebbi nézet, élesebb árnyék

- **Anyagok:** az A45 modulház homlokzata nemesvakolat-szemcsét, a teteje betoncserép-sorokat (normál- és érdességtérképpel), a lábazata és a lépcsője betonfelületet kapott. A színt továbbra is a választott homlokzat-, tető- és nyílászáró-szín adja (a színtérképek világos, színezhető változatok). A GLB-ben nincs UV, ezért betöltéskor a lapok síkjához igazított, méterben mért UV készül (`src/lib/houseSurfaces.ts`): a cserépsorok a gerinccel párhuzamosak, a lejtés mentén nincs nyújtás.
- **Alacsony minőségi szinten** (gyenge telefon) a ház a korábbi, textúra nélküli anyagokkal fut, nincs többletletöltés. Magasabb szinten kb. 1,8 MB új textúra (Poly Haven, CC0 – `CREDITS.md`).
- **Nyitó nézet:** a ház nagyobb a képen (kevesebb üres pázsit körülötte).
- **Árnyék:** a modulháznál az árnyéktérkép a ház köré szűkül (nappal ±9 m a korábbi ±11 m helyett, kb. 1,5× sűrűbb árnyék-felbontás); aranyórában a hosszú árnyék miatt marad a ±13 m.
- Nem változott: a geometria (ablakkáva, párkány, ereszvastagság) – ehhez a gyártó metszetrajza kell.
- Tesztek: `houseSurfaces.test.ts` (fal-, tető- és vízszintes UV, folytonosság a csatlakozó lapokon, a textúrafájlok megléte).

## 4.46 – Német nyelvű vevői konfigurátor (osztrák gyártókhoz)

- **Nyelv gyártónként:** új `Tenant.locale` (`'hu' | 'de'`). A nyelv betöltéskor, a gyártó URL-jéből dől el (`/k/:id`, `/embed/:id`), még az alkalmazás moduljai előtt (`src/i18n/bootLocale.ts`), így a szövegtárak is a jó nyelven jönnek létre. A szövegek a helyükön fordítódnak: `tr('magyar', 'deutsch')`; magyar gyártónál minden változatlan.
- **Lefordítva (vevői út):** fejléc és eszköztár, a 7 lépés (típus, méret, tető, oldalak, szín, komfort, összegzés), tetők, oldalzárások, rögzítés, építménytípusok és építési figyelmeztetések (osztrák fogalmakkal: Baubehörde, Bauanzeige/Baubewilligung), RAL-színek a hivatalos német RAL-nevekkel, ház- és homlokzatválasztó, bútorcsomagok, ártételek és tételes kalkuláció, összegzés, specifikáció, ajánlatkérő űrlap (Bundesland, osztrák telefonszám-minta), tanácsadó, költségkeret-tervező, árnyékelemzés, AR, fotó mód, bejárás, működés-bemutató, hibaüzenetek.
- **Számformátum:** német módban osztrák formátum (`de-AT`).
- **Még magyar (következő lépés):** a vevőnek letölthető PDF, az ajánlatoldal, a szerveroldali e-mailek és szerver-hibaüzenetek, az adatkezelési tájékoztató (német jogi szöveg jogi átnézést igényel), a gyártói admin; a fa hatású színek rendelési kódja (pl. „FA DIÓ”).
- **[TO VERIFY]:** a német hozzájárulási szöveg jogi átnézése élesítés előtt egy valódi osztrák gyártónál.
- Tesztek: `locale.test.ts` (URL → gyártó, `tr`, német módban a vevői szövegtárakban és az ártételekben nem marad magyar szöveg, EUR-os tételek). A böngészős ellenőrzés a 7 lépésen 187 magyar maradványról 1-re csökkent (a „FA DIÓ” kód).

## 4.45 – Pénznem gyártónként (HUF/EUR), osztrák bemutató gyártó

- **EUR-os gyártó:** a gyártó pénzneme (`currency: 'HUF' | 'EUR'`) mostantól a konfigurátorban, az ár-részletezésben, a PDF-ben, az adminban, az ajánlatban, a vevői és gyártói e-mailekben és az anyaglista CSV-ben is érvényes. Az ÁFA-kulcs eddig is gyártónként állítható volt (`prices.vatRate`).
- **Kerekítés pénznemenként:** HUF 1000 Ft, EUR 1 €. (A régi, bedrótozott 1000-es kerekítés EUR-nál 1000 €-s lépcsőket adott volna.)
- **Hiba (EUR-nál jött volna elő):** a felárak „±0” küszöbe fixen 500 egység volt; EUR-nál minden 500 € alatti felár nullának látszott volna. Mostantól a pénznem kerekítési lépcsőjének fele.
- **Osztrák bemutató gyártó:** `/k/demo-at` — EUR, 20% osztrák ÁFA, a 9 osztrák tartomány a felmérési űrlapon, német termék-, szín- és csomagnevek. A mintaárak a magyar demó árai átváltva (~395 Ft/€), nem osztrák piackutatás. A felület szövegei még magyarok (a német nyelv a következő lépés).
- **Áramköltség-becslés:** magyar lakossági tarifával számol, ezért nem forintos gyártónál a felület és a PDF elhagyja.
- **Korlát:** EUR-os gyártó egyelőre csak teraszfedést kínálhat (a garázskapu, a kerítés és a modulház árazója forintos); ezt teszt kényszeríti ki.
- Tesztek: `money.test.ts` (formázás, kerekítés, előjeles különbözet, EUR-os árszámítás és ÁFA, osztrák lead végponttól végpontig, vevői e-mail euróban, CSV, a szerver nem használhatja a böngészős pénznemet).

## 4.44 – Javítás: a service worker élesben nem települt

- **Hiba: élesben a SW telepítése elbukott**, mert az előtöltési lista egy olyan fájlt is tartalmazott (`legal-….js`), amelyet a Vite a build végén eltávolít (csak CSS-t tartalmazó csomag üres JS-darabja); a Vercel erre 404-et ad, a SW pedig csak teljes alkalmazáshéjjal települ. Helyben a `vite preview` SPA-fallbackje (404 helyett index.html) elfedte. Javítás: a listába csak a ténylegesen kiírt fájlok kerülnek.
- Tesztek: `tests/e2e/offline.cjs` új 0. lépése ellenőrzi, hogy a lista minden fájlja létezik a dist-ben; a böngészős próba mind a 14 pontja zöld.

## 4.43 – Supabase MCP és hivatalos Supabase-skillek a repóban

- `.mcp.json`: a Claude Code a repóban dolgozva a `supabase` MCP-szerveren éri el az éles Lamelix-adatbázist (`qxigqugywemokbnidokf`); a belépés gépenként, `claude /mcp` → Authenticate (kulcs nem kerül a repóba).
- `.claude/skills/supabase`, `.claude/skills/supabase-postgres-best-practices` (a `supabase/agent-skills` csomagból, másolatként; csak Markdown, futtatható szkript nincs), `skills-lock.json`. Az AGENTS.md skill-listája és Supabase-szakasza frissítve.

## 4.42 – Éles Supabase-adatbázis (Lamelix, eu-west-2) sémával feltöltve

- **Az éles projekt (`qxigqugywemokbnidokf`, Vercel Marketplace-szervezet) üres volt:** a leadek, ajánlatok, statisztika és admin-beállítások mentése táblák nélkül nem működött volna. Felkerült a `supabase/*.sql` teljes tartalma egy migrációban (`lamelix_initial_schema`): `leads`, `quotes`, `tenant_settings`, `tenant_events` + `track_event()`, `demo_requests`, indexekkel.
- **Hozzáférés:** minden táblán RLS, szabály nélkül; az `anon`/`authenticated` szerep semmit nem ér el, csak a szerveroldali `service_role` ír és olvas (ellenőrizve). A `track_event()` rögzített `search_path`-szal, RPC-n csak a service role hívhatja; a Supabase saját `rls_auto_enable()` eseménytrigger-függvényéről a nyilvános futtatási jog lekerült. A biztonsági tanácsadó csak az „RLS szabály nélkül” tájékoztatót jelzi, ez szándékos.
- `supabase/events.sql` frissítve (search_path, jogosultságok), hogy a repó és az éles séma egyezzen.
- Nem ellenőrzött: hogy a Vercel `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` erre a projektre mutat-e (a Vercel-csatlakozónak nincs joga a környezeti változókat olvasni); élő teszt-lead még nem ment át.

## 4.41 – Bemutató app: telepíthető webapp offline gyorsítótárral, bemutató eszköz mód fix ultra minőséggel

- **Service worker (új):** a konfigurátor oldalairól (/konfigurator, /k/<id>, /embed/<id>) regisztrál, csak éles buildben, https-en (helyi próbához localhoston), az előnézeti buildben nem. A hash-elt build-fájlok és a public/assets jelenet-eszközei (GLB, GLTF, BIN, HDR, textúrák, képek, betűk) cache-first, az oldalbetöltés network-first (3,5 mp után vagy hálózat nélkül a tárolt oldal / index.html jön). Az **/api/\* soha nem kerül tárba**, az admin (/k/<id>/admin), az ajánlat-megtekintő (/ajanlat/…) és a belépés mindig hálózatról jön. A második indítástól az alkalmazás és a már letöltött 3D-fájlok tárból töltődnek; a 3D megjelenítés sebessége ettől nem változik.
- **Frissítés:** új build = új `sw.js` (a build közben generált fájllistával). A futó munkamenetet nem szakítja meg: „Új verzió elérhető – Frissítés” jelzés jelenik meg, koppintásra egyszer újratölt, és a régi build-tár törlődik. A jelenet-eszközök tára fájlonként verziózott, így csak a ténylegesen megváltozott fájlokat kell újra letölteni.
- **Bemutató eszköz mód:** `?bemutato=1` vagy a Nézet panel kapcsolója („Bemutató eszköz: mindig ultra, offline”), az eszközön megmarad (`?bemutato=0` kikapcsolja). Bekapcsolva a 3D minőség fixen ultra (a választó jelzi, hogy rögzített), a futásidejű védőháló nem léptet vissza. Beágyazott (iframe) konfigurátorban a kapcsoló nem jelenik meg.
- **Offline letöltés gomb** (bemutató módban): az összes jelenet-eszközt és build-fájlt letölti x / y fájl és MB kijelzéssel (jelenleg 253 fájl, kb. 27 MB tömörítetlenül), a végén „Offline is működik”. A lista build közben készül (`dist/offline-manifest.json`), nem kézzel. Az ajánlatkérés elküldéséhez továbbra is internet kell; offline a meglévő hibaüzenet jelenik meg, nem „siker”.
- **Telepítési tipp** (bemutató módban, ha nem a kezdőképernyőről fut, egyszer bezárható): iPaden „Megosztás → Főképernyőhöz adás”, Androidon a böngésző telepítési ajánlata (ha a böngésző felkínálja), különben a menüpont neve.
- **Vercel:** `/sw.js` `Cache-Control: no-cache` és `Service-Worker-Allowed: /`, `/offline-manifest.json` no-cache, `/site.webmanifest` `application/manifest+json`. Telepített (standalone) módban a fejléc és az alsó eszközsávok a biztonságos területen belül maradnak.
- Megvalósítás: kézzel írt SW-forrás `src/sw/sw.ts`, a build a meglévő esbuild-del csomagolja `dist/sw.js`-be (új függőség nincs); útvonal-döntés: `src/lib/swRoutes.ts`.
- Tesztek: `swRoutes.test.ts` (minden útvonaltípus, /api soha nincs tárban, admin/ajánlat network-only, regisztrációs feltételek, előtöltési lista: minden public/assets 3D-fájl és a hash-elt build-fájlok benne vannak, a SW lefordul), `demoDevice.test.ts` (paraméter, megjegyzés, privát mód, ultra rögzítés, FrameGovernor). Böngészős próba: `tests/e2e/offline.cjs` a `vite preview` buildjén (Chrome, szoftveres grafika) – offline újratöltés 3D-vel letöltéssel és anélkül, offline ajánlatkérés hibája, frissítés-jelzés, régi tár törlése: mind zöld.
- Nem ellenőrzött: valódi iPad Pro M5-ön és Android-tableten a telepítés, az offline indítás és a biztonságos-terület betétek; iOS Safari tárkvótája a ~27 MB-os letöltésnél (kezdőképernyőről indított appnál a 7 napos automatikus törlés nem érvényes, de kevés szabad hely esetén a rendszer törölheti a tárat – ilyenkor az „Offline letöltés” újra kell).

## 4.40 – Csúcskategóriás Android-tablet: automatikusan magas 3D-szint

- **Snapdragon 8 Elite Gen 5 (Adreno 840) és hasonló csúcs-GPU-s tablet** (Adreno 750+ / 8xx, Immortalis-G9xx, Xclipse 9xx) automatikusan „Magas” szintet kap (eddig „Közepes”); telefonon a közepes marad. Az „Ultra” kézzel választható.
- **Figyelmeztetés a minőségválasztóban** csak akkor, ha a választott szint legalább kettővel az eszközé fölött van, vagy gyenge (alacsony besorolású) eszközön bármivel feljebb. MacBook M-chipen vagy csúcstableten „Ultra” választásakor nincs figyelmeztetés.
- Tesztek: `deviceTier.test.ts` (csúcs-GPU-s tablet és telefon, figyelmeztetési szabály).
- Nem ellenőrzött: valódi Snapdragon 8 Elite Gen 5-ös tableten a képkockasebesség ultra szinten.

## 4.39 – Mérés lépésenként és betöltési időre, admin javítások

- **Lépésenkénti mérés:** a konfigurátor most névtelenül számolja, hány munkamenet jut el az egyes lépésekig (Méret → Összegzés), a 3D kép betöltési idejét három sávban (4 mp alatt / 4–10 mp / 10 mp felett, pontos érték nélkül), és a sikertelen beküldési kísérleteket. Az admin Áttekintésben új kártya: „Meddig jutnak a lépésekben?” (közelítő értékek, az első adatok néhány látogatás után jelennek meg).
- **Admin belépés:** a kártya függőlegesen középen van; „Elfelejtette a jelszót?” segítség az üzemeltetői e-mail-címmel.
- **Érthető hibaüzenet:** ha a szerver tárhelye nincs bekapcsolva, a gyártó nem fejlesztői szöveget lát („Az adattár (Supabase)…”), hanem teendőt és kapcsolatot.
- **Hiba: admin mobilon üres sáv volt az érdeklődőlista felett** (rejtett fejlécsor); megszűnt. Az „E-mail” gomb felirata nem törik két sorba, a demó-sáv tömörebb, a státuszszűrők görgethetőségét halvány szél jelzi.
- **Akadálymentesség:** az admin kártyacímei h2-k (nincs h1 → h3 ugrás); a gyorskereső és a landing logó-linkjének akadálymentes neve tartalmazza a látható szöveget.
- **Konzol:** a three.js-ből megszűnt PCFSoft árnyéktípus helyett a ténylegesen használt PCF típus van beállítva (a megjelenés nem változik; eddig is erre esett vissza). A THREE.Clock figyelmeztetés az R3F könyvtárból jön, frissítésig marad.
- Tesztek: `funnelEvents.test.ts` (lépés- és betöltési események, szerveroldali elfogadás, admin összesítés, űrlaphiba mérése, admin szövegek, címsorrend, mobil CSS).

## 4.38 – Landing: friss termékképek, nem takaró demósáv, rövidebb oldal, mobil hero

- **Friss termékképek a landingen:** a bemutató szakasz képei (konfigurátor, admin áttekintés, érdeklődők, mobil lead-adatlap) a mostani felületről készültek; a régiek még a 6 lépéses, bal paneles konfigurátort és a sötét admint mutatták.
- **Hiba: a lebegő „Élő demó” sáv rácsúszott a gombokra** (árkártyák „Demót kérek” gombja, élő bemutató, előtte-utána csúszka). A sáv most elrejtőzik, amíg ezek a szakaszok az alsó sávban vannak.
- **Rövidebb, olvashatóbb oldal:** a bemutató szakasz görgetése 3 helyett 2,2 képernyőnyi, a szakaszok közti térköz kisebb; asztali gépen az oldal kb. 22 800 px-ről kb. 16 500 px-re rövidült (headless mérés). A görgetésre kivilágosodó nagy mondat kezdetben is olvasható (34% átlátszatlanság 14% helyett).
- **Mobil hero:** előbb a cím és a „Kérek demót” gomb, utána a kép; az ár-kártya nem lóg ki balra.
- **Számlálók:** a felfutó számok az érték feléről indulnak, így lassú gépen sem látszik „0”.
- **Pontosabb csomagleírás:** a Pro csomagnál „Látogatói tölcsér esemény-számokkal és becsült konverzióval” (korábban „konverziós statisztika”), mert a rendszer esemény-számokat és becsült konverziót ad.
- Tesztek: `landingUi.test.ts` (ragadós sáv elrejtése, számlálók, mobil sorrend, rövidebb bemutató, képek).

## 4.37 – Gyengébb tabletek és oldalarányok: automatikus 3D-szint, képpont-keret, álló tablet alsó lappal

- **Gyenge mobil GPU-s tablet automatikusan alacsony szinten** (pl. Redmi Pad 2, Mali-G57 MC2): a belépő Mali (4xx/T/G5x/G6x), PowerVR és Adreno 6xx-es vagy régebbi GPU-k „Alacsony” szintet kapnak. Az Android-tabletek Chrome-ja alapból asztali oldalt kér, ezért eddig asztali gépnek látszottak és „Közepes” szintet kaptak; most az érintés + Linux jelzi az Androidot. Asztali gépek (MacBook M-chip: magas, erős videókártya: ultra) és az iPad besorolása változatlan.
- **Képpont-keret alacsony és közepes szinten:** a vászon legfeljebb ~1,2 MP-t, illetve ~2,0 MP-t rajzol (a felbontás-szorzó ehhez igazodik, legalább 0,75×). Álló, nagy felbontású tableten ez a teljes képernyős vászonnál számít. Magas és ultra szinten nincs keret, az asztali kép változatlan.
- **3D minőség választó:** az „Automatikus” mellett látszik, melyik szint jut az eszközre; ha kézzel ennél magasabbat választanak, a választó alatt figyelmeztetés jelenik meg (a választást nem írja felül).
- **Álló tablet (3:4, 10:16, 7:10) alsó lappal:** eddig a 768–820 px széles álló tablet telefonos kamerát kapott (kicsi pergola), a 834–1100 px széles (iPad Air/Pro álló) pedig keskeny oldalpaneles nézetet (~450 px széles 3D). Most minden álló tablet az alsó lapos elrendezést kapja teljes szélességű 3D-vel, nagyobb félig nyitott lappal; a kamera a vászon oldalarányából keretez (álló képen 48°, fekvőn 38°), a telefonos ×1,45 hátrébb állás csak telefonon marad.
- **Alacsony fekvő kijelző (1024 × 768, 1133 × 744, 1366 × 768):** tömörebb panelfej, lépéssáv és ársáv; 821–1180 px széles oldalpaneles nézetben a jelenet címe az eszköztár alá került (1024 px-en eddig ütköztek).
- **Hiba: 834 px széles álló tableten** a lap fogantyújára koppintás kétszer váltott (nyit–zár), így a lap nem nyílt ki; a viselkedés most az elrendezéshez kötött, nem a 820 px-es szélességhez.
- Új: `src/lib/viewport.ts` (képernyőosztályok, közös lekérdezés a CSS-sel). Tesztek: `deviceTier.test.ts` (GPU-besorolás, érintés-felismerés, képpont-keret, oldalarány-besorolás, kamera, a CSS töréspontjainak szinkronja).
- Nem ellenőrzött: valódi Redmi Pad 2-n és iPaden a képkockasebesség (a próba gépi böngészőben, szoftveres grafikával készült, 9 képernyőméreten).

## 4.36 – Konfigurátor: mobil lépéssáv, kevesebb ikon, olvashatóbb feliratok, megerősített újrakezdés

- **Hiba: mobilon a 7 lépés nem fért ki,** az aktív lépés neve le volt vágva. A lépéssáv most vízszintesen görgethető, és az aktív lépés mindig a látható részre ugrik; a félig felhúzott panel címe az aktív lépés („7/7 · Összegzés”) a „Húzd fel a teljes nézethez” utasítás helyett.
- **Telefonon kevesebb felirat nélküli ikon:** a jelenet szélén csak a nézet, a napszak és az Eszközök marad; a gyors kapcsolók (bejárás, eső, AR stb.) feliratos, magyarázatos menüpontként az Eszközök menü elejére kerültek. Asztali nézet változatlan.
- **Olvashatóbb jelenetfeliratok:** a modell alcíme és a léptékjelzés sötét, áttetsző alátétet kapott, így világos égen is olvasható.
- **Érthetőbb fejléc:** „Bemutató” helyett „Bemutató nézet” (magyarázó tippel); „Alaphelyzet” helyett „Újrakezdés”, amely megerősítést kér („Biztosan? Kattints újra”), így egy véletlen kattintás nem törli a tervet.
- **Az összegzés képe telefonon** álló formátumú; a kivágás a kép felső harmadára (a modellre) igazodik.
- Akadálymentesség: a „Kezdőlap” link navigációs landmarkba került (axe „region” hiba).
- Tesztek: `configuratorUi.test.ts` (görgethető lépéssáv és aktív lépés, panelcím, újrakezdés megerősítése, mobil eszközmenü, landmark).

## 4.35 – Összegzés: felül a felmérés, a többi összecsukva

- **Összegzés újrarendezve (rövidebb út a felmérés kéréséig):** felül a terv képe, neve, fő adatai és az irányár, közvetlenül alatta a felmérési kérelem. A másodlagos eszközök két összecsukható blokkba kerültek: „Megosztás és mentés” (PDF, kép, videó, szöveg másolása, WhatsApp, két változat mentése és összehasonlítása) és „Költségek és specifikáció” (árbontás, keretösszeg, üzemeltetés, anyaglista). Az összegzés panel magassága asztali nézetben kb. 2600 px-ről kb. 1400 px-re csökkent.
- **Hiba: kétszer látszott az ár** az Összegzés lépésben; az alsó sávban itt már csak a „Felmérést kérek” gomb marad.
- **Érthetőbb feliratok:** „Mentés A/B” helyett „Mentés „A” / „B” változatként”, magyarázattal; „Összefoglaló másolása” helyett „Szöveg másolása”.
- **Hiba: az űrlap fejlécében a belső termékcsalád-név látszott** („Pergo · pergola”); most a vevő a „Pergola” nevet látja.
- Tesztek: `leadValidation.test.ts` (terméknév, az összegzés sorrendje: felmérés a megosztás és a költségrészletek előtt).

## 4.34 – Ajánlatkérő űrlap: olvasható hozzájárulás, mezőnkénti hibaüzenetek

- **Hiba: a hozzájárulás-szöveg három keskeny oszlopra esett szét** az ajánlatkérő űrlapon (a szöveg, a tájékoztató linkje és a mondat vége külön flex-oszlop lett). Most folyó szövegként, egy bekezdésben jelenik meg.
- **Hiba: a beküldés gomb pipa nélkül némán tiltott volt.** Most mindig kattintható; beküldéskor minden hiányzó vagy hibás mezőhöz (név, telefon, e-mail, település, hozzájárulás) a mező alatt érthető magyar üzenet jelenik meg, a fókusz az első hibás mezőre ugrik, a mező javításakor az üzenet eltűnik. A szerver továbbra is ugyanígy ellenőriz.
- Tesztek: `leadValidation.test.ts` (üres és hibás kitöltés, hozzájárulás hiánya, fókuszsorrend, a gomb nem tiltott, a hozzájárulás nem flex).

## 4.33 – Modulház: azonnali csere ugyanabban a 3D jelenetben, javított házmodell

- **Nincs újratöltés:** a „Mit építesz?” választóban a Modulházra váltva a ház ugyanabban a 3D vásznon, a pergola helyén jelenik meg (ugyanaz a fény, égbolt, talaj és eszköztár); a beállítópanel és az ár a modulházéra vált. Korábban egy külön jelenet töltődött be töltőképernyővel. A modell a konfigurátor megnyitásakor előtöltődik.
- **Környezet:** a ház a konfigurátor környezet-beállítását követi: alapból semleges háttér, a „Családi ház” környezetben fű, járda és kavicssáv. Napszak, 180 cm-es figura, méretcímkék és forgatás a Nézet panelből (a pergolához kötött eszközök – bejárás, eső, AR, árnyékelemzés, fotó – modulháznál nem jelennek meg).
- **Házmodell javítások:** a tetőcserép-sorok és a tetőlap, valamint a homlokdeszka, az oromszegély és a tetőlap egybeeső felületei villództak (z-fighting) – szétválasztva; a bádogozás matt antracit (korábban lilásan csillogott); az ablaküveg fényvisszaverőbb, így nem látni át az üres belső téren; tágabb kamerakeret.
- Tesztek: a meglévő `modularHouse.test.ts` (GLB szerepnevek, valós méret) és `modelCompression.test.ts` az új modellen.

## 4.32 – Egy konfigurátor: carport és modulház a „Mit építesz?” választóban

- **Egy oldal, egy kalkulátor:** a „Mit építesz?” választóban Pergola, Veranda, Télikert, **Carport** és **Modulház** kártya van. A választásra a középső 3D modell és a beállítópanel tartalma cserélődik; új oldal, külön kalkulátor vagy termékválasztó nem nyílik.
- **Carport:** korábban külön útvonalon (`/konfigurator/carport`) élt és a választóból hiányzott; most ugyanitt választható, a carporthoz tartozó lépésekkel és extrákkal. A carport-piszkozat a konfigurátorban carport marad (eddig pergolára váltott vissza).
- **Modulház (A45):** a pergola helyén a valós méretű típusház; a panel ugyanabban a felépítésben (jobb oldalt, lépésfülek, alul élő ár és „Részletek”) a modulház lépéseit mutatja: Típus (benne a „Mit építesz?” választó a visszaváltáshoz) → Kivitel → Megjelenés → Összegzés. Árazás változatlanul a gyártó m²-árával (4.31). A `#h=` megosztó link modulház nézetben nyit; a választás gyártónként megmarad.
- **Visszavonva (4.31):** a külön Modulház termék, a `/konfigurator/modulhaz` útvonal, a termékválasztó-kártya és a fejléc „Másik termék” linkje. A modulház-motor megmaradt a lead-végponthoz (`product: modular-house`), a lead-e-mail linkje a konfigurátorra mutat.
- Tesztek: `products.test.ts` (a modulház nem külön kalkulátor: rejtett család, útvonala a konfigurátor; `offersModularHouse`).

## 4.31 – Modulház: új, különálló termék (A45)

- **Új termékcsalád: Modulház** (`/konfigurator/modulhaz`, `/k/<gyártó>/modulhaz`). Saját kalkulátor, nem kapcsolódik a pergolához. A termékválasztóban (`/konfigurator/termekek`) a „Teraszfedés: pergola, veranda, télikert” mellett jelenik meg, a fejlécben a „Másik termék” link vezet ide. A demó gyártó kínálja.
- **Első típus: A45 modulház** (Álomterasz típusterv): bruttó 45 m², nettó 39 m², 9,23 × 5,28 m. A 3D modell valós méretű, a magasságok és a tetőhajlás becsültek (a felületen is így jelenik meg).
- **Árazás:** a gyártó nyilvános ára, 445 000 Ft nettó / m², bruttó 45 m²-re számolva (az m²-alap a gyártóval egyeztetendő, nettóra egy beállítással váltható). Kivitel: „külső kulcsrakész, belül emelt szerkezetkész” (alapár) vagy „teljes kulcsrakész” (egyedi ajánlat, az irányárat nem emeli). ÁFA: családi házként 5% (a gyártó tájékoztatása szerint), egyéb célra 27%. Nincs külön telepítési mintatétel. A szállítás, a darus emelés, a tervezés-engedélyezés, a közműbekötés és a tereprendezés nincs benne – ezt az összegzés, az árpanel és a PDF is kiírja.
- **Megjelenés:** homlokzat-, nyílászáró- és tetőszín (csak látvány, az árat nem módosítja). Nézetek: tér, homlokzat, oldal, felülről; méretcímkék, 180 cm-es figura, napszakok.
- **Kimenetek:** spec-kód (`MODUL-…`), PDF, megosztó link (`#h=`), ajánlatkérés a közös lead-végponton (modulház-motor).
- **Visszavonva:** a 4.30-ban a pergola „Ház típusa” választójába került A45 opció kikerült; a ház most önálló termék.
- Közös elemek: a `CatalogPricePanel` és a PDF telepítési sora, valamint az árpanel megjegyzései termékenként állíthatók (alapértelmezés változatlan).
- Tesztek: `modularHouse.test.ts` (m²-ár, ÁFA, kulcsrakész egyedi ajánlat, színek nem áraznak, séma, GLB szerepnevek és valós méret), `products.test.ts` (élő családok, útvonal, modulház-motor, egyedi megosztó kulcsok).

## 4.30 – A45 típusház valós méretben (demó)

- **Új háztípus a „Ház típusa” választóban:** „A45 modulház” (Álomterasz A45 típusú modulháza). A ház nem skálázódik a pergolával: 9,23 × 5,28 m külső méret, 27 cm-es külső fal, a nyílászárók a gyártói alaprajz szerinti helyen és méretben. A pergola a bejárati (hosszabbik) homlokzat közepe elé kerül.
- **Becsült értékek** (a metszetrajz megérkezéséig): padlószint +0,35 m, belmagasság 2,70 m, 30°-os nyeregtető 50 cm-es ereszkiállással, betoncserép fedés. A modell demó célú, nem gyártási dokumentáció.
- A modell Blenderben készült (`public/assets/models/houses/house_a45.glb`, meshopt-tömörítve, 36 KB); a hálók szerepnév szerint: `wall`, `frame`, `glass`, `interior`, `trim`, `plinth`, `roof`, `step`. A homlokzat és a nyílászárók színe a meglévő választókkal állítható.
- Tesztek: `houseStyles.test.ts` (négy háztípus; az A45 léptéke 1 bármely pergolaszélességnél; a GLB falainak befoglalója 9,23 × 5,28 m, homlokzat a z = 0 síkon).

## 4.29 – Lépések átrendezése: 7 logikus lépés, duplikáció nélkül

- **Új sorrend:** Típus → Elhelyezés és méret → Tető → Oldalak → Szín → Komfort → Összegzés. Az Elhelyezés (házhoz kapcsolódás) a méretek elé került, mert az határozza meg, melyik oldal szabad.
- **Külön Tető lépés:** a tetőrendszer, az üvegezés, a tetőmozgatás, a tetődőlés, a tetőárnyékoló és a napelem egy helyen van. Korábban a dőlés a Méret, az árnyékoló és a napelem az Extrák lépésben volt.
- **Oldalak:** csak az oldalzárás és a falüvegezés; ha a felülnézeten a tetőre koppintasz, a konfigurátor a Tető lépésre vált.
- **Komfort és vezérlés** (korábban Extrák): fűtés, világítás, hő és légmozgás, vezérlés. Az eső- és szélszenzor csak akkor választható, ha van mit vezérelnie (mozgó tető vagy ZIP-screen); fix tetőre váltva a szenzor kikerül a konfigurációból és az árból is.
- **Figyelmeztetések:** minden épületszabály-jelzés pontosan egy lépésben jelenik meg, ott, ahol javítani lehet; a szövegekből kikerültek a lépésnevekre mutató utalások.
- **Hiba: a lépésszámláló fixen „/ 06”-ot írt;** most a lépések számából számol.
- Tesztek: `configSteps.test.ts` (7 lépés, sorrend, mobil gombfeliratok, minden jelzés pontosan egy lépéshez tartozik), `sensorsApplicable.test.ts` (szenzor csak mozgó tetőnél vagy ZIP-nél, normalizálás fix tetőnél).

## 4.28 – Élesebb 3D kép és betűk nagy felbontású kijelzőn

- **Hiba: a 3D kép nem volt éles Retina / 2× kijelzőn.** A vászon felbontása szintenként legfeljebb 1,1–1,65× volt, így 2×-es kijelzőn a gép kisebb képet rajzolt és felnagyította (puha, „pixeles” hatás). Most: alacsony 1,25×, közepes 1,75×, magas és ultra a kijelző teljes, legfeljebb 2× felbontása. Ha a gép ettől 30 fps alá lassul, a meglévő védőháló pár másodperc után automatikusan alacsonyabb szintre lép.
- **Hiba: a panel szövege kissé elmosódott lehetett.** A görgethető panelrész egy külön grafikus rétegen (`translateZ(0)`) futott, ami a betűk élsimítását rontja; ez megszűnt. Sötét háttéren a világos betűk élsimítása macOS-en vékonyabb, élesebb (`font-smoothing`).
- Tesztek: `quality.test.ts` (2×-es kijelzőn a magas és ultra szint teljes felbontású, a közepes legalább 1,75×).

## 4.27 – Gyártói admin: világos „dashboard” stílus

- **Új megjelenés:** sötét oldalsáv lime pill aktív menüponttal, világos munkaterület lekerekített keretben, fehér kártyák finom árnyékkal, pill gombok és keresőmező, lime grafikonvonal és sávok, sötét buborék a grafikonon, zöld/piros változás-jelzők, fehér részletek-panel. Betű: Poppins.
- A belépő, az áttekintés, az érdeklődők (tábla és kanban), a beágyazás és a beállítások (ármátrixszal) is az új stílust kapja; telefonon az alsó navigáció sötét marad.
- Olvashatóság (számolt): fő szöveg 18:1, másodlagos szöveg 5,3–5,8:1, zöld szövegkiemelés 5,6–6,1:1, mezőszegély 3,2:1. A státusz- és pontszám-címkék szövege világos háttéren sötétített árnyalatot kap.
- A konfigurátor és a nyitóoldal változatlan. Logika, adatok változatlanok.
- Új függőség: `@fontsource/poppins` (400, 500, 600; saját tárhelyről, latin-ext alkészlettel).

## 4.26 – Üveges felületi változat kipróbálásra (?style=glass)

- **Üveges stílus:** a `?style=glass` paraméterrel a 3D kép a teljes szélességet kapja, a beállítópanel, a részletek, az eszközsor és a menük elmosott, áttetsző üvegként lebegnek fölötte; a pergola a szabadon látható rész közepére kerül (a nézet a panel felével balra tolódik). Mobilon az alsó lap és a sáv üveges. Betű: Outfit.
- A jelenlegi stílus marad az alapértelmezett; `?style=soft` visszaállítja. A választást a böngésző megjegyzi.
- Olvashatóság: a panel 72%-os sötétítése a legvilágosabb háttér fölött is legalább 6,6:1 (fő szöveg) és 5:1 (másodlagos szöveg) kontrasztot ad (számolt). Ahol a böngésző nem tud elmosni, a panel tömör sötét.
- Új függőség: `@fontsource-variable/outfit` (saját tárhelyű, latin-ext alkészlettel: ő, ű).
- Tesztek: `uiStyle.test.ts` (paraméter és megjegyzett érték, panelszélesség, nézeteltolás).

## 4.25 – Bejárás: első személyű séta a pergola körül és alatt

- **Bejárás gomb** a jelenet eszközsorában (lábnyom ikon): a kamera 0,7 mp alatt a pergola elé, kívülre repül, 175 cm-es szemmagasságba, a pergola felé nézve. Kilépés a jobb felső gombbal (asztalon Esc-kel is); utána vissza az áttekintő nézet, a konfiguráció változatlan.
- **Irányítás:** húzással körbenézés (egér és ujj); érintőképernyőn bal alsó joystick, asztalon W A S D / nyilak (a bal–jobb nyíl fordul). Enyhe gyorsulás és lassulás, kb. 1,3 m/s. Első használatkor rövid súgó (7 mp után vagy az első mozdulatra eltűnik).
- **Ütközés (fizikai motor nélkül):** oszlopok, zárt oldalelemek (üveg, lamella, lécfal, ajtós fal zárt ajtóval, leengedett ZIP), házfal és házszárnyak, a ház tömbje, telekhatár és utca, ültetőládák, kerti lámpák, dézsák, bútorok (közelítő alaprajzzal) és carportnál az autók. Ütközéskor a fal mentén csúszik. Nyitott oldalon és felhúzott ZIP-en át be lehet sétálni; ha a belmagasság kisebb a szemmagasságnál, a tető alá nem (ezt a felület jelzi).
- **Egy modell, egy konfiguráció:** a bejárás ugyanazt a jelenetet nézi; bejárás közben is lehet konfigurálni, a változás azonnal látszik, és ha egy új elem a néző helyére kerül, a kamera a legközelebbi szabad pontra lép.
- A ház- és kertelrendezés (ház, házszárnyak, sövény, ültetőládák, lámpák, dézsák) a jelenetből közös modulba került (`src/lib/sceneLayout.ts`), hogy a jelenet és az ütközés ugyanabból számoljon; a ház méretei a `houseDims.ts`-ben.
- Nem ellenőrzött: valódi tableten és telefonon a sebesség és a kezelés (a próba gépi böngészőben, szoftveres grafikával készült). A bútorok ütközője közelítő (a zóna belső 60%-a), a nyitott ajtókon nem lehet átmenni (az első verzióban a zárt ajtó fal).
- Tesztek: `walkArea.test.ts` (kezdőpont, oszlop, üveg- és lamellafal, félbe osztott oldal, ZIP, alacsony tető, házfal, telekhatár, bútor, csúszás a fal mentén, konfigurációváltás), `walkInput.test.ts` (billentyűk és joystick).

## 4.24 – A kameranézetek egy „Nézet” menübe kerültek

- **Több hely a képnek:** az alsó, középső nézetsáv (Kívülről, Alulról, Felülről, Részlet, Kanapé) megszűnt; a nézetek a jobb felső eszközsor első gombjából nyílnak le (asztalon a gomb a jelenlegi nézet nevét mutatja, mobilon ikon). Esc vagy kattintás máshová bezárja.
- Csak a pergola/carport stúdióban; a carportnál továbbra sincs kanapé-panoráma.
- Tesztek: `cameraViews.test.ts` (a menü nézetei sorrendben, carportnál kanapé nélkül). A kézi e2e szkriptek (`qa1.cjs`, `sweep.cjs`) az új menüt használják.

## 4.23 – „Soft dark” stílus a konfigurátoron (elrendezés és betű változatlan)

- **Kártyák térközzel:** a 3D nézet és a beállítópanel 12 px-es térközzel, 24 px-es lekerekítéssel lebeg a mélyfekete (#0E0F11) alapon; a panel alján az ár és a lépésgombok külön belső kártyában.
- **Pill-elemek:** a lépésfülek pill-sávban (az aktív lépés lime pill a nevével, a többi számozott kör), a szegmentált választókon a kijelölt elem fehér pill sötét szöveggel, minden gomb, fejléc-gomb és jelenet-eszköz pill vagy kör alakú; a fő akció neon-lime (#C4F03C).
- **Ár:** nagy, vékony (300-as) számjegyek a panelen, a részletekben és a mobil sávon.
- **Kontraszt (számolt):** fő szöveg 16,1:1, másodlagos 6,3–6,9:1, mezőszegély 3,2–3,9:1, lime gomb sötét szöveggel 14,5:1.
- Csak a pergola/carport stúdióra hat (`.layout-a`); logika változatlan.

## 4.22 – Új konfigurátor-felület: nagy 3D, egy panel, élő ár a panel alján

- **Elrendezés („A”):** asztali nézetben a 3D a bal oldalon a szélesség kb. 70%-át kapja (1440 px-en ~1015 px a korábbi ~650 helyett), a beállítások egyetlen jobb oldali panelben vannak (420 / 380 / 344 px a képernyő szélessége szerint).
- **Ár:** a panel alján egy fő szám (bruttó irányár) és egy „Részletek” gomb; a nettó/ÁFA, havi bontás, üzemeltetés, költségmegoszlás, tételes kalkuláció, PDF és Megosztás kérésre, a panel mellett nyílik (Esc zárja). Zárva nem takarja a 3D-t.
- **Mobil és álló tablet:** a lépésjelző a csukott lapon is látszik; az alsó sáv gombja mindig a következő lépésre visz („Tovább: Méret”…), az utolsó lépésen a felmérés-kérő űrlapra. Korábban az „Összegzés” gomb átugrotta a lépéseket. A lapban nincs második „Következő” gomb, a forgatási tipp nem takarja a nézetgombokat.
- **Megjelenés:** grafit-lime színek (szöveg/háttér kontraszt 14–17:1, másodlagos szöveg 6,8–8:1, mezőszegély 3,35:1 – számolt értékek), Inter (szöveg, igazított számok) és Manrope (címek), legalább 13 px-es szövegek, 16 px-es beviteli mezők, 44 px-es mezők. A „Mit építesz” kártyák közül csak a kiválasztott mutat teljes leírást. Kijelölésnél akcentus-keret is jelez, nem csak a szín.
- Csak a pergola/carport stúdióra hat (`.layout-a`); a kerítés, garázskapu, katalógus, admin és a nyitóoldal változatlan. Logika, árazás, export, lead változatlan.
- Új függőségek: `@fontsource-variable/inter`, `@fontsource-variable/manrope` (saját tárhelyű, latin-ext alkészlettel: ő, ű).
- Tesztek: `configSteps.test.ts` (a mobil gomb a következő lépésre visz, az utolsón a felmérésre).

## 4.21 – Havi riport e-mailben a gyártónak

- Minden hónap 1-jén 6:00-kor (UTC) a gyártó lead-címzettjei összesítőt kapnak az előző naptári hónapról: felmérési kérelmek száma és bruttó irányár-összege (átlaggal), összevetés az előző hónappal, becsült konverzió (kérelem / megnyitás), tölcsér (megnyitás → tervmódosítás → űrlap → kitöltés → kérelem), PDF / AR / megosztás, a hónap érdeklődőinek mostani állapota, a legtöbbet kért tetők, és figyelmeztetés a még „Új” (senki által nem keresett) érdeklődőkről.
- Csak névtelen napi számlálók és összesítések: név, e-mail, telefonszám nem kerül a levélbe. A konverzió „becsült”, mert eseményszámokból számol, nem egyedi látogatókból.
- Forgalom nélküli hónapban üres táblák helyett azt javasolja, hogy ellenőrizzék a beágyazást.
- Kikapcsolható az adminban (Beállítások → Érdeklődők fogadása → „Havi riport e-mailben”); alapból bekapcsolva.
- Végpont: `GET /api/monthly-report` (CRON_SECRET-tel, mint az utánkövetés); `?dry=1` próbafutás küldés nélkül, `?month=YYYY-MM` adott hónap, `?tenant=id` egy gyártó. Időzítés: `vercel.json` crons.
- A tölcsérszámítás React nélküli modulba került (`src/lib/statsFunnel.ts`), hogy az Edge-függvény is használhassa. Új: `server/monthlyReport.ts`, `api/monthly-report.ts`; teszt: `tests/monthlyReport.test.ts`.

## 4.20 – Figyelmeztetés + egy kattintásos javítás

- Döntés (Ádám, 2026-11-15): a rendszer nem vágja és nem írja át magától a tervet, hanem jelez, és ha van érvényes megoldás, „Javítás: …” gombot kínál. A vevő dönt; a javítás után látja az árváltozást, és vissza is vonhatja.
- Javítható jelzések: eső-/szélérzékelő nagy lamellás tetőhöz; tetőárnyékoló vagy hővisszaverő üveg üvegtetőhöz; széles tolóüveg helyett kerettel osztott üveg; télikertnél alapozott padló, nyitott oldalak lezárása fix üveggel, ajtó, tetődőlés; verandánál tolóüveg az elülső oldalra; carportnál szélesség, mélység, magasság, dőlés.
- Gomb csak akkor jelenik meg, ha a javítás ennél a gyártónál ténylegesen működik (a gyártó kínálatához igazított eredményben a jelzés eltűnik, és nem jön helyette új figyelmeztetés). Statikai jellegű jelzésekhez (szélteher, köztes oszlop) szándékosan nincs automatikus javítás.
- A gyártói mérethatárokon kívüli értékeket továbbra is a normalizálás tartja határon belül (a csúszkák eleve nem engednek kilépni); ez nem változott.
- Új: `src/lib/issueFixes.ts`, a figyelmeztetések azonosítót kaptak; teszt: `tests/issueFixes.test.ts`. Böngészőben ellenőrizve: a gomb a jelzést megszünteti, az árváltozás látszik, a visszavonás működik.

## 4.19 – Tájékoztató anyaglista CSV-ben a gyártói adminban

- Az érdeklődő adatlapján a PDF és a DXF mellett új „Anyaglista (CSV)” gomb: a terv adatai (azonosító, vevő, konfigurációs kód, méret, tető, szín), az anyaglista és a tételes nettó árkalkuláció egy Excelben megnyitható táblában (pontosvessző, UTF-8).
- Ugyanaz a tartalom, mint a PDF anyaglistája és árkalkulációja (a 0 db-os tételek nélkül); az összegek számként, hogy táblázatban számolni lehessen velük.
- Az első sor kimondja: tájékoztató anyaglista, nem gyártási anyagszükséglet, a felmérés és a gyártói típusstatika után véglegesítendő.
- Új: `src/lib/bomCsv.ts`; teszt: `tests/bomCsv.test.ts`. A demó adminban letöltve ellenőrizve.

## 4.18 – DXF-export a műszaki rajzból (gyártói admin)

- Az érdeklődő adatlapján a PDF mellett új „DXF (CAD)” gomb: a terv műszaki rajza (homlokzat, alaprajz, metszet, szövegmező) AutoCAD R12 DXF-ként, amit minden CAD-program megnyit (AutoCAD, LibreCAD, BricsCAD, DWG TrueView).
- Valós mm-ben: a rajz egyetlen méretaránnyal készül, a DXF ezzel felszorozva 1:1-ben tartalmazza a geometriát, így CAD-ben lemérve a pergola valódi méretei jönnek ki (pl. 5,00 m széles terv → 5000 mm-es vonal).
- Rétegek: KONTUR, RESZLET, SEGEDVONAL, HALVANY, KIEMELES, SZOVEG; a rejtett (szaggatott) vonalak DASHED vonaltípussal. A magyar ékezetes betűk CP1250 kódlappal helyesek.
- A DXF ugyanabból a rajzlapból készül, mint a PDF melléklete (`sheetDrawing`), így a kettő mindig egyezik. Tájékoztató rajz, nem gyártási terv (a rajz szövegmezője is így jelöli).
- Új: `src/lib/dxf.ts`; teszt: `tests/dxf.test.ts`. Ellenőrizve: ezdxf-fel hibátlanul beolvasható, képre renderelve a rajz és az ékezetek helyesek; a demó adminban a letöltés működik.

## 4.17 – Időpontfoglaló link a felmérési kérelem után

- Új beállítás az adminban (Beállítások → Cég és kapcsolat): „Időpontfoglaló link (https)”, pl. Calendly vagy Google Naptár foglalóoldal. Csak https:// kezdetű cím menthető (szerveroldalon is ellenőrizve); üresen hagyva nincs link.
- Ha be van állítva, a vevő három helyen kapja meg: a kérelem elküldése utáni köszönőképernyőn („Foglalj most felmérési időpontot”, új lapon nyílik, beágyazva is), a visszaigazoló e-mailben gombként, és a 3 napos emlékeztetőben (ott a levélküldő „Időpontot kérek” gomb helyett).
- Link nélkül minden a régi módon működik.
- Új: `src/lib/booking.ts`; teszt: `tests/booking.test.ts` (https-szabály, admin-felülírás, e-mailek).

## 4.16 – Videó a tervről (körbejárás, WhatsAppon küldhető)

- Az Összegzés lépésben új „Videó a tervről” gomb: kb. 10 mp-es videó, a kamera a terv körül mozog, alul márkázott sáv (gyártó neve, tető és méret, bruttó irányár). Telefonon a megosztó menübe kerül (WhatsApp, Messenger), asztalon letöltődik.
- Formátum: MP4 (H.264), ahol a böngésző tudja (WhatsApp és iPhone ezt játssza le biztosan); különben WebM, erről a vevő üzenetet kap. Ahol a böngésző nem tud videót rögzíteni, a gomb nem jelenik meg.
- Teljes kör csak akkor, ha nincs ház és hátsó fal a képen; egyébként lengés ±55°-ban a kiinduló nézet körül, így a kamera nem kerül a ház mögé vagy a falba. A felvétel alatt a kameravezérlés szünetel, utána a nézet visszaáll.
- A meglévő nagy felbontású, márkázott kép („Kép küldése a családnak”) változatlan.
- Új: `src/lib/turntableVideo.ts`, `TurntableDriver` a jelenetben; teszt: `tests/turntableVideo.test.ts`. Böngészőben ellenőrizve: MP4 (H.264, 1280×768) készül, a nézet visszaáll. Valódi telefonon (iPhone, Android) még nincs kipróbálva.

## 4.15 – PDF-letöltés leadenként a gyártói adminban

- Az érdeklődő adatlapján új „PDF letöltése” gomb: ugyanaz a 4 oldalas dokumentum, amit a vevő kap (konfiguráció, anyaglista, tételes árkalkuláció, műszaki rajz, QR-kód a vevő tervére), a vevő nevével a borítón.
- A terv ugyanazzal az érvényesítéssel és árazással készül, mint a lead-végponton (`pergolaEngine`). Ha az árlista azóta változott, a gomb alatt jelzés: a PDF a mai árakkal számol.
- A 3D-kép az adminból nem készíthető (nincs megnyitott 3D-nézet): a borítón üres keret helyett útmutatás a QR-kódhoz. Ez a vevői PDF-et is érinti, ha a böngésző nem engedi a kép kiolvasását.
- Csak pergolánál jelenik meg; más termékcsaládnál és sérült tervnél a gomb nem látszik. A demó-adatokon is működik (a kitalált érdeklődők tervét a gyártó alapkonfigurációja egészíti ki).
- Új: `src/lib/leadPdf.ts` (tesztelhető bemenet), `src/components/admin/leadPdfDownload.ts` (letöltés); teszt: `tests/leadPdf.test.ts`. Böngészőben ellenőrizve: a demó adminban a PDF 4 oldallal elkészül.

## 4.14 – Kisebb 3D-modellek, változatlan minőség

- A 17 Blender-modell (bútorok, jacuzzi, modern és nyeregtetős ház, kerti elemek) veszteségmentes meshopt-tömörítést kapott: 889 KB → 457 KB (−49%). A pontok, normálok, anyagok és node-nevek bitre azonosak (az eredetivel összevetve ellenőrizve); kvantálás és szűrő nincs. A böngészőben a drei `useGLTF` bontja ki, kódváltozás nem kellett.
- A pergola nem érintett (kódból készül). Az alap fa–cink ház és a fák textúráihoz nem nyúltunk, mert ott a tömörítés látható minőségvesztéssel járhat.
- Új: `npm run models:optimize` (`scripts/optimize-models.mjs`, idempotens) új Blender-export után; `tests/modelCompression.test.ts` jelez, ha egy GLB tömörítetlenül vagy kvantálva kerül be.
- Új fejlesztői függőségek (csak a szkripthez, az alkalmazásba nem kerülnek): `@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions` (MIT), `meshoptimizer` (MIT).

## 4.13 – B2B nyitóoldal: új szöveg az értékesítési pitch alapján

- A `/` és `/en` oldal szövege a „digitális értékesítési eszköz” pitchre épül: új hero („A bemutatótól az ajánlatig egy rendszerben”), kijelentés (az ügyfél nem katalógusból képzeli el, hanem maga tervezi meg és hazaviszi), átírt bemutató, funkciók és záró blokk („Nem még egy kalkulátor”). Mindenhol Lamelix név.
- Új funkciószövegek a kód alapján: árnyékszimuláció helyszín, tájolás és dátum szerint; becsült energiaköltség, napelemes termelés és megtérülés („becslés”); PDF-ajánlat tartalma (látványterv, méretek, tételes árkalkuláció, műszaki rajz, QR-kód), WhatsApp-megosztás; admin: státusz, belső megjegyzés, jelzés egy hét válasz nélkül.
- Időmegtakarítás az Árak bevezetőjében, szemléltető példaként (napi 1 óra × 20 munkanap = havi 20 óra).
- Két új GYIK: bemutatótermi használat (a terv ajánlatkéréssel kerül az adminba), az árnyék- és energiaszámítás pontossága.
- Túlígérés javítva: a gyártó e-mailje nem tartalmaz PDF-et, hanem a 3D-terv linkjét (Funkciókártya, előtte–utána lista, Start csomag). SEO-leírás (`contracts/seo.ts`, `index.html`) igazítva.
- Megtartva: élő 3D hero, előtte–utána, élő SB 400 demó, árak és megtérülés-kalkulátor, demóűrlap. Kód- és funkcióváltozás nincs.

## 4.12 – Szabad 3D navigáció asztalon és mobilon, követő kamera javítások

- **Forgatás (bal gomb / egy ujj):** körbe minden irányból; felülnézet és alulnézet is elérhető. Lefelé addig fordítható, amíg a kamera a talaj fölött marad (közelről a tető alá is benézhet, távolról nem süllyed a föld alá). Eddig a vízszintesnél (90°) lejjebb nem lehetett forgatni.
- **Mozgatás (jobb gomb, Shift/Ctrl/Cmd + bal gomb, két ujj, érintőpadon két ujjas görgetés):** oldalra és fel-le; az ujj/kurzor alatti felület együtt mozog a mozdulattal. A forgáspont a pergola körül, a környezettel együtt szabadon mozgatható; fal (ház, szárny) mögé nem. A határnál a kép finoman megáll (eddig az elengedéskor visszaugrott).
- **Nagyítás (görgő, csípés):** asztalon a kurzor felé. A kamera nem hatol át a modellen: a mozdulat elején a forgáspont a kurzor (az ujjak, a kép közepe) alatti felületre kerül, így a kamera az oszlop, gerenda, fal előtt 0,8 m-re megáll. Kifelé nagyításnál sem süllyed a talajba.
- **Követő kamera:** önálló pergolánál a hátsó oldalra fordulva nem áll a házba (a homlokzat elé, magasabbra kerül); a ventilátor hozzáadása akkor is alulnézetbe visz, ha már alulnézetben voltunk, de közben elforgattuk a képet, és pontosan a célállásba érkezik; kikapcsolt követő kameránál a méret-, rögzítés- és bútorváltás nem mozdítja el a kamerát (a nézetgombok továbbra is igen).
- Laptopon egyszer megjelenik az új mozgatási tipp. A pergola geometriája, a funkciók, az árkalkuláció és a PDF nem változott.
- Tesztek: `desktopCamera.test.ts` (görgetés vagy csípés, forgáspont-határ falnál, talajkorlát, felületre ugró forgáspont, ház előtti kameraállás).

## 4.11 – Laptopon is szabadon mozgatható a 3D kép

- **Érintőpad, mint a telefonon:** két ujjas görgetéssel a kép eltolható oldalra és fel-le (térképszerűen, a tartalom az ujjakkal együtt mozog), csípéssel nagyítható. Eddig a két ujjas görgetés nagyított, eltolni csak jobb gombbal lehetett.
- **Egérrel:** a görgő a kurzor alatti pont felé nagyít (eddig mindig a pergola közepe felé); a bal gomb forgat, a jobb gomb vagy Shift + húzás tol.
- A kép legfeljebb 2,5 m-re mozdulhat el a pergolától, hogy a szerkezet ne vesszen el. A telefonos vezérlés nem változott.
- Laptopon is megjelenik egyszer a mozgatási tipp a megfelelő szöveggel.
- Tesztek: `desktopCamera.test.ts` (görgetés vagy csípés felismerése, egérgörgő, megkezdett mozdulat, célpont határa).

## 4.10 – Bútorok és berendezések Blender-modellekből

- **Új modellek a kódból rajzolt dobozok helyett** (`public/assets/models/furniture/*.glb`, együtt kb. 500 kB): háromszemélyes kanapé puha párnákkal és díszpárnákkal, karfás kültéri szék, lécezett teak asztalok (4, 6 és 8 fős), bárszék háttámlával, kerek bisztróasztal, nyugágy kerékkel és fejpárnával, kisasztal, beépített grill a nyári konyhában.
- **Jacuzzi:** modellezett akrilhéj körbefutó ülőpaddal és lábtérrel, fúvókák, fejtámlák, kezelőpanel, vízszintes léces szekrény sarokprofilokkal, kétfokú lépcső. A buborékos víz és az éjjeli LED-csík a régi.
- A csomagok elrendezése, helyigénye és ülőhelyszáma nem változott; a pultok, a hosszú asztalok lapja, a dohányzóasztal és a növények a régiek. A székek anyagonként egy hálóból állnak (a korábbi 6 helyett 3 rajzolási hívás székenként).
- **Korlát:** a bútorok textúra nélküli, egyszínű anyagokat kapnak (szövet, teak, porfestett alumínium); szemléltetésre valók.
- Tesztek: `furnitureModels.test.ts` (minden modell méretarányos és a padlón áll).

## 4.09 – Műszaki jelölések: valódi adatok a gyári dokumentációból

- **Adatlap-kártyák a 3D-ben:** a „Műszaki jelölések” a forgólamellás tetőnél már nem általános mondatokat, hanem az SB 400 referenciarendszer gyári dokumentációjának adatait mutatják, azon az alkatrészen, amiről szólnak: lamella (profil, tömeg, osztás, a terv darabszáma és hossza), lamellahajtás (motorok, forgástartomány, hajtórúd), gerenda, oszlop és talp (rögzítés, alapozás), vízelvezetés, hó- és szélterhelés, LED (ha a tervben van). Az esőérzékelő jelölése csak akkor látszik, ha a tervben van szenzor.
- **Forrásmegjelölés:** minden kártya alján ott a forrás és az, hogy a végleges adatokat a gyártó ajánlata rögzíti. Más rendszert forgalmazó gyártónál ezeket az adatokat a saját adatlapjából kell megadni (`src/lib/sb400Details.ts`).
- A talajközeli jelölések kártyája felfelé nyílik, hogy ne lógjon ki a nézetből. A többi tetőtípus jelölései változatlanok.
- Tesztek: `sb400Details.test.ts` (darabszám és hossz az adatlap szerint, modulos terv, kulcsadatok, LED-kártya feltétele).

## 4.08 – Választható háztípus és új kert (Blenderben modellezve)

- **Háztípus-választó:** „A házad” panelen a homlokzat anyaga mellett a ház típusa is választható: az eddigi fa–cink ház, egy modern lapostetős (kétszintes kubus tetőterasszal, léc-betéttel, napelemekkel) és egy nyeregtetős, oromfalas családi ház. Mindkét új ház Blenderben készült (`public/assets/models/houses/*.glb`, együtt kb. 320 kB), a forrásszkript a Blender-fájlban van.
- **Testreszabás megmaradt:** az új házakon is állítható a homlokzat (vakolt / tégla / fa és színe) és a nyílászárók színe; éjjel az ablakok és a fali lámpák világítanak. L- és U-alakú elrendezésnél a szárnyak a választott házhoz illő anyagot kapnak. A választást a böngésző megjegyzi; az alap továbbra is a fa–cink ház.
- **Új kert (minden háztípusnál):** a léckerítés helyett vízszintes léces kerítéstáblák, belül nyírt sövény a telekhatáron, ültetőládák bukszusgömbökkel a homlokzat előtt (falas oldalon és önálló pergolánál nincs), kerti lámpák a lépőkövek mentén (éjjel világítanak). A fák, cserjék és dézsák maradtak.
- **Betöltés:** modellezett háznál a 3,5 MB-os fa–cink ház nem töltődik le.
- **Korlátok:** a házak szemléltető modellek (egyszerű tömegek, textúra nélküli tető és burkolatok); 9 m-nél szélesebb pergolánál a modellezett ház arányosan megnő, hogy a pergola elférjen előtte. Csak látvány, az árat nem befolyásolja.
- Tesztek: `houseStyles.test.ts` (típusok, mentés, lépték, a GLB-k színezhető részei), `house.test.ts` (mentett érték a háztípussal).

## 4.07 – Forgólamellás tető: SB 400 gyári váz a 3D-ben

- **Gyári váz:** a forgólamellás tetőnél a 3D-váz az SB 400 nyilvános adatlapjának méreteiből épül, a megadott méretre paraméteresen (`src/lib/sb400.ts`): gerenda 85 × 212, oszlop 85 × 150 a gerenda külső síkjában, befelé nyúló 8 mm-es talplemez (sarkon 142,5 × 200, közbenső oszlopnál 200 × 200) horgonycsavarokkal. A többi tetőtípus váza változatlan.
- **Lamellák:** a lamella vége és a gerenda között 20 mm hézag (a lamellahossz így befoglaló szélesség − 210 mm), és a lamella a hajtásoldalon 20 mm-rel magasabban ül (a tengely 43, illetve 23 mm-rel a gerenda teteje alatt); a hajtókar, a hajtórúd és a motor ehhez igazodik, a „Működés” panel ugyanebből számol.
- **Ereszek:** hosszanti eresz (91,6 × 75) a két oldalgerenda belső síkján. Az általános elülső díszléc a forgólamellás tetőnél nem jelenik meg.
- **Korlátok:** a profilok tömör külső kontúrok (belső kamrák, sarokösszekötők, csavarozás nélkül); a műszaki rajz (`drawing.ts`) és az oldalfalak továbbra is az általános gerendaszélességgel számolnak. A 3D szemléltető, nem gyártási rajz.
- Tesztek: `sb400.test.ts` (profilméretek, lamellahossz, 34 lamella 7 m-en, tengelymagasságok, motorhossz, oszlop- és talphelyek).

## 4.06 – Gyártói nyitóoldal: domain-, sebesség- és hitelességi javítások, élő 3D hero, belépés, tölcsérmérés, admin mobilon

- **Domain:** a canonical, og:url/og:image, hreflang, sitemap és robots a Vercel éles címét használja, ha a `PUBLIC_SITE_URL` még a régi `ardelis-pergo.vercel.app` (a megosztási kép eddig 404-et adott).
- **Előre renderelt szöveg:** a `/` és az `/en` HTML-je tartalmazza az oldal fő szövegét (képernyőolvasó-szerűen rejtve, a React lecseréli), így a keresők és az AI-motorok JavaScript nélkül is látják.
- **Sebesség:** a nyitóoldal már nem tölti elő a three.js-t (külön `react` darab a React-maggal, a Babel- és a Vite-előtöltő segédekkel; a konfigurátor és a belépő lusta). Saját tárhelyű betűk (`@fontsource`, ugyanazok a betűk), nincs Google Fonts kérés. A nyitócím nem vár a belépő animációra.
- **Élő 3D hero:** a termékképernyőn a konfigurátor valódi lamellás teteje (`HeroLouvre`, `LouvreRoof`), görgetésre nyíló lamellákkal, lamellaszög-csúszkával és három katalógusszínnel; a képernyőkép a poszter, WebGL2 nélkül vagy `?gl=0`-val az marad.
- **Hitelesség:** a „Legnépszerűbb” címke kikerült; a demóűrlap nem kínál carportot; a számlálók a valódi számot mutatják animáció előtt is; béta-jelzés a demó és az árak alatt.
- **Gyártói belépés:** `/belepes` (azonosító → `/k/<azonosító>/admin`), fejlécből, mobilon ikonként, láblécből; `/login` és `/admin` ide irányít.
- **Tölcsérmérés:** `src/lib/funnel.ts` – demókattintás, élő demó, űrlap kezdés/küldés, belépés, 3D használat Vercel Web Analytics eseményként, UTM-forrással; a demókérő e-mailben „Forrás” sor. Bekapcsolás: Web Analytics a Vercelben + `VITE_VERCEL_ANALYTICS=1`.
- **Admin:** telefonon az áttekintés a „Ma teendő” listával kezd, a teendőszám a teljes listát mutatja „Összes” linkkel; érdeklődő-soronként egy koppintásos hívás; a nevek nem vágódnak le; márkaszínű csúszka.
- Tesztek: `tests/platformLogin.test.ts`.

## 4.05 – MVP: csak a teraszfedés (pergola, veranda, télikert) marad a kalkulátorban

- **Félretett termékek:** a carport, a kerítés és kapu, a garázskapu, valamint a kerti ház/szauna egyelőre kikerült a kalkulátorból (`src/products`: `status: 'hidden'`). A kódjuk megmaradt a későbbi fejlesztéshez, de sehol nem jelennek meg: nincs termékválasztó kártya, nincs „Másik termék” link a fejlécben, és egyetlen gyártó kínálatában sem szerepelnek.
- **Régi linkek:** a `/konfigurator/carport`, `/kerites`, `/garazskapu` és a termékválasztó (`/termekek`) a pergola konfigurátorra irányít (a `/k/<gyártó>/…` és az `/embed/<gyártó>/…` útvonalakon is).
- **SEO:** a három félretett oldal kikerült a sitemapből.
- A pergola-konfigurátor (pergola, veranda, télikert) változatlan.
- Tesztek: `products.test.ts` (csak a teraszfedés él, a félretett családok senki kínálatában nincsenek), `seo.test.ts` (a félretett oldalak nincsenek a sitemapben).

## 4.04 – Prémium csomag: közös visszajelzések, mozgás, termékválasztó, tervrendszer

**A — Közös funkciók minden konfigurátorban**
- **Ármódosító buborék visszavonással** (`ChangePill`): a kerítés és a garázskapu is megkapta; a pergola ugyanazt a komponenst használja.
- **„Üdv újra” sáv** (`WelcomeBack`): mentett piszkozatnál a kerítés és a garázskapu is felajánlja a folytatást vagy az új tervet (eddig szó nélkül betöltötték).
- **Összegzés-bélyegkép:** a kerítésnél és a garázskapunál is a jelenet valódi pillanatképe (eddig doboz-ikon); a vásznak `preserveDrawingBuffer`-rel futnak.
- **Lépésváltás iránya:** előrelépéskor jobbról, visszalépéskor balról csúszik be a panel — mint a pergolánál.
- **Jelenet-alcím műszaki adattal:** kerítésnél „Porfestett alumínium · vízszintes lamella · 1,6 m magas” (eddig marketingmondat).

**B — Mozgás és visszajelzés**
- **Jelentéses ikonmozgás:** a nap forog, az aranyóra felkel, a hold billen, az eső csöppen, a kapu ajtaja kinyílik, az AR körbefordul, az Eszközök rács megpattan.
- **Fő gombok** (PDF összefoglaló, felmérési kérelem küldése): átfutó fény és finom ragyogás hoverre.
- **Kiemelt csomag:** a gyártó megjelölhet egy kiinduló csomagot (`featured`); átmenetes keret és „Legnépszerűbb” címke. Demó: Komfort, Kétállásos carport.
- **Animált ár** a mobil alsó ársávban mindenhol (eddig csak a pergolánál).

**C — Termékválasztó oldal**
- Minden kártyán a termék saját 3D-jelenetéből készült kép (aranyóra, családi ház); betöltés közben csillogó helykitöltő, betöltéskor finom beúszás, hoverre lassú nagyítás.
- Számozott „Tervezd meg → Lásd az árat → Kérj felmérést” sáv.

**D — Egységes tervrendszer**
- **Saroksugár-skála:** `--radius-xs/sm/md/lg/xl/pill` (4 / 7 / 9 / 13 / 18 / 999 px); a stíluslap 244 egyedi értéke (4–20 px között 14 féle) erre a hat lépcsőre állt.
- **Kis betűméretek skálája:** `--text-2xs … --text-lg` (10,5–15,5 px); 570 egyedi érték (10–15,5 px közötti fél pixeles eltérések) erre a hat lépcsőre állt.
- **Árnyékskála:** `--shadow-sm/md/lg`; az üvegpanelek ezt használják.
- **Égbolt:** a kerítés- és garázsjelenet égboltja élesen, a pergoláéval azonos fényerővel (a horizont köde és az ég összeér).

## 4.03 – A pergola/carport stúdió is a közös keretre állt

- **Egy kód, egy viselkedés:** a pergola és a carport stúdió (`PergoStudio`) is a közös `StudioHeader`, `SceneToolbar` és `usePresentation` / `usePriceCollapse` elemekre épül, mint a kerítés és a garázskapu. A saját, külön megírt fejléc, eszköztár, Eszközök-menü, bemutató- és árpanel-állapot megszűnt.
- **Mindenhol azonos jelenet-eszköztár:** napszak-gomb (Nappal → Aranyóra → Éjszaka; a pergolánál 13, 18, 22 órára áll, a csúszka továbbra is a Nézet panelben), utána a termék gyorsgombjai (pergola/carport: Eső, AR; kerítés és garázskapu: kapunyitás), végül az Eszközök.
- **Eszközök menü mindenhol:** elöl a Nézet és vizualizáció és a termék saját eszközei (pergolánál árnyékelemzés, fotóba helyezés, működés-bemutató, robbantott nézet, költségkeret, üzemeltetés, tanácsadó; kerítésnél mintaárak), utána a közös Bemutató mód, PDF összefoglaló, Megosztás — ez utóbbi hármat a pergola menüje eddig nem tartalmazta.
- **Fejléc mindenhol:** a gyártó saját márkajele (eddig a kerítésnél és a garázskapunál a Lamelix-logó jelent meg a gyártóé helyett), „Építészeti konfigurátor” + termékváltó, teljes képernyő, visszavonás, Bemutató, Tudnivalók / Árazás, Alaphelyzet. A márkajelre kattintva a kamera az áttekintő nézetbe áll.

## 4.02 – Egységes stúdió minden terméknél: Eszközök, napszak, összecsukható árpanel, bemutató

- **Közös stúdió-keret** (`components/studio/StudioChrome.tsx`, `studioState.ts`, `lib/studioLighting.ts`): a kerítés és a garázskapu konfigurátor ugyanazokat a termékfüggetlen funkciókat kapta, mint a pergola és a carport, ugyanott és ugyanúgy működve.
  - **Fejléc:** teljes képernyő, visszavonás/ismétlés, Bemutató, (kerítésnél Árazás), Alaphelyzet.
  - **Eszközök menü:** Nézet és vizualizáció, Bemutató mód, PDF összefoglaló, Megosztás (kerítésnél Mintaárak szerkesztése is).
  - **Nézet és vizualizáció panel:** napszak (Nappal / Aranyóra / Éjszaka), környezet (Családi ház / Csak a termék), 180 cm-es figura, méretcímkék, automata forgatás.
  - **Napszak-gomb** a jelenet-eszköztárban (nappal → aranyóra → éjszaka), mellette a termék saját gyorsgombja (kapu nyitása).
  - **Összecsukható árpanel** a pergoláéval azonos módon és megjegyzett állapottal; összecsukva a bruttó irányár a sarokban, animált számváltással.
  - **Bemutató mód:** csak a 3D jelenet és az „Ügyfél-bemutató” címke; Esc-re vissza.
- **Kiindulás mindenhol azonos:** aranyóra és környezet nélküli, semleges háttér — a kerítés és a garázskapu is így tölt be, mint a pergola és a carport.
- **Napszak-világítás** a kerítés- és garázsjelenetben a pergola égboltjaival és fényszíneivel (aranyórában alacsony, meleg, oldalról sütő nap).
- A semleges háttér egyenletes (a háttérgömb nem kap tónusleképezést, így nem sötétebb a padlónál).
- A katalógus-stúdió külön eszköztár- és címelrendezése megszűnt: ugyanaz, mint a pergoláé.

## 4.01 – Garázskapu: a garázsszárny a házhoz épül; tiszta belső nézet

- **A garázsszárny a ház oromfalához épül:** eddig egy külön álló, vakolt doboz állt a ház előtt, résekkel. Most a szárny bal fala a ház jobb széléhez illeszkedik (a ház a saját szélességéből igazodik, `HouseBackdrop rightEdge`), a szárny mélysége a házéhoz igazodik.
- **Kortárs toldalék-anyagok:** antracit vakolat a ház cédrus- és téglafelületei mellé, a ház tetőjével azonos horganyzott attikafedés és homlokdeszka, előre kinyúló eresz a kapu fölé, ereszcsatorna és a sarokba futó lefolyó, sötét lábazati sáv, keskeny, lefelé világító lámpa (éjjel fénykúppal), házszámtábla.
- **Belül:** festett falak és mennyezet, polcos tároló a hátsó sarokban, mennyezeti lámpa (éjjel világít).
- **„Belülről” nézet javítva:** az autó a garázs jobb felére állt, a kamera a bal oldali szabad sávból, szemmagasság fölött néz a kapura — a nyitott kapu és a nyílás szabadon látszik (eddig az autó takarta a kép felét).

## 4.0 – Garázskapu konfigurátor; egységes ház és semleges háttér minden terméknél

- **Új élő termék: garázskapu** (`/konfigurator/garazskapu`, `/k/<gyártó>/garazskapu`, `/embed/<gyártó>/garazskapu`). Saját mag (`src/products/garage.ts`: séma, alapértékek, mintaárlista, spec-kód, fejléc, leírás, `g=` megosztó kód), saját motor (`garageEngine` — a lead-végpont érvényesít és újraáraz), saját stúdió (`GarageStudio`), PDF (`exportSpecPdf`), SEO-bejegyzés és sitemap. A demó kínálata: teraszfedés, carport, kerítés, garázskapu.
- **Négy kaputípus valós 3D-ben, animált nyitással:** szekcionált (a panelek a sín ívén a mennyezet alá futnak, torziós rugó, kötéldobok, mennyezeti motor), billenő (a lap kilendül és a mennyezet alá fordul, karokkal és húzórugókkal), redőny (a lécek a tengelydobozba tekerednek), oldalra nyíló szekcionált (a panelek a belső fal mentén fordulnak el). Panelminta (keskeny és széles borda, kazettás, sima, fahatású), ablak (felső sor, függőleges sáv, négyzetes), személybejáró kilinccsel és zárral, illeszkedő oldalajtó, fotocellák, okos kódkapcsoló, alacsony szemöldök vasalat.
- **Csak ami a típushoz tartozik:** redőnykapunál nincs panelminta, szigetelés és ablak; billenőnél és redőnynél nincs személybejáró; az alacsony szemöldök csak szekcionáltnál. A vezérlő, az ár és a leírás is ezt követi; típusváltáskor a méret a típus korlátai közé áll.
- **Jelenet:** a kapu egy lapostetős garázsszárny homlokzatában, mellette a pergola-konfigurátor háza; kocsibeálló, autó a garázsban; kameranézetek: Tér, Front, Részlet, Belülről.
- **Egy ház minden terméknél:** a kerítés mögött eddig egy külön, egyszerű dobozház állt; most ugyanaz az építészeti ház, mint a pergolánál (a betöltő és az anyaghangolás közös modulba került: `src/lib/houseAsset.ts`, `components/models/HouseAsset.tsx`).
- **Környezet kikapcsolva = a pergola semleges stúdió-háttere** a kerítésnél és a garázskapunál is: világos, semleges padló és háttér (éjjel sötét), nincs fű, beálló, ház és növényzet. Eddig a kerítésnél csak a ház tűnt el.
- Az árpanel (`CatalogPricePanel`) fejléce termékfüggetlen lett; a vezérlő-primitívek (`Range`, `Choices`, `Toggle`, `Section`) közösek.
- Tesztek: garázskapu-motor (érvényesítés, árazás, megosztó kód, leírás, típusfüggő opciók); a „hamarosan” lead-teszt a kerti házra állt át.

## 3.99 – Mobil nézet: a kerítés-stúdió lapja kinyílik, nincs átütő tartalom

- **Hiba javítva – kerítés mobilon:** a „Kerítés és kapu beállításai” lap koppintásra nem nyílt ki (a fejlécnél maradt, a lépéssor levágva). Most 74%-os magasságig nyílik, közben a kameragombsor eltűnik, mint a pergola teljes lapjánál.
- **Átütő elemek nyitott lap alatt:** az „Üdv újra” sáv (carport/pergola) és a 3D méretcímkéi (160 cm, 1850 cm) átlátszottak az üvegpanelen a lap tartalma mögött; nyitott lapnál elrejtve.
- **Lépés-szemöldök mobilon:** a katalógus-stúdió rövid címkéket használ („01 · Méret”, „02 · Kivitel”, „03 · Komfort”), hogy a fejléc és a cím egy sorban maradjon.

## 3.98 – Mélyebb UI-pass: a kerítés-stúdió a pergola panelnyelvén

- **Egy panelnyelv minden terméknél:** a kerítés (és a katalógus-motor többi családja) panelje ugyanazt a felépítést kapta, mint a pergoláé: „Konfiguráció 01 / 04” fejléc a mérettel („14,0 fm · 1,6 m”), számozott lépéspontok pipával, „01 · Méret és arányok” stílusú lépés-szemöldök. A belső sorozatkódok („LAMELIX / FENCE”, „3D / LIVE”) eltűntek a felületről.
- **Árpanel szemöldöke** kerítésnél a kivitelt mondja („Vízszintes lamella · Sínen futó tolókapu”), nem a motor nevét; a jelenet címkéje „Élő építészeti jelenet”, mint a pergolánál.
- **Összegzés:** a bélyegkép a termék nevét mutatja; a kapunyílás tizedesvesszővel („3,5 m”); az utolsó lépés gombja „Felmérést kérek”, és a kérőlaphoz görget (eddig „Tervezés” felirattal az első lépésre ugrott).

## 3.97 – Prémium mikro-interakciók a referencia-oldalak mintájára

Forrás: getlayers.ai, ui.live, itshover.com, prompt-motion.com, styles.refero.design, performative-ui. Közös minták: ikonok, amelyek „szándékkal mozdulnak”; fényvonal a fő gombon; élő állapotpont lüktetése; kinetikus számváltás; emelkedő üvegkártyák fényes kerettel; egységes, token-alapú stílus.

- **Ikonok mozgása:** a jelenet-eszköztár, a kameranézetek, az Eszközök menü és a fejléc gombjainak ikonjai hoverre finoman megemelkednek/elfordulnak; a bekapcsolt jelenet-gomb ikonja „beáll” (settle) animációval.
- **Fő lépésgomb** („Következő” / „Összegzés”): fényvonal fut át rajta hoverre, a nyíl előremozdul.
- **„Élő” pont** a jelenet címkéjén és az árpanelen: lüktető gyűrű.
- **Kinetikus cím:** a jelenet címében a tetőtípus és a méret szám váltáskor alulról, elmosódásból úszik be (pergola, carport, kerítés).
- **Csomagkártyák:** hoverre megemelkednek árnyékkal; a betöltött csomag zöld keretet és pattanó pipát kap.
- **Termékválasztó kártyák:** hoverre 4 px emelkedés, mély árnyék, átlós fényes keret (GlassCard-minta), a nyíl előremozdul.
- Minden új mozgás tiszteli a `prefers-reduced-motion` beállítást.

## 3.96 – Csomagváltás nem vált éjszakára; a carport kalkulátorból kikerültek a pergola-elemek

- **Hiba javítva – „Kétállásos carport” → éjszakai nézet:** a csomag LED-et kapcsol be, és a pergola „esti nézetre váltottunk” automatikája (amely a LED kapcsolóhoz készült) csomagbetöltéskor is lefutott. Teljes terv betöltésekor (csomag, tanácsadó, alaphelyzet) mostantól csak az áttekintő kamera áll be; az egyes módosításokhoz kötött reakciók (oldalra fókusz, esti nézet, belső nézet) nem futnak le. Ugyanez a pergola-csomagokra is igaz.
- **Carport kalkulátor – csak ami oda való:** nincs „Kanapé” kameranézet; a Nézet panelen nincs bútorválasztó, a környezet opció „Csak a carport”, a szövegek carportról szólnak (fotóba helyezés, napirány, követő kamera); az esti hangulatpanel nem kínál teraszfűtést és színes LED-et; a költségkeret-tervező szövege is carportot mond.
- **Műszaki jelölések a 3D-ben** csak a tervben meglévő részletekre: lamellamotor és esőszenzor csak mozgó tetőnél, LED csak ha van — fix tetős carporton és pergolán eddig lamellamotort mutatott.
- **Üzenetsávok** („Üdv újra”, ármódosítás-pill) a két panel közötti szabad sávban maradnak, nem futnak a panelek alá.

## 3.95 – Kerítés-nézet keretezése, élesebb autó, rendezett fejléc

- **Kamera a szabad sávra keretez** (`CatalogScene.tsx`): a kerítés/carport 3D eddig a két oldalpanel mögé lógott. A kamera most megméri a panelek közötti szabad sávot, annak közepére tolja a képet (view offset), és akkora távolságra áll, hogy a teljes rendszer (kapuval, kiskapuval) beleférjen. Tér-, front- és felülnézetben is; mobilon a teljes vászon a keret.
- **Terep:** nagyobb, zöldebb gyep, a köd és a távoli vágósík a nagyobb kameratávolsághoz igazítva (nem látszik a talaj széle, nem ködösödik be a kerítés).
- **Kerítés/carport stúdió fejléce asztalon:** a jelenet-eszköztár függőlegesen a jobb panel mellé került, a cím nem fut alá; 1440 px alatt a leírás-sor elrejtve; a panel mögül kilógó „Paraméteres 3D” címke eltűnt.
- **Termékváltó a fejlécben** egy sorban marad („Carport és előtető · Másik termék”) — eddig a projektcímke betűközét örökölte és három sorba tört.
- **Autó:** függőleges lökhárítók éles élekkel, alacsonyabb, lejtős motorháztető, határozott csomagtartó-él és függőleges far a korábbi „kapszula” vég helyett; kisebb vállív, hűtőrács és alsó légbeömlő, oldalsó karaktervonal, krómozott ablakperem, lejjebb ültetett LED fényszórók.

## 3.94 – Különálló kalkulátorok termékenként; új kerítés- és autómodell

- **Szétválasztott termékek:** a kalkulátorokon belül nincs többé „Mit tervezel?” lista — minden család saját, különálló tervező. A termékválasztó külön oldalra került (`/konfigurator/termekek`, `/k/<gyártó>/termekek`, `/embed/<gyártó>/termekek`), a kalkulátor fejlécében egy „<termék> · Másik termék” link vezet oda (csak ha a gyártó egynél több családot kínál).
- **Teraszfedés kalkulátor:** a „Mit építesz?” csak pergola / veranda / télikert; a carport innen kikerült.
- **Carport kalkulátor** (ugyanazon a motoron): nincs típusválasztó és tanácsadó, csak a carport-csomagok; az Extrák lépésben csak LED és napelem (fűtés, hangrendszer, ventilátor, árnyékoló, szenzor, okosotthon nincs); a Szín fül „Carport”. Az „Új terv” és az „Alaphelyzet” a carport alaptervére áll vissza (eddig a pergoláéra ugrott). Termékenként külön piszkozat a böngészőben — a carport nem írja felül a teraszfedést (a pergola kulcsa változatlan).
- **Kerítés 3D újraépítve** (`src/components/catalog/FenceModel.tsx`): oszlop legfeljebb 2 m-enként (80 × 80 fedlappal, alapozott talppal vagy talplemezzel), beton lábazati szegély, profilos lamellák U-sínben fedő- és záróprofillal; függőleges léc tartósínen, átlós léc kerethez vágva, klasszikus rúd lándzsahegyekkel, kovácsolt betét íves rúdtetővel és gyűrűkkel, tömör betét. Kapu: 120 × 120 kapuoszlopok, keretes szárny azonos betéttel; tolókapu sínnel és görgőkkel a bal szakasz mögé futva, úszókapu farokrésszel, alsó C-profillal és görgős kocsikkal; kétszárnyú nyílókapu zsanérokkal és ejtőreteszel; motor betonalapon, fogasléc, fotocellák, villogó; kiskapu kilinccsel és zárral, együtt nyílik a kapuval; kaputelefon a kiskapu oszlopán; LED az oszlopfejeken. WPC-nél fa betét fém vázban. Minden ismétlődő elem példányosított.
- **„Környezet” kapcsoló** a kerítés 3D-ben: kikapcsolva csak a kerítés látszik a terepen; bekapcsolva ház, bokrok és fa a telken.
- **Új autómodell** a carport alá (`src/components/models/Car.tsx`): oldalsziluettből kihúzott, lekerekített vállú karosszéria kerékjárati ívekkel, ék alakú övvonal, üvegezett utastér tetőpanellel és oszlopokkal, ajtóvonalak és kilincsek, tükrök, könnyűfém felni küllőkkel és féktárcsával, LED fényszóró, teljes szélességű hátsó lámpasor, rendszámok. Ezüst és mélykék fényezés.
- Tesztek: termékválasztó útvonala (a szelet egyik családé sem), carport-alapterv.

## 3.93 – Kerítés és kapu: a második termékcsalád, saját lineáris motoron

- **Élő család:** `/konfigurator/kerites` (és `/k/<gyártó>/kerites`, `/embed/<gyártó>/kerites`) a kerítés–kapu konfigurátort nyitja a gyártó héja alatt: saját 3D (kerítésszakaszok, oszlopok, nyíló-/toló-/úszókapu, kiskapu, kaputelefon, éjszaka, kapunyitás), négy lépés (méret, kivitel, extrák, kérés), tételes irányár, PDF, megosztó link. A korábbi, útvonal nélkül maradt katalógus-stúdió (`CatalogStudio`) éledt újra: a termékcsalád-váltó legördülő és a „Katalógus” link helyett a gyártó neve, a „Mit tervezel?” választó és a tenant kezdőlap-linkje.
- **Kültéri mag** (`src/products/outdoor.ts`, szerver-biztos, relatív importokkal): alapértékek, mintaárlista, feliratok, árazás, spec-kód, leírás-sorok, fejléc, zod-séma, `k=` base64url megosztó kód. A böngészős `src/lib/catalog.ts` innen re-exportál, és csak a localStorage-piszkozat és a megosztó URL maradt benne.
- **Kerítés-motor** (`fenceEngine`, kulcs `k=`): csak `family: 'fence'` konfigurációt fogad, a mintaárlistával áraz (a gyártói árlista később a tenantból), leírást és fejlécet ad a lead-e-mailhez. A motor-szerződés két opcionális taggal bővült: `headline`, `describe`.
- **Lead-végpont motor-független:** a rekord `headline`, `spec`, `bom` mezőket kap; a pergola (és carport) leírását továbbra is a `describeConfig` + anyaglista adja, más családnál a motoré. A gyártói és vevői e-mail a fejlécből és a sorokból épül; anyaglista csak ott, ahol van. `product: 'fence'` lead a kerítés motorján érvényesül (pergola-konfigurációval 422 `config`), a konfigurációs link `/k/<gyártó>/kerites#k=…`.
- **Demó kínálata:** teraszfedés + carport + kerítés; SEO-cím és sitemap-bejegyzés a kerítés oldalnak. Folyóméter kiírás: egész szám tizedes nélkül („14 fm”).
- Tesztek: kerítés-motor (parse/price/shareHash/leírás), kerítés-lead e-mail és tárolás, termék-regiszter. Fájlok: `src/products/outdoor.ts`, `engines.ts`, `index.ts`, `studios.tsx`, `src/pages/FenceStudio.tsx`, `CatalogStudio.tsx`, `CatalogControls.tsx`, `src/lib/catalog.ts`, `server/lead.ts`, `src/tenants/demo.ts`, `contracts/seo.ts`.

## 3.92 – Carport: az első új termékcsalád a keretes-tető motoron

- **Negyedik építménytípus** a pergola, veranda és télikert mellett: **Carport** (`building: 'carport'`). Fix tető kötelező (lemez, polikarbonát vagy üveg, a mozgó lamella és a textil nem választható), minden nyitott oldal nyitva marad (oldalzárás kézzel visszatehető), nincs üvegezés, klíma, alap. Pergolára visszaváltva az eredeti oldalak (pl. zip) helyreállnak. Megosztó kódban `ep` jelző; a régi linkek változatlanok.
- **Szabályok a kutatásból** (`docs/TERMEKADATOK.md`): egy állás 2,8 m-től, kettő 5,3 m-től; figyelmeztetés szűk szélességre, 5 m alatti mélységre, 2,1 m alatti belmagasságra; üveg/polikarbonát tetőnél dőlés javaslat. Tájékoztató a bejelentés/engedély és a hóteher-osztály kérdéséről.
- **3D:** a carport alatt autó áll (kétállásosnál kettő), paraméteres karosszéria kerekekkel, üvegekkel, lámpákkal; a fadeszka helyett térkő/beton beálló fugahálóval. Minden más (ház, kert, fény, fotóba helyezés, AR, PDF) változatlanul működik.
- **Belépés:** `/konfigurator/carport` (saját SEO-címmel és sitemap-bejegyzéssel) carport kezdőállapottal indul — a demó három csomagja: egyállásos 3 × 5,2, kétállásos 5,6 × 5,4 polikarbonát tetővel, fali 3,2 × 5,2 üvegtetővel. A „Mit tervezel?” választóban a carport élő link, a lead `product: carport`-tal érkezik, a motor a pergoláé.
- **Gyártóknak:** a carport automatikusan elérhető ott, ahol a gyártó fix, polikarbonát vagy üvegtetőt kínál (`availableBuildings`); a `products` listába `'carport'` kell a választóhoz. A demó kínálata: teraszfedés + carport.
- Tesztek: carport-patch, link-visszaolvasás, szabályok, elérhetőség, motor. Fájlok: `src/lib/buildings.ts`, `src/tenants/rules.ts`, `src/lib/shareCode.ts`, `src/components/PergolaScene.tsx` (Car, CarportCars, Paving), `BuildingControls.tsx`, `ConfiguratorControls.tsx`, `src/lib/config.ts`, `src/tenants/demo.ts`, `contracts/seo.ts`, `src/products/*`.

## 3.91 – Többtermékes héj, 2. lépés: termékcsalád-motorok és Stúdió-regiszter

- **Motor-szerződés** (`src/products/engines.ts`): egy család motorja érvényesít (`parse`), áraz (`price`) és megosztó-kódot ad (`shareHash`, saját kulccsal: pergola `c=`). A pergola motorja a meglévő `parseConfig`, `tenantPrice`, `shareHash` fölötti vékony réteg — a pergola viselkedése nem változott. A „hamarosan” családoknak nincs motorjuk.
- **Lead-végpont** a motoron keresztül dolgozik: a kérés `product` mezőt kap (régi kliensek nem küldik → pergola); ismeretlen vagy motor nélküli családra 422. A konfigurációs link a család útvonalára mutat. A leads tábla új `product` oszlopot kap (`supabase/leads.sql`); ha még nincs lefuttatva, a lead az oszlop nélkül is elmentődik. Az admin lead-lista lekéri a `product` mezőt.
- **Stúdió-regiszter** (`src/products/studios.tsx`): családonként a konfigurátor komponense lustán; a `TenantStudio` innen választ, és a család Stúdiójának kódját tölti elő. Új családnál egy sor ide, egy motor az `engines.ts`-be.
- Tesztek: motor-egyezés a meglévő függvényekkel, lead `product` elfogadás/elutasítás. A leírás és az e-mail (`describeConfig`) ma még pergola-specifikus; a második családdal a motorba kerül.

## 3.90 – Többtermékes héj, 1. lépés: termékcsaládok, útvonalak, „Mit tervezel?” választó

- **Termékcsalád-regiszter** (`src/products/index.ts`): teraszfedés (él), carport és előtető, kerítés és kapu, garázskapu, kerti ház és szauna (hamarosan). Függőség nélküli modul, a szerver és a tesztek is látják. A gyártó (tenant) `products` mezővel adja meg, mit kínál; megadás nélkül csak teraszfedés, így a meglévő gyártók változatlanul működnek.
- **Útvonalak:** `/konfigurator/<család>`, `/k/<gyártó>/<család>`, `/embed/<gyártó>/<család>`; a pergola marad a rövid címen. Ismeretlen szelet, vagy a gyártó által nem kínált család → 404. A régi `/studio/fence`, `/studio/gate` → `/konfigurator/kerites`, `/studio/canopy`, `/studio/carport` → `/konfigurator/carport`.
- **„Mit tervezel?” választó** a Típus lépés tetején: az élő családok linkek, a még nem elérhetők a bemutató gyártónál „hamarosan · érdekel” gombbal. Egy kattintás névtelen `interest_<család>` eseményt küld (a `/api/track` fogadja), így mérhető, melyik családot érdemes következőnek megépíteni. Nem felugró ablak: linkelhető és kereshető.
- **„Hamarosan” oldal** (`/konfigurator/kerites` stb.): a család rövid leírása, érdeklődés-gomb, link a teraszfedés tervezéséhez.
- A tenant-kontextus megkapta a `product` és `mode` mezőt az útvonalképzéshez. Tesztek: `tests/products.test.ts`. Terv: `docs/TOBBTERMEK-TERV.md`.

## 3.89 – Lamellák eltűnése javítva (első betöltés telefonon, színváltás)

- **Hiba:** a valós lamellás tetőn (Aero) a lamellák eltűntek, csak a keret látszott. Telefonon első betöltéskor jelentkezett (az automatikus minőségállítás az első másodpercekben anyagot cserél), asztalon keretszín-váltás után. Tetőváltás után helyrejött. Ok: a lamellák `InstancedMesh`-ei az anyagot és a geometriát konstruktor-argumentumként kapták, így anyagcserénél a mesh csendben újraépült üres (egységmátrixos) példányokkal, a lamellák pedig a nullpontba estek.
- **Javítás:** az anyag és a geometria tulajdonságként kerül a mesh-re (csere esetén nem épül újra), és védőháló figyeli, ha mégis új mesh jön létre, ilyenkor a lamellák azonnal újra a helyükre kerülnek. Böngészőben mérve: színváltás után 36/36 lamella a helyén (előtte 0/36).
- **Átvizsgálás:** új böngészős végigjáró (`tests/e2e/invariants.cjs`): minden lépés minden gombja, legördülője, csúszkája és számmezője asztali és telefonos nézetben, és mindegyik után ellenőrzés: nincs látható üres példány-mesh, nincs NaN a 3D-ben, az ár szám, a fejléc a kiválasztott tetőt mutatja, nincs JS-hiba. Eredmény: 41 + 69 művelet, hiba nélkül. A `?debug=1` mostantól a jelenetet is elérhetővé teszi a tesztek számára (`window.__lamelixScene`).

## 3.88 – Nyitóoldal: összecsúszott szekciók javítva, modernebb szövegbetű

- **Hiba:** a 3.85–3.86-ban lustán betöltött szekciók (badge-sorok, számsor, előtte-utána, lábléc) a betöltés után megnövelték az oldal magasságát, de a GSAP ScrollTrigger már korábban kiszámolta a rögzített (pin) bemutató helyét. Ettől a „Bemutató” szekció szövegei és kártyái egymásra csúsztak, és a következő szekció belelógott. Javítás: minden lustán betöltődő látványelem betöltés után újraszámoltatja a görgetés-pozíciókat (`useScrollRefresh` a `Showpieces`-ben).
- **Betűtípus:** a szövegek (bekezdések, gombok, feliratok, címkék, űrlap) mindkét nyitóoldalon **Geist**-re váltottak, ami modernebb és jól olvasható; a nagy címek, a kijelentés, a számok és a lábléc-felirat maradtak Plus Jakarta Sans-ban, a dőlt kiemelések Cormorant Garamondban. A Geist a Google Fonts importból jön (`src/index.css`), a konfigurátort nem érinti.
- Fájlok: `src/components/Showpieces.tsx`, `src/platform.css`, `src/home-film.css`, `src/pui-theme.css`, `src/index.css`.

## 3.87 – Ügynök-skillek a repóban, teljes Edge-importgráf ellenőrzés

- **Négy skill** a `.claude/skills/` alatt (Claude Code és OpenCode is olvassa): `lamelix-workflow` (kapu, changelog, commit, deploy-ellenőrzés), `lamelix-edge-imports`, `lamelix-add-roof-type`, `lamelix-add-furniture-set`. Minden ügynök ugyanazt a lépéssort követi; az `AGENTS.md` hivatkozik rájuk.
- A tető- és bútor-skill érintési listáját próbával ellenőriztük: új típust felvéve a `tsc` csak a helyek egy részét jelzi (tetőnél 3-at, bútornál 2-t), a többit a skill sorolja fel.
- **Védőteszt kiterjesztve:** `tests/edge-imports.test.ts` mostantól az `api/` és `server/` fájlokból bejárja a teljes importgráfot (korábban 2 kézzel felsorolt fájl), és fájlonként listázza a `@/` érték-importokat. Negatív próbával igazolva: a 3.68-as hibás importot elkapja.

## 3.86 – Előtte-utána: ugyanaz a terasz, pergolával

- **Képcsúszka** mindkét nyitóoldalon: két azonos kameraállású kép a 3D stúdióból (üres faburkolatú terasz a ház előtt, és ugyanaz antracit lamellás pergolával és bútorral), húzható választóvonallal. Egérrel, ujjal és billentyűvel (rejtett csúszka) is állítható; a képek `public/assets/home/terrace-before*.webp` és `terrace-after*.webp` (1920 és 960 px). Saját komponens (`ImageCompare`), nem a könyvtáré, mert annak BeforeAfter eleme szöveges lista.
- **Főoldal:** a kijelentés után új szekció („Ugyanaz a terasz. Pergolával.”), a kép alatt a könyvtár két oszlopos előtte-utána listája a gyártói folyamatról (árlista e-mailben → irányár tervezés közben; „kb. 5×4 méter” → teljes konfiguráció PDF-fel…), a nyíl fölött „Lamelix-szel”. Magyarul és angolul.
- **Mintaoldal:** az élmény-szekció után ugyanez a képcsúszka a fotóba helyezés felvezetéseként.
- **Képkészítés:** a stúdió `?cam=` rögzített kameraállásával, ultra minőségben, az „előtte” képhez a pergola- és bútorcsoport elrejtésével — így a két kép pixelre ugyanaz a jelenet.
- Fájlok: `src/components/Showpieces.tsx` (`ImageCompare`, `BeforeAfterList`), `src/pui-theme.css`, `src/pages/Platform.tsx`, `src/pages/Home.tsx`, `public/assets/home/terrace-*.webp`.

## 3.85 – Nyitóoldalak: performative-ui látványelemek Lamelix témával

- **Könyvtár:** `performative-ui` 0.7 (MIT, React 18/19), csak a nyitóoldalakkal töltődik (lazy `Showpieces` chunk, ~15 KB gzip JS + 9 KB CSS); a konfigurátor csomagját nem érinti. A lila „AI” gradient helyett saját téma (`src/pui-theme.css`): `.pui-lamelix` a főoldalon (zöldes-fekete, #d8ff72 akcent), `.pui-film` a mintaoldalon (tinta, bronz, Cormorant).
- **Főoldal (`/`):** a futó marquee helyett két sor jellemző-badge, amelyek görgetésre ellentétes irányba csúsznak (SlippyWords), kiemelt elemekkel; alatta felfutó számsor valódi, a katalógusból számolt értékekkel (91 szín, 6 tetőrendszer, 9 oldalzárás, 5 rögzítési mód), ami akkor indul, amikor a képernyőre ér; ragadós CTA-sáv a hero után („Nézze meg élőben a konfigurátort”), ami a záró szekciónál eltűnik; fal méretű LAMELIX felirat a láblécben link-oszlopokkal (Termék, Kapcsolat, Jogi). Magyarul és angolul.
- **Mintaoldal (`/minta`):** a címsor felett forgó szó (PERGOLA → VERANDA → TÉLIKERT), a bronz marquee helyett csúszó badge-sorok a mintaoldal betűivel, ragadós „Tervezés” sáv, és a hero PERGO-szellemképét tükröző óriás LAMELIX lábléc.
- **Technika:** a ragadós sáv a `body`-ba portálódik (az animált szülők transzformja alatt a `fixed` nem működne); a belső lábléc-linkek kliensoldali navigációval nyílnak; a felfutó számok és a sáv görgetésfigyeléssel működnek (IntersectionObserver nélkül). Csökkentett mozgásnál a csúszás és a számlálás kikapcsol.
- **Szándékosan kihagyva:** Aurora, FloatingSparkles, GradientText, Prompt, ChatBubble, PricingCard, Popover — ezek a startup-klisék, amiket a könyvtár maga is kigúnyol, egy prémium építőipari márkához hiteltelenek. GlassCard sem került be: a Stúdió bento világos háttéren van, az üvegkártya sötét háttérre való.
- Fájlok: `src/components/Showpieces.tsx`, `src/pui-theme.css`, `src/pages/Platform.tsx`, `src/pages/Home.tsx`, `package.json`.

## 3.84 – Nappal-éjszaka átúsztatás, filmszerű kameravágás

- **Napszakváltás:** a nap ereje, színe és iránya, az égboltfény, a köd, az expozíció már nem ugrik, hanem a célérték felé úszik. Az égbolt-kép (HDR) és a csak be/ki jellegű dolgok (csillagok, éjszakai derítőfények, LED éjszakai fénye, bloom) az 1,5 s-os átmenet közepén váltanak, amikor az égbolt a legtompább, így a csere nem látszik. A napszak-csúszka húzása közben is folyamatos.
- **LED felkapcsolódás:** amikor beáll az este, a perimeter LED ugyanazzal a villanó-felfutó animációval kapcsol fel, mint utólagos bekapcsoláskor.
- **Kameravágás:** nézetváltáskor a repülés közepén a látószög 3°-kal szűkül, majd visszaáll („fókuszálás”), és a mélységélesség a célponton marad, a környezet enyhén elmosódik, a végére kitisztul. A mélységélesség csak magas/ultra 3D-minőségnél fut (utófeldolgozás), fél felbontáson; nyugalomban nulla a hatása. Az első berepülésnél nincs.
- Fájlok: `src/components/PergolaScene.tsx` (`LightingMood` a korábbi `WeatherMood` helyett, `LedRamp`, `CameraController`), `src/components/SceneEffects.tsx` (DepthOfField), `src/lib/cameraMotion.ts`.

## 3.83 – Típusváltás-hibák, PDF gomb az összegzésben, pontosabb fotóba helyezés

- **Veranda / télikert váltás:** eddig csak az üres oldalak kaptak üvegfalat, a zip-árnyékolós (lamellás, lécfalas) oldal megmaradt, így a veranda „félig zárt” lett. Most zárt építménynél minden nyitott oldal üvegfal (vagy ajtó) lesz.
- **Vissza pergolára:** eddig az üvegfalak megmaradtak. Most a zárt építmény előtti oldalak (pl. bal oldali zip) helyreállnak. Ehhez a konfiguráció megjegyzi az eredeti oldalakat (`openSides`, csak zárt építménynél; a megosztó linkbe is bekerül, `o….` jelző). A tetőtípus szándékosan marad, amit a vevő a zárt építményhez választott.
- **PDF az összegzésben:** az Összegzés lépés tetején nagy „PDF összefoglaló letöltése” gomb (az árpanel gombja összecsukott panelnél nem látszott). A képmegosztás gombja alatta, visszafogottabb stílussal.
- **Fotóba helyezés:** új **Perspektíva** csúszka — a kamera távolságát és látószögét együtt állítja úgy, hogy a pergola látszó mérete nem változik, csak a rövidülés erőssége; így közelről, széles látószöggel készült fotóhoz is illeszthető, ami eddig forgatással nem ment. Az **Elforgatás** külön csúszkán is állítható (fokra pontosan), a gombok 15° helyett 5°-ot lépnek, a Shift/jobb gomb + húzás finomabb (0,25°/px). Régi mentett elhelyezés a csúszka alapértékével (1) töltődik be.
- Fájlok: `src/lib/buildings.ts`, `src/tenants/rules.ts`, `src/lib/shareCode.ts`, `src/types/pergola.ts`, `src/components/SummaryPanel.tsx`, `src/lib/photoPlacement.ts`, `src/components/PhotoRig.tsx`, `src/components/PhotoBar.tsx`; tesztek: `tests/buildings.test.ts`, `tests/photoPlacement.test.ts`.

## 3.82 – Színváltás átúsztatva, tetőtípus-váltás animálva

- **Szín:** új szín választásakor a szerkezet (és kéttónusú kivitelnél a tető) 0,6 s alatt átúszik az új színbe, nem ugrik. Fa hatású színnél (más felület/textúra) és csökkentett mozgásnál azonnali a váltás. A közös, gyorsítótárazott anyagok nem változnak: az átmenet idejére a célszín anyagának másolata dolgozik, a végén a modell a közös anyagra vált.
- **Tető:** tetőtípus-váltásnál a régi tető a tetőszint közepe felé összehúzódik és eltűnik, az új kissé felülről, enyhe túllendüléssel ereszkedik a helyére (0,55 s). Az árnyék közben frissül. Első betöltéskor nincs animáció.
- Fájl: `src/components/PergolaScene.tsx` (`useColorFade`, `RoofSwap`, `getCoat` átmeneti kulcs).

## 3.81 – Eső: filmszerű zárás, látható eső, borult fény

- **Esőbemutató:** ha a vevő nyitott forgólamellás tetőnél (esőérzékelővel) bekapcsolja az esőt, a lamellák nem kapcsolnak át egy pillanat alatt. A kamera a hajtásoldalra közelít, a hajtás burkolata felemelkedik és a motor–hajtórúd kiemelést kap (mint a Működés-bemutatóban), a lamellák egy valós hajtás tempójában (max. 30°/s, a végén lassulva) zárnak, majd a kamera visszatér a nézetbe és a burkolat visszaereszkedik. Kb. 7 másodperc; a zárás csak a kamera megérkezése után indul. Eső után a lamellák ugyanilyen lassan nyílnak vissza.
- **Nem fut a bemutató**, ha a lamellák már (majdnem) zárva vannak, kanapé-, fotó-, árnyékelemző- vagy Működés-módban, tolótetőnél, vagy ha a rendszer csökkentett mozgást kér; ilyenkor a tető a régi módon zár.
- **Eső rendereléshiba javítva:** az eső akadozott, mert a 30 fps-es szűrő a kihagyott képkockákon nem kért újrarajzolást (igény szerinti renderelésnél megállt). Most minden képkockán a valós eltelt időből lép.
- **Látható eső:** a cseppek pontok helyett rövid, enyhén szélsodorta csíkok, kétszeres darabszámmal, világos aljjal és halványuló tetejével; több és erősebb csobbanás a talajon.
- **Borult fény:** esőben a nap fénye, az égbolt és az expozíció átúsztatva tompul (nem ugrik), eső után ugyanígy derül vissza.
- Fájlok: `src/components/PergolaScene.tsx` (Rain, WeatherMood, esőbemutató fázisok), `src/components/LouvreRoof.tsx` (`reveal`, `slow`, `rain` paraméterek).

## 3.80 – Eszközök panel a jobb szélen, összecsukott árpanelnél is

- **Mi volt a baj:** ha az árpanel össze volt csukva, az Eszközök gomb a jobb szélre ugrott, de a lenyíló panel ott maradt, ahol az árpanel volt, vagyis a képernyő közepén, és kitakarta a 3D modellt.
- **Javítás:** összecsukott árpanelnél a panel is a jobb szélhez igazodik, közvetlenül a gomb alá (`src/index.css`). Nyitott árpanelnél és mobilon nem változott.

## 3.79 – Automatikus utánkövetés: a rendszer dolgozik a gyártó helyett

- **Mi a baj, amit old:** a legtöbb érdeklődő a csendben vész el — a gyártó nem ér rá visszahívni, a vevő elfelejti. Eddig az admin „Ma teendő” listája jelezte, de csak annak, aki benézett.
- **Vevői emlékeztető (3 nap):** ha a lead 3 nap után még „Új” vagy „Kapcsolatba léptünk”, a vevő **egyetlen** e-mailt kap: a saját 3D-tervének linkje, az irányár, és egy **„Időpontot kérek”** gomb (előre kitöltött e-mail a gyártónak a lead azonosítójával), telefonszám mellé. A levél kimondja, hogy több emlékeztető nem jön.
- **Gyártói jelzés (7 nap):** ha a lead egy hét után még mindig „Új”, a gyártói címzettek összesítőt kapnak a válasz nélkül maradt érdeklődőkről: név, település, irányár, lead-pontszám, hány napja vár, kattintható telefonszám, link az adminba. Érdeklődőnként egyszer.
- **Hogyan fut:** napi Vercel cron (`vercel.json` → `GET /api/followup`, 07:00 UTC), a `CRON_SECRET` környezeti változóval védve (a Vercel automatikusan küldi; nélküle a végpont nem fut). `?dry=1` próbafutás: felmér, nem ír és nem küld. Dupla küldés ellen a lead előbb „lefoglalódik” (dátumoszlop csak üresre írható), és csak utána megy a levél. Bevezetéskor a 14 (vevő), illetve 28 (gyártó) napnál régebbi leadeket nem keresi meg.
- **Kikapcsolható:** admin → Beállítások → Érdeklődők fogadása → „Automatikus utánkövetés” (alapból bekapcsolva, tenantonként).
- **Admin:** a lead részletpanelének előzményeiben látszik, mikor ment ki a vevői emlékeztető és a gyártói jelzés.
- **Adatbázis:** `supabase/leads.sql` két új oszlop: `followup_sent_at`, `reminder_sent_at` (`alter table … add column if not exists`). Amíg nincs lefuttatva, a cron hibát jelez a naplóban, a többi funkció változatlanul működik.

## 3.78 – Lead-pontozás: forró, meleg, hideg érdeklődők

- **Mi a baj, amit old:** a gyártó eddig csak nevet, települést és irányárat látott, és érkezési sorrendben hívott. A valódi szándék jelei (letöltötte-e a PDF-et, megnézte-e AR-ban, visszajött-e másnap) elvesztek.
- **Viselkedési jelek a kérelemmel:** a konfigurátor a böngészőben (munkamenet-tár) jegyzi, hogy a vevő letöltött-e PDF-et, nyitott-e AR-nézetet, megosztott-e tervet (link, szöveg vagy kép), mentett-e változatot, hány lépést járt be, hányadik látogatása ez és hány percet tervezett. Semmi nem megy ki közben: a jelek csak a felmérési kérelemmel, a hozzájárulás pipájával kerülnek elküldésre (`engagement` mező, a szerver sémával ellenőrzi).
- **Pontszám 0–100** (`src/lib/leadScore.ts`, tiszta függvény): PDF +20, visszatérő látogató +15, AR +15, megosztás +10, minden lépés bejárva +10 (többsége +5), mentés +5, 5+ perc +5; részletes megjegyzés +10 (rövid +5), pontos cím +5; 4 M Ft feletti terv +10 (2 M felett +5). **Forró** 55-től, **Meleg** 30-tól, alatta **Hideg**. Régi leadeknél (nincs jel) a pont csak az űrlapból jön, és az admin jelzi, hogy nincs viselkedési adat.
- **Admin:** a táblában és a kanban-kártyán a név mellett jelzés („Forró · 85”), a részletpanelen „Mennyire komoly az érdeklődés?” sáv az indokokkal, a toolbaron **Forró elöl** rendezés (megjegyzett beállítás), a CSV-ben Pontszám és Érdeklődés oszlop. A gyártói e-mail első sora is a besorolás az indokokkal.
- **Mérés:** három új névtelen esemény a napi számlálókban: `pdf`, `ar`, `share`.
- **Adatbázis:** `supabase/leads.sql` új `engagement jsonb` oszlop (`alter table … add column if not exists`). Ha a gyártó még nem futtatta, a szerver a leadet a jelek nélkül menti, az admin lista pedig a jelek nélkül töltődik — érdeklődő nem vész el.

## 3.77 – Eszközök menü a 3D felett

- A 3D feletti sáv eddig hat ikonos gombot sorakoztatott (Eső, Fotó, Árnyék, Nézet, Működés, AR), mobilon felirat nélkül. Mostantól három marad: **Eső** (gyors kapcsoló), **AR** (a leginkább konverziós funkció) és az **Eszközök** menü.
- Az Eszközök menüben névvel és egy soros magyarázattal: Nézet és vizualizáció · Árnyékelemzés · Fotóba helyezés · Működés-bemutató (lamellás tetőn) · Robbantott nézet · Költségkeret-tervező · Üzemeltetési költség · Tanácsadó. A bekapcsolt eszköz jelölve; a gomb kiemelve, amíg bármelyik aktív.
- Ezzel a vevő alap útja (hat lépés, ár, PDF, megosztás, AR) és a szakértői eszközök szétválnak: kevesebb ikon, több név.

## 3.76 – Lépések átrendezése: kiegyensúlyozott hat lépés

- **Új sorrend:** Típus → Méret → Tető → Szín → Extrák → Összegzés. Eddig az 1. lépés hét döntést sűrített (típus, csomag, tető, üveg, méret, modul, dőlés, bútor – 35 gomb), a 2. lépés egyet (rögzítés).
- **Típus:** csak a „mit építesz” döntés, a kiinduló csomagok és a tanácsadó. **Méret:** méretek, modulok, tetődőlés és a rögzítés módja (a korábbi 2. lépés ide olvadt). **Tető:** a tetőrendszer, üvegtípus és lamellaszög/okos mód egy helyen (eddig az 1. és a 4. lépésben is választható volt), alatta az oldalak zárása. A Szín az oldalak után jön: az oldalzárás a geometriát változtatja, a szín csak a felületet.
- **Bútor a Nézet panelbe:** a berendezés a jelenet része (nem kerül az árba, sem a PDF tételei közé), ezért a 3D feletti „Nézet” gomb alá került, a környezet mellé.
- A lépés-azonosítók és a megosztó linkek változatlanok; a mentett piszkozatok működnek.

## 3.75 – Okos lamella: a lamellák a napot követik

- **Okos mód** a lamellás tetőn (a Lamellaszög csúszka alatt): bekapcsolva a lamellák mindig a legnagyobb nyitásszögre állnak, amelynél a közvetlen napfény még teljesen kint marad — a napszak és a napirány csúszkával, illetve az árnyékelemzés valós napállásával együtt mozognak. A számítás a gyári lamellaméretből (215,8 mm széles, 200 mm osztás) indul: szemből sütő nap → zárva (teljes árnyék); a ház felől / magasról jövő nap → akár 90°-ig nyitva, árnyékkal; napsütés nélkül → nyitva.
- A csúszka az okos módban a számított szöget mutatja; ha a vevő belenyúl, az okos mód kikapcsol. A működés-bemutató és az okos mód kizárják egymást. Csak látvány: az ár, a specifikáció és a megosztó link nem változik.

## 3.74 – PDF gomb asztalon, napállás a horizont felett, forgatás-tipp, régi linkek tesztje

- **PDF összefoglaló asztalon:** az árpanel alacsony (≤ 900 px) ablakban görgethető, és a PDF/Megosztás gombsor a panel alja alatt lógott ki — úgy tűnt, asztalon nincs PDF. A gombsor most a panel aljára tapad, mindig látszik.
- **Napállás:** 19:30–20:00 és 7:00 körül a nap gyakorlatilag a horizonton állt, a fény vízszintesen súrolt, az árnyék és a kontraszt eltűnt. A nap mostantól legalább ~12° magasan marad: hosszú, de látható árnyék.
- **Forgatás-tipp érintőképernyőn:** első megnyitáskor „Húzd a forgatáshoz” jelzés a jeleneten; az első érintésre (vagy 7 mp után) eltűnik, és nem jön vissza.
- **Megosztó linkek:** rögzített, korábban kiküldött minták (flag nélküli, RAL + kapcsolók, modulos, régi `#k=`) tesztje — ha a kódolás változik, a régi QR-kódok törése azonnal kiderül.

## 3.73 – Töltőképernyő valódi százalékkal, mobil nyitókép, kapcsolati cím beállításból

- **Töltőképernyő:** a százalék eddig a letöltés-számlálóból jött, ami hamar 99-re ugrott, és ott állt, amíg a ház és a környezet töltődött (akár 8–10 s „99%”). Most a tényleges szakaszokból áll össze (kód · eszközök · első képkocka · ház · díszítés), a felirat is követi: „Modell betöltése” → „Anyagok és környezet” → „Jelenet felépítése” → „Kész”.
- **Nyitóoldal telefonon:** a konfigurátor képernyőképe az első képernyőre, a címsor fölé kerül (eddig csak a szöveg látszott görgetés nélkül).
- **Kapcsolati e-mail:** a nyitóoldal, a GYIK és az adatkezelési oldal címe a `VITE_CONTACT_EMAIL` környezeti változóból jön (céges domain); nélküle a régi cím marad.

## 3.72 – Napirány csúszka

- **Nézet panel → Napirány (0–360°):** a nap járásának elforgatása a pergola körül, a napszak megtartásával. A vevő a saját teraszának tájolásához igazíthatja, merre essen az árnyék; az égbolt-kép napja és a vetett árnyék együtt fordul. 0° = az eddigi alap ív, tehát a megjelenés változatlan, amíg nem nyúlnak hozzá. Az árnyékelemzés (valós helyszín, dátum) alatt a csúszka nem látszik, ott a napállás számolt.
- A nap helyének számítása egy helyre került (`sunPosition`, `src/lib/lightBalance.ts`), teszttel.

## 3.71 – Kamera-keretezés: a széles pergola is belefér a képbe

- Az áttekintő nézetek (Kívülről, Elölről, Felülről) kameratávolsága a szerkezet befoglaló méretéből és a vászon tényleges oldalarányából számolódik (`src/lib/cameraFit.ts`): ha a pergola nem férne a képbe (modulos, széles kivitel vagy keskeny vászon), a kamera ugyanabból az irányból hátrébb áll. Kis pergolánál a megszokott beállás változatlan.
- A forgatás távolságkorlátja (eddig fix 24 m) a méret szerint nő, így a nagy pergola kézzel is kiforgatható a teljes látványra.

## 3.70 – Egységes bútorválasztó

- A „Használati csomagok” külön szekció megszűnt: minden elrendezés egy „Mit szeretnél alatta?” választóban van, használat szerint négy csoportba rendezve (Otthon és pihenés · Konyha és étkezés · Wellness · Vendéglátás és rendezvény), az „Üresen” a végén.
- Új kártyák: ikon, név, létszám; a kiválasztott kártya kiemelve. Telefonon is két oszlopban, vízszintes túllógás nélkül; `prefers-reduced-motion` mellett átmenet nélkül.
- Teszt: a csoportok pontosan egyszer tartalmazzák az összes csomagot.

## 3.69 – Vegyes terasz, visszavonás és típusváltás javítása

- **Vegyes terasz csomag** (1. lépés → Használati csomagok): nagy pergolán nem ismétlődik ugyanaz egymás mellett. A zónák váltakoznak (pihenő → étkező → bisztró-asztal → tükrözött pihenő), elég mélységnél hátsó bárpult bárszékekkel, 3 sorig. A „Bár + lounge" is váltakozó zónákat használ.
- **Pihenősarok és Pihenő + étkező** nem sokszorozódik többé nagy pergolán (korábban 3 egyforma kanapé és asztal került egymás mellé); nagy terasznál a Vegyes terasz a javasolt.
- **Kanapé-nézet:** vegyes elrendezésnél a kamera az első pihenő-zónához ül.
- **Hiba: a Visszavonás kihagyott lépéseket** (a history módosítása a setState updaterében futott). Most tiszta; a Ctrl+Z/Y és a gombok ugyanazt a lépést adják.
- **Hiba: egy csúszkahúzás kiürítette a 40 lépéses előzményt.** A gyors, azonos folyamatos mezőre (szélesség, mélység, magasság, dőlés) eső változtatások egy visszavonási lépés.
- **Hiba: Pergola → Veranda/Télikert → vissza Pergola** nem hozta vissza a tetőt, az oldalfalakat és a dőlést. Most visszajön (a közben kézzel módosított oldalak megmaradnak).
- **Hiba: tetőváltás oda-vissza elvesztette** az üvegezést, árnyékolót, napelemet és tetőszínt. Mostantól tetőnként megmaradnak.
- Tesztek: `mixedPack` (átfedés, kilógás, szomszéd-egyformaság 10 méreten), `roofRoundtrip` (minden tetőpár, link).

## 3.68 – Használati csomagok: éttermi terasz, nyári konyha, bankett, bár + lounge

- **Öt új csomag** (1. lépés → Használati csomagok): Nyári konyha, Nyári konyha + étkező, Éttermi terasz, Bankett / rendezvény, Bár + lounge. A bútorcsomagokkal szemben ezek a pergola méretéhez igazodnak: a konyhasor a hátsó fal mentén fut (hűtő, grill, mosogató, munkafelületek; elég mély pergolán szigetpult bárszékekkel), az étterem 4 fős asztalokat rácsban, a bankett hosszú asztalokat (60 cm-es ülésosztás) sorokban rak le, közlekedősávokkal.
- **Kapacitás:** a kiválasztó kiírja az ülőhelyek számát és a m²/fő értéket a vendéglátós irányértékkel együtt (átszámított nemzetközi tervezési ajánlás: étterem kb. 1,1–1,4, szálloda 1,4–1,7, bankett 0,9–1,0 m²/fő). A létszám tervezési irányszám; a megengedett vendéglétszámot a helyi előírások határozzák meg (ezt a felület is kiírja).
- **Technikai:** a logika tiszta számítás (`src/lib/usePacks.ts`), tesztelt (`tests/usePacks.test.ts`); a székek egyszerűsített, 3 hálós változatból épülnek, hogy a nagy terasz is gyors maradjon. A csomagok fix tájolásúak (a konyha mindig a hátsó falnál). Új függőség nincs.
- **Korlát:** a konyhasor moduljai (hűtő, grill, mosogató) a 3D-ben jelképes formák, nem gyártói termékek. Oldalfalas (üvegfalas) pergolánál a falak helyét az elrendezés még nem veszi figyelembe.

## 3.67 – Alapnézet (aranyóra, ház nélkül), nappali fény magas/ultra szinten, nagy pergolák berendezése

- **Alapnézet:** a konfigurátor aranyórával és „csak a pergola” környezettel indul (nincs ház, kert, szomszédság: gyorsabb első betöltés, szebb árnyékok). A „Családi ház” és a nappal továbbra is választható a Nézet panelen.
- **Nappali fény (magas és ultra szint):** a kiégett, „kimosódott” hatást az utófeldolgozás bloom-ja okozta, ez csak magas/ultra szinten fut; nappal a bloom küszöbe magasabb, az intenzitása a felére esett. A közepes szint és az éjszakai/aranyóra megjelenés változatlan. Valós ultra-gépen ellenőrizendő, szükség esetén tovább finomítható.
- **Nagy pergolák berendezése:** a bútorcsomag (pihenősarok, étkezők, bisztró, napozó, kombinált) a rendelkezésre álló helyen rácsban ismétlődik, legfeljebb 12 példányig; a jacuzzi és a bár egyedi marad. A kiválasztó kiírja, hány csomag fér el és kb. hány főre (becsült létszám). Teszt: `tests/furnitureLayout.test.ts`.

## 3.66 – Modulos pergola: 1–4 összekapcsolt mező közös oszlopokkal

- **Modulok** (1. lépés → Modulok, csak ha a gyártó kínálja: `limits.maxModules`, a demónál 4): több mező egymás mellett közös oszlopsorral és gerendával – hosszú teraszra, vendéglátó terekre. A szélesség-csúszka modulonként értendő (a gyártó mezőnkénti korlátján belül), a teljes szélesség a modulszorosa.
- **3D:** a mezőhatárokon közös oszlop (elöl mindig, hátul ha nincs házfal) és keresztgerenda; lamellás tetőnél mezőnként külön lamellasor, a hajtás címkéi csak a hajtásoldali mezőn. A méretcímke „2 × 500 cm” alakú. A 6 m feletti középoszlop-szabály mezőnként érvényes.
- **Ár:** ármátrixnál a mezőnkénti ár modulonként összeadódik (a gyártó árlistája egy mezőre szól); m²-árnál a teljes terület. Új tétel „Modulcsatlakozás · N mező”: a közös oszlopok az oszlop egységárán; a közös gerenda a szerkezeti árban.
- **Kimenetek:** specifikáció-kód (`-M2`…), anyaglista (összekapcsolt modulok sor, közös modul-oszlopok, modulgerenda), megosztó kód (`n2`–`n4`), műszaki rajz (az oszlopok automatikusan). A szerver ugyanezekből számol újra.
- **Korlát:** az oldalzárás (ZIP, üvegfal) továbbra is a teljes elülső/hátsó hosszon egy elemként szerepel; a modulonkénti oldalosztás később.

## 3.65 – Környezet kikapcsolása, vendéglátós bútorcsomagok

- **„Csak a pergola” környezet** (Nézet panel → Környezet): a családi ház, a kert és a szomszédság helyett semleges, világos stúdió – csak a padló és (fali, sarok- vagy fülkés rögzítésnél) egy egyszerű vakolt falszakasz. Vendéglátós, ipari vagy katalógus-bemutatóhoz, és tisztább termékfotóhoz a PDF-be. Gyorsabb is: a 3,4 MB-os ház-modell ilyenkor nem töltődik be. Éjjel sötét háttérrel.
- **Új bútorcsomagok** a „Mit szeretnél alatta?” választóban: **Bisztró** (két kerek asztal 2–2 székkel, 4 fő), **Kültéri bár** (220 cm-es pult 4 bárszékkel) és **Napozó** (két nyugágy kisasztallal). A helyigény-ellenőrzés, a méretjavaslat és a kanapé-nézet mindhárommal működik.
- A `ground` jelenet-beállítás eddig nem volt használatban; most `terrace` (ház) és `studio` értéke van.

## 3.64 – Napsütéses fényarány: látható lamellacsíkok

- **Fény:** a nappali és aranyórás jelenetben a direkt nap most kb. 4–14-szer erősebb (reggel/este kevésbé, délben jobban) az égbolt szórt fényénél (korábban ≈1,4×). Az árnyékok eddig is kiszámolódtak, de az erős HDR-égbolt fénye szinte kitöltötte őket, ezért a kép borúsnak hatott. Most a lamellák csíkos árnyéka jól látszik a teraszon és a házfalon, a pergola árnyéka a homlokzatra vetül.
- Az arány egy helyen állítható (`src/lib/lightBalance.ts`), az árnyékelemzés ugyanezt használja; napnyugta után és éjjel változatlan.
- Az égboltfény csökkenését nagyobb nappali expozíció (0,86 → 0,96, aranyórában 0,90) ellensúlyozza.

## 3.63 – Admin: saját terméknevek és gyártható méretek

- **Tetőrendszerek:** minden tetőtípushoz a gyártó saját terméknevet és rövid leírást adhat meg (fehér címke) – a konfigurátor, a PDF és az ajánlat ezt mutatja; üres mező esetén az alapnév marad.
- **Gyártható méretek:** szélesség/mélység/magasság min–max (m) és a fűtőpanelek maximuma az adminban állítható; a konfigurátor csúszkái és a megosztott linkek is ezen belül maradnak. Hibás tartomány (min ≥ max) mentés előtt elutasítva.
- A nyitóoldali GYIK ennek megfelelően pontosítva (a színkatalógus továbbra is induláskor, általunk).

## 3.62 – Gyorsabb ultra szint, igazságosabb minőség-védőháló

- **Védőháló:** a „túl lassú → alacsonyabb szint” döntés eddig örökre a böngészőben maradt (egy háttérbe tett fül vagy egy rövid akadás után is). Most 6 óra után lejár, a `?quality=` URL-paraméter felülírja, és csak 30 fps alatt, három egymást követő mérési ablakban (≈5 s) lép életbe (eddig 38 fps alatt, kettőben).
- **Ultra szint olcsóbban, azonos látvánnyal:** fél felbontású, mélységtudatosan felskálázott AO (eddig teljes felbontás), 16 AO-minta (24), 4× MSAA (8×), max. 1,65× renderfelbontás (1,8×). Retina kijelzőn ez a képpontok ~20%-át és az AO költségének ~70%-át takarítja meg.

## 3.61 – Ajtó nyitásirány, tetőválasztás a 4. lépésben, 3D-feliratok kapcsoló

- **Ajtó nyitási iránya:** nyíló és tolóajtós oldalnál új gomb „Nyitás a másik oldalra” – a zsanér/tolószárny a másik sarokba kerül. 3D-ben, a műszaki rajzon (homlokzat és alaprajz, nyitási ív) és a megosztó kódban (`m` jelző) is.
- **Javítás:** a nyíló ajtó belenyílt a dézsás növénybe – ajtós oldal mellett a dézsa kijjebb kerül.
- **4. lépés (Oldalak):** a tető mezőnél a tetőtípus és az üveg/polikarbonát burkolat is átváltható, nem csak a lamellaszög (eddig vissza kellett lépni az 1. lépésre).
- **Nézet panel:** „Feliratok a 3D-ben” kapcsoló – a kattintási tippek és a Működés-címkék bemutatóhoz elrejthetők.

## 3.60 – Fotorealisztikusabb jelenet: valódi égbolt, PBR gyep, kontrasztos fény

- **Égbolt:** éles (nem elmosott) „pure sky” HDR-ek: nappal felhős-kék ég látható nappal, aranyórában naplemente (`sunset_sky`), éjjel csillagos ég holddal (`night_sky`). Az ég úgy fordul, hogy a látható nap mindig a vetett árnyék irányában áll – minden módban, nem csak az árnyékelemzésben.
- **Gyep:** magas/ultra szinten PBR fűtextúra normál- és érdességtérképpel, nagyléptékű foltos tónusvariációval (nincs látható ismétlődés); alacsony/közepes szinten marad az azonnal betöltődő beágyazott fű.
- **Fény:** erősebb direkt napfény, visszafogottabb szórt fény – mélyebb, plasztikusabb árnyékok; ultrán 4K árnyéktérkép.
- **Kamera:** a nézetváltás és a „Működés” közeli kamera valós időalapú – lassabb gépen is 1–2 s alatt ér célba (korábban képkocka-alapú volt, gyenge GPU-n 10–20 s-ig úszott).
- **Működés:** a hajtás címkéi csak közelről jelennek meg (távolról egymásra csúsztak).
- **Javítás:** veranda/télikert választásakor (fali rögzítésnél) az oldalfókusz kamerája a ház homlokzatába és a fa lombjába került – most a nyitott oldal felé mozdul.
- **Betöltés:** a poszter legfeljebb 8 s-ig vár a díszítőelemekre (korábban 25 s), a pergola előbb látszik; a fa és a talaj/terasz textúrái veszteséges WebP-re tömörítve (fa: 2,3 MB → 1,0 MB; fű 1,2 MB → 0,6 MB), a megjelenés változatlan.

## 3.59 – Valós lamellarendszer és „Működés” bemutató a konfigurátor 3D-jében

- **Forgólamellás tető valós geometriával:** 215,8 × 39,8 mm vízcsatornás lamellaprofil, 200 mm osztás, 0–110° forgás, ≤4 m-es modulok osztógerendával, R115 hajtókar, lineáris motor (732→913 mm) – minden a megadott méretből számolva (`src/lib/louvreSystem.ts`, tesztekkel). A publikus SB 400 műszaki adatok szerint; partnergyártónként a saját profilra cserélhető.
- **„Működés” gomb** a jelenet-sávban (lamellás tetőnél): a hajtás mozgásban – motor, hajtórúd, karok zöld kiemeléssel és címkékkel, hajtásoldali közeli kamera; mellette panel élő értékekkel (lamellaszög, nyitott felület, lamellaköz, motorhossz), vázlattal, szünet/lejátszás gombbal. A panel és a 3D ugyanabból az órából számol.
- A tető-beállításoknál „Nézd meg működés közben” gomb.

## 3.58 – Működésbemutató a nyitóoldalon

- Új szekció („04 – Működés élőben”) a B2B nyitóoldalon: az SB 400 lamellás pergola interaktív működésbemutatója (lineáris motor, hajtórúd, lamellák) önálló, izolált modulként (`public/demo/sb400-live.html`, iframe). A szimulátor tartalma változatlan.
- Terhelés-kímélő: csak akkor tölt, ha a látogató közel görgetett, távolodáskor felszabadul; alapból nem fogja el a görgetést (kattintásra kapcsol interaktívra), teljes képernyő gombbal és külön megnyitható oldallal.
- A szekció jelzi, hogy egyedi működésbemutató modul a gyártó termékéből külön ajánlat alapján készül. A bemutató oldal nem indexelhető (`X-Robots-Tag`, robots.txt). Az utána következő szekciók számozása eggyel nőtt.

## 3.57 – SEO, pozicionálás, pontosabb megnevezések

- **SEO:** a build mostantól mindig generál `robots.txt`-t és `sitemap.xml`-t (a `PUBLIC_SITE_URL` hiányában a Vercel éles címére esik vissza, korábban env nélkül a sitemap kimaradt). A fő oldalak (`/`, `/en`, `/minta`, `/konfigurator`, `/adatkezeles`) előre kitöltött címet, leírást, canonical/hreflang, Open Graph/Twitter és strukturált adatot kapnak a statikus HTML-ben, így a közösségi előnézet és a keresők JavaScript nélkül is a helyes oldalt látják.
- **/minta és /konfigurator:** „Élő termékbemutató – minta konfigurátor” pozicionálás látható sávval; a strukturált adat már nem szolgáltatásként (pergola-tervezés és kivitelezés) írja le az oldalt, a Lamelix márkája egységes.
- **Statisztika:** az admin „Eseményszámok és becsült konverzió” néven jelzi, hogy az arányok közelítők (az események nem kapcsolódnak egyedi látogatói úthoz).
- **Anyaglista:** a 3D-specifikáció alatt jelzés: tájékoztató, szabályalapú becslés, nem gyártási dokumentáció. Gyártási lista, CNC- vagy ERP-export nem szerepel az ígéretek között.

## 3.56 – Admin prémium szint, adatvédelem, pontosított ígéretek

- **Admin:** demó adatmód (28 valósághű, kitalált érdeklődő, trend és tölcsér; a demó gyártónál automatikusan, amíg nincs valódi adat), számfelfutás, fényfolt a kártyákon, lépcsőzetes belépő animációk, fülváltás-áttűnés.
- **Érdeklődők:** kanban tábla húzással (Új → Kapcsolatba léptünk → Ajánlat kiment → Megnyert/Elveszett), tábla/kanban váltó, bővített részletpanel (felülnézeti vázlat, előzmények, kész e-mail-sablon).
- **Áttekintés:** „Ma teendő” lista hívógombbal, értékesítési csatorna súlyozott várható bevétellel (a lezárási esélyek becslések), induló lista folyamatjelzővel, PDF-jelentés.
- **Gyorskereső (Ctrl/Cmd + K)**, értesítések, élő új-érdeklődő jelzés (éles módban percenkénti frissítés), új **Beágyazás** fül (iframe-kód, link, QR, magasság, élő előnézet).
- **Adatvédelem:** új `/adatkezeles` tájékoztató oldal; a demókérés tárolja a hozzájárulás időpontját és a tájékoztató verzióját (`supabase/demo_requests.sql`: futtasd újra az `alter table` sorokat); az éles gyártó leadjét a szerver elutasítja valós https adatkezelési cím nélkül; a demó gyártó a saját oldalunkra mutat.
- **Pontosított ígéretek:** a GYIK már nem állítja, hogy a méretkorlát és a színkatalógus adminból állítható (nem az; induláskor mi állítjuk be). A Partnerhálózat csomag szövege jelzi, hogy egyedi kiépítésű és külön ajánlat alapján készül; a csomagszintű jogosultságkezelés, önkiszolgáló regisztráció és automatikus számlázás nincs megvalósítva.

## 3.55 – Nyitóoldal (B2B) bevezető szövegének újraírása

- A gyártóknak szóló nyitóoldal bevezetője (HU és EN) és a JavaScript nélküli tartalék szöveg: a vásárló megtervezi, a gyártó megkapja a kész, beárazott ajánlatkérést. Egységes megszólítás (Önök), veranda is szerepel, „irányár” a pontos kifejezés.

## 3.54 – A nyíló ajtó kifelé nyílik

- A nyíló teraszajtó mostantól kifelé nyílik (3D-ben és a műszaki rajz alaprajzi nyitási ívén is), így nem fut bele a kanapéba vagy a berendezésbe. 3D-ben mérésekkel ellenőrizve: nyitott állapotban a szárny a pergola alapterületén kívülre kerül.

## 3.53 – Audit: táblagép-elrendezés

- 821–1180 px között a cím nem ütközik az eszköztárral, a fejléc nem csordul túl, a kamera-eszköztár ikonos lesz, a „Kezdőlap” link nem lóg rá az eszköztárra.
- Audit eredménye: 2000 véletlen konfiguráció (normalizálás, ár, megosztó link oda-vissza, energia) hibátlan; 24 véletlen jelenet és 24 útvonal×3 szélesség konzolhiba és vízszintes túlcsordulás nélkül.

## 3.52 – A ház mérete független a tető dőlésétől

- A 3D ház léptéke már nem függ a tetődőléstől: 0°–12° között a ház mérete azonos marad, a pergola hátsó (fali) éle emelkedik a homlokzaton.
- Az oldalszárny magassága csak a dőlés felével növekszik, így nem nő aránytalanul.

## 3.51 – Ajtók, klíma, üvegtető-típusok, hibajavítások

- **Tolóajtó**: a szárny csukva is a fal közepén állt (az animáció felülírta a kiindulási helyét), nyitáskor kilógott. Most a fal végén áll csukva, a fix tábla mögé csúszik, a falszakaszon belül marad.
- **Nyíló ajtó**: a zsanér a fix tábla felőli oldalon van, minden oldalon befelé nyílik, nem csapódik az oldalfalhoz. A mozgás és a fényfolt oldalanként számolt iránnyal fut. A műszaki rajz (alaprajz, homlokzat) ugyanezt mutatja; a szárnyméret közös (`doorLeafWidth`).
- **Klíma**: mennyezeti kazettás beltéri egység a tető alatt (nem a házfalra/üvegajtóra szerelve), négy terelőlappal és négyirányú légáramlással; a kültéri egység betonlapon, a háznál, távolabb a növényektől. A mennyezeti ventilátorokat elkerüli, dőlt tetőt követ.
- **Tetőtípus csak az 1. lépésben** választható; az Oldalak lépés tetőpanelje csak a lamellaállást mutatja, plusz hivatkozás az 1. lépéshez.
- **Üveg típusa** (üveg- és polikarbonát tetőnél): tiszta, matt, opál (új felárral üvegtetőn), hővisszaverő, füstös (új). Fény- és hőáteresztési tájékoztató értékekkel, 3D anyaggal, árral, linkkel, PDF-fel. Tetőválasztáskor a lista a burkolathoz görget.
- **Új figyelmeztetések**: túl rövid falszakasz ajtónak; tiszta/matt/opál üvegtető árnyékoló nélkül (nyári felmelegedés); télikert alapozás nélkül.
- **Üzemeltetési költség**: a split klíma és a padlófűtés is bekerül az éves áramfogyasztásba.
- **Kiinduló csomagok** a kiválasztott építménytípushoz illők (télikertnél nem a pergola „Alap/Komfort").
- Teszt: `?arDebug=1` mellett a `__pergolaBoxes(név)` a nevesített objektumok (ajtószárny, klíma) világkoordinátás dobozát adja.

## 3.50 – Marketing szövegek: pergola, veranda, télikert

- Nyitóoldal (`/minta`): hero felirat, bekezdés, CTA, bevezető (pergola/veranda/télikert különbség), címkék, alt/aria szövegek, GYIK-cím, záró CTA. Stílus és layout változatlan.
- GYIK: 3 új kérdés (típusok különbsége, fűtés/hűtés, engedély verandához/télikerthez) – a FAQPage structured data-ba is bekerül.
- SEO: title és description minden indexelhető oldalon (HU/EN), structured data, noscript szöveg.
- B2B oldal (HU/EN): hero, ár-szöveg, lábléc, demókérő űrlap új „Veranda / télikert" termékopcióval (szerver is elfogadja).

## 3.27 – B2B oldal: funkciók, idővonal, megtérülés-kalkulátor, GYIK, lektorálás (2026. 11. 05.)

- Új „Funkciók” blokk: AR-nézet, fotóba helyezés, árnyékelemzés, költségkeret-tervező, tanácsadó, esti hangulat, energia, PDF – élő CSS-illusztrációkkal.
- „Működés”: idővonal négy kártyával (mini-animációk, ütemezés munkanapokban), mobilon függőleges.
- Árak: „Minden csomagban” sáv, átrendezett csomagok (ármátrix a Startban is; Partnerhálózat: több márka, viszonteladók, Lamelix-jelzés nélkül), interaktív megtérülés-kalkulátor (`estimateRoi`).
- GYIK: kétoszlopos, animált lenyitás, 8 kérdés.
- Teljes szöveglektorálás: magázás következetesen, gondolatjel (–), áfa, „lead” helyett ajánlatkérés/érdeklődő; SEO-címek és szerverüzenetek is.

## 3.22 — Gyártói admin: modern felület, lead nézet, konverziómérés (2026. 11. 04.)

- Gyártói admin (`/k/{gyarto}/admin`): belépés tenant-jelszóval, beállítások, árak, ármátrix, ki/be kapcsolók, lead-címzettek.
- Áttekintés: KPI-k, napi grafikon, státuszmegoszlás, népszerű tetők, települések, legfrissebb érdeklődők.
- Érdeklődők: szűrés státusz szerint + keresés, egykattintásos státusz, hívás/e-mail link és másolás, konfiguráció link + QR, belső megjegyzés, CSV export.
- Névtelen konverziómérés (süti és azonosító nélkül, DNT-tisztelő): megnyitás → tervezés → űrlap látva → kitöltés indult → felmérési kérés; tölcsér az Áttekintésben.
- Demó belépés: a `demo` admin jelszava alapértelmezetten `1111`, amíg nincs `ADMIN_PASSWORD_DEMO` beállítva (csak a demo tenantra; másik gyártóhoz mindig saját jelszó kell). A token aláírása: `ADMIN_TOKEN_SECRET`, ennek hiányában a Supabase service key, végső esetben egy demó-kulcs (csak demóra érvényes).
- Új Supabase teendők: `supabase/events.sql`, és a meglévő `leads` táblához `alter table … add column owner_note` (lásd `supabase/leads.sql`).

## 3.21 – Visszavonva

- A mozgás közbeni utófeldolgozás-szüneteltetés (regress + automatikus lépcsőzés) rontotta a képet forgatáskor (szétesett/eltűnt a kép), ezért teljesen visszacsináltuk a 3.20 állapotra.

## 3.20 — Lamellák instanced meshben, teljesítménymérő (2026. 10. 31.)

- **Lamellák:** a penge, az alsó tömítősáv és a két végi csapágybetét 1-1 `InstancedMesh`. Korábban lamellánként 4 külön mesh és anyag volt
  (5 × 4 m-es tetőnél 18 lamella ≈ 72 draw call); most 3 az egész tetőre, azaz kb. 70 draw call-lal kevesebb. A kinézet és az animáció
  (hullámos indulás, csillapított dőlés, eltolható tetőnél összetolódás) változatlan; az előtte/utána render azonos.
- **A lamellaprofil finomsága** a minőségi szinthez kötött (`louvreSegments`: 6 / 8 / 12 / 16).
- **AR-export:** az `InstancedMesh` példányait önálló hálókra bontja (a Quick Look és a Scene Viewer nem ismeri az instancing kiterjesztést).
- **Teljesítménymérő:** `?debug=1` → draw call, háromszög, textúra, geometria és fps a sarokban (`window.__perf` is). Mért alap
  (medium, 5 × 4 m): 224 draw call, ~557 ezer háromszög. A háromszögszám magas; a forrásait (ház, fák, növények) a következő lépésben mérem fel.
- **Hiba javítva:** a `?quality=` paraméter és a mérő most a tényleges szintet mutatja.

## 3.19 — Anyagok első köre: teraszburkolat egy hálóban, minőséghez kötött anizotrópia (2026. 10. 31.)

- **Teraszburkolat:** a ~28 külön deszkamesh (és anyag) egyetlen egyesített hálóra cserélve: 1 draw call. Minden deszka egyedi
  UV-eltolást és enyhe színeltérést kap (vertex color, lineáris térben a korábbi tónusokhoz igazítva), a fuga alatt sötét alap ad mélységet.
- **Textúra-anizotrópia** a PBR textúrákon a minőségi szintből jön (low 2 / medium 4 / high 8 / ultra 16), nem fixen 8.
- **Porszórt alumínium váz:** metalness 0,12 → 0,5 (a roughness-térkép, a clearcoat és az envMap marad). A 0,7–0,9-es érték
  sötét antracitnál a HDR-től függően túl tükrözővé vagy fekete-foltossá tenné a felületet, ezért közepes értéket választottam.
- **Még hátra:** finom normál map a vázra, deszka AO a fugákban, lamellák geometriája, motorház és vízgyűjtő, ponyva textúra.

## 3.18 — Központi 3D-minőségkezelő (1. lépés a minőség/teljesítmény tervből) (2026. 10. 31.)

- **`src/lib/quality.ts`:** négy szint (low / medium / high / ultra), egyetlen igazságforrás az árnyéktérkép méretének, a renderfelbontásnak
  (dpr), az utófeldolgozásnak, a kontaktárnyék felbontásának, a textúrafelbontásnak, a lamellaszegmenseknek, az anizotrópiának,
  a növényzetnek és az esőcseppeknek. A jelenet komponensei `QualityContext`-en át olvassák.
- **Automatikus besorolás:** mobil és gyenge hardver → low/medium; szoftveres GPU → low; laptop → high; erős asztali gép → ultra.
  Felülírható a 3D-beállításokban (Automatikus / Ultra / Magas / Közepes / Alacsony) és a `?quality=low|medium|high|ultra` címparaméterrel;
  a `?effects=0` továbbra is kikapcsolja az utófeldolgozást. A régi „mobil” érték az „alacsony” szintnek felel meg.
- **Rákötve:** árnyéktérkép, dpr, kontaktárnyék, utófeldolgozás (csak high+), esőcseppek, extra fa (csak medium+).
- **Döntés:** a sebesség és a stabil fps az elsőbbség; az árnyéktérkép mérete nem nőtt (low/medium 1024, high/ultra 2048, mint eddig).
- **Még hátra (a terv következő lépései):** textúra-felbontás és anizotrópia kötése, lamellák, teraszdeszkák, motorház és vízgyűjtő, több növény.
- Tesztek: `tests/quality.test.ts` (106 teszt).

## 3.17 — Prémium főoldal saját 3D-renderekkel (2026. 10. 31.)

- A főoldal minden képe a saját 3D stúdióból készült (11 render, webp, 1920 és 960 px).
- Új: futószalag, számlálók, hero parallax, négy képes görgetett film, interaktív színváltó szekció, bento rács a stúdió
  funkcióiról, rajzolódó folyamatvonal, éjszakai záró jelenet, fejezet-index.
- Olvashatóság: a 6–9 px-es betűk 11–17 px-esek; a zavaró „AR-azonosító” szöveg eltűnt; mozgáscsökkentéshez külön statikus változat.

## 3.16 — Átrendezett, ismétlésmentes felépítés; téli nézet kivéve (2026. 10. 30.)

**Lépések most:** 1. **Pergola** (típus és méret) → 2. Rögzítés → 3. Szín (Pergola / A házad) → 4. Oldalak → 5. Extrák → 6. Összegzés.

- **A tetőtípus az 1. lépésbe került**, a méret mellé: ez a fő termékdöntés és árképző, eddig a 4. lépés felülnézetének
  középső mezője alá volt rejtve. Az 1. lépés sorrendje: Tanácsadó → Kiinduló csomagok → Tetőrendszer → Méretek → Bútor.
- **A kiinduló csomagok** a Rögzítésből az 1. lépésbe kerültek (ott indul a tervezés); a Rögzítés lépésben csak a rögzítés maradt.
- **Megszűnt ismétlés:**
  - a Tanácsadó kártya csak az 1. lépésben van (eddig a Rögzítésben is);
  - a lamellaszög-csúszka csak a tető mezőnél van (eddig a Méret lépésben is);
  - a napelem és a motoros árnyékoló csak az Extrák lépésben van (eddig a tető mezőnél is); a tető mező jelzi, hol találhatók;
  - az „Eső” kapcsoló csak a 3D eszköztáron van (eddig a Jelenet beállításokban is);
  - asztali nézetben a keret-tervező, az üzemeltetés és az ár-összetétel csak az árpanelen jelenik meg (az Összegzésben és
    az Extrákban mobilon, illetve összecsukott árpanelnél látszik).
- A tető mező az Oldalak lépésben: aktuális tető, mozgatás, „Tetőtípus módosítása” → 1. lépés.
- Azonos lépés- és szekciócímek helyett beszédes kérdések („Hogyan kapcsolódik a házhoz?”, „Melyik oldalt zárod?”).
- Az Összegzésben a használhatatlan „Következő” helyett **„Felmérést kérek”**, amely az űrlaphoz görget.
- **Téli nézet eltávolítva** (hó, havazás, téli panel, kopasz fák, havas háztető): kevesebb kód, gyorsabb betöltés.

## 3.15 — A házad a Szín lépésben (2026. 10. 30.)

- „A házad” (homlokzat anyaga és színe, nyílászárók) a Rögzítés lépésből a **Szín** lépésbe került, két fülre bontva:
  **Pergola** (porszórt szín, kéttónusú, RAL) és **A házad**. A fülek ragadósak görgetéskor, és mutatják
  az aktuális választást (pl. „Antracit · RAL 7016”, „Vörös · antracit ablak”).
- A Pergola fülön a ház egysoros összefoglalója és a „Igazítsd a nyílászárókhoz?” ajánlás; a sorra koppintva
  a ház fül nyílik. A ház fül alján „Tovább a pergola színéhez”. Fülváltáskor finom beúszás, a lap tetejéről indul.

## 3.14 — Motoros tetőárnyékoló üveg- és polikarbonát tetőhöz (2026. 10. 30.)

**Miért:** üvegtető alatt nyáron gyorsan meleg lesz — ez a vásárló első kérdése, és a gyártónak jó felár.

- **Csak üveg- (Lumen) és polikarbonát (Opal) tetőnél** jelenik meg, a Tető panelen (Oldalak lépés) és az
  Extrák lépés „Hő és légmozgás” részében. Más tetőnél, vagy tetőcserénél automatikusan elmarad.
- **Három választás:** árnyékoló nélkül / **tető feletti** (kívül, a napot még az üveg előtt fogja meg) /
  **tető alatti** (belül, védett, kedvezőbb). Mindegyiken a bruttó árkülönbség.
- **Ponyva színe:** fehér, homok, szürke, antracit.
- **3D:** kazetta a fal felőli végen, oldalsó vezetősínek (tető felettinél tartókon a bordázat fölött),
  végprofil; a ponyva **kihúzható/behúzható** gombbal vagy a 3D-ben kattintással, animálva. A ponyva árnyékot vet
  (az üveg nem), így az árnyékelemzésben is látszik a hatása; nappal alulról áttetsző.
- **Ár:** m²-enként, külön a tető feletti és tető alatti (demó: 52 000 / 38 000 Ft/m² nettó), a gyártói
  árbeállításokban szerkeszthető; a szerver is ezzel számol.
- **Mindenhol megjelenik:** tételes ár, megosztó link (`a`/`b` + ponyvaszín), konfigurációs kód (`-SA` / `-SB`),
  anyaglista, PDF tető-táblázat, gyártói e-mail, szöveges összegzés. Ha van szél-/esőszenzor vagy okosotthon,
  a panel jelzi, hogy automatikusan is vezérelhető.
- **Költségkeret-tervező:** előbb tető alattira vált (olcsóbb), csak utána hagyja el.
- **Javítás:** a tervező „minden extra nélkül” alsó becslése eddig a később hozzáadott opciókat is tartalmazhatta.

## 3.13 — A házad: homlokzat színe és nyílászárók (2026. 10. 30.)

**Miért:** a vásárló akkor dönt magabiztosan a pergola színéről, ha a saját házán látja. Eddig a
homlokzat anyaga csak a sarok-/fülkerögzítés oldalszárnyán változott, színt és nyílászárót nem lehetett állítani.

- **„A házad” panel a Rögzítés lépésben** (mindig látszik, nem csak L/U-rögzítésnél):
  - **Homlokzat:** Vakolt / Tégla / Fa — most már a **főépületen is**. Vakolt és tégla háznál a deszkaburkolat
    eltűnik, a sima falsíkok kapják az anyagot; fa háznál a valódi deszkák kapják a választott színt.
  - **Homlokzat színe** anyagonként a leggyakoribb árnyalatokkal (vakolat: fehér, törtfehér, homok, vanília, barack,
    szürke, kavics, grafit; tégla: vörös, barna, homok, antracit klinker, festett fehér; fa: natúr, vörösfenyő,
    sötét pác, szürkült, fekete) + **Egyedi** (színválasztó) + **Fotóról** (pipetta, a mért és egy „napfényben” világosított szín).
  - **Nyílászárók:** fehér, antracit, fekete, alumínium, barna, aranytölgy, dió — ablakok, teraszajtó, bejárati ajtó,
    tetőablak és az L/U-szárny ablakai egyszerre. Vakolt/tégla háznál az eresz- és tetőablak-szegély is ezt a színt kapja.
- **„Igazítsd a nyílászárókhoz?”** ajánlás: egy gombbal a pergola a nyílászárók színét kapja (antracit → RAL 7016,
  fehér → RAL 9016, aranytölgy → fa hatású aranytölgy …), a gyártó alapszínét felár nélkül. Ha már egyezik, megerősítés jelenik meg.
- **Szín lépés:** felül a ház egysoros összefoglalója („Vakolt homlokzat (törtfehér) · fehér nyílászárók”, Módosítás)
  és az igazítási ajánlás.
- **A gyártó is látja:** a felmérési kérelem e-mailjében „A háza (3D alapján)” sor, az adatbázisban a megjegyzésben;
  a PDF szerkezet-táblázatában „A ház (3D látvány)”.
- A beállítást a böngésző megjegyzi (gyártónként); az „Alaphelyzet” nem törli. Módosításkor a követő kamera
  az áttekintő nézetbe áll.
- **Javítás:** lépésváltáskor a beállítópanel a lépés tetejéről indul (eddig az előző lépés görgetési helyzete maradt).
- Technika: `src/lib/house.ts` (katalógus, összegzés, mentés), `src/components/houseMaterials.ts` (böngészőben
  generált tégla/fa/erezet textúrák, doboz-vetítéses UV, gyorsítótárazott anyagok), `src/components/HouseLook.tsx`.

## 3.12 — Prémium felhasználói élmény (2026. 10. 29.)

- **Olvasható tipográfia:** a kis feliratok 7–9 px helyett 11–13 px-esek, a fő szövegek 14–16 px;
  a beállítópanel 350 → 392 px, az árpanel 330 → 352 px széles, a felülnézeti oldalválasztó nagyobb.
- **Követő kamera:** a kamera a választáshoz fordul — oldal kiválasztásakor és oldaltípus-váltáskor
  az adott oldal elé (távolabbról, hogy a teljes pergola a képben maradjon), ventilátornál alulról;
  a Szín, Méret, Rögzítés és Extrák lépésben, illetve szín-, rögzítés- vagy tetőcserénél vissza az áttekintő nézetbe
  (akkor is, ha a kamera előtte egy oldalra fókuszált). LED vagy fűtés első bekapcsolásakor egyszer esti nézetre vált.
  Kikapcsolható („Követő kamera” a jelenetbeállításokban); kézi mozgatáskor azonnal átadja az irányítást.
- **Változás-jelző:** minden módosítás után 6 másodpercig lebegő címke a 3D felett
  („+654 000 Ft · Oldalkialakítás”) **Visszavonás** gombbal; mobilon finom rezgés; a mobil árcsík is pörgő árral.
- **Mobil alsó lap három állással** (kicsi / fél / teljes), a fejléccel húzható vagy koppintható.
  Fél állásban a 3D kép feljebb tolódik, hogy a pergola ne kerüljön a lap mögé.
- **Bemutató összegzés:** az Összegzésre lépve a kamera lassan körbefordul; nagy kép a tervről
  (automatikusan elkészül), a terv elnevezhető („Kovácsék terasza” — a PDF borítóján is),
  **„Kép küldése a családnak”**: márkázott 1080 × 1350-es kép a tervvel, színnel és árral —
  telefonon/tableten a megosztó menübe (WhatsApp, Messenger), asztali gépen letöltésként.
- **Ár-összetétel sáv:** szerkezet / oldalzárás / komfort / szín és napelem aránya az árpanelen és az összegzésben.
- **A/B összehasonlító csúszka:** a két mentett változat képe egymásra húzható.
- **Visszatérő látogató:** „Üdv újra! Ott folytatod, ahol abbahagytad” sáv, „Új terv” gombbal
  (a kamera-gombsor fölött, hogy ne takarja a felső eszközsort).
- **Berepülés:** a jelenet megjelenésekor a kamera magasról, drónszerűen érkezik a nézetbe.
- **Javítás:** a méretarány-felirat a kamera-gombsor fölé került (eddig takarta).
- **White-label javítás:** a betöltőképernyő a gyártó nevét mutatja (eddig fixen „ARDELIS”).

## 3.11 — Színválasztó: RAL katalógus, fa hatású bevonat, kéttónusú kivitel, szín a fotóról (2026. 10. 29.)

**Miért:** a vásárlók többsége nem tudja a RAL-kódokat, a gyártók viszont bármely RAL színre
porszórnak. Eddig csak 4 alapszín és egy szabad kódmező volt.

- **Katalógus (`src/lib/colors.ts`):** 91 szín magyar névvel — a pergolákhoz jellemző RAL Classic
  szürkék, fehérek, krémek, barnák, színesek, a DB 701/702/703 vascsillámos metálszínek, corten hatás,
  és 6 fa hatású (szublimációs) bevonat (dió, aranytölgy, antik tölgy, cseresznye, teak, szürke tölgy).
  Mindegyik képernyős közelítés; a felület ezt ki is mondja.
- **Keresés** névre, kódra, becenévre, ékezet nélkül is („homok”, „7021”, „grafit”, „dio”);
  csoportok (szürkék, fehér/krém, fekete, barnák, metál, fa hatású, színes); alapból a népszerűek.
- **Alapszín felismerése:** ha a katalógusból vagy kóddal olyan színt választanak, ami a gyártónál
  alapszín (pl. RAL 9016), az felár nélküli alapszín lesz. A gyártói alapszínekhez RAL-kód rendelhető (`ral`).
- **Kéttónusú kivitel** (alumínium tetőknél): külön szín a váznak és a lamelláknak/tetőnek
  (pl. antracit váz, fehér lamellák). Két alapszín párosítása felár nélküli; egyedi színnél a felár
  a szerkezeti ár felére számolódik részenként. Gyártónként kapcsolható (`twoTone`).
- **Szín a házadról:** fotón rábökve (9×9 képpont átlaga) a három legközelebbi katalógusszín
  (CIE Lab ΔE94) „nagyon közeli / közeli / hasonló” jelöléssel, egy koppintással alkalmazható.
  A kép csak a böngészőben marad. Ha már van fotós előnézet, azt használja.
- **Fa hatású bevonat a 3D-ben** erezett felülettel; kéttónusúnál a lamellák saját színnel.
- **Árazás:** egyedi szín +6%, fa hatású +18% (új, szerkeszthető `woodColorRate`), a tételes árban
  névvel és kóddal („Egyedi szín · Feketésszürke (RAL 7021)”).
- **Mindenhol megjelenik:** PDF (borító, konfiguráció, rajz megjegyzései), konfigurációs kód
  (`FADIO/7035`), szöveges összefoglaló, gyártói e-mail, megosztó link, költségkeret-tervező
  (az egyedi tetőszínt is le tudja adni).
- 8 új teszt; a véletlen konfigurációs teszt a színeket is lefedi. 89 teszt zöld.

## 3.10.1 — Hibavadászat (2026. 10. 29.)

- **Az árszámítás 40-szer gyorsabb** (0,7 ms → 18 µs): minden forint- és számformázás új
  `Intl.NumberFormat`-ot hozott létre. A költségkeret-tervező így a legnehezebb esetben
  (minden opció, fél keret) 20 s helyett 0,4 s alatt végez, a típuskártyák és a tetőválasztó
  árkülönbségei is akadás nélkül számolódnak. A tervező emellett kihagyja az eleve rosszabb
  és a semmiképp bele nem férő méret–tető párokat.
- **Téli panel:** félbe osztott elejénél is helyesen dönti el, kell-e tolóüveget ajánlani
  (eddig az osztott fél üvegre ráajánlott); az ajánlat elfogadása az osztást is megszünteti.
  Az új típusokat is leírja (fix üveg, lamella- és lécfal).
- **Rögzítésváltás:** ha egy osztott oldal ideiglenesen falra kerül, visszaváltáskor az osztás
  is visszajön (eddig elveszett, az oldal típusa viszont megmaradt).
- **Sérült link:** a kézzel átírt ventilátorszám (pl. `v9`) nem érvényteleníti az egész linket, 2-re vágjuk.
- **Mobil (≤ 400 px):** az RGB-színminták egy sorba férnek.
- Új tesztek: 300 véletlen konfiguráció (link oda-vissza, normalizálás, ár, rajz, PDF,
  költségkeret, sérült linkek), gyártói e-mail osztott oldallal és komfort-opciókkal. 81 teszt zöld.

## 3.10 — Több oldalfal-típus, félbe osztott oldal, RGB LED, ventilátor, okosotthon (2026. 10. 29.)

**Oldalfalak: 8 típus.** Nyitott, ZIP screen, keret nélküli tolóüveg, **keretes tolóüveg**, **fix üveg**,
lamellafal (állítható), **alumínium lécfal**, **hőkezelt fa lécfal**. Egy helyen definiálva
(`src/lib/sides.ts`: név, leírás, árkulcs, link- és rajzkód, költségkeret-érték), minden más innen olvas.

**Félbe osztott oldal.** Bármely nem fali oldal két félre osztható, felenként más típussal
(pl. fele tolóüveg, fele lécfal). Elöl/hátul bal és jobb fél, oldalt elülső és hátsó fél.
A két fél között osztóprofil fut (külön ártétel); 6 m feletti elülső oldalon a középoszlop
váltja ki. Megjelenik a 3D-ben, a tételes árban, az anyaglistában, a konfigurációs kódban
(pl. `(G/Z)`), a szöveges összefoglalóban, a PDF-ben, a műszaki rajz mindhárom nézetében,
a megosztó linkben és a gyártói lead-e-mailben.

**Felület.** Az Oldalak lépésben kétállású kapcsoló (Egész oldal / Két fél), fél-fülek a két
fél aktuális típusával, típuskártyák saját ikonnal, rövid leírással és a teljes bruttó ár
változásával. A felülnézeti oldalválasztóban kis sáv mutatja oldalanként a típust és az osztást.

**Komfort-opciók** (az Extrák lépés három csoportba rendezve: világítás · hő és légmozgás ·
vezérlés és energia):
- **Színváltós RGB+W LED** — a LED al-opciója, folyóméteres felárral. Színminták az Extrákban
  és az esti hangulat panelen; koppintásra esti nézetben mutatja a teraszt az adott színnel.
- **Mennyezeti ventilátor** (0–2 db) — tartógerendával, 3D-ben forgatható (≈30 fps-re
  korlátozva, hogy mobilon ne merítse az akkut). 2,55 m oszlopmagasság alatt figyelmeztet
  (lapátok alatt 2,1 m). A rajz alaprajzán Ø132-es lapátkörrel jelölve.
- **Okosotthon-vezérlés** — a kártya megmutatja, mit kapcsol az app ebben a tervben
  (tető, ZIP-ek, LED, fűtés, ventilátor).

**Árak (nettó, telepítés nélkül, szerkeszthetők az admin árlistában):** keretes tolóüveg
95 000 Ft/m², fix üveg 80 000, alu lécfal 55 000, fa lécfal 45 000, osztóprofil 35 000 Ft/db,
RGB+W felár 4 000 Ft/fm, ventilátor 130 000 Ft/db, okosotthon-központ 120 000 Ft.

**Energia.** Ventilátor 35 W × 3 óra × 92 nyári nap darabonként; okosotthon-központ 0,9 W
készenlét; RGB+W szalag ×1,3 fogyasztás; a félbe osztott oldalak ZIP-jei is motorként számítanak.

**Költségkeret-tervező.** A fél oldalakat külön-külön is le tudja adni, és a ventilátort,
az RGB-t és az okosotthont is.

**PDF.** Sok tételnél (osztott oldalak, sok opció) tömörebb tördelés: az ár egy lapon marad,
a „Hogyan tovább?” és a tudnivalók külön lapra kerülnek (5 oldal); egyszerű tervnél
változatlanul 4 oldal.

**Kompatibilitás.** A régi linkek változatlanul nyílnak; az új opciók a link végére kerülnek
(`r`, `v1`/`v2`, `h`, `s….`). Az alap demó ára nem változott (5 648 000 Ft).

## 3.9 — Piaci árakhoz igazított bemutató árlista (2026. 10. 29.)
A demó árai magyar középkategóriás piaci szintre kerültek (korábban kb. 40%-kal drágábbak voltak).
Példák bruttó, telepítéssel: 5 × 4 m motoros lamellás csupaszon **4,6 M Ft** (az alap demó LED-del,
ZIP-pel, szenzorral 5,6 M Ft — korábban 8,1 M), 4 × 3 m lamellás 2,8 M, eltolható lamellás 7,7 M,
textiltető 4,5 M, üvegtető 3,8 M, polikarbonát 2,9 M, fix alumínium 3,3 M, napelemmel +1,6 M Ft.

| Tétel (nettó, telepítés nélkül) | Új | Régi |
|---|---|---|
| Motoros lamellás tető | 165 000 Ft/m² | 220 000 |
| Eltolható lamellás | 240 000 Ft/m² | 340 000 |
| Textiltető | 125 000 Ft/m² | 195 000 |
| Üvegtető | 105 000 Ft/m² | 150 000 |
| Polikarbonát | 70 000 Ft/m² | 95 000 |
| Fix alumínium | 85 000 Ft/m² | 80 000 |
| ZIP screen | 45 000 Ft/m² | 85 000 |
| Tolóüveg (keret nélküli) | 105 000 Ft/m² | 165 000 |
| Fix lamellafal | 70 000 Ft/m² | 120 000 |
| LED | 10 000 Ft/fm | 12 000 |
| Infrapanel | 200 000 Ft/db | 220 000 |
| Hangrendszer | 220 000 Ft/pár | 280 000 |
| Eső- és szélérzékelő | 95 000 Ft | 180 000 |
| Napelem | 330 000 Ft/kWp | 320 000 |
| Telepítés | 10% | 12% |

Források: hazai gyártói árlisták és webshopok, tudjukki.hu/daibau.hu átlagárak, ZIP- és
tolóüveg-forgalmazói árlisták, napelemkalauz.hu (2026). Ezek tájékoztató középárak; az éles gyártó
a saját árlistáját állítja be az admin felületen.

## 3.8 — Tanácsadó, téli nézet, üzemeltetési költség, napelemes tető (2026. 10. 29.)
- **Tanácsadó** (fejléc + az első lépések elején): 4 kérdés (használat, időjárás, fény, hely)
  → javasolt pergola indoklással, árral és egy olcsóbb alternatívával; egy kattintással a 3D-be,
  bútorral együtt. Csak a gyártó kínálatából választ; mind a 108 válaszkombináció tesztelve.
- **Téli nézet** (Tél gomb): hó a kertben, a ház tetején és a teraszon a tető vetületén kívül
  (alatta száraz), havazás, kopasz fák, téli fény. Lamellás tető zárva, textiltető behúzva.
  Tájékoztató panel a tervhez szabva (tető, oldalak), egy kattintásos tolóüveg/fűtés ajánlattal.
- **Üzemeltetési költség**: éves áramköltség a 2026. októberi lakossági tarifával
  (36,386 Ft/kWh 2523 kWh/év-ig, felette 70,104 Ft/kWh). Ismeretlen háztartási fogyasztásnál a
  felső sávval (óvatos becslés); megadott fogyasztásnál sávhatár-átlépéssel is pontosan.
  Fogyasztók: fűtés (gyártói kW, állítható óraszám, fél teljesítmény), LED (10 W/fm), motorok,
  hangrendszer, készenlét. Az árpanelen, az Extrák lépésben, az összegzésben és a PDF-ben.
- **Napelemes tető** (gyártónként kapcsolható, fix tetőre): valós panelkiosztás (1134 × 1762 mm,
  430 Wp), 3D-modulok, kWp-ár, termelés (900 kWh/kWp/év, óvatos), éves érték bruttó elszámolással
  (betáplálás ~5 Ft/kWh), megtérülés, figyelmeztetés szaldós rendszer bővítésére és az elosztói
  engedélyre. Link, kód (-PV), anyaglista, műszaki rajz, PDF, költségkeret-tervező.
- A demó napelem-ár (320 000 Ft/kWp nettó) **becsült érték**, a gyártó adja meg a sajátját.
- Telefonon a gyorsgombok függőleges sávba kerültek; 63 automatikus teszt.

## 3.7 — Új PDF: méretarányos műszaki rajzzal (2026. 10. 28.)
- Teljesen újratervezett, 4 oldalas PDF, Manrope betűvel (beágyazva, ő/ű rendben):
  1. **Borító** — 3D-kép, fő adatok, bruttó irányár, havi példa, QR-kód a 3D tervhez.
  2. **Konfiguráció + anyaglista + tudnivalók** — csoportosítva (szerkezet, tető, oldalak, kiegészítők).
  3. **Árkalkuláció + teendők** — tételes ár részletezéssel, 3 lépéses folyamat, kapcsolat.
  4. **Műszaki rajz (A4 fekvő)** — homlokzat, A–A metszet, alaprajz (vízszintes metszet +1,00 m-en),
     szabványos méretarány (1:50 / 1:75), méretláncok cm-ben, szintjelek m-ben, falmetszet-vonalkázás,
     oszlopkiosztás, oldalzárások jelölése, rajzi fejléc **üres tervezői aláírás- és pecsétmezővel**.
- A rajz ugyanabból az adatból készül, mint a 3D és az ár — nem térhet el tőlük.
- Minden rögzítési módra, tetőtípusra és szélső méretre automatikusan tesztelve (53 teszt).
- Javítva: „Bal oldali oldal” → „Bal oldal” az ártételekben; a 0 db-os anyaglista-sorok kimaradnak.

## 3.6 — Választható tetőtípusok (2026. 10. 28.)
- Az **Oldalak** lépésben a diagram közepére (a „Tető” kockára) kattintva cserélhető a tető.
- 6 piaci tetőtípus: motoros lamellás (Aero), eltolható lamellás (Glide),
  behúzható textiltető (Velum), üvegtető (Lumen), polikarbonát (Opal), fix alumínium (Line).
- Minden kártyán: árnyék / eső / mozgás tulajdonság és az **árkülönbség** a mostani tervhez.
- Mozgatható tetőnél csúszka: lamellaszög (°) vagy tetőnyitás (%), a 3D-ben animálva.
- Saját 3D-modell: bordázott üveg (átlátszó, nem vet árnyékot), opál polikarbonát,
  harmonikásan behúzható ponyva.
- Végig összekötve: ár, megosztó link, konfigurációs kód, anyaglista, PDF,
  költségkeret-tervező, esőautomatika, árnyékelemzés (pl. üvegtető 29%, fix alu 69% árnyék).
- A gyártó az admin árbeállításban m²-áron árazza, és kikapcsolhatja, amit nem gyárt.
  A demó árak (textil 195e, üveg 150e, polikarbonát 95e Ft/m² nettó) **becsült értékek**.
- 6 új automatikus teszt (összesen 50).
- Javítva: a motoros lamellás tető az eltolható után félig összetolva maradt — most mindig a teljes tetőt fedi, csak a lamellaszög állítható.
- A tetőválasztó csak az Oldalak lépésben van (a Rögzítésből kikerült).

## 3.5 — Hibavadászat (2026. 10. 28.)

Automatikus végigkattintás minden funkción (tests/e2e), kódátnézés, javítás, újrafuttatás — az utolsó körben 0 hiba.

**Javított hibák**
- **Távolról nézve kifakult a ház:** a köd fix távolságtól indult, így kinagyított nézetben a ház is párás lett. Most a köd a kamerával együtt távolodik (csak a horizontot olvasztja), a talaj nagyobb lett.
- **Összecsukható árpanel** (asztali nézet): a ›-gombbal kis ár-címkévé csukható a jobb alsó sarokba, így nem takarja a 3D képet; a böngésző megjegyzi.
- **Tolóüveg kicsúszott a pergolából** bizonyos szélességeknél (pl. 535 cm), mert páratlan számú panel lett, és az utolsó mozgó panelnek nem volt párja. Most mindig páros a panelszám; teszt ellenőrzi 2,5–7 m között 5 cm-enként, hogy nyitva-zárva minden panel a kereten belül marad.
- **Elveszett ajánlatkérések:** a robotszűrő a böngésző és a szerver órájának különbségével számolt; ha a vásárló
  gépének órája néhány másodperccel előrébb járt, a kérelmet csendben eldobta. Most a böngésző maga méri a kitöltési időt.
- **Megosztott link + frissítés:** megosztott linkről megnyitva, módosítás után frissítéskor a régi link felülírta a
  változtatásokat. Most a címsor linkje követi a módosításokat.
- **Egyedi RAL-kód zárójellel / aposztróffal** („RAL 7016 (matt)”) a megosztott linket érvénytelenné tette. Javítva; 1000 véletlen konfigurációs oda-vissza teszt.
- **Méret beírása + Enter** nem lépett érvénybe (csak a mezőből kilépve). Most Enterre is, a határokhoz igazítva.
- **Ctrl+Y** (ismétlés) nem működött, és csúszkán állva a Ctrl+Z sem. Javítva.
- **Hibás e-mail / telefonszám** esetén csak általános hibaüzenet jött; most megmondja, melyik mezőt kell javítani, és a böngésző már beküldés előtt jelzi.
- **iPhone HEIC fotó** feltöltésekor üres kép lett; most érthető üzenetet ad (JPG/PNG kell).
- **Beágyazott nézetből megosztva** a címsor útvonala /k/-ra váltott az iframe-ben; most csak a hash frissül.
- **Költségkeret 100 000 Ft alatt** „Adj meg egy összeget” üzenet jött; most megmondja a legolcsóbb elérhető árat.
- **Esti hangulat:** a LED/fűtés ki-be kapcsolása az összes anyag újrafordítását okozta (mobilon akadás) — a fényforrások száma most állandó.
- **Kanapé nézetben** a bútor helyigény-jelölése belelógott a képbe — ott elrejtve.
- 375 px széles mobilon a fejléc 2 px-et túllógott.
- Árnyéktérkép-figyelmeztetés a konzolban (PCFSoft) megszüntetve.
- A LED megnevezése semleges lett (a fény színe a vásárló hangulatbeállításától függ).

**Biztonság**
- Visszaélés-fék az ajánlatkérésen: rövid idő alatt címenként max. 6, e-mail-címenként max. 3 kérelem
  (különben bárki tömegesen küldethetne „visszaigazoló” e-mailt egy idegen címre).
- Az e-mail tárgyából kiszűrve a sortörés és vezérlőkarakter.

Tesztek: 45 egység- és integrációs teszt + 4 böngészős ellenőrzőszkript.

## 3.4 — Bútor, költségkeret, esti hangulat (2026. 10. 28.)

**„Mit szeretnél alatta?” (Méret lépés)**
- Bútorcsomagok: pihenősarok (4–5 fő), étkező 6 és 8 főre, pihenő + étkező együtt, üresen. A 3D-ben megjelenik.
- Helyigény mozgástérrel (székek kihúzása 75 cm, közlekedés ≥ 60 cm) a pergola hasznos belső méretéhez
  mérve: kényelmes / szűkös / nem fér el; a 3D-ben zöld–sárga–piros jelöléssel.
- Ha nem fér el: egy gombos méretjavaslat az árkülönbséggel, a gyártói határokon belül; ha elforgatva fér el, úgy rendezi.
- A „X főnek ajánlott” tipp mostantól ugyanezzel a számítással megy (korábban 5 × 4 m-re azt írta, hogy
  étkező és pihenősarok együtt is elfér, pedig az 6 m hosszú helyet igényel).
- A „Kanapé” nézet a választott bútor egyik ülőhelyéről néz a kertre.

**Költségkeret („Van keretösszeged?” az árpanelen és az összegzésben)**
- A vásárló beírja, mennyit szán rá; a gyártó árlistájával 3 tervet kap: legjobb egyensúly, méret megtartva,
  felszereltség megtartva — mindegyiknél a pontos ár és a változások listája; egy gombbal alkalmazható, visszavonható.
- Funkcionálisan értelmes cserék (üveg → ZIP → nyitott), a választott bútor helyigénye alá nem kicsinyít;
  ha belefér, megmondja a maradékot; ha irreális, a legkisebb elérhető árat.

**Esti hangulat (Éjszaka nézetben)**
- LED fényerő és színhőmérséklet (2200–4000 K), a fény a 3D-ben valóban ilyen színű és erősségű.
- Teraszfűtés be/ki (izzás + meleg fény a panelek alatt).
- Ha még nincs a tervben LED vagy fűtés: „próbáld ki” gomb az árral.

Tesztek: 38 (bútor-helyigény, költségkeret-tervek a kereten belül és a valós árral).

## 3.3 — Árnyékelemzés valós napállással (2026. 10. 28.)

Új „Árnyék” gomb a jelenet felett. A vásárló megadja az irányítószámát, a napot és hogy merre néz
a pergola kert felőli eleje; a 3D-ben a nap valós irányból süt, a panel pedig megmutatja, a pergola alatti
terület hány százaléka van árnyékban, és ez hogyan alakul a nap folyamán.

**Pontosság (mérve, nem becsülve):**
- Napállás: NOAA/Meeus algoritmus, a NREL SPA referenciához (pvlib) képest 5 helyszín × 8 nap × 7 időpont
  alapján az azimut és a magasság eltérése < 0,02°; napkelte/napnyugta/delelés < 1 perc (tests/sun.test.ts).
- Nyári/téli időszámítás (Europe/Budapest) pontos, az átállás napjain is.
- Árnyék-%: a pergola alapterületén 196 mintapontból sugárkövetés a Nap felé, a jelenet valódi geometriáján
  (lamellák a beállított szögben, gerendák, ZIP-roló, lamellás fal, ház, házszárny). Az üveg átengedi a fényt.
  Ellenőrzés: fix tetős pergola, Vép, jún. 21., delelés → kézi geometriai számítás 78,6%, a rendszer 79%.
- Helyszín: 3046 magyar irányítószám koordinátája (GeoNames, CC BY 4.0), offline, ~2–5 km pontos —
  ez a napállásban 0,05° alatti eltérés.

**Ami a pontosságot ténylegesen meghatározza:** a tájolás. 10° tévedés a tájolásban többet számít,
mint minden más együtt. Ezért van 8 gyorsgomb, fokra pontos csúszka, és telefonon iránytűs mérés
(mágneses elhajlással korrigálva, 1,5 s átlag; a fal közelében a vasszerkezet zavarhatja).

**Nincs a modellben:** a szomszéd épületei, a valódi fák, a terep lejtése, és a ház valódi magassága
(a 3D ház általános, egyszintes + tetőtér).

- A 3D-ben iránytű jelöli a valós északot; az égbolt képe úgy fordul, hogy a látható nap is a valós irányban legyen.
- Mobilon a beállítások összecsukhatók, hogy az árnyék látszódjon.
- Első bekapcsoláskor július 15. az alapértelmezett nap (nyáron számít az árnyék).
- Javítva közben: az árnyékmérés késleltetett újramérése a régi időpontot használta (79% helyett 68%-ot mutatott).

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

## 3.23 — Teljesítmény és lamellahiba
- Lamellák: a geometriacsere már nem építi újra a példányokat (vékony csíkok betöltéskor).
- Modellek egyszerűsítve (növény, fa, bokor): ~556k → ~179k háromszög.
- Automatikus szint: Apple/integrált GPU legfeljebb magas; futásidejű védőháló (38 fps alatt eggyel lejjebb, eszközön megjegyezve).
- Utófeldolgozás: MSAA 2× magas szinten.

## 3.24 — B2B nyitóoldal, ármátrix-szerkesztő, mobil admin
- `/` mostantól a gyártóknak szóló B2B oldal (PERGO Studio): előnyök, rögzített bemutató, működés, árazás (Start 59 000 / Pro 119 000 Ft/hó, bevezetés 490 000 Ft, nettó), demókérő űrlap, GYIK. A lakossági ARDELIS oldal: `/ardelis`.
- Demókérés: `POST /api/demo-request` → e-mail (Resend) a `DEMO_REQUEST_EMAIL` címre (alapértelmezés: hrvtadam.7@icloud.com), opcionálisan Supabase `demo_requests` (supabase/demo_requests.sql). Kézbesítés nélkül az űrlap a közvetlen e-mail-címet mutatja.
- Admin → Beállítások: táblázatos ármátrix-szerkesztő (tetőnként, sor hozzáadás/törlés, Excel-beillesztés, mentéskori validáció: pozitív szám, duplikált méretpár, 30 m / 400 sor korlát). Az adatszerkezet és a számolás változatlan.
- Mobil admin: kártyás lead lista, alulról felcsúszó részletező rögzített Hívás / E-mail / Terv gombokkal, 16 px-es mezők, mentés sáv az alsó navigáció fölött.
- Admin grafikon: monoton görbe (nem bukik a tengely alá); KPI-sparkline nem takarja a feliratot.

## 3.25 — Fotóba helyezés és megbízhatóbb AR
- Fotóba helyezés: „Fotó” gomb a 3D nézetben; JPG/PNG/WebP, max. 10 MB (HEIC-re útmutató). A fotó HTML-háttér az átlátszó vászon mögött (nincs textúra/GPU-memória, a színkezelés érintetlen). Húzás = mozgatás, görgő/két ujj = méret és forgatás, Shift/jobb gomb + húzás = forgatás, nézőszög-csúszka, árnyékfogó sík (a pergola árnyéka a fotó talaján). Visszaállítás, Csere, Törlés, Kész; „FOTÓ MÓD” jelzés. Gesztus közben a 3D objektum közvetlenül mozog, elengedéskor egyszer mentjük az állapotot.
- A fotó és az elhelyezés csak a böngészőben marad (IndexedDB + localStorage), újranyitáskor visszatöltődik; a PDF-be és a megosztott képbe a fotós látvány kerül (háttér + 3D egymásra rajzolva). A link nem viszi a fotót (adatvédelem).
- AR: iOS-en előre elkészített USDZ + közvetlen `<a rel="ar">` (allowsContentScaling=0 → valós méret); Androidon WebXR (model-viewer); nem támogatott telefonon nincs AR-gomb, a QR-ről érkezőknek érthető ok + alternatíva (fotóba helyezés, link). Asztalon QR + fotó-alternatíva. Első használatkor 3 lépéses útmutató.
- AR-export: a lekerekített dobozok sima dobozra cserélve, a közös geometriák egyszer exportálva: csúcspontok ~70 000 → ~3 100, USDZ ~5,7 MB → ~0,4 MB, GLB ~1,7 MB → ~0,17 MB (demókonfiguráció).

## 3.26 — Lamelix márka és új előny-kártyák
- A platform neve Lamelix (a „PERGO Studio” helyett: a Pergo bejegyzett padlómárka). Logó: B2B oldal fejléce és lábléce, böngészőikon (favicon.ico/svg, Apple-ikon, webmanifest, PWA-ikonok), megosztási kép (`/assets/lamelix-og.png`), SEO-címek és strukturált adat, gyártói admin (belépés: „Működteti: Lamelix”, oldalsáv alja, fül címe).
- White-label: a gyártói felületeken a gyártó márkája marad elsődleges; diszkrét „Lamelix” jelzés a konfigurátor 3D nézetében, a PDF láblécén és a gyártónak küldött lead e-mailben. `tenant.platformCredit = false` kikapcsolja (Partnerhálózat csomag). Ha a gyártónak van `logoUrl`-je, a konfigurátor fülén az ő ikonja látszik.
- Logófájlok: `public/brand/` (SVG mesterfájlok, e-mailes PNG-k); kódban `LamelixLogo` komponens és `lamelixBrand.ts`.
- Előnyök: öt élő kártya animált mini-termékrészlettel (csúszka + irányár, valódi QR-kód, beérkező leadek, admin-grafikon, ármátrix interpolációval), forgó fénykeret; csak látható állapotban animál, mozgáscsökkentésnél állókép.

## 3.28 – Rövid demó-link
- Az élő demó új címe: `/konfigurator` (korábban `/k/demo`, `/studio/pergola`). A régi címek átirányítanak, így a kiküldött linkek és QR-kódok tovább működnek.
- Frissítve: B2B oldal gombjai, QR-kód a funkciókártyán, mintaoldal linkjei, llms.txt.

## 3.29 – Angol nyelvű főoldal és nyelvváltó
- Új útvonal: `/en` (angol főoldal), a magyar marad a `/`-en. A fejlécben HU / EN váltó, a horgony (pl. `#arak`) váltáskor megmarad.
- Szövegtár: `src/i18n/platformCopy.ts` (magyar + angol, azonos szerkezet, teszt őrzi); `useCopy()` / `LangProvider`.
- Árak és kalkulátor az oldal nyelvén (`HUF 5,648,000` / `5 648 000 Ft`); az árlista továbbra is forintban.
- SEO: angol title/description/OG, `html lang`, hreflang (hu-HU, en, x-default), sitemap, JSON-LD nyelv.
- Demókérő űrlap: az oldal nyelve megy a szerverre (angol hibaüzenetek; a tulajdonosnak szóló e-mail jelzi, ha EN).
- A konfigurátor és a mintaoldal felülete egyelőre magyar.
- A főoldal termékképei (konfigurátor, admin áttekintés, érdeklődők, mobil) újrafotózva a Lamelix arculattal; a régi „ARDELIS / PERGO” jelzés eltűnt.

## 3.30 – Hibakeresés és javítások
- Sitemap, canonical és strukturált adat a valós `/konfigurator` címre mutat (korábban az átirányító `/studio/pergola`-ra).
- A `/k/demo`, `/studio/pergola`, `/ardelis` átirányítás megtartja a `?lekérdezést` és a `#hash`-t – a megosztott konfigurációs linkek nem vesztik el a tervet.
- Demó admin: az alapértelmezett (`1111`) jelszóval a demó beállításai nem menthetők, így a nyilvános demót nem lehet átírni; `ADMIN_PASSWORD_DEMO` beállításakor újra menthető.
- Admin mentés: a törzsméret-korlát Content-Length nélkül is érvényesül.
- Függőségek: zod 4.6.7 (DoS javítás), lodash 4.18.1, használatlan `@hono/node-server` eltávolítva; `npm audit --omit=dev`: 0 sérülékenység.

## 3.31 – Robbantott nézet
- Új „Robbantott nézet” kapcsoló (Beállítások → jelenet): a tetőlamellák, gerendák, vízelvezetés felfelé, az oldalfalak kifelé animáltan szétválnak, feliratokkal (Oszlopok, Gerendák, Vízelvezetés, Tető). Csak látvány: méret, ár és konfiguráció nem változik. Csökkentett mozgásnál azonnal vált.

## 3.32 – Mobil betöltés csökkentése
- Mért első betöltés telefonon (iPhone 13 emuláció, valós hálózati méret): **10,85 MB → ~8,3 MB**.
- Telefonon a másik két égbolt-HDR (nappal/aranyóra/éjszaka) csak váltáskor töltődik (−0,65 MB).
- A fa telefonon 512 px-es textúrás változatot használ (−1,9 MB), a megjelenés alig változik.
- A deszka roughness-textúra újratömörítve (−0,24 MB, szabad szemmel nem látszik).
- Maradék legnagyobb tétel: a ház (3,5 MB). 5–6 MB-hoz könnyített mobilház kellene.

## 3.33 – Telefon fekvő (landscape) nézet
- Fekvő telefonon (érintőképernyő, ≤ 520 px magas) a konfigurátor két oszlopos: balra a 3D jelenet (kameragombok oldalt), jobbra az állandóan nyitott vezérlősáv és alatta az ár/Összegzés. Korábban az alsó lap eltakarta a pergolát.
- Az álló telefonos „fordítsd el a telefont” tippet a 3.47-ben kivettük. Az álló és az asztali elrendezés változatlan.

## 3.34 – Beépülő oldalelem-animáció
- Új oldalelem (ZIP screen, tolóüveg, fix üveg, lamellafal, lécfal) kapcsolásakor az elem fentről lefelé „leereszkedik" (0,8 s, ease-out). Ugyanígy, ha az oldal típusát váltod.
- Teljesítmény: csak a kapcsolás pillanatában fut, imperatív (nincs React újrarenderelés), csak a mozgás alatt kér képkockát és árnyékfrissítést; a betöltéskor és a megosztott linkeknél nem animál; csökkentett mozgásnál kihagyja.

## 3.35 – Fotórealisztikusabb render (szintenként hangolva)
- **Anyagok** (`materialDetail`): low/medium változatlan (gyors Standard); high: fémes porszórt alumínium (metalness 0,5), lakkréteg 0,22, procedurális 128 px-es szemcse-normáltérkép; ultra: metalness 0,62, lakk 0,3, erősebb szemcse. Az üveg minden szinten ior 1,5; ultra szinten valódi transzmisszió (thickness 0,02).
- **Fény**: melegebb napfény (nappal #fff4e2, aranyóra #ffc890), puhább árnyék (`shadow-radius` szintenként 1–4,5), a `environmentIntensity` mostantól tényleg hat (korábban nem volt bekötve).
- **Utófeldolgozás** (high/ultra): vignetta + enyhe telítettség, a bloom küszöbe nappal 0,92 (tükröződések), ultra szinten 1,25× erősség.
- Nincs új letöltendő fájl: minden textúra procedurális, a csomagméret változatlan.

## 3.36 – Éles 3D-kép a PDF-ajánlatban
- A PDF-export előtt a jelenet rövid időre 2× pixelarányra vált (legfeljebb 3000 px széles vászon), lemásolja a képet (max. 2400 px), majd visszaáll a megszokott felbontásra. Ha az átváltás nem sikerül, a korábbi pillanatkép kerül a PDF-be.

## 3.37 – UX-audit javítások
- A **tetőrendszer** (lamellás, fix stb.) mostantól az 1. lépésben is választható; korábban csak a 4. lépésben, az oldalas ábra közepére kattintva volt elérhető.
- **Alacsony telefon-kijelzőn** (≤ 760 px magas, álló) a félig nyitott panel magasabb (66%), a konfigurációs fejléc és a lépéscím elmarad, a fülek tömörebbek: korábban a lépés tartalmából alig egy sor látszott.

## 3.38 – „Nézet” panel, szél kapcsoló törölve
- A „Jelenet és vizualizáció” beállítások kikerültek a lépések aljáról: a 3D-nézet eszköztárában új **Nézet** gomb nyitja őket lebegő panelként (nincs háttér-sötétítés, a napszak, méretcímkék, robbantott nézet stb. hatása közben látszik). Minden lépésben, az összegzésben is elérhető. Desktopon 1560 px alatt az eszköztár többi gombja ikon-only, hogy ne takarja a címet.
- Az „Enyhe szél” kapcsoló törölve (alig látszott hatása); a mentett konfigurációkkal való kompatibilitás miatt a mező a modellben marad, alapból kikapcsolva.

## 3.39 – Duplikációk megszüntetése
- **Tanácsadó**: csak az 1. lépés „Nem tudod, hol kezdd?” kártyáján marad (ott van a helye), a fejlécből kikerült.
- **Összegzés**: az első „Felmérést kérek” gomb és a „PDF letöltése” törölve — az alsó állandó „Felmérést kérek” gomb, a desktop árpanel „PDF összefoglaló” gombja és a mobil árbár PDF-ikonja viszi ugyanezt. A WhatsApp a műveletsorba költözött.
- **Éjszaka** gyorsgomb a 3D-eszköztárból törölve: a Nézet panel napszak-választója (Nappal / Aranyóra / Éjszaka + csúszka) viszi.
- A fejléc szövege így desktopon egy sorba fér.

## 3.40 – Animációk (tanácsadó, összegzés, ajánlatkérés, lépésváltás)
- **Tanácsadó**: kérdésenként sorban érkező kártyák; a javaslatnál a kártya felpattan, az ár ~55%-ról számolva felpörög a végösszegre, a címkék és az indoklások egymás után jelennek meg.
- **1. lépés**: a „Nem tudod, hol kezdd?” kártyán halk fénycsík és a varázspálca időnként megbillen.
- **Összegzés**: a kép beúszik (töltés közben csillogó helyőrző), a tények és az ár-összetétel sorban érkezik, a színes sáv kitöltődik; az árpanel sávja is.
- **Ajánlatkérés visszaigazolása**: a kör és a pipa kirajzolódik, gyűrű-impulzus és apró szikrák.
- **Lépésváltás**: a cím és a tartalom egymás után csúszik be.
- Mindez tiszta CSS (nincs új függőség), `prefers-reduced-motion` esetén kikapcsol, és a 3D-nézetet nem érinti.

## 3.41 – Animációk a használat fontos pontjain
- Betöltő: felépülő pergola animáció (oszlopok, gerenda, lamellák) a logó alatt.
- Lépésváltás: irányfüggő beúszás (előre jobbról, vissza balról).
- Ár-delta: módosításkor „+/− X Ft” buborék az összeg mellett (asztali és mobil sáv).
- Extrák: bekapcsoláskor ikon-felvillanás és pulzáló kártya.
- Tetőválasztó: kiválasztáskor pop + fénycsík; színválasztó: csepp + gyűrű hatás.
- Tételes kalkuláció: sorban becsúszó tételek; PDF-gomb készítés közben csillogás.
- Ajánlatkérő űrlap: valid zöld / hibás piros kiemelés rázással, küldés közbeni spinner.
- Mozgáscsökkentés (prefers-reduced-motion) mindenhol kikapcsolja.

## 3.42 – Teljes képernyős használat
- Fejléc gomb: teljes képernyő (Android, iPad, asztal); iPhone Safariban súgó a kezdőképernyőre tételhez.
- Telepíthető (PWA) beállítások: apple-mobile-web-app-capable, viewport-fit=cover, manifest display_override fullscreen, start_url /konfigurator.
- Biztonságos sávok (kamera-kivágás) fekvő tájolásban.

## 3.43 – Tetődőlés és tetőburkolat-variánsok
- Új „Tetődőlés” csúszka (0–12°): a tető hátsó (fali) éle emelkedik, a hátsó oszlopok/oldal magasabbak, a ház magassága igazodik. Az elülső érték továbbra is az oszlopmagasság.
- Tetőburkolat: üveg → tiszta / matt / hővisszaverő; polikarbonát → opál / tiszta / hővisszaverő. 3D anyag, felár (Ft/m², admin árszerkesztőben állítható), összegzés, PDF, megosztó link (i, u jelölők).
- Teszt: tests/pitch-glazing.test.ts. 

## 3.44 – Dőlt tető teljes körűvé tétele
- Műszaki rajz: az A–A metszet ferde tetőt, magasított hátsó oszlopokat, oldalkitöltést, fali csatlakozást és külön hátsó-él méretet mutat; a homlokzaton szaggatott vonal jelöli a hátsó élt.
- 3D: zárt bal/jobb oldal fölött háromszög alakú, rögzített kitöltés (üvegoldalnál üveg, egyébként a váz színében).
- Ár: „Dőlt tető” tétel (Ft/°/fm, az admin árszerkesztőben állítható).

## 3.45 – Számozott online ajánlat, e-aláírás, foglaló, verziózás
- **Gyártói oldal** (Érdeklődők → részletek → „Árajánlat”): ajánlat kiadása egy érdeklődőhöz érvényességgel (alap 30 nap), foglaló-százalékkal (alap 30%), nettó engedménnyel, üzenettel és fizetési tudnivalókkal; e-mail a vevőnek a linkkel (Resend), link másolása, visszavonás. Újabb kiadásnál a függő változat „felülírt” lesz (`ARDELI-2026-0007`, `/v2`…).
- **Vevői oldal** `/ajanlat/:token` (titkos link, noindex): specifikáció, tételes ár, ÁFA, foglaló, fizetési tudnivalók, feltételek; elfogadás névvel + nyilatkozattal, elutasítás indokkal, nyomtatás/PDF. Lejárt, visszavont, felülírt ajánlat nem fogadható el; régi változaton jelzi az újabbat.
- **Biztonság**: az árat a szerver számolja és az ajánlatba rögzíti (pillanatkép); a tartalom SHA-256 ujjlenyomata elfogadáskor ellenőrződik, és az aláírás mellé (név, idő, IP, böngésző) mentődik. Az elfogadás az érdeklődőt „Megnyert” státuszra állítja, a gyártó és a vevő e-mailt kap. Az aláírás **egyszerű elektronikus aláírás**, nem minősített eIDAS.
- **Telepítés**: futtasd a `supabase/quotes.sql`-t (a `leads.sql` után). Foglaló: banki átutalás (fizetési tudnivalók az ajánlaton), online fizetés nincs.
- API: `GET/POST /api/quote`, `GET/POST/PATCH /api/admin-quotes`.

## 3.46 – Animációk: ajánlatoldal, 3D kiegészítők, admin
- **Ajánlatoldal**: papír beúszása, tételsorok egymás utáni megjelenése, a bruttó végösszeg és a foglaló számfelfutása; elfogadáskor aláírás-pecsét (kör kirajzolódik, pipa, hullámgyűrű).
- **3D kiegészítők**: utólag felkerülő fűtés, hangfal és ventilátor felülről „beugrik”; a LED két villanással kapcsol fel, majd lágyan felfut. Első betöltéskor és csökkentett mozgásnál nem animál.
- **Admin**: KPI-számok felfutása, animált üres állapot (pergola-körvonal), pulzáló jelző a 24 órán belüli új érdeklődőn.
- Minden animáció tiszteletben tartja a `prefers-reduced-motion` beállítást.

## 3.47 – Elforgatás-tipp kivéve
- A konfigurátor megnyitásakor álló telefonon felugró „fordítsd el a telefont fekvőre” javaslat megszűnt. A fekvő elrendezés (3.33) továbbra is automatikusan érvényesül, ha a felhasználó maga elforgatja a telefont.

## 3.48 – Veranda és télikert

- **Új épülettípusok** a „Pergola" lépésben (átnevezve a típus szerint: Pergola / Veranda / Télikert): `building` mező a konfigurációban. Csak akkor kínálja, ha a gyártó tetői és oldalfalai megengedik (veranda: üveg-/polikarbonát-/fix tető + üvegfal; télikert: üveg-/fix tető + fix üvegfal + ajtó).
- **Veranda:** zárt, üvegezett, nem fűtött tér. Üveg-, polikarbonát- vagy fix tető; edzett üveg az alap, hőszigetelt üveg felárral.
- **Télikert:** egész éves, fűtött tér. Csak üveg-/fix tető, csak üveg és ajtó oldalfal (a normalizáció a zip/lamella/lécfalat fix üvegre cseréli), hőhídmentes profilrendszer felár, kétrétegű vagy háromrétegű oldalüvegezés (Ug-értékekkel), alap és szigetelt padló, fűtés/hűtés (split klíma, padlófűtés vagy mindkettő), javasolt tetődőlés.
- **Új oldaltípusok:** nyíló ajtós üvegfal és tolóajtós üvegfal (pergolánál is használható). Az ajtó ára = a fix üvegfal m² ára + az ajtószárny egységára; az ajtó 3D-ben nyílik/csúszik (`scene.doorOpen`, kattintásra vagy gombbal).
- **Okos átváltás** (`buildingPatch`): típusváltáskor a tető illeszkedik, a nyitott oldalak lezáródnak, egy bejárati ajtó kerül a terv elé, télikertnél 3° dőlés, alap és split klíma az alap.
- **Árazás:** 8 új árkulcs (ajtók, oldalüvegezés felár, hőhídmentes profil %, alap, split klíma, padlófűtés), az admin árszerkesztőben szerkeszthető; a szerver újraszámolja.
- **Link:** új jelzők a `#c=` kódban (`ev`/`ec`, `w?`, `k?`, `q`); a régi linkek változatlanul működnek.
- **Kimenetek:** specifikáció-kód (`VR`/`TK`), anyaglista (ajtók), szöveges összefoglaló, lead-e-mail, online ajánlat, PDF (építmény-sorok, hatósági tudnivalók), műszaki rajz (ajtók az alaprajzon nyitási ívvel, a nézeten, a metszeten).
- **Figyelmeztetések:** nyitott oldal, hiányzó ajtó, hiányzó klíma, hiányzó dőlés (nem tiltás, a felhasználó dönt). Építési hatósági tudnivalók az összegzésben és a PDF-ben: kizárólag tájékoztató, nem jogi tanács.
- **3D:** ajtószárny (zsanér- és tolómozgás), oldalüvegezés-árnyalat, alap (alulról kinő), split klíma kül- és beltéri egység (beugrik).
- **Animációk:** épületkártyák (belépés, kijelölési pop, a vázlat kirajzolódik, a télikert hullámzó meleg), figyelmeztetések és hatósági lista beúszik, ajtó-gomb; `prefers-reduced-motion` mellett kikapcsolva.
- **Csomagok:** „Veranda" és „Télikert" kiinduló csomag a demó gyártónál.
- **Fontos:** az árak demó-kalibrációjúak (a demó télikert kb. 530 000 Ft/m² bruttó), a hatósági szöveg tájékoztató. A fűtés-hűtés méretezését, a padló felépítését és a statikát a gyártó a felmérés után végzi.

## 3.49 – Veranda/télikert: további animációk

- **Típusváltás:** az oldalfalak lépcsőzve épülnek fel (elöl, bal, jobb, hátul), az ajtó utolsóként; az alap előbb nő ki, a klíma-egységek a végén ugranak be.
- **Ajtónyitás:** nyitáskor meleg fényfolt ömlik a belső padlóra (éjjel erősebb, nappal finom).
- **Klíma működése a modellen** (Extrák → „Működés a modellen": Ki / Hűtés / Fűtés, `scene.climateRun`): a beltéri lamella kinyílik, a kijelző színt vált, apró részecskék áramlanak (hűtés kékes, fűtés meleg és lefelé), a kültéri ventilátor forog; padlófűtésnél lágyan lüktető meleg derengés a padlón. Folyamatos animáció ~30 fps-re korlátozva.
- **Ártételek kiemelése:** új tétel beúszik és felvillan, a megváltozott összeg halványan felvillan; a zárt „Tételes kalkuláció" során „+N új tétel" jelvény.
- **Nyitott oldal télikertben:** a hiányzó fal borostyán árnyalatban háromszor felpulzál, aztán halványan marad.
- **Oldalüvegezés:** az üveg árnyalata lágyan átúszik (nem ugrik).
- **Ajánlatoldal:** a specifikációs sorok sorban belépnek, az „Építmény típusa" sor kiemelődik; a cím „A megrendelt pergola / veranda / télikert"; összecsukható hatósági tudnivalók (a nyilvános ajánlat-adat új `permit` mezője).
- **Kiinduló csomagok:** kijelöléskor pop és pipa.
- **Rajz (3D nélküli tartalék):** az ajtószárny és a nyitási ív kirajzolódik.
- `prefers-reduced-motion` mellett mind kikapcsolva vagy azonnali; nyomtatásnál nincs animáció.
