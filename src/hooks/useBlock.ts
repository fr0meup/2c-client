import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'

const LOCAL_BLOCKED_KEY = '2c_local_blocked_uuids'

function getLocalBlocked(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_BLOCKED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function addLocalBlocked(uuid: string) {
  try {
    const set = new Set(getLocalBlocked().map((u) => u.toLowerCase()))
    set.add(uuid.toLowerCase())
    localStorage.setItem(LOCAL_BLOCKED_KEY, JSON.stringify(Array.from(set)))
  } catch { /* ignore */ }
}

function removeLocalBlocked(uuid: string) {
  try {
    const set = new Set(getLocalBlocked().map((u) => u.toLowerCase()))
    set.delete(uuid.toLowerCase())
    localStorage.setItem(LOCAL_BLOCKED_KEY, JSON.stringify(Array.from(set)))
  } catch { /* ignore */ }
}

// ── Blocked Users List Interface ──

export interface BlockedEntry {
  blocked_uuid: string
  reason?: string | null
  created_at?: string
}

export type BlockedResponse =
  | { blocked?: BlockedEntry[]; blocked_users?: BlockedEntry[]; users?: BlockedEntry[]; data?: BlockedEntry[] }
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

  // 1. Check local storage first (instant synchronous check)
  const localList = getLocalBlocked()
  if (localList.some((u) => u.toLowerCase() === cleanTarget)) {
    return true
  }

  // 2. Check query data across all possible API payload structures
  if (!data) return false

  const list: any[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any).blocked)
      ? (data as any).blocked
      : Array.isArray((data as any).blocked_users)
        ? (data as any).blocked_users
        : Array.isArray((data as any).users)
          ? (data as any).users
          : Array.isArray((data as any).data)
            ? (data as any).data
            : []

  return list.some((item) => {
    const uuid = (
      typeof item === 'string'
        ? item
        : item?.blocked_uuid || item?.user_uuid || item?.uuid || ''
    ).trim().toLowerCase()

    if (!uuid) return false
    return uuid === cleanTarget
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
    onMutate: (blocked_uuid) => {
      addLocalBlocked(blocked_uuid)
    },
    onSuccess: (_data, blocked_uuid) => {
      addLocalBlocked(blocked_uuid)
      queryClient.setQueryData<any>(['blockedUsers'], (prev: any) => {
        if (!prev) return { blocked: [{ blocked_uuid }] }
        if (Array.isArray(prev)) return [...prev, { blocked_uuid }]
        const existing = prev.blocked || prev.blocked_users || []
        return { ...prev, blocked: [...existing, { blocked_uuid }] }
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
    onMutate: (blocked_uuid) => {
      removeLocalBlocked(blocked_uuid)
    },
    onSuccess: (_data, blocked_uuid) => {
      removeLocalBlocked(blocked_uuid)
      queryClient.setQueryData<any>(['blockedUsers'], (prev: any) => {
        if (!prev) return { blocked: [] }
        if (Array.isArray(prev)) return prev.filter((item: any) => (typeof item === 'string' ? item : item.blocked_uuid) !== blocked_uuid)
        const existing = prev.blocked || prev.blocked_users || []
        return { ...prev, blocked: existing.filter((b: any) => b.blocked_uuid !== blocked_uuid) }
      })
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
    },
  })
}

// ── Unblock From List Mutation ──

export function useUnblockFromList() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (blocked_uuid: string) => {
      removeLocalBlocked(blocked_uuid)
      return rpc<{ message: string }>(
        '/v1/users/unblock',
        { blocked_uuid },
        auth!.token,
        auth!.userUuid,
      )
    },
    onMutate: (blocked_uuid) => {
      removeLocalBlocked(blocked_uuid)
    },
    onSuccess: (_data, blocked_uuid) => {
      removeLocalBlocked(blocked_uuid)
      queryClient.setQueryData<any>(['blockedUsers'], (prev: any) => {
        if (!prev) return { blocked: [] }
        if (Array.isArray(prev)) return prev.filter((item: any) => (typeof item === 'string' ? item : item.blocked_uuid) !== blocked_uuid)
        const existing = prev.blocked || prev.blocked_users || []
        return { ...prev, blocked: existing.filter((b: any) => b.blocked_uuid !== blocked_uuid) }
      })
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] })
    },
  })
}
