import { BellOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { NotificationItem } from './NotificationItem'
import { useNotifications } from './NotificationsContext'
import { REPLY_TYPES } from './config'
import { NotificationsFeedSkeleton } from '@/components/skeleton'
import type { Notification } from './types'

export function NotificationsFeed() {
  const { notifications, filter, markRead, isLoading } = useNotifications()
  const navigate = useNavigate()

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read_at
    if (filter === 'replies') return REPLY_TYPES.has(n.type)
    return true
  })

  function handleOpen(notif: Notification) {
    if (notif.type === 'followed' && notif.follower_uuid) {
      navigate(`/user/${notif.follower_uuid}`)
      return
    }
    if (notif.post_uuid) {
      const hash = notif.comment_uuid ? `#comment-${notif.comment_uuid}` : ''
      navigate(`/post/${notif.post_uuid}${hash}`)
    }
  }

  if (isLoading) {
    return <NotificationsFeedSkeleton />
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] py-20">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] text-white/30">
          <BellOff className="h-5 w-5" strokeWidth={2} />
        </div>
        <p className="text-sm text-white/40">
          {filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {filtered.map((notif) => (
        <NotificationItem key={notif.uuid} notif={notif} onRead={markRead} onOpen={handleOpen} />
      ))}
    </div>
  )
}
