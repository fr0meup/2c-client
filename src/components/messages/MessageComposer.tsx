import { useCallback, useEffect, useRef, useState } from 'react'
import { CornerUpLeft, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmojiPickerButton } from '@/components/emoji-picker/EmojiPickerButton'
import type { ChatMessage } from './types'
import { obfuscateText } from '@/lib/obfuscate'

interface Props {
  onSend: (text: string, replyTo?: string) => void
  replyTo: ChatMessage | null
  onCancelReply: () => void
}

export function MessageComposer({ onSend, replyTo, onCancelReply }: Props) {
  const [text, setText] = useState('')
  const [hasMsgSelection, setHasMsgSelection] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (replyTo) ref.current?.focus()
  }, [replyTo])

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      setText((prev) => prev + emoji)
      ref.current?.focus()
    },
    [],
  )

  function checkMsgSel() {
    const el = ref.current
    if (!el) { setHasMsgSelection(false); return }
    setHasMsgSelection(el.selectionStart !== el.selectionEnd)
  }

  function autoresize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed, replyTo?.uuid)
    setText('')
    if (ref.current) ref.current.style.height = 'auto'
  }

  return (
    <div className="sticky bottom-0 border-t border-white/[0.06] bg-[#0a0907]/95 px-3 py-[14px] backdrop-blur-md sm:px-4">
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">
          <CornerUpLeft className="h-3.5 w-3.5 shrink-0 text-[#c8a44d]/60" strokeWidth={2.4} />
          <span className="flex-1 truncate text-[12px] text-white/55 italic">{replyTo.text}</span>
          <button
            onClick={onCancelReply}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-3 w-3" strokeWidth={2.4} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              autoresize(e.currentTarget)
            }}
            onSelect={checkMsgSel}
            onKeyUp={checkMsgSel}
            onMouseUp={checkMsgSel}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder="Message…"
            className="block min-h-[40px] w-full resize-none overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-4 pr-14 text-[13.5px] text-white placeholder:text-white/30 transition-colors focus:border-[#c8a44d]/30 focus:bg-white/[0.06] focus:outline-none"
            style={{ maxHeight: '140px' }}
          />
          <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                const el = ref.current
                if (!el) return
                const start = el.selectionStart
                const end = el.selectionEnd
                if (start === end) return
                const selected = text.slice(start, end)
                const obfuscated = obfuscateText(selected)
                setText(text.slice(0, start) + obfuscated + text.slice(end))
                requestAnimationFrame(() => {
                  el.setSelectionRange(start, start + obfuscated.length)
                  el.focus()
                })
              }}
              disabled={!hasMsgSelection}
              className={`flex h-7 cursor-pointer items-center justify-center rounded-full px-1.5 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                hasMsgSelection
                  ? 'text-white/40 hover:bg-white/[0.06] hover:text-white/50'
                  : 'text-white/25'
              }`}
              title="Obfuscate selected text"
            >
              ZWJ
            </button>
            <EmojiPickerButton
              onSelect={handleEmojiSelect}
              size="sm"
              position="above"
            />
          </div>
        </div>
        <button
          onClick={submit}
          disabled={!text.trim()}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95',
            text.trim()
              ? 'cursor-pointer bg-[#c8a44d] text-[#0f0e0a] hover:bg-[#c8a44d]/90 hover:shadow-lg hover:shadow-[#c8a44d]/20'
              : 'cursor-default bg-white/[0.06] text-white/30',
          )}
        >
          <Send className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
