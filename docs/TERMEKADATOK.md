# Termékadatok a többtermékes kalkulátorhoz

Lekérés dátuma (minden forrásra, ha nincs külön jelölve): **2026-11-08**.
Célja: valós, nyilvános műszaki adat és magyar piaci ár a carport/előtető, a kerítés és kapu, valamint a garázskapu családhoz. A pergolánál használt elv a minta: paraméteres geometria + tenant-árlista (nettó, 27 % ÁFA, HUF).

**Jelölések:** `[F]` = forrásból közvetlenül kiolvasott adat. `[B]` = becslés / következtetés, forrás nélkül, ellenőrizni kell. `[K]` = a forrás kivonata alapján, az oldalt nem tudtam teljes egészében ellenőrizni.

**Fontos korlát:** a kutatás gyártói oldalakra, PDF-ekre és webshopokra épül. A magyar piacon a legtöbb gyártó nem tesz közzé árlistát (egyedi ajánlat). Ahol csak EUR-ár volt, azt EUR-ban hagytam, és nem váltottam át HUF-ra.

---

## 1. Carport / előtető

### 1.1 Tipikus méretek

| Adat | Érték | Forrás |
|---|---|---|
| Egyedi méretű alu carport, standard (STD) méret | 5000 × 4000 mm (sz × m), 4 oszlop `[F]` | https://gazebo-pavilonok.hu/carportok/carport/ |
| Kisebb autóbeálló | max. 8 m széles, max. 6 m mély (tároló: mélység max. 6 m, szélesség 3–10 m) `[F]` | https://serbanteraszteto.hu/autobeallok-tarolok/aluminium-autobeallok-taroloval/ |
| Ximax Typ 60/80/110 szabványméret (hossz × szél. × magasság) | 495,4 × 270,4 × 298 cm; hosszabb 555,8 × 270,4 × 298; keskeny XS 495,4 × 240,5 × 296,2; széles XL 495,4 × 301,2 × 307,5 cm `[F]` | Ximax Carport Katalog 2026: https://cdn.koempf24.de/cms/Persistent/a364c3d54c34dd0df865b6fd82edf194d0984401/Ximax-Carport-Katalog-2026.pdf |
| Ximax Tandem (kétautós) | 9,8 × 2,7 m (Linea Tandem) `[F]` | ugyanott |
| Ximax Miniport | 4,9 × 2 m `[F]` | ugyanott |
| Ximax Linea Typ 60 a magyar ÁrGépen | 4,95 × 5,48 m `[K]` | https://www.argep.hu/trend/CARP/Carport.html (a keresési kivonatból; az oldal 403-at adott, nem nyitottam meg) |
| Magasság | ~2,4–3,0 m. A Ximax 296–307 cm, hordozható/webshop modellek 2,34–2,44 m `[F]/[B]` | fenti források |
| Egy-/kétállásos | egyállású: ~3 × 5 m, ~2,7 × 4,95 m; kétállású: 5–5,5 m széles (pl. 4,95 × 5,48) vagy Tandem 9,8 m `[F]/[B]` | fenti források |

Magyar gyártónál (Serbán, Gazebo) a méret egyedi, tehát a 3D-generátor szabadon paraméterezhet; a Ximax szabványméretei csak viszonyítási pontok.

### 1.2 Oszlop- és gerendaprofil, fesztáv

- Az **oszlop- és gerendaprofil méretet egyik magyar gyártó sem közli** a weboldalán (Gazebo, Serbán: nem szerepel) `[F]`.
- Egyetlen számszerű adat: Ximax Linea Typ 60 M oszlop **10 × 16 cm** (Hornbach-oldal kivonata, a gyártói lap nem erősítette meg) `[K]`: https://www.hornbach.at/p/doppelcarport-ximax-linea-typ-60-m-ausfuehrung-aluminium-eloxiert-545-6x495-4-cm-edelstahl-look/10693541/
- Külföldi webshopok 3 × 5 m-es modelljeinél oszlop 90 × 90 mm és 110 × 110 mm, egy másiknál 156 × 87 × 4 mm `[K]` (Dancover, tarpaulinscompany.co.uk – nem magyar piac, csak nagyságrend).
- **Max. fesztáv oszlop nélkül:** nincs közölt érték. A Ximax Typ 110-nél 3 oszlop, Typ 60/80-nál 2 oszlop (Linea: 2 oszlopos, szabadon hordó) `[F]`. `[B]` Alumínium ~5 m mélység 2 oszloppal, ~5,5 m hosszig terjedő szerkezetek léteznek; a 8 m széles / 6 m mély a Serbán felső határa, de oszloposztást nem ad meg.

### 1.3 Tetőtípusok és rétegvastagság

| Tető | Vastagság | Forrás |
|---|---|---|
| Polikarbonát (víztiszta vagy opál/hőstop) | **16 mm** `[F]` | Serbán, Gazebo |
| Színes hőszigetelt szendvicspanel | **30 mm** `[F]` | Serbán |
| Trapézlemez | vastagság nincs megadva, szín RAL 9006 `[F]` | Gazebo |
| Ximax polikarbonát, sima, füstszürke (Portoforte, Linea, My-Port, Neo) | UV-védelem 100 %, IR-védelem 81 % `[F]` | Ximax katalógus |
| Ximax polikarbonát, sima, víztiszta-matt | UV 100 %, IR 37 % (kérésre) `[F]` | ugyanott |
| Ximax Wing hullámos kék füstös | UV 100 %, IR 50 % `[F]` | ugyanott |
| Üvegtető | nem találtam magyar carport-gyártói adatot | – |

### 1.4 Hóteher

| Típus | Hóteher | Szél | Forrás |
|---|---|---|---|
| Serbán autóbeálló | **120 kg/m²** `[F]` | – | Serbán |
| Gazebo | nem közölt; statikai szakvéleményt ad `[F]` | – | Gazebo |
| Ximax Typ 60 / 80 / 110 | 75 / 100 / 137 kg/m² `[F]` | 122 km/h | Ximax katalógus |
| Ximax Wing 2 / 4 oszlop | 100 / 110 kg/m² `[F]` | 108 km/h | ugyanott |

Magyarországi hózóna-osztály (MSZ EN 1991-1-3 nemzeti melléklet) nem szerepel a forrásokban `[B]`: a legtöbb magyar településen a karakterisztikus talajhóteher ~1,0–1,25 kN/m² körül van, ezt a statikus véglegesítse. Ellenőrizendő.

### 1.5 Színek

- Serbán: RAL 7016 (strukturált antracit), RAL 7001 (ezüstszürke), RAL 9005 (fekete), RAL 9007 (szürke alumínium), RAL 9016 (fehér) `[F]`.
- Gazebo: RAL 9016 (váz), tetőlemez RAL 9006 `[F]`.
- Ximax: Edelstahl-Look (inox hatású), fekete, mattbarna, téli fehér, antracit, ezüst `[F]`.

### 1.6 Vízelvezetés

- Gazebo: integrált elvezetés, az oszlopon belül, rejtve `[F]`.
- Serbán: erősített vízelvezető profilok, a lefolyás az ügyfél által választott oszlopon át, burkolatra vagy fűre `[F]`.
- Ximax: beépített ereszcsatorna lefolyócsővel (minden Linea/Portoforte) `[F]`.

### 1.7 Bruttó / nettó árak

| Termék | Ár | Telepítés | Forrás |
|---|---|---|---|
| Serbán 3 × 5 m alu autóbeálló | **5 513 EUR + ÁFA** | szállítással és szereléssel együtt `[F]`; tájékoztató, nem ajánlat | Serbán |
| Gazebo STD 5 × 4 m | **7 890 EUR ÁFA nélkül** | a FAQ szerint kulcsrakész telepítést tartalmaz, a táblázat szerint szerelés 0 EUR `[F]` | Gazebo |
| Gazebo Economic+ fedés | 6 500 EUR (ÁFA-alap nincs megadva) `[F]` | – | https://gazebo-pavilonok.hu/carportok/alumium-shelter-economic |
| Ximax Linea Typ 60, 4,95 × 5,48 m | **2 560 990 Ft-tól** bruttó `[K]` | telepítés nélkül, szállítás nélkül (39 990 Ft a listán) | ÁrGép kivonat |
| Ximax Portoforte Typ 60, 5,4 × 4,9 m | 2 857 980 Ft `[K]` | telepítés nélkül | ÁrGép kivonat |
| Palram terasztető (olcsó belépő) | 415 990 Ft-tól `[K]` | – | ÁrGép kivonat |

HUF-ra váltva `[B]` (kb. 400 Ft/EUR feltételezéssel, a pontos árfolyam ellenőrizendő): Serbán 3 × 5 m ≈ 2,2 M Ft nettó, azaz ≈ 2,8 M Ft bruttó, telepítéssel. Gazebo 5 × 4 m ≈ 3,2 M Ft nettó (az ő oldalukon is szerepel 3 156 000 Ft ÁFA nélkül `[K]`).

Telepítés nélküli ár magyar gyártótól nincs; a Ximax-féle kész csomag telepítés nélkül 2,5–2,9 M Ft bruttó.

### 1.8 Gyártók / forgalmazók

| Név | Weboldal | Mit árul | Nyilvános árlista? |
|---|---|---|---|
| Serbán Terasztető | https://serbanteraszteto.hu | alu autóbeálló + tároló, terasztető; ÉK-Magyarország, egyedi esetben országos | nincs; tájékoztató ár EUR-ban |
| Gazebo Altánky (gazebo-pavilonok.hu) | https://gazebo-pavilonok.hu | egyedi alu carport, pergola, shelter | nincs; csak "már … EUR-tól" |
| Nívó | https://nivo.hu | pergola, terasztető, carport polikarbonáttal; 8 szalon (Budapest, Nagytarcsa, Debrecen, Nyíregyháza, Siófok, Miskolc, Győr, Kecskemét) | nincs, egyedi ajánlat |
| Ximax (viszonteladók: ÁrGép-listázott boltok) | https://www.argep.hu/trend/CARP/Carport.html | kész csomag carport | webshop-ár |
| Palram / Canopia, Tepro, Aluplex, Toolport | webshopokon (Árukereső, ÁrGép) | kész, kisebb carport/terasztető | webshop-ár |

---

## 2. Kerítés és kapu

### 2.1 Rendszerek és szabványméretek

**Nívó (acél kerítéselem, alu váz) – katalógus 2025. okt.** (https://nivo.hu/files/dokumentumok/nivo-katalogus-202510.pdf) `[F]`
- Acél kerítéselem: profil vastagság 17 és 18 mm, profil szélesség 30, 50, 108 és 153 mm; porfestett, 24 szín, rombusz profil.
- Egy másik acél elemtípus: profil szélesség 105 mm, vastagság 15 mm, anyagvastagság 0,6 mm, 70 dkg/fm.
- Kétszárnyú kapu: gondozásmentes alumínium váz, **akár 2 m magasságig, 5 m nyílásig**, alsó rész kb. 5 cm; ±10 mm állítási lehetőség. Kiskapu: fahatású kerettel 130 cm szélességig, 2 m magasságig.
- Kapútípusok: kétszárnyú, tolókapu (sínes és sín nélküli/guruló), úszókapu, harmonika, teleszkópos, kiskapu.
- Fix méretű modulpanel: példa elemek 1940 × 900 × 20 mm, 1990 × 1150 × 20 mm, lábazati elem 1990 × 400 × 20 mm; kapu 3000 × 1600 mm-es falnyílásba, kiskapu 1100 × 1600 mm-esbe.

**Umakov (alu kerítésrendszer, magyarországi raktár Nagytarcsán)** – https://umakov.hu/en/products/aluminum-fence-louver-20x120-2500mm-fg-l2s20x120-2500-r7016-en `[F]`
- Lamella 20 × 120 mm, kétkamrás, extrudált alu EN AW-6060-T6, textúrált porfesték; hosszak 2500, 6000 mm (+ 7000 mm kitöltőknél).
- Kitöltő profilok 20 × 40, 20 × 60, 20 × 80, 20 × 100, 20 × 120, 20 × 160 mm.
- Oszlopok: 50 × 60, 70 × 70, **80 × 80** mm (függőleges kitöltéshez); 80 × 80 oszlopkészlet takarólécekkel, 6000 mm.
- Szín: RAL 7016 antracit, natúr; a rés nincs megadva.

**WPC kerítés (wpcmarket.hu)** – https://wpcmarket.hu/arlista/ `[F]` (csak bruttó ár)
- Element zárt (WM21-169): 169 × 21 × 5800 mm; Woody 140 × 20 × 5800; Woody Zárt 169 × 21 × 5400/5800; Simple 21 × 140 × 5800; Premium Classic 145 × 21 × 2900/5800 mm.
- WPC oszlop WM 120-120-4: **120 × 120 mm**, hossz 1930 és 5800 mm; oszlopsapka 138 × 138 mm.
- Tartozékok: oszloptartó vas 40 × 40 × 1500 mm, támasztó vas 20 × 40 mm, alumínium U-profil 21 × 30 mm.
- Színek: sötétbarna, antracit/sötétszürke, világosszürke, tölgy, fehér (kivitelenként eltér).
- Telepítési ismertető (PDF): https://wpcmarket.hu/wp-content/uploads/2026/05/WPC-Element-es-Woody-Zart-keritesrendszer-telepitesi-ismervei.pdf – a fájl 10 MB felett volt, **nem tudtam kiolvasni**, osztás/lábazat adatai hiányoznak.

**Casanoov (kész alu tolókapu-szett)** – https://www.casanoov.hu/aluminium-tolokapu-3m/ `[F]`
- Szélesség 298 vagy 303 cm; magasság 140/160/180 cm (tényleges 145–181 cm); színek fehér, antracit; házilag összeszerelhető készlet.

### 2.2 Oszloposztás, lamella-köz, lábazat

- **Oszloposztás:** gyártói osztás nincs közölve. `[B]` Alu kerítésnél 2000–2500 mm elemszélesség (az Umakov 1850 × 2000 mm-es panelt említ 80 × 80 oszloppal), WPC-nél a 120 × 120-as oszlop és 1930 mm-es hossz alapján ~1,9 m-es magasság, 2,0–2,5 m osztás. Ellenőrizendő.
- **Lamella-köz:** nincs közölve (Umakov: "gap: not stated"). A Nívó "áttört / tömör" kivitelt említ.
- **Lábazat:** Nívó lábazati elem 1990 × 400 × 20 mm (acél panel) `[F]`; WPC-nél a rendszer alsó része U-profil 21 × 30 mm-rel zárható `[F]` (a lábazat mint beton elem forrást nem találtam).

### 2.3 Kapu: max. szélesség, motor

- Kétszárnyú kapu: **5 m nyílásig** (Nívó) `[F]`.
- Tolókapu: kész szett 3 m (Casanoov); 6 × 2,045 m-es alu tolókapu-készlet **560 849 Ft nettó / 712 278 Ft bruttó** (Umakov kivonat, `[K]`).
- Motor típusok és bruttó árak (kiskereskedői, dátum nélküli oldalak, `[K]`):
  - Fikesz: VDS SIMPLY (600 kg) 62 984 Ft; Key Automation (500 kg) 352 261 Ft: https://fikesz.com/spl/117415/Tolokapu-motorok
  - Proteco: 500 kg, 230 V: 128 269 Ft; 2500 kg, 48 V: 523 239 Ft: https://proteco.hu/tolokapu-mozgato-motorok/
  - Roger H30/643: 178 700 Ft (https://rollingdoor.hu/index.php?r=Product%2FIndex%2F0%2F136)
  - Tutifémszerkezet motorszettek: 89 990 Ft-tól, ~800 kg kapusúlyig: https://www.tutifemszerkezet.hu/termekkategoriak/tolokapu-motor-szett
  - Beninca BULL17.OMI (1700 kg): 560 515 Ft bruttó listaár: https://powerbizt.hu/termekek/bull17omi
- Nívó: a gyártói oldal csak garázskapunál említ motort, kapunál nem.

### 2.4 Színek

- Nívó acélelem: 24 szín porfestve + fahatású (UV-stabil) bevonat `[F]`.
- Umakov: RAL 7016, natúr `[F]`. Casanoov: fehér, antracit `[F]`. WPC: lásd fent.

### 2.5 Árak

| Tétel | Ár | Forrás |
|---|---|---|
| Alu lamella 20 × 120, 2500 mm | 7 367 Ft nettó / **9 356 Ft bruttó** `[F]` | Umakov (fenti URL) |
| Alu lamella 20 × 120, 6000 mm | 21 414 Ft nettó / 27 196 Ft bruttó `[F]` | Umakov |
| Alu kitöltő 20 × 80, 3000 mm | 160 349 Ft nettó / 203 643 Ft bruttó (szett) `[K]` | Umakov kivonat |
| 70 × 70 oszlop 2,5 m | 21 242 Ft `[K]` | Umakov kivonat |
| Alu adapter MODEL46, 6000 mm | 19 720 Ft nettó / 25 044 Ft bruttó `[F]` | Umakov |
| WPC elem 169 × 21 × 5800 | 14 990 Ft bruttó `[F]` | wpcmarket.hu |
| WPC oszlop 120 × 120 × 1930 / 5800 | 13 975 / 42 000 Ft bruttó `[F]` | wpcmarket.hu |
| WPC Premium Classic 145 × 21 × 2900 | 6 990 Ft bruttó `[F]` | wpcmarket.hu |
| 3 m alu tolókapu szett (Casanoov) | 226 959–301 539 Ft (akciós/listaár, a "BF10" kód külön 10 %) `[F]` | Casanoov |

Folyóméterár: egyik forrás sem közöl kész fm-árat. `[B]` WPC esetén számolható: egy 5,8 m-es, 169 mm széles elem 14 990 Ft ⇒ ~2 585 Ft/fm lamellánként; 1,8 m magas kerítéshez ~11 lamella kell (1800 / 169, rés nélkül) ⇒ nagyságrendileg 28 000 Ft/fm csak a lamella, oszlop és tartozék nélkül. Telepítési díj kerítésre/kapura nincs közölt, csak a Nívó "egyedi ajánlat". Telepítési díjat gyártótól kell kérni.

### 2.6 Gyártók / forgalmazók

| Név | Weboldal | Mit árul | Árlista? |
|---|---|---|---|
| Nívó Kerítés Kft. | https://nivo.hu | acél/alu kerítés, kapuk, garázskapu, pergola; 8 szalon | nincs (egyedi ajánlat) |
| Umakov (HU raktár: Nagytarcsa) | https://umakov.hu | alu kerítés alkatrészek, szettek, tolókapu-készlet | igen, webshop-ár nettó + bruttó |
| WPC Market | https://wpcmarket.hu | WPC kerítés, terasz | igen, bruttó, https://wpcmarket.hu/arlista/ |
| Casanoov | https://www.casanoov.hu | készre szerelhető alu kapuk | igen, webshop |
| Tutifémszerkezet | https://www.tutifemszerkezet.hu | motorszettek, garázskapu | webshop |
| Fikesz, Proteco, Rollingdoor, Powerbizt | lásd 2.3 | kapumotorok | webshop |
| GardenGate | https://gardengate.hu | kapumotorok | webshop |

---

## 3. Garázskapu

### 3.1 Szabvány nyílásméretek

- **Hörmann LPU 42 rácsméretek (Door grid width LZ):** 2250, 2375, 2500, 2625, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000, 5250, 5500, 6000 mm. Egyes típusoknál szűk sáv: 2190, 2315, 2440, 2940 mm `[F]` (Hörmann katalógus, https://www.hoermann.de/fileadmin/_country/kataloge/pdf/86_912-Sectional_Garage_Doors_-0518-EN-UK.pdf, 2018-as kiadás, a mai kínálat eltérhet).
- **Magasságok (RM):** 1875, 2000, 2125, 2250, 2375, 2500, 2625, 2750, 2875, 3000 mm `[F]` (ugyanott).
- **Belső garázsméret (GIM) = LZ + 180 mm** (pl. 2500 ⇒ 2680) `[F]`.
- **Max. méret LPU 42:** 6000 mm széles × 3000 mm magas; L-bordás Woodgrain/Silkgrain 5500 mm (Hungarian BAU 2025 brosúra kivonata `[K]`), a "7000 × 5000" csak SPU F42 Plus-nál `[F]`.
- Magyar webshop-kínálat nyílásméretei (mind Hörmann `[F]`, bbkapu.hu, 1. oldal 15/61 termék): 2250×2000, 2250×2125, 2315×2080, 2375×1875, 2375×2000, **2375×2125**, 2440×2080, **2500×2000, 2500×2125, 2500×2250, 2500×2375, 2500×2500**, 2750×2000, **2750×2125**; Hörmann nagyobb: 5000×2125, 6000×2250, 3000×3000 (Tutifémszerkezet) https://bbkapu.hu/termekkategoria/hormann-garazskapuk/.

### 3.2 Panel, mintázat, felület

- Hörmann **LPU 42**: dupla falú acél, **42 mm** PU-hab; **RenoMatic** (felújításra, 4 elem, 562 mm elemmagasság) szintén 42 mm `[F]`: https://www.tutifemszerkezet.hu/termekkategoriak/szekcionalt-garazskapu/hormann-szekcionalt-garazskapu-2500-2250
- **LPU 67 Thermo:** 67 mm, max. 5000 × 3000 mm; **LTE 42:** egyfalú `[F]` (katalógus).
- Mintázat: S-, **M-**, **L-bordás**; felületek: Woodgrain (faerezett), Sandgrain, **Silkgrain** (a magyar oldalon "Planar", sima matt), Decograin (dekor), Duragrain (24 dekor) `[F]`.
- Wiśniowski: 40 mm (UniPro, Up = 0,48 W/m²K) és 60 mm (INNOVO: PRIME, UniTherm, Up = 0,33) panel `[K]`: https://www.husa.is/media/fjpna2db/f13-en-garage-doors-sectional-wisniowski.pdf (lengyel/nemzetközi források).
- A kért **kazettás** panelmintát egyik megnyitott magyar forrás sem említi a Hörmann-nál; Wiśniowski/Krispol kazettás kínálat itt nem volt igazolva `[B]`.

### 3.3 Színek

- Hörmann (Tutifémszerkezet): RAL 9016, RAL 9006, RAL 9007, CH 703 (antracit metál), RAL 7016, RAL 8028, RAL 9005; dekor: Golden Oak, Dark Oak, Night Oak; belső RAL 9002 `[F]`.
- 15 előre választott szín + szabad RAL (LPU 42 Woodgrain, Silkgrain) `[F]` (katalógus).

### 3.4 Ablak, szellőző

- Hörmann bevilágító ablak, panelenként max. 3 db, kivágás 510 × 330 mm `[F]`.
- Árak (bruttó): fehér 1 db +24 990 Ft (kivágás nélkül) / +43 980 Ft (kivágással); 2 db +49 980 / +87 960; 3 db +74 970 / +131 940; antracit/tölgy 1 db +29 990 / +48 980 `[F]`.
- Szellőző: magyar forrás nem említi; a katalógus Classic/Sunrise/V-panelled üvegezési családokat sorol `[F]`.

### 3.5 Motorok

| Motor | Ár (bruttó) | Megjegyzés |
|---|---|---|
| Hörmann ProLift (600 N) | +39 990 Ft | 2 távirányító `[F]` |
| DuraMatic (600 N) | +54 990 Ft | 1 távirányító `[F]` |
| ProMatic 4 (750 N) | +69 990 Ft | `[F]` |
| SupraMatic E 4 (800 N, Bluetooth) | +124 990 Ft | `[F]` |
| Plusz távirányító | 9 990 Ft/db | `[F]` |

A 2018-as katalógus motortáblája szerint két motorosztály létezik: max. 5500 mm / 13,75 m² és max. 6000 mm / 15 m² (a táblázat oszlopfeliratai a PDF-ből nem olvashatók ki egyértelműen, melyik típus melyik) `[F]`; a modellneveket a gyártótól kell megerősíteni. Sommer, Nice, Alutech motorokról nincs adat a megnyitott forrásokban.

### 3.6 Beépítési követelmények (Hörmann RenoMatic 2500 × 2250)

| Követelmény | Min. | Ajánlott |
|---|---|---|
| Oldalsó hely (mindkét oldalon) | 90 mm | 100 mm |
| Szemöldök / felső hely | **115 mm** (motorral) | 130 mm |
| Garázs belső szélessége | 2680 mm | – |
| Belmagasság | 2365 mm | 2385 mm |
| Teljes benyúlás motorral (mélység) | **3450 mm** | – |

Kész falnyílás: nyílás mögötti beépítésnél 2500 × 2250 mm; nyílásba építésnél 2710 × 2390 mm. Egy másik magyar Hörmann-oldal a 2500 × 2125-ös kapu tokkal együtti méretét 2660 × 2255 mm-nek adja `[K]` (keresési kivonat). A Hörmann katalógus (2018) általános ajánlása: szemöldök legalább 100 mm (motorral 115 mm), oldalhely 90 mm.
- LPU 42 maximumok szerkezeti sínenként: Z-sín max. 4000 × 2625 mm (LPU 42 Silkgrain max. 3000 × 2500) `[F]`.

### 3.7 Árak

| Termék | Ár (bruttó) | Forrás |
|---|---|---|
| Hörmann RenoMatic 2500 × 2250, motor nélkül | **338 990 Ft-tól** (nettó 266 921) `[F]` | tutifemszerkezet.hu |
| Hörmann 2500 × 2125 (bbkapu) | 311 990 Ft-tól `[K]` | bbkapu.hu |
| Hörmann 2500 × 2500 | 371 990 Ft-tól `[K]` | bbkapu.hu |
| Hörmann 2750 × 2125 | 361 990 Ft-tól `[K]` | bbkapu.hu |
| Hörmann 2500 × 2000 | 311 990 Ft-tól `[K]` | bbkapu.hu |
| Hörmann EPU 40 L, 2500 × 2125 | 300 000 Ft (ÁFA-állapot nincs megadva) `[K]` | https://qjob.hu/blog/arak/hormann-garazskapu-ar (403, csak kivonat) |
| Wiśniowski 2400 × 2100, szekcionált | 436 000 Ft / akciós 369 999 Ft `[F]` | https://garazskapu-debrecen.hu/termekek/3-garazskapuk |
| Hörmann szekcionált 2022 (méret nem megadva) | 440 600 Ft `[F]` | ugyanott |
| Alutech szekcionált | 336 500 Ft `[F]` | ugyanott |
| Wiśniowski billenő / Hörmann Berry billenő | 166 999 (akciós) / 189 000 Ft `[F]` | ugyanott |

Kiegészítők (bruttó): kézi zár +19 990; személybejáró ajtó +359 990 (min. ProMatic 4); ThermoFrame +79 990; toktakaró +39 990; viharküszöb +24 950; vészkioldó +11 990 `[F]`.

**Telepítési díj:** nincs fix. Az oldal szerint "egyedi ajánlat", Vecsés körül ~100 km-es körzetben; az ajánláshoz nyílásméret és belső fotó kell `[F]`. Qjob útmutató példa: Hörmann EPU 40 M telepítéssel és tartozékokkal **590 000 Ft** végösszeg `[K]`. `[B]` Telepítés ≈ 80–150 e Ft; ezt gyártótól/szerelőtől kell ellenőrizni.

Billenő és redőnykapu: konkrét méret/műszaki adat itt nem lett összegyűjtve (csak a fenti két billenő ár), ez hiány.

### 3.8 Gyártók / viszonteladók

| Név | Weboldal | Mit árul | Árlista? |
|---|---|---|---|
| Tutifémszerkezet (Vecsés) | https://www.tutifemszerkezet.hu | Hörmann szekcionált, motorok; szerelés ajánlat alapján | webshop, bruttó |
| B&B Kapuautomatika Kft. (Vác) | https://bbkapu.hu | Hörmann garázskapuk, 61 méret | webshop, "-tól" ár |
| Garázskapu Debrecen | https://garazskapu-debrecen.hu | Wiśniowski, Hörmann, Alutech, Ditec | webshop |
| Kapumotorbolt | https://kapumotorbolt.hu/HORMANN-SZIGETELT-SZEKCIONALT-GARAZSKAPU-KEZI-VAGY | Hörmann szekcionált | webshop |
| Hörmann Magyarország | https://www.hoermann.hu | gyártó magyar képviselete | nincs nyilvános árlista |
| Nívó | https://nivo.hu | méretre gyártott, motoros szekcionált garázskapu | nincs |

Krispol, Ryterna, Novoferm magyar forgalmazóját **nem találtam** (a keresésekben csak külföldi oldalak jöttek).

---

## 4. Amit a 3D-generátorhoz tudni kell

### 4.1 Carport

| Paraméter | Min | Max | Lépés | Megjegyzés |
|---|---|---|---|---|
| Szélesség | 2400 | 8000 | 100 | Serbán max. 8 m |
| Mélység | 2400 | 6000 | 100 | Serbán max. 6 m |
| Magasság (alsó él) | 2200 | 3000 | 50 | Ximax 296–307 cm teljes |
| Oszlopok száma | 2 | 6 | – | `[B]` szélességből számolva |
| Tető hajlás | 3° | 10° | 1° | `[B]` |
| Tetőtípus | polikarbonát 16 mm / szendvicspanel 30 mm / trapézlemez | | | |
| Szín | RAL 7016, 7001, 9005, 9007, 9016 | | | |
| Falhoz csatlakozó | igen / nem | | | |

Tiltó szabályok:
- Mélység > 6000 vagy szélesség > 8000 ⇒ nem rendelhető (gyártói felső határ).
- Hóteher > 120 kg/m² ⇒ csak statikai ellenőrzéssel, egyedi (Serbán 120).
- Oszlop nélküli fesztáv `[B]` > ~5000 mm ⇒ plusz oszlop javaslata (Ximax Typ 110: 3 oszlop).
- Alapterület < 50 m², nyitott, nem lakóépület ⇒ nem építési engedélyköteles (Serbán) – figyelmeztetés a felhasználónak.

Árazási modell: **m²-alapú alapár + tetőtípus-felár + opciók** (ármátrix szélesség × mélység a Ximax-szerű szabványméretekhez, folyamatos m²-ár az egyedi gyártóknál). Az m²-ár innen levezethető: Serbán 3 × 5 m ⇒ 15 m² és 5 513 EUR; Gazebo 5 × 4 m ⇒ 20 m² és 7 890 EUR (≈ 368–395 EUR/m² nettó). Nagyobb méretnél csökkenő m²-ár `[B]`.

### 4.2 Kerítés és kapu

| Paraméter | Min | Max | Lépés | Megjegyzés |
|---|---|---|---|---|
| Kerítés teljes hossza | 1000 | – | 10 | fm-alapú |
| Magasság | 900 | 2000 | 100 | alu: 20 × 120 lamella; WPC: 1930 mm oszlop |
| Anyag | alu lamella / WPC / acél panel | | | |
| Lamella széles­ség | 40, 60, 80, 100, 120, 160 (alu); 140, 145, 169 (WPC) | | | |
| Oszlop | 50 × 60, 70 × 70, 80 × 80 (alu); 120 × 120 (WPC) | | | |
| Oszlop-osztás | 1850 | 2500 | 50 | `[B]` |
| Kapu típus | kétszárnyú / tolókapu / kiskapu | | | |
| Kapu szélesség | 1000 (kiskapu) | 5000 (kétszárnyú) / 6000 (toló) | 100 | |
| Lábazat | nincs / 400 mm elem | | | |

Tiltó szabályok:
- Kétszárnyú kapu > 5000 mm nyílás vagy > 2000 mm magas ⇒ nem rendelhető (Nívó).
- Kiskapu fahatású kerettel ≤ 1300 mm széles.
- Tolókapu motor kiválasztása: motorsúly-határ (500 / 600 / 800 / 1700 / 2500 kg) a kapu tömegéhez; a kapu tömegét a modell számolja `[B]`.
- A kétszárnyú kapu 3 m feletti szárnyánál motor ajánlott `[B]`.

Árazási modell: **fm-ár (kerítés = elem + oszlop/osztás) + darabár (kapu, motor, kiskapu)**. A WPC és az Umakov lamella ára már darabra adott (hosszúság szerinti tétel), ezért tételes összeadás a legpontosabb.

### 4.3 Garázskapu

| Paraméter | Érték |
|---|---|
| Szélesség | 2250–6000 mm; szabvány: 2250, 2375, 2500, 2625, 2750, 3000, … 5500, 6000 (lépés 125/250) |
| Magasság | 1875–3000 mm, 125 mm lépésben |
| Panel | 42 mm (LPU 42) / 67 mm (Thermo) / 40 mm (Wiśniowski UniPro) |
| Mintázat | S / M / L-bordás; sima (Planar/Silkgrain) |
| Felület | Woodgrain, Sandgrain, Silkgrain, Decograin |
| Szín | 15 előre választott RAL + szabad RAL (felárral) |
| Ablak | 0–3 db panelenként, 510 × 330 mm |
| Működtetés | kézi / ProLift / DuraMatic / ProMatic 4 / SupraMatic E 4 |
| Személybejáró ajtó | igen/nem (min. ProMatic 4) |

Tiltó szabályok:
- Szélesség > 6000 vagy magasság > 3000 mm ⇒ nem rendelhető (LPU 42).
- Z-sín: max. 4000 × 2625 mm; ennél nagyobb ⇒ N vagy L sín.
- Motor: az alsó osztály max. 5500 mm / 13,75 m², a felső max. 6000 mm / 15 m² (típusbesorolás gyártótól megerősítendő).
- Szemöldök < 115 mm (motorral) ⇒ nem építhető be szabványsínnel (alacsony szemöldökű L-sín); oldalhely < 90 mm ⇒ speciális oldalrögzítő szett (+18 990 Ft).
- Belső szélesség ≥ LZ + 180 mm.
- Benyúlás: motorral 3450 mm szabad hossz.
- Személybejáró ajtó: motor kötelező (ProMatic 4-től).

Árazási modell: **ármátrix (szélesség × magasság) a gyártói kínálat egy panelcsaládjára, plusz tételes felárak** (motor, ablak, szín, ajtó). A magyar webshopok méretenként "-tól" árat adnak, tehát az ármátrix természetes.

---

## 5. Hiányzó adatok (gyártótól kell kérni)

**Carport**
1. Oszlop- és gerendaprofil keresztmetszet (mm), falvastagság, anyagminőség.
2. Max. fesztáv oszlop nélkül, oszlopszám a méret függvényében; statikai táblázat hótehernél (hózónánként).
3. Hajlásszög, üvegtető opció, trapézlemez vastagsága.
4. HUF-os nettó/bruttó árlista méretmátrixszal; telepítési díj külön; alapozás (pontalap) költsége.
5. Magyar hózóna-osztály szerinti hivatalos teherbírás-igazolás (MSZ EN 1991-1-3).

**Kerítés és kapu**
1. Osztás (oszloptávolság), lamellaköz, rendelhető panelhosszak és -magasságok táblázata.
2. Lábazat-megoldások (beton lábazat, alu lábazati elem) méretei és árai.
3. Fm-árlista alu, WPC, acél rendszerekre telepítéssel és anélkül; telepítési díj (Ft/fm, Ft/kapu).
4. Kapu: tömeg/fm, tolókapu max. szélesség motor nélkül és motorral, motor típuslista a kapuhoz.
5. Nívó árlista (csak egyedi ajánlat); Umakov kétszárnyú kapu ára; WPC telepítési PDF (nem sikerült kiolvasni).

**Garázskapu**
1. Hörmann Magyarország aktuális árlistája, 2026-os katalógus és szabványméret-táblázat (a használt katalógus 2018-as).
2. Wiśniowski, Krispol, Ryterna, Novoferm magyar forgalmazói és HUF-árlistája; kazettás panel kínálat.
3. Szellőző opciók, ablakméretek más gyártóknál.
4. Sommer, Nice, Alutech motorok típusai és árai.
5. Billenő és redőny garázskapu: nyílásméretek, szemöldök/oldalhely, árak (nem lett összegyűjtve).
6. Telepítési díj gyártói/forgalmazói szinten (jelenleg "egyedi ajánlat").
