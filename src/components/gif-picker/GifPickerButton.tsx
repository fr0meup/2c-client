import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Trash2, Star, Plus, List } from 'lucide-react'
import { getSavedGifs, removeGif, getFaveGifs, addFave, removeFave, isFave, saveGif, saveManyGifs, parseGifUrlList } from '@/lib/gif'

interface GifPickerButtonProps {
  onSelect: (url: string) => void
  /** Preferred direction ('above' | 'below'); dynamically adjusts if screen space is limited */
  position?: 'above' | 'below'
}

export function GifPickerButton({ onSelect, position = 'below' }: GifPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const [gifs, setGifs] = useState<string[]>([])
  const [faves, setFaves] = useState<string[]>([])
  const [pasteUrl, setPasteUrl] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bulkRef = useRef<HTMLTextAreaElement>(null)

  const [coords, setCoords] = useState<{ top: number; left: number; maxHeight: number }>({
    top: 0,
    left: 0,
    maxHeight: 420,
  })

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

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const pickerWidth = Math.min(340, window.innerWidth - 24)
    const preferredHeight = 420

    const spaceBelow = window.innerHeight - rect.bottom - 12
    const spaceAbove = rect.top - 12

    let top: number
    let maxHeight = preferredHeight

    if (spaceBelow >= preferredHeight) {
      maxHeight = preferredHeight
      top = rect.bottom + 8
    } else if (spaceAbove >= preferredHeight) {
      maxHeight = preferredHeight
      top = rect.top - preferredHeight - 8
    } else if (spaceBelow >= spaceAbove) {
      maxHeight = Math.min(preferredHeight, Math.max(200, spaceBelow))
      top = rect.bottom + 8
    } else {
      maxHeight = Math.min(preferredHeight, Math.max(200, spaceAbove))
      top = Math.max(12, rect.top - maxHeight - 8)
    }

    let left = rect.right - pickerWidth
    left = Math.max(12, Math.min(left, window.innerWidth - pickerWidth - 12))

    setCoords({ top, left, maxHeight })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false)
      }
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
    const trimmed = pasteUrl.trim()
    if (!trimmed) return
    const list = parseGifUrlList(trimmed)
    if (list.length > 1) {
      const { added, skipped } = saveManyGifs(list)
      setBulkFeedback(`Added ${added}${skipped ? ` · ${skipped} duplicate${skipped === 1 ? '' : 's'}` : ''}`)
      window.setTimeout(() => setBulkFeedback(null), 2200)
    } else {
      saveGif(list[0] ?? trimmed)
    }
    setPasteUrl('')
    reload()
    inputRef.current?.focus()
  }

  function handleBulkSave() {
    const list = parseGifUrlList(bulkText)
    if (list.length === 0) {
      setBulkFeedback('No valid URLs found')
      window.setTimeout(() => setBulkFeedback(null), 2200)
      return
    }
    const { added, skipped } = saveManyGifs(list)
    setBulkFeedback(`Added ${added}${skipped ? ` · ${skipped} duplicate${skipped === 1 ? '' : 's'}` : ''}`)
    window.setTimeout(() => setBulkFeedback(null), 2400)
    if (added > 0) setBulkText('')
    reload()
    bulkRef.current?.focus()
  }

  useEffect(() => {
    if (bulkMode) setTimeout(() => bulkRef.current?.focus(), 50)
  }, [bulkMode])

  const nonFaveGifs = gifs.filter((g) => !faves.includes(g))

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full transition-colors ${
          open
            ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
            : 'text-white/25 hover:bg-[#ffffff]/[0.06] hover:text-white/50'
        }`}
        title="Saved GIFs"
      >
        <span className="text-[10px] font-black leading-none tracking-tight">GIF</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="gif-picker-popover fixed z-[9999]"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
          >
            <div
              className="flex w-[340px] max-w-[calc(100vw-24px)] flex-col rounded-xl border border-white/[0.08] bg-[#141410] shadow-2xl shadow-black/80 overflow-hidden"
              style={{ maxHeight: `${coords.maxHeight}px` }}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between px-3 pt-3 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/40">GIFs</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {/* Paste URL input (or bulk paste textarea) */}
              {bulkMode ? (
                <div className="mx-2 mb-2 flex shrink-0 flex-col gap-1.5">
                  <textarea
                    ref={bulkRef}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        handleBulkSave()
                      }
                    }}
                    rows={4}
                    placeholder={'Paste many GIF URLs (one per line, or comma/space separated)...'}
                    className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder:text-white/25 focus:border-[#c8a44d]/30 focus:outline-none"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#333330 transparent' }}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => { setBulkMode(false); setBulkText('') }}
                      className="cursor-pointer text-[10px] uppercase tracking-wider text-white/40 transition-colors hover:text-white/70"
                    >
                      Cancel
                    </button>
                    <div className="flex items-center gap-1.5">
                      {bulkFeedback && (
                        <span className="text-[10px] text-[#c8a44d]/80">{bulkFeedback}</span>
                      )}
                      <button
                        type="button"
                        onClick={handleBulkSave}
                        disabled={parseGifUrlList(bulkText).length === 0}
                        className="flex h-[26px] cursor-pointer items-center gap-1 rounded-lg bg-[#c8a44d]/15 px-2.5 text-[11px] font-semibold text-[#c8a44d] transition-colors hover:bg-[#c8a44d]/25 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Plus className="h-3 w-3" />
                        Add {parseGifUrlList(bulkText).length || ''}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mx-2 mb-2 flex shrink-0 flex-col gap-1">
                  <div className="flex gap-1.5">
                    <input
                      ref={inputRef}
                      value={pasteUrl}
                      onChange={(e) => setPasteUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handlePasteAdd() }}
                      placeholder="Paste a GIF URL to save..."
                      className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-white placeholder:text-white/25 focus:border-[#c8a44d]/30 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handlePasteAdd}
                      disabled={!pasteUrl.trim()}
                      className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/40 transition-colors hover:border-[#c8a44d]/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                      title="Add"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkMode(true)}
                      className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/40 transition-colors hover:border-[#c8a44d]/30 hover:text-white"
                      title="Bulk add multiple URLs"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {bulkFeedback && (
                    <span className="px-1 text-[10px] text-[#c8a44d]/80">{bulkFeedback}</span>
                  )}
                </div>
              )}

              {/* Content */}
              <div
                className="flex-1 overflow-y-auto px-2 pb-2"
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
          </div>,
          document.body,
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
          type="button"
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
          type="button"
          onClick={onRemove}
          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white/60 hover:bg-red-500/80 hover:text-white"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  )
}
