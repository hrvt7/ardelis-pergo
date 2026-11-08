// Demó-adatok az adminhoz: valósághű, de kitalált érdeklődők, hogy a felület bemutatáskor és élesítés előtt is élőnek látsszon.
// Az adatok determinisztikusak (rögzített mag), a dátumok a „mához” igazodnak. Soha nem kerülnek a szerverre.
import type { LeadRow } from '@/lib/adminLeads'
import type { EventRow } from '@/lib/adminStats'

const DAY = 86_400_000
const HOUR = 3_600_000

const PEOPLE: [string, string, string, string][] = [
  ['Kovács Péter', 'Sárvár', 'Vas', '9600'], ['Nagy Anna', 'Győr', 'Győr-Moson-Sopron', '9021'], ['Szabó Gergely', 'Szombathely', 'Vas', '9700'],
  ['Tóth Eszter', 'Veszprém', 'Veszprém', '8200'], ['Horváth Dávid', 'Zalaegerszeg', 'Zala', '8900'], ['Varga Katalin', 'Sopron', 'Győr-Moson-Sopron', '9400'],
  ['Kiss Balázs', 'Székesfehérvár', 'Fejér', '8000'], ['Molnár Réka', 'Budapest XII.', 'Budapest', '1126'], ['Németh Zoltán', 'Pécs', 'Baranya', '7621'],
  ['Farkas Júlia', 'Kaposvár', 'Somogy', '7400'], ['Balogh Tamás', 'Debrecen', 'Hajdú-Bihar', '4025'], ['Papp Nóra', 'Budaörs', 'Pest', '2040'],
  ['Takács Ádám', 'Tatabánya', 'Komárom-Esztergom', '2800'], ['Juhász Petra', 'Keszthely', 'Zala', '8360'], ['Mészáros László', 'Mosonmagyaróvár', 'Győr-Moson-Sopron', '9200'],
  ['Simon Orsolya', 'Szentendre', 'Pest', '2000'], ['Rácz Bence', 'Nagykanizsa', 'Zala', '8800'], ['Fekete Anikó', 'Siófok', 'Somogy', '8600'],
  ['Szilágyi Márk', 'Eger', 'Heves', '3300'], ['Török Zsófia', 'Gödöllő', 'Pest', '2100'], ['Oláh Gábor', 'Kecskemét', 'Bács-Kiskun', '6000'],
  ['Gál Lilla', 'Zalaegerszeg', 'Zala', '8900'], ['Lakatos Dániel', 'Szolnok', 'Jász-Nagykun-Szolnok', '5000'], ['Máté Viktória', 'Győr', 'Győr-Moson-Sopron', '9022'],
  ['Pintér Attila', 'Sárvár', 'Vas', '9600'], ['Szűcs Boglárka', 'Budapest XIV.', 'Budapest', '1144'], ['Vincze Norbert', 'Celldömölk', 'Vas', '9500'], ['Boros Fanni', 'Pápa', 'Veszprém', '8500'],
]
const ROOFS = ['louvered', 'louvered', 'louvered', 'glass', 'glass', 'retractable', 'fabric', 'polycarbonate', 'fixed']
const NOTES = ['Hétvégén érek rá, délután hívjon.', 'A kertben egy fa van a terasz mellett, azt is nézzék meg.', 'Új építésű ház, a terasz még burkolat nélkül.', 'Télikertként is érdekel, tudnak kombinálni?', null, null, null, 'Oldalfalat is kérnék, ajtóval.', null]

/** Kis determinisztikus véletlenszám-generátor, hogy minden betöltéskor ugyanaz legyen a minta. */
function rng(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647 }

export function demoLeads(now: number): LeadRow[] {
  const next = rng(42)
  return PEOPLE.map(([name, city, region, zip], index): LeadRow => {
    // Az újabb érdeklődők kerülnek előre; egy-két érdeklődő a mai napra esik.
    const age = index < 3 ? (index + 1) * 2.2 * HOUR : (index * 1.05 + next() * 0.9) * DAY
    const width = [4, 4.5, 5, 6, 6, 7][Math.floor(next() * 6)]
    const depth = [3, 3.5, 4, 4, 5][Math.floor(next() * 5)]
    const roof = ROOFS[Math.floor(next() * ROOFS.length)]
    const gross = Math.round((width * depth * (roof === 'glass' ? 410_000 : roof === 'fixed' ? 250_000 : roof === 'fabric' ? 330_000 : 380_000) * (1 + next() * 0.35)) / 1000) * 1000
    // Státusz: az új érdeklődők „Új”, a régebbiek a csatornán előrébb tartanak.
    const status = index < 6 ? 'new' : index < 12 ? 'contacted' : index < 18 ? 'offered' : index < 25 ? (next() < 0.75 ? 'won' : 'lost') : 'lost'
    const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '.')
    return {
      ref: `DEMO-${String(1040 - index).padStart(4, '0')}`,
      customer_name: name,
      email: `${slug}@pelda.hu`,
      phone: `+36 30 ${String(100 + index * 37).slice(0, 3)} ${String(1000 + index * 211).slice(0, 4)}`,
      postal_code: zip, city, region, address: null,
      notes: NOTES[index % NOTES.length],
      estimate_gross: gross,
      config_url: '/konfigurator',
      status, source: 'konfigurator',
      created_at: new Date(now - age).toISOString(),
      config: { roof, width, depth },
      owner_note: index === 7 ? 'Hétfőn visszahívni, az ajánlatot már elküldtük.' : null,
      // Viselkedési jelek: a minta érdeklődők egy része forró (PDF + visszatérés), más része csak benézett.
      engagement: index % 5 === 4 ? null : { pdf: index % 3 === 0, ar: index % 4 === 1, share: index % 6 === 2, saved: index % 7 === 3, steps: 3 + (index % 4), visits: index % 3 === 0 ? 2 : 1, minutes: 2 + (index % 9) },
      // Automatikus utánkövetés: a 3 napnál régebbi, nyitott érdeklődők már kaptak emlékeztetőt; az egy hétnél régebbi „Új” leadekről jelzés is ment.
      followup_sent_at: age > 3 * DAY && ['new', 'contacted'].includes(status) ? new Date(now - age + 3 * DAY).toISOString() : null,
      reminder_sent_at: age > 7 * DAY && status === 'new' ? new Date(now - age + 7 * DAY).toISOString() : null,
    }
  })
}

/** Tölcsér-adatok: reális látogatottság a demó érdeklődők mellé. */
export function demoEvents(now: number): EventRow[] {
  const next = rng(7)
  const rows: EventRow[] = []
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now - i * DAY).toISOString().slice(0, 10)
    const open = Math.round(40 + next() * 30 + (29 - i) * 0.6)
    rows.push({ day, name: 'open', count: open })
    rows.push({ day, name: 'configure', count: Math.round(open * (0.62 + next() * 0.08)) })
    rows.push({ day, name: 'lead_view', count: Math.round(open * (0.14 + next() * 0.04)) })
    rows.push({ day, name: 'lead_start', count: Math.round(open * (0.08 + next() * 0.03)) })
  }
  return rows
}

const INCOMING: [string, string, string, string][] = [['Bakos Imre', 'Zalaegerszeg', 'Zala', '8900'], ['Lukács Dóra', 'Szombathely', 'Vas', '9700'], ['Hegedűs Áron', 'Győr', 'Győr-Moson-Sopron', '9024'], ['Kerekes Mária', 'Veszprém', 'Veszprém', '8200']]

/** A demó „élő” értesítéséhez: egy újabb, kitalált érdeklődő. */
export function demoIncoming(now: number, step: number): LeadRow {
  const [name, city, region, zip] = INCOMING[step % INCOMING.length]
  const width = [5, 6, 4.5][step % 3]
  const depth = [4, 3.5, 4][step % 3]
  return {
    ref: `DEMO-${String(1100 + step)}`, customer_name: name, email: `${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '.')}@pelda.hu`,
    phone: `+36 20 555 ${String(1200 + step * 17).slice(0, 4)}`, postal_code: zip, city, region, address: null, notes: null,
    estimate_gross: Math.round((width * depth * 395_000) / 1000) * 1000, config_url: '/konfigurator', status: 'new', source: 'konfigurator',
    created_at: new Date(now).toISOString(), config: { roof: 'louvered', width, depth }, owner_note: null,
  }
}
