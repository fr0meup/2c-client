import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X, Users } from 'lucide-react'
import { NetworthPill } from '@/components/networth-pill/NetworthPill'
import { UserMetaPill } from '@/components/user-meta-pill/UserMetaPill'
import { useMyAliases } from '@/hooks/useFollow'
import type { Alias } from '@/hooks/useFollow'
import { FollowingModalSkeleton } from '@/components/skeleton/Skeleton'

interface Props {
  onClose: () => void
}

export function FollowingModal({ onClose }: Props) {
  const navigate = useNavigate()
  const { data, isLoading } = useMyAliases()
  const aliases = data?.aliases ?? []

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleUserClick(uuid: string) {
    onClose()
    navigate(`/user/${uuid}`)
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-md sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#141410] shadow-2xl shadow-black/60 sm:max-h-[85vh] sm:max-w-2xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
            <Users className="h-4.5 w-4.5 text-[#c8a44d]" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Following</p>
            <p className="mt-0.5 text-[12px] text-white/50">
              {aliases.length} {aliases.length === 1 ? 'person' : 'people'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* List */}
        <div className="flex flex-col gap-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333330 transparent' }}>
          {isLoading ? (
            <FollowingModalSkeleton />
          ) : aliases.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">Not following anyone yet</p>
          ) : (
            aliases.map((a: Alias) => (
              <button
                key={a.uuid}
                onClick={() => handleUserClick(a.for_uuid)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.03]"
              >
                <div className="shrink-0">
                  <NetworthPill
                    networth={a.user.balance}
                    subscriptionType={a.user.subscription_type}
                    size="small"
                  />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <UserMetaPill
                    alias={a.alias}
                    gender={a.user.gender as 'M' | 'F' | undefined}
                    age={a.user.age}
                    arena={a.user.arena}
                    className="!h-7 !text-[11px] !flex-none"
                  />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
