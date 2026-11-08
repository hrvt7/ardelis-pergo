---
name: lamelix-workflow
description: A Lamelix repó kötelező munkamenete minden kódváltoztatáshoz – kapu (lint, típus, teszt, build), teszt-szabályok, VALTOZASOK.md bejegyzés verziószámmal, commit, push a main-re és a Vercel deploy ellenőrzése. Használd mindig, amikor kódot, tesztet vagy szöveget módosítasz és be akarod adni (commit/push/changelog/deploy), vagy azt kérdezik, kész-e a munka.
---

# Lamelix munkamenet: változtatástól az éles deployig

A `main` minden pusha automatikusan élesedik a https://lamelix.vercel.app/ címen. Ezért a sorrend nem opcionális.

## 1. Indulás előtt

1. `git pull --rebase` – más ügynökök és chatek is commitolnak a main-re.
2. Olvasd el az `AGENTS.md`-t (szabályok, tiltott fájlok, „Hol mi van”).
3. Ha a feladat célja nem egyértelmű: írd le a kérdést és állj meg, ne találgass.

## 2. Teszt a változtatáshoz

- Új viselkedés → új vagy bővített teszt a `tests/` alatt (vitest, `*.test.ts`).
- Hibajavítás → **előbb** a hibát bemutató teszt (piros), utána a javítás (zöld).
- Tesztet zöldre törölni, `skip`-elni, vagy lint-/típusszabályt kikapcsolni tilos.
- Ha a változás érinti az `api/` vagy `server/` felől elérhető kódot, lásd a `lamelix-edge-imports` skillt.

## 3. Kapu (mind zöld, különben a munka nincs kész)

```bash
npm run lint && npm run check && npm test && npm run build
```

`check` = `tsc -b`. Hibánál a hibát javítsd, ne a szabályt.

## 4. Változásnapló – `docs/VALTOZASOK.md`

Az új bejegyzés a `# Változások` cím alá, a legfelső `## ` elé kerül. Verziószám: a legfelső bejegyzés száma + 0,01 (pl. `3.86` → `3.87`). Nézd meg a fájl tetejét közvetlenül a commit előtt: ha közben más is írt bele, az ő száma után folytasd.

Formátum (magyarul, tényszerűen):

```markdown
## 3.87 – Rövid cím arról, mi változott

- **Kiemelt téma:** mit kap a felhasználó vagy a gyártó, egy-két mondatban.
- **Hiba: …** mi volt a tünet, és mi a javítás.
- Tesztek: `fajlnev.test.ts` (mit ellenőriz).
```

Csak azt írd le, amit a kód ténylegesen tud. Becsült értéket „becsült”-nek nevezz (lásd AGENTS.md 3. szabály).

## 5. Commit és push

- Egy feladat = egy kis commit. Az üzenet magyar, a legutóbbi `git log --oneline` stílusát kövesse (jelenleg `feat: …`, `fix: …`, `chore: …` + magyar összefoglaló).
- Új függőségnél a csomag neve és indoka a commit üzenetbe kerül.
- Titok (`.env`, kulcs, token) soha nem kerül a commitba.
- `git pull --rebase && git push` – ha a push elutasul, rebase után újra.

## 6. Deploy ellenőrzése

A push után a Vercel `lamelix` projektje épít (kb. 1–2 perc). Ellenőrizd, hogy az új deployment állapota **READY**:

- Vercel MCP-vel: a projekt legutóbbi deploymentje (`list_deployments`), majd `get_deployment`.
- Ha **ERROR**: olvasd el a build-naplót (`list_deployment_events`, `builds: 1`), javítsd, és ismét a 3. ponttól.

A böngészős build (`npm run build`) nem csomagolja az Edge-függvényeket, ezért helyben zöld kapu mellett is bukhat a Vercel build. A leggyakoribb ok az Edge-import (lásd `lamelix-edge-imports`).

## 7. Beszámoló

Röviden: mi változott, mit ellenőriztél (tesztek száma, kézi vagy böngészős próba), mit **nem** tudtál ellenőrizni, és a deploy állapota. Ne állítsd, hogy élesben működik, amíg a deploy nem READY.
