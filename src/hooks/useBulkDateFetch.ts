import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  getCacheMeta,
  getCachedPosts,
  getCachedVotes,
  getCachedPolls,
  getCachedPicks,
  mergePosts as mergeIntoCache,
} from '@/lib/postCache'
import type { ArenaResponse, Post, Vote, PollVote, PickVote } from '@/lib/types'

interface BulkFetchOptions {
  dateFrom: string
  dateTo: string
  concurrency?: number
  topic?: string
  searchQuery?: string
  serverParams?: Record<string, unknown>
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
  searchQuery,
  serverParams,
  enabled,
}: BulkFetchOptions): BulkFetchResult {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  // Stable key for serverParams to avoid effect re-triggers
  const paramsKey = JSON.stringify(serverParams ?? {})
  const cacheKey = ['bulkDateFetch', dateFrom, dateTo, topic, searchQuery, paramsKey]

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
      const [, cFrom, cTo, cTopic, cQuery, cParams] = key as unknown as [string, string, string, string | undefined, string | undefined, string]
      if (cQuery !== searchQuery || cParams !== paramsKey) continue
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
  const hasCacheRef = useRef(!!initialCache && initialCache.posts.length > 0)

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
    const memCached = findMemoryCache()
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
    const requestedToTs = dateTo
      ? new Date(dateTo + 'T23:59:59.999Z').getTime()
      : Date.now()
    const extraParams = JSON.parse(paramsKey) as Record<string, unknown>

    // ── Determine the actual fetch range ──
    // For unfiltered searches (no topic, no query) we can leverage the
    // persistent IndexedDB cache and only fetch the gap since the last scan.
    const isUnfiltered = !topic && !searchQuery
    const meta = getCacheMeta()
    const hasPersistentCache = isUnfiltered && meta.newestPostDate && meta.count > 0

    // If we have cached data, only fetch from now → newest cached post date
    // (the gap). Otherwise fetch the full requested range.
    const fetchFromTs = hasPersistentCache
      ? new Date(meta.newestPostDate!).getTime()
      : requestedFromTs
    const fetchToTs = requestedToTs

    // If the gap is tiny (< 1 second) and cache covers the requested range,
    // skip the network entirely and just load from IndexedDB.
    const skipFetch = hasPersistentCache &&
      fetchFromTs >= fetchToTs &&
      meta.oldestPostDate &&
      new Date(meta.oldestPostDate).getTime() <= requestedFromTs

    async function run() {
      let totalScanned = 0
      const collectedPosts: Post[] = []
      const collectedVotes: Vote[] = []
      const collectedPolls: PollVote[] = []
      const collectedPickVotes: PickVote[] = []

      if (!skipFetch && fetchToTs > fetchFromTs) {
        // Divide fetch range into N concurrent chunks
        const chunkDuration = (fetchToTs - fetchFromTs) / concurrency
        const chunks: { cursor: string; stopTs: number }[] = []
        for (let i = 0; i < concurrency; i++) {
          const chunkEnd = fetchToTs - i * chunkDuration
          const chunkStart = fetchToTs - (i + 1) * chunkDuration
          chunks.push({
            cursor: btoa(JSON.stringify({ created_at: new Date(chunkEnd).toISOString() })),
            stopTs: chunkStart,
          })
        }

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
            if (searchQuery) params.q = searchQuery

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

            if (!signal.aborted) {
              setScanned(totalScanned)
              setPosts([...collectedPosts])
            }

            if (hitStop || !page.pagination.has_more) break
            nextCursor = page.pagination.next_cursor ?? undefined
          }
        }

        await Promise.all(chunks.map((c) => fetchChunk(c.cursor, c.stopTs)))
      }

      if (signal.aborted) return

      // Deduplicate newly fetched posts
      const seen = new Set<string>()
      const dedupedNew = collectedPosts.filter((p) => {
        if (seen.has(p.uuid)) return false
        seen.add(p.uuid)
        return true
      })

      // Persist new posts to IndexedDB (always, regardless of filters)
      if (dedupedNew.length > 0) {
        await mergeIntoCache(dedupedNew, collectedVotes, collectedPolls, collectedPickVotes)
      }

      if (signal.aborted) return

      // ── Build final result set ──
      // For unfiltered searches, load full cache from IndexedDB and filter to
      // the requested date range. For filtered searches (topic/query), we can
      // only use the freshly-fetched results since the API filtered server-side.
      let finalPosts: Post[]
      let finalVotes: Vote[]
      let finalPolls: PollVote[]
      let finalPicks: PickVote[]

      if (isUnfiltered) {
        // Load full persistent cache
        const [cachedPosts, cachedVotes, cachedPolls, cachedPicks] = await Promise.all([
          getCachedPosts(),
          getCachedVotes(),
          getCachedPolls(),
          getCachedPicks(),
        ])
        // Filter to requested date range
        finalPosts = cachedPosts.filter((p) => {
          const ts = new Date(p.created_at).getTime()
          return ts >= requestedFromTs && ts <= requestedToTs
        })
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
  }, [enabled, auth?.token, auth?.userUuid, dateFrom, dateTo, concurrency, topic, searchQuery, paramsKey])

  return { posts, votes, polls, pickVotes, isLoading, scanned }
}
