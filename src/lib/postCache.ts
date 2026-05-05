import type { Post, Vote, PollVote, PickVote } from './types'

// ── Database setup ──

const DB_NAME = '2c-post-cache'
const DB_VERSION = 1
const POSTS_STORE = 'posts'
const VOTES_STORE = 'votes'
const POLLS_STORE = 'polls'
const PICKS_STORE = 'picks'

// Lightweight meta kept in localStorage.
const META_KEY = '2c_post_cache_meta'

export interface CachedRange {
  from: string
  to: string
}

export interface CacheMeta {
  newestPostDate: string | null
  oldestPostDate: string | null
  count: number
  updatedAt: string
  coveredRanges: CachedRange[]
}

interface CoveredRangeInput {
  fromTs: number
  toTs: number
}

function emptyMeta(): CacheMeta {
  return { newestPostDate: null, oldestPostDate: null, count: 0, updatedAt: '', coveredRanges: [] }
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
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
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

let dbPromise: Promise<IDBDatabase> | null = null

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

function getPostsByDateRange(db: IDBDatabase, fromTs: number, toTs: number): Promise<Post[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(POSTS_STORE, 'readonly')
    const index = tx.objectStore(POSTS_STORE).index('created_at')
    const range = IDBKeyRange.bound(new Date(fromTs).toISOString(), new Date(toTs).toISOString())
    const req = index.getAll(range)
    req.onsuccess = () => resolve(req.result as Post[])
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
    if (!raw) return emptyMeta()
    const parsed = JSON.parse(raw) as Partial<CacheMeta>
    return {
      newestPostDate: parsed.newestPostDate ?? null,
      oldestPostDate: parsed.oldestPostDate ?? null,
      count: parsed.count ?? 0,
      updatedAt: parsed.updatedAt ?? '',
      coveredRanges: Array.isArray(parsed.coveredRanges) ? parsed.coveredRanges : [],
    }
  } catch {
    return emptyMeta()
  }
}

function writeMeta(meta: CacheMeta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

function mergeCoveredRanges(ranges: CachedRange[], next?: CoveredRangeInput): CachedRange[] {
  const normalized = ranges
    .map((range) => ({
      fromTs: new Date(range.from).getTime(),
      toTs: new Date(range.to).getTime(),
    }))
    .filter((range) => Number.isFinite(range.fromTs) && Number.isFinite(range.toTs))

  if (next) normalized.push(next)
  normalized.sort((a, b) => a.fromTs - b.fromTs)

  const merged: CoveredRangeInput[] = []
  for (const range of normalized) {
    const last = merged[merged.length - 1]
    if (last && range.fromTs <= last.toTs + 1000) {
      last.toTs = Math.max(last.toTs, range.toTs)
    } else {
      merged.push({ ...range })
    }
  }

  return merged.map((range) => ({
    from: new Date(range.fromTs).toISOString(),
    to: new Date(range.toTs).toISOString(),
  }))
}

export function isPostRangeCached(fromTs: number, toTs: number): boolean {
  const ranges = mergeCoveredRanges(getCacheMeta().coveredRanges)
  return ranges.some((range) => {
    const cachedFromTs = new Date(range.from).getTime()
    const cachedToTs = new Date(range.to).getTime()
    return cachedFromTs <= fromTs && cachedToTs >= toTs
  })
}

export function getMissingPostRanges(fromTs: number, toTs: number): CoveredRangeInput[] {
  const covered = mergeCoveredRanges(getCacheMeta().coveredRanges)
    .map((range) => ({
      fromTs: Math.max(new Date(range.from).getTime(), fromTs),
      toTs: Math.min(new Date(range.to).getTime(), toTs),
    }))
    .filter((range) => Number.isFinite(range.fromTs) && Number.isFinite(range.toTs) && range.fromTs <= range.toTs)

  if (covered.length === 0) return [{ fromTs, toTs }]

  const missing: CoveredRangeInput[] = []
  let cursorTs = fromTs
  for (const range of covered) {
    if (range.fromTs > cursorTs) {
      missing.push({ fromTs: cursorTs, toTs: range.fromTs })
    }
    cursorTs = Math.max(cursorTs, range.toTs)
  }
  if (cursorTs < toTs) {
    missing.push({ fromTs: cursorTs, toTs })
  }

  return missing.filter((range) => range.toTs - range.fromTs > 1000)
}

// ── Public API ──

export async function getCachedPosts(): Promise<Post[]> {
  const db = await openDb()
  return getAll<Post>(db, POSTS_STORE)
}

export async function getCachedPostsInRange(fromTs: number, toTs: number): Promise<Post[]> {
  const db = await openDb()
  return getPostsByDateRange(db, fromTs, toTs)
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
  coveredRange?: CoveredRangeInput,
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
  writeMeta({
    newestPostDate: newest,
    oldestPostDate: oldest,
    count,
    updatedAt: new Date().toISOString(),
    coveredRanges: mergeCoveredRanges(prev.coveredRanges, coveredRange),
  })
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
    writeMeta({
      ...data.meta,
      coveredRanges: mergeCoveredRanges(data.meta.coveredRanges ?? []),
    })
  } else {
    // Rebuild meta from posts
    const count = data.posts.length
    let newest: string | null = null
    let oldest: string | null = null
    for (const p of data.posts) {
      if (!newest || p.created_at > newest) newest = p.created_at
      if (!oldest || p.created_at < oldest) oldest = p.created_at
    }
    writeMeta({ newestPostDate: newest, oldestPostDate: oldest, count, updatedAt: new Date().toISOString(), coveredRanges: [] })
  }
}
