export const routeLoaders = {
  layout: () => import('@/layouts/AppLayout').then((m) => ({ default: m.AppLayout })),
  login: () => import('@/pages/Login').then((m) => ({ default: m.Login })),
  feed: () => import('@/pages/Feed').then((m) => ({ default: m.Feed })),
  notifications: () => import('@/components/notifications/NotificationsFeed').then((m) => ({ default: m.Notifications })),
  messages: () => import('@/components/messages/MessagesList').then((m) => ({ default: m.Messages })),
  room: () => import('@/components/messages/RoomChat').then((m) => ({ default: m.Room })),
  leaderboard: () => import('@/components/leaderboard/LeaderboardPage').then((m) => ({ default: m.Leaderboard })),
  bookmarks: () => import('@/pages/Bookmarks').then((m) => ({ default: m.Bookmarks })),
  profile: () => import('@/components/profile/UserProfile').then((m) => ({ default: m.UserProfile })),
  post: () => import('@/components/post-detail/PostDetail').then((m) => ({ default: m.PostDetailPage })),
}

export const headerLoaders = {
  feed: () => import('@/components/feed-filters/FeedFilters').then((m) => ({ default: m.FeedFilters })),
  post: () => import('@/components/post-detail/PostDetailHeader').then((m) => ({ default: m.PostDetailHeader })),
  notifications: () => import('@/components/notifications/NotificationsHeader').then((m) => ({ default: m.NotificationsHeader })),
  profile: () => import('@/components/profile/ProfileHeader').then((m) => ({ default: m.ProfileHeader })),
  room: () => import('@/components/messages/RoomChat').then((m) => ({ default: m.ChatHeader })),
  messages: () => import('@/components/messages/MessagesList').then((m) => ({ default: m.MessagesListHeader })),
  leaderboard: () => import('@/components/leaderboard/LeaderboardPage').then((m) => ({ default: m.LeaderboardHeader })),
}

export function preloadRoute(route: keyof typeof routeLoaders) {
  const routePromise = routeLoaders[route]()
  if (route in headerLoaders) {
    const headerRoute = route as keyof typeof headerLoaders
    void headerLoaders[headerRoute]()
  }
  return routePromise
}

export function routeForPath(path: string) {
  if (path === '/login') return 'login'
  if (path === '/' || path.startsWith('/?')) return 'feed'
  if (path.startsWith('/post/')) return 'post'
  if (path === '/notifications') return 'notifications'
  if (path === '/messages') return 'messages'
  if (path.startsWith('/room/')) return 'room'
  if (path === '/leaderboard') return 'leaderboard'
  if (path === '/bookmarks') return 'bookmarks'
  if (path.startsWith('/user/')) return 'profile'
  return undefined
}
