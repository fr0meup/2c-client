import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'
import type { UserProfileResponse } from '@/lib/types'

export interface ProfilePageParam {
  postCursor?: string
  commentCursor?: string
}

export function useUserProfile(userUuid: string | undefined) {
  const { auth } = useAuth()

  return useInfiniteQuery<UserProfileResponse, Error, { pages: UserProfileResponse[] }, string[], ProfilePageParam>({
    queryKey: ['userProfile', userUuid ?? ''],
    queryFn: async ({ pageParam, signal }) => {
      const params: Record<string, unknown> = {
        user_uuid: userUuid,
        posts_limit: 100,
        comments_limit: 100,
        voted_posts_limit: 100,
        pick_votes_limit: 100,
      }

      if (pageParam?.postCursor) {
        params.posts_cursor = pageParam.postCursor
      }
      if (pageParam?.commentCursor) {
        params.comments_cursor = pageParam.commentCursor
      }

      return rpc<UserProfileResponse>(
        '/v2/users/get',
        params,
        auth!.token,
        auth!.userUuid,
        signal,
      )
    },
    initialPageParam: {} as ProfilePageParam,
    getNextPageParam: (lastPage) => {
      const p = lastPage.pagination
      const hasMore = p.hasMorePosts || p.hasMoreComments
      if (!hasMore) return undefined
      return {
        postCursor: p.hasMorePosts ? (p.nextPostCursor ?? undefined) : undefined,
        commentCursor: p.hasMoreComments ? (p.nextCommentCursor ?? undefined) : undefined,
      }
    },
    enabled: !!auth?.token && !!userUuid,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}
