// Az alkalmazás-oldalak (konfigurátor, admin, ajánlat, belépés, mintaoldal, adatkezelés, 404) közös stílusa és betűi.
// Az App.tsx minden ilyen oldal előtt ezt tölti be, így az index.css mindig az oldal saját stíluslapja ELÉ kerül
// (ugyanaz a kaszkád-sorrend, mint amikor még a belépési pont töltötte). A nyitóoldal nem tölti be.
import '@/index.css'
import '@/appFonts'
