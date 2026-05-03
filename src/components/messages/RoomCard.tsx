import { useNavigate } from 'react-router-dom'
import { Hash, Lock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePrefetch } from '@/hooks/usePrefetch'
import { fmtCount, gradientCss, timeAgo } from './utils'
import type { Room } from './types'

export function RoomCard({ room }: { room: Room }) {
  const navigate = useNavigate()
  const { prefetchMessages } = usePrefetch()
  const hasUnread = room.unread_count > 0

  return (
    <button
      onClick={() => navigate(`/room/${room.uuid}`)}
      onMouseEnter={() => prefetchMessages(room.uuid)}
      className="group relative flex min-h-[120px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/[0.08] p-4 text-left transition-all duration-200 hover:border-white/[0.15] hover:shadow-lg hover:shadow-black/30 active:scale-[0.98]"
      style={{ background: gradientCss(room.gradient) }}
    >
      {/* Dark scrim for legibility */}
      <span className="pointer-events-none absolute inset-0 bg-black/30 transition-opacity group-hover:bg-black/20" />
      {/* Top sheen */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/[0.08] to-transparent" />

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {room.is_private ? (
            <Lock className="h-3.5 w-3.5 shrink-0 text-white/60" strokeWidth={2.4} />
          ) : (
            <Hash className="h-3.5 w-3.5 shrink-0 text-white/60" strokeWidth={2.4} />
          )}
          <span className="truncate text-[15px] font-bold leading-tight text-white">{room.name}</span>
        </div>
        {hasUnread && (
          <span
            className={cn(
              'flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none tabular-nums',
              'bg-[#c8a44d] text-[#0f0e0a]',
            )}
          >
            {room.unread_count > 99 ? '99+' : room.unread_count}
          </span>
        )}
      </div>

      <div className="relative mt-auto flex flex-col gap-2 pt-3">
        {room.stats.last_message && (
          <p className="line-clamp-1 text-[12px] leading-snug text-white/55">{room.stats.last_message}</p>
        )}
        <div className="flex items-center justify-between text-[11px] text-white/40">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" strokeWidth={2.2} />
            {fmtCount(room.member_count)}
          </span>
          {room.stats.last_message_at && <span>{timeAgo(room.stats.last_message_at)}</span>}
        </div>
      </div>
    </button>
  )
}
