import { useState, useRef, useEffect } from 'react'
import { MessageSquare, MoreHorizontal, Link2, Trash2, Triangle, Star, ImagePlus, X, Loader2 } from 'lucide-react'
import { EmojiPickerButton } from '@/components/emoji-picker/EmojiPickerButton'
import { NetworthPill } from '@/components/networth-pill/NetworthPill'
import { UserMetaPill } from '@/components/user-meta-pill/UserMetaPill'
import { timeAgo, cleanPostText, renderPostText, formatExactDateTime } from '@/components/post-card/utils'
import { useCreateComment, useDeleteComment } from '@/hooks/useComments'
import { useVoteComment } from '@/hooks/useVotes'
import { useAuth } from '@/lib/auth'
import { useFollow } from '@/components/profile/FollowContext'
import { useToast } from '@/components/toast/ToastContext'
import { humanizeError } from '@/lib/api'
import type { Comment } from './CommentThread'
import { obfuscateText } from '@/lib/utils'
import { extractMediaUrls, firstMediaUrl, saveGif, removeGif, isGifSaved, getTextWithGifs, insertGifImage, normalizeMediaUrl, stripMediaUrls, ZERO_WIDTH_MEDIA_TEXT, isUploadedUrl, fetchOrConvertImageToFile } from '@/lib/gif'
import { GifPickerButton } from '@/components/gif-picker/GifPickerButton'
import { MentionPicker } from '@/components/mention-picker/MentionPicker'
import { extractMentionUuids, notifyMentions } from '@/lib/mentionNotifications'
import { useUploadImage } from '@/hooks/useUploadImage'
import { ImageLightbox } from '@/components/lightbox/ImageLightbox'

function GifWithStar({ url, onOpenLightbox }: { url: string; onOpenLightbox?: (url: string) => void }) {
  const [saved, setSaved] = useState(() => isGifSaved(url))

  useEffect(() => {
    function onSync() { setSaved(isGifSaved(url)) }
    window.addEventListener('gif-storage-change', onSync)
    return () => window.removeEventListener('gif-storage-change', onSync)
  }, [url])

  return (
    <div className="group/gif relative mt-1.5 w-fit">
      <img
        src={url}
        alt=""
        onClick={(e) => {
          if (onOpenLightbox) {
            e.stopPropagation()
            onOpenLightbox(url)
          }
        }}
        className={`max-w-[320px] max-h-[280px] rounded-xl object-cover transition-opacity ${
          onOpenLightbox ? 'cursor-pointer hover:opacity-90' : ''
        }`}
        loading="lazy"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (saved) {
            removeGif(url)
            setSaved(false)
          } else {
            saveGif(url)
            setSaved(true)
          }
        }}
        className={`absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full opacity-0 transition-all group-hover/gif:opacity-100 ${
          saved
            ? 'bg-[#c8a44d]/90 text-[#0f0e0a]'
            : 'bg-black/60 text-white/60 hover:bg-black/80 hover:text-white'
        }`}
        title={saved ? 'Remove from saved GIFs' : 'Save to GIF picker'}
      >
        <Star className={`h-3 w-3 ${saved ? 'fill-current' : ''}`} />
      </button>
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  depth: number
  isLast: boolean
  isAbsoluteLast: boolean
  hasReplies: boolean
  initialVote?: 1 | -1 | 0
}

export function CommentItem({
  comment,
  depth,
  isLast,
  isAbsoluteLast,
  hasReplies,
  initialVote = 0,
}: CommentItemProps) {
  const { aliasFor } = useFollow()
  const { toast } = useToast()
  const alias = aliasFor(comment.author_uuid)
  const [currentVote, setCurrentVote] = useState<1 | -1 | 0>(initialVote)
  const [voteCount, setVoteCount] = useState(comment.upvote_count)
  const [menuOpen, setMenuOpen] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyHasText, setReplyHasText] = useState(false)
  const [hasReplySelection, setHasReplySelection] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const replyRef = useRef<HTMLDivElement>(null)
  const { auth } = useAuth()
  const replyMutation = useCreateComment()
  const deleteMutation = useDeleteComment()
  const voteMutation = useVoteComment()
  const uploadImage = useUploadImage()
  const isOwn = auth?.userUuid === comment.author_uuid
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null)
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null)
  const replyFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  useEffect(() => {
    if (!replyOpen) return
    function checkReplySel() {
      const sel = window.getSelection()
      const has = sel != null && !sel.isCollapsed && sel.toString().length > 0
      const inside = sel != null && replyRef.current != null && replyRef.current.contains(sel.anchorNode)
      setHasReplySelection(has && inside)
    }
    document.addEventListener('selectionchange', checkReplySel)
    return () => document.removeEventListener('selectionchange', checkReplySel)
  }, [replyOpen])

  function handleVote(dir: 1 | -1) {
    const next = currentVote === dir ? 0 : dir
    setVoteCount((c) => c + (next - currentVote))
    setCurrentVote(next)
    voteMutation.mutate({
      comment_uuid: comment.uuid,
      post_uuid: comment.post_uuid,
      vote_type: next,
    })
  }

  function handleSubmitReply() {
    if (!replyRef.current) return

    const mentionedUuids = extractMentionUuids(replyRef.current, auth?.userUuid)

    // Extract GIF URL directly from the DOM before converting to text
    const gifImg = replyRef.current.querySelector('img[data-gif-url]') as HTMLImageElement | null
    const gifFromImg = gifImg?.getAttribute('data-gif-url') ?? undefined

    if (gifImg) gifImg.remove()
    const rawText = getTextWithGifs(replyRef.current).trim()
    const mediaUrl = gifFromImg ?? firstMediaUrl(rawText)
    const text = mediaUrl ? stripMediaUrls(rawText, [mediaUrl]) || ZERO_WIDTH_MEDIA_TEXT : rawText
    const gifMeta = mediaUrl ? { giphy_url: mediaUrl, giphy_id: mediaUrl } : null

    if (!text && !gifMeta && !replyImageFile) return

    const doSubmit = (imageUrl?: string) => {
      const finalImageUrl = imageUrl || (isUploadedUrl(mediaUrl) ? mediaUrl : undefined)
      replyMutation.mutate(
        {
          post_uuid: comment.post_uuid,
          text,
          in_reply_to_uuid: comment.uuid,
          ...(finalImageUrl ? { image_url: finalImageUrl } : {}),
        },
        {
          onSuccess: async (data: any) => {
            if (replyRef.current) {
              replyRef.current.innerHTML = ''
              setReplyHasText(false)
            }
            setReplyImageFile(null)
            setReplyImagePreview(null)
            setReplyOpen(false)
            toast('success', 'Reply posted')
            if (auth && mentionedUuids.length > 0) {
              const createdCommentUuid = data?.comment?.uuid || data?.uuid
              const result = await notifyMentions({
                auth,
                mentionedUuids,
                postUuid: comment.post_uuid,
                commentUuid: createdCommentUuid,
                contentType: 'comment',
              })
              if (result.sent > 0) toast('success', `Mention notification sent to ${result.sent}`)
              if (result.failed > 0) toast('error', `Failed to notify ${result.failed} mention${result.failed === 1 ? '' : 's'}`)
            }
          },
          onError: (err) => {
            toast('error', `Failed to reply: ${humanizeError(err)}`)
          },
        }
      )
    }

    if (replyImageFile || mediaUrl) {
      const prepareUpload = async () => {
        if (replyImageFile) {
          const res = await uploadImage.mutateAsync(replyImageFile)
          return res.publicURL
        }
        if (mediaUrl) {
          if (isUploadedUrl(mediaUrl)) return mediaUrl
          const gifFile = await fetchOrConvertImageToFile(mediaUrl)
          const res = await uploadImage.mutateAsync(gifFile)
          return res.publicURL
        }
        return undefined
      }

      prepareUpload()
        .then((uploadedUrl) => {
          if (uploadedUrl) {
            doSubmit(uploadedUrl)
          } else {
            toast('error', 'Could not fetch image from URL. Try downloading and uploading the file directly.')
          }
        })
        .catch((err) => toast('error', `Media upload failed: ${humanizeError(err)}`))
    } else {
      doSubmit()
    }
  }

  const isDeleted = !!comment.deleted_at

  return (
    <div
      id={`comment-${comment.uuid}`}
      className="relative py-3 pr-4 transition-colors hover:bg-white/[0.02]"
      style={{ paddingLeft: depth === 0 ? '0' : '1rem' }}
    >
      {/* Bottom border */}
      {isAbsoluteLast && isLast && !hasReplies ? (
        <div className="absolute bottom-0 left-0 right-0 border-b border-white/[0.06]" />
      ) : (
        <div
          className="absolute bottom-0 right-4"
          style={{ left: depth === 0 ? '0' : '1rem', height: '1px', background: 'rgba(255,255,255,0.12)' }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <NetworthPill
            networth={comment.author_meta.balance}
            subscriptionType={comment.author_meta.subscription_type}
            authorUuid={comment.author_uuid}
            role={comment.author_meta.role}
            size="small"
          />
          <span className="text-xs text-white/40 cursor-help hover:text-white/60 transition-colors" title={formatExactDateTime(comment.created_at)}>{timeAgo(comment.created_at)}</span>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/40"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-white/[0.08] bg-[#141410] p-1 shadow-xl shadow-black/40">
              <button
                onClick={() => setMenuOpen(false)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
              >
                <Link2 className="h-3.5 w-3.5 text-white/40" />
                Copy link
              </button>
              {isOwn && (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  deleteMutation.mutate(
                    { comment_uuid: comment.uuid, post_uuid: comment.post_uuid },
                    {
                      onSuccess: () => toast('success', 'Comment deleted'),
                      onError: (err) => toast('error', `Failed to delete: ${humanizeError(err)}`),
                    }
                  )
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-400 transition-colors hover:bg-rose-400/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comment text + inline GIFs */}
      {isDeleted ? (
        <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed italic text-white/30">
          [deleted]
        </p>
      ) : (() => {
        const text = cleanPostText(comment.text)
        const gifUrls = extractMediaUrls(text).map(normalizeMediaUrl)
        const rawGifFromMeta = comment.comment_meta?.giphy_url
        const gifFromMeta = comment.comment_meta?.giphy_url
          ? normalizeMediaUrl(comment.comment_meta.giphy_url)
          : undefined
        const strippedText = stripMediaUrls(text, rawGifFromMeta ? [rawGifFromMeta] : [])
        const commentImageUrl = comment.comment_meta?.image_url
        const allMedia: string[] = Array.from(new Set([
          ...gifUrls,
          ...(gifFromMeta ? [gifFromMeta] : []),
          ...(commentImageUrl ? [commentImageUrl] : [])
        ]))

        return (
          <>
            {strippedText && strippedText !== ZERO_WIDTH_MEDIA_TEXT && (
              <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-white/90">
                {renderPostText(strippedText)}
              </p>
            )}
            {allMedia.map((url, i) => (
              <GifWithStar key={i} url={url} onOpenLightbox={(u) => setLightboxUrl(u)} />
            ))}
          </>
        )
      })()}

      {lightboxUrl && (
        <ImageLightbox
          src={lightboxUrl}
          downloadName={`comment-${comment.uuid}.jpg`}
          onClose={() => setLightboxUrl(null)}
        />
      )}

      {/* Bottom bar: meta + actions */}
      <div className="mt-2 flex items-center gap-2">
        <UserMetaPill
          elo={comment.author_meta.elo_rating}
          alias={alias}
          gender={comment.author_meta.gender}
          age={comment.author_meta.age}
          arena={comment.author_meta.arena}
          variant="comment"
        />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {depth < 5 && (
            <button
              onClick={() => {
                setReplyOpen((p) => !p)
                setTimeout(() => replyRef.current?.focus(), 50)
              }}
              className={`group flex h-[38px] cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs transition-all active:scale-95 ${
                replyOpen
                  ? 'border-[#c8a44d]/30 bg-[#c8a44d]/10 text-[#c8a44d]'
                  : 'border-white/[0.08] bg-white/[0.04] text-white/40 hover:border-[#c8a44d]/30 hover:text-[#c8a44d]'
              }`}
            >
              <MessageSquare className="h-3 w-3 fill-current transition-transform group-hover:scale-110" />
            </button>
          )}

          <div className="flex h-[38px] items-center rounded-full border border-white/[0.08] bg-white/[0.04]">
            <button
              onClick={() => handleVote(1)}
              className={`group flex h-full cursor-pointer items-center px-2 transition-all active:scale-90 ${
                currentVote === 1
                  ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                  : 'text-white/40 hover:text-emerald-400'
              }`}
            >
              <Triangle
                className={`h-3 w-3 fill-current transition-transform group-hover:-translate-y-0.5 ${
                  currentVote === 1
                    ? 'drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                    : 'group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                }`}
              />
            </button>
            <span
              className={`min-w-[0.75rem] text-center text-xs font-semibold leading-5 tabular-nums ${
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
              className={`group flex h-full cursor-pointer items-center px-2 transition-all active:scale-90 ${
                currentVote === -1
                  ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]'
                  : 'text-white/40 hover:text-rose-400'
              }`}
            >
              <Triangle
                className={`h-3 w-3 rotate-180 fill-current transition-transform group-hover:translate-y-0.5 ${
                  currentVote === -1
                    ? 'drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]'
                    : 'group-hover:drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Reply input */}
      {replyOpen && (
        <div className={`mt-2 relative border border-white/[0.08] bg-white/[0.04] transition-all ${replyHasText || replyImagePreview ? 'rounded-xl' : 'rounded-full'}`}>
          <div
            ref={replyRef}
            contentEditable
            data-placeholder="Reply..."
            onPaste={(e) => {
              e.preventDefault()
              const text = e.clipboardData?.getData('text/plain') ?? ''
              const mediaUrl = firstMediaUrl(text)
              if (mediaUrl && replyRef.current) {
                const stripped = stripMediaUrls(text, [mediaUrl])
                if (stripped) document.execCommand('insertText', false, stripped)
                insertGifImage(replyRef.current, mediaUrl)
                setReplyHasText(true)
                return
              }
              // Check for pasted image files
              const items = e.clipboardData?.items
              if (items) {
                for (const item of items) {
                  if (item.type.startsWith('image/')) {
                    const file = item.getAsFile()
                    if (file) {
                      setReplyImageFile(file)
                      setReplyImagePreview(URL.createObjectURL(file))
                      setReplyHasText(true)
                      return
                    }
                  }
                }
              }
              if (text) document.execCommand('insertText', false, text)
            }}
            onInput={() => {
              const el = replyRef.current
              if (!el) return
              const has = el.textContent?.trim() !== '' || el.querySelector('img') !== null || !!replyImageFile
              setReplyHasText(has)
              if (!has && el.innerHTML !== '' && !replyImageFile) el.innerHTML = ''
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setReplyOpen(false)
            }}
            className="w-full min-h-[36px] px-4 py-2 pr-[14rem] text-sm text-white empty:before:content-[attr(data-placeholder)] empty:before:text-white/25 focus:outline-none"
          />
          <MentionPicker editorRef={replyRef} onMentionInserted={() => setReplyHasText(true)} />
          {/* Image preview */}
          {replyImagePreview && (
            <div className="relative mx-3 mb-2 w-fit">
              <img
                src={replyImagePreview}
                alt="Upload preview"
                className="max-h-[120px] max-w-[200px] rounded-lg object-cover"
              />
              <button
                onClick={() => {
                  setReplyImageFile(null)
                  setReplyImagePreview(null)
                  if (!replyRef.current?.textContent?.trim()) setReplyHasText(false)
                }}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white/80 transition-colors hover:bg-black hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <input
            ref={replyFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setReplyImageFile(file)
              setReplyImagePreview(URL.createObjectURL(file))
              setReplyHasText(true)
              e.target.value = ''
            }}
          />
          <div className="absolute right-1.5 bottom-1 flex items-center gap-1">
            <button
              disabled={!hasReplySelection}
              onMouseDown={(e) => {
                e.preventDefault()
                const sel = window.getSelection()
                if (!sel || sel.isCollapsed || !replyRef.current?.contains(sel.anchorNode)) {
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
                hasReplySelection
                  ? 'text-white/40 hover:bg-white/[0.06] hover:text-white/50'
                  : 'text-white/25'
              }`}
              title="Obfuscate selected text"
            >
              ZWJ
            </button>
            <EmojiPickerButton
              onSelect={(emoji) => {
                const el = replyRef.current
                if (!el) return
                el.focus()
                document.execCommand('insertText', false, emoji)
                setReplyHasText(true)
              }}
            />
            <button
              onClick={() => replyFileInputRef.current?.click()}
              disabled={uploadImage.isPending}
              className="flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/50 disabled:cursor-not-allowed disabled:opacity-30"
              title="Attach image"
            >
              {uploadImage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            </button>
            <GifPickerButton
              onSelect={(url) => {
                const el = replyRef.current
                if (!el) return
                insertGifImage(el, url)
                setReplyHasText(true)
              }}
            />
            <button
              disabled={(!replyHasText && !replyImageFile) || replyMutation.isPending || uploadImage.isPending}
              onClick={handleSubmitReply}
              className={`h-[28px] cursor-pointer px-3 text-xs font-semibold transition-all ${
                replyHasText || replyImageFile ? 'rounded-lg bg-[#c8a44d] text-[#0f0e0a] hover:bg-[#c8a44d]/85' : 'rounded-full bg-white/[0.06] text-white/25'
              }`}
            >
              {uploadImage.isPending ? 'Uploading…' : replyMutation.isPending ? 'Replying…' : 'Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
