import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'
import { TOPIC_TO_API } from '@/hooks/useFeed'
import { BOARD_API_NAME, mapEntry } from '@/hooks/useLeaderboard'
import type { ArenaResponse, LeaderboardResponse, UserProfileResponse, CommentsResponse, GetMessagesResponse } from '@/lib/types'
import type { LeaderboardType } from '@/components/leaderboard/types'

/**
 * 10 s staleTime → won't re-fetch the same key if data is < 10 s old.
 * Each unique key (post, room, user) gets its own cooldown.
 */
const PREFETCH_STALE = 10_000

export function usePrefetch() {
  const qc = useQueryClient()
  const { auth } = useAuth()

  // ── Feed (infinite query) ─────────────────────────────────────────
  // Matches useFeed(topic) with default args: searchQuery='', advanced={}, jumpCursor=''
  const prefetchFeed = useCallback(
    (topic = 'New') => {
      if (!auth) return
      const apiTopic = TOPIC_TO_API[topic]
      qc.prefetchInfiniteQuery({
        queryKey: ['feed', topic, '', {}, ''],
        queryFn: ({ pageParam, signal }) => {
          const params: Record<string, unknown> = { sort_dir: 'desc', filter: 'chronological' }
          if (apiTopic) params.topic = apiTopic
          if (pageParam) params.cursor = pageParam
          return rpc<ArenaResponse>('/v2/posts/arena', params, auth.token, auth.userUuid, signal)
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: ArenaResponse) =>
          lastPage.pagination.has_more ? (lastPage.pagination.next_cursor ?? undefined) : undefined,
        staleTime: PREFETCH_STALE,
      })
    },
    [auth, qc],
  )

  // ── Leaderboard ───────────────────────────────────────────────────
  // Matches useLeaderboardData(board) — same queryKey + mapEntry transform
  const prefetchLeaderboard = useCallback(
    (board: LeaderboardType = 'ppe') => {
      if (!auth) return
      const apiName = BOARD_API_NAME[board]
      qc.prefetchQuery({
        queryKey: ['leaderboard', board],
        queryFn: async ({ signal }) => {
          const res = await rpc<LeaderboardResponse>(
            '/v1/leaderboard/get',
            { name: apiName },
            auth.token,
            auth.userUuid,
            signal,
          )
          return res.leaderboard.map((e) => mapEntry(e, board))
        },
        staleTime: PREFETCH_STALE,
      })
    },
    [auth, qc],
  )

  // ── User profile (infinite query) ─────────────────────────────────
  // Matches useUserProfile(userUuid)
  const prefetchUserProfile = useCallback(
    (userUuid: string) => {
      if (!auth || !userUuid) return
      qc.prefetchInfiniteQuery({
        queryKey: ['userProfile', userUuid],
        queryFn: ({ signal }) =>
          rpc<UserProfileResponse>(
            '/v2/users/get',
            {
              user_uuid: userUuid,
              posts_limit: 100,
              comments_limit: 100,
              voted_posts_limit: 100,
              pick_votes_limit: 100,
            },
            auth.token,
            auth.userUuid,
            signal,
          ),
        initialPageParam: {} as Record<string, unknown>,
        getNextPageParam: (lastPage: UserProfileResponse) => {
          const p = lastPage.pagination
          const hasMore = p.hasMorePosts || p.hasMoreComments
          if (!hasMore) return undefined
          return {
            postCursor: p.hasMorePosts ? (p.nextPostCursor ?? undefined) : undefined,
            commentCursor: p.hasMoreComments ? (p.nextCommentCursor ?? undefined) : undefined,
          }
        },
        staleTime: PREFETCH_STALE,
      })
    },
    [auth, qc],
  )

  // ── Comments ──────────────────────────────────────────────────────
  // Matches useComments(postUuid)
  const prefetchComments = useCallback(
    (postUuid: string) => {
      if (!auth || !postUuid) return
      qc.prefetchQuery({
        queryKey: ['comments', postUuid],
        queryFn: ({ signal }) =>
          rpc<CommentsResponse>(
            '/v1/comments/get',
            { post_uuid: postUuid },
            auth.token,
            auth.userUuid,
            signal,
          ),
        staleTime: PREFETCH_STALE,
      })
    },
    [auth, qc],
  )

  // ── Room / DM messages ────────────────────────────────────────────
  // Matches useRoomMessages(roomUuid)
  const prefetchMessages = useCallback(
    (roomUuid: string) => {
      if (!auth || !roomUuid) return
      qc.prefetchQuery({
        queryKey: ['rooms', 'messages', roomUuid],
        queryFn: ({ signal }) =>
          rpc<GetMessagesResponse>(
            '/v1/rooms/getMessages',
            { roomUuid, offset: 0, limit: 500 },
            auth.token,
            auth.userUuid,
            signal,
          ),
        staleTime: PREFETCH_STALE,
      })
    },
    [auth, qc],
  )

  // ── Own profile shortcut ──────────────────────────────────────────
  const prefetchMyProfile = useCallback(() => {
    if (!auth) return
    prefetchUserProfile(auth.userUuid)
  }, [auth, prefetchUserProfile])

  return {
    prefetchFeed,
    prefetchLeaderboard,
    prefetchUserProfile,
    prefetchComments,
    prefetchMessages,
    prefetchMyProfile,
  }
}
