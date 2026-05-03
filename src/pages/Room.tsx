import { RoomChat } from '@/components/messages'
import { usePageLoad, RoomChatSkeleton } from '@/components/skeleton'

export function Room() {
  const loading = usePageLoad()

  if (loading) return <RoomChatSkeleton />
  return <RoomChat />
}
