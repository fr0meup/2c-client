export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}

/**
 * Parse an API notification message string into actor + preview.
 * Supports both markdown bold "**actor**" and plain text "actor" formats.
 */
export function parseNotificationMessage(
  type: string,
  message: string
): { actor?: string; preview?: string; isDownvote?: boolean } {
  if (!message) return {}

  const isSystemNotif =
    type === 'trending_post' ||
    type === 'pick_post' ||
    type === 'pick_resolved' ||
    type === 'balance_updated'

  if (isSystemNotif) {
    const boldMatch = message.match(/\*\*(.+?)\*\*/)
    return { preview: boldMatch ? boldMatch[1] : message.replace(/\*\*/g, '') }
  }

  // 1. "Upvoted by **actor**: preview" or "Downvoted by actor: preview"
  const verbByMatch = message.match(/^(.+?)\s+by\s+(?:\*\*)?([^:*]+?)(?:\*\*)?:\s*(.*)$/is)
  if (verbByMatch) {
    const isDownvote = /^downvoted/i.test(verbByMatch[1])
    const rawPreview = verbByMatch[3]?.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
    return {
      actor: verbByMatch[2].trim(),
      preview: rawPreview || undefined,
      isDownvote: isDownvote || undefined,
    }
  }

  // 2. "New reply from **actor**: preview" / "Replied by actor: preview"
  const replyMatch = message.match(/^(?:New reply from|Replied by|Reply from|Comment from)\s+(?:\*\*)?([^:*]+?)(?:\*\*)?:\s*(.*)$/is)
  if (replyMatch) {
    const rawPreview = replyMatch[2]?.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
    return {
      actor: replyMatch[1].trim(),
      preview: rawPreview || undefined,
    }
  }

  // 3. "**actor** followed you" / "Followed by **actor**" / "actor followed you"
  const followMatch =
    message.match(/^(?:\*\*)?(.+?)(?:\*\*)?\s+followed you/i) ||
    message.match(/^Followed by\s+(?:\*\*)?(.+?)(?:\*\*)?$/i)
  if (followMatch) {
    return {
      actor: followMatch[1].trim(),
      preview: undefined,
    }
  }

  // 4. "**actor** replied to your..." / "**actor** upvoted your..."
  const actorActionMatch = message.match(/^(?:\*\*)?(.+?)(?:\*\*)?\s+(replied|commented|upvoted|downvoted|voted|started following)(?:\s+(?:to\s+)?your\s+[^:]*)?:\s*(.*)$/is)
  if (actorActionMatch) {
    const isDownvote = /^downvoted/i.test(actorActionMatch[2])
    const rawPreview = actorActionMatch[3]?.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
    return {
      actor: actorActionMatch[1].trim(),
      preview: rawPreview || undefined,
      isDownvote: isDownvote || undefined,
    }
  }

  // 5. Fallback for any message formatted as "**actor** rest of message"
  if (message.startsWith('**')) {
    const startBoldMatch = message.match(/^\*\*(.+?)\*\*\s*(.*)$/s)
    if (startBoldMatch) {
      const rawPreview = startBoldMatch[2]?.replace(/\*\*/g, '').trim()
      return {
        actor: startBoldMatch[1].trim(),
        preview: rawPreview || undefined,
      }
    }
  }

  // Final fallback: strip bold markers
  const stripped = message.replace(/\*\*/g, '')
  return { preview: stripped }
}
