import { useEffect } from 'react'
import { BellOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { NotificationItem } from './NotificationItem'
import { useNotifications } from './NotificationsContext'
import { REPLY_TYPES, type Notification } from './config'
import { NotificationsFeedSkeleton } from '@/components/skeleton/Skeleton'

export function Notifications() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="w-full max-w-[670px] xl:-ml-[245px]">
        <NotificationsFeed />
      </div>
    </div>
  )
}

export function NotificationsFeed() {
  const { notifications, filter, markRead, isLoading } = useNotifications()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [queryClient])

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
      // Evict stale cache so PostDetail always fetches fresh comments & post data
      queryClient.invalidateQueries({ queryKey: ['comments', notif.post_uuid] })
      queryClient.invalidateQueries({ queryKey: ['post', notif.post_uuid] })
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
