// A felület nyelvének beállítása az oldal betöltésekor — a main.tsx ELSŐ importja, hogy minden további
// modul (szövegtárak, komponensek) már a jó nyelven jöjjön létre. Lásd src/i18n/locale.ts.
import { getTenant } from '../tenants'
import { setLocale, tenantIdFromPath } from './locale'

if (typeof window !== 'undefined') {
  const id = tenantIdFromPath(window.location.pathname)
  const locale = (id && getTenant(id)?.locale) || 'hu'
  setLocale(locale)
  document.documentElement.lang = locale
}
