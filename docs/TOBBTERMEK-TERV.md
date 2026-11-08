# Többtermékes kalkulátor – terv és döntési pontok (2026. november)

Kiindulás: a treede.eu mintájára a Lamelix ne csak pergolát, hanem több kültéri terméket (kerítés, garázskapu,
carport, szauna, kerti ház, nyaraló) tudjon 3D-ben megtervezni és beárazni. Ez a dokumentum nem fejlesztési
utasítás: azt gyűjti össze, mit tudunk a versenytársról, milyen irányok vannak, melyiket javaslom és mivel jár.
A korábbi stratégia (`STRATEGIA-2026-11.md`) üzleti része továbbra is érvényes; ez arra épül.

---

## 1. Mit csinál a treede, és mit tanulunk belőle

**Tények az oldalukról (2026. nov. 8.):**
- Szlovák cég, egy alapító-fejlesztő (Adam Krampl). Egy valós referencia: Moja Pergola (SK), „több száz érdeklődő havonta, 16 % telepítés” – de ez a landing + kampány + konfigurátor együttes eredménye, ők maguk írják, hogy a konfigurátor önálló hatása nem mérhető.
- Pozicionálás: **tisztán B2B**, gyártóknak. „Turn your price list into a 3D configurator that sells.” A vevő (végfelhasználó) sehol nem célcsoport, csak szereplő.
- Ár: **200 €/hó + egyszeri bevezetés** (árlista, szabályok, 3D-forrás, integrációk szerint). Három csomag: Konfigurátor / Értékesítési rendszer (landing + kampány is) / Új termék (egyedi 3D-alap). Bevezetés „kb. egy hét teljes adatoktól”.
- Saját CRM-et adnak mellé (specifikáció, kapcsolat, link), integrációk (HubSpot, Odoo, Shopify, Sheets…) csak **egyedi scope-ként**, nem kész konnektorként.
- „305 terméktípus” – valójában **~10 mérnöki család** (keretes tető, nyílászáró, parametrikus épület, lineáris kerítés, felület-kiosztás, medencetest, behúzható árnyékoló, bútor, konténermodul, lépcső/korlát, ipari váz). A 305 a családok × változatok SEO-oldalai. A nyitóoldali választó (Pergola / Kerítés / Szauna / Garázskapu / Garázs / Nyaraló) ezekből egy-egy bemutatópéldány.
- Erős elemek: élő ár a nyitóoldalon; „a mérnök nem engedi” szabály-bemutató (9 m-hez ötödik oszlop); árlista-, készlet-, szállítás-, telepítési-kapacitás kártyák mint **lehetőségek** („when there is a reliable source”), nem ígéretek; „kinek való / kinek nem” szekció.

**Mit tanulunk:**
1. A többtermékesség náluk **marketing-szélesség**, nem 305 kész konfigurátor. Néhány jól megcsinált mérnöki család + sok SEO-oldal. Ugyanezt tudjuk: a pergola-motorunk már most lefedi a „keretes tető” családot (pergola, veranda, télikert, és kis munkával carport, előtető).
2. A hitelesség egyetlen valós referenciából jön, számokkal. Nálunk ez továbbra is a legnagyobb hiány.
3. A B2B értékesítés kulcsa náluk is a **landing + kampány** csomag: a gyártó nem konfigurátort vesz, hanem érdeklődőket. Ezt mi is így adjuk el (ez a „Sales system” csomagjuk).
4. Amiben mi már most jobbak vagyunk: a vevői élmény (fotóba helyezés, AR, árnyékelemzés, esőbemutató, hangulat, kanapé-nézet, költségkeret, üzemeltetési költség), a lead-pontozás és az automatikus utánkövetés, a valódi magyar árazás (nettó/bruttó, ármátrix), a mobil admin. A treede demója ehhez képest egyszerű.

---

## 2. Pozicionálás: kinek adjuk el?

Három lehetőség, őszintén.

### A) Marad B2B, de a kirakat többtermékes (treede-modell)
A nyitóoldal gyártóknak szól, a nyilvános demó több terméket mutat („nézd meg a saját termékcsaládodon”). Pénz: havidíj + bevezetés, termékcsaládonként.
- Mellette: ismétlődő bevétel; a termék erre van kiépítve; egy új család (pl. kerítés) rögtön új gyártói kör (kerítésgyártók, kapuforgalmazók), nem ugyanazt a 30–60 pergolást kell győzködni.
- Ellene: lassú (a korábbi stratégia 5. pontja), minden új család új gyártói piac, amit külön kell megtanulni.

### B) B2C tervezőportál: bárki tervez, látványtervvel keres gyártót
Egy nyilvános oldal, ahol a látogató kiválasztja, mit tervez (pergola, kerítés, szauna…), megtervezi, letölti a PDF-et, és ezzel megy gyártóhoz. Pénz: a lead eladása gyártóknak (darabra), vagy régiós exkluzivitás havidíjért.
- Mellette: nincs bevezetési díj, nincs árlista-egyeztetés; a `/minta` + konfigurátor + lead-rendszer + admin **már ez**; a gyártó a leadért könnyebben fizet, mint szoftverért; több termék = több keresőforgalom (a „kerítés ár kalkulátor” típusú keresések nagyságrenddel többen vannak, mint a „pergola konfigurátor”).
- Ellene: **forgalom kell** (SEO hónapok, vagy hirdetési költség); az ár „irányár”, nem a gyártóé; te leszel adatkezelő és közvetítő; a jutalék (nyert üzlet %-a) **ellenőrizhetetlen** – a gyártó nem fogja jelenteni, mi lett a leadből. Darabár vagy régiós havidíj igen.

### C) Hibrid: B2C kirakat, B2B bevétel (ezt javaslom)
A nyilvános oldal a **vevőnek** szól („Tervezd meg 3D-ben, lásd az irányárat, kérj ajánlatot”), több termékkel. Minden termékcsaládnál **az a gyártó kapja a leadet, aki szerződött** (régiónként egy), és nála a konfigurátor **az ő árlistájával és az ő termékével** fut (ez a white-label, ami megvan). Ahol nincs szerződött gyártó, ott a lead a te adminodba fut, és kézzel adod tovább darabáron.
- Így a vevői forgalom **egyszerre** termel leadet (B) és bizonyítja a gyártónak a rendszert (A). A gyártói eladás mondata: „ezen az oldalon havonta X ember tervez kerítést a te megyédben; ha szerződsz, ők a te árlistáddal, a te termékedet tervezik, és hozzád fut a lead.” Ez erősebb, mint egy demó.
- A B2B oldal (a mostani `/`) megmarad, de **átköltözik `/gyartoknak`-ra**, és a vevői oldal lesz a gyökér. A treede ennek pont a fordítottja; nekünk a vevői oldal az erősségünk (a fenti 4. pont), ezt érdemes előre tenni.
- A jutalékos modellt **ne**: darabár (15–25 e Ft/lead termékfüggően) vagy régiós exkluzivitás (havidíj) legyen. A korábbi stratégia ugyanezt mondta.

**Amit ne:** teljes piactér (több gyártó ajánlata egy leadre, értékelések, fizetés). A `_marketplace/` mappában ennek egy korábbi változata félre van téve; maradjon ott. Ez egy másik cég, másik év.

---

## 3. Hol válasszon terméket a látogató? Landing kártyák vagy felugró ablak?

A kérdés a kettő közül volt; a válasz: **mindkettő, két fázisban**, és egyik sem felugró ablak.

**1. fázis – a weboldalhoz nem nyúlunk.** A konfigurátor első lépése („Típus”) ma Pergola / Veranda / Télikert. Ez bővül **egy szinttel feljebb**: „Mit tervezel?” – Teraszfedés (pergola, veranda, télikert), Kerítés és kapu, Garázskapu, Carport… A választás nem felugró ablak, hanem **a konfigurátor 0. lépése**, ugyanúgy kártyákkal, mint a mostani típusválasztó, és mélylinkelhető (`/konfigurator/kerites`). Felugró ablak azért nem: nem kereshető, nem linkelhető, nem visszalépkedhető, és mobilon zavar. Aki `/konfigurator`-ra jön pergoláért, az egy kattintással ott van, ahol ma.

**2. fázis – új nyitóoldal (amikor legalább 3 család készen van).** A gyökér (`/`) egy vevői oldal lesz, treede-szerű **termékválasztó szalaggal** a hajtás felett (Pergola · Veranda · Kerítés · Garázskapu · Carport · Szauna), alatta **élő, interaktív előnézet** a kiválasztott termékből (nem kép – ez az, ami nálunk nekik nincs), élő irányárral; alatta a mostani mintaoldal elemei (előtte-utána, folyamat, GYIK). Minden terméknek saját SEO-aloldal (`/tervezo/kerites-kalkulator`), ami ugyanebbe a konfigurátorba visz. A gyártói oldal `/gyartoknak` alá kerül, a fejlécben egy „Gyártóknak” link marad.

A mostani B2B oldal tehát **nem vész el és nem kell átírni**, csak odébb költözik, amikor a vevői oldal elkészül.

---

## 4. Melyik termékeket, milyen sorrendben?

Szempontok: magyar kereslet (keresések, gyártói kör), 3D- és árazási munka, és mennyit tudunk újrahasználni a pergola-motorból.

| # | Termék | Mérnöki család | Újrahasználás | Munka (3D + árazás + szabályok) | Miért ekkor |
|---|---|---|---|---|---|
| 1 | **Carport / előtető** | keretes tető | ~80 % (a pergola oszlop–gerenda–tető rendszere, fix/polikarbonát tető megvan) | 1–2 hét | Legolcsóbb bővítés, nagy kereslet, ugyanazok a gyártók/importőrök árulják, mint a pergolát |
| 2 | **Kerítés és kapu** (alu lamellás, lécfal, tömör, tolókapu, kétszárnyú) | lineáris | ~30 % (anyagok, színek, oldalfal-lamella geometria, árazás keretrendszer) | 3–4 hét | A legnagyobb keresőforgalom a kültéri termékek közt; sok gyártó/forgalmazó; egyszerű geometria, bonyolult a telek-forma (poligon rajzolás) |
| 3 | **Garázskapu** (szekcionált, billenő; méret, panelminta, szín, ablak, motor) | nyílászáró | ~20 % (színek, árazás, PDF, lead) | 2–3 hét | Konkrét, jól árazható termék; a kapu-forgalmazók (Hörmann-, Wiśniowski-viszonteladók) fizetőképes B2B kör; kis 3D |
| 4 | **Kerti ház / szauna / tároló** (doboz épület: alap, falak, tető, nyílászárók, terasz) | parametrikus épület | ~40 % (ház-generátor részei: tető, fal, nyílászáró már van a mintaháznál) | 4–6 hét | Nagy élmény-érték, de bonyolult: belső elrendezés, hőszigetelés, szauna-technika; sok kis gyártó, ritkább ismétlődő vevő |
| 5 | **Nyaraló / tiny house** | parametrikus épület (a 4. bővítése) | a 4.-re épül | +3–4 hét | Látványos, de engedélyköteles, egyedi, kevés gyártó, hosszú döntés. Marketingre jó, bevételre a legbizonytalanabb |

**Javaslat:** 1 → 2 → 3, aztán döntés a 4–5-ről az addigi forgalom alapján. Az 1–3 után a nyitóoldali választó már hiteles (öt-hat termék), és három különböző gyártói kört lehet megszólítani.

---

## 5. „Valós termékek alapján, profin” – hogyan készül a 3D?

A pergola így készült: nem letöltött modell, hanem **paraméteres geometria** valós műszaki adatokból (lamella 215,8 × 39,8 mm, 200 mm osztás, hajtókar R115, lineáris motor), így bármilyen méretre helyes, és a működés-bemutató valós számokat mutat. Ugyanezt kell a többi terméknél:

1. **Forrás termékenként:** 1–2 piacvezető gyártó műszaki lapja (profilmetszetek, osztások, maximális fesztáv, panelmagasságok, szabványméretek – pl. garázskapu 2375/2500 × 2000/2125…). Ezek nyilvános adatok; a **márkanév és logó** csak szerződött gyártónál jelenik meg, addig a termék „típusként” szerepel („szekcionált kapu, 40 mm-es panel”).
2. **Generátor családonként:** egy kód-modul, ami méretből és opciókból építi a geometriát (mint a `LouvreRoof`). Textúrák: a meglévő porszórt-fém, fa, üveg anyagok újrahasználhatók; új: horganyzott acél, beton, zsindely, kapu-panelminták (bordázott, kazettás, sima).
3. **Szabályok és árazás együtt:** minden családhoz ugyanaz a séma, mint a pergolánál – tenant-árlista (ármátrix vagy méterár), tiltott kombinációk, telepítési tételek, nettó/bruttó. Ez adja a B2B értéket, nem a 3D.
4. **Minőségi küszöb:** ugyanaz a jelenet (fény, árnyék, ház, kert, fotóba helyezés, AR, PDF, megosztókép) minden termékre automatikusan vonatkozik, mert a jelenet a termék alatt van, nem benne. Ezért lehet egy új család 2–4 hét, nem 2–4 hónap.
5. **Amit a gyártótól kérünk szerződéskor:** árlista (Excel), profil-/színkatalógus, 2–3 referencia-fotó, és a termékcsalád határai (min/max méretek). Ugyanez a lista, ami most az `UJ-GYARTO.md`-ben van, termékcsaládra szabva.

---

## 6. Mit kell átalakítani a kódban (áttekintés, nem feladatlista)

- **Termékcsalád fogalma** a konfigurációban és a tenantban: ma minden `PergolaConfig`. Kell egy közös héj (`product: 'pergola' | 'carport' | 'fence' | 'garage-door' | …`) és családonként saját config-típus, árazó, szabály-normalizáló, PDF-szekció és megosztókód-előtag. A pergola marad az első család, változatlan működéssel.
- **Konfigurátor héja közös** (lépések, Eszközök, árpanel, összegzés, lead-űrlap, admin), a lépések tartalma családonként más. A 0. lépés a családválasztó.
- **Jelenet közös**, a termék-modell cserélhető (ma `PergolaModel`; lesz `FenceModel`, `GarageDoorModel`…). A kamera-nézetek családonként mások (kerítésnél nincs „alulról”, kapunál van „belülről”).
- **Tenant több családdal:** egy gyártó egy vagy több családot kínál; az admin árlista-szerkesztője családonként.
- **Útvonalak:** `/konfigurator/<csalad>`, `/k/<gyarto>/<csalad>`, a régi `/studio/fence`, `/studio/carport` átirányítások (már léteznek az `App.tsx`-ben) újra élnek.
- Amit **nem** kell újraírni: lead-fogadás, pontozás, utánkövetés, admin, ajánlat/e-aláírás, PDF-motor, megosztás, fotóba helyezés, AR-export, jelenet, fény.

Nagyságrend: a közös héj átalakítása ~1–2 hét, utána családonként a 4. pont táblázatának ideje.

---

## 7. Ütemterv-javaslat

1. **Döntés** a pozicionálásról (2. pont) és az első három termékről (4. pont). Ezen múlik minden más.
2. **Héj átalakítása** többtermékesre, a pergola változatlanul működik. (1–2 hét)
3. **Carport/előtető** mint első új család – gyors, látványos, és bizonyítja, hogy a héj jó. (1–2 hét)
4. **Kerítés és kapu**, telekrajzoló eszközzel (a Google-térképes helyszín már megvan az árnyékelemzésnél, a telek körvonala erre épülhet). (3–4 hét)
5. **Garázskapu.** (2–3 hét)
6. **Új vevői nyitóoldal** termékválasztóval és élő előnézettel; a gyártói oldal `/gyartoknak` alá. SEO-aloldalak termékenként. (1–2 hét)
7. Közben, nem kód: **1 szerződött gyártó családonként**, első 10 lead ingyen, utána darabár vagy régiós havidíj. Egy valós szám a nyitóoldalra.

Összesen 3–4 hónap az első három családdal és az új nyitóoldallal, egy fejlesztővel. A 4–5. termék (kerti ház, szauna, nyaraló) ezután, a forgalom alapján.

---

## 8. Döntendő kérdések (ezekre kell válasz, mielőtt bármi épül)

1. **Pozicionálás:** ✅ **Eldöntve 2026. nov. 8.: C) hibrid** – vevői kirakat több termékkel, gyártói bevétel (szerződött gyártó családonként és régiónként; a többi lead darabáron). A gyártói oldal `/gyartoknak` alá költözik, amikor a vevői nyitóoldal elkészül.
2. **Első három termék:** carport → kerítés/kapu → garázskapu – vagy másik sorrend/termék (pl. szauna előbb a látvány miatt)?
3. **Bevétel a nem szerződött leadekből:** darabár (15–25 e Ft) vagy régiós havidíj? Jutalékot nem javaslok.
4. **Gyártói adatok:** van-e már kapcsolat kerítés- vagy kapuforgalmazóval, akitől árlista és műszaki lap jön? Enélkül a termék „típusként” készül, nyilvános szabványméretekből.
5. **Domain és név:** a vevői oldal maradjon Lamelix márkán, vagy külön fogyasztói név (pl. „Teraszterv”) legyen, és a Lamelix a gyártói márka? (A treede egy márkát használ mindkettőre.)
6. **Nyelv:** marad a magyar piac, vagy a kerítés/kapu családdal egyből osztrák/szlovák nyitás is (ott a treede már jelen van)?

Ha ezekre megvan a válasz, a 7. pont 2. lépésével (héj átalakítása) lehet kezdeni, a pergola működésének megzavarása nélkül.
