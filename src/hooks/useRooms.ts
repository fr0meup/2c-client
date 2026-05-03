import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type {
  ListRoomsResponse,
  GetRoomResponse,
  GetMembersResponse,
  GetMessagesResponse,
} from '@/lib/types'

/** Fetch the current user's joined rooms (public rooms) */
export function useUserRooms() {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['rooms', 'user'],
    queryFn: ({ signal }) =>
      rpc<ListRoomsResponse>(
        '/v2/rooms/listUserRooms',
        {},
        auth!.token,
        auth!.userUuid,
        signal
      ),
    enabled: !!auth,
    staleTime: 30_000,
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  })
}

/** Fetch the current user's DMs */
export function useUserDMs() {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['rooms', 'dms'],
    queryFn: ({ signal }) =>
      rpc<ListRoomsResponse>(
        '/v2/rooms/listUserDMs',
        {},
        auth!.token,
        auth!.userUuid,
        signal
      ),
    enabled: !!auth,
    staleTime: 30_000,
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  })
}

/** Fetch all public/explore rooms */
export function useExploreRooms() {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['rooms', 'explore'],
    queryFn: ({ signal }) =>
      rpc<ListRoomsResponse>(
        '/v1/rooms/listRooms',
        {},
        auth!.token,
        auth!.userUuid,
        signal
      ),
    enabled: !!auth,
    staleTime: 60_000,
  })
}

/** Fetch a single room's details */
export function useRoom(roomUuid: string | undefined) {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['rooms', 'detail', roomUuid],
    queryFn: ({ signal }) =>
      rpc<GetRoomResponse>(
        '/v1/rooms/getRoom',
        { roomUuid },
        auth!.token,
        auth!.userUuid,
        signal
      ),
    enabled: !!auth && !!roomUuid,
    staleTime: 30_000,
  })
}

/** Fetch members of a room */
export function useRoomMembers(roomUuid: string | undefined) {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['rooms', 'members', roomUuid],
    queryFn: ({ signal }) =>
      rpc<GetMembersResponse>(
        '/v1/rooms/getMembers',
        { roomUuid },
        auth!.token,
        auth!.userUuid,
        signal
      ),
    enabled: !!auth && !!roomUuid,
    staleTime: 30_000,
  })
}

/** Fetch messages for a room/DM */
export function useRoomMessages(roomUuid: string | undefined, limit = 500) {
  const { auth } = useAuth()

  return useQuery({
    queryKey: ['rooms', 'messages', roomUuid],
    queryFn: ({ signal }) =>
      rpc<GetMessagesResponse>(
        '/v1/rooms/getMessages',
        { roomUuid, offset: 0, limit },
        auth!.token,
        auth!.userUuid,
        signal
      ),
    enabled: !!auth && !!roomUuid,
    staleTime: 20_000,
  })
}
