# Változások

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
