export interface BalancePoint {
  balance: number
  date: string
}

export interface UserProfileData {
  uuid: string
  username?: string
  balance: number
  delta_balance?: number
  bio?: string
  age?: number
  gender?: 'M' | 'F'
  arena?: string
  subscription_type: number
  elo_rating: number
  role?: string
  created_at: string
  followers?: number
  following?: number
  upvotes_received: number
  balance_history: BalancePoint[]
}

export type ProfileTab = 'posts' | 'comments' | 'votes' | 'picks'
