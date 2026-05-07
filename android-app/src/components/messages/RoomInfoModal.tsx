import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { NetworthPill } from '@/components/networth-pill/NetworthPill'
import { UserMetaPill } from '@/components/user-meta-pill/UserMetaPill'
import { useFollow } from '@/components/profile/FollowContext'
import { useRoomMembers } from '@/hooks/useRooms'
import { fmtCount, gradientCss, type Room, type RoomMember } from './types'

const BATCH = 30

interface Props {
  room: Room
  onClose: () => void
}

export function RoomInfoModal({ room, onClose }: Props) {
  const { data: membersData, isLoading } = useRoomMembers(room.uuid)
  const [visibleCount, setVisibleCount] = useState(BATCH)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Map API members → UI RoomMember, dedup + filter left
  const { online, offline } = useMemo(() => {
    const raw = membersData?.members ?? []
    const active = raw.filter((m) => !m.left_at)
    const deduped = [...new Map(active.map((m) => [m.user_uuid, m])).values()]
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
    return {
      online: mapped.filter((m) => m.is_online),
      offline: mapped.filter((m) => !m.is_online),
    }
  }, [membersData])

  // Flat list for progressive rendering: online first, then offline
  const allMembers = useMemo(() => [...online, ...offline], [online, offline])
  const totalReady = allMembers.length
  const hasMore = visibleCount < totalReady

  // IntersectionObserver to auto-expand visible count on scroll
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelCb = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node) return
      sentinelRef.current = node
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + BATCH, totalReady))
          }
        },
        { root: scrollRef.current, rootMargin: '200px' }
      )
      observerRef.current.observe(node)
    },
    [totalReady]
  )

  const memberCount = totalReady || room.member_count
  const onlineCount = online.length || (room.stats.online_count ?? 0)

  // Figure out section splits within the visible slice
  const visible = allMembers.slice(0, visibleCount)
  const visOnline = visible.filter((m) => m.is_online)
  const visOffline = visible.filter((m) => !m.is_online)

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 px-2 backdrop-blur-md sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[calc(100svh-1rem)] w-full flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#141410] shadow-2xl shadow-black/60 sm:max-h-[85svh] sm:max-w-2xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
          <div
            className="h-10 w-10 shrink-0 rounded-full"
            style={{ background: gradientCss(room.gradient) }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{room.name}</p>
            {room.description && (
              <p className="mt-0.5 truncate text-[12px] text-white/50">{room.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 border-b border-white/[0.06] px-5 py-4">
          <Stat label="Members" value={fmtCount(memberCount)} />
          <Stat label="Online" value={fmtCount(onlineCount)} accent />
          <Stat label="Messages" value={fmtCount(room.stats.total_messages ?? 0)} />
        </div>

        {/* Members */}
        <div ref={scrollRef} className="flex flex-col gap-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333330 transparent' }}>
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            </div>
          )}
          {!isLoading && visOnline.length > 0 && (
            <>
              <SectionLabel label="Online" count={online.length} accent />
              {visOnline.map((m) => <MemberRow key={m.user_uuid} m={m} />)}
            </>
          )}
          {!isLoading && visOffline.length > 0 && (
            <>
              <SectionLabel label="Offline" count={offline.length} />
              {visOffline.map((m) => <MemberRow key={m.user_uuid} m={m} />)}
            </>
          )}
          {!isLoading && online.length === 0 && offline.length === 0 && (
            <p className="py-8 text-center text-sm text-white/40">No member info available</p>
          )}
          {hasMore && <div ref={sentinelCb} className="h-1 shrink-0" />}
        </div>
      </div>
    </div>,
    document.body
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={
          accent
            ? 'text-[18px] font-bold tabular-nums text-emerald-400'
            : 'text-[18px] font-bold tabular-nums text-white'
        }
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
    </div>
  )
}

function SectionLabel({ label, count, accent }: { label: string; count: number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-2">
      <span
        className={
          accent
            ? 'text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400/70'
            : 'text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40'
        }
      >
        {label}
      </span>
      <span className="text-[10px] text-white/30 tabular-nums">{count}</span>
      <span className="ml-1 h-px flex-1 bg-white/[0.06]" />
    </div>
  )
}

function MemberRow({ m }: { m: RoomMember }) {
  const { aliasFor } = useFollow()
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]">
      <div className="relative shrink-0">
        <NetworthPill
          networth={m.balance}
          subscriptionType={m.subscription_type}
          authorUuid={m.user_uuid}
          size="small"
        />
        {m.is_online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#141410]" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <UserMetaPill
          alias={aliasFor(m.user_uuid)}
          gender={m.gender}
          age={m.age}
          arena={m.arena}
          className="!h-7 !text-[11px] !flex-none"
        />
        {m.username && (
          <span className="min-w-0 truncate text-[13px] font-semibold text-[#c8a44d]">
            {m.username}
          </span>
        )}
      </div>
    </div>
  )
}
