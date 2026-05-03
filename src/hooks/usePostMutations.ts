import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Post } from '@/lib/types'

// ── Create Post ──

interface CreatePostParams {
  title: string
  topic: string
  text: string
  post_type: number
  post_meta: Record<string, unknown>
}

interface CreatePostResponse {
  post: Post
  message: string
}

export function useCreatePost() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreatePostParams) => {
      if (!auth) throw new Error('Not authenticated')

      return rpc<CreatePostResponse>(
        '/v1/posts/create',
        {
          title: params.title,
          topic: params.topic,
          text: params.text,
          post_type: params.post_type,
          post_meta: params.post_meta,
        },
        auth.token,
        auth.userUuid
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

// ── Delete Post ──

interface DeletePostParams {
  post_uuid: string
}

interface DeletePostResponse {
  message: string
}

export function useDeletePost() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: DeletePostParams) => {
      if (!auth) throw new Error('Not authenticated')

      return rpc<DeletePostResponse>(
        '/v1/posts/delete',
        { post_uuid: params.post_uuid },
        auth.token,
        auth.userUuid
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}
