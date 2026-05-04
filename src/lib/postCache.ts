import type { Post, Vote, PollVote, PickVote } from './types'

// ── Database setup ──

const DB_NAME = '2c-post-cache'
const DB_VERSION = 1
const POSTS_STORE = 'posts'
const VOTES_STORE = 'votes'
const POLLS_STORE = 'polls'
const PICKS_STORE = 'picks'

// Lightweight meta kept in localStorage (tiny, <200 bytes)
const META_KEY = '2c_post_cache_meta'

export interface CacheMeta {
  newestPostDate: string | null
  oldestPostDate: string | null
  count: number
  updatedAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(POSTS_STORE)) {
        const store = db.createObjectStore(POSTS_STORE, { keyPath: 'uuid' })
        store.createIndex('created_at', 'created_at', { unique: false })
      }
      if (!db.objectStoreNames.contains(VOTES_STORE)) {
        db.createObjectStore(VOTES_STORE, { keyPath: 'content_uuid' })
      }
      if (!db.objectStoreNames.contains(POLLS_STORE)) {
        db.createObjectStore(POLLS_STORE, { keyPath: 'post_uuid' })
      }
      if (!db.objectStoreNames.contains(PICKS_STORE)) {
        db.createObjectStore(PICKS_STORE, { keyPath: 'post_uuid' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── Helpers ──

function bulkPut<T>(db: IDBDatabase, storeName: string, items: T[]): Promise<void> {
  if (items.length === 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    for (const item of items) store.put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function getAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function getCount(db: IDBDatabase, storeName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function clearStore(db: IDBDatabase, storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Meta (localStorage — always sync, tiny) ──

export function getCacheMeta(): CacheMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return { newestPostDate: null, oldestPostDate: null, count: 0, updatedAt: '' }
    return JSON.parse(raw) as CacheMeta
  } catch {
    return { newestPostDate: null, oldestPostDate: null, count: 0, updatedAt: '' }
  }
}

function writeMeta(meta: CacheMeta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

// ── Public API ──

export async function getCachedPosts(): Promise<Post[]> {
  const db = await openDb()
  return getAll<Post>(db, POSTS_STORE)
}

export async function getCachedVotes(): Promise<Vote[]> {
  const db = await openDb()
  return getAll<Vote>(db, VOTES_STORE)
}

export async function getCachedPolls(): Promise<PollVote[]> {
  const db = await openDb()
  return getAll<PollVote>(db, POLLS_STORE)
}

export async function getCachedPicks(): Promise<PickVote[]> {
  const db = await openDb()
  return getAll<PickVote>(db, PICKS_STORE)
}

/**
 * Merge new data into the persistent IndexedDB cache (upsert by key).
 * Updates meta with newest/oldest dates and count.
 */
export async function mergePosts(
  newPosts: Post[],
  newVotes: Vote[],
  newPolls: PollVote[],
  newPicks: PickVote[],
): Promise<void> {
  const db = await openDb()

  await Promise.all([
    bulkPut(db, POSTS_STORE, newPosts),
    bulkPut(db, VOTES_STORE, newVotes),
    bulkPut(db, POLLS_STORE, newPolls),
    bulkPut(db, PICKS_STORE, newPicks),
  ])

  // Refresh meta
  const count = await getCount(db, POSTS_STORE)
  const prev = getCacheMeta()
  let newest = prev.newestPostDate
  let oldest = prev.oldestPostDate
  for (const p of newPosts) {
    if (!newest || p.created_at > newest) newest = p.created_at
    if (!oldest || p.created_at < oldest) oldest = p.created_at
  }
  writeMeta({ newestPostDate: newest, oldestPostDate: oldest, count, updatedAt: new Date().toISOString() })
}

export async function clearPostCache(): Promise<void> {
  const db = await openDb()
  await Promise.all([
    clearStore(db, POSTS_STORE),
    clearStore(db, VOTES_STORE),
    clearStore(db, POLLS_STORE),
    clearStore(db, PICKS_STORE),
  ])
  localStorage.removeItem(META_KEY)
}

export async function getPostCacheStats(): Promise<{ count: number }> {
  const meta = getCacheMeta()
  return { count: meta.count }
}

/**
 * Export entire cache as a serialisable object (for backup).
 */
export async function exportPostCache(): Promise<{
  posts: Post[]
  votes: Vote[]
  polls: PollVote[]
  picks: PickVote[]
  meta: CacheMeta
}> {
  const db = await openDb()
  const [posts, votes, polls, picks] = await Promise.all([
    getAll<Post>(db, POSTS_STORE),
    getAll<Vote>(db, VOTES_STORE),
    getAll<PollVote>(db, POLLS_STORE),
    getAll<PickVote>(db, PICKS_STORE),
  ])
  return { posts, votes, polls, picks, meta: getCacheMeta() }
}

/**
 * Import a previously exported cache, replacing current data.
 */
export async function importPostCache(data: {
  posts: Post[]
  votes: Vote[]
  polls: PollVote[]
  picks: PickVote[]
  meta?: CacheMeta
}): Promise<void> {
  await clearPostCache()
  const db = await openDb()
  await Promise.all([
    bulkPut(db, POSTS_STORE, data.posts),
    bulkPut(db, VOTES_STORE, data.votes),
    bulkPut(db, POLLS_STORE, data.polls),
    bulkPut(db, PICKS_STORE, data.picks),
  ])
  if (data.meta) {
    writeMeta(data.meta)
  } else {
    // Rebuild meta from posts
    const count = data.posts.length
    let newest: string | null = null
    let oldest: string | null = null
    for (const p of data.posts) {
      if (!newest || p.created_at > newest) newest = p.created_at
      if (!oldest || p.created_at < oldest) oldest = p.created_at
    }
    writeMeta({ newestPostDate: newest, oldestPostDate: oldest, count, updatedAt: new Date().toISOString() })
  }
}
