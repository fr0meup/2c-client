import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
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

  // Find a covering cache entry — exact match or a wider date range / all-topics scan
  function findCache(): CachedBulkResult | undefined {
    // Exact match first
    const exact = queryClient.getQueryData<CachedBulkResult>(cacheKey)
    if (exact && exact.posts.length > 0) return exact
    // Look for a wider cached range that covers the requested range
    if (!dateFrom) return undefined
    const reqFrom = new Date(dateFrom).getTime()
    const reqTo = dateTo ? new Date(dateTo + 'T23:59:59.999Z').getTime() : Date.now()
    const allCached = queryClient.getQueriesData<CachedBulkResult>({ queryKey: ['bulkDateFetch'] })
    for (const [key, data] of allCached) {
      if (!data || data.posts.length === 0) continue
      const [, cFrom, cTo, cTopic, cQuery, cParams] = key as unknown as [string, string, string, string | undefined, string | undefined, string]
      if (cQuery !== searchQuery || cParams !== paramsKey) continue
      // Cached with no topic = all posts, covers any topic request.
      // Cached with a specific topic only covers that same topic.
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

  // Synchronous cache restore on mount — avoids flash on back-navigation
  const initialCache = enabled ? findCache() : undefined
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

    // Skip fetch if we initialised from cache on mount
    if (hasCacheRef.current) {
      hasCacheRef.current = false
      return
    }

    // Check for a covering cache on re-renders (e.g. topic/date change)
    const cached = findCache()
    if (cached) {
      setPosts(cached.posts)
      setVotes(cached.votes)
      setPolls(cached.polls)
      setPickVotes(cached.pickVotes)
      setScanned(cached.scanned)
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

    const fromTs = new Date(dateFrom).getTime()
    const toTs = dateTo
      ? new Date(dateTo + 'T23:59:59.999Z').getTime()
      : Date.now()
    const extraParams = JSON.parse(paramsKey) as Record<string, unknown>

    // Divide date range into N concurrent chunks
    const chunkDuration = (toTs - fromTs) / concurrency
    const chunks: { cursor: string; stopTs: number }[] = []
    for (let i = 0; i < concurrency; i++) {
      const chunkEnd = toTs - i * chunkDuration
      const chunkStart = toTs - (i + 1) * chunkDuration
      chunks.push({
        cursor: btoa(JSON.stringify({ created_at: new Date(chunkEnd).toISOString() })),
        stopTs: chunkStart,
      })
    }

    // Shared mutable state (safe — JS is single-threaded between awaits)
    let totalScanned = 0
    const collectedPosts: Post[] = []
    const collectedVotes: Vote[] = []
    const collectedPolls: PollVote[] = []
    const collectedPickVotes: PickVote[] = []

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
            auth.token,
            auth.userUuid,
            signal,
          )
        } catch {
          return // aborted or network error — exit chunk silently
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

    Promise.all(chunks.map((c) => fetchChunk(c.cursor, c.stopTs)))
      .then(() => {
        if (signal.aborted) return
        // Deduplicate by UUID (chunk boundaries may slightly overlap)
        const seen = new Set<string>()
        const deduped = collectedPosts.filter((p) => {
          if (seen.has(p.uuid)) return false
          seen.add(p.uuid)
          return true
        })
        setPosts(deduped)
        setVotes([...collectedVotes])
        setPolls([...collectedPolls])
        setPickVotes([...collectedPickVotes])
        setIsLoading(false)

        // Cache results in React Query so navigating away and back restores them
        queryClient.setQueryData<CachedBulkResult>(cacheKey, {
          posts: deduped,
          votes: [...collectedVotes],
          polls: [...collectedPolls],
          pickVotes: [...collectedPickVotes],
          scanned: totalScanned,
        })
      })
      .catch(() => {
        if (!signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, auth?.token, auth?.userUuid, dateFrom, dateTo, concurrency, topic, searchQuery, paramsKey])

  return { posts, votes, polls, pickVotes, isLoading, scanned }
}
