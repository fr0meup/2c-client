import {
  ArrowBigDown,
  ArrowBigUp,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  MessageSquareText,
  Target,
  TrendingUp,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TYPE_LABELS, type Notification, type NotificationType } from './config'
import { timeAgo } from './utils'

const ICONS: Record<NotificationType, typeof Bell> = {
  post_voted: ArrowBigUp,
  comment_voted: ArrowBigUp,
  post_replied: MessageSquareText,
  comment_replied: MessageSquareText,
  pick_post: Target,
  pick_resolved: CheckCircle2,
  trending_post: TrendingUp,
  poll_voted: BarChart3,
  followed: UserPlus,
  generic: Bell,
  balance_updated: TrendingUp,
}

function TypeIcon({ type, className, isDownvote }: { type: NotificationType; className?: string; isDownvote?: boolean }) {
  const Icon = isDownvote && (type === 'post_voted' || type === 'comment_voted') ? ArrowBigDown : (ICONS[type] ?? Bell)
  return <Icon className={className ?? 'h-4 w-4'} strokeWidth={2.2} />
}

interface Props {
  notif: Notification
  onRead?: (uuid: string) => void
  onOpen?: (notif: Notification) => void
}

export function NotificationItem({ notif, onRead, onOpen }: Props) {
  const isUnread = !notif.read_at
  const isVoteType = notif.type === 'post_voted' || notif.type === 'comment_voted'
  const label = isVoteType && notif.isDownvote
    ? TYPE_LABELS[notif.type].replace('upvoted', 'downvoted')
    : TYPE_LABELS[notif.type]
  const isClickable = Boolean(notif.post_uuid) || notif.type === 'followed'
  const showPreview = Boolean(notif.preview)

  return (
    <article
      onClick={() => {
        if (isUnread) onRead?.(notif.uuid)
        onOpen?.(notif)
      }}
      className={cn(
        'group relative flex gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-200',
        notif.actor && notif.preview ? 'items-start' : 'items-center',
        isClickable && 'cursor-pointer',
        isUnread
          ? 'border-[#c8a44d]/20 bg-gradient-to-b from-[#c8a44d]/[0.06] to-[#c8a44d]/[0.02] hover:from-[#c8a44d]/[0.09] hover:to-[#c8a44d]/[0.04]'
          : 'border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:from-white/[0.05] hover:to-white/[0.02]'
      )}
    >
      {/* Unread accent bar */}
      {isUnread && (
        <span
          aria-hidden
          className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-[#c8a44d]/70"
        />
      )}

      {/* Icon badge */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          isUnread
            ? 'bg-[#c8a44d]/15 text-[#c8a44d]'
            : 'bg-white/[0.04] text-white/40'
        )}
      >
        <TypeIcon type={notif.type} className="h-[18px] w-[18px]" isDownvote={notif.isDownvote} />
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        {notif.actor ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isUnread ? 'text-white' : 'text-white/70'
                  )}
                >
                  {notif.actor}
                </span>
                {label && (
                  <span
                    className={cn(
                      'text-sm',
                      isUnread ? 'text-white/70' : 'text-white/40'
                    )}
                  >
                    {label}
                  </span>
                )}
                <span className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-[11px] text-white/25">·</span>
                  <span className="text-[11px] text-white/40">{timeAgo(notif.created_at)}</span>
                </span>
              </div>

              {isUnread && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRead?.(notif.uuid)
                  }}
                  title="Mark as read"
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#c8a44d]/60 opacity-0 transition-all hover:bg-[#c8a44d]/10 hover:text-[#c8a44d] group-hover:opacity-100"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                </button>
              )}
            </div>

            {showPreview && (
              <p
                className={cn(
                  'mt-1 line-clamp-2 text-[13px] leading-snug',
                  isUnread ? 'text-white/60' : 'text-white/35'
                )}
              >
                {notif.preview}
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-sm leading-snug">
              {label && (
                <span className={cn('font-medium', isUnread ? 'text-white/70' : 'text-white/40')}>
                  {label}
                  {' '}
                </span>
              )}
              {showPreview && (
                <span className={cn(isUnread ? 'text-white/60' : 'text-white/35')}>
                  {notif.preview}
                  {' '}
                </span>
              )}
              <span className="whitespace-nowrap text-[11px] text-white/25">
                ·{' '}
                <span className="text-white/40">{timeAgo(notif.created_at)}</span>
              </span>
            </p>

            {isUnread && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRead?.(notif.uuid)
                }}
                title="Mark as read"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#c8a44d]/60 opacity-0 transition-all hover:bg-[#c8a44d]/10 hover:text-[#c8a44d] group-hover:opacity-100"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
