import { useQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Post, Vote, PollVote, PickVote } from '@/lib/types'

export interface PostResponse {
  post: Post
  votes: Vote[]
  polls?: PollVote[]
  pickVotes?: PickVote[]
}

export function usePost(postUuid: string | undefined) {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['post', postUuid],
    queryFn: async ({ signal }) => {
      if (!auth || !postUuid) throw new Error('Missing auth or post UUID')

      const res = await rpc<PostResponse>(
        '/v1/posts/get',
        { post_uuid: postUuid },
        auth.token,
        auth.userUuid,
        signal
      )
      return res
    },
    enabled: !!auth && !!postUuid,
    staleTime: 30_000,
  })
}
