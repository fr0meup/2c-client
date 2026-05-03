import { useNavigate } from 'react-router-dom'
import { NetworthPill } from '@/components/networth-pill'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { usePrefetch } from '@/hooks/usePrefetch'
import { timeAgo } from './utils'
import type { Room } from './types'

export function DMRow({ dm }: { dm: Room }) {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { prefetchMessages } = usePrefetch()
  const other = dm.members?.find((m) => m.user_uuid !== auth?.userUuid)
  const displayName = other?.username ?? other?.user_uuid?.slice(0, 8) ?? 'Unknown'
  const hasUnread = dm.unread_count > 0

  return (
    <button
      onClick={() => navigate(`/room/${dm.uuid}`)}
      onMouseEnter={() => prefetchMessages(dm.uuid)}
      className={cn(
        'group relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all duration-200',
        hasUnread
          ? 'border-[#c8a44d]/20 bg-gradient-to-b from-[#c8a44d]/[0.06] to-[#c8a44d]/[0.02] hover:from-[#c8a44d]/[0.09] hover:to-[#c8a44d]/[0.04]'
          : 'border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:from-white/[0.05] hover:to-white/[0.02]',
      )}
    >
      {hasUnread && (
        <span aria-hidden className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-[#c8a44d]/70" />
      )}

      {/* Pill + online dot */}
      {other && (
        <div className="relative shrink-0">
          <NetworthPill
            networth={other.balance}
            subscriptionType={other.subscription_type}
            authorUuid={other.user_uuid}
            size="small"
          />
          {other.is_online && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0907]" />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'truncate text-sm font-semibold',
              hasUnread ? 'text-white' : 'text-white/80',
            )}
          >
            {displayName}
          </span>
          <span className="text-[11px] text-white/25">·</span>
          <span className="text-[11px] text-white/40 tabular-nums">{timeAgo(dm.stats.last_message_at)}</span>
          {hasUnread && (
            <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#c8a44d] px-1 text-[10px] font-bold leading-none tabular-nums text-[#0f0e0a]">
              {dm.unread_count}
            </span>
          )}
        </div>
        <p
          className={cn(
            'mt-1 line-clamp-1 text-[13px] leading-snug',
            hasUnread ? 'text-white/65' : 'text-white/40',
          )}
        >
          {dm.stats.last_message ?? 'No messages yet'}
        </p>
      </div>
    </button>
  )
}
