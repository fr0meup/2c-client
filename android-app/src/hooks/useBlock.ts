import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'

// ── Block / Unblock ──

export function useBlockUser() {
  const { auth } = useAuth()

  return useMutation({
    mutationFn: async (blocked_uuid: string) => {
      return rpc<{ message: string }>(
        '/v1/users/block',
        { blocked_uuid },
        auth!.token,
        auth!.userUuid,
      )
    },
  })
}

export function useUnblockUser() {
  const { auth } = useAuth()

  return useMutation({
    mutationFn: async (blocked_uuid: string) => {
      return rpc<{ message: string }>(
        '/v1/users/unblock',
        { blocked_uuid },
        auth!.token,
        auth!.userUuid,
      )
    },
  })
}

// ── Blocked Users List ──

export interface BlockedEntry {
  blocked_uuid: string
  reason: string | null
  created_at: string
}

interface BlockedResponse {
  blocked: BlockedEntry[]
}

export function useBlockedUsers() {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['blockedUsers'],
    queryFn: () =>
      rpc<BlockedResponse>(
        '/v1/users/blocked',
        { secret_key: auth!.secretKey },
        auth!.token,
        auth!.userUuid,
      ),
    enabled: !!auth,
    staleTime: 60_000,
  })
}

export function useUnblockFromList() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (blocked_uuid: string) =>
      rpc<{ message: string }>(
        '/v1/users/unblock',
        { blocked_uuid },
        auth!.token,
        auth!.userUuid,
      ),
    onSuccess: (_data, blocked_uuid) => {
      queryClient.setQueryData<BlockedResponse>(['blockedUsers'], (prev) => {
        if (!prev) return prev
        return { blocked: prev.blocked.filter((b) => b.blocked_uuid !== blocked_uuid) }
      })
    },
  })
}
