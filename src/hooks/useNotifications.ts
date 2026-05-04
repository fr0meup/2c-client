import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { NotificationsResponse, MarkReadResponse, ApiNotification } from '@/lib/types'

export function useNotificationsQuery() {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['notifications'],
    queryFn: async ({ signal }) => {
      if (!auth) throw new Error('Not authenticated')

      return rpc<NotificationsResponse>(
        '/v1/notifications/get',
        {},
        auth.token,
        auth.userUuid,
        signal
      )
    },
    enabled: !!auth,
    staleTime: 4_000,
    refetchInterval: 5_000, // poll every 5s for new notifications
    refetchOnWindowFocus: 'always',
    placeholderData: keepPreviousData,
  })
}

export function useMarkNotificationRead() {
  const { auth } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationUuid: string) => {
      if (!auth) throw new Error('Not authenticated')

      return rpc<MarkReadResponse>(
        '/v1/notifications/read',
        { notification_uuid: notificationUuid },
        auth.token,
        auth.userUuid
      )
    },
    onMutate: async (notificationUuid) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      const prev = queryClient.getQueryData<NotificationsResponse>(['notifications'])

      if (prev) {
        queryClient.setQueryData<NotificationsResponse>(['notifications'], {
          notifications: prev.notifications.map((n: ApiNotification) =>
            n.uuid === notificationUuid ? { ...n, read_at: new Date().toISOString() } : n
          ),
        })
      }

      return { prev }
    },
    onError: (_err, _uuid, context) => {
      // Rollback on failure
      if (context?.prev) {
        queryClient.setQueryData(['notifications'], context.prev)
      }
    },
  })
}
