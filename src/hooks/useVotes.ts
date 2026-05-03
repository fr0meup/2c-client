import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'

// ── Vote Comment ──

interface VoteCommentParams {
  comment_uuid: string
  post_uuid: string
  vote_type: 1 | -1 | 0
}

interface VoteCommentResponse {
  message: string
}

export function useVoteComment() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: VoteCommentParams) => {
      if (!auth) throw new Error('Not authenticated')

      return rpc<VoteCommentResponse>(
        '/v1/comments/vote',
        {
          comment_uuid: params.comment_uuid,
          post_uuid: params.post_uuid,
          vote_type: params.vote_type,
        },
        auth.token,
        auth.userUuid
      )
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.post_uuid] })
    },
  })
}

// ── Vote Likert ──

interface VoteLikertParams {
  postUuid: string
  option: number
}

export function useVoteLikert() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: VoteLikertParams) => {
      if (!auth) throw new Error('Not authenticated')

      return rpc<{ message: string }>(
        '/v1/likert/vote',
        { postUuid: params.postUuid, option: params.option },
        auth.token,
        auth.userUuid
      )
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['likertResults', variables.postUuid] })
      queryClient.invalidateQueries({ queryKey: ['post', variables.postUuid] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

// ── Vote Poll ──

interface VotePollParams {
  post_uuid: string
  option: number
}

export function useVotePoll() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: VotePollParams) => {
      if (!auth) throw new Error('Not authenticated')

      return rpc<{ message: string }>(
        '/v1/polls/vote',
        { post_uuid: params.post_uuid, option: params.option },
        auth.token,
        auth.userUuid
      )
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pollResults', variables.post_uuid] })
      queryClient.invalidateQueries({ queryKey: ['post', variables.post_uuid] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

// ── Vote Pick ──

interface VotePickParams {
  post_uuid: string
  vote_type: 0 | 1 // 0 = yes, 1 = no
}

export function useVotePick() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: VotePickParams) => {
      if (!auth) throw new Error('Not authenticated')

      const vote = params.vote_type === 0 ? 'yes' : 'no'

      const [postVote] = await Promise.all([
        rpc<{ message: string }>(
          '/v1/posts/vote',
          { post_uuid: params.post_uuid, vote_type: params.vote_type },
          auth.token,
          auth.userUuid
        ),
        rpc<{ message: string }>(
          '/v1/picks/vote',
          { post_uuid: params.post_uuid, vote },
          auth.token,
          auth.userUuid
        ),
      ])

      return postVote
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['picksResults', variables.post_uuid] })
      queryClient.invalidateQueries({ queryKey: ['post', variables.post_uuid] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}
