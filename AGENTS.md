# Lamelix – szabályok kódoló ágenseknek

Fehér címkés 3D pergola-konfigurátor gyártóknak. Éles: https://lamelix.vercel.app/ (a `main` automatikusan élesedik).

## Stack
React 19, Vite 7, react-three-fiber/three/drei, react-router 7, zod, vitest. Szerver: `api/*.ts` (Vercel Edge) → `server/*.ts`. Adat: Supabase REST. E-mail: Resend.

## Kapu (minden munka előfeltétele, a beadás előtt zöld kell)
```
npm run lint && npm run check && npm test && npm run build
```
Ha bármelyik piros, a munka nincs kész. Ne kapcsold ki a lint-/típus-/tesztszabályokat, ne töröld a tesztet a zöld kedvéért.

## Szabályok
1. Egy feladat = egy kis, külön commit. Üzenet magyarul, a `docs/VALTOZASOK.md`-be rövid bejegyzés.
2. Minden új viselkedéshez teszt a `tests/` alatt. Hibajavításnál előbb a hibát bemutató teszt.
3. Ne ígérj többet a szövegekben, mint amit a kód ténylegesen tud (volt már ilyen hiba). Becsült érték mindig „becsült”.
4. Adatvédelem: új személyes adat gyűjtése csak hozzájárulással és a `src/lib/privacyVersion.ts` frissítésével.
5. Titkot (kulcs, token) soha ne írj a repóba. Az `.env` nem része a commitnak.
6. Ne nyúlj a `public/demo/sb400-live.html` fájlhoz (külső, módosítatlan demó).
7. Vizuális minőséget rontó változtatás (textúra-tömörítés, árnyék) csak jóváhagyással; ilyenkor kérdezz.
8. Ha a feladat célja nem egyértelmű, ne találgass: írd le a kérdést és állj meg.
9. Ne telepíts új függőséget indoklás nélkül; a csomagot írd le a commit üzenetben.

## Skillek (lépésenkénti útmutatók)
A `.claude/skills/` alatt; a Claude Code natívan, az OpenCode kompatibilitási forrásként olvassa. Ha egy feladat illik rájuk, töltsd be és kövesd:
- `lamelix-workflow` – kapu, tesztek, `VALTOZASOK.md` bejegyzés, commit, push, Vercel deploy ellenőrzése (minden beadásnál).
- `lamelix-edge-imports` – az `api/`/`server/` felől elérhető kódban érték-import csak relatív úton (a `@/` alias az Edge-ben nem működik); `tests/edge-imports.test.ts` bejárja az importgráfot.
- `lamelix-add-roof-type` – új tetőtípus minden érintési pontja (a fordító csak egy részüket jelzi).
- `lamelix-add-furniture-set` – új bútor- vagy használati csomag; tilos az egyforma készletek klónozása.

## Hol mi van
Admin: `src/pages/Admin*.tsx`, `src/components/admin/`. Árazás/tenant: `src/tenants/`, `contracts/`. Lead: `server/lead.ts`, `server/demoRequest.ts`. SEO: `vite.config.ts`, `contracts/seo.ts`. Teendők: `docs/AGENT-BACKLOG.md`.
