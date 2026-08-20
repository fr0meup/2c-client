import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { PenSquare } from 'lucide-react'
import { useMessages } from '@/components/messages/MessagesContext'
import { useNotifications } from '@/components/notifications/NotificationsContext'
import { useAuth } from '@/lib/auth'
import { preloadRoute, routeForPath } from '@/lib/routePreload'
import { usePrefetch } from '@/hooks/usePrefetch'
import { navItems, type NavItem } from './navItems'
import { announceNavigationPending } from '@/lib/navigationPending'
import { saveScrollPosition, clearScrollPosition } from '@/App'
export { BottomNav } from './BottomNav'

const baseInactive = 'text-[#6b6b6b] font-bold hover:bg-gradient-to-b hover:from-white/[0.06] hover:to-white/[0.02] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
const baseActive = 'bg-gradient-to-b from-[#c8a44d]/15 to-[#c8a44d]/5 text-[#c8a44d] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
const baseClass = 'group flex items-center gap-3 rounded-full px-4 py-2 text-[16px] transition-all duration-200 w-full'

function isFeedPath(pathname: string, search: string): boolean {
  return pathname === '/' || new URLSearchParams(search).has('feed') || pathname.startsWith('/post/')
}

function isMessagesPath(pathname: string): boolean {
  return pathname === '/messages' || pathname.startsWith('/room/')
}

interface SidebarProps {
  onNewPostClick?: () => void
}

export function Sidebar({ onNewPostClick }: SidebarProps) {
  const { auth } = useAuth()
  const userUuid = auth?.userUuid
  const items = useMemo(
    () => navItems.map((item) =>
      item.label === 'Me' && userUuid
        ? { ...item, path: `/user/${userUuid}` }
        : item
    ),
    [userUuid],
  )

  return (
    <aside className="fixed left-[calc(50%-600px)] top-[72px] hidden h-[calc(100vh-72px)] w-60 flex-col px-3 py-3 font-[Inter,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] xl:flex">
      <nav className="flex flex-1 flex-col gap-1.5" data-sidebar-column>
        {items.map((item) => (
          <SidebarNavLink key={item.path} item={item} />
        ))}
      </nav>

      <div className="border-t border-white/[0.06] pt-4">
        <button
          data-onboarding="compose"
          onClick={onNewPostClick}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#c8a44d] px-4 py-2.5 text-[15px] font-semibold text-[#0f0e0a] transition-all duration-200 hover:bg-[#c8a44d]/85 hover:shadow-lg hover:shadow-[#c8a44d]/20 active:scale-[0.98]"
        >
          <PenSquare className="h-5 w-5 shrink-0" />
          <span>New Post</span>
        </button>
      </div>
    </aside>
  )
}

function SidebarNavLink({ item }: { item: NavItem }) {
  const location = useLocation()
  const { prefetchFeed, prefetchLeaderboard, prefetchMyProfile, prefetchNotifications, prefetchRooms, prefetchBookmarks } = usePrefetch()
  const to = item.label === 'Feed' ? '/' : item.label === 'Messages' ? '/messages' : item.path

  function handlePreload() {
    const route = routeForPath(to)
    if (route) preloadRoute(route)
    if (item.label === 'Feed') prefetchFeed()
    else if (item.label === 'Notifications') prefetchNotifications()
    else if (item.label === 'Messages') prefetchRooms()
    else if (item.label === 'Leaderboard') prefetchLeaderboard()
    else if (item.label === 'Bookmarks') prefetchBookmarks()
    else if (item.label === 'Me') prefetchMyProfile()
  }

  function handleClick() {
    saveScrollPosition()
    announceNavigationPending(to)
    handlePreload()
  }

  function handleFeedClick() {
    clearScrollPosition('/')
    window.scrollTo({ top: 0, behavior: 'instant' })
    announceNavigationPending('/')
    handlePreload()
  }

  if (item.label === 'Feed') {
    const isActive = isFeedPath(location.pathname, location.search)
    return (
      <NavLink to="/" end data-feed-nav-item onClick={handleFeedClick} onMouseEnter={handlePreload} onFocus={handlePreload} className={`${baseClass} ${isActive ? baseActive : baseInactive}`}>
        <NavIcon item={item} isActive={isActive} />
        <span>{item.label}</span>
      </NavLink>
    )
  }

  if (item.label === 'Messages') {
    const isActive = isMessagesPath(location.pathname)
    return (
      <NavLink to="/messages" onClick={handleClick} onMouseEnter={handlePreload} onFocus={handlePreload} className={`${baseClass} ${isActive ? baseActive : baseInactive}`}>
        <NavIcon item={item} isActive={isActive} />
        <span>{item.label}</span>
      </NavLink>
    )
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={handleClick}
      onMouseEnter={handlePreload}
      onFocus={handlePreload}
      className={({ isActive }) => `${baseClass} ${isActive ? baseActive : baseInactive}`}
      data-me-nav-item={item.label === 'Me' ? 'true' : undefined}
      {...(item.label === 'Me' ? { 'data-onboarding': 'me-nav' } : {})}
    >
      {({ isActive }) => (
        <>
          <NavIcon item={item} isActive={isActive} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

function NavIcon({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const { unreadCount } = useNotifications()
  const { totalUnread: messagesUnread } = useMessages()
  const src = isActive && item.iconSelected ? item.iconSelected : item.icon
  const transform = `scale(${item.scale}) translateX(${item.offset ?? '0px'})`
  const badgeCount =
    item.label === 'Notifications' ? unreadCount : item.label === 'Messages' ? messagesUnread : 0

  return (
    <div className="relative shrink-0">
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-110">
        <img src={src} alt={item.label} className="h-full w-full object-contain" style={{ transform }} />
      </div>
      {badgeCount > 0 && (
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#0a0907] bg-[#c8a44d] px-1 text-[10px] font-bold leading-none tabular-nums text-[#0f0e0a]">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </div>
  )
}
