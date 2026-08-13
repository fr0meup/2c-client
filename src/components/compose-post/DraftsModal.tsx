import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Trash2, FileText, ImagePlus, BarChart3, Film } from 'lucide-react'
import { getDrafts, deleteDraft } from '@/lib/drafts'
import type { Draft } from '@/lib/drafts'

interface Props {
  onClose: () => void
  onLoad: (draft: Draft) => void
  onDelete?: () => void
}

function timeAgoShort(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function DraftsModal({ onClose, onLoad, onDelete }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDrafts().then((d) => { setDrafts(d); setLoading(false) })
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    await deleteDraft(id)
    setDrafts((prev) => prev.filter((d) => d.id !== id))
    onDelete?.()
  }

  function getBadges(draft: Draft) {
    const badges: { icon: React.ReactNode; label: string }[] = []
    if (draft.mediaBlob && draft.mediaType?.startsWith('video/')) {
      badges.push({ icon: <Film className="h-3 w-3" />, label: 'Video' })
    } else if (draft.mediaBlob && draft.mediaType?.startsWith('image/')) {
      badges.push({ icon: <ImagePlus className="h-3 w-3" />, label: 'Image' })
    }
    if (draft.activeOption === 'poll' || (Array.isArray(draft.pollOptions) && draft.pollOptions.length > 0 && draft.pollOptions.some((o) => o.trim() !== ''))) {
      badges.push({ icon: <BarChart3 className="h-3 w-3" />, label: 'Poll' })
    }
    if (draft.activeOption === 'likert') {
      badges.push({ icon: <span className="text-[9px] font-bold leading-none">L</span>, label: 'Likert' })
    }
    return badges
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative mx-3 flex max-h-[calc(100svh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141410] shadow-2xl shadow-black/60 sm:mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-[#c8a44d]" />
            <span className="text-sm font-semibold text-white">Drafts</span>
            {drafts.length > 0 && (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-white/40">
                {drafts.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drafts list */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#333330 transparent' }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-[#c8a44d]" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14">
              <FileText className="h-8 w-8 text-white/[0.08]" />
              <p className="mt-3 text-sm text-white/30">No saved drafts</p>
            </div>
          ) : (
            <div className="flex flex-col p-2 gap-1">
              {drafts.map((draft) => {
                const badges = getBadges(draft)
                return (
                  <button
                    key={draft.id}
                    onClick={() => onLoad(draft)}
                    className="group flex w-full cursor-pointer flex-col gap-1.5 rounded-xl px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {draft.title || 'Untitled'}
                        </p>
                        {draft.body && (
                          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-white/40">
                            {draft.body.slice(0, 120)}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                        <span className="text-[11px] text-white/25">
                          {timeAgoShort(draft.createdAt)}
                        </span>
                        <button
                          onClick={(e) => handleDelete(e, draft.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-full text-white/20 opacity-0 transition-all hover:bg-rose-400/10 hover:text-rose-400 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Badges */}
                    {badges.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {badges.map((b) => (
                          <span
                            key={b.label}
                            className="flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-white/30"
                          >
                            {b.icon}
                            {b.label}
                          </span>
                        ))}
                        <span className="text-[11px] text-white/15">·</span>
                        <span className="text-[11px] text-white/25">
                          $/{draft.topic.toLowerCase()}
                        </span>
                      </div>
                    )}
                    {badges.length === 0 && (
                      <span className="text-[11px] text-white/25">
                        $/{draft.topic.toLowerCase()}
                      </span>
                    )}
                  </button>
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
