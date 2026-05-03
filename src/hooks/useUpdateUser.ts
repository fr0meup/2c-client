import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'

export interface UpdateUserParams {
  bio?: string
  age?: number
  gender?: string
  arena?: string
  balance?: number
}

interface UpdateUserResponse {
  message: string
}

export function useUpdateUser() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<UpdateUserResponse, Error, UpdateUserParams>({
    mutationFn: (params) =>
      rpc<UpdateUserResponse>(
        '/v1/users/update',
        params as Record<string, unknown>,
        auth!.token,
        auth!.userUuid,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', auth?.userUuid] })
    },
  })
}
