export interface RoomMember {
  user_uuid: string
  username?: string
  balance: number
  subscription_type: number
  age?: number
  gender?: 'M' | 'F'
  arena?: string
  is_online: boolean
}

export interface RoomStats {
  last_message?: string
  last_message_at?: string
  total_messages?: number
  online_count?: number
}

export interface RoomRequirement {
  uuid: string
  label: string
  met: boolean
}

export type RoomType = 'room' | 'dm'

export interface Room {
  uuid: string
  type: RoomType
  name: string
  description?: string
  is_private: boolean
  gradient: [string, string]
  member_count: number
  members?: RoomMember[]
  stats: RoomStats
  unread_count: number
  muted: boolean
  /** Public-room join requirements; rooms without are open. */
  requirements?: RoomRequirement[]
}

export interface MessageAuthorMeta {
  balance: number
  subscription_type: number
  age?: number
  gender?: string
  arena?: string
  bio?: string
  role?: string
}

export interface ChatMessage {
  uuid: string
  room_uuid: string
  author_uuid: string
  text: string
  created_at: string
  reply_to_uuid?: string
  /** Cached preview of the message being replied to. */
  reply_preview?: string
  reactions?: { emoji: string; count: number; userReacted?: boolean }[]
  deleted_at?: string | null
  author_meta?: MessageAuthorMeta
}
