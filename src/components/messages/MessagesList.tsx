import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Compass, MessageSquare, Plus, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Hash, Lock, Users } from 'lucide-react'
import { NetworthPill } from '@/components/networth-pill/NetworthPill'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { usePrefetch } from '@/hooks/usePrefetch'
import { preloadRoute } from '@/lib/routePreload'
import { announceNavigationPending } from '@/lib/navigationPending'
import { useMessages } from './MessagesContext'
import { MessagesListSkeleton } from '@/components/skeleton/Skeleton'
import { ExploreModal } from './ExploreModal'
import { fmtCount, gradientCss, timeAgo, type Room } from './types'

export function Messages() {
  const { isLoading } = useMessages()
  if (isLoading) return <MessagesListSkeleton />
  return <MessagesList />
}

export function MessagesListHeader() {
  const [exploreOpen, setExploreOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const { createGroupChat } = useMessages()
  const navigate = useNavigate()

  const handleCreateGroup = async () => {
    if (creating) return
    setCreating(true)
    try {
      const roomUuid = await createGroupChat()
      announceNavigationPending(`/room/${roomUuid}`)
      navigate(`/room/${roomUuid}`)
    } catch (e) {
      console.error('Failed to create group chat:', e)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="flex h-10 items-center justify-center gap-2">
        <button
          onClick={() => setExploreOpen(true)}
          className="group flex h-10 cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-4 text-sm font-medium text-white/75 transition-all hover:border-[#c8a44d]/30 hover:bg-gradient-to-b hover:from-[#c8a44d]/[0.1] hover:to-[#c8a44d]/[0.04] hover:text-[#c8a44d] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        >
          <Compass className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-[20deg]" strokeWidth={2.4} />
          <span>Explore rooms</span>
        </button>
        <button
          onClick={handleCreateGroup}
          disabled={creating}
          className="group flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/75 transition-all hover:border-[#c8a44d]/30 hover:bg-gradient-to-b hover:from-[#c8a44d]/[0.1] hover:to-[#c8a44d]/[0.04] hover:text-[#c8a44d] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] disabled:opacity-50"
          title="Create group chat"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
          ) : (
            <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.4} />
          )}
        </button>
      </div>

      {exploreOpen && <ExploreModal onClose={() => setExploreOpen(false)} />}
    </>
  )
}

export function MessagesList() {
  const { rooms, dms } = useMessages()
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['rooms', 'user'] })
    queryClient.invalidateQueries({ queryKey: ['rooms', 'dms'] })
  }, [queryClient])

  const sortedRooms = [...rooms].sort(
    (a, b) => (b.stats.last_message_at ?? '').localeCompare(a.stats.last_message_at ?? ''),
  )
  const sortedDms = [...dms].sort(
    (a, b) => (b.stats.last_message_at ?? '').localeCompare(a.stats.last_message_at ?? ''),
  )

  const isEmpty = rooms.length === 0 && dms.length === 0

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="flex w-full max-w-[670px] flex-col gap-5 xl:-ml-[245px]">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] text-white/30">
              <MessageSquare className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className="text-sm text-white/40">No conversations yet</p>
          </div>
        ) : (
          <>
            {sortedRooms.length > 0 && (
              <section>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {sortedRooms.map((room) => (
                    <RoomCard key={room.uuid} room={room} />
                  ))}
                </div>
              </section>
            )}

            {sortedDms.length > 0 && (
              <section className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Direct messages</span>
                  <span className="text-[11px] text-white/25 tabular-nums">{sortedDms.length}</span>
                  <span className="ml-2 h-px flex-1 bg-white/[0.06]" />
                </div>
                <div className="flex flex-col gap-2">
                  {sortedDms.map((dm) => (
                    <DMRow key={dm.uuid} dm={dm} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function RoomCard({ room }: { room: Room }) {
  const navigate = useNavigate()
  const { prefetchMessages } = usePrefetch()
  const hasUnread = room.unread_count > 0

  return (
    <button
      onClick={() => { announceNavigationPending(`/room/${room.uuid}`); navigate(`/room/${room.uuid}`) }}
      onMouseEnter={() => { preloadRoute('room'); prefetchMessages(room.uuid) }}
      className="group relative flex min-h-[120px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/[0.08] p-4 text-left transition-all duration-200 hover:border-white/[0.15] hover:shadow-lg hover:shadow-black/30 active:scale-[0.98]"
      style={{ background: gradientCss(room.gradient) }}
    >
      <span className="pointer-events-none absolute inset-0 bg-black/30 transition-opacity group-hover:bg-black/20" />
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
          <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#c8a44d] px-1.5 text-[11px] font-bold leading-none tabular-nums text-[#0f0e0a]">
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

function DMRow({ dm }: { dm: Room }) {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { prefetchMessages } = usePrefetch()
  const other = dm.members?.find((m) => m.user_uuid !== auth?.userUuid)
  const displayName = other?.username ?? other?.user_uuid?.slice(0, 8) ?? 'Unknown'
  const hasUnread = dm.unread_count > 0

  return (
    <button
      onClick={() => { announceNavigationPending(`/room/${dm.uuid}`); navigate(`/room/${dm.uuid}`) }}
      onMouseEnter={() => { preloadRoute('room'); prefetchMessages(dm.uuid) }}
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
          <span className={cn('truncate text-sm font-semibold', hasUnread ? 'text-white' : 'text-white/80')}>
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
        <p className={cn('mt-1 line-clamp-1 text-[13px] leading-snug', hasUnread ? 'text-white/65' : 'text-white/40')}>
          {dm.stats.last_message ?? 'No messages yet'}
        </p>
      </div>
    </button>
  )
}
