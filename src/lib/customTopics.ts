const DB_NAME = '2c-custom-topics'
const DB_VERSION = 1
const STORE_NAME = 'custom_topics'
const LOCAL_STORAGE_KEY = '2c_custom_topics_list'

interface CustomTopicItem {
  id: string
  name: string
  slug: string
  createdAt: string
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

/** Get list of custom topics synchronously from cache */
export function getCustomTopics(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? Array.from(new Set(parsed.map((t: string) => String(t).replace(/^\$/, '')))) : []
  } catch {
    return []
  }
}

function syncToLocalStorage(topics: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(topics))
  } catch {
    /* ignore */
  }
}

/** Initialize and load custom topics from IndexedDB into memory/localStorage */
export async function initCustomTopics(): Promise<string[]> {
  try {
    const db = await openDb()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).getAll()
      req.onsuccess = () => {
        const items = req.result as CustomTopicItem[]
        const topicNames = Array.from(new Set(items.map((i) => i.name.replace(/^\$/, ''))))
        syncToLocalStorage(topicNames)
        resolve(topicNames)
      }
      req.onerror = () => resolve(getCustomTopics())
    })
  } catch {
    return getCustomTopics()
  }
}

/** Add a new custom topic to IndexedDB and sync cache */
export async function addCustomTopic(rawName: string): Promise<string> {
  const name = rawName.trim().replace(/^\$/, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')
  if (!name) throw new Error('Topic name cannot be empty')

  const slug = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-')

  const item: CustomTopicItem = {
    id: slug,
    name: name,
    slug,
    createdAt: new Date().toISOString(),
  }

  const current = getCustomTopics().map((t) => t.replace(/^\$/, ''))
  if (!current.includes(name)) {
    const next = [...current, name]
    syncToLocalStorage(next)
  }

  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    /* ignore */
  }

  return name
}

/** Convert any topic name into API slug */
export function formatTopicSlug(name: string): string {
  const clean = name.replace(/^\$/, '').trim()
  return clean.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-')
}

/** Remove a custom topic from IndexedDB and sync cache */
export async function removeCustomTopic(name: string): Promise<string[]> {
  const cleanName = name.replace(/^\$/, '')
  const current = getCustomTopics()
  const next = current.map((t) => t.replace(/^\$/, '')).filter((t) => t !== cleanName)
  syncToLocalStorage(next)

  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(cleanName)
      store.delete(`$${cleanName}`)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    /* ignore */
  }

  return next
}
