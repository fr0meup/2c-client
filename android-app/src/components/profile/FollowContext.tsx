import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMyAliases, useSetAlias, useUnsetAlias } from '@/hooks/useFollow'
import { useToast } from '@/components/toast/ToastContext'
import { humanizeError } from '@/lib/api'

interface FollowContextValue {
  isFollowing: (uuid: string) => boolean
  toggleFollow: (uuid: string, alias?: string) => void
  aliasFor: (uuid: string) => string | undefined
  isLoaded: boolean
}

const FollowContext = createContext<FollowContextValue | null>(null)

export function FollowProvider({ children }: { children: ReactNode }) {
  const { data, isSuccess } = useMyAliases()
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const [initialized, setInitialized] = useState(false)

  const [aliasMap, setAliasMap] = useState<Map<string, string>>(new Map())

  const setAlias = useSetAlias()
  const unsetAlias = useUnsetAlias()
  const { toast } = useToast()

  useEffect(() => {
    if (isSuccess && data?.aliases && !initialized) {
      setFollowed(new Set(data.aliases.map((a) => a.for_uuid)))
      setAliasMap(new Map(data.aliases.map((a) => [a.for_uuid, a.alias])))
      setInitialized(true)
    }
  }, [isSuccess, data, initialized])

  const isFollowing = useCallback((uuid: string) => followed.has(uuid), [followed])
  const aliasFor = useCallback((uuid: string) => aliasMap.get(uuid), [aliasMap])

  const toggleFollow = useCallback((uuid: string, alias = 'anon') => {
    const wasFollowing = followed.has(uuid)

    // Optimistic update
    setFollowed((prev) => {
      const next = new Set(prev)
      if (wasFollowing) next.delete(uuid)
      else next.add(uuid)
      return next
    })
    if (!wasFollowing) {
      setAliasMap((prev) => new Map(prev).set(uuid, alias))
    } else {
      setAliasMap((prev) => {
        const next = new Map(prev)
        next.delete(uuid)
        return next
      })
    }

    // Fire API call
    if (wasFollowing) {
      unsetAlias.mutate(uuid, {
        onSuccess: () => {
          toast('success', 'Unfollowed successfully')
        },
        onError: (err) => {
          // Rollback on failure
          setFollowed((prev) => new Set(prev).add(uuid))
          toast('error', `Failed to unfollow: ${humanizeError(err)}`)
        },
      })
    } else {
      setAlias.mutate({ for_uuid: uuid, alias }, {
        onSuccess: () => {
          toast('success', 'Followed successfully')
        },
        onError: (err) => {
          // Rollback on failure
          setFollowed((prev) => {
            const next = new Set(prev)
            next.delete(uuid)
            return next
          })
          toast('error', `Failed to follow: ${humanizeError(err)}`)
        },
      })
    }
  }, [followed, setAlias, unsetAlias, toast])

  const value = useMemo(() => ({ isFollowing, toggleFollow, aliasFor, isLoaded: initialized }), [isFollowing, toggleFollow, aliasFor, initialized])

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>
}

export function useFollow(): FollowContextValue {
  const ctx = useContext(FollowContext)
  if (!ctx) throw new Error('useFollow must be used within <FollowProvider>')
  return ctx
}
