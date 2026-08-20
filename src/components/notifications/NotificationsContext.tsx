import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { REPLY_TYPES, type FilterTab, type Notification } from './config'
import { parseNotificationMessage } from './utils'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { ApiNotification, MarkReadResponse, NotificationsResponse } from '@/lib/types'

interface NotificationsContextValue {
  notifications: Notification[]
  unreadCount: number
  counts: Record<FilterTab, number>
  filter: FilterTab
  setFilter: (f: FilterTab) => void
  markRead: (uuid: string) => void
  markAllRead: () => void
  isLoading: boolean
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

function useNotificationsQuery() {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['notifications'],
    queryFn: ({ signal }) => {
      if (!auth) throw new Error('Not authenticated')
      return rpc<NotificationsResponse>('/v1/notifications/get', {}, auth.token, auth.userUuid, signal)
    },
    enabled: !!auth,
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
}

function useMarkNotificationRead() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationUuid: string) => {
      if (!auth) throw new Error('Not authenticated')
      return rpc<MarkReadResponse>(
        '/v1/notifications/read',
        { notification_uuid: notificationUuid },
        auth.token,
        auth.userUuid
      )
    },
    onMutate: async (notificationUuid) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      const prev = queryClient.getQueryData<NotificationsResponse>(['notifications'])

      if (prev) {
        queryClient.setQueryData<NotificationsResponse>(['notifications'], {
          notifications: prev.notifications.map((n: ApiNotification) =>
            n.uuid === notificationUuid ? { ...n, read_at: new Date().toISOString() } : n
          ),
        })
      }

      return { prev }
    },
    onError: (_err, _uuid, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['notifications'], context.prev)
      }
    },
  })
}

/** Transform API notification into the shape the UI expects */
function mapApiNotification(n: ApiNotification): Notification {
  const { actor, preview, isDownvote } = parseNotificationMessage(n.type, n.message)
  const meta = (n.notification_meta ?? {}) as Record<string, unknown>
  const raw = n as unknown as Record<string, unknown>

  const getStr = (key: string): string | undefined => {
    const v = meta[key] ?? raw[key]
    return typeof v === 'string' ? v : undefined
  }

  const actorUuid =
    getStr('voter_uuid') ||
    getStr('follower_uuid') ||
    getStr('replier_uuid') ||
    getStr('actor_uuid') ||
    getStr('author_uuid') ||
    getStr('user_uuid') ||
    getStr('from_user_uuid') ||
    getStr('sender_uuid') ||
    getStr('comment_author_uuid') ||
    getStr('post_author_uuid')

  return {
    uuid: n.uuid,
    type: n.type as Notification['type'],
    message: n.message,
    actor,
    actorUuid,
    preview,
    created_at: n.created_at,
    read_at: n.read_at,
    post_uuid: getStr('post_uuid'),
    comment_uuid: getStr('comment_uuid'),
    follower_uuid: getStr('follower_uuid') || actorUuid,
    isDownvote,
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useNotificationsQuery()
  const markReadMutation = useMarkNotificationRead()
  const [filter, setFilter] = useState<FilterTab>('all')

  const notifications = useMemo<Notification[]>(() => {
    if (!data?.notifications) return []
    return data.notifications.map(mapApiNotification)
  }, [data])

  const markRead = useCallback((uuid: string) => {
    markReadMutation.mutate(uuid)
  }, [markReadMutation])

  const markAllRead = useCallback(() => {
    // Only mark unread notifications in the current filter tab
    for (const n of notifications) {
      if (!n.read_at) {
        if (filter === 'all') { markReadMutation.mutate(n.uuid); continue }
        if (filter === 'unread') { markReadMutation.mutate(n.uuid); continue }
        if (filter === 'replies' && REPLY_TYPES.has(n.type)) { markReadMutation.mutate(n.uuid); continue }
      }
    }
  }, [notifications, markReadMutation, filter])

  const value = useMemo<NotificationsContextValue>(() => {
    let unreadCount = 0
    let replyCount = 0
    for (const n of notifications) {
      if (!n.read_at) unreadCount++
      if (!n.read_at && REPLY_TYPES.has(n.type)) replyCount++
    }
    const counts: Record<FilterTab, number> = {
      all: notifications.length,
      unread: unreadCount,
      replies: replyCount,
    }
    return { notifications, unreadCount, counts, filter, setFilter, markRead, markAllRead, isLoading }
  }, [notifications, filter, markRead, markAllRead, isLoading])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within <NotificationsProvider>')
  return ctx
}
