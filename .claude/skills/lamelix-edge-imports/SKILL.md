---
name: lamelix-edge-imports
description: Szabályok a Lamelix api/ és server/ (Vercel Edge) felől elérhető kódhoz – a src/lib, src/tenants és más megosztott modulok importjai. Használd, ha src/lib vagy src/tenants fájlt módosítasz vagy hozol létre, importot adsz hozzá, ha a Vercel deploy „unsupported module” vagy „references unsupported” hibával bukik, vagy ha egy modult a szerver is használ.
---

# Edge-kompatibilis importok (Lamelix)

## A probléma

Az `api/*.ts` Vercel Edge-függvények a `server/*.ts`-t hívják, azok pedig sok `src/` modult húznak be (árazás, tenant-szabályok, link-kód, bútor, épület stb.). A Vercel Edge-csomagolója **nem ismeri a `@/` aliast**. A böngészős `npm run build` ezt nem veszi észre, ezért a hiba csak a Vercel buildben jön elő. Így bukott el a 3.68 deploy (`api/admin-leads` → `src/lib/furniture.ts` → `@/lib/usePacks`).

## Szabály

Minden fájlban, amely az `api/` vagy `server/` felől elérhető (közvetve is):

- **Érték-import csak relatív úton:** `import { packPlan } from './usePacks'`, és nem `from '@/lib/usePacks'`.
- **Típusimport maradhat `@/`-os:** `import type { PergolaConfig } from '@/types/pergola'` (fordításkor eltűnik).
- Vegyes import (`import { x, type Y } from '@/…'`) **érték-importnak számít** – bontsd ketté, vagy tedd relatívvá.
- Böngésző-specifikus API-t (`window`, `document`, `localStorage`) ne használj modul-szinten ezekben a fájlokban. Node-specifikus modult (`fs`, `path`) se, mert az Edge-futtatókörnyezetben nem érhető el.

A csak böngészőben futó komponensek (`src/components/`, `src/pages/`) nyugodtan használhatják a `@/` aliast, amíg a szerver nem importálja őket.

## Ellenőrzés

```bash
npx vitest run tests/edge-imports.test.ts
```

A teszt az `api/` és `server/` fájlokból kiindulva bejárja a teljes importgráfot, és fájlonként listázza a hibás sorokat. Új fájlra vagy importra magától kiterjed, kézi lista nincs. Ha piros, a kimenetben szereplő sort írd át relatívra.

A teszt is a kapu része (`npm test`), de egy `src/lib` módosítás után futtasd külön is, mert ez a hiba helyben nem látszik másképp.

## Ha mégis bukik a Vercelen

1. Build-napló: Vercel MCP `list_deployment_events` (`builds: 1`). Keresd az `unsupported module` vagy `references unsupported` sort, abban a fájl és az import neve áll.
2. Javítsd a szabály szerint, és bővítsd a tesztet, ha olyan esetet talált, amit a bejárás nem fogott meg (pl. dinamikus `import()`).
