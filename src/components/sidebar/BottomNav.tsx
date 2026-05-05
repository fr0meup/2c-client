import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MoreHorizontal, PenSquare } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { preloadRoute, routeForPath } from '@/lib/routePreload'
import { usePrefetch } from '@/hooks/usePrefetch'
import { useNotifications } from '@/components/notifications/NotificationsContext'
import { useMessages } from '@/components/messages/MessagesContext'
import { navItems, type NavItem } from './navItems'

interface BottomNavProps {
  onNewPostClick?: () => void
}

function isFeedPath(pathname: string, search: string): boolean {
  return pathname === '/' || new URLSearchParams(search).has('feed') || pathname.startsWith('/post/')
}

const PRIMARY_LABELS = ['Feed', 'Notifications', 'Messages', 'Me']

export function BottomNav({ onNewPostClick }: BottomNavProps) {
  const location = useLocation()
  const { auth } = useAuth()
  const { prefetchFeed, prefetchLeaderboard, prefetchMyProfile, prefetchNotifications, prefetchRooms, prefetchBookmarks } = usePrefetch()
  const userUuid = auth?.userUuid
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const items = useMemo(
    () => navItems.map((item) =>
      item.label === 'Me' && userUuid
        ? { ...item, path: `/user/${userUuid}` }
        : item
    ),
    [userUuid],
  )
  const primary = items.filter((i) => PRIMARY_LABELS.includes(i.label))
  const overflow = items.filter((i) => !PRIMARY_LABELS.includes(i.label))

  useEffect(() => {
    if (!moreOpen) return
    function onClick(e: MouseEvent) {
      if (!(e.target instanceof Element)) return
      if (moreRef.current?.contains(e.target)) return
      setMoreOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [moreOpen])

  function isItemActive(item: NavItem): boolean {
    if (item.label === 'Feed') return isFeedPath(location.pathname, location.search)
    if (item.label === 'Messages')
      return location.pathname === '/messages' || location.pathname.startsWith('/room/')
    return location.pathname === item.path
  }

  function prefetchItem(item: NavItem) {
    const route = routeForPath(item.label === 'Feed' ? '/' : item.label === 'Messages' ? '/messages' : item.path)
    if (route) preloadRoute(route)
    if (item.label === 'Feed') prefetchFeed()
    else if (item.label === 'Notifications') prefetchNotifications()
    else if (item.label === 'Messages') prefetchRooms()
    else if (item.label === 'Leaderboard') prefetchLeaderboard()
    else if (item.label === 'Bookmarks') prefetchBookmarks()
    else if (item.label === 'Me') prefetchMyProfile()
  }

  return (
    <div className="pointer-events-none fixed bottom-3 left-0 right-0 z-50 flex justify-center px-3 xl:hidden">
      <nav className="pointer-events-auto inline-flex h-[68px] items-center gap-1.5 rounded-full border border-[#c8a44d]/20 bg-gradient-to-r from-[#c8a44d]/[0.06] via-white/[0.04] to-[#c8a44d]/[0.06] px-8 shadow-[0_0_12px_rgba(218,178,87,0.05),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md">
        {/* Primary items: always visible */}
        {primary.map((item) => (
          <BottomNavItem key={item.path} item={item} isActive={isItemActive(item)} onClick={() => {
            prefetchItem(item)
          }} onPreload={() => prefetchItem(item)} />
        ))}

        {/* Overflow items: visible on sm+, collapsed into More button below sm */}
        <div className="hidden items-center gap-1.5 sm:flex">
          {overflow.map((item) => (
            <BottomNavItem key={item.path} item={item} isActive={isItemActive(item)} onClick={() => {
              prefetchItem(item)
            }} onPreload={() => prefetchItem(item)} />
          ))}
        </div>

        <div ref={moreRef} className="relative sm:hidden">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMoreOpen((v) => !v)
            }}
            className="group flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/60 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
          >
            <MoreHorizontal className="h-7 w-7" />
          </button>
          {moreOpen && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-2xl border border-white/[0.06] bg-[#141410] p-1 shadow-lg">
              {overflow.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    setMoreOpen(false)
                    prefetchItem(item)
                  }}
                  className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white"
                >
                  <NavIconImg item={item} isActive={isItemActive(item)} size={20} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* New Post button */}
        <button
          onClick={onNewPostClick}
          aria-label="New Post"
          className="ml-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#c8a44d] text-[#0f0e0a] transition-all duration-200 hover:bg-[#c8a44d]/85 hover:shadow-lg hover:shadow-[#c8a44d]/20 active:scale-[0.98]"
        >
          <PenSquare className="h-[18px] w-[18px]" />
        </button>
      </nav>
    </div>
  )
}

function BottomNavItem({ item, isActive, onClick, onPreload }: { item: NavItem; isActive: boolean; onClick?: () => void; onPreload?: () => void }) {
  const to = item.label === 'Feed' ? '/' : item.path
  const handlePreload = () => {
    onPreload?.()
  }

  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      onMouseEnter={handlePreload}
      onFocus={handlePreload}
      onTouchStart={handlePreload}
      className="group flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:bg-white/[0.06]"
      {...(item.label === 'Me' ? { 'data-onboarding': 'me-nav' } : {})}
    >
      <NavIconImg item={item} isActive={isActive} size={32} />
    </NavLink>
  )
}

function NavIconImg({ item, isActive, size }: { item: NavItem; isActive: boolean; size: number }) {
  const { unreadCount } = useNotifications()
  const { totalUnread: messagesUnread } = useMessages()
  const src = isActive && item.iconSelected ? item.iconSelected : item.icon
  const transform = `scale(${item.scale}) translateX(${item.offset ?? '0px'})`
  const badgeCount =
    item.label === 'Notifications' ? unreadCount : item.label === 'Messages' ? messagesUnread : 0
  const showBadge = badgeCount > 0

  return (
    <div className="relative shrink-0" style={{ height: size, width: size }}>
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-110"
      >
        <img
          src={src}
          alt={item.label}
          className="h-full w-full object-contain"
          style={{ transform, opacity: isActive ? 1 : 0.65 }}
        />
      </div>
      {showBadge && (
        <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#0a0907] bg-[#c8a44d] px-1 text-[10px] font-bold leading-none tabular-nums text-[#0f0e0a]">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </div>
  )
}
