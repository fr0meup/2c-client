import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { AuthLoginResponse, MyLeaderboardPosition } from '@/lib/types'
import { mapEntry } from '@/hooks/useLeaderboard'

export const MY_RANK_QUERY_KEY = ['myLeaderboardPosition'] as const

/**
 * Seed the React Query cache from a `/v2/auth/login` response.
 * - Caches the user's personal rank under `['myLeaderboardPosition']`.
 * - Pre-populates the Top 100 leaderboard cache so navigating there is instant.
 */
export function seedAuthLoginCache(qc: QueryClient, res: AuthLoginResponse | undefined): void {
  const lb = res?.leaderboard
  if (!lb) return

  const personal: MyLeaderboardPosition = {
    myPosition: lb.myPosition,
    totalPositions: lb.totalPositions,
    nextUpdatedAt: lb.nextUpdatedAt,
  }
  qc.setQueryData<MyLeaderboardPosition>(MY_RANK_QUERY_KEY, personal)

  if (Array.isArray(lb.top100) && lb.top100.length > 0) {
    qc.setQueryData(['leaderboard', 'top_100'], lb.top100.map((e) => mapEntry(e, 'top_100')))
  }
}

/** Read the cached personal rank (only ever populated for the logged-in user). */
export function useMyRank() {
  const qc = useQueryClient()
  return useQuery<MyLeaderboardPosition | null>({
    queryKey: MY_RANK_QUERY_KEY,
    queryFn: () => qc.getQueryData<MyLeaderboardPosition>(MY_RANK_QUERY_KEY) ?? null,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
