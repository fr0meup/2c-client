import { CornerUpLeft, Star } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { NetworthPill } from '@/components/networth-pill/NetworthPill'
import { EmojiPickerButton } from '@/components/emoji-picker/EmojiPickerButton'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { extractMediaUrls, normalizeMediaUrl, saveGif, removeGif, isGifSaved, stripMediaUrls, ZERO_WIDTH_MEDIA_TEXT } from '@/lib/gif'
import { ImageLightbox } from '@/components/lightbox/ImageLightbox'
import { useFollow } from '@/components/profile/FollowContext'
import { useMessages } from './MessagesContext'
import { timeAgo, formatExactTime, type ChatMessage } from './types'
import { cleanPostText } from '@/components/post-card/utils'

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
        alt="Media"
        onClick={() => onOpenLightbox?.(url)}
        className="max-h-[300px] max-w-[280px] cursor-pointer rounded-lg object-cover transition-opacity hover:opacity-95"
        loading="lazy"
      />
      <button
        onClick={() => {
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
        title={saved ? 'Remove from saved GIFs' : 'Save GIF'}
      >
        <Star className={`h-3 w-3 ${saved ? 'fill-current' : ''}`} />
      </button>
    </div>
  )
}

function renderMessageText(text: string, navigate: ReturnType<typeof useNavigate>, isMine: boolean) {
  const re = /(\[([^\]]+)\]\(((?:\/post|\/user)\/[0-9a-f-]{36})\))|(https?:\/\/[^\s]+)|(\/post\/[0-9a-f-]{36})/gi
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const label = match[2] ?? match[4] ?? match[5]
    const href = match[3] ?? match[4] ?? match[5]
    const postMatch = href.match(/\/post\/([0-9a-f-]{36})/i)
    const userMatch = href.match(/\/user\/([0-9a-f-]{36})/i)
    const internalHref = postMatch ? `/post/${postMatch[1]}` : userMatch ? `/user/${userMatch[1]}` : null
    parts.push(
      <a
        key={key++}
        href={internalHref || href}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (internalHref) navigate(internalHref)
          else window.open(href, '_blank', 'noopener,noreferrer')
        }}
        className={cn(
          'inline cursor-pointer font-semibold underline underline-offset-2 break-all text-left',
          isMine ? 'text-[#0f0e0a]' : 'text-[#c8a44d]',
        )}
      >
        {label}
      </a>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 0 ? parts : text
}

interface Props {
  msg: ChatMessage
  showAuthor: boolean
  onReply: (msg: ChatMessage) => void
  onJumpTo: (uuid: string) => void
  innerRef?: (el: HTMLDivElement | null) => void
}

export function MessageBubble({ msg, showAuthor, onReply, onJumpTo, innerRef }: Props) {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const { toggleReaction, getRoom } = useMessages()
  const { aliasFor } = useFollow()
  const isMine = msg.author_uuid === auth?.userUuid
  const author = msg.author_meta

  const followAlias = aliasFor(msg.author_uuid)
  const room = getRoom(msg.room_uuid)
  const member = room?.members?.find((m) => m.user_uuid === msg.author_uuid)
  const memberAlias = member?.username && !member.username.startsWith('$') && member.username !== 'You' ? member.username : undefined
  const nickname = followAlias || memberAlias

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  // Extract media/GIF URLs from message text + message_meta fallback
  const metaMediaUrl = msg.message_meta?.imageUrl || msg.message_meta?.image_url || msg.message_meta?.src || msg.message_meta?.giphy_url
  const normalizedMetaMedia = metaMediaUrl ? normalizeMediaUrl(metaMediaUrl) : undefined
  const textGifs = extractMediaUrls(msg.text).map(normalizeMediaUrl)
  const gifUrls = Array.from(new Set([
    ...(normalizedMetaMedia ? [normalizedMetaMedia] : []),
    ...textGifs,
  ]))
  // Strip both regex-matched URLs and the meta URL from displayed text
  let strippedText = cleanPostText(stripMediaUrls(msg.text, metaMediaUrl ? [metaMediaUrl] : []))
  if (strippedText === ZERO_WIDTH_MEDIA_TEXT) strippedText = ''

  if (msg.deleted_at) {
    return (
      <div className={cn('flex px-1', isMine ? 'justify-end' : 'justify-start')}>
        <span className="text-[11px] italic text-white/20">Message deleted</span>
      </div>
    )
  }

  return (
    <div
      ref={innerRef}
      data-message-uuid={msg.uuid}
      className={cn('group flex gap-2', isMine ? 'justify-end' : 'justify-start')}
    >
      <div className={cn('flex max-w-[78%] min-w-0 flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
        {/* Author pill + nickname (others only, when starting a new turn) */}
        {!isMine && showAuthor && author && (
          <div className="flex items-center gap-1.5 px-0.5">
            <NetworthPill
              networth={author.balance}
              subscriptionType={author.subscription_type}
              authorUuid={msg.author_uuid}
              role={author.role}
              size="small"
            />
            {nickname && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/user/${msg.author_uuid}`)
                }}
                className="cursor-pointer truncate text-xs font-semibold text-[#c8a44d] hover:underline"
              >
                {nickname}
              </button>
            )}
          </div>
        )}

        {/* Reply context */}
        {msg.reply_preview && (
          <button
            onClick={() => msg.reply_to_uuid && onJumpTo(msg.reply_to_uuid)}
            className={cn(
              'flex max-w-full cursor-pointer items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 transition-colors hover:border-white/[0.12] hover:bg-white/[0.05]',
              isMine ? 'self-end' : 'self-start',
            )}
          >
            <CornerUpLeft className="h-3 w-3 shrink-0 text-[#c8a44d]/60" strokeWidth={2.4} />
            <span className="truncate text-[11px] italic text-white/45">{msg.reply_preview}</span>
          </button>
        )}

        {/* Bubble */}
        {strippedText && (
        <div
          className={cn(
            'relative rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed shadow-sm whitespace-pre-wrap break-words',
            isMine
              ? 'rounded-br-md bg-[#c8a44d] text-[#0f0e0a] shadow-black/30'
              : 'rounded-bl-md border border-white/[0.06] bg-white/[0.06] text-white/90 shadow-black/20',
          )}
        >
          {renderMessageText(strippedText, navigate, isMine)}

          {/* Action buttons on hover */}
          <div
            className={cn(
              'absolute top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-all group-hover:opacity-100',
              isMine ? 'right-full mr-1.5' : 'left-full ml-1.5',
            )}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onReply(msg)
              }}
              title="Reply"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-[#141410] text-white/60 shadow-md shadow-black/30 transition-all hover:bg-white/[0.06] hover:text-white"
            >
              <CornerUpLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
            <EmojiPickerButton
              onSelect={(emoji) => toggleReaction(msg.uuid, emoji)}
              size="sm"
              position="above"
            />
          </div>
        </div>
        )}

        {/* GIFs */}
        {gifUrls.length > 0 && (
          <div className={cn('relative', isMine ? 'self-end' : 'self-start')}>
            {gifUrls.map((url, i) => (
              <GifWithStar key={i} url={url} onOpenLightbox={(u) => setLightboxSrc(u)} />
            ))}
            {/* Action buttons on hover for GIF-only messages */}
            {!strippedText && (
              <div
                className={cn(
                  'absolute top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-all group-hover:opacity-100',
                  isMine ? 'right-full mr-1.5' : 'left-full ml-1.5',
                )}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onReply(msg)
                  }}
                  title="Reply"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-[#141410] text-white/60 shadow-md shadow-black/30 transition-all hover:bg-white/[0.06] hover:text-white"
                >
                  <CornerUpLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
                <EmojiPickerButton
                  onSelect={(emoji) => toggleReaction(msg.uuid, emoji)}
                  size="sm"
                  position="above"
                />
              </div>
            )}
          </div>
        )}

        {/* Reactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className={cn('flex flex-wrap gap-1', isMine ? 'justify-end' : 'justify-start')}>
            {msg.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(msg.uuid, r.emoji)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors',
                  r.userReacted
                    ? 'border-[#c8a44d]/30 bg-[#c8a44d]/10 hover:bg-[#c8a44d]/15'
                    : 'border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.08]',
                )}
              >
                <span>{r.emoji}</span>
                {r.count > 1 && (
                  <span className={cn('tabular-nums', r.userReacted ? 'text-[#c8a44d]/70' : 'text-white/40')}>
                    {r.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <span
          title={formatExactTime(msg.created_at)}
          className="cursor-default px-1 text-[10px] text-white/25 tabular-nums transition-colors hover:text-white/60"
        >
          {timeAgo(msg.created_at)}
        </span>
      </div>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  )
}
