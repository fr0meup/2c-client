import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Smile } from 'lucide-react'
import { EmojiPicker } from 'frimousse'

// Force frimousse to show all emojis (version 17) including country flags,
// bypassing its canvas-based native rendering check that hides them on Windows.
sessionStorage.setItem(
  'frimousse/metadata',
  JSON.stringify({ emojiVersion: 17, countryFlags: true }),
)

const STORAGE_KEY = 'twocents-recent-emojis'
const MAX_RECENT = 16

function getRecentEmojis(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function addRecentEmoji(emoji: string) {
  const recent = getRecentEmojis().filter((e) => e !== emoji)
  recent.unshift(emoji)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

interface EmojiPickerButtonProps {
  onSelect: (emoji: string) => void
  /** Button size variant */
  size?: 'sm' | 'md'
  /** Preferred direction ('above' | 'below'); dynamically adjusts if screen space is limited */
  position?: 'above' | 'below'
}

export function EmojiPickerButton({
  onSelect,
  size = 'sm',
  position = 'below',
}: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const [recentEmojis, setRecentEmojis] = useState<string[]>(getRecentEmojis)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const [coords, setCoords] = useState<{ top: number; left: number; maxHeight: number }>({
    top: 0,
    left: 0,
    maxHeight: 400,
  })

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const pickerWidth = Math.min(350, window.innerWidth - 24)
    const preferredHeight = 400

    const spaceBelow = window.innerHeight - rect.bottom - 12
    const spaceAbove = rect.top - 12

    let top: number
    let maxHeight: number

    if (position === 'above' && spaceAbove >= preferredHeight) {
      maxHeight = preferredHeight
      top = rect.top - preferredHeight - 8
    } else if (spaceBelow >= preferredHeight) {
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
  }, [position])

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

  const handleEmojiSelect = useCallback(
    ({ emoji }: { emoji: string }) => {
      addRecentEmoji(emoji)
      setRecentEmojis(getRecentEmojis())
      onSelect(emoji)
    },
    [onSelect],
  )

  const btnSize = size === 'md' ? 'h-8 w-8' : 'h-[28px] w-[28px]'
  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex ${btnSize} cursor-pointer items-center justify-center rounded-full transition-colors ${
          open
            ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
            : 'text-white/25 hover:bg-white/[0.06] hover:text-white/50'
        }`}
        title="Emoji"
      >
        <Smile className={iconSize} />
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="emoji-picker-popover fixed z-[9999]"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
          >
            <EmojiPicker.Root
              emojiVersion={17}
              onEmojiSelect={handleEmojiSelect}
              columns={8}
              className="twocents-emoji-scroll isolate flex w-[350px] max-w-[calc(100vw-24px)] flex-col rounded-xl border border-white/[0.06] bg-[#141410] shadow-2xl shadow-black/80"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                height: `${coords.maxHeight}px`,
              }}
            >
              <EmojiPicker.Search
                placeholder="Search"
                className="z-10 mx-2 mt-2 appearance-none rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-2 text-sm text-white/90 outline-none placeholder:text-white/25 focus:border-[#c8a44d]/30"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
              {recentEmojis.length > 0 && (
                <div className="shrink-0 px-1.5">
                  <div
                    className="bg-[#141410] px-1.5 pt-3 pb-1.5 text-[13px] font-medium text-white/90"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Frequently used
                  </div>
                  <div className="grid grid-cols-8 px-1.5">
                    {recentEmojis.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => handleEmojiSelect({ emoji: e })}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-md text-2xl hover:bg-white/[0.06]"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <EmojiPicker.Viewport className="relative flex-1 outline-hidden">
                <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-white/25">
                  Loading…
                </EmojiPicker.Loading>
                <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-white/25">
                  No emoji found.
                </EmojiPicker.Empty>
                <EmojiPicker.List
                  className="select-none pb-1.5"
                  components={{
                    CategoryHeader: ({ category, ...props }) => (
                      <div
                        className="bg-[#141410] px-3 pt-3.5 pb-2 text-[13px] font-medium text-white/90"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                        {...props}
                      >
                        {category.label}
                      </div>
                    ),
                    Row: ({ children, ...props }) => (
                      <div className="scroll-my-1.5 px-1.5" {...props}>
                        {children}
                      </div>
                    ),
                    Emoji: ({ emoji, ...props }) => (
                      <button
                        className="flex size-10 cursor-pointer items-center justify-center rounded-md text-2xl data-[active]:bg-white/[0.06]"
                        {...props}
                      >
                        {emoji.emoji}
                      </button>
                    ),
                  }}
                />
              </EmojiPicker.Viewport>
            </EmojiPicker.Root>
          </div>,
          document.body,
        )}
    </div>
  )
}
