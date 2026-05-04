import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { ArenaResponse, UserProfileResponse, BookmarksResponse, Vote } from '@/lib/types'
import type { PostResponse } from './usePost'

interface VoteParams {
  post_uuid: string
  vote_type: 1 | -1 | 0
}

interface VoteResponse {
  message: string
}

/** Patch a votes array + posts array for a given post_uuid / vote_type */
function patchVotesAndPosts<T extends { votes: Vote[]; posts: { uuid: string; upvote_count: number }[] }>(
  section: T,
  postUuid: string,
  voteType: 1 | -1 | 0,
): T {
  if (!section?.posts) return section
  const oldVote = (section.votes ?? []).find((v) => v.content_uuid === postUuid)
  const oldVoteType = oldVote?.vote_type ?? 0
  const delta = voteType - oldVoteType

  return {
    ...section,
    votes: [
      ...(section.votes ?? []).filter((v) => v.content_uuid !== postUuid),
      ...(voteType !== 0
        ? [{ ...oldVote, content_uuid: postUuid, vote_type: voteType } as Vote]
        : []),
    ],
    posts: (section.posts ?? []).map((p) =>
      p.uuid === postUuid ? { ...p, upvote_count: p.upvote_count + delta } : p,
    ),
  }
}

export function useVotePost() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: VoteParams) => {
      if (!auth) throw new Error('Not authenticated')

      return rpc<VoteResponse>(
        '/v1/posts/vote',
        { post_uuid: params.post_uuid, vote_type: params.vote_type },
        auth.token,
        auth.userUuid
      )
    },
    onMutate: (variables) => {
      const { post_uuid, vote_type } = variables

      // 1. Feed cache
      queryClient.setQueriesData<{ pages: ArenaResponse[] }>(
        { queryKey: ['feed'] },
        (old) => {
          if (!old?.pages) return old
          return { ...old, pages: old.pages.map((page) => patchVotesAndPosts(page as any, post_uuid, vote_type)) }
        }
      )

      // 2. Single-post cache (PostDetail)
      queryClient.setQueryData<PostResponse>(
        ['post', post_uuid],
        (old) => {
          if (!old) return old
          const oldVote = old.votes?.find((v) => v.content_uuid === post_uuid)
          const oldVoteType = oldVote?.vote_type ?? 0
          const delta = vote_type - oldVoteType
          return {
            ...old,
            post: { ...old.post, upvote_count: old.post.upvote_count + delta },
            votes: [
              ...old.votes.filter((v) => v.content_uuid !== post_uuid),
              ...(vote_type !== 0
                ? [{ ...oldVote, content_uuid: post_uuid, vote_type } as Vote]
                : []),
            ],
          }
        }
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
              recentPosts: patchVotesAndPosts(page.recentPosts as any, post_uuid, vote_type),
              ...(page.votedPosts ? { votedPosts: patchVotesAndPosts(page.votedPosts as any, post_uuid, vote_type) } : {}),
              ...(page.pickPostsVotes ? { pickPostsVotes: patchVotesAndPosts(page.pickPostsVotes as any, post_uuid, vote_type) } : {}),
            })),
          }
        }
      )

      // 4. Bookmarks cache
      queryClient.setQueryData<BookmarksResponse>(
        ['bookmarks'],
        (old) => {
          if (!old) return old
          return patchVotesAndPosts(old as any, post_uuid, vote_type)
        }
      )
    },
    onSuccess: (_data, variables) => {
      // Invalidate the single post query so comment_count / upvote_count stay fresh
      queryClient.invalidateQueries({ queryKey: ['post', variables.post_uuid] })
    },
  })
}
