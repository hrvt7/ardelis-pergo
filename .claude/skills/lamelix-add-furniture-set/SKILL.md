---
name: lamelix-add-furniture-set
description: Lépésenkénti útmutató új bútorcsomag vagy méretre szabott használati csomag (étterem, nyári konyha, bár, rendezvény stb.) felvételéhez a Lamelix „Mit szeretnél alatta?” választójába – FurnitureSet típus, FURNITURE_SETS, csoportok, usePacks tervező, 3D elemek, ikon, tesztek. Használd, ha új bútort, berendezést, furniture setet vagy use-case csomagot kell hozzáadni vagy módosítani.
---

# Új bútorcsomag felvétele

Kétféle csomag van. Először döntsd el, melyik kell:

| | **Egyszerű csomag** | **Használati csomag (pack)** |
|---|---|---|
| Példa | Pihenősarok, Étkező 6 főre, Jacuzzi | Vegyes terasz, Éttermi terasz, Nyári konyha |
| Elrendezés | Fix elemek egy zónában (`parts`) | A pergola méretéből számolt (`src/lib/usePacks.ts`) |
| Nagy pergolán | Egy példány, vagy rácsban ismétlődik (`repeatable`) | Kitölti a teret, váltakozó elemekkel |

**Tilos a klónozás:** egyforma kanapé-asztal készleteket ne tegyél egymás mellé. Ezt a felhasználó kifejezetten kifogásolta. Kanapét tartalmazó csomag legyen `repeatable: false`. Ha nagy teret kell kitölteni, használati csomagot írj váltakozó zónákkal (minta: `mixed`, `fillRow` és `ZONE_CYCLE` a `usePacks.ts`-ben).

## 1. Közös lépések (mindkét fajtánál)

| Fájl | Teendő |
|---|---|
| `src/types/pergola.ts` | `FurnitureSet` unióba az új azonosító (camelCase). |
| `src/lib/furniture.ts` | `FURNITURE_SETS` bejegyzés: `label`, `people`, `description`, `zone` [hossz, mélység] **mozgástérrel együtt**, `parts`, `seats`, `repeatable`; packnél `pack: { audience }`. |
| `src/lib/furniture.ts` | `FURNITURE_GROUPS`: pontosan egy csoportba (Otthon és pihenés · Konyha és étkezés · Wellness · Vendéglátás és rendezvény). Teszt ellenőrzi, hogy mind benne van, egyszer. |
| `src/components/FurniturePicker.tsx` | `ICONS` térkép: `lucide-react` ikon (a `Record<FurnitureSet, …>` miatt a típusellenőrzés jelez, ha hiányzik). Ellenőrizd, hogy az ikon létezik a telepített verzióban. |

A választó egyetlen rács csoportcímekkel, **külön szekció vagy fül nélkül**. Új csomag ne nyisson új szekciót.

**Mit kényszerít ki a fordító (kipróbálva):** a `FurnitureSet` bővítése után a `tsc` a `FURNITURE_SETS`-nél és az `ICONS`-nál jelez. A csoportba sorolást a `tests/furniture-sets.test.ts` kéri számon, amint a csomag bekerült a `FURNITURE_SETS`-be. A pack-regisztrációt (`PACK_IDS`, `PACK_ORDER`, `packPlan` ág) és a 3D elemeket semmi nem jelzi, ezeket a lenti lista szerint kell pótolni.

## 2a. Egyszerű csomag

- A `parts[].kind` a meglévő 3D elemekből választható: `lounge`, `dining6`, `dining8`, `spa`, `bistro`, `bar`, `sunbed`.
- Új elemfajta kell? Akkor: `FurnitureSpec.parts.kind` uniója; 3D komponens és ág a `PergolaScene.tsx` bútor-renderelésében (`part.kind === '…'`); a „Kanapé” kamera eltolása (`seatPosition`, `local` sor).

## 2b. Használati csomag (pack)

| Fájl | Teendő |
|---|---|
| `src/lib/usePacks.ts` | `PackId` unió és `PACK_IDS`; tervezőfüggvény `(config) => PackPlan`; `packPlan` switch ág. |
| `src/lib/furniture.ts` | `PACK_ORDER` (teszt veti össze a `PACK_IDS`-szal). |
| `src/lib/usePacks.ts` | Új elem (`PackKind`) esetén: unió + `extentOf` méret + 3D komponens a `PergolaScene.tsx` pack-renderelésében (`item.kind === '…'`). |

Tervezési szabályok a `usePacks.ts`-ben:

- Koordináták: `x` a szélesség mentén, `z` a mélység mentén, a hátsó fal `z < 0`, az elemek `+z` felé néznek. `inner(config)` a kerettel csökkentett belső méret.
- Semmi nem lóghat ki a belső területből, és nem lehet átfedés. A bárpult aszimmetrikus: a pult hátul van, a székek előtte.
- `seats` = az elemek ülőhelyeinek összege. `areaPerSeat` és `benchmark` csak ott, ahol a vendéglátós irányérték értelmes, egyébként `null`.
- Szövegek (`notes`, `audience`): tényszerűek. A létszám tervezési irányszám, nem engedélyezett vendégszám (a választó ezt ki is írja).
- **Fájl a szerver importgráfjában:** a `furniture.ts` és a `usePacks.ts` érték-importjai csak relatívak lehetnek (`./usePacks`). Lásd `lamelix-edge-imports`.

## 3. Tesztek

- `tests/furniture-sets.test.ts`: csoport-lefedettség, sorrend.
- `tests/usePacks.test.ts`: `PACK_ORDER` ↔ `PACK_IDS`, illeszkedés.
- `tests/mixedPack.test.ts`: **minta** az új pack geometriai tesztjéhez. 10 méreten: nincs kilógás, nincs átfedés, egy soron belül nincs két egyforma szomszéd, az ülőhelyek összege egyezik. Az új packhez írj ugyanilyet.
- `tests/furnitureLayout.test.ts`: ismétlődés, rácsok.

## 4. Ellenőrzés

1. Kapu és changelog: `lamelix-workflow`.
2. Böngészős próba legalább egy kicsi (pl. 4 × 3,5 m) és egy nagy (7 × 5 m, több modul) pergolán: az elrendezés látszik, a helyigény-panel (ülőhely, m²/fő, javasolt méret) helyes, telefonszélességen nincs vízszintes túllógás.
