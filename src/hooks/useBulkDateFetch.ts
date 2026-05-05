import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  getCachedPostsInRange,
  getCachedVotes,
  getCachedPolls,
  getCachedPicks,
  getCacheMeta,
  getMissingPostRanges,
  isPostRangeCached,
  mergePosts as mergeIntoCache,
} from '@/lib/postCache'
import type { ArenaResponse, Post, Vote, PollVote, PickVote } from '@/lib/types'

interface BulkFetchOptions {
  dateFrom: string
  dateTo: string
  concurrency?: number
  topic?: string
  serverParams?: Record<string, unknown>
  refreshKey?: string
  enabled: boolean
}

interface BulkFetchResult {
  posts: Post[]
  votes: Vote[]
  polls: PollVote[]
  pickVotes: PickVote[]
  isLoading: boolean
  scanned: number
}

interface CachedBulkResult {
  posts: Post[]
  votes: Vote[]
  polls: PollVote[]
  pickVotes: PickVote[]
  scanned: number
}

export function useBulkDateFetch({
  dateFrom,
  dateTo,
  concurrency = 10,
  topic,
  serverParams,
  refreshKey,
  enabled,
}: BulkFetchOptions): BulkFetchResult {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  // Stable key for serverParams to avoid effect re-triggers
  const paramsKey = JSON.stringify(serverParams ?? {})
  const cacheKey = ['bulkDateFetch', dateFrom, dateTo, topic, paramsKey]
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const isCurrentDayRange = !dateTo || dateTo === todayStr

  // Find a covering in-memory (React Query) cache entry
  function findMemoryCache(): CachedBulkResult | undefined {
    const exact = queryClient.getQueryData<CachedBulkResult>(cacheKey)
    if (exact && exact.posts.length > 0) return exact
    if (!dateFrom) return undefined
    const reqFrom = new Date(dateFrom).getTime()
    const reqTo = dateTo ? new Date(dateTo + 'T23:59:59.999Z').getTime() : Date.now()
    const allCached = queryClient.getQueriesData<CachedBulkResult>({ queryKey: ['bulkDateFetch'] })
    for (const [key, data] of allCached) {
      if (!data || data.posts.length === 0) continue
      const [, cFrom, cTo, cTopic, cParams] = key as unknown as [string, string, string, string | undefined, string]
      if (cParams !== paramsKey) continue
      if (cTopic && cTopic !== topic) continue
      const cachedFromTs = new Date(cFrom as string).getTime()
      const cachedToTs = cTo ? new Date(cTo + 'T23:59:59.999Z').getTime() : Date.now()
      if (cachedFromTs <= reqFrom && cachedToTs >= reqTo) {
        const needTopicFilter = !cTopic && !!topic
        const filtered = data.posts.filter((p) => {
          const ts = new Date(p.created_at).getTime()
          if (ts < reqFrom || ts > reqTo) return false
          if (needTopicFilter && p.topic !== topic) return false
          return true
        })
        return { posts: filtered, votes: data.votes, polls: data.polls, pickVotes: data.pickVotes, scanned: data.scanned }
      }
    }
    return undefined
  }

  // Synchronous in-memory cache restore on mount — avoids flash on back-navigation
  const initialCache = enabled ? findMemoryCache() : undefined
  const hasCacheRef = useRef(!!initialCache && initialCache.posts.length > 0 && !isCurrentDayRange)

  const [posts, setPosts] = useState<Post[]>(initialCache?.posts ?? [])
  const [votes, setVotes] = useState<Vote[]>(initialCache?.votes ?? [])
  const [polls, setPolls] = useState<PollVote[]>(initialCache?.polls ?? [])
  const [pickVotes, setPickVotes] = useState<PickVote[]>(initialCache?.pickVotes ?? [])
  const [isLoading, setIsLoading] = useState(false)
  const [scanned, setScanned] = useState(initialCache?.scanned ?? 0)

  useEffect(() => {
    if (!enabled || !auth || !dateFrom) {
      setPosts([])
      setVotes([])
      setPolls([])
      setPickVotes([])
      setScanned(0)
      setIsLoading(false)
      return
    }

    // Skip fetch if we initialised from in-memory cache on mount
    if (hasCacheRef.current) {
      hasCacheRef.current = false
      return
    }

    // Check in-memory cache on re-renders (e.g. topic/date change)
    const memCached = isCurrentDayRange ? undefined : findMemoryCache()
    if (memCached) {
      setPosts(memCached.posts)
      setVotes(memCached.votes)
      setPolls(memCached.polls)
      setPickVotes(memCached.pickVotes)
      setScanned(memCached.scanned)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const { signal } = controller

    setIsLoading(true)
    setPosts([])
    setVotes([])
    setPolls([])
    setPickVotes([])
    setScanned(0)

    const requestedFromTs = new Date(dateFrom).getTime()
    const requestedToTs = Math.min(dateTo
      ? new Date(dateTo + 'T23:59:59.999Z').getTime()
      : Date.now(), Date.now())
    const extraParams = JSON.parse(paramsKey) as Record<string, unknown>

    // ── Determine the actual fetch range ──
    // For unfiltered searches (no topic, no query) we can reuse persistent
    // IndexedDB only when it explicitly covers the whole requested range.
    const isUnfiltered = !topic
    const canFilterFromPersistentCache = isPostRangeCached(requestedFromTs, requestedToTs)
    const missingRanges = isUnfiltered ? getMissingPostRanges(requestedFromTs, requestedToTs) : []
    if (isUnfiltered && isCurrentDayRange && missingRanges.length === 0) {
      const meta = getCacheMeta()
      const newestPostTs = meta.newestPostDate ? new Date(meta.newestPostDate).getTime() : NaN
      const lastCacheUpdateTs = meta.updatedAt ? new Date(meta.updatedAt).getTime() : NaN
      const probeFromTs = Math.max(
        requestedFromTs,
        Number.isFinite(newestPostTs) ? newestPostTs - 1000 : requestedFromTs,
        Number.isFinite(lastCacheUpdateTs) ? lastCacheUpdateTs - 60000 : requestedFromTs,
      )
      if (requestedToTs - probeFromTs > 1000) {
        missingRanges.push({ fromTs: probeFromTs, toTs: requestedToTs })
      }
    }
    const rangesToFetch = isUnfiltered
      ? missingRanges
      : canFilterFromPersistentCache
        ? []
        : [{ fromTs: requestedFromTs, toTs: requestedToTs }]

    async function run() {
      let totalScanned = 0
      const collectedPosts: Post[] = []
      const collectedVotes: Vote[] = []
      const collectedPolls: PollVote[] = []
      const collectedPickVotes: PickVote[] = []
      let lastProgressAt = 0

      function publishProgress(force = false) {
        const now = Date.now()
        if (!force && now - lastProgressAt < 150) return
        lastProgressAt = now
        setScanned(totalScanned)
        setPosts([...collectedPosts])
      }

      if (rangesToFetch.length > 0) {
        async function fetchChunk(cursor: string, stopTs: number) {
          let nextCursor: string | undefined = cursor

          while (nextCursor && !signal.aborted) {
            const params: Record<string, unknown> = {
              sort_dir: 'desc',
              filter: 'chronological',
              cursor: nextCursor,
              ...extraParams,
            }
            if (topic) params.topic = topic

            let page: ArenaResponse
            try {
              page = await rpc<ArenaResponse>(
                '/v2/posts/arena',
                params,
                auth!.token,
                auth!.userUuid,
                signal,
              )
            } catch {
              return
            }

            let hitStop = false
            for (const post of page.posts) {
              if (new Date(post.created_at).getTime() < stopTs) {
                hitStop = true
                break
              }
              collectedPosts.push(post)
            }

            if (page.votes) collectedVotes.push(...page.votes)
            if (page.polls) collectedPolls.push(...page.polls)
            if (page.pickVotes) collectedPickVotes.push(...page.pickVotes)
            totalScanned += page.posts.length

            if (!signal.aborted) publishProgress()

            if (hitStop || !page.pagination.has_more) break
            nextCursor = page.pagination.next_cursor ?? undefined
          }
        }

        await Promise.all(rangesToFetch.flatMap((range) => {
          const chunkCount = Math.max(1, Math.ceil(concurrency / rangesToFetch.length))
          const chunkDuration = (range.toTs - range.fromTs) / chunkCount
          const chunks: { cursor: string; stopTs: number }[] = []
          for (let i = 0; i < chunkCount; i++) {
            const chunkEnd = range.toTs - i * chunkDuration
            const chunkStart = range.toTs - (i + 1) * chunkDuration
            chunks.push({
              cursor: btoa(JSON.stringify({ created_at: new Date(chunkEnd).toISOString() })),
              stopTs: Math.max(chunkStart, range.fromTs),
            })
          }
          return chunks.map((c) => fetchChunk(c.cursor, c.stopTs))
        }))
      }

      if (signal.aborted) return

      // Deduplicate newly fetched posts
      const seen = new Set<string>()
      const dedupedNew = collectedPosts.filter((p) => {
        if (seen.has(p.uuid)) return false
        seen.add(p.uuid)
        return true
      })

      // Persist only complete unfiltered scans. Filtered/topic/query searches
      // are partial result sets and must not change shared cache coverage.
      if (isUnfiltered && missingRanges.length > 0) {
        for (let i = 0; i < missingRanges.length; i++) {
          await mergeIntoCache(
            i === 0 ? dedupedNew : [],
            i === 0 ? collectedVotes : [],
            i === 0 ? collectedPolls : [],
            i === 0 ? collectedPickVotes : [],
            missingRanges[i],
          )
        }
      }

      if (signal.aborted) return

      // ── Build final result set ──
      // When a full unfiltered cache covers the range, topic-only searches can
      // be answered locally. Query searches still use the server's text search.
      let finalPosts: Post[]
      let finalVotes: Vote[]
      let finalPolls: PollVote[]
      let finalPicks: PickVote[]

      if (isUnfiltered || canFilterFromPersistentCache) {
        const [cachedPosts, cachedVotes, cachedPolls, cachedPicks] = await Promise.all([
          getCachedPostsInRange(requestedFromTs, requestedToTs),
          getCachedVotes(),
          getCachedPolls(),
          getCachedPicks(),
        ])
        finalPosts = topic ? cachedPosts.filter((p) => p.topic === topic) : cachedPosts
        finalVotes = cachedVotes
        finalPolls = cachedPolls
        finalPicks = cachedPicks
        totalScanned = Math.max(totalScanned, finalPosts.length)
      } else {
        finalPosts = dedupedNew
        finalVotes = [...collectedVotes]
        finalPolls = [...collectedPolls]
        finalPicks = [...collectedPickVotes]
      }

      setPosts(finalPosts)
      setVotes(finalVotes)
      setPolls(finalPolls)
      setPickVotes(finalPicks)
      setScanned(totalScanned)
      setIsLoading(false)

      // Also cache in React Query for instant back-navigation
      queryClient.setQueryData<CachedBulkResult>(cacheKey, {
        posts: finalPosts,
        votes: finalVotes,
        polls: finalPolls,
        pickVotes: finalPicks,
        scanned: totalScanned,
      })
    }

    run().catch(() => {
      if (!signal.aborted) setIsLoading(false)
    })

    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, auth?.token, auth?.userUuid, dateFrom, dateTo, concurrency, topic, paramsKey, refreshKey])

  return { posts, votes, polls, pickVotes, isLoading, scanned }
}
