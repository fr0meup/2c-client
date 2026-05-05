import { useQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { LikertOptionResult } from '@/components/post-card/LikertScale'
import type { PollOptionResult } from '@/components/post-card/PollCard'
import type { PicksResultsResponse } from '@/lib/types'

// ── Likert Results ──

interface ApiLikertResults {
  results: Record<string, { votes: number; averageBalance: number }>
  myVote?: number | null
}

export interface LikertData {
  results: Record<number, LikertOptionResult>
  myVote: number | null
}

export function useLikertResults(postUuid: string | undefined, enabled = true) {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['likertResults', postUuid],
    queryFn: async ({ signal }) => {
      if (!auth || !postUuid) throw new Error('Missing auth or post UUID')

      const res = await rpc<ApiLikertResults>(
        '/v1/likert/get',
        { postUuid },
        auth.token,
        auth.userUuid,
        signal
      )

      const mapped: Record<number, LikertOptionResult> = {}
      for (const [key, val] of Object.entries(res.results)) {
        mapped[Number(key)] = {
          votes: val.votes,
          avgBalance: val.averageBalance,
        }
      }
      return {
        results: mapped,
        myVote: res.myVote ?? null,
      } as LikertData
    },
    enabled: enabled && !!auth && !!postUuid,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

// ── Poll Results ──

interface ApiPollResults {
  results: Record<string, { votes: number; average_balance: number }>
}

export function usePollResults(postUuid: string | undefined, enabled = true) {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['pollResults', postUuid],
    queryFn: async ({ signal }) => {
      if (!auth || !postUuid) throw new Error('Missing auth or post UUID')

      const res = await rpc<ApiPollResults>(
        '/v1/polls/get',
        { post_uuid: postUuid },
        auth.token,
        auth.userUuid,
        signal
      )

      const mapped: Record<number, PollOptionResult> = {}
      for (const [key, val] of Object.entries(res.results)) {
        mapped[Number(key)] = {
          votes: val.votes,
          avgBalance: val.average_balance,
        }
      }
      return mapped
    },
    enabled: enabled && !!auth && !!postUuid,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

// ── Picks Results ──

export function usePicksResults(postUuid: string | undefined, enabled = true) {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['picksResults', postUuid],
    queryFn: async ({ signal }) => {
      if (!auth || !postUuid) throw new Error('Missing auth or post UUID')

      return rpc<PicksResultsResponse>(
        '/v1/picks/results',
        { post_uuid: postUuid },
        auth.token,
        auth.userUuid,
        signal
      )
    },
    enabled: enabled && !!auth && !!postUuid,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}
