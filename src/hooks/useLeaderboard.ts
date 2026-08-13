import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'
import type { LeaderboardResponse } from '@/lib/types'
import type { LeaderboardType, LeaderboardEntry } from '@/components/leaderboard/config'

/** Map UI board type → API param name */
export const BOARD_API_NAME: Record<LeaderboardType, string> = {
  top_100: 'top100',
  highest_debt: 'highestDebt',
  biggest_gains: 'Biggest Gains',
  biggest_losses: 'Biggest Losses',
}

/** Convert an API leaderboard entry to the UI LeaderboardEntry shape */
export function mapEntry(
  e: LeaderboardResponse['leaderboard'][number],
  boardType: LeaderboardType,
): LeaderboardEntry {
  const balance = Number(e.balance) || 0
  const points = e.points != null ? Number(e.points) : undefined

  // For boards with extra stats, map `points` → `extra_stat`
  // For top_100, there's no extra stat
  let extra_stat: number | undefined
  if (boardType !== 'top_100' && points != null) {
    extra_stat = boardType === 'biggest_losses' ? Math.abs(points) : points
  }

  return {
    uuid: e.uuid,
    balance,
    subscription_type: e.subscription_type ?? 1,
    elo_rating: 0,
    gender: (e.gender as 'M' | 'F') ?? undefined,
    age: e.age,
    arena: e.arena,
    bio: e.bio,
    extra_stat,
  }
}

export function useLeaderboardData(board: LeaderboardType) {
  const { auth } = useAuth()
  const apiName = BOARD_API_NAME[board]

  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', board],
    queryFn: async ({ signal }) => {
      const res = await rpc<LeaderboardResponse>(
        '/v1/leaderboard/get',
        { name: apiName },
        auth!.token,
        auth!.userUuid,
        signal,
      )
      return res.leaderboard.map((e) => mapEntry(e, board))
    },
    enabled: !!auth?.token,
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnMount: 'always',
  })
}
