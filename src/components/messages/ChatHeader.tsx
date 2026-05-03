import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Hash, Lock, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useRoomMembers } from '@/hooks/useRooms'
import { useMessages } from './MessagesContext'
import { fmtCount, gradientCss } from './utils'
import { RoomInfoModal } from './RoomInfoModal'
import type { RoomMember } from './types'

export function ChatHeader() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { uuid } = useParams<{ uuid: string }>()
  const { getRoom } = useMessages()
  const [infoOpen, setInfoOpen] = useState(false)
  const room = uuid ? getRoom(uuid) : undefined
  const { data: membersData } = useRoomMembers(uuid)

  if (!room) {
    return (
      <div className="flex h-10 items-center">
        <BackButton onClick={() => navigate('/messages')} />
      </div>
    )
  }

  const isDm = room.type === 'dm'
  const Icon = room.is_private ? Lock : Hash

  // Map API members to UI RoomMember shape, filtering out those who left and deduplicating by user_uuid
  const activeMembers = (membersData?.members ?? []).filter((m) => !m.left_at)
  const deduped = [...new Map(activeMembers.map((m) => [m.user_uuid, m])).values()]
  const mapped: RoomMember[] = deduped.map((m) => ({
    user_uuid: m.user_uuid,
    username: m.alias ?? m.systemAlias ?? undefined,
    balance: Number(m.balance),
    subscription_type: m.subscription_type,
    age: m.age,
    gender: m.gender as 'M' | 'F',
    arena: m.arena,
    is_online: m.is_online,
  }))
  const onlineMembers = mapped.filter((m) => m.is_online)
  const offlineMembers = mapped.filter((m) => !m.is_online)

  const memberCount = mapped.length || room.member_count
  const onlineCount = onlineMembers.length || room.stats.online_count

  let displayName = room.name
  if (isDm) {
    const other = room.members?.find((m) => m.user_uuid !== auth?.userUuid)
    displayName = other?.username ?? room.name
  }

  return (
    <>
      <div className="flex h-10 items-center justify-between gap-2">
        <BackButton onClick={() => navigate('/messages')} />

        <button
          onClick={() => setInfoOpen(true)}
          className="group flex h-10 cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 transition-colors hover:bg-gradient-to-b hover:from-white/[0.08] hover:to-white/[0.03] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          <span
            className="h-5 w-5 shrink-0 rounded-full ring-1 ring-white/10"
            style={{ background: gradientCss(room.gradient) }}
          />
          {!isDm && <Icon className="h-3.5 w-3.5 shrink-0 text-white/50" strokeWidth={2.4} />}
          <span className="max-w-[180px] truncate text-sm font-semibold text-white">{displayName}</span>
          {!isDm && (
            <span className="flex shrink-0 items-center gap-1 text-[11px] text-white/40 tabular-nums">
              <Users className="h-3 w-3" strokeWidth={2.2} />
              {fmtCount(memberCount)}
            </span>
          )}
          {!isDm && onlineCount != null && onlineCount > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.7)]" />
              {fmtCount(onlineCount)}
            </span>
          )}
        </button>

        {/* Spacer to keep the pill centered visually */}
        <span className="h-10 w-10 shrink-0" aria-hidden />
      </div>

      {infoOpen && (
        <RoomInfoModal
          room={room}
          onClose={() => setInfoOpen(false)}
          onlineMembers={onlineMembers}
          offlineMembers={offlineMembers}
          totalMembers={memberCount}
        />
      )}
    </>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Back"
      className="group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/70 transition-colors hover:bg-gradient-to-b hover:from-white/[0.09] hover:to-white/[0.04] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={2.2} />
    </button>
  )
}
