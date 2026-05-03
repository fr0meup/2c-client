import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useMessages } from './MessagesContext'
import { MessageBubble } from './MessageBubble'
import { MessageComposer } from './MessageComposer'
import type { ChatMessage } from './types'

export function RoomChat() {
  const { uuid } = useParams<{ uuid: string }>()
  const { auth } = useAuth()
  const { getRoom, getMessages, sendMessage, markRoomRead, setActiveRoom, isMessagesLoading, isLoading, activeRoomUuid } = useMessages()
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  const room = uuid ? getRoom(uuid) : undefined
  const messages = uuid ? getMessages(uuid) : []

  // Set active room so context fetches messages for this room
  useEffect(() => {
    if (uuid) setActiveRoom(uuid)
    return () => setActiveRoom(null)
  }, [uuid, setActiveRoom])

  useEffect(() => {
    if (uuid) markRoomRead(uuid)
  }, [uuid, markRoomRead])

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [messages.length])

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
    <div className="flex justify-center px-4 sm:px-8">
      <div
        className="flex w-full max-w-[670px] flex-col xl:-ml-[245px]"
        style={{ minHeight: 'calc(100vh - 72px)' }}
      >
        {/* Messages */}
        <div className="flex flex-1 flex-col gap-3 py-4">
          {(isMessagesLoading || activeRoomUuid !== uuid) && messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-[#c8a44d]/60" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-white/40">No messages yet — say hi.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
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
            })
          )}
          <div ref={bottomRef} />
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
