import { createContext, useContext, useState, type ReactNode } from 'react'
import type { LeaderboardType } from './types'

interface LeaderboardContextValue {
  board: LeaderboardType
  setBoard: (board: LeaderboardType) => void
}

const LeaderboardContext = createContext<LeaderboardContextValue | null>(null)

export function LeaderboardProvider({ children }: { children: ReactNode }) {
  const [board, setBoard] = useState<LeaderboardType>('ppe')

  return (
    <LeaderboardContext.Provider value={{ board, setBoard }}>
      {children}
    </LeaderboardContext.Provider>
  )
}

export function useLeaderboard(): LeaderboardContextValue {
  const ctx = useContext(LeaderboardContext)
  if (!ctx) throw new Error('useLeaderboard must be used within <LeaderboardProvider>')
  return ctx
}
