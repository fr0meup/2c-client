import { useInfiniteQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { ArenaResponse, ArenaParams } from '@/lib/types'

/** Map UI topic labels to the API topic param values */
export const TOPIC_TO_API: Record<string, string | undefined> = {
  'New': undefined, // no topic param = all
  'Hot': 'hot',
  'Following': 'following',
  'Picks': 'picks',
  'Lounge': 'lounge',
  'Situation monitoring': 'situation-monitoring',
  'Dating': 'dating',
  'Stocks': 'stocks',
  'Cryptocurrency': 'cryptocurrency',
  'Real estate': 'real-estate',
  'Business and entrepreneurship': 'business-entrepreneurship',
  'AI and tech': 'ai-tech',
  'Ask a millionaire': 'ask-a-millionaire',
  'Announcements': 'announcements',
  'Bugs and feedback': 'bugs-and-feedback',
}

export interface AdvancedSearchParams {
  filter?: string
  sort_dir?: 'desc' | 'asc'
  min_balance?: number
  max_balance?: number
  votes_min?: number
  votes_max?: number
  age?: number
  genders?: string[]
  locations?: string[]
  countries?: string[]
  cities?: string[]
  has_image?: boolean
  has_poll?: boolean
  sort_by?: string
}

import { formatTopicSlug } from '@/lib/customTopics'

export function useFeed(topic: string, searchQuery?: string, advanced?: AdvancedSearchParams, jumpCursor?: string, enabled = true) {
  const { auth } = useAuth()

  return useInfiniteQuery({
    queryKey: ['feed', topic, searchQuery ?? '', advanced ?? {}, jumpCursor ?? ''],
    queryFn: async ({ pageParam, signal }) => {
      if (!auth) throw new Error('Not authenticated')

      const apiTopic = topic in TOPIC_TO_API ? TOPIC_TO_API[topic] : formatTopicSlug(topic)

      // Client-side sorts — always use chronological for the API
      const rawFilter = advanced?.filter ?? 'chronological'
      const CLIENT_SORTS = ['most_upvoted', 'most_downvoted', 'most_commented', 'oldest']
      const apiFilter = CLIENT_SORTS.includes(rawFilter) ? 'chronological' : rawFilter

      const params: ArenaParams = {
        sort_dir: advanced?.sort_dir ?? 'desc',
        filter: apiFilter as ArenaParams['filter'],
      }

      if (apiTopic) {
        params.topic = apiTopic
      }

      if (searchQuery) {
        params.q = searchQuery
      }

      if (pageParam) {
        params.cursor = pageParam
      }

      // Merge advanced filters
      if (advanced) {
        if (advanced.min_balance != null) params.min_balance = advanced.min_balance
        if (advanced.max_balance != null) params.max_balance = advanced.max_balance
        if (advanced.votes_min != null) params.votes_min = advanced.votes_min
        if (advanced.votes_max != null) params.votes_max = advanced.votes_max
        if (advanced.age != null) params.age = advanced.age
        if (advanced.genders?.length) params.genders = advanced.genders
        if (advanced.locations?.length) params.locations = advanced.locations
        if (advanced.countries?.length) params.countries = advanced.countries
        if (advanced.cities?.length) params.cities = advanced.cities
        if (advanced.has_image != null) params.has_image = advanced.has_image
        if (advanced.has_poll != null) params.has_poll = advanced.has_poll
        if (advanced.sort_by) params.sort_by = advanced.sort_by
      }

      return rpc<ArenaResponse>(
        '/v2/posts/arena',
        params as unknown as Record<string, unknown>,
        auth.token,
        auth.userUuid,
        signal
      )
    },
    initialPageParam: (jumpCursor ?? undefined) as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_cursor ?? undefined) : undefined,
    enabled: enabled && !!auth,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })
}
