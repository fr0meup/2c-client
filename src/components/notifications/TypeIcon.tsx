import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquareText,
  Target,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  UserPlus,
  Bell,
} from 'lucide-react'
import type { NotificationType } from './types'

const ICONS: Record<NotificationType, typeof Bell> = {
  post_voted: ArrowBigUp,
  comment_voted: ArrowBigUp,
  post_replied: MessageSquareText,
  comment_replied: MessageSquareText,
  pick_post: Target,
  pick_resolved: CheckCircle2,
  trending_post: TrendingUp,
  poll_voted: BarChart3,
  followed: UserPlus,
  generic: Bell,
  balance_updated: TrendingUp,
}

export function TypeIcon({ type, className, isDownvote }: { type: NotificationType; className?: string; isDownvote?: boolean }) {
  const Icon = isDownvote && (type === 'post_voted' || type === 'comment_voted') ? ArrowBigDown : (ICONS[type] ?? Bell)
  return <Icon className={className ?? 'h-4 w-4'} strokeWidth={2.2} />
}
