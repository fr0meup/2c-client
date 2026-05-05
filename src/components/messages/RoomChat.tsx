import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Hash, Lock, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useMessages } from './MessagesContext'
import { MessageBubble } from './MessageBubble'
import { MessageComposer } from './MessageComposer'
import { fmtCount, gradientCss, type ChatMessage } from './types'
import { RoomInfoModal } from './RoomInfoModal'

const BATCH = 50

export function Room() {
  return <RoomChat />
}

export function ChatHeader() {
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { uuid } = useParams<{ uuid: string }>()
  const { getRoom } = useMessages()
  const [infoOpen, setInfoOpen] = useState(false)
  const room = uuid ? getRoom(uuid) : undefined

  if (!room) {
    return (
      <div className="flex h-10 items-center">
        <ChatBackButton onClick={() => navigate('/messages')} />
      </div>
    )
  }

  const isDm = room.type === 'dm'
  const Icon = room.is_private ? Lock : Hash
  const other = isDm ? room.members?.find((m) => m.user_uuid !== auth?.userUuid) : undefined
  const displayName = other?.username ?? room.name
  const onlineCount = room.stats.online_count ?? 0

  return (
    <>
      <div className="flex h-10 items-center justify-between gap-2">
        <ChatBackButton onClick={() => navigate('/messages')} />

        <button
          onClick={() => setInfoOpen(true)}
          className="group flex h-10 cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 transition-colors hover:bg-gradient-to-b hover:from-white/[0.08] hover:to-white/[0.03] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          <span className="h-5 w-5 shrink-0 rounded-full ring-1 ring-white/10" style={{ background: gradientCss(room.gradient) }} />
          {!isDm && <Icon className="h-3.5 w-3.5 shrink-0 text-white/50" strokeWidth={2.4} />}
          <span className="max-w-[180px] truncate text-sm font-semibold text-white">{displayName}</span>
          {!isDm && (
            <span className="flex shrink-0 items-center gap-1 text-[11px] text-white/40 tabular-nums">
              <Users className="h-3 w-3" strokeWidth={2.2} />
              {fmtCount(room.member_count)}
            </span>
          )}
          {!isDm && onlineCount > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.7)]" />
              {fmtCount(onlineCount)}
            </span>
          )}
        </button>

        <span className="h-10 w-10 shrink-0" aria-hidden />
      </div>

      {infoOpen && <RoomInfoModal room={room} onClose={() => setInfoOpen(false)} />}
    </>
  )
}

function ChatBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Back"
      className="group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/70 transition-colors hover:bg-gradient-to-b hover:from-white/[0.09] hover:to-white/[0.04] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={2.2} />
    </button>
  )
}

export function RoomChat() {
  const { uuid } = useParams<{ uuid: string }>()
  const { auth } = useAuth()
  const { getRoom, getMessages, sendMessage, markRoomRead, setActiveRoom, isMessagesLoading, isLoading, activeRoomUuid } = useMessages()
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [visibleCount, setVisibleCount] = useState(BATCH)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const messagesRef = useRef<HTMLDivElement>(null)

  const room = uuid ? getRoom(uuid) : undefined
  const allMessages = uuid ? getMessages(uuid) : []

  // Only render the last `visibleCount` messages
  const startIdx = Math.max(0, allMessages.length - visibleCount)
  const messages = allMessages.slice(startIdx)
  const hasMore = startIdx > 0

  // Reset visible count when switching rooms
  useEffect(() => { setVisibleCount(BATCH) }, [uuid])

  // Load more when scrolling near the top
  const onScroll = useCallback(() => {
    const el = messagesRef.current
    if (!el || !hasMore) return
    if (el.scrollTop < 200) {
      const prevHeight = el.scrollHeight
      setVisibleCount((c) => c + BATCH)
      // Preserve scroll position after new items are prepended
      requestAnimationFrame(() => {
        el.scrollTop += el.scrollHeight - prevHeight
      })
    }
  }, [hasMore])

  // Lock page scroll but keep scrollbar visible (non-functional)
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHO = html.style.overflowY
    const prevHH = html.style.height
    const prevBO = body.style.overflow
    const prevBH = body.style.height
    html.style.overflowY = 'scroll'
    html.style.height = '100vh'
    body.style.overflow = 'hidden'
    body.style.height = '100vh'
    return () => { html.style.overflowY = prevHO; html.style.height = prevHH; body.style.overflow = prevBO; body.style.height = prevBH }
  }, [])

  // Set active room so context fetches messages for this room
  useEffect(() => {
    if (uuid) setActiveRoom(uuid)
    return () => setActiveRoom(null)
  }, [uuid, setActiveRoom])

  useEffect(() => {
    if (uuid) markRoomRead(uuid)
  }, [uuid, markRoomRead])

  // Auto-scroll only when a genuinely new message arrives (not when loading older ones)
  const lastMsgUuid = allMessages.length > 0 ? allMessages[allMessages.length - 1].uuid : null
  useLayoutEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastMsgUuid])

  function jumpTo(targetUuid: string) {
    const el = messageRefs.current[targetUuid]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('msg-flash')
    setTimeout(() => el.classList.remove('msg-flash'), 1400)
  }

  function handleSend(text: string, replyToUuid?: string) {
    if (!uuid) return
    sendMessage(uuid, text, replyToUuid)
    setReplyTo(null)
  }

  if (!room) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
        {isLoading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-[#c8a44d]/60" />
        ) : (
          <p className="text-sm text-white/40">Conversation not found</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex justify-center px-4 sm:px-8" style={{ height: 'calc(100vh - 72px)' }}>
      <div className="flex h-full w-full max-w-[670px] flex-col xl:-ml-[245px]">
        {/* Messages */}
        <div ref={messagesRef} onScroll={onScroll} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-4">
          {(isMessagesLoading || activeRoomUuid !== uuid) && messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-[#c8a44d]/60" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-white/40">No messages yet — say hi.</p>
            </div>
          ) : (
            <>
            {hasMore && (
              <div className="flex justify-center py-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-[#c8a44d]/40" />
              </div>
            )}
            {messages.map((msg, i) => {
              const prev = messages[i - 1]
              const showAuthor =
                msg.author_uuid !== auth?.userUuid &&
                (!prev || prev.author_uuid !== msg.author_uuid)
              return (
                <MessageBubble
                  key={msg.uuid}
                  msg={msg}
                  showAuthor={showAuthor}
                  onReply={setReplyTo}
                  onJumpTo={jumpTo}
                  innerRef={(el) => {
                    messageRefs.current[msg.uuid] = el
                  }}
                />
              )
            })}
            </>
          )}
          <div />
        </div>

        {/* Composer */}
        <MessageComposer
          onSend={handleSend}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  )
}
