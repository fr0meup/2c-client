import { NavLink, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useNotifications } from '@/components/notifications'
import { useMessages } from '@/components/messages'
import type { NavItem } from './types'

interface SidebarNavLinkProps {
  item: NavItem
}

const baseInactive = 'text-[#6b6b6b] font-bold hover:bg-gradient-to-b hover:from-white/[0.06] hover:to-white/[0.02] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
const baseActive = 'bg-gradient-to-b from-[#c8a44d]/15 to-[#c8a44d]/5 text-[#c8a44d] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
const baseClass = 'group flex items-center gap-3 rounded-full px-4 py-2 text-[16px] transition-all duration-200 w-full'

function isFeedPath(pathname: string, search: string): boolean {
  return pathname === '/' || new URLSearchParams(search).has('feed') || pathname.startsWith('/post/')
}

function isMessagesPath(pathname: string): boolean {
  return pathname === '/messages' || pathname.startsWith('/room/')
}

const LABEL_TO_QUERY_KEY: Record<string, string[]> = {
  Feed: ['feed'],
  Notifications: ['notifications'],
  Messages: ['rooms'],
  Leaderboard: ['leaderboard'],
  Bookmarks: ['bookmarks'],
  Transactions: ['transactions'],
  Me: ['userProfile'],
}

export function SidebarNavLink({ item }: SidebarNavLinkProps) {
  const location = useLocation()
  const queryClient = useQueryClient()

  function handleClick() {
    const key = LABEL_TO_QUERY_KEY[item.label]
    if (key) queryClient.removeQueries({ queryKey: key })
  }

  if (item.label === 'Feed') {
    const isActive = isFeedPath(location.pathname, location.search)
    return (
      <NavLink
        to="/"
        end
        onClick={handleClick}
        className={`${baseClass} ${isActive ? baseActive : baseInactive}`}
      >
        <NavIcon item={item} isActive={isActive} />
        <span>{item.label}</span>
      </NavLink>
    )
  }

  if (item.label === 'Messages') {
    const isActive = isMessagesPath(location.pathname)
    return (
      <NavLink
        to="/messages"
        onClick={handleClick}
        className={`${baseClass} ${isActive ? baseActive : baseInactive}`}
      >
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
      className={({ isActive }) => `${baseClass} ${isActive ? baseActive : baseInactive}`}
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
  const showBadge = badgeCount > 0

  return (
    <div className="relative shrink-0">
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-110">
        <img
          src={src}
          alt={item.label}
          className="h-full w-full object-contain"
          style={{ transform }}
        />
      </div>
      {showBadge && (
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#0a0907] bg-[#c8a44d] px-1 text-[10px] font-bold leading-none tabular-nums text-[#0f0e0a]">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </div>
  )
}
