import { Podium } from './Podium'
import { LeaderboardList } from './LeaderboardList'
import { LEADERBOARD_META } from './config'
import { useLeaderboard } from './LeaderboardContext'
import { useLeaderboardData } from '@/hooks/useLeaderboard'
import { LeaderboardContentSkeleton } from '@/components/skeleton'

export function LeaderboardPage() {
  const { board } = useLeaderboard()
  const meta = LEADERBOARD_META.find((m) => m.value === board)!
  const { data: entries = [], isLoading, isError } = useLeaderboardData(board)
  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="flex w-full max-w-[670px] flex-col gap-4 xl:-ml-[245px]">
        {isLoading ? (
          <LeaderboardContentSkeleton />
        ) : isError ? (
          <p className="py-20 text-center text-sm text-white/40">Failed to load leaderboard</p>
        ) : entries.length === 0 ? (
          <p className="py-20 text-center text-sm text-white/40">No entries yet</p>
        ) : (
          <>
            <Podium entries={top3} meta={meta} />
            <LeaderboardList entries={rest} meta={meta} />
          </>
        )}
      </div>
    </div>
  )
}
