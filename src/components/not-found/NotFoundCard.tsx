import { ShieldAlert, UserX, FileQuestion, ArrowLeft, Unlock, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useIsBlocked, useUnblockFromList } from '@/hooks/useBlock'
import { useToast } from '@/components/toast/ToastContext'
import { humanizeError } from '@/lib/api'

interface NotFoundCardProps {
  type: 'profile' | 'post' | 'page'
  targetUuid?: string
  username?: string
  customTitle?: string
  customDescription?: string
}

export function NotFoundCard({
  type,
  targetUuid,
  username,
  customTitle,
  customDescription,
}: NotFoundCardProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const isBlocked = useIsBlocked(targetUuid)
  const unblockMutation = useUnblockFromList()

  function handleUnblock() {
    if (!targetUuid) return
    unblockMutation.mutate(targetUuid, {
      onSuccess: () => {
        toast('success', 'User unblocked successfully')
      },
      onError: (err) => {
        toast('error', `Failed to unblock: ${humanizeError(err)}`)
      },
    })
  }

  if (isBlocked) {
    return (
      <div className="mx-auto flex w-full max-w-[480px] flex-col items-center justify-center rounded-2xl border border-[#c8a44d]/25 bg-gradient-to-b from-[#c8a44d]/[0.08] via-white/[0.03] to-[#0a0907] p-7 text-center shadow-2xl shadow-black/80 backdrop-blur-xl">
        {/* Glow Badge */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#c8a44d]/30 bg-gradient-to-b from-[#c8a44d]/20 to-[#c8a44d]/5 text-[#c8a44d] shadow-[0_0_24px_rgba(200,164,77,0.2)]">
          <ShieldAlert className="h-7 w-7 text-[#c8a44d]" />
        </div>

        <h2 className="mt-4.5 text-lg font-bold tracking-tight text-white sm:text-xl">
          Content Blocked
        </h2>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/60 sm:text-sm">
          You have blocked {username ? `@${username}` : 'this user'}. You cannot view their profile or content while they remain on your block list.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={handleUnblock}
            disabled={unblockMutation.isPending}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-b from-[#c8a44d] to-[#a88a3e] px-4.5 text-xs font-semibold text-black shadow-lg shadow-[#c8a44d]/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            <Unlock className="h-3.5 w-3.5" />
            {unblockMutation.isPending ? 'Unblocking…' : 'Unblock User'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4.5 text-xs font-semibold text-white/80 transition-all hover:border-white/20 hover:bg-white/[0.1] hover:text-white active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Feed
          </button>
        </div>
      </div>
    )
  }

  // 404 / Not Found state
  const Icon = type === 'profile' ? UserX : type === 'post' ? FileQuestion : AlertTriangle
  const defaultTitle =
    type === 'profile' ? 'Account Not Found' : type === 'post' ? 'Post Not Found' : '404 Page Not Found'
  const defaultDesc =
    type === 'profile'
      ? `The requested profile ${username ? `@${username} ` : ''}could not be found or has been removed.`
      : type === 'post'
        ? 'This post could not be found. It may have been deleted by the author.'
        : 'The page you are looking for does not exist or has been moved.'

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-[#0a0907] p-7 text-center shadow-2xl shadow-black/80 backdrop-blur-xl">
      {/* Icon Badge */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.12] bg-gradient-to-b from-white/[0.08] to-white/[0.02] text-white/50 shadow-inner">
        <Icon className="h-7 w-7 text-white/50" />
      </div>

      <h2 className="mt-4.5 text-lg font-bold tracking-tight text-white sm:text-xl">
        {customTitle || defaultTitle}
      </h2>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/50 sm:text-sm">
        {customDescription || defaultDesc}
      </p>

      <div className="mt-5 flex items-center justify-center gap-2.5">
        <button
          onClick={() => navigate('/')}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-[#c8a44d]/30 bg-gradient-to-b from-[#c8a44d]/15 to-[#c8a44d]/5 px-4.5 text-xs font-semibold text-[#c8a44d] shadow-md transition-all hover:border-[#c8a44d]/50 hover:bg-[#c8a44d]/25 hover:text-white active:scale-95"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Feed
        </button>
      </div>
    </div>
  )
}
