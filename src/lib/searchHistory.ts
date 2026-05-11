const SEARCH_HISTORY_KEY = '2c_search_history'
const SEARCH_HISTORY_LIMIT = 8

function normalizeSearchTerm(term: string): string {
  return term.trim().replace(/\s+/g, ' ')
}

export function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, SEARCH_HISTORY_LIMIT)
  } catch {
    return []
  }
}

export function addSearchHistory(term: string): string[] {
  const normalized = normalizeSearchTerm(term)
  if (!normalized) return getSearchHistory()

  const next = [
    normalized,
    ...getSearchHistory().filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, SEARCH_HISTORY_LIMIT)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
  }

  return next
}

export function clearSearchHistory(): string[] {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SEARCH_HISTORY_KEY)
  }

  return []
}

