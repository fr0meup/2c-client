import { useCallback } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'
import { TOPIC_TO_API } from '@/hooks/useFeed'
import { BOARD_API_NAME, mapEntry } from '@/hooks/useLeaderboard'
import type { ArenaResponse, LeaderboardResponse, UserProfileResponse, CommentsResponse, GetMessagesResponse } from '@/lib/types'
import type { BookmarksResponse, ListRoomsResponse, NotificationsResponse } from '@/lib/types'
import type { PostResponse } from '@/hooks/usePost'
import type { LeaderboardType } from '@/components/leaderboard/config'

/**
 * 10 s staleTime → won't re-fetch the same key if data is < 10 s old.
 * Each unique key (post, room, user) gets its own cooldown.
 */
const PREFETCH_STALE = 10_000

function shouldPrefetch(qc: ReturnType<typeof useQueryClient>, queryKey: QueryKey, staleTime = PREFETCH_STALE) {
  const state = qc.getQueryState(queryKey)
  if (state?.fetchStatus === 'fetching') return false
  if (!state?.dataUpdatedAt) return true
  return Date.now() - state.dataUpdatedAt > staleTime
}

export function usePrefetch() {
  const qc = useQueryClient()
  const { auth } = useAuth()

  // ── Feed (infinite query) ─────────────────────────────────────────
  // Matches useFeed(topic) with default args: searchQuery='', advanced={}, jumpCursor=''
  const prefetchFeed = useCallback(
    (topic = 'New') => {
      if (!auth) return
      const apiTopic = TOPIC_TO_API[topic]
      const queryKey = ['feed', topic, '', {}, '']
      if (!shouldPrefetch(qc, queryKey, 30_000)) return
      qc.prefetchInfiniteQuery({
        queryKey,
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
      const queryKey = ['leaderboard', board]
      if (!shouldPrefetch(qc, queryKey, 60_000)) return
      qc.prefetchQuery({
        queryKey,
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
      const queryKey = ['userProfile', userUuid]
      if (!shouldPrefetch(qc, queryKey, 60_000)) return
      qc.prefetchInfiniteQuery({
        queryKey,
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
      const queryKey = ['comments', postUuid]
      if (!shouldPrefetch(qc, queryKey, 30_000)) return
      qc.prefetchQuery({
        queryKey,
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

  const prefetchPost = useCallback(
    (postUuid: string) => {
      if (!auth || !postUuid) return
      const queryKey = ['post', postUuid]
      if (!shouldPrefetch(qc, queryKey, 30_000)) return
      qc.prefetchQuery({
        queryKey,
        queryFn: ({ signal }) =>
          rpc<PostResponse>(
            '/v1/posts/get',
            { post_uuid: postUuid },
            auth.token,
            auth.userUuid,
            signal,
          ),
        staleTime: 30_000,
      })
    },
    [auth, qc],
  )

  // ── Room / DM messages ────────────────────────────────────────────
  // Matches useRoomMessages(roomUuid)
  const prefetchMessages = useCallback(
    (roomUuid: string) => {
      if (!auth || !roomUuid) return
      const queryKey = ['rooms', 'messages', roomUuid]
      if (!shouldPrefetch(qc, queryKey, 20_000)) return
      qc.prefetchQuery({
        queryKey,
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

  const prefetchRooms = useCallback(() => {
    if (!auth) return
    const userKey = ['rooms', 'user']
    const dmKey = ['rooms', 'dms']
    if (shouldPrefetch(qc, userKey, 30_000)) {
      qc.prefetchQuery({
        queryKey: userKey,
        queryFn: ({ signal }) =>
          rpc<ListRoomsResponse>('/v2/rooms/listUserRooms', {}, auth.token, auth.userUuid, signal),
        staleTime: 30_000,
      })
    }
    if (shouldPrefetch(qc, dmKey, 30_000)) {
      qc.prefetchQuery({
        queryKey: dmKey,
        queryFn: ({ signal }) =>
          rpc<ListRoomsResponse>('/v2/rooms/listUserDMs', {}, auth.token, auth.userUuid, signal),
        staleTime: 30_000,
      })
    }
  }, [auth, qc])

  const prefetchNotifications = useCallback(() => {
    if (!auth) return
    const queryKey = ['notifications']
    if (!shouldPrefetch(qc, queryKey, 15_000)) return
    qc.prefetchQuery({
      queryKey,
      queryFn: ({ signal }) =>
        rpc<NotificationsResponse>('/v1/notifications/get', {}, auth.token, auth.userUuid, signal),
      staleTime: 15_000,
    })
  }, [auth, qc])

  const prefetchBookmarks = useCallback(() => {
    if (!auth) return
    const queryKey = ['bookmarks']
    if (!shouldPrefetch(qc, queryKey, 60_000)) return
    qc.prefetchQuery({
      queryKey,
      queryFn: ({ signal }) =>
        rpc<BookmarksResponse>('/v1/bookmarks/all', {}, auth.token, auth.userUuid, signal),
      staleTime: 60_000,
    })
  }, [auth, qc])

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
    prefetchPost,
    prefetchMessages,
    prefetchMyProfile,
    prefetchRooms,
    prefetchNotifications,
    prefetchBookmarks,
  }
}
