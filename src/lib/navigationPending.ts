export const NAVIGATION_PENDING_EVENT = 'app:navigation-pending'

export function announceNavigationPending(to: string) {
  const url = new URL(to, window.location.origin)
  window.dispatchEvent(new CustomEvent(NAVIGATION_PENDING_EVENT, { detail: { pathname: url.pathname, search: url.search, run: Date.now() } }))
}
