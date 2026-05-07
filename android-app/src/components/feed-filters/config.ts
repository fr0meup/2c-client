export const TOPICS = ['New', 'Hot', 'Following', 'Picks', 'Topics'] as const

export const TOPIC_MENU = [
  { category: 'General', items: ['Lounge', 'Situation monitoring', 'Dating'] },
  { category: 'Markets', items: ['Stocks', 'Cryptocurrency', 'Real estate'] },
  { category: 'Business', items: ['Business and entrepreneurship', 'AI and tech'] },
  { category: 'Advice', items: ['Ask a millionaire'] },
  { category: 'Platform', items: ['Announcements', 'Bugs and feedback'] },
] as const

function toParam(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

const ALL_TOPIC_NAMES = [
  ...TOPICS.slice(0, -1),
  ...TOPIC_MENU.flatMap((g) => g.items),
] as string[]

export const FEED_PARAM_TO_TOPIC: Record<string, string> = {}
export const TOPIC_TO_FEED_PARAM: Record<string, string> = {}

for (const name of ALL_TOPIC_NAMES) {
  const param = toParam(name)
  FEED_PARAM_TO_TOPIC[param] = name
  TOPIC_TO_FEED_PARAM[name] = param
}

export function getFeedUrl(topic: string): string {
  const param = TOPIC_TO_FEED_PARAM[topic]
  if (!param) return '/'
  return param === 'new' ? '/' : `/?feed=${param}`
}

export type Topic = (typeof TOPICS)[number] | (typeof TOPIC_MENU)[number]['items'][number]
