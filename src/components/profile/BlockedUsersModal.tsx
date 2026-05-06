import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Ban, Loader2, ShieldOff, UserX, X } from 'lucide-react'
import { useBlockedUsers, useUnblockFromList } from '@/hooks/useBlock'
import { useToast } from '@/components/toast/ToastContext'
import { humanizeError } from '@/lib/api'

interface Props {
  onClose: () => void
}

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function BlockedUsersModal({ onClose }: Props) {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useBlockedUsers()
  const unblockMutation = useUnblockFromList()
  const { toast } = useToast()
  const [unblockingUuid, setUnblockingUuid] = useState<string | null>(null)

  const blocked = data?.blocked ?? []

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleUnblock(uuid: string) {
    setUnblockingUuid(uuid)
    unblockMutation.mutate(uuid, {
      onSuccess: () => {
        toast('success', 'User unblocked')
        setUnblockingUuid(null)
      },
      onError: (err) => {
        toast('error', `Failed to unblock: ${humanizeError(err)}`)
        setUnblockingUuid(null)
      },
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-2 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[calc(100svh-1rem)] w-full flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#141410] shadow-2xl shadow-black/60 sm:max-h-[85svh] sm:max-w-md"
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-400/10">
            <Ban className="h-4.5 w-4.5 text-rose-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Blocked Users</p>
            <p className="text-[12px] text-white/50">
              {blocked.length} {blocked.length === 1 ? 'user' : 'users'} blocked
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto px-3 py-3"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#333330 transparent' }}
        >
          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-white/30" />
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="py-12 text-center">
              <UserX className="mx-auto h-7 w-7 text-rose-400/40" />
              <p className="mt-2 text-xs text-rose-400/60">Failed to load blocked users</p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && blocked.length === 0 && (
            <div className="py-12 text-center">
              <ShieldOff className="mx-auto h-8 w-8 text-white/[0.08]" />
              <p className="mt-2 text-sm text-white/30">No blocked users</p>
              <p className="mt-1 text-[11px] text-white/20">Users you block will appear here</p>
            </div>
          )}

          {/* List */}
          {blocked.length > 0 && (
            <div className="flex flex-col gap-1">
              {blocked.map((entry) => {
                const isUnblocking = unblockingUuid === entry.blocked_uuid
                return (
                  <div
                    key={entry.blocked_uuid}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
                        <Ban className="h-3.5 w-3.5 text-rose-400/60" />
                      </div>
                      <div className="min-w-0">
                        <button
                          onClick={() => { onClose(); navigate(`/user/${entry.blocked_uuid}`) }}
                          className="cursor-pointer truncate text-sm font-medium text-white/80 transition-colors hover:text-[#c8a44d]"
                        >
                          {entry.blocked_uuid.slice(0, 8)}…
                        </button>
                        <p className="text-[11px] text-white/30">
                          Blocked {timeAgoShort(entry.created_at)}
                        </p>
                      </div>
                    </div>

                    <button
                      disabled={isUnblocking}
                      onClick={() => handleUnblock(entry.blocked_uuid)}
                      className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-white/60 transition-all hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                    >
                      {isUnblocking ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ShieldOff className="h-3 w-3" />
                      )}
                      Unblock
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
