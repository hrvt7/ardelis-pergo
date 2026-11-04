# Új gyártó felvétele

1. **Másold le** a `src/tenants/_sablon.ts` fájlt, pl. `src/tenants/kovacs.ts`.
2. **Töltsd ki:**
   - `id` — az URL-ben látszik (`/k/kovacs`), csak kisbetű, szám, kötőjel;
   - `brand` — név, jogi név, elérhetőség, **adatkezelési tájékoztató URL**;
     logó: tedd a fájlt a `public/tenants/kovacs/logo.svg` helyre, és add meg
     `logoUrl: '/tenants/kovacs/logo.svg'` formában;
   - `prices` — a gyártó **nettó** árai (m²-ár tetőtípusonként, oldalfalak m²-re,
     LED folyóméterre, fűtés darabra, telepítési %, ÁFA);
   - `limits` — gyártható min/max méretek;
   - `roofs`, `sides`, `colors`, `extras`, `mounts` — csak azt sorold fel, amit
     gyárt; ami nincs felsorolva, a konfigurátorban sem jelenik meg.
     Rögzítések: `wall` (falhoz), `corner-left` / `corner-right` (sarokba, L),
     `niche` (fülkébe, U), `freestanding` (önálló);
   - sarok- és fülkerögzítéshez az árlistában: `sideWallAttachPerMeterNet`
     (oldalfali rögzítés, Ft/fm) és `postNet` (egy elmaradó oszlop jóváírása, Ft/db);
   - `lead.recipients` — kik kapják az érdeklődőket.
3. **Vedd fel** az `src/tenants/index.ts` `TENANTS` listájába.
4. `npm run dev`, majd nyisd meg: `http://localhost:3000/k/kovacs`.
   Ellenőrizd az árat egy ismert konfigurációra a gyártó saját kalkulációjával.
5. `npm test && npm run build`, push → Vercel automatikusan kitelepíti.

## Beágyazás a gyártó weboldalába

Ezt a kódot kapja meg a gyártó (a domaint cseréld a sajátodra):

```html
<iframe
  src="https://konfigurator.pelda.hu/embed/kovacs"
  title="Pergola konfigurátor"
  style="width:100%;height:820px;border:0;border-radius:12px"
  loading="lazy"
  allow="fullscreen; clipboard-write; xr-spatial-tracking"
></iframe>
```

Mobilon érdemes a magasságot `100vh`-ra állítani, vagy inkább a `/k/kovacs`
önálló oldalra linkelni egy gombbal. Az AR-gomb beágyazva új lapon, az önálló
oldalon nyitja meg az AR-nézetet.

### Konverziómérés a gyártó oldalán (opcionális)

Sikeres felméréskérés után a konfigurátor üzenetet küld a befoglaló oldalnak
(személyes adat nélkül), amire a gyártó Google Analytics / Meta Pixel eseményt köthet:

```html
<script>
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'pergola:lead') {
      // pl. gtag('event', 'generate_lead', { value: 1 });
      console.log('Új érdeklődő:', event.data.ref);
    }
  });
</script>
```

## Gyártói admin felület (`/k/{gyarto}/admin`)

A gyártó a legfontosabb beállításait (cég- és kapcsolati adatok, lead-címzettek, árak, ármátrix, tetők, oldalfalak,
rögzítések, extrák) maga szerkeszti, kód nélkül. A kódban lévő tenant (pl. `demo.ts`) az **alap**; a mentett
beállítások csak felülírják azt (`src/tenants/overrides.ts`), ami hiányzik, a kódból jön.

Bekapcsolás:
1. Supabase SQL Editor: futtasd a `supabase/tenant_settings.sql` fájlt (a `leads.sql` mellé).
2. Vercel környezeti változók (csak szerveroldal):
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (már a leadekhez is kell),
   - `ADMIN_TOKEN_SECRET` — hosszú, véletlen karakterlánc (a munkamenet-token aláírásához),
   - `ADMIN_PASSWORD_<GYARTO>` — a gyártó jelszava, pl. `ADMIN_PASSWORD_DEMO` (kötőjel helyett `_`, csupa nagybetű).
3. A gyártó a `https://…/k/{gyarto}/admin` címen lép be; csak a saját beállításait látja és módosítja.

Működés: mentés után a konfigurátor (`/api/tenant`) és a szerver (lead, árazás) is azonnal az új adatot használja. A lead-fogadó
e-mail címek nem kerülnek a böngészőbe. Belépési kísérletek korlátozottak, a munkamenet 8 óráig él.
Később a jelszavas belépés Supabase Auth-ra cserélhető (csak `server/tenantAdmin.ts` `authorize`/`login` része változik).
