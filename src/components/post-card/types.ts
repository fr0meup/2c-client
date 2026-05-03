export interface AuthorMeta {
  balance: number
  subscription_type: number
  role?: string
  elo_rating?: number
  gender?: string
  age?: number
  arena?: string
  bio?: string
}

export interface PriceHistoryPoint {
  timestamp: number
  price: number
}

export interface PostMeta {
  platform?: 'ios' | 'android' | 'web'
  version?: number
  src?: string
  sensitive?: boolean
  media_type?: 'image' | 'video'
  poll?: string[]
  quote_post?: PostCardData
  price_history?: PriceHistoryPoint[]
  resolution_status?: 'open' | 'resolved' | 'pending'
  correct_answer?: string | null
  resolution_deadline?: string
  consensus_percent?: number
  question?: string
  category?: string
  polymarket_market_id?: string
  // transaction post (post_type 8)
  transaction?: { uuid: string }
  merchant?: string
  date?: string
  transactionValue?: number
  currencyCode?: string
  gradient?: string
  categoryIconUrl?: string
}

export interface PostCardData {
  uuid: string
  author_uuid: string
  author_meta: AuthorMeta
  created_at: string
  text: string
  title?: string
  topic?: string
  post_type: number
  post_meta?: PostMeta
  upvote_count: number
  view_count: number
  comment_count: number
  bookmark_count?: number
  report_count?: number
  deleted_at?: string | null
  updated_at?: string
}

export interface PostCardProps {
  post: PostCardData
  initialVote?: 1 | -1 | 0
}
