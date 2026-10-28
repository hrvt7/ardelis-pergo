# Pergola konfigurátor — gyártói (white-label) kiadás

Valós idejű 3D pergola-konfigurátor, amelyet pergolagyártóknak lehet
testreszabva eladni: saját név, logó, termékek, árlista. Az érdeklődő a
konfiguráció után felmérést kér, és ez e-mailben a gyártóhoz kerül.

## Útvonalak

| Útvonal | Mire való |
|---|---|
| `/` | Bemutató nyitóoldal (ARDELIS demó) |
| `/studio/pergola` | A demó konfigurátor — ezt mutatod a gyártóknak |
| `/k/{gyarto}` | Egy gyártó önálló konfigurátor-oldala (hirdetésbe, e-mailbe) |
| `/embed/{gyarto}` | Ugyanez a gyártó saját weboldalába ágyazva (iframe) |
| `?admin=1` | Bármelyikhez: megjelenik az árszerkesztő (csak helyben, bemutatóhoz) |

## Indítás helyben

```bash
npm install
cp .env.example .env     # kulcsok nélkül is fut: a lead ilyenkor csak a konzolra íródik
npm run dev              # http://localhost:3000
```

Ellenőrzések: `npm run check` (TypeScript), `npm run lint`, `npm test`, `npm run build`.

## Élesítés (Vercel)

1. Repó feltöltése GitHubra, importálás Vercelben (a `vercel.json` mindent beállít).
2. Környezeti változók (Settings → Environment Variables), lásd `.env.example`:
   - `RESEND_API_KEY`, `LEAD_FROM_EMAIL` (Resendben hitelesített domain),
   - `LEAD_FALLBACK_EMAIL` — ide mennek a demó érdeklődői,
   - `PUBLIC_SITE_URL` — a saját domain,
   - opcionálisan `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (előtte `supabase/leads.sql`).
3. Élesben, kézbesítés beállítása nélkül az űrlap **hibát ad** (503), nem tesz
   úgy, mintha elküldte volna. Így nem vesznek el csendben érdeklődők.

## Új gyártó felvétele

Lásd [`docs/UJ-GYARTO.md`](docs/UJ-GYARTO.md): nagyjából fél óra, egy fájl.

## Felépítés

```
src/tenants/        gyártói beállítások (demo.ts, _sablon.ts, szabályok)
src/pages/          Home, TenantStudio (útvonalak), PergoStudio (konfigurátor)
src/components/     3D jelenet, vezérlők, árpanel, összegzés, űrlap
src/lib/            árazás, PDF, megosztó link, specifikáció
server/lead.ts      érdeklődő fogadása: ellenőrzés, ár újraszámolása, e-mail, mentés
api/lead.ts         Vercel Edge függvény → server/lead.ts
server/dev.ts       helyi /api a `npm run dev` alatt
tests/              árazás-, szabály- és lead-végpont tesztek
_marketplace/       félretett piactér-réteg (nem része a buildnek)
_unused_assets/     használaton kívüli 3D/HDR fájlok (nem töltődnek le)
```

## Biztonság és adatkezelés

- Az árat a szerver a gyártó árlistájából **újraszámolja**; a böngészőből érkező összeg nem számít.
- A rejtett mezős és időzítéses robotszűrő a robotot „sikerrel” engedi el, de semmit nem küld ki.
- A Supabase-kulcs csak szerveroldali; a tábla RLS-sel zárt.
- Éles gyártónál kötelező a `brand.privacyUrl` (adatkezelési tájékoztató), mert az űrlap személyes adatot gyűjt.
