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
 *
 * The API message uses **bold** markers. Patterns:
 * - "Upvoted by **username**: post text..."     → actor=username, preview=post text
 * - "New reply from **username**: comment..."   → actor=username, preview=comment
 * - "New trending post: **title**"              → actor=undefined, preview=title
 * - "New pick post: **title**"                  → actor=undefined, preview=title
 * - "Your pick on **'title'** just resolved..." → actor=undefined, preview=full message
 * - "You reached **Tier** in Penny's Picks."   → actor=undefined, preview=full message
 * - "Your net worth is now **$16**..."          → actor=undefined, preview=full message
 */
export function parseNotificationMessage(
  type: string,
  message: string
): { actor?: string; preview?: string; isDownvote?: boolean } {
  // Patterns with an actor: "Verb by **actor**: preview"
  const actorColonMatch = message.match(/^(.+?) by \*\*(.+?)\*\*:\s*(.*)$/)
  if (actorColonMatch) {
    const isDownvote = /^downvoted/i.test(actorColonMatch[1])
    return { actor: actorColonMatch[2], preview: actorColonMatch[3] || undefined, isDownvote: isDownvote || undefined }
  }

  // "New reply from **actor**: preview"
  const replyMatch = message.match(/^New reply from \*\*(.+?)\*\*:\s*(.*)$/)
  if (replyMatch) {
    return { actor: replyMatch[1], preview: replyMatch[2] || undefined }
  }

  // System notifications: extract bold text as preview
  if (type === 'trending_post' || type === 'pick_post') {
    const boldMatch = message.match(/\*\*(.+?)\*\*/)
    return { preview: boldMatch ? boldMatch[1] : message }
  }

  // Strip markdown bold for all other types and use as preview
  const stripped = message.replace(/\*\*/g, '')
  return { preview: stripped }
}
