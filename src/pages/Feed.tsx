import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import { ComposePost } from '@/components/compose-post/ComposePost'
import { AdvancedSearchPanel, hasAdvancedParams } from '@/components/feed-filters/AdvancedSearchModal'
import { PostCard } from '@/components/post-card/PostCard'
import type { PostCardData } from '@/components/post-card/types'
import { PostCardSkeleton } from '@/components/skeleton/Skeleton'
import { useFeed } from '@/hooks/useFeed'
import { useBulkDateFetch } from '@/hooks/useBulkDateFetch'
import { FEED_PARAM_TO_TOPIC } from '@/components/feed-filters/config'
import { useCompose } from '@/layouts/AppLayout'
import { NAVIGATION_PENDING_EVENT } from '@/lib/navigationPending'
import { cn } from '@/lib/utils'

const RESULT_SORT_LABELS = {
  newest: 'Newest',
  oldest: 'Oldest',
  most_upvoted: 'Most Upvoted',
  least_upvoted: 'Least Upvoted',
  most_commented: 'Most Commented',
  least_commented: 'Least Commented',
} as const

type ResultSort = keyof typeof RESULT_SORT_LABELS

function isResultSort(value: string | null): value is ResultSort {
  return value != null && value in RESULT_SORT_LABELS
}

function downloadSearchDataset(
  posts: PostCardData[],
  voteMap: Map<string, 1 | -1 | 0>,
  pollVoteMap: Map<string, number>,
  pickVoteMap: Map<string, 'yes' | 'no'>,
  searchQuery?: string
) {
  if (posts.length === 0) return

  const votesArray: { content_uuid: string; vote_type: 1 | -1 | 0 }[] = []
  const pollsArray: { post_uuid: string; option: number }[] = []
  const picksArray: { post_uuid: string; vote: 'yes' | 'no' }[] = []

  for (const post of posts) {
    const v = voteMap.get(post.uuid)
    if (v !== undefined && v !== 0) {
      votesArray.push({ content_uuid: post.uuid, vote_type: v })
    }
    const p = pollVoteMap.get(post.uuid)
    if (p !== undefined) {
      pollsArray.push({ post_uuid: post.uuid, option: p })
    }
    const pk = pickVoteMap.get(post.uuid)
    if (pk !== undefined) {
      picksArray.push({ post_uuid: post.uuid, vote: pk })
    }
  }

  let newestDate: string | null = null
  let oldestDate: string | null = null
  for (const p of posts) {
    if (p.created_at) {
      if (!newestDate || p.created_at > newestDate) newestDate = p.created_at
      if (!oldestDate || p.created_at < oldestDate) oldestDate = p.created_at
    }
  }

  const dataset = {
    posts,
    votes: votesArray,
    polls: pollsArray,
    picks: picksArray,
    meta: {
      count: posts.length,
      query: searchQuery || null,
      exportedAt: new Date().toISOString(),
      newestPostDate: newestDate,
      oldestPostDate: oldestDate,
    },
  }

  const jsonStr = JSON.stringify(dataset, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `2c-dataset-${(searchQuery || 'search').replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function Feed() {
  const location = useLocation()
  const navigate = useNavigate()
  const { openQuote } = useCompose()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const feedParam = searchParams.get('feed')
  const searchQuery = searchParams.get('q') || undefined
  const activeTopic = FEED_PARAM_TO_TOPIC[feedParam ?? ''] ?? 'New'

  // Read date + filter params
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const hasAdv = searchParams.has('adv') || searchParams.has('min_balance') || searchParams.has('max_balance') || searchParams.has('genders') || searchParams.has('verified') || searchParams.has('country') || searchParams.has('city') || searchParams.has('has_image') || searchParams.has('has_video') || searchParams.has('has_poll') || searchParams.has('has_likert')
  const isDateFiltering = !!(dateFrom || dateTo || searchQuery || hasAdv)
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const effectiveDateFrom = dateFrom || '2024-12-06'
  const effectiveDateTo = dateTo || todayStr
  const scanKey = `${effectiveDateFrom}|${effectiveDateTo}|${searchParams.get('adv_topic') ?? ''}`
  const sortParam = searchParams.get('sort')
  const defaultSort: ResultSort = 'newest'
  const resultSort: ResultSort = isResultSort(sortParam) ? sortParam : defaultSort
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!sortOpen) return
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [sortOpen])

  function selectResultSort(sort: ResultSort) {
    const params = new URLSearchParams(location.search)
    if (sort === defaultSort) params.delete('sort')
    else params.set('sort', sort)
    const nextSearch = params.toString()
    navigate(nextSearch ? `/?${nextSearch}` : '/', { replace: true })
    setSortOpen(false)
  }

  // Only run bulk fetch when user clicks Apply (URL change), not on page refresh
  const hideCompose = ['Hot', 'Picks', 'Following', 'Announcements'].includes(activeTopic)
  const [searchTriggered, setSearchTriggered] = useState(isDateFiltering)
  const [bulkRefreshKey, setBulkRefreshKey] = useState(location.search)
  const [pendingFeedNav, setPendingFeedNav] = useState<{ search: string; run: number } | null>(null)
  const prevSearch = useRef(location.search)
  const prevScanKey = useRef(scanKey)
  useEffect(() => {
    if (prevSearch.current !== location.search) {
      setSearchTriggered(true)
      if (prevScanKey.current !== scanKey) {
        setBulkRefreshKey(scanKey)
        prevScanKey.current = scanKey
      }
      prevSearch.current = location.search
    }
  }, [location.search, scanKey])

  // Server-side: only topic + search query. Everything else is client-side filtered.
  const advTopic = searchParams.get('adv_topic') || undefined

  // ── Normal feed (useFeed) — disabled when date/search filtering ──
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useFeed(activeTopic, searchQuery, undefined, undefined, !isDateFiltering)

  useEffect(() => {
    function handlePending(e: Event) {
      const detail = (e as CustomEvent<{ pathname?: string; search?: string; run?: number }>).detail
      if (detail?.pathname !== '/') return
      const nextSearch = detail.search ?? ''
      setPendingFeedNav({ search: nextSearch, run: detail.run ?? Date.now() })
      if (location.pathname === '/' && nextSearch === location.search && !isDateFiltering) {
        refetch()
      }
    }
    window.addEventListener(NAVIGATION_PENDING_EVENT, handlePending)
    return () => window.removeEventListener(NAVIGATION_PENDING_EVENT, handlePending)
  }, [isDateFiltering, location.pathname, location.search, refetch])

  // ── Concurrent bulk fetch — enabled when date/search filtering ──
  // serverParams is empty so changing client-side filters won't re-fetch
  const bulk = useBulkDateFetch({
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
    concurrency: 20,
    topic: advTopic,
    serverParams: {},
    refreshKey: bulkRefreshKey,
    enabled: isDateFiltering && searchTriggered,
  })

  useEffect(() => {
    if (!pendingFeedNav) return
    if (pendingFeedNav.search !== location.search) return
    if (isDateFiltering ? bulk.isLoading : (isLoading || isFetching)) return
    const frame = window.requestAnimationFrame(() => {
      setPendingFeedNav(null)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [bulk.isLoading, isDateFiltering, isFetching, isLoading, location.search, pendingFeedNav])

  // ── Merge data from the active source ──
  const { rawPosts, voteMap, pollVoteMap, pickVoteMap, likertVoteMap } = useMemo(() => {
    const voteMap = new Map<string, 1 | -1 | 0>()
    const pollVoteMap = new Map<string, number>()
    const pickVoteMap = new Map<string, 'yes' | 'no'>()
    const likertVoteMap = new Map<string, number>()
    const rawPosts: PostCardData[] = []

    if (isDateFiltering) {
      for (const v of bulk.votes) voteMap.set(v.content_uuid, v.vote_type)
      for (const p of bulk.polls) pollVoteMap.set(p.post_uuid, p.option)
      for (const pk of bulk.pickVotes) pickVoteMap.set(pk.post_uuid, pk.vote)
      rawPosts.push(...(bulk.posts as unknown as PostCardData[]))
    } else if (data) {
      for (const page of data.pages) {
        rawPosts.push(...(page.posts as unknown as PostCardData[]))
        for (const v of page.votes ?? []) voteMap.set(v.content_uuid, v.vote_type)
        for (const p of page.polls ?? []) pollVoteMap.set(p.post_uuid, p.option)
        for (const lk of page.likertVotes ?? []) likertVoteMap.set(lk.post_uuid, lk.option)
        for (const pk of page.pickVotes ?? []) pickVoteMap.set(pk.post_uuid, pk.vote)
      }
    }

    return { rawPosts, voteMap, pollVoteMap, pickVoteMap, likertVoteMap }
  }, [bulk.pickVotes, bulk.polls, bulk.posts, bulk.votes, data, isDateFiltering])

  // Client-side filtering for worker results
  const posts = useMemo(() => {
  let nextPosts = [...rawPosts]
  if (isDateFiltering) {
    const fSearch = searchQuery?.trim().toLowerCase()
    const fMinBal = searchParams.get('min_balance')
    const fMaxBal = searchParams.get('max_balance')
    const fVotesMin = searchParams.get('votes_min')
    const fVotesMax = searchParams.get('votes_max')
    const fMinAge = searchParams.get('min_age')
    const fMaxAge = searchParams.get('max_age')
    const fGenders = searchParams.get('genders')?.split(',').filter(Boolean)
    const fHasImage = searchParams.get('has_image') === '1'
    const fHasPoll = searchParams.get('has_poll') === '1'
    const fHasLikert = searchParams.get('has_likert') === '1'
    const fHasVideo = searchParams.get('has_video') === '1'
    const fCommMin = searchParams.get('comments_min')
    const fCommMax = searchParams.get('comments_max')
    const fAuthorUuids = searchParams.get('author_uuids')?.split(',').map((u) => u.trim().toLowerCase()).filter(Boolean)
    const fVerified = searchParams.get('verified')
    const fCountry = searchParams.get('country')
    const fCity = searchParams.get('city')

    const contentFilters: ((p: PostCardData) => boolean)[] = []
    if (fHasImage) contentFilters.push((p) => p.post_meta?.media_type === 'image' || (p.post_type === 4 && p.post_meta?.media_type !== 'video') || (Array.isArray(p.post_meta?.imageUrls) && p.post_meta!.imageUrls.length > 0))
    if (fHasVideo) contentFilters.push((p) => p.post_meta?.media_type === 'video')
    if (fHasPoll) contentFilters.push((p) => p.post_type === 2)
    if (fHasLikert) contentFilters.push((p) => p.post_type === 5)

    nextPosts = nextPosts.filter((p) => {
      if (fSearch && !`${p.title ?? ''} ${p.text ?? ''}`.toLowerCase().includes(fSearch)) return false
      if (fMinBal && p.author_meta.balance < Number(fMinBal)) return false
      if (fMaxBal && p.author_meta.balance > Number(fMaxBal)) return false
      if (fVotesMin && p.upvote_count < Number(fVotesMin)) return false
      if (fVotesMax && p.upvote_count > Number(fVotesMax)) return false
      if (fMinAge && (p.author_meta.age == null || p.author_meta.age < Number(fMinAge))) return false
      if (fMaxAge && (p.author_meta.age == null || p.author_meta.age > Number(fMaxAge))) return false
      if (fGenders?.length && !fGenders.includes(p.author_meta.gender ?? '')) return false
      if (fCommMin && p.comment_count < Number(fCommMin)) return false
      if (fCommMax && p.comment_count > Number(fCommMax)) return false
      if (contentFilters.length && !contentFilters.some((fn) => fn(p))) return false
      if (fAuthorUuids?.length && !fAuthorUuids.includes(p.author_uuid.toLowerCase())) return false
      if (fVerified === 'verified' && p.author_meta.subscription_type !== 1) return false
      if (fVerified === 'unverified' && p.author_meta.subscription_type !== 0) return false
      if (fCountry || fCity) {
        const arena = p.author_meta.arena ?? ''
        const commaIdx = arena.lastIndexOf(',')
        const arenaCity = commaIdx >= 0 ? arena.substring(0, commaIdx).trim() : arena.trim()
        const arenaRegion = commaIdx >= 0 ? arena.substring(commaIdx + 1).trim() : ''
        if (fCountry && arenaRegion.toLowerCase() !== fCountry.toLowerCase()) return false
        if (fCity && arenaCity.toLowerCase() !== fCity.toLowerCase()) return false
      }
      return true
    })
  }

  // Post-search sort (applied after filtering)
  if (isDateFiltering) {
    switch (resultSort) {
      case 'oldest':
        nextPosts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'most_upvoted':
        nextPosts.sort((a, b) => b.upvote_count - a.upvote_count)
        break
      case 'least_upvoted':
        nextPosts.sort((a, b) => a.upvote_count - b.upvote_count)
        break
      case 'most_commented':
        nextPosts.sort((a, b) => b.comment_count - a.comment_count)
        break
      case 'least_commented':
        nextPosts.sort((a, b) => a.comment_count - b.comment_count)
        break
      default: // newest
        nextPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
    }
  }
  return nextPosts
  }, [isDateFiltering, rawPosts, resultSort, searchParams, searchQuery])

  // Client-side pagination for bulk results (avoid rendering 1000+ cards)
  const PAGE_SIZE = 100
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visiblePosts = useMemo(
    () => isDateFiltering ? posts.slice(0, visibleCount) : posts,
    [isDateFiltering, posts, visibleCount],
  )
  const hasMoreVisible = isDateFiltering && visibleCount < posts.length

  // ── Infinite scroll (normal mode only) ──
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    if (isDateFiltering) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '600px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, isDateFiltering])

  // Waiting for user to click Apply after page refresh
  if (isDateFiltering && !searchTriggered) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
        <div className="w-full max-w-[670px] space-y-4 xl:-ml-[245px]">
          {hasAdvancedParams(location.search) && <AdvancedSearchPanel />}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-12">
            <p className="text-sm text-white/40">Click <span className="font-medium text-[#c8a44d]/60">Apply Filters</span> to start searching</p>
          </div>
        </div>
      </div>
    )
  }

  // Bulk fetch progress screen
  if (isDateFiltering && bulk.isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
        <div className="w-full max-w-[670px] space-y-4 xl:-ml-[245px]">
          {hasAdvancedParams(location.search) && <AdvancedSearchPanel />}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#c8a44d]/60" />
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#c8a44d]/60"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <p className="mt-5 text-sm font-medium text-white/50">Scanning date range...</p>
            <p className="mt-1.5 text-xs text-white/25">
              {bulk.scanned} scanned · {posts.length} match{posts.length !== 1 ? 'es' : ''} · 20 workers
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="w-full max-w-[670px] space-y-4 xl:-ml-[245px]" data-content-column>
        <div data-onboarding="feed-compose">
          {hasAdvancedParams(location.search) ? <AdvancedSearchPanel /> : !hideCompose ? <ComposePost defaultTopic={activeTopic} /> : null}
        </div>
        {(pendingFeedNav !== null && !isDateFiltering) || (isLoading && !isDateFiltering) ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <PostCardSkeleton key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04]">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <p className="mt-4 text-sm font-medium text-white/40">
              {searchQuery
                ? `No posts found for "${searchQuery}"`
                : isDateFiltering ? 'No posts found matching filters'
                : 'No posts found'}
            </p>
            <p className="mt-1 text-xs text-white/25">Try a different search or filter</p>
          </div>
        ) : (
          <>
            {isDateFiltering && (
              <div className="relative flex items-center justify-between text-xs text-white/25">
                <span>
                  {posts.length} post{posts.length !== 1 ? 's' : ''} found
                  {bulk.scanned > 0 ? ` · ${bulk.scanned} scanned` : ''}
                </span>

                <div className="flex items-center gap-1.5">
                  {posts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => downloadSearchDataset(posts, voteMap, pollVoteMap, pickVoteMap, searchQuery)}
                      className="inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 text-[10px] font-medium text-white/50 transition-all hover:border-[#c8a44d]/30 hover:bg-[#c8a44d]/10 hover:text-[#c8a44d]"
                      title="Download matching dataset as JSON"
                    >
                      <Download className="h-3 w-3" />
                      <span>Dataset ({posts.length})</span>
                    </button>
                  )}

                  {!bulk.isLoading && (
                    <div ref={sortRef} className="relative z-20">
                      <button
                        type="button"
                        onClick={() => setSortOpen(!sortOpen)}
                        className={cn(
                          'inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 text-[10px] font-medium transition-all',
                          sortOpen
                            ? 'border-[#c8a44d]/30 bg-[#c8a44d]/10 text-[#c8a44d]'
                            : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:border-white/[0.12] hover:text-white/60'
                        )}
                      >
                        {RESULT_SORT_LABELS[resultSort]}
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn('transition-transform', sortOpen && 'rotate-180')}><path d="m6 9 6 6 6-6"/></svg>
                      </button>
                      {sortOpen && (
                        <div className="absolute right-0 top-full z-50 mt-1 min-w-[9rem] rounded-lg border border-white/[0.06] bg-[#141410] py-1 shadow-lg">
                          {Object.entries(RESULT_SORT_LABELS).map(([val, label]) => (
                            <button
                              key={val}
                              onClick={() => selectResultSort(val as ResultSort)}
                              className={cn(
                                'flex w-full cursor-pointer items-center px-3 py-1.5 text-xs transition-colors',
                                resultSort === val
                                  ? 'bg-[#c8a44d]/10 font-medium text-[#c8a44d]'
                                  : 'text-white/60 hover:bg-white/[0.03] hover:text-white/80'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {visiblePosts.map((post) => (
              <PostCard
                key={post.uuid}
                post={post}
                initialVote={voteMap.get(post.uuid) ?? 0}
                pollUserVote={pollVoteMap.get(post.uuid) ?? undefined}
                likertUserVote={likertVoteMap.get(post.uuid) ?? undefined}
                pickUserVote={pickVoteMap.get(post.uuid) ?? undefined}
                pollVoteMap={pollVoteMap}
                likertVoteMap={likertVoteMap}
                pickVoteMap={pickVoteMap}
                onQuote={openQuote}
              />
            ))}
            {hasMoreVisible && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-xs font-medium text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/60"
              >
                Show more ({posts.length - visibleCount} remaining)
              </button>
            )}
            {!isDateFiltering && <div ref={sentinelRef} className="h-1" />}
          </>
        )}

        {!isDateFiltering && isFetchingNextPage && (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => <PostCardSkeleton key={`loading-${i}`} />)}
          </div>
        )}
      </div>
    </div>
  )
}
