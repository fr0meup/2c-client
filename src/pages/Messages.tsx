import { MessagesList, useMessages } from '@/components/messages'
import { MessagesListSkeleton } from '@/components/skeleton'

export function Messages() {
  const { isLoading } = useMessages()

  if (isLoading) return <MessagesListSkeleton />
  return <MessagesList />
}
