import { useState, useRef, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import {
  MessageCircle,
  MessageSquare,
  Triangle,
  Eye,
  Download,
  X,
  Star,
} from 'lucide-react'
import { EmojiPickerButton } from '@/components/emoji-picker/EmojiPickerButton'
import { NetworthPill } from '@/components/networth-pill/NetworthPill'
import { UserMetaPill } from '@/components/user-meta-pill/UserMetaPill'
import { timeAgo, renderPostText, cleanPostText } from '@/components/post-card/utils'
import { usePollResults, useLikertResults } from '@/hooks/usePostResults'

import { PollCard } from '@/components/post-card/PollCard'
import { LikertScale } from '@/components/post-card/LikertScale'
import { PicksCard } from '@/components/post-card/PicksCard'
import { QuotePostCard } from '@/components/post-card/QuotePostCard'
import { TransactionCard } from '@/components/post-card/TransactionCard'
import { LinkCard } from '@/components/post-card/LinkCard'
import { VideoPlayer } from '@/components/video-player/VideoPlayer'
import { CommentThread, type Comment } from './CommentThread'
import { usePost } from '@/hooks/usePost'
import { useComments } from '@/hooks/useComments'
import { useVotePost } from '@/hooks/useVotePost'
import { useCreateComment } from '@/hooks/useComments'
import { useFollow } from '@/components/profile/FollowContext'
import { useToast } from '@/components/toast/ToastContext'
import { humanizeError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useQueryClient } from '@tanstack/react-query'
import type { ArenaResponse, UserProfileResponse } from '@/lib/types'
import { PostDetailSkeleton, CommentsSkeleton } from '@/components/skeleton/Skeleton'
import { obfuscateText } from '@/lib/utils'
import { GifPickerButton } from '@/components/gif-picker/GifPickerButton'
import { extractMediaUrls, firstMediaUrl, getTextWithGifs, insertGifImage, normalizeMediaUrl, saveGif, removeGif, isGifSaved, stripMediaUrls, ZERO_WIDTH_MEDIA_TEXT } from '@/lib/gif'
import { MentionPicker } from '@/components/mention-picker/MentionPicker'
import { extractMentionUuids, notifyMentions } from '@/lib/mentionNotifications'

export function PostDetailPage() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pb-6 sm:px-8">
      <div className="w-full max-w-[670px] xl:-ml-[245px]">
        <PostDetail />
      </div>
    </div>
  )
}

function GifWithStar({ url }: { url: string }) {
  const [saved, setSaved] = useState(() => isGifSaved(url))

  useEffect(() => {
    function onSync() { setSaved(isGifSaved(url)) }
    window.addEventListener('gif-storage-change', onSync)
    return () => window.removeEventListener('gif-storage-change', onSync)
  }, [url])

  return (
    <div className="group/gif relative mt-1.5 w-fit">
      <img src={url} alt="GIF" className="max-w-[240px] rounded-lg" loading="lazy" />
      <button
        onClick={() => {
          if (saved) { removeGif(url); setSaved(false) }
          else { saveGif(url); setSaved(true) }
        }}
        className={`absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full opacity-0 transition-all group-hover/gif:opacity-100 ${
          saved ? 'bg-[#c8a44d]/90 text-[#0f0e0a]' : 'bg-black/60 text-white/60 hover:bg-black/80 hover:text-white'
        }`}
        title={saved ? 'Remove from saved GIFs' : 'Save GIF'}
      >
        <Star className={`h-3 w-3 ${saved ? 'fill-current' : ''}`} />
      </button>
    </div>
  )
}

export function PostDetail() {
  const { uuid } = useParams<{ uuid: string }>()
  const location = useLocation()
  const { auth } = useAuth()
  const { aliasFor } = useFollow()
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
  const commentMutation = useCreateComment()
  const isOwn = auth?.userUuid === post?.author_uuid

  // Poll user vote from the post response
  const pollUserVote = postData?.polls?.find((p) => p.post_uuid === uuid)?.option ?? undefined

  const [currentVote, setCurrentVote] = useState<1 | -1 | 0>(0)
  const [voteCount, setVoteCount] = useState(0)
  const [commentHasText, setCommentHasText] = useState(false)
  const [hasCommentSelection, setHasCommentSelection] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const commentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!lightboxOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [lightboxOpen])

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

    const patchPosts = <T extends { uuid: string; comment_count: number; upvote_count: number }>(posts?: T[]) =>
      (posts ?? []).map((p) => (p.uuid === postUuid ? { ...p, comment_count, upvote_count } : p))

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

    const mentionedUuids = extractMentionUuids(commentRef.current, auth?.userUuid)

    // Extract GIF URL directly from the DOM before converting to text
    const gifImg = commentRef.current.querySelector('img[data-gif-url]') as HTMLImageElement | null
    const gifFromImg = gifImg?.getAttribute('data-gif-url') ?? undefined

    // Get text content, stripping the GIF img element
    if (gifImg) gifImg.remove()
    const rawText = getTextWithGifs(commentRef.current).trim()
    const mediaUrl = gifFromImg ?? firstMediaUrl(rawText)
    const text = mediaUrl ? stripMediaUrls(rawText, [mediaUrl]) || ZERO_WIDTH_MEDIA_TEXT : rawText
    const gifMeta = mediaUrl ? { giphy_url: mediaUrl, giphy_id: mediaUrl } : null

    if (!text && !gifMeta) return

    commentMutation.mutate(
      { post_uuid: uuid, text, in_reply_to_uuid: uuid, ...gifMeta },
      {
        onSuccess: async () => {
          if (commentRef.current) {
            commentRef.current.innerHTML = ''
            setCommentHasText(false)
          }
          toast('success', 'Comment posted')
          if (auth && mentionedUuids.length > 0) {
            const result = await notifyMentions({
              auth,
              mentionedUuids,
              postUuid: uuid,
              contentType: 'comment',
            })
            if (result.sent > 0) toast('success', `Mention notification sent to ${result.sent}`)
            if (result.failed > 0) toast('error', `Failed to notify ${result.failed} mention${result.failed === 1 ? '' : 's'}`)
          }
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
  const isLink = post.post_type === 1 && !!post.post_meta?.link

  return (
    <div className="flex flex-col">
      <div className="pb-4 pt-1.5">
        {/* Author info row */}
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 sm:flex-nowrap sm:gap-2">
          <NetworthPill
            networth={post.author_meta.balance}
            subscriptionType={post.author_meta.subscription_type}
            authorUuid={post.author_uuid}
            role={post.author_meta.role}
            size="small"
          />
          <span className="text-xs text-white/40 sm:text-sm">{timeAgo(post.created_at)}</span>
          {post.topic && (
            <>
              <span className="text-sm text-white/40">·</span>
              <span className="max-w-[9rem] truncate text-xs font-semibold text-[#c8a44d] sm:max-w-none sm:text-sm">$/{post.topic.toLowerCase()}</span>
              {isPicks && post.post_meta?.resolution_deadline && (
                <>
                  <span className="text-sm text-white/40">·</span>
                  <span className="text-[11px] font-medium text-white/40 sm:text-[12px]">
                    Resolves {new Date(post.post_meta.resolution_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </>
              )}
              <span className="text-sm text-white/40">·</span>
              <span className="flex items-center gap-0.5 text-xs text-white/40 sm:gap-1 sm:text-sm">
                <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {post.view_count}
              </span>
            </>
          )}

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
        ) : (() => {
          const cleaned = cleanPostText(post.text)
          const postGifUrls = extractMediaUrls(cleaned).map(normalizeMediaUrl)
          const rawGifFromMeta = post.post_meta?.giphy_url
          const gifFromMeta = post.post_meta?.giphy_url
            ? normalizeMediaUrl(post.post_meta.giphy_url)
            : undefined
          const strippedText = stripMediaUrls(cleaned, rawGifFromMeta ? [rawGifFromMeta] : [])
          const allPostGifs: string[] = [...postGifUrls, ...(gifFromMeta && !postGifUrls.includes(gifFromMeta) ? [gifFromMeta] : [])].filter((u) => u !== post.post_meta?.src)
          return (
            <>
              {strippedText && strippedText !== ZERO_WIDTH_MEDIA_TEXT && (
                <div className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">
                  {renderPostText(strippedText)}
                </div>
              )}
              {allPostGifs.map((url, i) => (
                <GifWithStar key={i} url={url} />
              ))}
            </>
          )
        })()}

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
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 backdrop-blur-sm"
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

        {/* Link card */}
        {isLink && (
          <LinkCard url={post.post_meta!.link!} />
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
            className="flex-1 min-w-0"
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
            onPaste={(e) => {
              e.preventDefault()
              const text = e.clipboardData?.getData('text/plain') ?? ''
              const mediaUrl = firstMediaUrl(text)
              if (mediaUrl && commentRef.current) {
                const stripped = stripMediaUrls(text, [mediaUrl])
                if (stripped) document.execCommand('insertText', false, stripped)
                insertGifImage(commentRef.current, mediaUrl)
                setCommentHasText(true)
                return
              }
              if (text) document.execCommand('insertText', false, text)
            }}
            onInput={() => {
              const el = commentRef.current
              if (!el) return
              const hasText = el.textContent?.trim() !== '' || el.querySelector('img') !== null
              setCommentHasText(hasText)
              if (!hasText && el.innerHTML !== '') el.innerHTML = ''
            }}
            className="w-full min-h-[36px] px-4 py-2 pr-[12.5rem] text-sm text-white empty:before:content-[attr(data-placeholder)] empty:before:text-white/25 focus:outline-none"
          />
          <MentionPicker editorRef={commentRef} onMentionInserted={() => setCommentHasText(true)} />
          <div className="absolute right-1.5 bottom-1 flex items-center gap-1">
            <button
              disabled={!hasCommentSelection}
              onMouseDown={(e) => {
                e.preventDefault()
                const sel = window.getSelection()
                if (!sel || sel.isCollapsed || !commentRef.current?.contains(sel.anchorNode)) {
                  toast('error', 'Select some text first, then click ZWJ')
                  return
                }
                const selected = sel.toString()
                if (!selected) {
                  toast('error', 'Select some text first, then click ZWJ')
                  return
                }
                document.execCommand('insertText', false, obfuscateText(selected))
                toast('success', 'ZWJ applied \u2014 text is now obfuscated')
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
