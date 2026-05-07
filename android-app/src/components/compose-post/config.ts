export interface TopicGroup {
  category: string
  items: string[]
}

export type PostOption = 'poll' | 'likert' | 'image' | null

export const TOPIC_MENU: TopicGroup[] = [
  { category: 'General', items: ['Lounge', 'Situation monitoring', 'Dating'] },
  { category: 'Markets', items: ['Stocks', 'Cryptocurrency', 'Picks', 'Real estate'] },
  { category: 'Business', items: ['Business and entrepreneurship', 'AI and tech'] },
  { category: 'Advice', items: ['Ask a millionaire'] },
  { category: 'Platform', items: ['Announcements', 'Bugs and feedback'] },
]

export const TOPIC_SLUG: Record<string, string> = {
  'Lounge': 'lounge',
  'Situation monitoring': 'situation-monitoring',
  'Dating': 'dating',
  'Stocks': 'stocks',
  'Cryptocurrency': 'cryptocurrency',
  'Picks': 'picks',
  'Real estate': 'real-estate',
  'Business and entrepreneurship': 'business-entrepreneurship',
  'AI and tech': 'ai-tech',
  'Ask a millionaire': 'ask-a-millionaire',
  'Announcements': 'announcements',
  'Bugs and feedback': 'bugs-and-feedback',
}
