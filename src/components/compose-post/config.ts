export interface TopicGroup {
  category: string
  items: string[]
}

export type PostOption = 'poll' | 'likert' | 'image' | null

export const TOPIC_MENU: TopicGroup[] = [
  { category: 'General', items: ['Lounge'] },
  { category: 'Advice', items: ['Ask a millionaire'] },
  { category: 'Platform', items: ['Bugs and feedback'] },
]

export const TOPIC_SLUG: Record<string, string> = {
  'Lounge': 'lounge',
  'Ask a millionaire': 'ask-a-millionaire',
  'Bugs and feedback': 'bugs-and-feedback',
}
