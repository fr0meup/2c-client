import { useCallback, useEffect, useRef, useState } from 'react'
import { CornerUpLeft, ImagePlus, Loader2, Send, X } from 'lucide-react'
import { cn, obfuscateText } from '@/lib/utils'
import { humanizeError } from '@/lib/api'
import { EmojiPickerButton } from '@/components/emoji-picker/EmojiPickerButton'
import { GifPickerButton } from '@/components/gif-picker/GifPickerButton'
import type { ChatMessage } from './types'
import { useToast } from '@/components/toast/ToastContext'
import { firstMediaUrl, stripMediaUrls, fetchOrConvertImageToFile, isUploadedUrl } from '@/lib/gif'
import { useUploadImage } from '@/hooks/useUploadImage'

interface Props {
  onSend: (text: string, replyTo?: string, imageUrl?: string) => void | Promise<void>
  replyTo: ChatMessage | null
  onCancelReply: () => void
}

export function MessageComposer({ onSend, replyTo, onCancelReply }: Props) {
  const [text, setText] = useState('')
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [hasMsgSelection, setHasMsgSelection] = useState(false)

  const ref = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const uploadImage = useUploadImage()

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

  function handleFileSelect(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast('error', 'Please select an image or video')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setGifUrl(null)
  }

  async function submit() {
    const trimmed = text.trim()
    if (!trimmed && !gifUrl && !imageFile) return

    setIsUploading(true)
    let finalImageUrl: string | undefined = undefined

    try {
      if (imageFile) {
        const res = await uploadImage.mutateAsync(imageFile)
        finalImageUrl = res.publicURL
      } else if (gifUrl) {
        if (isUploadedUrl(gifUrl)) {
          finalImageUrl = gifUrl
        } else {
          const file = await fetchOrConvertImageToFile(gifUrl)
          const res = await uploadImage.mutateAsync(file)
          finalImageUrl = res.publicURL
        }
      }

      await onSend(trimmed, replyTo?.uuid, finalImageUrl)
      setText('')
      setGifUrl(null)
      setImageFile(null)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
      if (ref.current) ref.current.style.height = 'auto'
    } catch (err) {
      toast('error', `Failed to send message: ${humanizeError(err)}`)
    } finally {
      setIsUploading(false)
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = e.clipboardData?.files
    if (files && files.length > 0 && (files[0].type.startsWith('image/') || files[0].type.startsWith('video/'))) {
      e.preventDefault()
      handleFileSelect(files[0])
      return
    }

    const pasted = e.clipboardData?.getData('text/plain') ?? ''
    const mediaUrl = firstMediaUrl(pasted)
    if (!mediaUrl) return

    e.preventDefault()
    const el = e.currentTarget
    const start = el.selectionStart
    const end = el.selectionEnd
    const stripped = stripMediaUrls(pasted, [mediaUrl])
    const nextText = text.slice(0, start) + stripped + text.slice(end)
    setText(nextText)
    setGifUrl(mediaUrl)
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    requestAnimationFrame(() => {
      const nextPos = start + stripped.length
      el.setSelectionRange(nextPos, nextPos)
      autoresize(el)
      el.focus()
    })
  }

  return (
    <div className="shrink-0 border-t border-white/[0.06] bg-[#0a0907]/95 px-3 pb-[calc(14px+env(safe-area-inset-bottom))] pt-[14px] backdrop-blur-md sm:px-4">
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

      {imagePreview && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2">
          <img src={imagePreview} alt="Preview" className="max-h-[120px] max-w-[180px] rounded-lg object-contain" />
          <button
            onClick={() => {
              setImageFile(null)
              if (imagePreview) URL.revokeObjectURL(imagePreview)
              setImagePreview(null)
            }}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Remove image"
          >
            <X className="h-3 w-3" strokeWidth={2.4} />
          </button>
        </div>
      )}

      {gifUrl && !imagePreview && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2">
          <img src={gifUrl} alt="GIF" className="max-h-[120px] max-w-[180px] rounded-lg object-contain" loading="lazy" />
          <button
            onClick={() => setGifUrl(null)}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Remove GIF"
          >
            <X className="h-3 w-3" strokeWidth={2.4} />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
        className="hidden"
      />

      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              autoresize(e.currentTarget)
            }}
            onPaste={handlePaste}
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
            className="block min-h-[40px] w-full resize-none overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-4 pr-[8.5rem] text-[13.5px] text-white placeholder:text-white/30 transition-colors focus:border-[#c8a44d]/30 focus:bg-white/[0.06] focus:outline-none"
            style={{ maxHeight: '140px' }}
          />
          <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/60"
              title="Upload image"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                const el = ref.current
                if (!el) return
                const start = el.selectionStart
                const end = el.selectionEnd
                if (start === end) return
                const selected = text.slice(start, end)
                if (!selected) {
                  toast('error', 'Select some text first, then click ZWJ')
                  return
                }
                const obfuscated = obfuscateText(selected)
                setText(text.slice(0, start) + obfuscated + text.slice(end))
                requestAnimationFrame(() => {
                  el.setSelectionRange(start, start + obfuscated.length)
                  el.focus()
                })
                toast('success', 'ZWJ applied — text is now obfuscated')
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
            <GifPickerButton
              position="above"
              onSelect={(url) => {
                setGifUrl(url)
                setImageFile(null)
                if (imagePreview) URL.revokeObjectURL(imagePreview)
                setImagePreview(null)
                ref.current?.focus()
              }}
            />
          </div>
        </div>
        <button
          onClick={submit}
          disabled={(!text.trim() && !gifUrl && !imageFile) || isUploading}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95',
            (text.trim() || gifUrl || imageFile) && !isUploading
              ? 'cursor-pointer bg-[#c8a44d] text-[#0f0e0a] hover:bg-[#c8a44d]/90 hover:shadow-lg hover:shadow-[#c8a44d]/20'
              : 'cursor-default bg-white/[0.06] text-white/30',
          )}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#0f0e0a]" />
          ) : (
            <Send className="h-4 w-4" strokeWidth={2.2} />
          )}
        </button>
      </div>
    </div>
  )
}
