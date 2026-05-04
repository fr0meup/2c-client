import { useMemo } from 'react'
import { PenSquare } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { navItems } from './navItems'
import { SidebarNavLink } from './SidebarNavLink'
export { BottomNav } from './BottomNav'

interface SidebarProps {
  onNewPostClick?: () => void
}

export function Sidebar({ onNewPostClick }: SidebarProps) {
  const { auth } = useAuth()
  const items = useMemo(
    () => navItems.map((item) =>
      item.label === 'Me' && auth?.userUuid
        ? { ...item, path: `/user/${auth.userUuid}` }
        : item
    ),
    [auth?.userUuid],
  )

  return (
    <aside className="fixed left-[calc(50%-600px)] top-[72px] hidden h-[calc(100vh-72px)] w-60 flex-col px-3 py-3 font-[Inter,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] xl:flex">
      <nav className="flex flex-1 flex-col gap-1.5">
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
