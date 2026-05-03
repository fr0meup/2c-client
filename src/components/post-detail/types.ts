import type { AuthorMeta } from '@/components/post-card'

export interface Comment {
  uuid: string
  created_at: string
  post_uuid: string
  reply_parent_uuid: string | null
  author_uuid: string
  author_meta: AuthorMeta
  comment_meta?: {
    giphy_id?: string
    giphy_url?: string
  } | null
  text: string
  upvote_count: number
  deleted_at: string | null
}
