# Hol lehet még magasabb szintre emelni?

> Elkészült a 2. körben: rögzítési módok (sarok, fülke), utófeldolgozás, AR, rövid megosztó link.

Prioritás szerint: előbb ami az első fizető gyártóhoz kell, utána ami a havidíjat
és a megtartást indokolja. A becslések egy ember, AI-asszisztált munkájára szólnak.

## A. Az első eladás előtt (kötelező)

| # | Teendő | Miért | Munka |
|---|---|---|---|
| 1 | Domain + Resend domain-hitelesítés, egy teszt-lead a saját címedre | Enélkül élesben nem megy ki e-mail | 1 óra |
| 2 | Adatkezelési tájékoztató (demó + gyártói sablon) | Az űrlap személyes adatot gyűjt (GDPR); a gyártó is kérdezni fogja | fél nap |
| 3 | B2B bemutatóoldal neked („Konfigurátor pergolagyártóknak”) | A mostani nyitóoldal lakossági ügyfélnek szól; a gyártónak árat, menetet és demót kell látnia | 1 nap |
| 4 | **Ármátrix-támogatás** | A gyártók árlistája jellemzően méretlépcsős táblázat (szélesség × mélység), nem m²-ár. Enélkül az első valós gyártó árait nem tudod pontosan betölteni | 1–2 nap |

## B. Ami miatt havidíjat lehet kérni

| # | Teendő | Miért | Munka |
|---|---|---|---|
| 5 | Német nyelv + EUR + osztrák ÁFA | Osztrák gyártók; most minden szöveg be van égetve a komponensekbe, és csak HUF van | 2–3 nap |
| 6 | Gyártói lead-felület (Supabase Auth): lista, státusz, CSV-export | Ez teszi a terméket „rendszerré” a sima e-mail helyett, és ez indokolja a havidíjat | 2–3 nap |
| 7 | Havi riport a gyártónak (megnyitás → lépések → PDF → lead) | Ha a gyártó látja, hány érdeklődőt hozott, nem mondja le | 1–2 nap |
| 8 | Gyártónkénti 3D-paraméterek (oszlopvastagság, gerendamagasság, lamellaosztás, motorház) | Most minden gyártó pergolája ugyanúgy néz ki. „A te termékedet látja a vevő” — ez a legerősebb eladási érv | 3–5 nap |
| 9 | Időpontfoglalás a lead után (Cal.com/Calendly link a gyártótól) | Gyorsabb felmérés, magasabb konverzió | fél nap |

## C. Teljesítmény (a látvány engedélyeddel érinthető)

Mobilon az első betöltés most kb. 13–14 MB (korábban ~19 MB). További lehetőségek:

- Fa-, bokor- és deszkatextúrák KTX2/WebP formátumban, mobilon 1K-s deszkatextúrával: kb. −5 MB.
- Kisebb HDR mobilon (1,4 MB → ~0,4 MB).
- A JS-be ágyazott, 350 KB-os fűtextúra kisebb JPG-vé alakítása.

Cél: 5–6 MB mobilon. Ez minimálisan érintheti a képi minőséget, ezért nem nyúltam hozzá.

## D. Második termékcsalád

A kódban már van egy rejtett katalógus-stúdió (carport, előtető, kerítés, kapu),
saját 3D-jelenettel és árazással (`CatalogStudio.tsx`). Ezt a gyártói rendszerre
kötni 1–2 nap. Így ugyanannak a gyártónak több terméket adhatsz el, vagy
kapu- és kerítésgyártókat is megcélozhatsz ugyanazzal a motorral.

## E. Kisebb technikai adósság

- Szerveroldali SEO-meta (a Kimi-szerverrel együtt megszűnt): a demó nyitóoldalnál
  számít, a gyártói oldalak úgyis noindexek. Később előrenderelés (prerender).
- Erősebb spamvédelem a `/api/lead`-en (Vercel Firewall rate limit), ha
  megjelenik a spam.
- A nyitóoldal és a stúdió arculata eltér (arany/talpas és lime). Ez designkérdés,
  döntsd el, melyik maradjon.

## F. Látvány — következő lépcső

- **Lamellaárnyék a teraszon**: a napszak és a lamellaszög szerint mozgó csíkos árnyék
  (finomabb árnyéktérkép a pergola körül). ½ nap.
- **Valódi profil-keresztmetszetek** a Részlet nézethez (gyártónként): motorház,
  véglezáró, talplemez. 1–2 nap.
- **Választható ház és környezet** (lapostetős, nyeregtetős, csak terasz). 1 nap.
- **Nagy felbontású „fotó” render** (2–4K) a PDF-be és közösségi formátumban. ½ nap.
