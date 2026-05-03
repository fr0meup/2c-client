export type LeaderboardType =
  | 'ppe'
  | 'picks_szn'
  | 'top_100'
  | 'highest_debt'
  | 'credit_cards'
  | 'biggest_gains'
  | 'biggest_losses'
  | 'league'

export interface LeaderboardEntry {
  uuid: string
  balance: number
  subscription_type: number
  role?: string
  elo_rating: number
  gender?: 'M' | 'F'
  age?: number
  arena?: string
  bio?: string
  /** Extra stat value (ELO, debt, gain, etc.) displayed on certain boards */
  extra_stat?: number
}

export interface LeaderboardMeta {
  value: LeaderboardType
  label: string
  /** Whether this board shows an extra stat column */
  has_extra: boolean
  extra_label?: string
}
