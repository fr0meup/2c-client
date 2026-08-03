const PINNED_TOPIC_KEY = '2c_pinned_default_topic'

export function getPinnedTopic(): string {
  try {
    return localStorage.getItem(PINNED_TOPIC_KEY) || 'Lounge'
  } catch {
    return 'Lounge'
  }
}

export function setPinnedTopic(topicName: string | null): string {
  try {
    if (!topicName) {
      localStorage.removeItem(PINNED_TOPIC_KEY)
      return 'Lounge'
    }
    // If clicking already pinned topic, unpin back to Lounge
    const current = getPinnedTopic()
    if (current === topicName) {
      localStorage.removeItem(PINNED_TOPIC_KEY)
      return 'Lounge'
    }
    localStorage.setItem(PINNED_TOPIC_KEY, topicName)
    return topicName
  } catch {
    return 'Lounge'
  }
}
