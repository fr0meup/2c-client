// ── Post types matching the real API response ──

export interface AuthorMeta {
  bio?: string
  age?: number
  gender?: string
  balance: number
  arena?: string
  subscription_type: number
  elo_rating?: number
  role?: string
}

export interface PriceHistoryPoint {
  timestamp: number
  price: number
}

export interface QuotePost {
  uuid: string
  title?: string
  text: string
  upvote_count: number
  comment_count: number
  view_count: number
  report_count: number
  bookmark_count: number
  post_type: number
  author_uuid: string
  post_meta?: PostMeta
  topic?: string
  author_meta: AuthorMeta
  created_at: string
  updated_at: string
}

export interface PostMeta {
  platform?: 'ios' | 'android' | 'web'
  version?: number
  src?: string
  sensitive?: boolean
  media_type?: 'image' | 'video'
  poll?: string[]
  quote_post?: QuotePost
  // picks fields
  question?: string
  category?: string
  polymarket_market_id?: string
  polymarket_clob_id?: string
  condition_id?: string
  resolution_deadline?: string
  consensus_percent?: number
  resolution_status?: 'open' | 'resolved'
  correct_answer?: string | null
  price_history?: PriceHistoryPoint[]
  // transaction post (post_type 8)
  transaction?: { uuid: string }
  merchant?: string
  date?: string
  transactionValue?: number
  currencyCode?: string
  gradient?: string
  categoryIconUrl?: string
  // link post (post_type 1)
  link?: string
  // gif
  giphy_url?: string
  giphy_id?: string
}

export interface Post {
  uuid: string
  created_at: string
  updated_at: string
  author_uuid: string
  upvote_count: number
  comment_count: number
  view_count: number
  report_count: number
  title: string
  text: string
  topic: string
  author_meta: AuthorMeta
  post_meta: PostMeta
  post_type: number // 0=text, 2=poll, 3=quote, 4=image, 7=picks
  deleted_at: string | null
  bookmark_count: number
}

export interface Vote {
  uuid: string
  created_at: string
  updated_at: string
  author_uuid: string
  content_uuid: string
  vote_type: 1 | -1 | 0
}

export interface View {
  uuid: string
  created_at: string
  updated_at: string
  user_uuid: string
  content_uuid: string
}

export interface PollVote {
  uuid: string
  created_at: string
  updated_at: string
  author_uuid: string
  author_balance: string
  post_uuid: string
  option: number
}

export interface PickVote {
  uuid: string
  user_uuid: string
  post_uuid: string
  vote: 'yes' | 'no'
  author_balance: string
  author_elo: number
  current_market_probability: string | null
  correct: boolean | null
  created_at: string
}

export interface PicksResultsResponse {
  results: {
    yes: { votes: number; average_balance: number }
    no: { votes: number; average_balance: number }
    total_votes: number
    yes_percent: number
    no_percent: number
  }
  resolution_status: 'open' | 'resolved'
  correct_answer: string | null
  market_closed_at: string | null
}

export interface LikertVote {
  uuid: string
  created_at: string
  updated_at: string
  author_uuid: string
  post_uuid: string
  option: number
}

export interface Pagination {
  next_cursor: string | null
  has_more: boolean
}

export interface ArenaResponse {
  posts: Post[]
  votes: Vote[]
  views: View[]
  polls: PollVote[]
  likertVotes: LikertVote[]
  pickVotes: PickVote[]
  pagination: Pagination
}

// ── Comments ──

export interface Comment {
  uuid: string
  created_at: string
  updated_at: string
  post_uuid: string
  reply_parent_uuid: string
  author_uuid: string
  author_meta: AuthorMeta & { pick_user_vote?: string | null }
  comment_meta: Record<string, unknown>
  text: string
  upvote_count: number
  report_count: number
  deleted_at: string | null
}

export interface CommentsResponse {
  comments: Comment[]
  votes: Vote[]
  postTitles: Record<string, string>
}

// ── Notifications ──

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

export interface NotificationMeta {
  post_uuid?: string
  comment_uuid?: string
  campaign_uuid?: string
  follower_uuid?: string
  kind?: string
  elo_tier?: string
  previous_balance?: number
  new_balance?: number
}

export interface ApiNotification {
  uuid: string
  created_at: string
  user_uuid: string
  type: NotificationType
  message: string
  read_at: string | null
  notification_meta: NotificationMeta
}

export interface NotificationsResponse {
  notifications: ApiNotification[]
}

export interface MarkReadResponse {
  message: string
}

// ── Rooms & DMs ──

export interface ApiRoomRequirement {
  uuid: string
  humanReadableRequirement: string
  met: boolean
}

export interface ApiRoomStats {
  lastMessageTimestamp: string | null
  lastMessage?: string
  totalMessages: number
  averageBalance: number
  onlineCount: number
}

export interface ApiRoomMember {
  uuid: string
  user_uuid: string
  joined_at: string
  left_at: string | null
  balance: string
  subscription_type: number
  age: number
  gender: string
  arena: string
  is_online: boolean
  alias: string | null
  systemAlias?: string | null
}

export interface ApiRoom {
  uuid: string
  created_at: string
  updated_at: string
  name: string
  created_by: string
  is_private: boolean
  room_type: 'room' | 'dm'
  description: string | null
  room_code: string | null
  enforce_requirements: boolean
  gradients: string[]
  memberCount: number
  joinedAt?: string
  requirements: ApiRoomRequirement[]
  members?: ApiRoomMember[]
  whitelist?: string[]
  stats: ApiRoomStats
  missedMessages: number
  mute: boolean
}

export interface ListRoomsResponse {
  rooms: ApiRoom[]
}

export interface GetRoomResponse {
  room: ApiRoom & { member_count: number }
}

export interface GetMembersResponse {
  members: ApiRoomMember[]
}

export interface ApiMessageAuthorMeta {
  bio?: string
  age: number
  gender: string
  balance: number
  arena: string
  subscription_type: number
}

export interface ApiMessage {
  uuid: string
  created_at: string
  room_uuid: string
  author_uuid: string
  text: string
  role: string
  reply_to_message_uuid: string | null
  author_meta: ApiMessageAuthorMeta
  message_meta: Record<string, unknown>
  giphy_id?: string
  giphy_url?: string
  deleted_at: string | null
  replyMessageText: string | null
  isBookmarked: boolean
}

export interface ApiReaction {
  uuid: string
  author_uuid: string
  text: string
  message_uuid: string
}

export interface GetMessagesResponse {
  messages: ApiMessage[]
  reactions: ApiReaction[]
  bookmarks: unknown[]
  missedMessages: number
  replyMessages: unknown[]
}

// ── Feed request params ──

/* ── Leaderboard ──────────────────────────────────────────── */

export interface ApiLeaderboardEntry {
  uuid: string
  balance: string
  bio?: string
  age?: number
  gender?: string
  arena?: string
  subscription_type?: number
  /** Present on ranked boards (Elo, Biggest Losses, etc.) */
  rank?: string
  /** ELO score, gain/loss amount, etc. */
  points?: string | number
  /** Present on top100 board */
  created_at?: string
  disabled?: number
  signup_platform?: string
}

export interface LeaderboardResponse {
  leaderboard: ApiLeaderboardEntry[]
}

/** Personal leaderboard block returned by `/v2/auth/login` */
export interface AuthLoginLeaderboard {
  myPosition: number
  totalPositions: number
  nextUpdatedAt: number
  top100: ApiLeaderboardEntry[]
}

export interface AuthLoginResponse {
  leaderboard?: AuthLoginLeaderboard
  [key: string]: unknown
}

/** Cached personal-rank shape (no top100, that's seeded into the leaderboard cache) */
export interface MyLeaderboardPosition {
  myPosition: number
  totalPositions: number
  nextUpdatedAt: number
}

/* ── User Profile ─────────────────────────────────────────── */

export interface ApiUserProfile {
  uuid: string
  created_at: string
  updated_at: string
  disabled: number
  balance: number
  bio?: string
  age?: number
  gender?: string
  arena?: string
  subscription_type: number
  delta_balance: string
  role?: string
  elo_rating: number
}

export interface BalanceHistoryPoint {
  balance: number
  date: string
}

export interface UserProfileResponse {
  user: ApiUserProfile
  balanceHistory: BalanceHistoryPoint[]
  totalUpvotes: number
  recentPosts: {
    posts: Post[]
    votes: Vote[]
    views: View[]
    polls: PollVote[]
    likertVotes: LikertVote[]
    pickVotes: PickVote[]
  }
  recentComments: {
    comments: Comment[]
    votes: Vote[]
    postTitles: Record<string, string>
  }
  votedPosts?: {
    posts: Post[]
    votes: Vote[]
  }
  pickPostsVotes?: {
    posts: Post[]
    votes: Vote[]
    pickVotes?: PickVote[]
  }
  aliasesGiven: number
  aliasesReceived: number
  pagination: {
    nextPostCursor: string | null
    nextCommentCursor: string | null
    nextVotedPostCursor: string | null
    nextPickVoteCursor: string | null
    hasMorePosts: boolean
    hasMoreComments: boolean
    hasMoreVotedPosts: boolean
    hasMorePickVotes: boolean
  }
}

export interface BookmarksResponse {
  posts: Post[]
  votes: Vote[]
  views: View[]
  polls: PollVote[]
  likertVotes: LikertVote[]
  pickVotes: PickVote[]
}

export type FeedFilter =
  | 'chronological'
  | 'controversial'
  | 'controversialThisWeek'
  | 'topToday'
  | 'topAllTime'
  | 'newToday'
  | 'verifiedOnly'

export interface ArenaParams {
  sort_dir: 'desc' | 'asc'
  filter: FeedFilter
  topic?: string
  cursor?: string
  q?: string
  min_balance?: number
  max_balance?: number
  votes_min?: number
  votes_max?: number
  age?: number
  genders?: string[]
  locations?: string[]
  countries?: string[]
  cities?: string[]
  has_image?: boolean
  has_poll?: boolean
  sort_by?: string
  author_uuid?: string
  subscription_type?: number
  media_type?: 'image' | 'video'
}
