import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Comment, CommentsResponse, ArenaResponse, UserProfileResponse, BookmarksResponse } from '@/lib/types'
import type { PostResponse } from './usePost'

export function useComments(postUuid: string | undefined) {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['comments', postUuid],
    queryFn: async ({ signal }) => {
      if (!auth || !postUuid) throw new Error('Missing auth or post UUID')

      return rpc<CommentsResponse>(
        '/v1/comments/get',
        { post_uuid: postUuid },
        auth.token,
        auth.userUuid,
        signal
      )
    },
    enabled: !!auth && !!postUuid,
    staleTime: 20_000,
  })
}

// ── Create Comment ──

interface CreateCommentParams {
  post_uuid: string
  text: string
  in_reply_to_uuid: string
  giphy_url?: string
  giphy_id?: string
}

interface CreateCommentResponse {
  comment: Comment
  message: string
}

/** Increment comment_count for a post across an array of posts */
function bumpCommentCount<T extends { uuid: string; comment_count: number }>(posts: T[], postUuid: string): T[] {
  return posts.map((p) => (p.uuid === postUuid ? { ...p, comment_count: p.comment_count + 1 } : p))
}

export function useCreateComment() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateCommentParams) => {
      if (!auth) throw new Error('Not authenticated')

      // Strip GIF URL from text when sending via comment_meta so OG client doesn't show the raw link
      const text = params.giphy_url
        ? params.text.replace(params.giphy_url, '').trim()
        : params.text

      return rpc<CreateCommentResponse>(
        '/v1/comments/create',
        {
          post_uuid: params.post_uuid,
          text: text || params.text,
          in_reply_to_uuid: params.in_reply_to_uuid,
          ...(params.giphy_url ? { giphy_url: params.giphy_url, giphy_id: params.giphy_id ?? params.giphy_url } : {}),
        },
        auth.token,
        auth.userUuid
      )
    },
    onMutate: (variables) => {
      const { post_uuid } = variables

      // 1. Feed cache
      queryClient.setQueriesData<{ pages: ArenaResponse[] }>(
        { queryKey: ['feed'] },
        (old) => {
          if (!old?.pages) return old
          return { ...old, pages: old.pages.map((page) => ({ ...page, posts: bumpCommentCount(page.posts, post_uuid) })) }
        }
      )

      // 2. Single-post cache
      queryClient.setQueryData<PostResponse>(
        ['post', post_uuid],
        (old) => old ? { ...old, post: { ...old.post, comment_count: old.post.comment_count + 1 } } : old
      )

      // 3. User-profile cache
      queryClient.setQueriesData<{ pages: UserProfileResponse[] }>(
        { queryKey: ['userProfile'] },
        (old) => {
          if (!old?.pages) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              recentPosts: { ...page.recentPosts, posts: bumpCommentCount(page.recentPosts.posts, post_uuid) },
              ...(page.votedPosts ? { votedPosts: { ...page.votedPosts, posts: bumpCommentCount(page.votedPosts.posts, post_uuid) } } : {}),
            })),
          }
        }
      )

      // 4. Bookmarks cache
      queryClient.setQueryData<BookmarksResponse>(
        ['bookmarks'],
        (old) => old ? { ...old, posts: bumpCommentCount(old.posts, post_uuid) } : old
      )
    },
    onSuccess: (_data, variables) => {
      // Refresh comments list
      queryClient.invalidateQueries({ queryKey: ['comments', variables.post_uuid] })
      // Refresh post to update comment_count
      queryClient.invalidateQueries({ queryKey: ['post', variables.post_uuid] })
    },
  })
}

// ── Delete Comment ──

interface DeleteCommentParams {
  comment_uuid: string
  post_uuid: string
}

interface DeleteCommentResponse {
  message: string
}

export function useDeleteComment() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: DeleteCommentParams) => {
      if (!auth) throw new Error('Not authenticated')

      return rpc<DeleteCommentResponse>(
        '/v1/comments/delete',
        { comment_uuid: params.comment_uuid },
        auth.token,
        auth.userUuid
      )
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.post_uuid] })
      queryClient.invalidateQueries({ queryKey: ['post', variables.post_uuid] })
    },
  })
}
