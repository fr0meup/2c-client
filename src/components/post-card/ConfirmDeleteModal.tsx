import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Trash2 } from 'lucide-react'

interface Props {
  onConfirm: () => void
  onClose: () => void
  isPending?: boolean
}

export function ConfirmDeleteModal({ onConfirm, onClose, isPending }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm mx-4 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#141410] shadow-2xl shadow-black/60"
      >
        {/* Header */}
        <div className="flex flex-col items-center border-b border-white/[0.06] px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-400/10">
            <Trash2 className="h-4.5 w-4.5 text-rose-400" />
          </div>
          <p className="mt-3 text-sm font-semibold text-white">Delete post</p>
          <p className="mt-1 text-[12px] text-white/50">This action cannot be undone</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-2.5 px-5 py-4">
          <button
            onClick={onClose}
            className="h-9 cursor-pointer rounded-full border border-white/[0.08] bg-white/[0.04] px-5 text-sm font-medium text-white/60 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-full bg-rose-500 px-5 text-sm font-semibold text-white transition-all hover:bg-rose-400 disabled:opacity-50"
          >
            {isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
