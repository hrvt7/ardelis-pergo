---
name: lamelix-add-roof-type
description: Lépésenkénti ellenőrzőlista új tetőtípus (RoofType) felvételéhez a Lamelix konfigurátorba – típus, ROOF_INFO, árkulcs, zod-séma, tenantok, 3D, rajz, tanácsadó, épületszabályok, tesztek. Használd, ha új tetőrendszert, tetőt vagy roof type-ot kell hozzáadni, átnevezni vagy kivezetni.
---

# Új tetőtípus felvétele

A tetőtípus egyetlen igazságforrása az `src/lib/roofs.ts` (`ROOF_TYPES`, `ROOF_INFO`). A legtöbb hely innen olvas, de a lenti listán szereplő helyeket kézzel kell bővíteni. Egy kihagyott pont vagy típushibát ad (jó), vagy csendben hibás árat, linket vagy 3D-t (rossz). Ezért menj végig mindegyiken.

Példa az alábbiakban: új `pergolux` típus, `perPergoluxM2Net` árkulccsal.

**Mit kényszerít ki a fordító és mit nem (kipróbálva):** a `RoofType` bővítése után a `tsc` csak három helyen jelez: `src/lib/roofs.ts` (`ROOF_INFO`), `src/lib/drawing.ts` (felirat) és `src/pages/AdminPage.tsx` (a `rules.ts` ármátrix-sémáján keresztül). A `rules.ts` `z.enum` listája, a 3D, az ikon, a tanácsadó és az épületszabályok **csendben** kimaradnak. Ilyenkor a link vagy a lead parse-olása elutasítja az új tetőt, vagy nincs mit kirajzolni. Ezért ne a fordítóra hagyatkozz, menj végig a teljes listán.

## 1. Típus és adat

| Fájl | Teendő |
|---|---|
| `src/types/pergola.ts` | `RoofType` unióhoz add hozzá; `PriceSettings`-hez az új `…PerM2Net: number` mező. |
| `src/lib/roofs.ts` | `ROOF_TYPES` tömb; `ROOF_INFO` bejegyzés; a `priceKey` típus `Pick<…>` uniójába az új kulcs. |
| `src/lib/pricing.ts` | Alapár a `DEFAULT_PRICES` objektumban. |
| `src/tenants/rules.ts` | `roof: z.enum([...])`; az ármátrix-séma (`<típus>: z.array(matrixPointSchema)…`); az árséma (`…PerM2Net: z.number()…default(…)`). |
| `src/tenants/demo.ts` | `prices` új kulcs; `roofs` bejegyzés (gyártói név, rövid leírás, leírás). |
| `src/tenants/_sablon.ts` | A megjegyzésben a tetőtípus-lista. |

### `ROOF_INFO` mezők – kötelező szabályok

- `share`: **egy karakter**, amit egyik másik típus sem használ, és amit **soha nem szabad megváltoztatni** – a már kiküldött megosztó linkek ezzel kódolják a tetőt (`src/lib/shareCode.ts`). Foglaltak: `l r t g p f`.
- `spec`: kétbetűs kód a termékkódban (`PG-<spec>-…`), egyedi. Foglaltak: `AE GL TX GS PC LN`.
- `motion`: `'tilt' | 'slide' | 'none'`. Mozgatható tetőnél `control` felirat is kell; ehhez kötődik a csúszka, az esőautomatika és a szél.
- `shade`, `rain`, `light`, `description`: a vásárlónak szóló szöveg. Csak azt állítsd, amit a termék valóban tud (AGENTS.md 3. szabály).
- `value`: a költségkeret-tervező súlya (nagyobb = értékesebb).

## 2. Viselkedés és megjelenés

| Fájl | Teendő |
|---|---|
| `src/components/PergolaScene.tsx` | A tető renderelése (`roof === '…'` ágak a tetőkomponensnél), és az `ExplodePart` felirat. Ha üvegszerű, nézd meg az `isGlazedRoof` ágat. |
| `src/lib/roofs.ts` | `isGlazedRoof`, `glazingOptions` – kell-e burkolatválasztás. |
| `src/lib/drawing.ts` | A műszaki rajz tető-feliratának térképe (`{ louvered: …, … }[roof]`); a `tsc` jelez, ha hiányzik a kulcs. |
| `src/components/ConfiguratorControls.tsx` | A tetőkártya SVG-ikonja (`roof === '…'` ágak). |
| `src/lib/advisor.ts` | `roofPreference` listák és a `CHEAPER` térkép – hova illik a tanácsadóban. |
| `src/lib/buildings.ts` | Melyik építménytípus (veranda, télikert) engedi; `buildingPatch` tető-kényszerei. |
| `src/lib/adminDemo.ts` | Opcionális: minta-leadek eloszlása az admin demóban. |

Az admin felület (`AdminPage.tsx`, `PriceMatrixEditor.tsx`, `AdminLeads.tsx`, `AdminOverview.tsx`) és a szerveroldali ár-újraszámolás a `ROOF_TYPES`/`ROOF_INFO`-ból dolgozik, ott általában nincs teendő. Ellenőrizd ennek ellenére az admin árszerkesztőben, hogy megjelenik-e.

## 3. Tesztek

- `tests/roofs.test.ts`: a típusszám („mind a 6 típus”), egyedi `share`/`spec`, saját m²-ár, link oda-vissza, termékkód, anyaglista. Frissítsd a számot és futtasd.
- `tests/roofRoundtrip.test.ts`: minden tetőpár A → B → A váltása és a link. Automatikusan kiterjed az új típusra.
- Ha a tető mozgatható vagy burkolatos, írj tesztet az erre vonatkozó normalizálásra (`normalizeConfig`).

## 4. Ellenőrzés

1. Kapu és changelog: `lamelix-workflow` skill.
2. Mivel `src/lib` és `src/tenants` változott: `lamelix-edge-imports` (a szerver ezeket is behúzza).
3. Kézi vagy böngészős próba: a tetőkártya megjelenik, a 3D és az ár változik, a megosztó link visszaadja a típust, a veranda/télikert váltás oda-vissza helyes.

## Kivezetés, átnevezés

A `share` karaktert és a `RoofType` azonosítót ne használd újra és ne nevezd át: régi linkek és mentett leadek hivatkoznak rájuk. Átnevezésnél csak a megjelenített nevet (`name`, `short`, gyártói `roofs` bejegyzés) változtasd. Kivezetésnél a tenant `roofs` listájából vedd ki, és a parse-olásnál maradjon olvasható.
