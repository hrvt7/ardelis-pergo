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
| `?ar=1` | Telefonon azonnal az AR-ablakot nyitja (a QR-kód ilyen linket ad) |
| `?effects=0` | Kikapcsolja az asztali utófeldolgozást (hibakereséshez) |

## Indítás helyben

```bash
npm install
cp .env.example .env     # kulcsok nélkül is fut: a lead ilyenkor csak a konzolra íródik
npm run dev              # http://localhost:3000
```

Ellenőrzések: `npm run check` (TypeScript), `npm run lint`, `npm test`, `npm run build`.

## Kattintható előnézet

`npm run build:preview` egy aloldalról is futó változatot készít a `dist-preview/` mappába
(belső útválasztás, szimulált ajánlatkérés). Kezdőnézet: `?route=/` a főoldal,
alapból a konfigurátor nyílik.

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
src/lib/            árazás, rögzítési módok (mount.ts), PDF, megosztó link, AR-export, specifikáció
server/lead.ts      érdeklődő fogadása: ellenőrzés, ár újraszámolása, e-mail, mentés
api/lead.ts         Vercel Edge függvény → server/lead.ts
server/dev.ts       helyi /api a `npm run dev` alatt
tests/              árazás-, szabály- és lead-végpont tesztek
_marketplace/       félretett piactér-réteg (nem része a buildnek)
_unused_assets/     használaton kívüli 3D/HDR fájlok (nem töltődnek le)
public/vendor/      model-viewer 4.4.0 (Google, Apache-2.0) az AR-hez, csak igény szerint töltődik
```

## Biztonság és adatkezelés

- Az árat a szerver a gyártó árlistájából **újraszámolja**; a böngészőből érkező összeg nem számít.
- A rejtett mezős és időzítéses robotszűrő a robotot „sikerrel” engedi el, de semmit nem küld ki.
- A Supabase-kulcs csak szerveroldali; a tábla RLS-sel zárt.
- Éles gyártónál kötelező a `brand.privacyUrl` (adatkezelési tájékoztató), mert az űrlap személyes adatot gyűjt.

## AR (kiterjesztett valóság)

- iPhone/iPad: Safari, iOS 15+ (Apple AR Quick Look). Android: Chrome ARCore-támogatott telefonon (WebXR).
- Asztali gépen QR-kódot mutat; a telefon ugyanazt a konfigurációt nyitja meg.
- Élesítés után **valódi iPhone-on és Android-telefonon is próbáld ki** — a böngészős
  tesztkörnyezet az AR-munkamenetet nem tudja elindítani (a modell-exportot és a
  betöltést igen, ezek ellenőrizve vannak).
