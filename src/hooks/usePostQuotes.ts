import { useQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { PostCardData } from '@/components/post-card/types'

export interface PostQuotesResponse {
  posts: PostCardData[]
  votes?: { uuid?: string; content_uuid: string; vote_type: 1 | -1 | 0 }[]
  views?: { uuid?: string; content_uuid: string; user_uuid: string }[]
  polls?: { post_uuid: string; option: number }[]
  likertVotes?: { post_uuid: string; option: number }[]
  pickVotes?: { post_uuid: string; vote: 'yes' | 'no' }[]
  pagination?: {
    next_cursor?: string | null
    has_more?: boolean
  }
}

export function usePostQuotes(postUuid: string | undefined, enabled = true) {
  const { auth } = useAuth()

  return useQuery<PostQuotesResponse>({
    queryKey: ['postQuotes', postUuid],
    queryFn: async ({ signal }) => {
      if (!auth) throw new Error('Not authenticated')
      return rpc<PostQuotesResponse>(
        '/v2/posts/quotes',
        { post_uuid: postUuid },
        auth.token,
        auth.userUuid,
        signal,
      )
    },
    enabled: enabled && !!auth && !!postUuid,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  })
}
