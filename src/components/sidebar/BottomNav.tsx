import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MoreHorizontal, PenSquare } from 'lucide-react'
import { navItems } from './navItems'
import type { NavItem } from './types'

interface BottomNavProps {
  onNewPostClick?: () => void
}

function isFeedPath(pathname: string, search: string): boolean {
  return pathname === '/' || new URLSearchParams(search).has('feed') || pathname.startsWith('/post/')
}

const PRIMARY_LABELS = ['Feed', 'Notifications', 'Messages', 'Me']

export function BottomNav({ onNewPostClick }: BottomNavProps) {
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const primary = navItems.filter((i) => PRIMARY_LABELS.includes(i.label))
  const overflow = navItems.filter((i) => !PRIMARY_LABELS.includes(i.label))

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
    return location.pathname === item.path
  }

  return (
    <div className="pointer-events-none fixed bottom-3 left-0 right-0 z-50 flex justify-center px-3 xl:hidden">
      <nav className="pointer-events-auto inline-flex h-[68px] items-center gap-1.5 rounded-full border border-[#c8a44d]/20 bg-gradient-to-r from-[#c8a44d]/[0.06] via-white/[0.04] to-[#c8a44d]/[0.06] px-8 shadow-[0_0_12px_rgba(218,178,87,0.05),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md">
        {/* Primary items: always visible */}
        {primary.map((item) => (
          <BottomNavItem key={item.path} item={item} isActive={isItemActive(item)} />
        ))}

        {/* Overflow items: visible on sm+, collapsed into More button below sm */}
        <div className="hidden items-center gap-1.5 sm:flex">
          {overflow.map((item) => (
            <BottomNavItem key={item.path} item={item} isActive={isItemActive(item)} />
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
                  onClick={() => setMoreOpen(false)}
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

function BottomNavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const to = item.label === 'Feed' ? '/' : item.path

  return (
    <NavLink
      to={to}
      end={to === '/'}
      className="group flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:bg-white/[0.06]"
    >
      <NavIconImg item={item} isActive={isActive} size={32} />
    </NavLink>
  )
}

function NavIconImg({ item, isActive, size }: { item: NavItem; isActive: boolean; size: number }) {
  const src = isActive && item.iconSelected ? item.iconSelected : item.icon
  const transform = `scale(${item.scale}) translateX(${item.offset ?? '0px'})`

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-110"
      style={{ height: size, width: size }}
    >
      <img
        src={src}
        alt={item.label}
        className="h-full w-full object-contain"
        style={{ transform, opacity: isActive ? 1 : 0.65 }}
      />
    </div>
  )
}
