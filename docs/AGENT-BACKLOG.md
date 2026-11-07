# Ágens-feladatlista (sorrendben)

Minden feladat: önállóan elvégezhető, teszttel bizonyítható. Becsült költség = API-keret, nem munkaidő. A kapu minden feladatnál: lint + check + test + build.

| # | Feladat | Kész, ha | Becsült keret |
|---|---|---|---|
| 1 | **Ármátrix (szélesség × mélység lépcsők)** gyártói árlistához, a m²-ár mellett | zod-séma + betöltés a tenant-konfigból; ár a legközelebbi felső lépcsőből; határesetek tesztelve (pontosan lépcsőn, lépcső alatt/felett, hiányzó cella); a meglévő m²-áras tenant változatlan | ~12 $ |
| 2 | **Német nyelv + EUR + osztrák ÁFA** a konfigurátorban | hardcode-olt szövegek kulcsokba; HU/DE váltó; pénznem és ÁFA tenant-szinten; formázás tesztelve; semmi magyar szöveg nem maradhat DE módban | ~18 $ |
| 3 | **Gyártónkénti 3D-paraméterek** (oszlop, gerenda, lamellaosztás, motorház) | tenant-konfigból jönnek, alapértelmezett érték változatlan megjelenést ad; validáció korlátokkal; teszt a paraméterek feldolgozására | ~15 $ |
| 4 | **Havi riport a gyártónak** (megnyitás → lépések → PDF → lead), e-mailben | a meglévő „becsült konverzió” címkézés megmarad; riport generálása tesztelt; csak hozzájárult adat szerepel | ~10 $ |
| 5 | **Lamellaárnyék a teraszon** (napszak + lamellaszög) | árnyék mozog a szöggel; mobilon kikapcsolható/egyszerűsített; teljesítményteszt nem romlik | ~8 $ |
| 6 | **Időpontfoglalási link** a lead után (gyártó adja meg) | csak https link fogadható el; megjelenik az összegző e-mailben és az adminban | ~4 $ |
| – | Tartalék / javítási körök | | ~20 $ |

Ami emberi döntést kér: 3D-árnyék/textúra minőség (7. szabály), arculat (arany vs. lime), német jogi szövegek.
