import { NavLink, useLocation } from 'react-router-dom'
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

export function SidebarNavLink({ item }: SidebarNavLinkProps) {
  const location = useLocation()

  if (item.label === 'Feed') {
    const isActive = isFeedPath(location.pathname, location.search)
    return (
      <NavLink
        to="/"
        end
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
      className={({ isActive }) => `${baseClass} ${isActive ? baseActive : baseInactive}`}
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
  const src = isActive && item.iconSelected ? item.iconSelected : item.icon
  const transform = `scale(${item.scale}) translateX(${item.offset ?? '0px'})`

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
    </div>
  )
}
