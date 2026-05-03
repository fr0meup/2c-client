import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'

// ── Set / Unset Alias (Follow) ──

interface SetAliasParams {
  for_uuid: string
  alias?: string
}

export function useSetAlias() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ for_uuid, alias = 'anon' }: SetAliasParams) => {
      return rpc<{ message: string }>(
        '/v1/aliases/set',
        { for_uuid, alias },
        auth!.token,
        auth!.userUuid,
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAliases'] })
    },
  })
}

export function useUnsetAlias() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (for_uuid: string) => {
      return rpc<{ message: string }>(
        '/v1/aliases/unset',
        { for_uuid },
        auth!.token,
        auth!.userUuid,
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAliases'] })
    },
  })
}

// ── Follows Me ──

interface HasMeResponse {
  hasAlias: boolean
}

export function useFollowsMe(authorUuid: string | undefined) {
  const { auth } = useAuth()

  return useQuery<HasMeResponse>({
    queryKey: ['followsMe', authorUuid],
    queryFn: ({ signal }) =>
      rpc<HasMeResponse>(
        '/v1/aliases/hasMe',
        { authorUUID: authorUuid },
        auth!.token,
        auth!.userUuid,
        signal,
      ),
    enabled: !!auth?.token && !!authorUuid && authorUuid !== auth?.userUuid,
    staleTime: 60_000,
  })
}

// ── My Aliases ──

interface AliasUser {
  uuid: string
  balance: number
  bio?: string
  age?: number
  gender?: string
  arena?: string
  subscription_type: number
  elo_rating: number
  role?: string
}

export interface Alias {
  uuid: string
  author_uuid: string
  for_uuid: string
  created_at: string
  updated_at: string
  alias: string
  user: AliasUser
}

interface AliasesResponse {
  aliases: Alias[]
}

export function useMyAliases() {
  const { auth } = useAuth()

  return useQuery<AliasesResponse>({
    queryKey: ['myAliases'],
    queryFn: ({ signal }) =>
      rpc<AliasesResponse>(
        '/v1/aliases/get',
        {},
        auth!.token,
        auth!.userUuid,
        signal,
      ),
    enabled: !!auth?.token,
    staleTime: 60_000,
  })
}
