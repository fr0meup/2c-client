import { useState, useRef, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  MessageCircle,
  MessageSquare,
  Triangle,
  Eye,
  Download,
  X,
  Trash2,
  MoreHorizontal,
  Link2,
  Quote,
  UserPlus,
  UserCheck,
  Mail,
  Ban,
  Bookmark,
  Loader2,
} from 'lucide-react'
import { EmojiPickerButton } from '@/components/emoji-picker/EmojiPickerButton'
import { NetworthPill } from '@/components/networth-pill'
import { UserMetaPill } from '@/components/user-meta-pill'
import { timeAgo, renderPostText } from '@/components/post-card'
import { usePollResults, useLikertResults } from '@/hooks/usePostResults'

import { PollCard } from '@/components/post-card/PollCard'
import { LikertScale } from '@/components/post-card/LikertScale'
import { PicksCard } from '@/components/post-card/PicksCard'
import { QuotePostCard } from '@/components/post-card/QuotePostCard'
import { TransactionCard } from '@/components/post-card/TransactionCard'
import { VideoPlayer } from '@/components/video-player/VideoPlayer'
import { CommentThread } from './CommentThread'
import { usePost } from '@/hooks/usePost'
import { useComments } from '@/hooks/useComments'
import { useVotePost } from '@/hooks/useVotePost'
import { useDeletePost } from '@/hooks/usePostMutations'
import { useToggleBookmark } from '@/hooks/useBookmarks'
import { useBlockUser, useUnblockUser } from '@/hooks/useBlock'
import { useCreateComment } from '@/hooks/useComments'
import { useFollow } from '@/components/profile/FollowContext'
import { useToast } from '@/components/toast/ToastContext'
import { humanizeError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useQueryClient } from '@tanstack/react-query'
import type { ArenaResponse, UserProfileResponse } from '@/lib/types'
import { PostDetailSkeleton, CommentsSkeleton } from '@/components/skeleton'
import type { Comment } from './types'
import { obfuscateText } from '@/lib/obfuscate'
import { GifPickerButton } from '@/components/gif-picker/GifPickerButton'
import { getTextWithGifs, insertGifImage } from '@/lib/gif'

export function PostDetail() {
  const { uuid } = useParams<{ uuid: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { aliasFor, isFollowing, toggleFollow } = useFollow()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: postData, isLoading: postLoading } = usePost(uuid)

  // Look up the user's pick vote: post response → feed cache → profile cache
  const pickUserVote = (() => {
    // 1. From the post API response itself
    const pv0 = postData?.pickVotes?.find((v) => v.post_uuid === uuid)
    if (pv0) return pv0.vote

    // 2. From cached feed data
    const feedQueries = queryClient.getQueriesData<{ pages: ArenaResponse[] }>({ queryKey: ['feed'] })
    for (const [, feedData] of feedQueries) {
      if (!feedData?.pages) continue
      for (const page of feedData.pages) {
        const pv = page.pickVotes?.find((v) => v.post_uuid === uuid)
        if (pv) return pv.vote
      }
    }

    // 3. From cached profile data (recentPosts.pickVotes + pickPostsVotes.pickVotes)
    const profileQueries = queryClient.getQueriesData<{ pages: UserProfileResponse[] }>({ queryKey: ['userProfile'] })
    for (const [, profileData] of profileQueries) {
      if (!profileData?.pages) continue
      for (const page of profileData.pages) {
        const pv1 = page.recentPosts?.pickVotes?.find((v) => v.post_uuid === uuid)
        if (pv1) return pv1.vote
        const pv2 = page.pickPostsVotes?.pickVotes?.find((v) => v.post_uuid === uuid)
        if (pv2) return pv2.vote
      }
    }

    return undefined
  })()
  const post = postData?.post
  const { data: commentsData, isLoading: commentsLoading } = useComments(uuid)

  // Map API comments to the component's Comment type
  const comments: Comment[] = (commentsData?.comments ?? []).map((c) => ({
    uuid: c.uuid,
    created_at: c.created_at,
    post_uuid: c.post_uuid,
    reply_parent_uuid: c.reply_parent_uuid,
    author_uuid: c.author_uuid,
    author_meta: c.author_meta,
    comment_meta: c.comment_meta as Comment['comment_meta'],
    text: c.text,
    upvote_count: c.upvote_count,
    deleted_at: c.deleted_at,
  }))

  // Build comment vote lookup: content_uuid -> vote_type
  const commentVoteMap = new Map<string, 1 | -1 | 0>()
  if (commentsData?.votes) {
    for (const v of commentsData.votes) {
      commentVoteMap.set(v.content_uuid, v.vote_type)
    }
  }

  const voteMutation = useVotePost()
  const deleteMutation = useDeletePost()
  const bookmarkMutation = useToggleBookmark()
  const blockUser = useBlockUser()
  const unblockUser = useUnblockUser()
  const commentMutation = useCreateComment()
  const isOwn = auth?.userUuid === post?.author_uuid

  // Poll user vote from the post response
  const pollUserVote = postData?.polls?.find((p) => p.post_uuid === uuid)?.option ?? undefined

  const [currentVote, setCurrentVote] = useState<1 | -1 | 0>(0)
  const [voteCount, setVoteCount] = useState(0)
  const [commentHasText, setCommentHasText] = useState(false)
  const [hasCommentSelection, setHasCommentSelection] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [dmLoading, setDmLoading] = useState(false)
  const [showAliasInput, setShowAliasInput] = useState(false)
  const [aliasInput, setAliasInput] = useState('')
  const commentRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function checkCommentSel() {
      const sel = window.getSelection()
      const has = sel != null && !sel.isCollapsed && sel.toString().length > 0
      const inside = sel != null && commentRef.current != null && commentRef.current.contains(sel.anchorNode)
      setHasCommentSelection(has && inside)
    }
    document.addEventListener('selectionchange', checkCommentSel)
    return () => document.removeEventListener('selectionchange', checkCommentSel)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Sync vote count & vote state when post loads
  useEffect(() => {
    if (!postData) return
    setVoteCount(postData.post.upvote_count)
    const userVote = postData.votes?.find((v) => v.content_uuid === postData.post.uuid)
    setCurrentVote(userVote?.vote_type ?? 0)
  }, [postData])

  // Sync comment_count + upvote_count back to feed / profile caches so navigating back shows fresh numbers
  useEffect(() => {
    if (!postData?.post) return
    const { uuid: postUuid, comment_count, upvote_count } = postData.post

    const patchPosts = <T extends { uuid: string; comment_count: number; upvote_count: number }>(posts: T[]) =>
      posts.map((p) => (p.uuid === postUuid ? { ...p, comment_count, upvote_count } : p))

    queryClient.setQueriesData<{ pages: ArenaResponse[] }>(
      { queryKey: ['feed'] },
      (old) => {
        if (!old?.pages) return old
        return { ...old, pages: old.pages.map((page) => ({ ...page, posts: patchPosts(page.posts) })) }
      }
    )
    queryClient.setQueriesData<{ pages: UserProfileResponse[] }>(
      { queryKey: ['userProfile'] },
      (old) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            recentPosts: { ...page.recentPosts, posts: patchPosts(page.recentPosts.posts) },
            ...(page.votedPosts ? { votedPosts: { ...page.votedPosts, posts: patchPosts(page.votedPosts.posts) } } : {}),
          })),
        }
      }
    )
  }, [postData, queryClient])

  // Scroll to comment from URL hash (e.g. #comment-<uuid>)
  useEffect(() => {
    const hash = location.hash
    if (!hash || !hash.startsWith('#comment-')) return

    const targetId = hash.slice(1) // remove leading #
    let elapsed = 0
    const interval = 500
    const maxWait = 5000

    const timer = setInterval(() => {
      const el = document.getElementById(targetId)
      if (el) {
        clearInterval(timer)
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('comment-highlight')
        el.addEventListener('animationend', () => el.classList.remove('comment-highlight'), { once: true })
        return
      }
      elapsed += interval
      if (elapsed >= maxWait) clearInterval(timer)
    }, interval)

    return () => clearInterval(timer)
  }, [location.hash, commentsLoading])

  // Poll / Likert hooks (must be called unconditionally – before any early return)
  const pollOptions = post?.post_meta?.poll
  const isPoll = post?.post_type === 2 && !!pollOptions && pollOptions.length > 0
  const isLikert = post?.post_type === 5

  const { data: pollResults } = usePollResults(
    isPoll ? post!.uuid : undefined,
    isPoll && (pollUserVote != null || isOwn)
  )
  const { data: likertData } = useLikertResults(
    isLikert ? post!.uuid : undefined,
    !!isLikert
  )

  function handleVote(dir: 1 | -1) {
    if (!uuid) return
    const next = currentVote === dir ? 0 : dir
    setVoteCount((c) => c + (next - currentVote))
    setCurrentVote(next)
    voteMutation.mutate({ post_uuid: uuid, vote_type: next })
  }

  function handleSubmitComment() {
    if (!uuid || !commentRef.current) return
    const text = getTextWithGifs(commentRef.current).trim()
    if (!text) return

    commentMutation.mutate(
      { post_uuid: uuid, text, in_reply_to_uuid: uuid },
      {
        onSuccess: () => {
          if (commentRef.current) {
            commentRef.current.innerHTML = ''
            setCommentHasText(false)
          }
          toast('success', 'Comment posted')
        },
        onError: (err) => {
          toast('error', `Failed to comment: ${humanizeError(err)}`)
        },
      }
    )
  }

  if (postLoading) {
    return <PostDetailSkeleton />
  }

  if (!post) {
    return (
      <div className="px-4 py-20 text-center text-white/40">Post not found</div>
    )
  }

  const imageSrc = post.post_meta?.src
  const isVideoPost = post.post_meta?.media_type === 'video'
  const isPicks = post.post_type === 7
  const isTransaction = post.post_type === 8

  return (
    <div className="flex flex-col">
      <div className="pb-4 pt-1.5">
        {/* Author info row */}
        <div className="mt-1.5 flex items-center gap-2">
          <NetworthPill
            networth={post.author_meta.balance}
            subscriptionType={post.author_meta.subscription_type}
            authorUuid={post.author_uuid}
            role={post.author_meta.role}
            size="small"
          />
          <span className="text-sm text-white/40">{timeAgo(post.created_at)}</span>
          {post.topic && (
            <>
              <span className="text-sm text-white/40">·</span>
              <span className="text-sm font-semibold text-[#c8a44d]">$/{post.topic.toLowerCase()}</span>
              {isPicks && post.post_meta?.resolution_deadline && (
                <>
                  <span className="text-sm text-white/40">·</span>
                  <span className="text-[12px] font-medium text-white/40">
                    Resolves {new Date(post.post_meta.resolution_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </>
              )}
              <span className="text-sm text-white/40">·</span>
              <span className="flex items-center gap-1 text-sm text-white/40">
                <Eye className="h-3.5 w-3.5" />
                {post.view_count}
              </span>
            </>
          )}

          {/* 3-dot menu */}
          <div className="relative ml-auto" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-white/[0.08] bg-[#141410] p-1 shadow-xl shadow-black/40">
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); setMenuOpen(false) }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                >
                  <Link2 className="h-3.5 w-3.5 text-white/40" />
                  Copy link
                </button>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                >
                  <Quote className="h-3.5 w-3.5 text-white/40" />
                  Quote post
                </button>
                <button
                  onClick={() => {
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
                {!isOwn && post.author_uuid && (
                  <>
                    <div className="my-1 h-px bg-white/[0.06]" />
                    {showAliasInput ? (
                      <div className="flex flex-col gap-1.5 p-2">
                        <p className="text-[11px] text-white/35">Choose a nickname</p>
                        <input
                          value={aliasInput}
                          onChange={(e) => setAliasInput(e.target.value)}
                          onKeyDown={(e) => {
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
                            onClick={() => {
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
                        onClick={() => {
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
                      onClick={async () => {
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
                      {dmLoading ? 'Starting DM\u2026' : 'Message'}
                    </button>
                    <div className="my-1 h-px bg-white/[0.06]" />
                    <button
                      disabled={blockUser.isPending || unblockUser.isPending}
                      onClick={() => {
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
                      onClick={() => {
                        setMenuOpen(false)
                        if (confirm('Delete this post?')) {
                          deleteMutation.mutate(
                            { post_uuid: post.uuid },
                            { onSuccess: () => { toast('success', 'Post deleted'); navigate('/') } }
                          )
                        }
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
          <h1 className="mt-3 text-xl font-bold text-white">{post.title}</h1>
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
          <div className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">
            {renderPostText(post.text)}
          </div>
        )}

        {/* Likert visual */}
        {isLikert && (
          <LikertScale
            postUuid={post.uuid}
            results={likertData?.results}
            userVote={likertData?.myVote}
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
        {imageSrc && (
          <div className="mt-3 overflow-hidden rounded-2xl">
            {isVideoPost ? (
              <VideoPlayer src={imageSrc} />
            ) : (
              <img
                src={imageSrc}
                alt=""
                onClick={(e) => { e.stopPropagation(); setLightboxOpen(true) }}
                className="max-h-[32rem] w-full cursor-zoom-in object-contain transition-opacity hover:opacity-90"
              />
            )}
          </div>
        )}

        {/* Lightbox */}
        {lightboxOpen && imageSrc && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxOpen(false)}
          >
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  try {
                    const resp = await fetch(imageSrc)
                    const blob = await resp.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `image-${post.uuid}.${blob.type.split('/')[1] || 'jpg'}`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  } catch { /* ignore */ }
                }}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxOpen(false) }}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {isVideoPost ? (
              <div className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                <VideoPlayer src={imageSrc} />
              </div>
            ) : (
              <img src={imageSrc} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" onClick={(e) => e.stopPropagation()} />
            )}
          </div>
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
          />
        )}

        {/* Quote post preview */}
        {post.post_meta?.quote_post && (
          <QuotePostCard quote={post.post_meta.quote_post} />
        )}

        {/* Bottom bar: meta pill + actions */}
        <div className="mt-3 flex items-center gap-2.5">
          <UserMetaPill
            elo={post.author_meta.elo_rating}
            alias={aliasFor(post.author_uuid)}
            gender={post.author_meta.gender}
            age={post.author_meta.age}
            arena={post.author_meta.arena}
          />

          <div className="ml-auto flex shrink-0 items-center gap-2.5">
            <button className="group flex h-[38px] cursor-pointer items-center gap-1.5 rounded-full border border-[#c8a44d]/20 bg-gradient-to-b from-white/[0.07] to-white/[0.03] px-4.5 text-sm text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.15)] transition-all hover:border-[#c8a44d]/30 hover:text-[#c8a44d] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_10px_rgba(218,178,87,0.1)] active:scale-95">
              <MessageSquare className="h-3.5 w-3.5 fill-current transition-transform group-hover:scale-110" />
              <span className="text-sm font-semibold leading-5">{post.comment_count}</span>
            </button>

            <div className="flex h-[38px] items-center rounded-full border border-[#c8a44d]/20 bg-gradient-to-b from-white/[0.07] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.15)]">
              <button
                onClick={() => handleVote(1)}
                className={`group flex h-full cursor-pointer items-center px-2.5 transition-all active:scale-90 ${
                  currentVote === 1
                    ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                    : 'text-white/40 hover:text-emerald-400'
                }`}
              >
                <Triangle
                  className={`h-3.5 w-3.5 fill-current transition-transform group-hover:-translate-y-0.5 ${
                    currentVote === 1
                      ? 'drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                      : 'group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                  }`}
                />
              </button>
              <span
                className={`min-w-[1rem] text-center text-sm font-semibold leading-5 tabular-nums ${
                  currentVote === 1
                    ? 'text-emerald-400'
                    : currentVote === -1
                      ? 'text-rose-400'
                      : 'text-white/80'
                }`}
              >
                {voteCount}
              </span>
              <button
                onClick={() => handleVote(-1)}
                className={`group flex h-full cursor-pointer items-center px-2.5 transition-all active:scale-90 ${
                  currentVote === -1
                    ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]'
                    : 'text-white/40 hover:text-rose-400'
                }`}
              >
                <Triangle
                  className={`h-3.5 w-3.5 rotate-180 fill-current transition-transform group-hover:translate-y-0.5 ${
                    currentVote === -1
                      ? 'drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]'
                      : 'group-hover:drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 h-px border-t border-white/[0.06]" />
      </div>

      {/* Comment input */}
      <div className="pt-1 pb-3">
        <h2 className="text-sm font-bold text-white">Comments</h2>
        <div className={`mt-2 relative border border-white/[0.08] bg-white/[0.04] transition-all ${commentHasText ? 'rounded-xl' : 'rounded-full'}`}>
          <div
            ref={commentRef}
            contentEditable
            data-placeholder="Add your twocents"
            onInput={() => {
              const el = commentRef.current
              if (!el) return
              const hasText = el.textContent?.trim() !== '' || el.querySelector('img') !== null
              setCommentHasText(hasText)
              if (!hasText && el.innerHTML !== '') el.innerHTML = ''
            }}
            className="w-full min-h-[36px] px-4 py-2 pr-[12.5rem] text-sm text-white empty:before:content-[attr(data-placeholder)] empty:before:text-white/25 focus:outline-none"
          />
          <div className="absolute right-1.5 bottom-1 flex items-center gap-1">
            <button
              disabled={!hasCommentSelection}
              onMouseDown={(e) => {
                e.preventDefault()
                const sel = window.getSelection()
                if (!sel || sel.isCollapsed || !commentRef.current?.contains(sel.anchorNode)) return
                const selected = sel.toString()
                if (!selected) return
                document.execCommand('insertText', false, obfuscateText(selected))
              }}
              className={`flex h-[28px] cursor-pointer items-center justify-center rounded-full px-1.5 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                hasCommentSelection
                  ? 'text-white/40 hover:bg-white/[0.06] hover:text-white/50'
                  : 'text-white/25'
              }`}
              title="Obfuscate selected text"
            >
              ZWJ
            </button>
            <EmojiPickerButton
              onSelect={(emoji) => {
                const el = commentRef.current
                if (!el) return
                el.focus()
                document.execCommand('insertText', false, emoji)
                setCommentHasText(true)
              }}
            />
            <GifPickerButton
              onSelect={(url) => {
                const el = commentRef.current
                if (!el) return
                insertGifImage(el, url)
                setCommentHasText(true)
              }}
            />
            <button
              disabled={!commentHasText || commentMutation.isPending}
              onClick={handleSubmitComment}
              className={`h-[28px] cursor-pointer px-3 text-xs font-semibold transition-all ${
                commentHasText
                  ? 'rounded-lg bg-[#c8a44d] text-[#0f0e0a] hover:bg-[#c8a44d]/85'
                  : 'rounded-full bg-white/[0.06] text-white/25'
              }`}
            >
              {commentMutation.isPending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      {commentsLoading ? (
        <CommentsSkeleton />
      ) : comments.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-white/[0.12]" />
          <p className="mt-2 text-sm text-white/30">No comments yet</p>
        </div>
      ) : (
        <div className="flex flex-col pb-11.5">
          <CommentThread
            comments={comments}
            parentUuid={null}
            depth={0}
            isAbsoluteLast
            commentVoteMap={commentVoteMap}
          />
        </div>
      )}
    </div>
  )
}
