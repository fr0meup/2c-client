import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MessageSquare, Triangle, MoreHorizontal, Link2, Trash2, Eye, Quote, UserPlus, UserCheck, Mail, Ban, Bookmark, Loader2 } from 'lucide-react'
import { NetworthPill } from '@/components/networth-pill/NetworthPill'
import { UserMetaPill } from '@/components/user-meta-pill/UserMetaPill'
import type { PostCardData } from './types'
import { cleanPostText, renderPostText, timeAgo, formatExactDateTime } from './utils'
import { cn } from '@/lib/utils'
import { useVotePost } from '@/hooks/useVotePost'
import { useDeletePost } from '@/hooks/usePostMutations'
import { useToggleBookmark } from '@/hooks/useBookmarks'
import { useBlockUser, useUnblockUser } from '@/hooks/useBlock'
import { useFollow } from '@/components/profile/FollowContext'
import { useToast } from '@/components/toast/ToastContext'
import { humanizeError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useCompose } from '@/layouts/AppLayout'
import { useQueryClient } from '@tanstack/react-query'
import { usePrefetch } from '@/hooks/usePrefetch'
import { preloadRoute } from '@/lib/routePreload'
import { announceNavigationPending } from '@/lib/navigationPending'
import { saveScrollPosition } from '@/App'
import { PollCard } from './PollCard'
import { LikertScale } from './LikertScale'
import { PicksCard } from './PicksCard'
import { QuotePostCard } from './QuotePostCard'
import { TransactionCard } from './TransactionCard'
import { BudgetCard } from './BudgetCard'
import { LinkCard } from './LinkCard'
import { PostImageGallery, getPostImages } from './PostImageGallery'
import { usePollResults, useLikertResults } from '@/hooks/usePostResults'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'
import { VideoPlayer } from '@/components/video-player/VideoPlayer'
import { ImageLightbox } from '@/components/lightbox/ImageLightbox'
import { extractMediaUrls, normalizeMediaUrl, stripMediaUrls, ZERO_WIDTH_MEDIA_TEXT } from '@/lib/gif'
import { GifWithStar } from '@/components/gif-picker/GifWithStar'

const TEXT_LIMIT = 280

function PlatformIcon({ platform }: { platform?: string }) {
  if (platform === 'ios') {
    return (
      <img
        src="https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fapple.0xxwgeqy4kw1g.png&w=32&q=75&dpl=dpl_5ovAARAu8zMP9MtrCL9RTcRsDq7b"
        alt="iOS"
        className="h-3.5 w-3.5 opacity-50"
      />
    )
  }
  if (platform === 'android') {
    return (
      <img
        src="https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fandroid.0ujtbb1oilk8l.png&w=32&q=75&dpl=dpl_5ovAARAu8zMP9MtrCL9RTcRsDq7b"
        alt="Android"
        className="h-3.5 w-3.5 opacity-50"
      />
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 text-white/40">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  )
}

// ── Main component ──
interface PostCardProps {
  post: PostCardData
  initialVote?: 1 | -1 | 0
  pollUserVote?: number
  likertUserVote?: number
  pickUserVote?: 'yes' | 'no'
  pollVoteMap?: Map<string, number>
  likertVoteMap?: Map<string, number>
  pickVoteMap?: Map<string, 'yes' | 'no'>
  alias?: string
  onQuote?: (post: PostCardData) => void
}

export function PostCard({
  post,
  initialVote = 0,
  pollUserVote,
  likertUserVote,
  pickUserVote,
  pollVoteMap,
  likertVoteMap,
  pickVoteMap,
  onQuote,
}: PostCardProps) {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const compose = useCompose()
  const { aliasFor, isFollowing, toggleFollow } = useFollow()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const blockUser = useBlockUser()
  const unblockUser = useUnblockUser()
  const { prefetchComments, prefetchPost } = usePrefetch()
  const alias = aliasFor(post.author_uuid)
  const images = getPostImages(post.post_meta)
  const imageSrc = images[0] || post.post_meta?.src || post.post_meta?.imageUrl
  const isVideoPost = post.post_meta?.media_type === 'video'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [dmLoading, setDmLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showAliasInput, setShowAliasInput] = useState(false)
  const [aliasInput, setAliasInput] = useState('')
  const aliasInputRef = useRef<HTMLInputElement>(null)
  const [currentVote, setCurrentVote] = useState<1 | -1 | 0>(initialVote)
  const [voteCount, setVoteCount] = useState(post.upvote_count ?? 0)
  const voteMutation = useVotePost()
  const deleteMutation = useDeletePost()
  const bookmarkMutation = useToggleBookmark()
  const isOwn = auth?.userUuid === post.author_uuid

  const pollOptions = post.post_meta?.poll
  const isPoll = post.post_type === 2 && pollOptions && pollOptions.length > 0
  const isLikert = post.post_type === 5
  const isPicks = post.post_type === 7
  const isTransaction = post.post_type === 8
  const isBudget = post.post_type === 9
  const isLink = post.post_type === 1 && !!post.post_meta?.link

  const { data: pollResults } = usePollResults(
    isPoll ? post.uuid : undefined,
    isPoll && (pollUserVote != null || isOwn)
  )
  const { data: likertData } = useLikertResults(
    isLikert ? post.uuid : undefined,
    isLikert
  )

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  if (!post?.author_meta) return null

  const cleanText = cleanPostText(post.text)
  const postGifUrls = extractMediaUrls(cleanText).map(normalizeMediaUrl)
  const rawGifFromMeta = post.post_meta?.giphy_url
  const gifFromMeta = post.post_meta?.giphy_url
    ? normalizeMediaUrl(post.post_meta.giphy_url)
    : undefined
  const textWithoutGifs = stripMediaUrls(cleanText, rawGifFromMeta ? [rawGifFromMeta] : [])
  const allPostGifs: string[] = [...postGifUrls, ...(gifFromMeta && !postGifUrls.includes(gifFromMeta) ? [gifFromMeta] : [])].filter((u) => u !== imageSrc)
  const visibleText = textWithoutGifs === ZERO_WIDTH_MEDIA_TEXT ? '' : textWithoutGifs
  const isLong = visibleText.length > TEXT_LIMIT
  const displayText = !expanded && isLong ? visibleText.slice(0, TEXT_LIMIT).trimEnd() + '…' : visibleText

  function handleVote(dir: 1 | -1) {
    const next = currentVote === dir ? 0 : dir
    setVoteCount((c) => c + (next - currentVote))
    setCurrentVote(next)
    voteMutation.mutate({ post_uuid: post.uuid, vote_type: next })
  }

  return (
    <>
      <article
        id={`post-${post.uuid}`}
        data-post-uuid={post.uuid}
        onClick={() => { saveScrollPosition(post.uuid); announceNavigationPending(`/post/${post.uuid}`); navigate(`/post/${post.uuid}`) }}
        onMouseEnter={() => {
          preloadRoute('post')
          prefetchPost(post.uuid)
          prefetchComments(post.uuid)
        }}
        className="cursor-pointer rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05] sm:p-4"
      >
        <div className="min-w-0">
          {/* Header row */}
          <div className={cn("flex items-start justify-between gap-2 sm:items-center", menuOpen && "relative z-30")}>
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 sm:flex-nowrap sm:gap-2" data-postcard-networth-pill>
              <NetworthPill
                networth={post.author_meta.balance}
                subscriptionType={post.author_meta.subscription_type}
                authorUuid={post.author_uuid}
                role={post.author_meta.role}
                size="small"
              />
              <span className="whitespace-nowrap text-xs text-white/40 sm:text-sm cursor-help hover:text-white/60 transition-colors" title={formatExactDateTime(post.created_at)}>
                {timeAgo(post.created_at)}
              </span>
              <span className="text-sm text-white/40">·</span>
              <PlatformIcon platform={post.post_meta?.platform} />
              {post.topic && (
                <>
                  <span className="text-sm text-white/40">·</span>
                  <span className="max-w-[9rem] truncate text-xs font-semibold text-[#c8a44d] sm:max-w-none sm:text-sm">$/{post.topic.toLowerCase()}</span>
                </>
              )}
              <span className="text-sm text-white/40">·</span>
              <span className="flex items-center gap-0.5 text-xs text-white/40 sm:gap-1 sm:text-sm">
                <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {post.view_count}
              </span>
            </div>

            {/* Menu */}
            <div className={cn("relative", menuOpen && "z-40")} ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p) }}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 max-w-[calc(100vw-2rem)] rounded-xl border border-white/[0.08] bg-[#141410] p-1 shadow-xl shadow-black/40">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(`https://twocents.money/post/${post.uuid}`)
                      setMenuOpen(false)
                      toast('success', 'Link copied')
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                  >
                    <Link2 className="h-3.5 w-3.5 text-white/40" />
                    Copy link
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      if (onQuote) onQuote(post)
                      else compose.openQuote(post)
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                  >
                    <Quote className="h-3.5 w-3.5 text-white/40" />
                    Quote post
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      bookmarkMutation.mutate(post.uuid, {
                        onSuccess: (res) => toast('success', res.bookmarked ? 'Post bookmarked' : 'Bookmark removed'),
                        onError: (err) => toast('error', `Bookmark failed: ${humanizeError(err)}`),
                      })
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                  >
                    <Bookmark className="h-3.5 w-3.5 text-white/40" />
                    Bookmark
                  </button>
                  {!isOwn && (
                    <>
                      <div className="my-1 h-px bg-white/[0.06]" />
                      {showAliasInput ? (
                        <div className="flex flex-col gap-1.5 p-2" onClick={(e) => e.stopPropagation()}>
                          <p className="text-[11px] text-white/35">Choose a nickname</p>
                          <input
                            ref={aliasInputRef}
                            value={aliasInput}
                            onChange={(e) => setAliasInput(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (e.key === 'Enter' && aliasInput.trim()) {
                                toggleFollow(post.author_uuid, aliasInput.trim())
                                setShowAliasInput(false)
                                setAliasInput('')
                                setMenuOpen(false)
                              }
                              if (e.key === 'Escape') { setShowAliasInput(false); setAliasInput('') }
                            }}
                            maxLength={30}
                            placeholder="e.g. John, trading-guy…"
                            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white/90 placeholder-white/30 outline-none focus:border-[#c8a44d]/40"
                            autoFocus
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!aliasInput.trim()) return
                                toggleFollow(post.author_uuid, aliasInput.trim())
                                setShowAliasInput(false)
                                setAliasInput('')
                                setMenuOpen(false)
                              }}
                              disabled={!aliasInput.trim()}
                              className="flex items-center gap-1.5 rounded-lg bg-[#c8a44d]/20 px-3 py-1.5 text-xs font-semibold text-[#c8a44d] transition-colors hover:bg-[#c8a44d]/30 disabled:opacity-50"
                            >
                              <UserPlus className="h-3 w-3" strokeWidth={2.5} />
                              Follow
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isFollowing(post.author_uuid)) {
                              toggleFollow(post.author_uuid)
                              setMenuOpen(false)
                            } else {
                              setShowAliasInput(true)
                            }
                          }}
                          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                        >
                          {isFollowing(post.author_uuid) ? (
                            <UserCheck className="h-3.5 w-3.5 text-[#c8a44d]" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5 text-white/40" />
                          )}
                          {isFollowing(post.author_uuid) ? 'Unfollow' : 'Follow'}
                        </button>
                      )}
                      <button
                        disabled={dmLoading}
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (!auth || dmLoading) return
                          setDmLoading(true)
                          try {
                            const { rpc } = await import('@/lib/api')
                            const result = await rpc<{ room: { uuid: string } }>(
                              '/v1/rooms/startDM',
                              { recipientUuid: post.author_uuid },
                              auth.token,
                              auth.userUuid,
                            )
                            const roomUuid = result.room.uuid
                            const [roomData, , messagesData] = await Promise.all([
                              rpc<import('@/lib/types').GetRoomResponse>(
                                '/v1/rooms/getRoom',
                                { roomUuid },
                                auth.token,
                                auth.userUuid,
                              ),
                              rpc<import('@/lib/types').GetMembersResponse>(
                                '/v1/rooms/getMembers',
                                { roomUuid },
                                auth.token,
                                auth.userUuid,
                              ),
                              rpc<import('@/lib/types').GetMessagesResponse>(
                                '/v1/rooms/getMessages',
                                { roomUuid, offset: 0, limit: 500 },
                                auth.token,
                                auth.userUuid,
                              ),
                            ])
                            queryClient.setQueryData<import('@/lib/types').ListRoomsResponse>(
                              ['rooms', 'dms'],
                              (prev) => {
                                const apiRoom = roomData.room
                                if (!prev) return { rooms: [apiRoom] }
                                if (prev.rooms.some((r) => r.uuid === apiRoom.uuid)) return prev
                                return { rooms: [apiRoom, ...prev.rooms] }
                              },
                            )
                            queryClient.setQueryData(['rooms', 'detail', roomUuid], roomData)
                            queryClient.setQueryData(['rooms', 'messages', roomUuid], messagesData)
                            setMenuOpen(false)
                            navigate(`/room/${roomUuid}`)
                            setTimeout(() => {
                              queryClient.invalidateQueries({ queryKey: ['rooms', 'dms'] })
                            }, 2000)
                          } catch {
                            setDmLoading(false)
                          }
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                      >
                        {dmLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />
                        ) : (
                          <Mail className="h-3.5 w-3.5 text-white/40" />
                        )}
                        {dmLoading ? 'Starting DM…' : 'Message'}
                      </button>
                      <div className="my-1 h-px bg-white/[0.06]" />
                      <button
                        disabled={blockUser.isPending || unblockUser.isPending}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (blocked) {
                            unblockUser.mutate(post.author_uuid, {
                              onSuccess: () => { setBlocked(false); setMenuOpen(false); toast('success', 'User unblocked') },
                              onError: (err) => { toast('error', `Failed to unblock: ${humanizeError(err)}`) },
                            })
                          } else {
                            blockUser.mutate(post.author_uuid, {
                              onSuccess: () => { setBlocked(true); setMenuOpen(false); toast('success', 'User blocked') },
                              onError: (err) => { toast('error', `Failed to block: ${humanizeError(err)}`) },
                            })
                          }
                        }}
                        className={blocked
                          ? 'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]'
                          : 'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-400 transition-colors hover:bg-rose-400/10'
                        }
                      >
                        {blockUser.isPending || unblockUser.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Ban className="h-3.5 w-3.5" />
                        )}
                        {blocked ? 'Unblock' : 'Block'}
                      </button>
                    </>
                  )}
                  {isOwn && (
                    <>
                      <div className="my-1 h-px bg-white/[0.06]" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(false)
                          setDeleteModalOpen(true)
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-400 transition-colors hover:bg-rose-400/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          {post.title && (
            <h3 className="mt-2 text-[17px] font-bold text-white">{post.title}</h3>
          )}

          {/* Body */}
          {isPicks ? (
            <PicksCard
              postUuid={post.uuid}
              priceHistory={post.post_meta?.price_history}
              userVote={pickUserVote}
              resolutionDeadline={post.post_meta?.resolution_deadline}
            />
          ) : (
            <>
              <div className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">
                {renderPostText(displayText)}
              </div>
              {isLong && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded((prev) => !prev) }}
                  className="mt-1 cursor-pointer text-sm font-medium text-[#c8a44d] transition-colors hover:text-[#c8a44d]/80"
                >
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
              {allPostGifs.map((url, i) => (
                <GifWithStar key={i} url={url} />
              ))}
            </>
          )}

          {/* Likert visual */}
          {isLikert && (
            <LikertScale
              postUuid={post.uuid}
              results={likertData?.results}
              userVote={likertUserVote ?? likertData?.myVote}
              isOwner={isOwn}
            />
          )}

          {/* Poll visual */}
          {isPoll && pollOptions && (
            <PollCard
              postUuid={post.uuid}
              options={pollOptions}
              results={pollResults}
              userVote={pollUserVote ?? null}
              isOwner={isOwn}
            />
          )}

          {/* Media */}
          {!isTransaction && (
            isVideoPost && imageSrc ? (
              <div className="mx-auto mt-3 w-[85%]" onClick={(e) => e.stopPropagation()}>
                <VideoPlayer src={imageSrc} compact />
              </div>
            ) : images.length > 0 ? (
              <div className="mt-3">
                <PostImageGallery
                  images={images}
                  onImageClick={(idx) => {
                    setLightboxIndex(idx)
                    setLightboxOpen(true)
                  }}
                />
              </div>
            ) : null
          )}



          {/* Transaction card */}
          {isTransaction && post.post_meta && (
            <TransactionCard
              category={post.post_meta.category}
              merchant={post.post_meta.merchant}
              date={post.post_meta.date}
              transactionValue={post.post_meta.transactionValue}
              currencyCode={post.post_meta.currencyCode}
              categoryIconUrl={post.post_meta.categoryIconUrl}
              imageUrl={post.post_meta.imageUrl}
            />
          )}

          {/* Budget card */}
          {isBudget && post.post_meta && (
            <BudgetCard
              month={post.post_meta.month}
              spendingLimit={post.post_meta.spendingLimit}
              totalAllocated={post.post_meta.totalAllocated}
              totalSpent={post.post_meta.totalSpent}
              categories={post.post_meta.categories}
            />
          )}

          {/* Link card */}
          {isLink && (
            <LinkCard url={post.post_meta!.link!} />
          )}

          {/* Quote post preview */}
          {post.post_meta?.quote_post && (
            <QuotePostCard
              quote={post.post_meta.quote_post}
              pollUserVote={pollVoteMap?.get(post.post_meta.quote_post.uuid)}
              likertUserVote={likertVoteMap?.get(post.post_meta.quote_post.uuid)}
              pickUserVote={pickVoteMap?.get(post.post_meta.quote_post.uuid)}
            />
          )}

          {/* Bottom row */}
          <div className="mt-3 flex items-center gap-2.5">
            {/* Meta pill */}
            <UserMetaPill
              elo={post.author_meta.elo_rating}
              alias={alias}
              gender={post.author_meta.gender}
              age={post.author_meta.age}
              arena={post.author_meta.arena}
              className="flex-1 min-w-0"
            />

            {/* Actions */}
            <div className="ml-auto flex shrink-0 items-center gap-2.5">
              <button
                onClick={(e) => { e.stopPropagation(); saveScrollPosition(post.uuid); announceNavigationPending(`/post/${post.uuid}`); navigate(`/post/${post.uuid}`) }}
                className="group flex h-[38px] cursor-pointer items-center gap-1.5 rounded-full border border-[#c8a44d]/20 bg-gradient-to-b from-white/[0.07] to-white/[0.03] px-4.5 text-sm text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.15)] transition-all hover:border-[#c8a44d]/30 hover:text-[#c8a44d] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_10px_rgba(218,178,87,0.1)] active:scale-95"
              >
                <MessageSquare className="h-3.5 w-3.5 fill-current transition-transform group-hover:scale-110" />
                <span className="text-sm font-semibold leading-5">{post.comment_count}</span>
              </button>

              <div className="flex h-[38px] items-center rounded-full border border-[#c8a44d]/20 bg-gradient-to-b from-white/[0.07] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.15)]">
                <button
                  onClick={(e) => { e.stopPropagation(); handleVote(1) }}
                  className={`group flex h-full cursor-pointer items-center px-2.5 transition-all active:scale-90 ${
                    currentVote === 1 ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]' : 'text-white/40 hover:text-emerald-400'
                  }`}
                >
                  <Triangle className={`h-3.5 w-3.5 fill-current transition-transform group-hover:-translate-y-0.5 ${currentVote === 1 ? 'drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]' : 'group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]'}`} />
                </button>
                <span className={`min-w-[1rem] text-center text-sm font-semibold leading-5 tabular-nums ${currentVote === 1 ? 'text-emerald-400' : currentVote === -1 ? 'text-rose-400' : 'text-white/80'}`}>
                  {voteCount}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleVote(-1) }}
                  className={`group flex h-full cursor-pointer items-center px-2.5 transition-all active:scale-90 ${
                    currentVote === -1 ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]' : 'text-white/40 hover:text-rose-400'
                  }`}
                >
                  <Triangle className={`h-3.5 w-3.5 rotate-180 fill-current transition-transform group-hover:translate-y-0.5 ${currentVote === -1 ? 'drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]' : 'group-hover:drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Lightbox */}
      {lightboxOpen && (
        isVideoPost && imageSrc ? (
          <div
            className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center overflow-hidden bg-black/90 backdrop-blur-md select-none"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false) }}
          >
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxOpen(false) }}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
              <VideoPlayer src={imageSrc} />
            </div>
          </div>
        ) : images.length > 0 ? (
          <ImageLightbox
            images={images}
            initialIndex={lightboxIndex}
            downloadName={`post-${post.uuid}.jpg`}
            onClose={() => setLightboxOpen(false)}
          />
        ) : null
      )}

      {deleteModalOpen && (
        <ConfirmDeleteModal
          isPending={deleteMutation.isPending}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={() => deleteMutation.mutate({ post_uuid: post.uuid }, { onSuccess: () => { setDeleteModalOpen(false); toast('success', 'Post deleted') } })}
        />
      )}
    </>
  )
}
