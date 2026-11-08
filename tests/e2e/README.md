# Böngészős (E2E) ellenőrzések

Playwright-szkriptek; a `vitest` nem futtatja őket. Előtte: `npm run build && npx vite preview --port 4173`
(a lead-űrlaphoz `npx vite --port 5173`, mert ott fut az API).

- `qa1.cjs` — lépések, méretmezők, rögzítés, tető, presetek, szín, oldalak, extrák, visszavonás, PDF, megosztó link oda-vissza, dialógusok, bemutató mód, kameranézetek
- `qa2.cjs http://127.0.0.1:5173` — ajánlatkérő űrlap: kötelező mezők, telefonszám/e-mail ellenőrzés, hibaüzenet, sikeres beküldés
- `qa3.cjs` — Ctrl+Z/Y, árnyékelemzés szélsőséges bemenetekkel, költségkeret szélsőértékekkel, esti hangulat, AR, útvonalak, mobil túllógás 320/375/414 px
- `sweep.cjs 4173` — minden rögzítési mód × 5 nézet × nappal/éjszaka: nincs üres/fekete kép, nincs konzolhiba
- `invariants.cjs [desk|phone] [url]` — minden lépés minden gombja/legördülője/csúszkája/számmezője, és mindegyik után: nincs üres InstancedMesh (eltűnt lamellák), nincs NaN a 3D-ben, az ár szám, a fejléc a kiválasztott tetőt mutatja, nincs JS-hiba. `npx vite --port 5199` mellett; a `?debug=1` adja a jelenet-hozzáférést.
