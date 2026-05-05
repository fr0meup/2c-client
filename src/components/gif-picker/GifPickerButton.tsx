import { useState, useRef, useEffect } from 'react'
import { X, Trash2, Star, Plus } from 'lucide-react'
import { getSavedGifs, removeGif, getFaveGifs, addFave, removeFave, isFave, saveGif } from '@/lib/gif'

interface GifPickerButtonProps {
  onSelect: (url: string) => void
}

export function GifPickerButton({ onSelect }: GifPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const [gifs, setGifs] = useState<string[]>([])
  const [faves, setFaves] = useState<string[]>([])
  const [pasteUrl, setPasteUrl] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function reload() {
    setGifs(getSavedGifs())
    setFaves(getFaveGifs())
  }

  useEffect(() => {
    if (open) {
      reload()
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleRemove(url: string, e: React.MouseEvent) {
    e.stopPropagation()
    removeGif(url)
    reload()
  }

  function handleToggleFave(url: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (isFave(url)) removeFave(url)
    else addFave(url)
    reload()
  }

  function handlePasteAdd() {
    const url = pasteUrl.trim()
    if (!url) return
    saveGif(url)
    setPasteUrl('')
    reload()
  }

  const nonFaveGifs = gifs.filter((g) => !faves.includes(g))

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={`flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full transition-colors ${
          open
            ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
            : 'text-white/25 hover:bg-white/[0.06] hover:text-white/50'
        }`}
        title="Saved GIFs"
      >
        <span className="text-[10px] font-black leading-none tracking-tight">GIF</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-[340px] rounded-xl border border-white/[0.08] bg-[#141410] shadow-xl shadow-black/40">
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/40">GIFs</span>
            <button
              onClick={() => setOpen(false)}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Paste URL input */}
          <div className="mx-2 mb-2 flex gap-1.5">
            <input
              ref={inputRef}
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasteAdd() }}
              placeholder="Paste a GIF URL to save..."
              className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder:text-white/25 focus:border-[#c8a44d]/30 focus:outline-none"
            />
            <button
              onClick={handlePasteAdd}
              disabled={!pasteUrl.trim()}
              className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/40 transition-colors hover:border-[#c8a44d]/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Content */}
          <div
            className="max-h-80 overflow-y-auto px-2 pb-2"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#333330 transparent' }}
          >
            {gifs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-white/30">No saved GIFs yet</p>
                <p className="mt-1 text-[10px] text-white/20">Star GIFs in comments or paste a URL above</p>
              </div>
            ) : (
              <>
                {/* Favorites */}
                {faves.length > 0 && (
                  <>
                    <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-[#c8a44d]/60">
                      Favorites
                    </p>
                    <div className="mb-2 columns-2 gap-1.5 [&>*]:mb-1.5">
                      {faves.map((url) => (
                        <GifRow
                          key={url}
                          url={url}
                          faved
                          onSelect={() => { onSelect(url); setOpen(false) }}
                          onToggleFave={(e) => handleToggleFave(url, e)}
                          onRemove={(e) => handleRemove(url, e)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* All saved */}
                {nonFaveGifs.length > 0 && (
                  <>
                    {faves.length > 0 && (
                      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                        Saved
                      </p>
                    )}
                    <div className="columns-2 gap-1.5 [&>*]:mb-1.5">
                      {nonFaveGifs.map((url) => (
                        <GifRow
                          key={url}
                          url={url}
                          faved={false}
                          onSelect={() => { onSelect(url); setOpen(false) }}
                          onToggleFave={(e) => handleToggleFave(url, e)}
                          onRemove={(e) => handleRemove(url, e)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function GifRow({
  url,
  faved,
  onSelect,
  onToggleFave,
  onRemove,
}: {
  url: string
  faved: boolean
  onSelect: () => void
  onToggleFave: (e: React.MouseEvent) => void
  onRemove: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-white/[0.06] transition-colors hover:border-[#c8a44d]/30 break-inside-avoid"
      onClick={onSelect}
    >
      <img
        src={url}
        alt="GIF"
        className="w-full rounded-lg"
        loading="lazy"
      />
      <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onToggleFave}
          className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors ${
            faved
              ? 'bg-[#c8a44d]/90 text-[#0f0e0a]'
              : 'bg-black/70 text-white/60 hover:bg-[#c8a44d]/70 hover:text-[#0f0e0a]'
          }`}
        >
          <Star className={`h-2.5 w-2.5 ${faved ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={onRemove}
          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white/60 hover:bg-red-500/80 hover:text-white"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  )
}
