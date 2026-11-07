import { Link } from 'react-router'
import LamelixLogo from '@/components/LamelixLogo'
import { PRIVACY_VERSION } from '@/lib/privacyVersion'
import { usePageSeo } from '@/lib/usePageSeo'
import '@/legal.css'

// FONTOS: a szöveg a tényleges adatkezelést írja le (lásd server/demoRequest.ts, server/lead.ts). Az adatkezelő
// cégadatai (név, székhely, adószám) a bejegyzett üzemeltető adataival egészítendők ki, és a végleges szöveget jogásszal ajánlott átnézetni.
const CONTACT = import.meta.env.VITE_CONTACT_EMAIL || 'hrvtadam.7@icloud.com'

export default function Privacy() {
  usePageSeo('/adatkezeles')
  return <main className="legal-page">
    <header><Link to="/" aria-label="Lamelix kezdőlap"><LamelixLogo height={26} title={null} /></Link></header>
    <article>
      <p className="legal-eyebrow">Hatályos: 2026. november · verzió {PRIVACY_VERSION}</p>
      <h1>Adatkezelési tájékoztató</h1>
      <p>Ez a tájékoztató a Lamelix platform (lamelix.vercel.app) két adatkezeléséről szól: a gyártóknak szóló demókérésről, és a konfigurátorból küldött felmérési kérelmekről.</p>

      <h2>1. Az adatkezelő</h2>
      <p><b>Demókérés esetén</b> az adatkezelő a Lamelix platform üzemeltetője, elérhetőség: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
      <p><b>Felmérési kérelem esetén</b> (egy gyártó konfigurátorában) az adatkezelő az a gyártó, akinek a kérelmet küldöd; az ő adatai és saját adatkezelési tájékoztatója a konfigurátorban, az űrlap mellett érhető el. A Lamelix ilyenkor adatfeldolgozóként továbbítja és tárolja az adatokat a gyártó megbízásából.</p>

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
