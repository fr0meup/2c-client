import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { REPLY_TYPES } from './config'
import { parseNotificationMessage } from './utils'
import type { FilterTab, Notification } from './types'
import { useNotificationsQuery, useMarkNotificationRead } from '@/hooks/useNotifications'
import type { ApiNotification } from '@/lib/types'

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

/** Transform API notification into the shape the UI expects */
function mapApiNotification(n: ApiNotification): Notification {
  const { actor, preview, isDownvote } = parseNotificationMessage(n.type, n.message)
  return {
    uuid: n.uuid,
    type: n.type as Notification['type'],
    message: n.message,
    actor,
    preview,
    created_at: n.created_at,
    read_at: n.read_at,
    post_uuid: n.notification_meta.post_uuid,
    comment_uuid: n.notification_meta.comment_uuid,
    follower_uuid: n.notification_meta.follower_uuid,
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
