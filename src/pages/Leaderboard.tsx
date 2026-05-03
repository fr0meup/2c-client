import { LeaderboardPage } from '@/components/leaderboard'
import { usePageLoad, LeaderboardSkeleton } from '@/components/skeleton'

export function Leaderboard() {
  const loading = usePageLoad()

  if (loading) return <LeaderboardSkeleton />
  return <LeaderboardPage />
}
