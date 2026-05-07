import { useState, useMemo, useRef, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { useParams, useSearchParams } from 'react-router-dom'
import { Triangle, Users, UserPlus, UserCheck, Loader2, X } from 'lucide-react'

import { useAuth } from '@/lib/auth'
import { UserMetaPill } from '@/components/user-meta-pill/UserMetaPill'
import { PostCard } from '@/components/post-card/PostCard'
import type { PostCardData } from '@/components/post-card/types'
import { PostCardSkeleton, ProfileSkeleton, Skeleton } from '@/components/skeleton/Skeleton'
import { useUserProfile } from '@/hooks/useUserProfile'
import type { Comment as ApiComment } from '@/lib/types'
import { BalanceChart } from './BalanceChart'
import { ProfileCommentCard } from './ProfileCommentCard'
import { ProfileTabs } from './ProfileTabs'
import { useFollow } from './FollowContext'
import { useFollowsMe } from '@/hooks/useFollow'
import { FollowingModal } from './FollowingModal'

function joinedAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(months / 12)}y`
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toLocaleString('en-US')
}

export interface BalancePoint {
  balance: number
  date: string
}

export interface UserProfileData {
  uuid: string
  username?: string
  balance: number
  delta_balance?: number
  bio?: string
  age?: number
  gender?: 'M' | 'F'
  arena?: string
  subscription_type: number
  elo_rating: number
  role?: string
  created_at: string
  followers?: number
  following?: number
  upvotes_received: number
  balance_history: BalancePoint[]
}

export type ProfileTab = 'posts' | 'comments' | 'votes' | 'picks'

export function UserProfile() {
  const { uuid } = useParams<{ uuid: string }>()
  const { auth } = useAuth()
  const targetUuid = uuid ?? auth?.userUuid
  const isOwnProfile = !uuid || uuid === auth?.userUuid
  const { isFollowing, toggleFollow, aliasFor } = useFollow()
  const { data: followsMeData } = useFollowsMe(isOwnProfile ? undefined : targetUuid)
  const followsMe = followsMeData?.hasAlias ?? false
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as ProfileTab) || 'posts'
  const [pendingTab, setPendingTab] = useState<ProfileTab | null>(null)
  const [pendingContentTab, setPendingContentTab] = useState<ProfileTab | null>(null)
  const pendingTabRun = useRef(0)
  const activeTab = pendingTab ?? tab
  const isTabPending = pendingContentTab !== null
  const setTab = (t: ProfileTab) => {
    if (t === activeTab) return
    const run = pendingTabRun.current + 1
    pendingTabRun.current = run
    flushSync(() => {
      setPendingTab(t)
    })
    window.requestAnimationFrame(() => {
      if (pendingTabRun.current !== run) return
      setPendingContentTab(t)
      setSearchParams(t === 'posts' ? {} : { tab: t }, { replace: true })
    })
  }
  const [showFollowing, setShowFollowing] = useState(false)

  const { data, isLoading, isError, fetchNextPage, isFetchingNextPage } = useUserProfile(targetUuid)

  const firstPage = data?.pages[0]

  // Merge posts + votes across all pages
  const { posts, voteMap, pollVoteMap, pickVoteMap } = useMemo(() => {
    if (!data?.pages) return { posts: [] as PostCardData[], voteMap: new Map<string, 1 | -1 | 0>(), pollVoteMap: new Map<string, number>(), pickVoteMap: new Map<string, 'yes' | 'no'>() }
    const allPosts: PostCardData[] = []
    const map = new Map<string, 1 | -1 | 0>()
    const pMap = new Map<string, number>()
    const pkMap = new Map<string, 'yes' | 'no'>()
    for (const page of data.pages) {
      for (const p of page.recentPosts.posts ?? []) {
        allPosts.push(p as unknown as PostCardData)
      }
      for (const v of page.recentPosts.votes ?? []) {
        map.set(v.content_uuid, v.vote_type)
      }
      for (const pv of page.recentPosts.polls ?? []) {
        pMap.set(pv.post_uuid, pv.option)
      }
      for (const pk of page.recentPosts.pickVotes ?? []) {
        pkMap.set(pk.post_uuid, pk.vote)
      }
    }
    return { posts: allPosts, voteMap: map, pollVoteMap: pMap, pickVoteMap: pkMap }
  }, [data?.pages])

  // Merge comments + votes + postTitles across all pages
  const { comments, commentVoteMap, postTitles } = useMemo(() => {
    if (!data?.pages) return { comments: [] as ApiComment[], commentVoteMap: new Map<string, 1 | -1 | 0>(), postTitles: {} as Record<string, string> }
    const allComments: ApiComment[] = []
    const map = new Map<string, 1 | -1 | 0>()
    const titles: Record<string, string> = {}
    for (const page of data.pages) {
      for (const c of page.recentComments?.comments ?? []) {
        allComments.push(c)
      }
      for (const v of page.recentComments?.votes ?? []) {
        map.set(v.content_uuid, v.vote_type)
      }
      Object.assign(titles, page.recentComments?.postTitles ?? {})
    }
    return { comments: allComments, commentVoteMap: map, postTitles: titles }
  }, [data?.pages])

  // Merge voted posts + their votes across all pages
  const { votedPosts, votedPostsVoteMap } = useMemo(() => {
    if (!data?.pages) return { votedPosts: [] as PostCardData[], votedPostsVoteMap: new Map<string, 1 | -1 | 0>() }
    const all: PostCardData[] = []
    const map = new Map<string, 1 | -1 | 0>()
    for (const page of data.pages) {
      for (const p of page.votedPosts?.posts ?? []) {
        all.push(p as unknown as PostCardData)
      }
      for (const v of page.votedPosts?.votes ?? []) {
        map.set(v.content_uuid, v.vote_type)
      }
    }
    return { votedPosts: all, votedPostsVoteMap: map }
  }, [data?.pages])

  // Merge pick votes + their votes across all pages
  const { pickPosts, pickPostsVoteMap, pickPostsPickVoteMap } = useMemo(() => {
    if (!data?.pages) return { pickPosts: [] as PostCardData[], pickPostsVoteMap: new Map<string, 1 | -1 | 0>(), pickPostsPickVoteMap: new Map<string, 'yes' | 'no'>() }
    const all: PostCardData[] = []
    const map = new Map<string, 1 | -1 | 0>()
    const pkMap = new Map<string, 'yes' | 'no'>()
    for (const page of data.pages) {
      for (const p of page.pickPostsVotes?.posts ?? []) {
        all.push(p as unknown as PostCardData)
      }
      for (const v of page.pickPostsVotes?.votes ?? []) {
        map.set(v.content_uuid, v.vote_type)
      }
      for (const pk of page.pickPostsVotes?.pickVotes ?? []) {
        pkMap.set(pk.post_uuid, pk.vote)
      }
    }
    return { pickPosts: all, pickPostsVoteMap: map, pickPostsPickVoteMap: pkMap }
  }, [data?.pages])

  // Determine what still has more per-tab
  const lastPage = data?.pages[data.pages.length - 1]
  const hasMorePosts = lastPage?.pagination.hasMorePosts ?? false
  const hasMoreComments = lastPage?.pagination.hasMoreComments ?? false

  useEffect(() => {
    if (pendingTab !== tab) return
    const frame = window.requestAnimationFrame(() => {
      setPendingTab(null)
      setPendingContentTab(null)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pendingTab, tab])

  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (isError || !firstPage) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4">
        <p className="text-sm text-white/40">User not found</p>
      </div>
    )
  }

  const u = firstPage.user
  const profile: UserProfileData = {
    uuid: u.uuid,
    balance: u.balance,
    delta_balance: Number(u.delta_balance) || 0,
    bio: u.bio,
    age: u.age,
    gender: u.gender as 'M' | 'F' | undefined,
    arena: u.arena,
    subscription_type: u.subscription_type,
    elo_rating: u.elo_rating,
    role: u.role,
    created_at: u.created_at,
    upvotes_received: firstPage.totalUpvotes,
    followers: firstPage.aliasesReceived,
    following: firstPage.aliasesGiven,
    balance_history: firstPage.balanceHistory,
  }

  const following = isFollowing(targetUuid ?? '')

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="flex w-full max-w-[670px] flex-col gap-4 xl:-ml-[245px]">
        {/* Cohesive identity panel: chart + bio + stats + meta */}
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] px-4 pb-5 pt-4 shadow-lg shadow-black/20">
          <BalanceChart history={profile.balance_history} />

          {profile.bio && (
            <p className="mt-4 px-2 text-center text-[14px] leading-snug text-white/80">{profile.bio}</p>
          )}

          <div className="mt-4 grid w-full grid-cols-3 items-stretch gap-2 text-sm sm:flex sm:items-center sm:justify-center sm:gap-5">
            {profile.followers != null && (
              <>
                <Stat
                  icon={<Users className="h-3.5 w-3.5" strokeWidth={2.2} />}
                  label="Followers"
                  display={formatCompact(profile.followers)}
                />
                <span className="hidden h-4 w-px bg-white/10 sm:block" />
              </>
            )}
            {profile.following != null && (
              <>
                {isOwnProfile ? (
                  <button
                    onClick={() => setShowFollowing(true)}
                    className="min-w-0 cursor-pointer transition-opacity hover:opacity-80"
                  >
                    <Stat
                      icon={<UserPlus className="h-3.5 w-3.5" strokeWidth={2.2} />}
                      label="Following"
                      display={formatCompact(profile.following)}
                    />
                  </button>
                ) : (
                  <Stat
                    icon={<UserPlus className="h-3.5 w-3.5" strokeWidth={2.2} />}
                    label="Following"
                    display={formatCompact(profile.following)}
                  />
                )}
                <span className="hidden h-4 w-px bg-white/10 sm:block" />
              </>
            )}
            <Stat
              icon={<Triangle className="h-3 w-3 fill-current" strokeWidth={0} />}
              label="Upvotes"
              display={profile.upvotes_received.toLocaleString('en-US')}
            />
          </div>

          <div className="mt-4 flex items-center justify-center">
            <UserMetaPill
              elo={profile.elo_rating}
              alias={aliasFor(targetUuid ?? '')}
              gender={profile.gender}
              age={profile.age}
              arena={profile.arena}
              className="!flex-initial"
            >
              <span className="flex items-center gap-1 px-3 py-2 text-white/50">
                <span className="text-[11px] uppercase tracking-wider text-white/30">Joined</span>
                <span className="font-medium text-white/80">{joinedAgo(profile.created_at)}</span>
              </span>
            </UserMetaPill>
          </div>

          {isOwnProfile && showFollowing && (
            <FollowingModal onClose={() => setShowFollowing(false)} />
          )}

          {!isOwnProfile && (
            <FollowSection
              following={following}
              followsMe={followsMe}
              onToggleFollow={(alias) => toggleFollow(targetUuid ?? '', alias)}
            />
          )}
        </section>

        {/* Tabs */}
        <div className="flex items-center justify-center pt-1">
          <ProfileTabs active={activeTab} onChange={setTab} isOwnProfile={isOwnProfile} />
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4">
          {isTabPending ? (
            <ProfileTabSkeleton tab={activeTab} />
          ) : activeTab === 'posts' && (
            posts.length === 0 ? (
              <EmptyState message="No posts yet" />
            ) : (
              <>
                {posts.map((post) => (
                  <PostCard
                    key={post.uuid}
                    post={post}
                    initialVote={voteMap.get(post.uuid) ?? 0}
                    pollUserVote={pollVoteMap.get(post.uuid) ?? undefined}
                    pickUserVote={pickVoteMap.get(post.uuid) ?? undefined}
                  />
                ))}
                {hasMorePosts && (
                  <LoadMoreButton loading={isFetchingNextPage} onClick={() => fetchNextPage()} />
                )}
              </>
            )
          )}
          {!isTabPending && activeTab === 'comments' && (
            comments.length === 0 ? (
              <EmptyState message="No comments yet" />
            ) : (
              <>
                {comments.map((c) => (
                  <ProfileCommentCard
                    key={c.uuid}
                    comment={c}
                    postTitle={postTitles[c.post_uuid] || undefined}
                    initialVote={commentVoteMap.get(c.uuid) ?? 0}
                  />
                ))}
                {hasMoreComments && (
                  <LoadMoreButton loading={isFetchingNextPage} onClick={() => fetchNextPage()} />
                )}
              </>
            )
          )}
          {isOwnProfile && !isTabPending && activeTab === 'votes' && (
            votedPosts.length === 0 ? (
              <EmptyState message="No votes yet" />
            ) : (
              <>
                {votedPosts.map((post) => (
                  <PostCard
                    key={post.uuid}
                    post={post}
                    initialVote={votedPostsVoteMap.get(post.uuid) ?? 0}
                  />
                ))}
              </>
            )
          )}
          {isOwnProfile && !isTabPending && activeTab === 'picks' && (
            pickPosts.length === 0 ? (
              <EmptyState message="No picks yet" />
            ) : (
              <>
                {pickPosts.map((post) => (
                  <PostCard
                    key={post.uuid}
                    post={post}
                    initialVote={pickPostsVoteMap.get(post.uuid) ?? 0}
                    pickUserVote={pickPostsPickVoteMap.get(post.uuid) ?? undefined}
                  />
                ))}
              </>
            )
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, display }: { icon: React.ReactNode; label: string; display: string }) {
  return (
    <span className="flex min-w-0 flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] px-1.5 py-2 text-center sm:flex-row sm:items-baseline sm:gap-1.5 sm:border-0 sm:bg-transparent sm:p-0">
      <span className="text-[#c8a44d]/70 sm:translate-y-[1px]">{icon}</span>
      <span className="max-w-full truncate font-bold text-white tabular-nums">{display}</span>
      <span className="max-w-full truncate text-[10px] leading-tight text-white/40 sm:text-xs">{label}</span>
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16">
      <p className="text-sm text-white/40">{message}</p>
    </div>
  )
}

function ProfileCommentSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3.5 w-44" />
      </div>
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-5/6" />
      <div className="mt-3 flex items-center gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="ml-auto h-[38px] w-24 rounded-full" />
      </div>
    </div>
  )
}

function ProfileTabSkeleton({ tab }: { tab: ProfileTab }) {
  if (tab === 'comments') {
    return (
      <>
        {[...Array(4)].map((_, i) => <ProfileCommentSkeleton key={i} />)}
      </>
    )
  }

  return (
    <>
      {[...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}
    </>
  )
}

function LoadMoreButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-center py-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-6 text-sm font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          'Load more'
        )}
      </button>
    </div>
  )
}

/* ── Follow button with inline alias prompt ── */

function FollowSection({
  following,
  followsMe,
  onToggleFollow,
}: {
  following: boolean
  followsMe: boolean
  onToggleFollow: (alias?: string) => void
}) {
  const [showInput, setShowInput] = useState(false)
  const [alias, setAlias] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showInput) inputRef.current?.focus()
  }, [showInput])

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {following ? (
          <button
            onClick={() => onToggleFollow()}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.06] px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/[0.1] active:scale-[0.98]"
          >
            <UserCheck className="h-4 w-4" strokeWidth={2.2} />
            <span>Following</span>
          </button>
        ) : showInput ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && alias.trim()) {
                  onToggleFollow(alias.trim())
                  setShowInput(false)
                  setAlias('')
                }
                if (e.key === 'Escape') { setShowInput(false); setAlias('') }
              }}
              maxLength={30}
              placeholder="Alias for this person…"
              className="h-9 w-44 rounded-full border border-[#c8a44d]/30 bg-white/[0.04] px-4 text-sm text-white/90 placeholder-white/30 outline-none focus:border-[#c8a44d]/50"
            />
            <button
              onClick={() => {
                if (!alias.trim()) return
                onToggleFollow(alias.trim())
                setShowInput(false)
                setAlias('')
              }}
              disabled={!alias.trim()}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-[#c8a44d] px-4 text-sm font-semibold text-[#0f0e0a] transition-all hover:bg-[#c8a44d]/90 disabled:opacity-50 active:scale-[0.98]"
            >
              <UserPlus className="h-4 w-4" strokeWidth={2.2} />
              Follow
            </button>
            <button
              onClick={() => { setShowInput(false); setAlias('') }}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white/70"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-full bg-[#c8a44d] px-5 text-sm font-semibold text-[#0f0e0a] transition-all duration-200 hover:bg-[#c8a44d]/90 hover:shadow-lg hover:shadow-[#c8a44d]/20 active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" strokeWidth={2.2} />
            <span>Follow</span>
          </button>
        )}
        {followsMe && (
          <span className="rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/50">
            Follows you
          </span>
        )}
      </div>
    </div>
  )
}
