import { useState, useRef, useEffect, useCallback } from 'react'
import { ImagePlus, X, ChevronDown, BarChart3, List, Bold, Plus, Minus, Loader2, FileText, Save, Check } from 'lucide-react'
import { EmojiPickerButton } from '@/components/emoji-picker/EmojiPickerButton'
import { NetworthPill } from '@/components/networth-pill'
import { GenderIcon } from '@/components/gender-icon'
import { QuotePostCard } from '@/components/post-card/QuotePostCard'
import { useAuth } from '@/lib/auth'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useCreatePost } from '@/hooks/usePostMutations'
import { useUploadImage } from '@/hooks/useUploadImage'
import { useToast } from '@/components/toast/ToastContext'
import { humanizeError } from '@/lib/api'
import { saveDraft, getDraftCount } from '@/lib/drafts'
import type { Draft } from '@/lib/drafts'
import { DraftsModal } from './DraftsModal'
import { TOPIC_MENU, TOPIC_SLUG } from './config'
import type { PostOption } from './types'
import type { PostCardData } from '@/components/post-card/types'
import { obfuscateText } from '@/lib/obfuscate'

interface ComposePostProps {
  onClose?: () => void
  scrollHeight?: number
  quotedPost?: PostCardData | null
  defaultTopic?: string
}

const COMPOSE_TOPICS = new Set(TOPIC_MENU.flatMap((g) => g.items))

export function ComposePost({ onClose, scrollHeight = 260, quotedPost = null, defaultTopic }: ComposePostProps) {
  const { auth } = useAuth()
  const { data: profileData } = useUserProfile(auth?.userUuid)
  const user = profileData?.pages[0]?.user
  const createPost = useCreatePost()
  const uploadImage = useUploadImage()
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [body, setBody] = useState('')
  const [selectedTopic, setSelectedTopic] = useState(
    defaultTopic && COMPOSE_TOPICS.has(defaultTopic) ? defaultTopic : 'Lounge'
  )
  const [topicMenuOpen, setTopicMenuOpen] = useState(false)
  const [activeOption, setActiveOption] = useState<PostOption>(null)
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [likertValue, setLikertValue] = useState<number | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const [isBoldActive, setIsBoldActive] = useState(false)
  const [isListActive, setIsListActive] = useState(false)
  const [hasEditorSelection, setHasEditorSelection] = useState(false)
  const [draftsOpen, setDraftsOpen] = useState(false)
  const [draftCount, setDraftCount] = useState(0)
  const [savedFeedback, setSavedFeedback] = useState(false)

  useEffect(() => {
    getDraftCount().then(setDraftCount)
  }, [])

  useEffect(() => {
    function checkState() {
      setIsBoldActive(document.queryCommandState('bold'))
      setIsListActive(document.queryCommandState('insertUnorderedList'))
      const sel = window.getSelection()
      const hasText = sel != null && !sel.isCollapsed && (sel.toString().length > 0)
      const inEditor = sel != null && editorRef.current != null && editorRef.current.contains(sel.anchorNode)
      setHasEditorSelection(hasText && inEditor)
    }
    document.addEventListener('selectionchange', checkState)
    return () => document.removeEventListener('selectionchange', checkState)
  }, [])

  function handleObfuscate() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) return
    const selected = sel.toString()
    if (!selected) return
    document.execCommand('insertText', false, obfuscateText(selected))
    handleEditorInput()
  }

  function getBlockquoteAncestor(node: Node | null): HTMLElement | null {
    while (node && node !== editorRef.current) {
      if ((node as HTMLElement).tagName === 'BLOCKQUOTE') return node as HTMLElement
      node = node.parentNode
    }
    return null
  }

  function handleEditorKeyDown(e: React.KeyboardEvent) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return

    const bq = getBlockquoteAncestor(sel.anchorNode)

    // Auto-convert "> " into blockquote on Space
    if (e.key === ' ' && !bq) {
      const node = sel.anchorNode
      if (node && node.nodeType === Node.TEXT_NODE && node.textContent === '>') {
        e.preventDefault()
        // Clear the ">", apply blockquote
        const range = sel.getRangeAt(0)
        node.textContent = '\u200B' // zero-width space to keep the node alive
        range.setStart(node, 1)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
        document.execCommand('formatBlock', false, 'blockquote')
        // Now clear the zero-width space
        if (node.textContent === '\u200B') node.textContent = ''
        handleEditorInput()
        return
      }
    }

    if (bq) {
      // Enter inside blockquote with empty content → exit blockquote
      if (e.key === 'Enter') {
        const text = bq.textContent || ''
        if (text.trim() === '') {
          e.preventDefault()
          document.execCommand('formatBlock', false, 'div')
          handleEditorInput()
          return
        }
      }
      // Backspace at start of empty blockquote → exit
      if (e.key === 'Backspace') {
        const text = bq.textContent || ''
        if (text === '') {
          e.preventDefault()
          document.execCommand('formatBlock', false, 'div')
          handleEditorInput()
          return
        }
      }
    }
  }

  function getEditorText(): string {
    const el = editorRef.current
    if (!el) return ''
    const html = el.innerHTML
    // Convert <strong>/<b> to ** markers, strip remaining tags
    return html
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (_m, inner: string) => {
        return inner.replace(/<br\s*\/?>/gi, '\n').split('\n').map((l: string) => `> ${l}`).join('\n') + '\n'
      })
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  }

  function handleEditorInput() {
    setBody(getEditorText())
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) return
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
        setActiveOption('image')
        return
      }
    }
  }

  const topicRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) {
        setTopicMenuOpen(false)
      }
    }
    if (topicMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [topicMenuOpen])

  const toggleOption = useCallback((opt: 'poll' | 'likert') => {
    setActiveOption((prev) => {
      if (prev === opt) return null
      return opt
    })
    if (opt === 'poll') setPollOptions(['', ''])
    if (opt === 'likert') setLikertValue(null)
  }, [])

  const canPost = title.trim().length > 0 || body.trim().length > 0 || imageFile !== null
  const isSubmitting = createPost.isPending || uploadImage.isPending

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setActiveOption('image')
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    setActiveOption(null)
  }

  async function handleSaveDraft() {
    if (!canPost) return
    const draft: Draft = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      title,
      body,
      bodyHtml: editorRef.current?.innerHTML ?? '',
      topic: selectedTopic,
      activeOption,
      pollOptions,
      likertValue,
      mediaBlob: imageFile ? await imageFile.arrayBuffer() : null,
      mediaType: imageFile?.type ?? null,
      mediaName: imageFile?.name ?? null,
    }
    await saveDraft(draft)
    setDraftCount((c) => c + 1)
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 1500)
  }

  function handleLoadDraft(draft: Draft) {
    setTitle(draft.title)
    setSelectedTopic(draft.topic)
    setActiveOption(draft.activeOption)
    setPollOptions(draft.pollOptions)
    setLikertValue(draft.likertValue)

    if (editorRef.current) {
      editorRef.current.innerHTML = draft.bodyHtml
      handleEditorInput()
    }

    if (draft.mediaBlob && draft.mediaType) {
      const file = new File([draft.mediaBlob], draft.mediaName ?? 'media', { type: draft.mediaType })
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    } else {
      clearImage()
    }

    setDraftsOpen(false)
    getDraftCount().then(setDraftCount)
  }

  async function handleSubmit() {
    if (!canPost || isSubmitting) return

    const topic = TOPIC_SLUG[selectedTopic] ?? selectedTopic.toLowerCase()
    const meta: Record<string, unknown> = { version: 1, platform: 'web' }

    let postType = 0

    if (quotedPost) {
      postType = 3
      meta.quote_post = { uuid: quotedPost.uuid }
    } else if (activeOption === 'poll') {
      postType = 2
      meta.poll = pollOptions.filter((o) => o.trim().length > 0)
    } else if (activeOption === 'likert') {
      postType = 5
    } else if (imageFile) {
      postType = 4
      // Upload media first, then attach the public URL
      try {
        const result = await uploadImage.mutateAsync(imageFile)
        meta.src = result.publicURL
        if (result.isVideo) meta.media_type = 'video'
      } catch {
        return // upload failed, don't create the post
      }
    }

    createPost.mutate(
      {
        title: title.trim(),
        topic,
        text: body,
        post_type: postType,
        post_meta: meta,
      },
      {
        onSuccess: () => {
          setTitle('')
          setBody('')
          if (editorRef.current) editorRef.current.innerHTML = ''
          setActiveOption(null)
          setPollOptions(['', ''])
          setLikertValue(null)
          clearImage()
          onClose?.()
          toast('success', 'Posted successfully')
        },
        onError: (err) => {
          toast('error', `Failed to post: ${humanizeError(err)}`)
        },
      }
    )
  }

  return (
    <>
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] shadow-lg shadow-black/20">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-inherit px-5 pt-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
        <NetworthPill
          networth={user?.balance ?? 0}
          subscriptionType={user?.subscription_type ?? 1}
          authorUuid={user?.uuid}
          role={user?.role}
          size="small"
        />
        {user?.gender && (
        <span className="flex items-center gap-1.5">
          <GenderIcon
            gender={user.gender === 'F' ? 'female' : 'male'}
            className="h-4 w-4 text-white/40"
          />
          {user.age != null && (
          <span className="text-sm font-semibold text-white/40">
            {user.age}
          </span>
          )}
        </span>
        )}
        {user?.arena && (
          <span className="flex items-center gap-1 text-sm text-white/40">
            <img
              src="https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flocation-icon.bbe094a7.png&w=48&q=75&dpl=dpl_57sq3a4okDe2tVXZVSYu9FCcDV21"
              alt=""
              className="h-6 w-6 opacity-60"
            />
            <span className="font-semibold">{user.arena}</span>
          </span>
        )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/60 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Title */}
        <div className="mb-3 flex items-baseline gap-2 pl-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-transparent text-xl font-bold text-white placeholder:text-white/20 focus:outline-none"
          />
          <span className="shrink-0 text-xs text-white/20">optional</span>
        </div>

        <div className="mb-3 ml-1 border-t border-white/[0.06]" />
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto px-5" style={{ maxHeight: `${scrollHeight}px`, minHeight: '144px', scrollbarWidth: 'thin', scrollbarColor: '#333330 transparent' }}>
        {/* Body */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleEditorInput}
          onKeyDown={handleEditorKeyDown}
          onPaste={handlePaste}
          data-placeholder="Share your two cents..."
          className="w-full border-none bg-transparent text-base text-white empty:before:content-[attr(data-placeholder)] empty:before:text-white/40 focus:outline-none min-h-[144px] whitespace-pre-wrap break-words"
        />

      {/* Poll UI */}
      {activeOption === 'poll' && (
        <div className="mb-3 space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Poll
            </p>
            <button
              onClick={() => setActiveOption(null)}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {pollOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  value={opt}
                  onChange={(e) => {
                    const updated = [...pollOptions]
                    updated[i] = e.target.value
                    setPollOptions(updated)
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 pr-12 text-sm text-white placeholder:text-white/20 focus:border-[#c8a44d]/30 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/20">
                  {50 - opt.length}
                </span>
              </div>
              {pollOptions.length > 2 && (
                <button
                  onClick={() =>
                    setPollOptions((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white"
                >
                  <Minus className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 4 && (
            <button
              onClick={() => setPollOptions((prev) => [...prev, ''])}
              className="flex cursor-pointer items-center gap-1 text-xs text-white/40 transition-colors hover:text-white"
            >
              <Plus className="h-3 w-3" />
              <span>Add option</span>
            </button>
          )}
        </div>
      )}

      {/* Likert UI */}
      {activeOption === 'likert' && (
        <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Likert Scale
            </p>
            <button
              onClick={() => setActiveOption(null)}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex justify-between gap-1">
            {[
              'Strongly Disagree',
              'Disagree',
              'Neutral',
              'Agree',
              'Strongly Agree',
            ].map((label, i) => (
              <div key={label} className="flex flex-col items-center" style={{ flex: '1 1 0', minWidth: 0 }}>
                <button
                  onClick={() => setLikertValue(i)}
                  className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-all duration-200 ${
                    likertValue === i
                      ? 'scale-110'
                      : 'hover:scale-105 hover:border-white/15'
                  }`}
                  style={{
                    background: likertValue === i
                      ? 'radial-gradient(circle at 40% 35%, rgba(200,164,77,0.2) 0%, rgba(200,164,77,0.04) 80%)'
                      : 'rgba(255,255,255,0.03)',
                    border: likertValue === i
                      ? '1.5px solid rgba(200,164,77,0.45)'
                      : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: likertValue === i
                      ? '0 0 20px rgba(200,164,77,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  }}
                >
                  <span
                    className="text-xs font-medium"
                    style={{ color: likertValue === i ? '#c8a44d' : 'rgba(255,255,255,0.2)' }}
                  >
                    •
                  </span>
                </button>
                <span
                  className="mt-1.5 text-center text-[9px] font-semibold leading-tight"
                  style={{ color: likertValue === i ? '#c8a44d' : 'rgba(255,255,255,0.25)' }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media preview */}
      {imagePreview && (
        <div className="relative mb-3 overflow-hidden rounded-xl border border-white/[0.06]">
          {imageFile?.type.startsWith('video/') ? (
            <video src={imagePreview} controls className="max-h-64 w-full bg-black/20" />
          ) : (
            <img src={imagePreview} alt="" className="max-h-64 w-full object-contain bg-black/20" />
          )}
          <button
            onClick={clearImage}
            className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Quoted post preview */}
      {quotedPost && (
        <div className="mb-3">
          <QuotePostCard quote={quotedPost} />
        </div>
      )}

      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 pb-5 pt-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            onClick={() => imageFile ? clearImage() : fileInputRef.current?.click()}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
              imageFile
                ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
            title="Image"
          >
            <ImagePlus className="h-4 w-4" />
          </button>

          <button
            onClick={() => toggleOption('poll')}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
              activeOption === 'poll'
                ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
            title="Poll"
          >
            <BarChart3 className="h-4 w-4" />
          </button>

          <button
            onClick={() => toggleOption('likert')}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
              activeOption === 'likert'
                ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
            title="Likert"
          >
            <span className="text-xs font-bold">L</span>
          </button>

          <button
            onClick={() => {
              editorRef.current?.focus()
              document.execCommand('bold')
              setIsBoldActive(document.queryCommandState('bold'))
              handleEditorInput()
            }}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
              isBoldActive
                ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>

          <button
            onClick={() => {
              editorRef.current?.focus()
              document.execCommand('insertUnorderedList')
              setIsListActive(document.queryCommandState('insertUnorderedList'))
              handleEditorInput()
            }}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
              isListActive
                ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
            title="Bullets"
          >
            <List className="h-4 w-4" />
          </button>

          <button
            onClick={handleObfuscate}
            disabled={!hasEditorSelection}
            className={`flex h-8 cursor-pointer items-center justify-center rounded-full px-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
              hasEditorSelection
                ? 'text-white/40 hover:bg-white/[0.06] hover:text-white'
                : 'text-white/40'
            }`}
            title="Obfuscate selected text"
          >
            ZWJ
          </button>

          <EmojiPickerButton
            size="md"
            position="below"
            onSelect={(emoji) => {
              const el = editorRef.current
              if (!el) return
              el.focus()
              document.execCommand('insertText', false, emoji)
              handleEditorInput()
            }}
          />

          <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />

          <button
            onClick={() => setDraftsOpen(true)}
            className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Drafts"
          >
            <FileText className="h-4 w-4" />
            {draftCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c8a44d] px-1 text-[10px] font-bold text-[#0f0e0a]">
                {draftCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={!canPost}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
              savedFeedback
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                : 'border-white/[0.08] bg-white/[0.04] text-white/40 hover:border-[#c8a44d]/20 hover:text-white/60'
            }`}
            title="Save draft"
          >
            {savedFeedback ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          </button>
          {/* Topic dropdown */}
          <div className="relative" ref={topicRef}>
            <button
              onClick={() => setTopicMenuOpen((prev) => !prev)}
              className="flex h-8 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-medium text-white/40 transition-all hover:border-[#c8a44d]/20 hover:text-white/60"
            >
              <span>{selectedTopic}</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${topicMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {topicMenuOpen && (
              <div
                className="absolute right-0 bottom-full z-50 mb-2 w-72 max-h-72 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#141410] p-2 shadow-xl shadow-black/40"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#333330 transparent',
                }}
              >
                {TOPIC_MENU.map((group, i) => (
                  <div key={group.category}>
                    {i > 0 && (
                      <div className="my-1.5 border-t border-white/[0.06]" />
                    )}
                    <p className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/40">
                      {group.category}
                    </p>
                    {group.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setSelectedTopic(item)
                          setTopicMenuOpen(false)
                        }}
                        className={`w-full cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors duration-150 ${
                          selectedTopic === item
                            ? 'bg-[#c8a44d]/10 font-medium text-[#c8a44d]'
                            : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canPost || isSubmitting}
            className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[#c8a44d] px-4 py-1.5 text-sm font-semibold text-[#0f0e0a] transition-all duration-200 hover:bg-[#c8a44d]/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadImage.isPending && <span>Uploading…</span>}
                {createPost.isPending && !uploadImage.isPending && <span>Posting…</span>}
              </>
            ) : (
              <span>Post</span>
            )}
          </button>
        </div>
      </div>
    </div>

    {draftsOpen && (
      <DraftsModal
        onClose={() => setDraftsOpen(false)}
        onLoad={handleLoadDraft}
        onDelete={() => setDraftCount((c) => Math.max(0, c - 1))}
      />
    )}
    </>
  )
}
