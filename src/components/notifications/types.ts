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
  /** The raw message from the API (may contain **bold** markdown). */
  message: string
  /** Username of the acting user. Parsed from message. Absent for system notifications. */
  actor?: string
  /** Secondary text: post/comment excerpt or system detail. Parsed from message. */
  preview?: string
  created_at: string
  read_at: string | null
  post_uuid?: string
  comment_uuid?: string
  follower_uuid?: string
  /** True when the vote notification is a downvote (detected from message). */
  isDownvote?: boolean
}

export type FilterTab = 'all' | 'unread' | 'replies'
