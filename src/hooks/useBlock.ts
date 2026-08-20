import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'

const LOCAL_BLOCKED_KEY = '2c_local_blocked_uuids'

let inMemoryBlockedSet: Set<string> | null = null

function getLocalBlockedSet(): Set<string> {
  if (inMemoryBlockedSet) return inMemoryBlockedSet
  try {
    const raw = localStorage.getItem(LOCAL_BLOCKED_KEY)
    const arr: string[] = raw ? JSON.parse(raw) : []
    inMemoryBlockedSet = new Set(arr.map((u) => u.toLowerCase()))
  } catch {
    inMemoryBlockedSet = new Set()
  }
  return inMemoryBlockedSet
}

function addLocalBlocked(uuid: string) {
  try {
    const set = getLocalBlockedSet()
    set.add(uuid.toLowerCase())
    localStorage.setItem(LOCAL_BLOCKED_KEY, JSON.stringify(Array.from(set)))
  } catch { /* ignore */ }
}

function removeLocalBlocked(uuid: string) {
  try {
    const set = getLocalBlockedSet()
    set.delete(uuid.toLowerCase())
    localStorage.setItem(LOCAL_BLOCKED_KEY, JSON.stringify(Array.from(set)))
  } catch { /* ignore */ }
}

// ── Blocked Users List Interface ──

export interface BlockedEntry {
  blocked_uuid: string
  user_uuid?: string
  uuid?: string
  reason?: string | null
  created_at?: string
}

export interface BlockedUsersResponseObj {
  blocked?: BlockedEntry[]
  blocked_users?: BlockedEntry[]
  users?: BlockedEntry[]
  data?: BlockedEntry[]
}

export type BlockedResponse =
  | BlockedUsersResponseObj
  | BlockedEntry[]
  | string[]

// ── Blocked Users List Query ──

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
    staleTime: 30_000,
  })
}

// ── Helper Hook: Is Target User Blocked? ──

export function useIsBlocked(targetUuid: string | undefined): boolean {
  const { data } = useBlockedUsers()
  if (!targetUuid) return false

  const cleanTarget = targetUuid.trim().toLowerCase()

  // 1. Instant check in memory (no disk I/O)
  if (getLocalBlockedSet().has(cleanTarget)) {
    return true
  }

  // 2. Check query data across possible API payload structures
  if (!data) return false

  if (Array.isArray(data)) {
    return data.some((item) => {
      const u = typeof item === 'string'
        ? item
        : item?.blocked_uuid || item?.user_uuid || item?.uuid || ''
      return u.trim().toLowerCase() === cleanTarget
    })
  }

  const obj = data as BlockedUsersResponseObj
  const list = obj.blocked || obj.blocked_users || obj.users || obj.data || []
  return list.some((item) => {
    const u = item?.blocked_uuid || item?.user_uuid || item?.uuid || ''
    return u.trim().toLowerCase() === cleanTarget
  })
}

// ── Block Mutation ──

export function useBlockUser() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (blocked_uuid: string) => {
      addLocalBlocked(blocked_uuid)
      return rpc<{ message: string }>(
        '/v1/users/block',
        { blocked_uuid },
        auth!.token,
        auth!.userUuid,
      )
    },
    onMutate: async (blocked_uuid) => {
      await queryClient.cancelQueries({ queryKey: ['blockedUsers'] })
      const previous = queryClient.getQueryData<BlockedResponse>(['blockedUsers'])
      addLocalBlocked(blocked_uuid)
      return { previous }
    },
    onError: (_err, blocked_uuid, context) => {
      removeLocalBlocked(blocked_uuid)
      if (context?.previous) {
        queryClient.setQueryData(['blockedUsers'], context.previous)
      }
    },
    onSuccess: (_data, blocked_uuid) => {
      addLocalBlocked(blocked_uuid)
      queryClient.setQueryData<BlockedResponse>(['blockedUsers'], (prev) => {
        if (!prev) return { blocked: [{ blocked_uuid }] }
        if (Array.isArray(prev)) {
          if (prev.length > 0 && typeof prev[0] === 'string') {
            return [...(prev as string[]), blocked_uuid]
          }
          return [...(prev as BlockedEntry[]), { blocked_uuid }]
        }
        const obj = prev as BlockedUsersResponseObj
        const existing = obj.blocked || obj.blocked_users || []
        return { ...obj, blocked: [...existing, { blocked_uuid }] }
      })
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
    },
  })
}

// ── Unblock Mutation ──

export function useUnblockUser() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (blocked_uuid: string) => {
      removeLocalBlocked(blocked_uuid)
      return rpc<{ message: string }>(
        '/v1/users/unblock',
        { blocked_uuid },
        auth!.token,
        auth!.userUuid,
      )
    },
    onMutate: async (blocked_uuid) => {
      await queryClient.cancelQueries({ queryKey: ['blockedUsers'] })
      const previous = queryClient.getQueryData<BlockedResponse>(['blockedUsers'])
      removeLocalBlocked(blocked_uuid)
      return { previous }
    },
    onError: (_err, blocked_uuid, context) => {
      addLocalBlocked(blocked_uuid)
      if (context?.previous) {
        queryClient.setQueryData(['blockedUsers'], context.previous)
      }
    },
    onSuccess: (_data, blocked_uuid) => {
      removeLocalBlocked(blocked_uuid)
      queryClient.setQueryData<BlockedResponse>(['blockedUsers'], (prev) => {
        if (!prev) return { blocked: [] }
        if (Array.isArray(prev)) {
          if (prev.length > 0 && typeof prev[0] === 'string') {
            return (prev as string[]).filter((item) => item !== blocked_uuid)
          }
          return (prev as BlockedEntry[]).filter(
            (item) => (item.blocked_uuid || item.user_uuid || item.uuid) !== blocked_uuid
          )
        }
        const obj = prev as BlockedUsersResponseObj
        const existing = obj.blocked || obj.blocked_users || []
        return { ...obj, blocked: existing.filter((b) => (b.blocked_uuid || b.user_uuid || b.uuid) !== blocked_uuid) }
      })
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
    },
  })
}

// ── Unblock From List Mutation ──

export function useUnblockFromList() {
  return useUnblockUser()
}

