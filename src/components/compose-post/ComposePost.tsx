import { useState, useRef, useEffect, useCallback } from 'react'
import { ImagePlus, X, BarChart3, List, Bold, Loader2, FileText, Save, Check, MoreHorizontal } from 'lucide-react'
import { EmojiPickerButton } from '@/components/emoji-picker/EmojiPickerButton'
import { GifPickerButton } from '@/components/gif-picker/GifPickerButton'
import { firstMediaUrl, insertGifImage, stripMediaUrls, ZERO_WIDTH_MEDIA_TEXT, fetchOrConvertImageToFile, isUploadedUrl } from '@/lib/gif'
import { NetworthPill } from '@/components/networth-pill/NetworthPill'
import { GenderIcon } from '@/components/gender-icon/GenderIcon'
import { QuotePostCard } from '@/components/post-card/QuotePostCard'
import { ImageLightbox } from '@/components/lightbox/ImageLightbox'
import { useAuth } from '@/lib/auth'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useCreatePost } from '@/hooks/usePostMutations'
import { useUploadImage, useUploadImagesBulk } from '@/hooks/useUploadImage'
import { useToast } from '@/components/toast/ToastContext'
import { humanizeError } from '@/lib/api'
import { saveDraft, getDraftCount } from '@/lib/drafts'
import type { Draft, DraftMediaItem } from '@/lib/drafts'
import { DraftsModal } from './DraftsModal'
import { PollComposer } from './PollComposer'
import { LikertComposer } from './LikertComposer'
import { TopicDropdown } from './TopicDropdown'
import { TOPIC_MENU, TOPIC_SLUG, type PostOption } from './config'
import type { PostCardData } from '@/components/post-card/types'
import { obfuscateText, formatTopicSlug } from '@/lib/utils'
import { MentionPicker } from '@/components/mention-picker/MentionPicker'
import { extractMentionUuids, notifyMentions } from '@/lib/mentionNotifications'
import { getPinnedTopic } from '@/lib/pinnedTopic'

interface ComposePostProps {
  onClose?: () => void
  scrollHeight?: number
  quotedPost?: PostCardData | null
  defaultTopic?: string
}

const COMPOSE_TOPICS = new Set(TOPIC_MENU.flatMap((g) => g.items))
const MAX_POLL_OPTIONS = 10

export function ComposePost({ onClose, scrollHeight = 285, quotedPost = null, defaultTopic }: ComposePostProps) {
  const { auth } = useAuth()
  const { data: profileData } = useUserProfile(auth?.userUuid)
  const user = profileData?.pages[0]?.user
  const createPost = useCreatePost()
  const uploadImage = useUploadImage()
  const uploadBulk = useUploadImagesBulk()
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [body, setBody] = useState('')
  const [pinnedTopic, setPinnedTopicState] = useState<string>(() => getPinnedTopic())
  const [selectedTopic, setSelectedTopic] = useState(
    defaultTopic && COMPOSE_TOPICS.has(defaultTopic) ? defaultTopic : getPinnedTopic()
  )
  const [topicMenuOpen, setTopicMenuOpen] = useState(false)
  const [activeOption, setActiveOption] = useState<PostOption>(null)
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [likertValue, setLikertValue] = useState<number | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [isBoldActive, setIsBoldActive] = useState(false)
  const [isListActive, setIsListActive] = useState(false)
  const [hasEditorSelection, setHasEditorSelection] = useState(false)
  const [draftsOpen, setDraftsOpen] = useState(false)
  const [draftCount, setDraftCount] = useState(0)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false)
  const [previewLightboxIndex, setPreviewLightboxIndex] = useState<number | null>(null)

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
    if (!sel || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) {
      toast('error', 'Select some text first, then click ZWJ')
      return
    }
    const selected = sel.toString()
    if (!selected) {
      toast('error', 'Select some text first, then click ZWJ')
      return
    }
    document.execCommand('insertText', false, obfuscateText(selected))
    handleEditorInput()
    toast('success', 'ZWJ applied — text is now obfuscated')
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
    // Convert <strong>/<b> to ** markers, strip remaining tags
    const isBlock = (elem: HTMLElement) => ['DIV', 'P', 'BLOCKQUOTE', 'UL', 'OL', 'LI'].includes(elem.tagName)
    const serializeInlineText = (nodes: NodeListOf<ChildNode> | ChildNode[]): string => serializeInlineLines(nodes).join('\n')
    const serializeInlineNode = (node: ChildNode): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
      if (node.nodeType !== Node.ELEMENT_NODE) return ''

      const elem = node as HTMLElement
      if (elem.tagName === 'IMG' && elem.hasAttribute('data-gif-url')) return ''
      if (elem.hasAttribute('data-mention-uuid')) {
        const uuid = elem.getAttribute('data-mention-uuid')
        return uuid ? `[${elem.textContent || ''}](/user/${uuid})` : elem.textContent || ''
      }
      if (elem.tagName === 'STRONG' || elem.tagName === 'B') return `**${serializeInlineText(elem.childNodes)}**`
      if (elem.tagName === 'BR') return '\n'
      if (isBlock(elem)) return serializeBlock(elem).join('\n')
      return serializeInlineText(elem.childNodes)
    }
    const serializeInlineLines = (nodes: NodeListOf<ChildNode> | ChildNode[]): string[] => {
      const childNodes = Array.from(nodes)
      const lines = ['']

      childNodes.forEach((node, index) => {
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
          if (index !== childNodes.length - 1) lines.push('')
          return
        }

        const text = serializeInlineNode(node)
        const split = text.split('\n')
        lines[lines.length - 1] += split[0]
        for (let i = 1; i < split.length; i++) lines.push(split[i])
      })

      return lines
    }
    const serializeBlock = (elem: HTMLElement): string[] => {
      if (elem.tagName === 'BLOCKQUOTE') return serializeInlineLines(elem.childNodes).map((line) => `> ${line}`)
      if (elem.tagName === 'UL' || elem.tagName === 'OL') {
        return Array.from(elem.children).flatMap((child) => serializeBlock(child as HTMLElement))
      }
      if (elem.tagName === 'LI') {
        const lines = serializeInlineLines(elem.childNodes)
        return lines.map((line, index) => index === 0 ? `- ${line}` : line)
      }
      return serializeInlineLines(elem.childNodes)
    }
    const lines: string[] = []
    let currentLine = ''

    Array.from(el.childNodes).forEach((node, index, nodes) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement
        if (elem.tagName === 'BR') {
          if (index !== nodes.length - 1) {
            lines.push(currentLine)
            currentLine = ''
          }
          return
        }
        if (isBlock(elem)) {
          if (currentLine !== '') {
            lines.push(currentLine)
            currentLine = ''
          }
          lines.push(...serializeBlock(elem))
          return
        }
      }

      const text = serializeInlineNode(node as ChildNode)
      const split = text.split('\n')
      currentLine += split[0]
      for (let i = 1; i < split.length; i++) {
        lines.push(currentLine)
        currentLine = split[i]
      }
    })

    if (currentLine !== '' || lines.length === 0) lines.push(currentLine)
    return lines.join('\n')
  }

  function handleEditorInput() {
    const el = editorRef.current
    if (el) {
      const hasContent = (el.textContent?.trim() ?? '') !== '' || el.querySelector('img') !== null
      if (!hasContent && el.innerHTML !== '') {
        el.innerHTML = ''
      }
    }
    setBody(getEditorText())
    // Sync gifUrl state: clear if the GIF img was removed from the editor
    if (el && gifUrl && !el.querySelector('img[data-gif-url]')) {
      setGifUrl(null)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) return
        if (imageFiles.length >= 4) {
          toast('error', 'You can upload a maximum of 4 images')
          return
        }
        setImageFiles((prev) => [...prev, file])
        setImagePreviews((prev) => [...prev, URL.createObjectURL(file)])
        setActiveOption('image')
        return
      }
    }
    // Strip rich text formatting — paste as plain text only
    e.preventDefault()
    const text = e.clipboardData?.getData('text/plain') ?? ''
    const mediaUrl = firstMediaUrl(text)
    if (mediaUrl && editorRef.current) {
      const stripped = stripMediaUrls(text, [mediaUrl])
      if (stripped) document.execCommand('insertText', false, stripped)
      insertGifImage(editorRef.current, mediaUrl)
      setGifUrl(mediaUrl)
      handleEditorInput()
      return
    }
    if (text) document.execCommand('insertText', false, text)
  }

  const toolsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsMenuOpen(false)
      }
    }
    if (toolsMenuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [toolsMenuOpen])

  const toggleOption = useCallback((opt: 'poll' | 'likert') => {
    setActiveOption((prev) => {
      if (prev === opt) return null
      return opt
    })
    if (opt === 'poll') setPollOptions(['', ''])
    if (opt === 'likert') setLikertValue(null)
  }, [])

  const hasPollContent = activeOption === 'poll' && Array.isArray(pollOptions) && pollOptions.some((o) => o.trim().length > 0)
  const hasLikertContent = activeOption === 'likert' && likertValue !== null

  const canPost =
    title.trim().length > 0 ||
    body.trim().length > 0 ||
    imageFiles.length > 0 ||
    gifUrl !== null ||
    hasPollContent ||
    hasLikertContent

  const isSubmitting = createPost.isPending || uploadImage.isPending || uploadBulk.isPending

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    const remainingSlots = 4 - imageFiles.length
    if (remainingSlots <= 0) {
      toast('error', 'You can upload a maximum of 4 images')
      e.target.value = ''
      return
    }

    if (files.length > remainingSlots) {
      toast('error', `You can only add ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'} (max 4)`)
    }

    const allowedFiles = files.slice(0, remainingSlots)
    const newPreviews = allowedFiles.map((f) => URL.createObjectURL(f))

    setImageFiles((prev) => [...prev, ...allowedFiles])
    setImagePreviews((prev) => [...prev, ...newPreviews])
    setActiveOption('image')
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  function removeImage(index: number) {
    setImagePreviews((prev) => {
      const url = prev[index]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
    setImageFiles((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0 && activeOption === 'image') {
        setActiveOption(null)
      }
      return next
    })
  }

  function clearAllImages() {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setImageFiles([])
    setImagePreviews([])
    if (activeOption === 'image') setActiveOption(null)
  }

  async function handleSaveDraft() {
    if (!canPost) return
    const isPoll = activeOption === 'poll' || (Array.isArray(pollOptions) && pollOptions.some((o) => o.trim() !== ''))

    const mediaBlobs: DraftMediaItem[] = await Promise.all(
      imageFiles.map(async (file) => ({
        blob: await file.arrayBuffer(),
        type: file.type,
        name: file.name,
      }))
    )

    const draft: Draft = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      title,
      body,
      bodyHtml: editorRef.current?.innerHTML ?? '',
      topic: selectedTopic,
      activeOption: isPoll ? 'poll' : activeOption,
      pollOptions: isPoll ? pollOptions : [],
      likertValue: activeOption === 'likert' ? likertValue : null,
      mediaBlob: mediaBlobs[0]?.blob ?? null,
      mediaType: mediaBlobs[0]?.type ?? null,
      mediaName: mediaBlobs[0]?.name ?? null,
      mediaBlobs,
    }
    await saveDraft(draft)
    setDraftCount((c) => c + 1)
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 1500)
  }

  function handleLoadDraft(draft: Draft) {
    setTitle(draft.title)
    setSelectedTopic(draft.topic)

    // Clear existing images without clobbering activeOption
    clearAllImages()

    // Restore poll / likert / image option
    const hasFilledPoll = Array.isArray(draft.pollOptions) && draft.pollOptions.some((o) => o.trim() !== '')
    const isPoll = draft.activeOption === 'poll' || hasFilledPoll

    if (isPoll) {
      setPollOptions(draft.pollOptions && draft.pollOptions.length > 0 ? draft.pollOptions : ['', ''])
      setActiveOption('poll')
      setLikertValue(null)
    } else if (draft.activeOption === 'likert' || draft.likertValue !== null) {
      setActiveOption('likert')
      setLikertValue(draft.likertValue ?? null)
      setPollOptions(['', ''])
    } else {
      setPollOptions(['', ''])
      setLikertValue(null)
      setActiveOption(null)
    }

    // Restore media
    const restoredFiles: File[] = []
    if (draft.mediaBlobs && draft.mediaBlobs.length > 0) {
      draft.mediaBlobs.forEach((item) => {
        restoredFiles.push(new File([item.blob], item.name, { type: item.type }))
      })
    } else if (draft.mediaBlob && draft.mediaType) {
      restoredFiles.push(new File([draft.mediaBlob], draft.mediaName ?? 'media', { type: draft.mediaType }))
    }

    if (restoredFiles.length > 0) {
      setImageFiles(restoredFiles)
      setImagePreviews(restoredFiles.map((f) => URL.createObjectURL(f)))
      // Only set activeOption to 'image' if there's no poll or likert
      if (!isPoll && draft.activeOption !== 'likert') {
        setActiveOption('image')
      }
    }

    if (editorRef.current) {
      editorRef.current.innerHTML = draft.bodyHtml ?? ''
      handleEditorInput()
    }

    setDraftsOpen(false)
    getDraftCount().then(setDraftCount)
  }

  async function handleSubmit() {
    if (!canPost || isSubmitting) return

    const mentionedUuids = extractMentionUuids(editorRef.current, auth?.userUuid)
    const topic = TOPIC_SLUG[selectedTopic] ?? formatTopicSlug(selectedTopic)
    const meta: Record<string, unknown> = { version: 1, platform: 'web' }
    const mediaUrl = gifUrl ?? firstMediaUrl(body)
    const postText = mediaUrl ? stripMediaUrls(body, [mediaUrl]) || ZERO_WIDTH_MEDIA_TEXT : body.trim() || ZERO_WIDTH_MEDIA_TEXT

    let postType = 0

    if (mediaUrl) {
      let finalUrl = mediaUrl
      if (!isUploadedUrl(mediaUrl)) {
        try {
          const gifFile = await fetchOrConvertImageToFile(mediaUrl)
          const result = await uploadImage.mutateAsync(gifFile)
          finalUrl = result.publicURL
        } catch {
          toast('error', 'Could not fetch image from URL. Try downloading and uploading the file directly.')
          return
        }
      }
      meta.src = finalUrl
      meta.giphy_url = finalUrl
      meta.giphy_id = finalUrl
      postType = 4
    } else if (quotedPost) {
      meta.quote_post = {
        uuid: quotedPost.uuid,
        title: quotedPost.title ?? '',
        text: quotedPost.text,
        upvote_count: quotedPost.upvote_count,
        comment_count: quotedPost.comment_count,
        view_count: quotedPost.view_count,
        report_count: quotedPost.report_count ?? 0,
        bookmark_count: quotedPost.bookmark_count ?? 0,
        post_type: quotedPost.post_type,
        author_uuid: quotedPost.author_uuid,
        post_meta: quotedPost.post_meta ?? {},
        topic: quotedPost.topic ?? '',
        author_meta: quotedPost.author_meta,
        created_at: quotedPost.created_at,
        updated_at: quotedPost.updated_at ?? quotedPost.created_at,
      }
      if (imageFiles.length > 0) {
        postType = 4
        try {
          const uploadResults = await uploadBulk.mutateAsync(imageFiles)
          const urls = uploadResults.map((r) => r.publicURL)
          meta.src = urls[0]
          meta.imageUrls = urls
          const hasVideo = uploadResults.some((r) => r.isVideo)
          if (hasVideo) {
            meta.media_type = 'video'
            meta.video_url = urls[0]
            meta.video = urls[0]
          }
        } catch (err) {
          toast('error', humanizeError(err))
          return
        }
      } else {
        postType = 3
      }
    } else if (activeOption === 'poll') {
      postType = 2
      meta.poll = pollOptions.filter((o) => o.trim().length > 0)
    } else if (activeOption === 'likert') {
      postType = 5
    } else if (imageFiles.length > 0) {
      postType = 4
      try {
        const uploadResults = await uploadBulk.mutateAsync(imageFiles)
        const urls = uploadResults.map((r) => r.publicURL)
        meta.src = urls[0]
        meta.imageUrls = urls
        const hasVideo = uploadResults.some((r) => r.isVideo)
        if (hasVideo) {
          meta.media_type = 'video'
          meta.video_url = urls[0]
          meta.video = urls[0]
        }
      } catch (err) {
        toast('error', humanizeError(err))
        return
      }
    }

    createPost.mutate(
      {
        title: title.trim(),
        topic,
        text: postText,
        post_type: postType,
        post_meta: meta,
      },
      {
        onSuccess: async (data) => {
          setTitle('')
          setBody('')
          setGifUrl(null)
          if (editorRef.current) editorRef.current.innerHTML = ''
          setActiveOption(null)
          setPollOptions(['', ''])
          setLikertValue(null)
          clearAllImages()
          onClose?.()
          toast('success', 'Posted successfully')
          if (auth && mentionedUuids.length > 0) {
            const result = await notifyMentions({
              auth,
              mentionedUuids,
              postUuid: data.post.uuid,
              contentType: 'post',
            })
            if (result.sent > 0) toast('success', `Mention notification sent to ${result.sent}`)
            if (result.failed > 0) toast('error', `Failed to notify ${result.failed} mention${result.failed === 1 ? '' : 's'}`)
          }
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
      <div className="sticky top-0 z-10 bg-inherit px-3 pt-4 pb-1 sm:px-4 sm:pt-4">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-3" data-compose-networth-pill>
            <NetworthPill
              networth={user?.balance ?? 0}
              subscriptionType={user?.subscription_type ?? 1}
              authorUuid={user?.uuid}
              role={user?.role}
              size="default"
            />
            {user?.gender && (
              <span className="flex h-8 items-center gap-1.5">
                <GenderIcon
                  gender={user.gender === 'F' ? 'female' : 'male'}
                  className="h-4.5 w-4.5 text-white/40"
                />
                {user.age != null && (
                  <span className="text-[15px] font-semibold text-white/40 leading-none">
                    {user.age}
                  </span>
                )}
              </span>
            )}
            {user?.arena && (
              <span className="flex h-8 items-center gap-1.5 text-[15px] text-white/40">
                <img
                  src="https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flocation-icon.432s1sddmkeug.png&w=48&q=75&dpl=dpl_5ovAARAu8zMP9MtrCL9RTcRsDq7b"
                  alt=""
                  className="h-6 w-6 opacity-60"
                />
                <span className="font-semibold leading-none">{user.arena}</span>
              </span>
            )}
          </div>
          {onClose && (
            <button
              data-onboarding="close-compose"
              onClick={onClose}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/60 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Title */}
        <div className="mb-2 flex items-baseline gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-transparent text-[22px] font-bold text-white placeholder:text-white/20 focus:outline-none"
          />
          <span className="shrink-0 text-xs text-white/20">optional</span>
        </div>

        <div className="mb-3.5 border-t border-white/[0.06]" />
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto px-3 pt-1.5 sm:px-4" style={{ maxHeight: `${scrollHeight}px`, minHeight: '160px', scrollbarWidth: 'thin', scrollbarColor: '#333330 transparent' }}>
        {/* Body */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleEditorInput}
          onKeyDown={handleEditorKeyDown}
          onPaste={handlePaste}
          data-placeholder="Share your two cents..."
          className="w-full border-none bg-transparent text-base text-white empty:before:content-[attr(data-placeholder)] empty:before:text-white/40 focus:outline-none min-h-[160px] whitespace-pre-wrap break-words"
        />
        <MentionPicker editorRef={editorRef} onMentionInserted={handleEditorInput} />

      {/* Poll UI */}
      {activeOption === 'poll' && (
        <PollComposer
          pollOptions={pollOptions}
          setPollOptions={setPollOptions}
          onClose={() => setActiveOption(null)}
          maxOptions={MAX_POLL_OPTIONS}
        />
      )}

      {/* Likert UI */}
      {activeOption === 'likert' && (
        <LikertComposer
          likertValue={likertValue}
          setLikertValue={setLikertValue}
          onClose={() => setActiveOption(null)}
        />
      )}

      {/* Clean Media Preview */}
      {imagePreviews.length > 0 && (
        <div className="relative mb-3">
          {imagePreviews.length === 1 ? (
            <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
              {imageFiles[0]?.type.startsWith('video/') ? (
                <video src={imagePreviews[0]} controls className="max-h-72 w-full bg-black/20" />
              ) : (
                <img
                  src={imagePreviews[0]}
                  alt=""
                  onClick={() => setPreviewLightboxIndex(0)}
                  className="max-h-72 w-full cursor-zoom-in object-contain bg-black/20"
                />
              )}
              <button
                type="button"
                onClick={() => removeImage(0)}
                className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur-sm transition-colors hover:bg-rose-500 hover:text-white shadow-md"
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : imagePreviews.length === 2 ? (
            <div className="grid grid-cols-2 gap-1.5 h-48 sm:h-56 overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative h-full w-full overflow-hidden bg-white/[0.02]">
                  <img
                    src={preview}
                    alt=""
                    onClick={() => setPreviewLightboxIndex(idx)}
                    className="h-full w-full cursor-zoom-in object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur-sm transition-colors hover:bg-rose-500 hover:text-white shadow-md"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : imagePreviews.length === 3 ? (
            <div className="grid grid-cols-2 gap-1.5 h-52 sm:h-60 overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
              {/* Left tall */}
              <div className="relative h-full w-full overflow-hidden bg-white/[0.02]">
                <img
                  src={imagePreviews[0]}
                  alt=""
                  onClick={() => setPreviewLightboxIndex(0)}
                  className="h-full w-full cursor-zoom-in object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(0)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur-sm transition-colors hover:bg-rose-500 hover:text-white shadow-md"
                  title="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Right 2 stacked */}
              <div className="flex h-full flex-col gap-1.5 overflow-hidden">
                <div className="relative h-[calc(50%-3px)] w-full overflow-hidden bg-white/[0.02]">
                  <img
                    src={imagePreviews[1]}
                    alt=""
                    onClick={() => setPreviewLightboxIndex(1)}
                    className="h-full w-full cursor-zoom-in object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(1)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur-sm transition-colors hover:bg-rose-500 hover:text-white shadow-md"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="relative h-[calc(50%-3px)] w-full overflow-hidden bg-white/[0.02]">
                  <img
                    src={imagePreviews[2]}
                    alt=""
                    onClick={() => setPreviewLightboxIndex(2)}
                    className="h-full w-full cursor-zoom-in object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(2)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur-sm transition-colors hover:bg-rose-500 hover:text-white shadow-md"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 grid-rows-2 gap-1.5 h-52 sm:h-64 overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
              {imagePreviews.slice(0, 4).map((preview, idx) => (
                <div key={idx} className="relative h-full w-full overflow-hidden bg-white/[0.02]">
                  <img
                    src={preview}
                    alt=""
                    onClick={() => setPreviewLightboxIndex(idx)}
                    className="h-full w-full cursor-zoom-in object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur-sm transition-colors hover:bg-rose-500 hover:text-white shadow-md"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
      <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            data-onboarding="media"
            onClick={() => {
              if (imageFiles.length >= 4) {
                toast('error', 'Maximum 4 images allowed')
                return
              }
              fileInputRef.current?.click()
            }}
            className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
              imageFiles.length > 0
                ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
            title={imageFiles.length > 0 ? `Images (${imageFiles.length}/4)` : 'Add image (up to 4)'}
          >
            <ImagePlus className="h-4 w-4" />
            {imageFiles.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#c8a44d] px-0.5 text-[9px] font-bold text-[#0f0e0a]">
                {imageFiles.length}
              </span>
            )}
          </button>

          <div className="relative min-[521px]:hidden" ref={toolsRef}>
            <button
              type="button"
              onClick={() => setToolsMenuOpen((prev) => !prev)}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
                toolsMenuOpen || activeOption === 'poll' || activeOption === 'likert' || isBoldActive || isListActive
                  ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
                  : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
              }`}
              title="More tools"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {toolsMenuOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-2 grid w-[166px] grid-cols-4 gap-1.5 rounded-xl border border-white/[0.08] bg-[#141410] p-2 shadow-xl shadow-black/40">
                <button
                  onClick={() => { toggleOption('poll'); setToolsMenuOpen(false) }}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${activeOption === 'poll' ? 'bg-[#c8a44d]/10 text-[#c8a44d]' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'}`}
                  title="Poll"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { toggleOption('likert'); setToolsMenuOpen(false) }}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${activeOption === 'likert' ? 'bg-[#c8a44d]/10 text-[#c8a44d]' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'}`}
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
                    setToolsMenuOpen(false)
                  }}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${isBoldActive ? 'bg-[#c8a44d]/10 text-[#c8a44d]' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'}`}
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
                    setToolsMenuOpen(false)
                  }}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${isListActive ? 'bg-[#c8a44d]/10 text-[#c8a44d]' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'}`}
                  title="Bullets"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  data-onboarding="zwj"
                  onClick={() => { handleObfuscate(); setToolsMenuOpen(false) }}
                  disabled={!hasEditorSelection}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[9px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${hasEditorSelection ? 'text-white/50 hover:bg-white/[0.06] hover:text-white' : 'text-white/40'}`}
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
                <GifPickerButton
                  onSelect={(url) => {
                    const el = editorRef.current
                    if (!el) return
                    insertGifImage(el, url)
                    setGifUrl(url)
                    handleEditorInput()
                  }}
                />
                <button
                  data-onboarding="drafts"
                  onClick={() => { setDraftsOpen(true); setToolsMenuOpen(false) }}
                  className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
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
            )}
          </div>

          <button
            onClick={() => toggleOption('poll')}
            className={`hidden h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors min-[521px]:flex ${
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
            className={`hidden h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors min-[521px]:flex ${
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
            className={`hidden h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors min-[521px]:flex ${
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
            className={`hidden h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors min-[521px]:flex ${
              isListActive
                ? 'bg-[#c8a44d]/10 text-[#c8a44d]'
                : 'text-white/40 hover:bg-white/[0.06] hover:text-white'
            }`}
            title="Bullets"
          >
            <List className="h-4 w-4" />
          </button>

          <button
            data-onboarding="zwj"
            onClick={handleObfuscate}
            disabled={!hasEditorSelection}
            className={`hidden h-8 cursor-pointer items-center justify-center rounded-full px-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 min-[521px]:flex ${
              hasEditorSelection
                ? 'text-white/40 hover:bg-white/[0.06] hover:text-white'
                : 'text-white/40'
            }`}
            title="Obfuscate selected text"
          >
            ZWJ
          </button>

          <div className="hidden min-[521px]:block">
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
          </div>

          <div className="hidden min-[521px]:block">
            <GifPickerButton
              onSelect={(url) => {
                const el = editorRef.current
                if (!el) return
                insertGifImage(el, url)
                setGifUrl(url)
                handleEditorInput()
              }}
            />
          </div>

          <div className="mx-0.5 hidden h-4 w-px bg-white/[0.08] min-[521px]:block" />

          <button
            data-onboarding="drafts"
            onClick={() => setDraftsOpen(true)}
            className="relative hidden h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white min-[521px]:flex"
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

        <div className="flex min-w-0 items-center gap-2">
          <button
            data-onboarding="save-draft"
            onClick={handleSaveDraft}
            disabled={!canPost}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
              savedFeedback
                ? 'text-emerald-400'
                : 'text-white/40 hover:text-white/60'
            }`}
            title="Save draft"
          >
            {savedFeedback ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          </button>
          {/* Topic dropdown */}
          <TopicDropdown
            selectedTopic={selectedTopic}
            setSelectedTopic={setSelectedTopic}
            pinnedTopic={pinnedTopic}
            setPinnedTopicState={setPinnedTopicState}
            isOpen={topicMenuOpen}
            setIsOpen={setTopicMenuOpen}
          />
          <button
            onClick={handleSubmit}
            disabled={!canPost || isSubmitting}
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[#c8a44d] px-3 text-sm font-semibold text-[#0f0e0a] transition-all duration-200 hover:bg-[#c8a44d]/85 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
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

    {previewLightboxIndex !== null && imagePreviews.length > 0 && (
      <ImageLightbox
        images={imagePreviews}
        initialIndex={previewLightboxIndex}
        onClose={() => setPreviewLightboxIndex(null)}
      />
    )}
    </>
  )
}
