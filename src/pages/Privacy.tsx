import { Link } from 'react-router'
import LamelixLogo from '@/components/LamelixLogo'
import { PRIVACY_VERSION } from '@/lib/privacyVersion'
import { usePageSeo } from '@/lib/usePageSeo'
import '@/legal.css'

// FONTOS: a szöveg a tényleges adatkezelést írja le (lásd server/demoRequest.ts, server/lead.ts). Az adatkezelő
// cégadatai (név, székhely, adószám) a bejegyzett üzemeltető adataival egészítendők ki, és a végleges szöveget jogásszal ajánlott átnézetni.
const CONTACT = import.meta.env.VITE_CONTACT_EMAIL || 'hrvthadam.7@icloud.com'

export default function Privacy() {
  usePageSeo('/adatkezeles')
  return <main className="legal-page">
    <header><Link to="/" aria-label="Lamelix kezdőlap"><LamelixLogo height={26} title={null} tone="onLight" /></Link></header>
    <article>
      <p className="legal-eyebrow">Hatályos: 2026. november 16. · verzió {PRIVACY_VERSION}</p>
      <h1>Adatkezelési tájékoztató</h1>
      <p>Ez a tájékoztató a Lamelix platform (lamelix.vercel.app) adatkezeléseiről szól: a gyártóknak szóló demókérésről, a konfigurátorból küldött felmérési kérelmekről, valamint a felszerelt termékek tulajdonosi oldaláról és az onnan küldött hibabejelentésekről.</p>

      <h2>1. Az adatkezelő</h2>
      <p><b>Demókérés esetén</b> az adatkezelő a Lamelix platform üzemeltetője, elérhetőség: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
      <p><b>Felmérési kérelem esetén</b> (egy gyártó konfigurátorában) az adatkezelő az a gyártó, akinek a kérelmet küldöd; az ő adatai és saját adatkezelési tájékoztatója a konfigurátorban, az űrlap mellett érhető el. A Lamelix ilyenkor adatfeldolgozóként továbbítja és tárolja az adatokat a gyártó megbízásából.</p>
      <p><b>Tulajdonosi oldal és hibabejelentés esetén</b> (a terméken lévő QR-kódról vagy a gyártótól kapott linkről) az adatkezelő a termék gyártója; a Lamelix adatfeldolgozóként tárolja a bejelentést és a fotókat, és értesíti a gyártót.</p>

      <h2>2. Milyen adatokat kezelünk, és mire?</h2>
      <h3>Demókérés</h3>
      <ul>
        <li><b>Adatok:</b> név, cégnév, e-mail-cím, telefonszám (nem kötelező), weboldal (nem kötelező), érdeklődési terület, választott csomag, üzenet; a hozzájárulás időpontja és a tájékoztató verziója.</li>
        <li><b>Cél:</b> a demó egyeztetése, ajánlatadás, kapcsolattartás.</li>
        <li><b>Jogalap:</b> a hozzájárulásod (GDPR 6. cikk (1) a)), amit az űrlap elküldésekor adsz meg, és bármikor visszavonhatsz.</li>
        <li><b>Meddig:</b> az egyeztetés lezárásáig, illetve a hozzájárulás visszavonásáig. Kérésre töröljük.</li>
      </ul>
      <h3>Felmérési kérelem a konfigurátorban</h3>
      <ul>
        <li><b>Adatok:</b> név, e-mail, telefon, cím vagy település és régió, megjegyzés, a megtervezett konfiguráció és az irányár, a hozzájárulás időpontja.</li>
        <li><b>Cél:</b> a helyszíni felmérés és az ajánlat egyeztetése a gyártóval.</li>
        <li><b>Jogalap:</b> a hozzájárulásod, amit a gyártó kezel. A kérelem nem minősül megrendelésnek.</li>
      </ul>
      <h3>Tulajdonosi oldal (digitális termékkönyv)</h3>
      <ul>
        <li><b>Adatok:</b> a felszerelt termék befagyasztott terve, komponensei, a telepítés napja és a garancia lejárata. Az oldal személyes adatot (nevet, címet, telefonszámot, e-mail-címet) nem mutat. A link egy titkos, véletlen azonosító: aki ismeri, megnyithatja, ezért ne tedd közzé.</li>
        <li><b>Cél:</b> a termék adatainak és a garancia állapotának elérése, hibabejelentés, bővítési kérés.</li>
        <li><b>Meddig:</b> a gyártó által beállított megőrzési ideig (alapértelmezés: a telepítéstől számított 120 hónap), utána automatikusan törlődik; a gyártó korábban is törölheti.</li>
      </ul>
      <h3>Hibabejelentés</h3>
      <ul>
        <li><b>Adatok:</b> az érintett komponens, a hiba leírása, legfeljebb 4 fotó, a hozzájárulás időpontja és a tájékoztató verziója. A fotókból a feltöltés előtt eltávolítjuk a helyadatokat (GPS) és a többi beágyazott metaadatot; a képeket nem nyilvános tárhelyen tároljuk, és csak a gyártó nyithatja meg, rövid ideig érvényes linkkel.</li>
        <li><b>Cél:</b> a hiba kivizsgálása és a javítás egyeztetése a gyártóval.</li>
        <li><b>Jogalap:</b> a hozzájárulásod, amit a gyártó kezel; bármikor visszavonhatod.</li>
        <li><b>Meddig:</b> a telepítés törléséig (a gyártó megőrzési ideje vagy kézi törlés); a telepítés törlésekor a bejelentések és a fotók is törlődnek.</li>
      </ul>
      <h3>Névtelen használati mérés</h3>
      <p>A konfigurátor süti nélkül, névtelenül számolja a megnyitásokat és a lépéseket (pl. hány látogató jutott el az űrlapig), hogy a gyártó lássa a konverziót. Egyénre visszavezethető adatot ez nem tartalmaz.</p>

      <h2>3. Kinek adjuk át az adatokat?</h2>
      <p>Az adatokhoz a platform üzemeltetője és a megkeresett gyártó fér hozzá. A működéshez szolgáltatókat veszünk igénybe: tárhely és szerver (Vercel), adatbázis (Supabase), e-mail-küldés (Resend). Ők adatfeldolgozóként, a megbízásunk szerint kezelik az adatokat. Az adataidat marketing célból nem adjuk el és nem adjuk tovább.</p>

      <h2>4. A jogaid</h2>
      <p>Kérheted a hozzáférést, helyesbítést, törlést, az adatkezelés korlátozását és az adathordozhatóságot; tiltakozhatsz, és a hozzájárulásodat bármikor visszavonhatod (a visszavonás nem érinti a korábbi kezelés jogszerűségét). Írj a <a href={`mailto:${CONTACT}`}>{CONTACT}</a> címre; felmérési kérelem esetén a gyártónak is jelezheted. Panasszal a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH, <a href="https://naih.hu" target="_blank" rel="noopener noreferrer">naih.hu</a>) fordulhatsz, vagy bírósághoz.</p>

      <h2>5. Biztonság</h2>
      <p>A kapcsolat titkosított (HTTPS), az adatbázishoz csak a szerver fér hozzá, a visszaélések ellen az űrlapok kéréskorlátozással védettek. A kéréskorlátozáshoz az IP-címet csak rövid ideig, a szerver memóriájában használjuk, nem tároljuk.</p>
    </article>
    <footer><Link to="/">← Vissza a Lamelix oldalára</Link></footer>
  </main>
}
