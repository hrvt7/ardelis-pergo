# Lamelix – újraértékelés (2026. november)

Teljes átolvasás után: útvonalak, a konfigurátor hat lépése, a Nézet panel, az árpanel, az összegzés, az admin,
a nyitóoldal, a szerver (lead, ajánlat, statisztika), a tenant-rendszer és a 85 kiadás változásnaplója.

## 1. Mit építünk valójában?

**Egy B2B, saját márkás (white-label) értékesítési eszközt teraszfedés-gyártóknak**, három rétegben:

| Réteg | Mi van benne (ténylegesen, működik) |
|---|---|
| **Vevői konfigurátor** (`/k/{gyártó}`, `/embed/{gyártó}`) | 3 építménytípus (pergola / veranda / télikert) · 6 tetőrendszer + üvegtípusok · 10 oldalzárás-típus, felezhető oldalak, ajtók · 5 rögzítési mód · 1–4 modul · RAL-színek, kéttónusú · 16 bútorcsomag (lakossági + vendéglátós) · extrák (LED, RGB, fűtés, ventilátor, hang, szenzor, okosotthon, napelem, árnyékoló, klíma, alapozás) · **azonnali ár** (m²-ár vagy ármátrix, nettó/ÁFA/bruttó, 60 havi példa) · tanácsadó (4 kérdés) · költségkeret-tervező · üzemeltetési költség · árnyékelemzés valós napállással · **AR** (iOS/Android) · **fotóba helyezés** · működés-bemutató (motor + hajtórúd) · robbantott nézet · okos lamella · **PDF műszaki rajzzal, QR-kóddal** · megosztó link, márkázott kép WhatsApp-ra · A/B összehasonlítás · felmérési űrlap |
| **Gyártói admin** (`/k/{gyártó}/admin`) | KPI-k, tölcsér (megnyitás → módosítás → űrlap → beküldés), érdeklődők kanban 5 státusszal, teendők (hívás), **számozott online ajánlat e-aláírással** (`/ajanlat/:token`), beágyazó kód + QR, beállítások (árak, ármátrix, termékek, címzettek), demó adatok |
| **Platform-nyitóoldal** (`/`, `/en`) | B2B üzenet, 8 funkció, működés-bemutató, 4 lépéses bevezetés, **árak: Start 59 e / Pro 119 e / Partner egyedi + 490 e bevezetés**, ROI-kalkulátor, demókérés, GYIK |

Plusz két „rejtett” eszköz: `/minta` (egy B2C-hangvételű, filmszerű nyitóoldal: „A teraszod. Újragondolva.”) és a `CatalogStudio` (carport, előtető, kerítés, kapu – saját 3D-vel és árazással, nincs útvonalra kötve).

**Ítélet:** ez nem egy konfigurátor, hanem egy teljes értékesítési csatorna (tervezés → lead → ajánlat → aláírás → statisztika). Ami hiányzik, az nem funkció, hanem **fizető ügyfél és referencia**: a `TENANTS` listában egyetlen tenant van, a demó.

## 2. A lépések (tabok) logikája

Mért adatok (asztali nézet, demó):

| Lépés | Gombok | Csúszkák | Szöveg | Megjegyzés |
|---|---|---|---|---|
| 1 Pergola | **35** | 4 | **~3000 kar.** | tanácsadó + építménytípus + csomagok + tető + üveg + méretek + modulok + dőlés + **bútor** |
| 2 Rögzítés | 5 | 0 | 440 kar. | egyetlen döntés, egy lépés |
| 3 Szín | 39 | 0 | 1100 | pergola + ház két alfülön – rendben |
| 4 Oldalak | 17 | 1 | 1100 | tető **újra** itt is választható (duplikáció az 1. lépéssel) |
| 5 Extrák | 11 | 0 | 870 | rendben, jól tagolt |
| 6 Összegzés | 8 | 0 | 2000 | spec + anyaglista + A/B + űrlap |

Problémák:

1. **Az 1. lépés hét döntést sűrít össze**, a 2. egyet. A vevő az első képernyőn kapja a legtöbb terhet, mielőtt bármit „nyert” volna.
2. **A tetőválasztó két helyen van** (1. és 4. lépés), a tetődőlés az 1.-ben, a lamellaszög a 4.-ben: a „tető” döntés szét van szórva.
3. **A bútor nem a pergola tulajdonsága**, hanem a jeleneté (nem kerül árba, nem kerül a PDF-be mint tétel), mégis az 1. lépés végén ül.
4. **Három eszköz három helyen ismétlődik:** költségkeret (árpanel + összegzés), üzemeltetés (extrák + árpanel + összegzés), tanácsadó (1. lépés + fejléc). A vevő ugyanazt a gombot látja újra és újra.
5. **A Nézet panel 1230 px magas, 15 vezérlővel** (napszak, napirány, környezet, figura, méretcímkék, műszaki jelölések, feliratok, robbantott, automata forgatás, követő kamera, 3D-minőség, fotó + 5 fotó-csúszka). Ez egy „szakértői” panel egy vevőnek.
6. A sorrend: Szín a 3. helyen, az Oldalak a 4.-en – de az oldalzárás a geometriát változtatja, a szín csak a felületet. Természetesebb: forma → szerkezet → tető/oldalak → szín → extrák.

**Javasolt szerkezet (továbbra is 6 lépés, de kiegyensúlyozva):**

| # | Lépés | Tartalom |
|---|---|---|
| 1 | **Típus** | Mit építesz (3 típus) · kiinduló csomagok · tanácsadó-kártya. Semmi más. 30 másodperc, és a vevő már lát egy kész tervet. |
| 2 | **Méret és szerkezet** | szélesség/mélység/magasság · modulok · rögzítés (a mostani 2. lépés ide olvad) · tetődőlés |
| 3 | **Tető és oldalak** | tetőrendszer + üveg (csak itt) · lamellaszög / okos mód · oldalak a felülnézeten · ajtók, felezés |
| 4 | **Szín** | változatlan (pergola + a házad) |
| 5 | **Extrák** | változatlan |
| 6 | **Összegzés** | ár + kép + űrlap elöl; spec, anyaglista, A/B **lenyitható** blokkokban |

A bútor a Nézet panelbe kerül „Berendezés” címmel (a vendéglátós csomagok ott vannak jó helyen: a 3D-t rendezik, nem a terméket). A költségkeret és az üzemeltetés **egy** helyen marad: az árpanelen (asztalon) és a mobil ársávban.

## 3. Túl zsúfolt-e a rendszer?

**Igen, a határon van – nem a funkciók száma, hanem a láthatóságuk miatt.** A konfigurátorban ~30 önálló eszköz van, és ebből kb. 20 az első két képernyőn elérhető. A vevő feladata viszont egyszerű: méret, tető, oldalak, szín, ár, űrlap – 2 perc.

Javaslat: **két szint, nem kevesebb funkció.**

- **Alap út** (mindig látszik): a hat lépés + ár + PDF + megosztás + AR. Ennyit lát egy telefonos látogató.
- **Eszközök** (egy menü a 3D felett, a mostani négy ikon helyén): Árnyékelemzés · Fotóba helyezés · Működés-bemutató · Robbantott nézet · Költségkeret · Üzemeltetés · Összehasonlítás · Nézet-beállítások. Egy helyen, névvel, egy sorban.
- **Gyártói kapcsolók** a tenant-beállításban: a gyártó kikapcsolhatja, ami neki nem kell (pl. működés-bemutató, ha nem lamellás; télikert, ha nem gyárt). Az extrákra már van ilyen (`extras`), az eszközökre nincs.

Technikai zsúfoltság, amit mértem: `dist` 31 MB, `public/assets` 19 MB; 59 függőség, ebből kb. 25 Radix-csomag, `recharts`, `embla`, `cmdk`, `vaul`, `input-otp`, `react-day-picker` valószínűleg shadcn-maradvány, nem használt (ellenőrizni kell, de a konfigurátor saját komponenseket használ). Ez nem a vevőt terheli (a build csak a használtat csomagolja), de a karbantartást igen.

## 4. Okos funkciók, amikkel ki lehet tűnni

Nem az a kérdés, mit tud még a 3D, hanem **mi hoz több megrendelést a gyártónak**. A konkurens tervezők (riczu, risecpq, treede) mind a vevői oldalon versenyeznek; a gyártói oldalon (admin, ajánlat, utánkövetés) szinte senki. Ott a rés.

| # | Funkció | Miért tűnsz ki vele | Mire épül (már megvan) | Munka |
|---|---|---|---|---|
| 1 | **Lead-pontozás** („forró / meleg / hideg”) az adminban: tervérték, hány lépést járt be, kért-e PDF-et, nézte-e AR-ban, visszatért-e | A gyártó reggel tudja, kit hívjon először. Ilyet egyetlen konfigurátor sem ad. | eseménykövetés (`track`), lead-tábla, KPI-k | 1–2 nap (+ 3 új esemény: pdf, ar, share) |
| 2 | **Automatikus utánkövetés**: 3 nap után e-mail a vevőnek a saját 3D-linkjével és „kérjen időpontot” gombbal; 7 nap után a gyártónak teendő „nem válaszolt” | A legtöbb lead elvész a csendben. A rendszer dolgozik a gyártó helyett. | Resend, lead-státuszok, teendő-lista, ajánlat-rendszer | 2 nap |
| 3 | **Telepítési időpont-becslés**: a gyártó megad egy kapacitást („heti 2 szerelés”), a vevő a tervnél látja: „Következő szabad szerelés: május 2. hete” | Konkrét, sürgető, igaz. Szezonban ez a legerősebb lezáró érv. | tenant-beállítás, összegzés | fél nap |
| 4 | **Helyszíni műszaki jelzések irányítószámból**: szél- és hóteher-zóna, „600 cm felett középoszlop”, „télikert esetén bejelentés” – már most is vannak szabályalapú figyelmeztetések (`BuildingIssues`), ezt zónával erősítve | A gyártó kevesebb irreális kérelmet kap; a vevő komolyabbnak látja a rendszert. | sunSite irányítószám-adat, BuildingIssues | 1 nap |
| 5 | **Gyártói termék-digitalizálás** (oszlopprofil, gerenda, lamellaosztás, motorház tenantonként) | „A vevő az **én** pergolámat látja” – ez az egyetlen, ami a gyártót hosszú távon benntartja. (A backlogban #8 régóta.) | LOUVRE-konstansok, tenant-séma | 3–5 nap |
| 6 | **Árajánlat egy kattintással a leadből** – ez már megvan (`QuoteSection`, e-aláírás). Hiányzik a **mobil aláírás-értesítés** és az **elfogadás → „megnyert” automatikus státusz** | A tölcsér vége záródik be a rendszerben, nem e-mailben. | quotes.ts | fél nap |
| 7 | **Lamellaárnyék a teraszon** (a napszak és a lamellaszög szerint mozgó csíkos árnyék) | Látvány, ami a terméket adja el, nem a programot. | okos lamella, sun study | ½–1 nap |

Amit **nem** javaslok most: AI-chat tanácsadó (a 4 kérdéses tanácsadó jobb), hangvezérlés, VR, „közösségi” funkciók, 3D-s ház-generálás fotóból. Ezek látványosak, de nem hoznak megrendelést.

## 5. Üzleti modell: mivel lehet a leggyorsabban, legegyszerűbben pénzt keresni?

### A három út

**A) White-label SaaS gyártóknak (a mostani).** Start 59 e / Pro 119 e Ft/hó + 490 e bevezetés.
- Mellette: ismétlődő bevétel; a termék erre van kiépítve (admin, ajánlat, ármátrix); a nemzetközi referencia-ár (Configurix ~499 USD/hó) alátámasztja.
- Ellene: **lassú**. Magyarországon talán 30–60 releváns gyártó/importőr van; mindegyiknél 2–4 hetes döntés, árlista-egyeztetés, „de az én profilom más” kifogás. 0 referenciával a 490 e bevezetési díj a legnagyobb akadály. Reális: 3–6 ügyfél az első évben → 300–700 e Ft/hó egy év múlva.

**B) B2C tervező + lead-közvetítés (a felvetésed).** Bárki megtervezi, kész látványtervvel keres gyártót; a gyártó a leadért fizet.
- Mellette: **nincs bevezetés**, nincs árlista-egyeztetés; a `/minta` oldal és a demó-tenant már ez; a lead-rendszer, a PDF, a QR mind megvan. A gyártók a leadért könnyebben fizetnek (ismerik: Google Ads, lead-portálok), mint szoftverért.
- Ellene: **forgalom kell** (SEO 4–8 hónap, vagy hirdetés); az ár „irányár”, nem a gyártóé, ezért vita lehet; a lead minősége ingadozik; te leszel az adatkezelő és egy „ügynökség”, nem szoftvercég; a jutalékos modell (nyert üzlet %-a) ellenőrizhetetlen, a lead-ár (db) viszont egyszerű.

**C) Egyszeri projekt-eladás.** „Konfigurátor a weboldaladra” 1–2 M Ft fix áron + 20–30 e Ft/hó üzemeltetés.
- Mellette: a magyar gyártó a **beruházást** érti, a havidíjat gyanakodva nézi; egy projekt azonnal pénz; a bevezetés úgyis munka.
- Ellene: nem skálázódik, minden ügyfél egyedi kérésekkel jön.

### Amit javaslok: **B indít, A-ra épít, C-vel zár** – ebben a sorrendben

1. **Most (0–4 hét): lead-közvetítés 2–3 gyártóval, régiónként egy.** A `/minta` + `/konfigurator` már egy B2C tervező. Kell hozzá: saját domain, a lead a te admin-odba fut (megvan), onnan **kézzel** továbbítod a régió gyártójának (nem kell kiépíteni semmit az elosztáshoz). Ár: **15–25 e Ft/lead** vagy az első 10 lead ingyen, utána fizetős. Ez nem termék, hanem bizonyíték: 10 továbbított lead után tudod, hány lett felmérés, és ez az a szám, amivel el tudod adni a white-labelt.
2. **Közben (1–3 hónap): 1–2 pilot white-label ügyfél bevezetési díj nélkül**, 3 hónap ingyen, utána Pro. Cserébe: logó + idézet a nyitóoldalra, és a saját termékük 3D-paraméterei (a 4.5 pont) – ez lesz az első „a te pergolád” referencia. Az importőrök (akik több márkát árulnak, és nincs saját fejlesztőjük) könnyebb célpontok, mint a gyártók.
3. **Utána (3–6 hónap): a nyitóoldal árait tartsd, de a bevezetést csomagold át**: „bevezetés 0 Ft 12 havi szerződéssel” – ugyanaz a bevétel, kisebb a belépési küszöb. Aki nem akar havidíjat, annak a C) egyszeri projekt.

**Amit ne csinálj:** teljes marketplace (több ajánlat, értékelések, gyártó-profilok, fizetési kapu). Ez egy másik cég, másik 12 hónap, és addig egy forintot sem hoz.

### A leggyorsabb pénz, konkrétan

A legkisebb munka a legnagyobb bevételig: **a működés-bemutató modul** (már a nyitóoldalon is külön ajánlatként szerepel). Egy gyártónak a saját termékéből készített „így működik” animáció 300–600 e Ft egyszeri – a `MechanismPanel` és az SB400-adatfeldolgozás megvan, a munka termékenként 1–2 nap. Ezt el lehet adni annak is, aki konfigurátort (még) nem vesz, és minden eladott modul egy ajtó a konfigurátorhoz.

## 6. Tennivalók sorrendben (ha egyetértesz)

1. Nyitóoldal: **két bejárat** – „Gyártóknak” (a mostani) és „Tervezd meg a pergolád” (a `/minta` + konfigurátor, saját lead-fogadással). Fél nap.
2. Konfigurátor **szerkezet-átrendezés** a 2. pont szerint (lépések, Eszközök menü, duplikációk megszüntetése). 2–3 nap. Ez egyben a zsúfoltság megoldása.
3. **Lead-pontozás + utánkövetés** (4.1, 4.2). 3–4 nap. Ez a B2B eladási érv.
4. Gyártói 3D-paraméterek (4.5) az első pilottal együtt.
5. Német nyelv + EUR **csak** akkor, ha van osztrák érdeklődő – előbb ne.

Nem kódolható, de ugyanilyen fontos: **egy** valós referencia neve és száma a nyitóoldalon. Enélkül a 490 e bevezetési díjat senki nem fizeti ki.
