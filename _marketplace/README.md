# Félretett piactér-réteg (ARDELIS marketplace)

Ez a mappa a korábbi, Kimi platformra épült piactér-funkciókat tartalmazza:
partnerregisztráció, megyei lead-kiosztás, jutalékkezelés, admin felület,
tRPC API, MySQL/Drizzle séma és Kimi OAuth.

A gyártói (white-label) konfigurátor ezek nélkül működik, ezért a kód ki van
véve a buildből (`tsconfig`, `vite`, `vitest` egyik sem látja). Ha később
kivitelezői hálózat épül, innen visszaállítható — de előtte a Kimi OAuth-ot
saját hitelesítésre (pl. Supabase Auth) kell cserélni.
