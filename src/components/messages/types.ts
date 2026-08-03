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
  requirements?: RoomRequirement[]
  room_code?: string
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
  message_meta?: {
    imageUrl?: string
    image_url?: string
    giphy_id?: string
    giphy_url?: string
    src?: string
  } | null
  created_at: string
  reply_to_uuid?: string
  reply_preview?: string
  reactions?: { emoji: string; count: number; userReacted?: boolean }[]
  deleted_at?: string | null
  author_meta?: MessageAuthorMeta
}

export function timeAgo(iso?: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}

export function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toString()
}

export function gradientCss(gradient: [string, string]): string {
  return `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
}
