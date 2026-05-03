import { CornerUpLeft } from 'lucide-react'
import { NetworthPill } from '@/components/networth-pill'
import { EmojiPickerButton } from '@/components/emoji-picker/EmojiPickerButton'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useMessages } from './MessagesContext'
import { timeAgo } from './utils'
import type { ChatMessage } from './types'

interface Props {
  msg: ChatMessage
  showAuthor: boolean
  onReply: (msg: ChatMessage) => void
  onJumpTo: (uuid: string) => void
  innerRef?: (el: HTMLDivElement | null) => void
}

export function MessageBubble({ msg, showAuthor, onReply, onJumpTo, innerRef }: Props) {
  const { auth } = useAuth()
  const { toggleReaction } = useMessages()
  const isMine = msg.author_uuid === auth?.userUuid
  const author = msg.author_meta

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
        {/* Author pill (others only, when starting a new turn) */}
        {!isMine && showAuthor && author && (
          <NetworthPill
            networth={author.balance}
            subscriptionType={author.subscription_type}
            authorUuid={msg.author_uuid}
            role={author.role}
            size="small"
          />
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
        <div
          className={cn(
            'relative rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed shadow-sm [overflow-wrap:anywhere]',
            isMine
              ? 'rounded-br-md bg-[#c8a44d] text-[#0f0e0a] shadow-black/30'
              : 'rounded-bl-md border border-white/[0.06] bg-white/[0.06] text-white/90 shadow-black/20',
          )}
        >
          {msg.text}

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

        <span className="px-1 text-[10px] text-white/25 tabular-nums">{timeAgo(msg.created_at)}</span>
      </div>
    </div>
  )
}
