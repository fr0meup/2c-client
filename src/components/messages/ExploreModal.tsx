import { useEffect } from 'react'
import { Compass, Hash, Lock, Users, X, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mapRoom, useMessages } from './MessagesContext'
import { useExploreRooms } from '@/hooks/useRooms'
import { useAuth } from '@/lib/auth'
import { fmtCount, gradientCss, type Room } from './types'

interface Props {
  onClose: () => void
}

export function ExploreModal({ onClose }: Props) {
  const { auth } = useAuth()
  const { joinedRooms, joinRoom } = useMessages()
  const { data } = useExploreRooms()
  const publicRooms = (data?.rooms ?? [])
    .filter((r) => r.room_type === 'room')
    .map((r) => mapRoom(r, auth?.userUuid))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#141410] shadow-2xl shadow-black/60 sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[#c8a44d]" strokeWidth={2.4} />
            <span className="text-sm font-semibold text-white">Explore rooms</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto px-3 py-3">
          {publicRooms.map((room) => (
            <ExploreRow key={room.uuid} room={room} joined={joinedRooms.has(room.uuid)} onJoin={joinRoom} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ExploreRow({ room, joined, onJoin }: { room: Room; joined: boolean; onJoin: (uuid: string) => void }) {
  const eligible = !room.requirements?.length || room.requirements.every((r) => r.met)
  const requirementLabel = room.requirements?.find((r) => !r.met)?.label
  const Icon = room.is_private ? Lock : Hash

  return (
    <button
      disabled={!eligible || joined}
      onClick={() => onJoin(room.uuid)}
      className={cn(
        'group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left transition-all',
        eligible && !joined && 'cursor-pointer hover:border-white/[0.12] hover:bg-white/[0.04]',
        (!eligible || joined) && 'cursor-default opacity-70',
      )}
    >
      <div
        className="h-10 w-10 shrink-0 rounded-full"
        style={{ background: gradientCss(room.gradient) }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3 w-3 shrink-0 text-white/40" strokeWidth={2.4} />
          <span className="truncate text-sm font-semibold text-white">{room.name}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 text-white/40">
            <Users className="h-3 w-3" strokeWidth={2.2} />
            {fmtCount(room.member_count)}
          </span>
          {requirementLabel ? (
            <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 text-white/50">{requirementLabel}</span>
          ) : (
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400/90">Open</span>
          )}
        </div>
      </div>
      {joined ? (
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-emerald-400">
          <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
          Joined
        </span>
      ) : eligible ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-white/30 transition-colors group-hover:text-white/60" strokeWidth={2.2} />
      ) : (
        <Lock className="h-3.5 w-3.5 shrink-0 text-white/25" strokeWidth={2.2} />
      )}
    </button>
  )
}
