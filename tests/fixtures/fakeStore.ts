// Memóriabeli Supabase-utánzat a szerver-tesztekhez: a PostgREST szűrők (eq, lt, in) valóban szűrnek,
// így a tenant-elkülönítés a kérések tényleges tartalmán múlik, nem a mock válaszain.
// Támogatja: REST select/insert/patch/delete, egyedi kulcsok, kaszkádtörlés, Storage feltöltés/törlés/aláírt link, Resend.
type Row = Record<string, unknown>

const UNIQUE: Record<string, string[][]> = { installations: [['public_token'], ['tenant_id', 'lead_id']] }
/** Az SQL alapértékei (supabase/*.sql), hogy a beszúrt sor ugyanolyan legyen, mint élesben. */
const DEFAULTS: Record<string, Row> = { installations: { status: 'active' }, service_requests: { status: 'new', photo_paths: [], ai_suggestion: null }, leads: { status: 'new' } }
const CASCADE: Record<string, [string, string][]> = { installations: [['service_requests', 'installation_id'], ['installation_events', 'installation_id']] }

export interface FakeStore {
  tables: Record<string, Row[]>
  storage: Map<string, Uint8Array>
  emails: { to: string[]; subject: string; html: string }[]
  calls: { method: string; url: string; body?: string }[]
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
}

const reply = (body: unknown, status = 200) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function matches(row: Row, params: URLSearchParams) {
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue
    const [op, ...rest] = raw.split('.')
    const value = rest.join('.')
    const cell = row[key]
    const text = cell === null || cell === undefined ? 'null' : String(cell)
    if (op === 'eq' && text !== value) return false
    if (op === 'neq' && text === value) return false
    if (op === 'lt' && !(text < value)) return false
    if (op === 'lte' && !(text <= value)) return false
    if (op === 'gte' && !(text >= value)) return false
    if (op === 'is' && value === 'null' && cell !== null && cell !== undefined) return false
    if (op === 'in' && !value.replace(/^\(|\)$/g, '').split(',').includes(text)) return false
  }
  return true
}

export function createFakeStore(seed: Record<string, Row[]> = {}): FakeStore {
  const tables: Record<string, Row[]> = { leads: [], quotes: [], installations: [], service_requests: [], installation_events: [], tenant_settings: [], ...structuredClone(seed) }
  let nextId = 1000
  const store: FakeStore = { tables, storage: new Map(), emails: [], calls: [], fetch: async () => reply(null) }

  const remove = (table: string, rows: Row[]) => {
    tables[table] = (tables[table] ?? []).filter((row) => !rows.includes(row))
    for (const [child, column] of CASCADE[table] ?? []) remove(child, (tables[child] ?? []).filter((row) => rows.some((parent) => parent.id === row[column])))
  }

  store.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const method = (init.method ?? 'GET').toUpperCase()
    const body = init.body
    store.calls.push({ method, url: url.href, body: typeof body === 'string' ? body : undefined })

    if (url.hostname === 'api.resend.com') { store.emails.push(JSON.parse(String(body))); return reply({ id: 'e' }) }

    const list = url.pathname.match(/^\/storage\/v1\/object\/list\/([^/]+)$/)
    if (list) {
      const prefix = String(JSON.parse(String(body)).prefix ?? '')
      const names = [...store.storage.keys()].filter((key) => key.startsWith(`${list[1]}/${prefix}`)).map((key) => key.slice(list[1].length + 1 + prefix.length)).filter((name) => !name.includes('/'))
      return reply(names.map((name) => ({ name, id: name })))
    }
    const storage = url.pathname.match(/^\/storage\/v1\/object\/(sign\/)?([^/]+)\/?(.*)$/)
    if (storage) {
      const [, sign, bucket, path] = storage
      if (sign && !path) {
        const paths = JSON.parse(String(body)).paths as string[]
        return reply(paths.map((item) => (store.storage.has(`${bucket}/${item}`) ? { path: item, signedURL: `/object/sign/${bucket}/${item}?token=t`, error: null } : { path: item, signedURL: null, error: 'not found' })))
      }
      if (sign) {
        const key = `${bucket}/${decodeURIComponent(path)}`
        return store.storage.has(key) ? reply({ signedURL: `/object/sign/${key}?token=t` }) : reply({ error: 'not found' }, 404)
      }
      if (method === 'DELETE') { for (const prefix of JSON.parse(String(body)).prefixes as string[]) store.storage.delete(`${bucket}/${prefix}`); return reply([]) }
      if (method === 'POST') { store.storage.set(`${bucket}/${decodeURIComponent(path)}`, new Uint8Array(body as ArrayBuffer)); return reply({ Key: `${bucket}/${path}` }) }
    }

    const rest = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)
    if (!rest) return reply({ error: 'unknown' }, 404)
    const table = rest[1]
    tables[table] ??= []
    const params = url.searchParams
    if (method === 'GET') {
      let rows = tables[table].filter((row) => matches(row, params))
      const order = params.get('order')
      if (order) { const [column, direction] = order.split('.'); rows = [...rows].sort((a, b) => (String(a[column]) < String(b[column]) ? -1 : 1) * (direction === 'desc' ? -1 : 1)) }
      const limit = Number(params.get('limit') ?? 0)
      if (limit) rows = rows.slice(0, limit)
      return reply(structuredClone(rows))
    }
    if (method === 'POST') {
      const incoming = JSON.parse(String(body)) as Row | Row[]
      const created: Row[] = []
      for (const item of Array.isArray(incoming) ? incoming : [incoming]) {
        for (const keys of UNIQUE[table] ?? []) {
          if (keys.some((key) => item[key] === null || item[key] === undefined)) continue
          if (tables[table].some((row) => keys.every((key) => row[key] === item[key]))) return reply({ code: '23505', message: 'duplicate key' }, 409)
        }
        const row = { id: nextId++, created_at: new Date().toISOString(), ...DEFAULTS[table], ...item }
        tables[table].push(row)
        created.push(row)
      }
      return reply(String((init.headers as Record<string, string>)?.Prefer ?? '').includes('representation') ? structuredClone(created) : null, 201)
    }
    if (method === 'PATCH') {
      if (table === 'installation_events') return reply({ message: 'installation_events is append-only' }, 400)
      const patch = JSON.parse(String(body)) as Row
      const rows = tables[table].filter((row) => matches(row, params))
      for (const row of rows) Object.assign(row, patch)
      return reply(structuredClone(rows))
    }
    if (method === 'DELETE') {
      remove(table, tables[table].filter((row) => matches(row, params)))
      return reply(null, 204)
    }
    return reply({ error: 'method' }, 405)
  }
  return store
}
