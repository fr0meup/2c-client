import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useUserRooms, useUserDMs, useExploreRooms, useRoomMessages, useJoinRoom } from '@/hooks/useRooms'
import { rpc } from '@/lib/api'
import { OFFLINE_KEY, useAuth } from '@/lib/auth'
import type { ApiRoom, ApiMessage, ApiReaction, GetMessagesResponse, GetRoomResponse, ListRoomsResponse } from '@/lib/types'
import type { ChatMessage, Room, RoomMember } from './types'

const WS_BASE = 'wss://ds3y2js2k0.execute-api.us-east-2.amazonaws.com/ws/'
const RECONNECT_DELAY = 2_000
const MAX_RECONNECT_DELAY = 30_000
const GIF_REGEX = /(https?:\/\/\S+\.gif(?:\?\S*)?)/gi

interface MessagesContextValue {
  rooms: Room[]
  dms: Room[]
  publicRooms: Room[]
  totalUnread: number
  isLoading: boolean
  getRoom: (uuid: string) => Room | undefined
  getMessages: (uuid: string) => ChatMessage[]
  sendMessage: (roomUuid: string, text: string, replyToUuid?: string) => boolean
  toggleReaction: (messageUuid: string, emoji: string) => void
  markRoomRead: (uuid: string) => void
  joinRoom: (uuid: string) => void
  joinedRooms: Set<string>
  /** Create a fake-DM-based group chat, send "start" msg, return roomUuid */
  createGroupChat: () => Promise<string>
  /** Set active room to trigger message fetching */
  activeRoomUuid: string | null
  setActiveRoom: (uuid: string | null) => void
  isMessagesLoading: boolean
}

const MessagesContext = createContext<MessagesContextValue | null>(null)

function useSocket(onMessage?: (data: unknown) => void, enabled = true) {
  const { auth } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const delayRef = useRef(RECONNECT_DELAY)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!enabled) return
    if (!auth?.token) return
    if (localStorage.getItem(OFFLINE_KEY) === '1') return

    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    const ws = new WebSocket(`${WS_BASE}?token=${auth.token}`)
    ws.onopen = () => { delayRef.current = RECONNECT_DELAY }
    ws.onmessage = (event) => {
      try {
        onMessageRef.current?.(JSON.parse(event.data))
      } catch { /* ignore non-JSON frames */ }
    }
    ws.onclose = () => {
      wsRef.current = null
      reconnectTimer.current = setTimeout(() => {
        connect()
        delayRef.current = Math.min(delayRef.current * 1.5, MAX_RECONNECT_DELAY)
      }, delayRef.current)
    }
    ws.onerror = () => ws.close()
    wsRef.current = ws
  }, [auth?.token, enabled])

  useEffect(() => {
    if (!enabled) return
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect, enabled])

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return false
    wsRef.current.send(JSON.stringify(data))
    return true
  }, [])

  return { send }
}

/** Map an API room to the UI Room shape */
export function mapRoom(r: ApiRoom, currentUserUuid?: string): Room {
  const members: RoomMember[] | undefined = r.members?.map((m) => ({
    user_uuid: m.user_uuid,
    username: m.alias ?? (m.user_uuid === currentUserUuid ? 'You' : `$${Number(m.balance).toLocaleString()}`),
    balance: Number(m.balance),
    subscription_type: m.subscription_type,
    age: m.age,
    gender: m.gender as 'M' | 'F',
    arena: m.arena,
    is_online: m.is_online,
  }))

  return {
    uuid: r.uuid,
    type: r.room_type,
    name: r.name || (members?.find((m) => m.user_uuid !== currentUserUuid)?.username ?? 'DM'),
    description: r.description ?? undefined,
    is_private: r.is_private,
    gradient: [r.gradients?.[0] ?? '#000000', r.gradients?.[1] ?? '#FFFFFF'] as [string, string],
    member_count: r.memberCount,
    members,
    stats: {
      last_message: r.stats.lastMessage,
      last_message_at: r.stats.lastMessageTimestamp ?? undefined,
      total_messages: r.stats.totalMessages,
      online_count: r.stats.onlineCount,
    },
    unread_count: r.missedMessages,
    muted: r.mute,
    room_code: r.room_code ?? undefined,
    requirements: r.requirements.map((req) => ({
      uuid: req.uuid,
      label: req.humanReadableRequirement,
      met: req.met,
    })),
  }
}

/** Map API messages + reactions to UI ChatMessage shape */
function mapMessages(messages: ApiMessage[], reactions: ApiReaction[], currentUserUuid?: string): ChatMessage[] {
  const reactionsByMsg = new Map<string, Map<string, { count: number; userReacted: boolean }>>()
  for (const r of reactions) {
    if (!reactionsByMsg.has(r.message_uuid)) reactionsByMsg.set(r.message_uuid, new Map())
    const emojiMap = reactionsByMsg.get(r.message_uuid)!
    const existing = emojiMap.get(r.text) ?? { count: 0, userReacted: false }
    existing.count += 1
    if (r.author_uuid === currentUserUuid) existing.userReacted = true
    emojiMap.set(r.text, existing)
  }

  return messages.map((m) => {
    const emojiMap = reactionsByMsg.get(m.uuid)
    return {
      uuid: m.uuid,
      room_uuid: m.room_uuid,
      author_uuid: m.author_uuid,
      text: m.text,
      message_meta: {
        giphy_id: typeof m.message_meta?.giphy_id === 'string' ? m.message_meta.giphy_id : undefined,
        giphy_url: typeof m.message_meta?.giphy_url === 'string' ? m.message_meta.giphy_url : undefined,
      },
      created_at: m.created_at,
      reply_to_uuid: m.reply_to_message_uuid ?? undefined,
      reply_preview: m.replyMessageText ?? undefined,
      reactions: emojiMap
        ? Array.from(emojiMap.entries()).map(([emoji, { count, userReacted }]) => ({ emoji, count, userReacted }))
        : undefined,
      deleted_at: m.deleted_at,
      author_meta: m.author_meta ? {
        balance: m.author_meta.balance,
        subscription_type: m.author_meta.subscription_type,
        age: m.author_meta.age,
        gender: m.author_meta.gender,
        arena: m.author_meta.arena,
        bio: m.author_meta.bio,
      } : undefined,
    }
  })
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { auth } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set())
  const [activeRoomUuid, setActiveRoom] = useState<string | null>(null)
  const joinRoomMutation = useJoinRoom()

  const { data: roomsData, isLoading: roomsLoading } = useUserRooms()
  const { data: dmsData, isLoading: dmsLoading } = useUserDMs()
  const { data: exploreData } = useExploreRooms(false)
  const { data: messagesData, isLoading: messagesLoading } = useRoomMessages(activeRoomUuid ?? undefined)

  const rooms = useMemo<Room[]>(() => {
    if (!roomsData?.rooms) return []
    return roomsData.rooms.map((r) => mapRoom(r, auth?.userUuid))
  }, [roomsData, auth?.userUuid])

  const dms = useMemo<Room[]>(() => {
    if (!dmsData?.rooms) return []
    return dmsData.rooms.map((r) => mapRoom(r, auth?.userUuid))
  }, [dmsData, auth?.userUuid])

  const publicRooms = useMemo<Room[]>(() => {
    if (!exploreData?.rooms) return []
    // Only show actual rooms (not DMs) in explore
    return exploreData.rooms
      .filter((r) => r.room_type === 'room')
      .map((r) => mapRoom(r, auth?.userUuid))
  }, [exploreData, auth?.userUuid])

  const activeMessages = useMemo<ChatMessage[]>(() => {
    if (!messagesData) return []
    // API returns newest-first; reverse so oldest are at the top of the chat
    return mapMessages(messagesData.messages, messagesData.reactions, auth?.userUuid).reverse()
  }, [messagesData, auth?.userUuid])

  const getRoom = useCallback(
    (uuid: string) => {
      const found = rooms.find((r) => r.uuid === uuid) ?? dms.find((r) => r.uuid === uuid)
      if (found) return found
      // Fallback: check raw query cache (handles race between cache update and memo recompute)
      const rawDms = queryClient.getQueryData<ListRoomsResponse>(['rooms', 'dms'])
      const rawRooms = queryClient.getQueryData<ListRoomsResponse>(['rooms', 'user'])
      const apiRoom = rawDms?.rooms.find((r) => r.uuid === uuid) ?? rawRooms?.rooms.find((r) => r.uuid === uuid)
      if (apiRoom) return mapRoom(apiRoom, auth?.userUuid)
      // Final fallback: check individual room detail cache (set by startDM flow)
      const detail = queryClient.getQueryData<GetRoomResponse>(['rooms', 'detail', uuid])
      if (detail?.room) return mapRoom(detail.room, auth?.userUuid)
      return undefined
    },
    [rooms, dms, queryClient, auth?.userUuid],
  )

  const getMessages = useCallback(
    (uuid: string) => {
      if (uuid === activeRoomUuid) return activeMessages
      return []
    },
    [activeRoomUuid, activeMessages],
  )

  // ── WebSocket: real-time send & receive ──
  const handleSocketMessage = useCallback((raw: unknown) => {
    const msg = raw as { type?: string; data?: Record<string, unknown> }
    if (!msg.type || !msg.data) return

    if (msg.type === 'message') {
      const payload = msg.data as unknown as ApiMessage
      if (!payload.room_uuid || !payload.uuid) return

      queryClient.setQueryData<GetMessagesResponse>(
        ['rooms', 'messages', payload.room_uuid],
        (prev) => {
          if (!prev) return prev
          if (prev.messages.some((m) => m.uuid === payload.uuid)) return prev
          // Remove optimistic local entry from same author with same text
          const filtered = prev.messages.filter(
            (m) => !(m.uuid.startsWith('local-') && m.author_uuid === payload.author_uuid && m.text === payload.text)
          )
          return { ...prev, messages: [payload, ...filtered] }
        },
      )
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      // Refetch messages to get full author_meta (WS payload may lack it)
      queryClient.invalidateQueries({ queryKey: ['rooms', 'messages', payload.room_uuid] })
      return
    }

    if (msg.type === 'reaction') {
      const r = msg.data as unknown as ApiReaction
      if (!r.message_uuid) return
      // Find which room this message belongs to and update cache
      const roomUuid = activeRoomUuid
      if (!roomUuid) return
      queryClient.setQueryData<GetMessagesResponse>(
        ['rooms', 'messages', roomUuid],
        (prev) => {
          if (!prev) return prev
          // Remove any optimistic duplicate (same author + message + emoji) then append
          const filtered = prev.reactions.filter(
            (rx) => !(rx.message_uuid === r.message_uuid && rx.author_uuid === r.author_uuid && rx.text === r.text)
          )
          return { ...prev, reactions: [...filtered, r] }
        },
      )
      return
    }

    if (msg.type === 'reactionRemoved') {
      const r = msg.data as unknown as ApiReaction
      if (!r.message_uuid) return
      const roomUuid = activeRoomUuid
      if (!roomUuid) return
      queryClient.setQueryData<GetMessagesResponse>(
        ['rooms', 'messages', roomUuid],
        (prev) => {
          if (!prev) return prev
          return {
            ...prev,
            reactions: prev.reactions.filter((rx) => rx.uuid !== r.uuid),
          }
        },
      )
      return
    }
  }, [queryClient, activeRoomUuid])

  const socketEnabled = location.pathname === '/messages' || location.pathname.startsWith('/room/')
  const { send: socketSend } = useSocket(handleSocketMessage, socketEnabled)

  // Send joinRoom via WebSocket when active room changes
  useEffect(() => {
    if (activeRoomUuid) {
      socketSend({ action: 'joinRoom', roomUuid: activeRoomUuid })
    }
  }, [activeRoomUuid, socketSend])

  const sendMessage = useCallback((roomUuid: string, text: string, replyToUuid?: string) => {
    const trimmed = text.trim()
    if (!trimmed || !auth) return false
    const gifUrl = trimmed.match(GIF_REGEX)?.[0]
    const messageText = trimmed
    const messageMeta = gifUrl ? { giphy_url: gifUrl, giphy_id: gifUrl } : {}

    const newMsg: ApiMessage = {
      uuid: `local-${Date.now()}`,
      room_uuid: roomUuid,
      author_uuid: auth.userUuid,
      text: messageText,
      created_at: new Date().toISOString(),
      role: 'user',
      reply_to_message_uuid: replyToUuid ?? null,
      author_meta: { age: 0, gender: '', balance: 0, arena: '', subscription_type: 0 },
      message_meta: messageMeta,
      deleted_at: null,
      replyMessageText: null,
      isBookmarked: false,
    }

    queryClient.setQueryData<GetMessagesResponse>(
      ['rooms', 'messages', roomUuid],
      (prev) => prev ? { ...prev, messages: [newMsg, ...prev.messages] } : undefined
    )

    const payload: Record<string, unknown> = {
      action: 'sendMessage',
      roomUuid,
      text: messageText,
    }
    if (replyToUuid) payload.replyToMessageUuid = replyToUuid
    if (gifUrl) {
      payload.giphy_url = gifUrl
      payload.giphy_id = gifUrl
      payload.message_meta = messageMeta
      payload.messageMeta = messageMeta
    }

    const sent = socketSend(payload)
    if (!sent) {
      // Socket not ready — refetch to sync
      queryClient.invalidateQueries({ queryKey: ['rooms', 'messages', roomUuid] })
    }
    return sent
  }, [auth, queryClient, socketSend])

  const toggleReaction = useCallback((messageUuid: string, emoji: string) => {
    if (!auth || !activeRoomUuid) return

    // Check if user already reacted with this emoji
    const prev = queryClient.getQueryData<GetMessagesResponse>(['rooms', 'messages', activeRoomUuid])
    const existingReaction = prev?.reactions.find(
      (r) => r.message_uuid === messageUuid && r.text === emoji && r.author_uuid === auth.userUuid
    )

    if (existingReaction) {
      // Remove reaction optimistically
      queryClient.setQueryData<GetMessagesResponse>(
        ['rooms', 'messages', activeRoomUuid],
        (old) => old ? { ...old, reactions: old.reactions.filter((r) => r.uuid !== existingReaction.uuid) } : undefined
      )
      socketSend({ action: 'removeReaction', messageUuid, text: emoji })
    } else {
      // Add reaction optimistically
      const optimistic: ApiReaction = {
        uuid: `local-rx-${Date.now()}`,
        author_uuid: auth.userUuid,
        text: emoji,
        message_uuid: messageUuid,
      }
      queryClient.setQueryData<GetMessagesResponse>(
        ['rooms', 'messages', activeRoomUuid],
        (old) => old ? { ...old, reactions: [...old.reactions, optimistic] } : undefined
      )
      socketSend({ action: 'addReaction', messageUuid, text: emoji })
    }
  }, [auth, activeRoomUuid, queryClient, socketSend])

  const createGroupChat = useCallback(async () => {
    if (!auth) throw new Error('Not authenticated')

    const fakeUuid = crypto.randomUUID()
    const suffix = fakeUuid.slice(0, 8)
    const roomCode = `gc-${suffix}`

    // 1. Create room shell via startDM with fake UUID
    const created = await rpc<{ room?: { uuid: string }; roomUuid?: string; uuid?: string }>(
      '/v1/rooms/startDM',
      { recipientUuid: fakeUuid },
      auth.token,
      auth.userUuid,
    )
    const roomUuid = created?.room?.uuid ?? created?.roomUuid ?? created?.uuid
    if (!roomUuid) throw new Error('No room UUID returned from startDM')

    // 2. Add name, description, and room code
    await rpc(
      '/v1/rooms/updateRoom',
      {
        roomUuid,
        name: `Group ${suffix}`,
        description: `Group chat ${suffix}`,
        roomCode,
        room_code: roomCode,
      },
      auth.token,
      auth.userUuid,
    )

    // 3. Send "start" message via WebSocket to register the DM row
    socketSend({ action: 'joinRoom', roomUuid })
    // Small delay to let the WS joinRoom propagate
    await new Promise((r) => setTimeout(r, 300))
    socketSend({ action: 'sendMessage', roomUuid, text: 'start' })

    // 4. Fetch the fully-updated room and seed caches
    const [roomData, messagesData] = await Promise.all([
      rpc<GetRoomResponse>('/v1/rooms/getRoom', { roomUuid }, auth.token, auth.userUuid),
      rpc<GetMessagesResponse>('/v1/rooms/getMessages', { roomUuid, offset: 0, limit: 500 }, auth.token, auth.userUuid),
    ])

    queryClient.setQueryData<ListRoomsResponse>(['rooms', 'dms'], (prev) => {
      const apiRoom = roomData.room
      if (!prev) return { rooms: [apiRoom] }
      if (prev.rooms.some((r) => r.uuid === apiRoom.uuid)) return prev
      return { rooms: [apiRoom, ...prev.rooms] }
    })
    queryClient.setQueryData(['rooms', 'detail', roomUuid], roomData)
    queryClient.setQueryData(['rooms', 'messages', roomUuid], messagesData)

    // Refresh lists in background
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['rooms', 'dms'] })
      queryClient.invalidateQueries({ queryKey: ['rooms', 'user'] })
    }, 2000)

    return roomUuid
  }, [auth, queryClient, socketSend])

  const markRoomRead = useCallback(() => {
    // The API doesn't have a dedicated "mark room read" endpoint —
    // missed messages are tracked server-side by reading messages.
    // Refetch rooms to get updated missedMessages count.
    queryClient.invalidateQueries({ queryKey: ['rooms'] })
  }, [queryClient])

  const joinRoom = useCallback((uuid: string) => {
    if (joinedRooms.has(uuid) || joinRoomMutation.isPending) return
    joinRoomMutation.mutate(uuid, {
      onSuccess: () => {
        setJoinedRooms((prev) => {
          const next = new Set(prev)
          next.add(uuid)
          return next
        })
      },
    })
  }, [joinedRooms, joinRoomMutation])

  const isLoading = roomsLoading || dmsLoading

  // Merge server-side joined rooms with locally-tracked new joins
  const allJoinedRooms = useMemo(() => {
    const set = new Set(joinedRooms)
    for (const r of rooms) set.add(r.uuid)
    return set
  }, [joinedRooms, rooms])

  const value = useMemo<MessagesContextValue>(() => {
    const totalUnread =
      rooms.reduce((acc, r) => acc + r.unread_count, 0) + dms.reduce((acc, r) => acc + r.unread_count, 0)
    return {
      rooms,
      dms,
      publicRooms,
      totalUnread,
      isLoading,
      getRoom,
      getMessages,
      sendMessage,
      toggleReaction,
      markRoomRead,
      joinRoom,
      createGroupChat,
      joinedRooms: allJoinedRooms,
      activeRoomUuid,
      setActiveRoom,
      isMessagesLoading: messagesLoading,
    }
  }, [rooms, dms, publicRooms, isLoading, getRoom, getMessages, sendMessage, toggleReaction, markRoomRead, joinRoom, createGroupChat, allJoinedRooms, activeRoomUuid, messagesLoading])

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>
}

export function useMessages(): MessagesContextValue {
  const ctx = useContext(MessagesContext)
  if (!ctx) throw new Error('useMessages must be used within <MessagesProvider>')
  return ctx
}
