import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'

interface CitiesResponse {
  cities: Record<string, string[]>
}

export function useCities(enabled = false) {
  const { auth } = useAuth()

  return useQuery<CitiesResponse>({
    queryKey: ['cities'],
    queryFn: ({ signal }) =>
      rpc<CitiesResponse>(
        '/v1/info/cities',
        {},
        auth!.token,
        auth!.userUuid,
        signal,
      ),
    enabled: enabled && !!auth?.token,
    staleTime: Infinity,
  })
}
