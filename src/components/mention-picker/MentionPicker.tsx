import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useMyAliases } from '@/hooks/useFollow'
import type { Alias } from '@/hooks/useFollow'
import { NetworthPill } from '@/components/networth-pill/NetworthPill'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'
import type { UserProfileResponse } from '@/lib/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface MentionPickerProps {
  editorRef: React.RefObject<HTMLElement | null>
  onMentionInserted?: () => void
}

interface MentionContext {
  query: string
  range: Range
  rect: DOMRect
}

function getMentionContext(el: HTMLElement): MentionContext | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return null

  const node = sel.anchorNode
  if (node?.nodeType !== Node.TEXT_NODE) return null

  const text = node.textContent || ''
  const offset = sel.anchorOffset

  let atIndex = -1
  for (let i = offset - 1; i >= 0; i--) {
    if (text[i] === '@') { atIndex = i; break }
    if (/[\s\n]/.test(text[i])) break
  }
  if (atIndex === -1) return null
  if (atIndex > 0 && !/[\s\n]/.test(text[atIndex - 1])) return null

  const query = text.slice(atIndex + 1, offset)
  const range = document.createRange()
  range.setStart(node, atIndex)
  range.setEnd(node, offset)
  const rect = range.getBoundingClientRect()

  return { query, range, rect }
}

export function MentionPicker({ editorRef, onMentionInserted }: MentionPickerProps) {
  const { data } = useMyAliases()
  const aliases = data?.aliases ?? []

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const rangeRef = useRef<Range | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const { auth } = useAuth()
  const [uuidUser, setUuidUser] = useState<Alias | null>(null)
  const [uuidLoading, setUuidLoading] = useState(false)
  const lastUuidRef = useRef('')

  useEffect(() => {
    if (!open || !UUID_RE.test(query) || !auth?.token) {
      if (!UUID_RE.test(query)) setUuidUser(null)
      return
    }
    if (query === lastUuidRef.current) return
    lastUuidRef.current = query
    setUuidLoading(true)
    rpc<UserProfileResponse>('/v2/users/get', { user_uuid: query, posts_limit: 0, comments_limit: 0 }, auth.token, auth.userUuid)
      .then((res) => {
        const u = res.user
        setUuidUser({
          uuid: u.uuid,
          author_uuid: auth.userUuid,
          for_uuid: u.uuid,
          created_at: '',
          updated_at: '',
          alias: u.uuid.slice(0, 8),
          user: { uuid: u.uuid, balance: u.balance, subscription_type: u.subscription_type, elo_rating: u.elo_rating, age: u.age, gender: u.gender, arena: u.arena, role: u.role },
        })
      })
      .catch(() => setUuidUser(null))
      .finally(() => setUuidLoading(false))
  }, [open, query, auth])

  const filteredAliases = aliases.filter((a) =>
    a.alias.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)

  const filtered: Alias[] = UUID_RE.test(query) && uuidUser ? [uuidUser] : filteredAliases

  const check = useCallback(() => {
    const el = editorRef.current
    if (!el) { setOpen(false); return }
    const ctx = getMentionContext(el)
    if (ctx) {
      rangeRef.current = ctx.range
      setQuery(ctx.query)
      setRect(ctx.rect)
      setSelectedIndex(0)
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [editorRef])

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.addEventListener('input', check)
    el.addEventListener('keyup', check)
    el.addEventListener('click', check)
    return () => {
      el.removeEventListener('input', check)
      el.removeEventListener('keyup', check)
      el.removeEventListener('click', check)
    }
  }, [editorRef, check])

  const insertMention = useCallback((alias: Alias) => {
    const el = editorRef.current
    const range = rangeRef.current
    if (!el || !range) return

    const sel = window.getSelection()
    if (!sel) return

    sel.removeAllRanges()
    sel.addRange(range)

    const nw = Math.round(alias.user.balance).toLocaleString('en-US')

    const span = document.createElement('span')
    span.setAttribute('data-mention-uuid', alias.for_uuid)
    span.setAttribute('data-mention-alias', alias.alias)
    span.contentEditable = 'false'
    span.style.cssText = 'color:#c8a44d;font-weight:600;cursor:default;'
    span.textContent = `@${nw}`

    range.deleteContents()
    range.insertNode(span)

    // Add a space after the mention and place cursor there
    const space = document.createTextNode('\u00A0')
    span.after(space)
    const newRange = document.createRange()
    newRange.setStartAfter(space)
    newRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(newRange)

    setOpen(false)
    onMentionInserted?.()
  }, [editorRef, onMentionInserted])

  useEffect(() => {
    if (!open || !rangeRef.current) return
    function updatePos() {
      const r = rangeRef.current
      if (!r) return
      setRect(r.getBoundingClientRect())
    }
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filtered.length > 0) {
          e.preventDefault()
          e.stopPropagation()
          insertMention(filtered[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, filtered, selectedIndex, insertMention])

  if (!open || (filtered.length === 0 && !uuidLoading) || !rect) return null

  const top = rect.bottom + 4
  const left = rect.left

  return createPortal(
    <div
      ref={pickerRef}
      className="fixed z-[200] w-72 max-h-64 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#141410] p-1 shadow-2xl shadow-black/60"
      style={{ top, left, scrollbarWidth: 'thin', scrollbarColor: '#333330 transparent' }}
    >
      {uuidLoading && filtered.length === 0 && (
        <div className="px-3 py-2 text-[11px] text-white/30">Looking up user…</div>
      )}
      {filtered.map((a, i) => (
        <button
          key={a.uuid}
          onMouseDown={(e) => { e.preventDefault(); insertMention(a) }}
          className={`flex w-full cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-left transition-colors ${
            i === selectedIndex ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
          }`}
        >
          <div className="shrink-0 scale-[0.85] origin-left">
            <NetworthPill
              networth={a.user.balance}
              subscriptionType={a.user.subscription_type}
              authorUuid={a.for_uuid}
              role={a.user.role}
              size="small"
            />
          </div>
          <span className="min-w-0 truncate text-[12px] font-semibold text-[#c8a44d]">{a.alias}</span>
        </button>
      ))}
    </div>,
    document.body
  )
}
