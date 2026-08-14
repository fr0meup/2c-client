export type NotificationType =
  | 'post_voted'
  | 'comment_voted'
  | 'post_replied'
  | 'comment_replied'
  | 'pick_post'
  | 'pick_resolved'
  | 'trending_post'
  | 'poll_voted'
  | 'followed'
  | 'generic'
  | 'balance_updated'

export interface Notification {
  uuid: string
  type: NotificationType
  message: string
  actor?: string
  actorUuid?: string
  preview?: string
  created_at: string
  read_at: string | null
  post_uuid?: string
  comment_uuid?: string
  follower_uuid?: string
  isDownvote?: boolean
}

export type FilterTab = 'all' | 'unread' | 'replies'

export const TYPE_LABELS: Record<NotificationType, string> = {
  post_voted: 'upvoted your post',
  comment_voted: 'upvoted your comment',
  post_replied: 'replied to your post',
  comment_replied: 'replied to your comment',
  pick_post: 'posted a new pick',
  pick_resolved: 'pick was resolved',
  trending_post: 'is trending',
  poll_voted: 'voted on your poll',
  followed: 'followed you',
  generic: '',
  balance_updated: 'balance update',
}

export const REPLY_TYPES = new Set<NotificationType>([
  'post_replied',
  'comment_replied',
])

export const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'replies', label: 'Replies' },
]
