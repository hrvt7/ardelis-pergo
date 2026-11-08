// A feltöltött teraszfotó és az elhelyezés megőrzése CSAK ebben a böngészőben (IndexedDB + localStorage).
// A kép soha nem kerül szerverre és nem része a megosztott linknek. Minden hiba csendes: privát
// módban vagy tiltott tárhelynél a funkció egyszerűen munkamenetre szól.
import { clampPlacement, type PhotoPlacement } from './photoPlacement'

const DB_NAME = 'pergola-photo'
const STORE = 'photos'

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') { resolve(null); return }
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => { request.result.createObjectStore(STORE) }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch { resolve(null) }
  })
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE, mode)
      const request = action(transaction.objectStore(STORE))
      transaction.oncomplete = () => { db.close(); resolve(request.result ?? null) }
      transaction.onerror = () => { db.close(); resolve(null) }
      transaction.onabort = () => { db.close(); resolve(null) }
    } catch { db.close(); resolve(null) }
  })
}

export const savePhoto = (key: string, blob: Blob) => run('readwrite', (store) => store.put(blob, key)).then(() => undefined)
export const loadPhoto = async (key: string): Promise<Blob | null> => {
  const value = await run<unknown>('readonly', (store) => store.get(key))
  return value instanceof Blob ? value : null
}
export const deletePhoto = (key: string) => run('readwrite', (store) => store.delete(key)).then(() => undefined)

const placementKey = (key: string) => `${DB_NAME}:${key}:placement`
export function savePlacement(key: string, placement: PhotoPlacement) {
  try { localStorage.setItem(placementKey(key), JSON.stringify(placement)) } catch { /* privát mód */ }
}
export function loadPlacement(key: string): PhotoPlacement | null {
  try {
    const raw = localStorage.getItem(placementKey(key))
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<PhotoPlacement>
    const numbers = ['photoX', 'photoY', 'photoScale', 'photoRotation', 'photoTilt'] as const
    if (!numbers.every((name) => typeof value[name] === 'number' && Number.isFinite(value[name]))) return null
    // A perspektíva-szorzó később került be: régi mentésnél az alapérték (1).
    return clampPlacement({ ...value, photoLens: typeof value.photoLens === 'number' ? value.photoLens : 1 } as PhotoPlacement)
  } catch { return null }
}
export function clearPlacement(key: string) {
  try { localStorage.removeItem(placementKey(key)) } catch { /* privát mód */ }
}
