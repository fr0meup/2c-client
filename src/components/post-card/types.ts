export interface AuthorMeta {
  balance: number
  subscription_type: number
  role?: string
  elo_rating?: number
  gender?: string
  age?: number
  arena?: string
}

export interface PostMeta {
  platform?: 'ios' | 'android' | 'web'
  src?: string
  media_type?: 'image' | 'video'
  poll?: string[]
  quote_post?: PostCardData
  price_history?: Array<{ price: number; date: string }>
  resolution_status?: 'resolved' | 'pending'
  correct_answer?: string
  resolution_deadline?: string
  consensus_percent?: number
}

export interface PostCardData {
  uuid: string
  author_uuid: string
  author_meta: AuthorMeta
  created_at: string
  text: string
  title?: string
  topic?: string
  post_type: 1 | 2 | 5 | 7
  post_meta?: PostMeta
  upvote_count: number
  view_count: number
  comment_count: number
}

export interface PostCardProps {
  post: PostCardData
  initialVote?: 1 | -1 | 0
}
