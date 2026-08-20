import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'
import type { BookmarksResponse } from '@/lib/types'

export function useBookmarks() {
  const { auth } = useAuth()

  return useQuery<BookmarksResponse>({
    queryKey: ['bookmarks'],
    queryFn: async ({ signal }) => {
      return rpc<BookmarksResponse>(
        '/v1/bookmarks/all',
        {},
        auth!.token,
        auth!.userUuid,
        signal,
      )
    },
    enabled: !!auth?.token,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
}

// ── Toggle Bookmark ──

interface ToggleBookmarkResponse {
  bookmarked: boolean
  success: boolean
}

export function useToggleBookmark() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postUUID: string) => {
      if (!auth) throw new Error('Not authenticated')
      return rpc<ToggleBookmarkResponse>(
        '/v1/bookmarks/bookmark',
        { postUUID },
        auth.token,
        auth.userUuid,
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    },
  })
}
