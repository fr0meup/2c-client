import { useState, useRef, useEffect, useCallback } from 'react'
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
  /** Which direction the picker opens toward */
  position?: 'above' | 'below'
}

export function EmojiPickerButton({
  onSelect,
  size = 'sm',
  position = 'below',
}: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const [recentEmojis, setRecentEmojis] = useState<string[]>(getRecentEmojis)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleEmojiSelect = useCallback(
    ({ emoji }: { emoji: string }) => {
      addRecentEmoji(emoji)
      setRecentEmojis(getRecentEmojis())
      onSelect(emoji)
    },
    [onSelect],
  )

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const btnSize = size === 'md' ? 'h-8 w-8' : 'h-[28px] w-[28px]'
  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'

  return (
    <div className="relative" ref={containerRef}>
      <button
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

      <div
        className={`emoji-picker-popover absolute right-0 z-50 ${
          open ? '' : 'invisible pointer-events-none'
        }`}
        style={
          position === 'above'
            ? { bottom: '100%', marginBottom: 8 }
            : { top: '100%', marginTop: 8 }
        }
      >
        <EmojiPicker.Root
          emojiVersion={17}
          onEmojiSelect={handleEmojiSelect}
          columns={8}
          className="twocents-emoji-scroll isolate flex h-[400px] w-[350px] flex-col rounded-xl border border-white/[0.06] bg-[#141410]"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
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
      </div>
    </div>
  )
}
