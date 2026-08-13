import { createContext, createElement, useContext, useState, type ReactNode } from 'react'

export type LeaderboardType =
  | 'top_100'
  | 'highest_debt'
  | 'biggest_gains'
  | 'biggest_losses'

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
  extra_stat?: number
}

export interface LeaderboardMeta {
  value: LeaderboardType
  label: string
  has_extra: boolean
  extra_label?: string
}

interface LeaderboardContextValue {
  board: LeaderboardType
  setBoard: (board: LeaderboardType) => void
}

const LeaderboardContext = createContext<LeaderboardContextValue | null>(null)

export function LeaderboardProvider({ children }: { children: ReactNode }) {
  const [board, setBoard] = useState<LeaderboardType>('top_100')
  return createElement(LeaderboardContext.Provider, { value: { board, setBoard } }, children)
}

export function useLeaderboard(): LeaderboardContextValue {
  const ctx = useContext(LeaderboardContext)
  if (!ctx) throw new Error('useLeaderboard must be used within <LeaderboardProvider>')
  return ctx
}

export const LEADERBOARD_META: LeaderboardMeta[] = [
  { value: 'top_100', label: 'Top 100', has_extra: false },
  { value: 'highest_debt', label: 'Highest Debt', has_extra: true, extra_label: 'Debt' },
  { value: 'biggest_gains', label: 'Biggest Gains', has_extra: true, extra_label: 'Gain' },
  { value: 'biggest_losses', label: 'Biggest Losses', has_extra: true, extra_label: 'Loss' },
]
