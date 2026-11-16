# Nyitóoldal v2 – állapot (2026-11-16)

Lánc: weboldal-hrvt (A típus) → premium-weboldal-uzleti (kutatás, kérdések) → premium-weboldal (építés) → design-loop-hrvt (3 kör) → plusz-ellenőrzés (kontraszt, túlcsordulás, copy-gate).

| Darab | Brief | System | Craft | Kör |
|---|---|---|---|---|
| Héró | FAIL | FAIL | PASS (1. kör) | 3 |
| Középső (kollázs, hét lépés, érvek, előtte–utána, funkciók) | FAIL | FAIL | PASS (1. kör) | 3 |
| Többi (admin, élő demó, folyamat, árak, demó, GYIK, zárás) | FAIL | FAIL | FAIL | 3 |
| Mobil 390×844 | PASS (3. kör) | FAIL | FAIL | 3 |

## Gap-történet (kritikusonként a legnagyobb hiány)
- 1. kör: ragadós „Élő demó” sáv takarta a címeket; GYIK harmonika; árak három egyforma kártyán; a héró nem mondta ki a terméket; szakaszok demókérés nélkül; mobilon a kollázs a szövegre csúszott. → mind javítva (sáv törölve, GYIK beszélgetés, csomagváltó, új eyebrow, CTA-k, mobil eltolás).
- 2. kör: az ár-odométer szövege tört (span-ütközés), a hét lépés gombjának felirata láthatatlan volt, mobilon a fejléc gombja kilógott, a funkciók rácsa és a folyamat csempéi sablonosak, a cím elvont. → javítva (új cím „Pergolák 3D-ben, saját arculattal, a weboldalán.”, funkció-bemutató színpad, idővonal kártyák nélkül, mobilon a 3D a cím után).
- 3. kör (nyitott): a „Miért éri meg?” sáv még ikon+szöveg sor; a funkció-jelenetek a referenciánál ritkásabbak; a héró lead-kártyája csak néhány másodpercig látszik; a folyamat és a megtérülés-kalkulátor után nincs saját demókérő gomb; a mintaadatok (admin KPI) csak lábjegyzetben jelöltek; a kapcsolati e-mail személyes iCloud-cím.

## Plusz-ellenőrzés
- Kontrasztszkenner (asztali + mobil): 0 hiba (az admin cím kiemelése javítva).
- 390 px: nincs vízszintes túlcsordulás.
- Copy-gate: CLEAN.

## Audit 2026-11-16 (4.70) – 1. kör, mind a 12 kritikus FAIL
| Darab | Brief | Rendszer | Kidolgozás |
|---|---|---|---|
| Héró + redőny | FAIL | FAIL | FAIL |
| Közép | FAIL | FAIL | FAIL |
| Vég | FAIL | FAIL | FAIL |
| Mobil | FAIL | FAIL | FAIL |
Részletek és ellenőrzött teendőlista: `AUDIT-2026-11-16.md`.

## 2. kör (4.71 → 4.72 után) – 12/12 FAIL, de szűkebb hibákkal
Javítva a 2. kör után: „Hét lépés” címke a cím sorai között; redőny-címke („A gyártó oldalán”); ár-lap „Példa”; bevezetés az első érvben; becslés jelölve; palettán kívüli zöld a kalkulátorban; béta-pötty; szürke űrlap; inaktív funkciócímek kontrasztja; mobil demó-gombok ütközése.

### Hiánytörténet (gap history)
- 1. kör: az első képernyőn hiányzó érvek; duplán megjelenő űrlap+GYIK; jelöletlen becslés; túlígérés (fotó, generált ajánlat); Vanilla-túlhasználat; nincs közös rács; apró szöveg; palettán kívüli színek; generikus ikonok.
- 2. kör: címke a cím sorai között; „Ön” kétértelmű a redőnyön; a kidolgozás-kritikusok szerint a termék-render lapos (bézs doboz, gyenge fény), a laptop képernyője olvashatatlan méretű, az oldal hosszú és ismétel (két lépés-szakasz, érvek háromszor), az űrlap 8 mezős, a kapcsolat személyes e-mail.

### Nyitott, döntést igénylő pontok
1. A „Hét lépés” 3D-képsorozat újrarenderelése jobb fénnyel és környezettel (nem bézs doboz).
2. Rövidítés: „Négy lépés” vagy „Miért éri meg?” összevonása/elhagyása.
3. Demóűrlap 4 mezőre (Név, Cég, E-mail, Telefon), a többi a demón.
4. Céges kapcsolati e-mail a személyes helyett.
