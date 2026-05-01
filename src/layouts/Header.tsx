import { useLocation } from 'react-router-dom'
import { FeedFilters } from '@/components/feed-filters'

interface HeaderProps {
  onToggleGuides: () => void
  guidesEnabled: boolean
}

function isFeedPath(pathname: string, search: string): boolean {
  return pathname === '/' || new URLSearchParams(search).has('feed') || pathname.startsWith('/post/')
}

/** Left side — fixed, stays on screen when scrolling */
export function HeaderLeft({ onToggleGuides, guidesEnabled }: HeaderProps) {
  return (
    <header
      className="fixed left-0 top-0 z-50 hidden h-[72px] bg-[#0d0d0b] xl:flex"
      style={{ width: 'calc(50% - 372px)' }}
    >
      <button
        onClick={onToggleGuides}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded px-3 py-1.5 text-xs font-semibold text-white/[0.6] transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        {guidesEnabled ? 'Hide guides' : 'Show guides'}
      </button>
      <div className="fixed top-0 flex h-[72px] w-60 items-start justify-start pl-7 pt-6" style={{ left: 'calc(50% - 600px)' }}>
        <img
          src="https://www.twocents.money/_next/image?url=%2F2centsLogo.png&w=1920&q=75"
          alt="2C Feed"
          className="h-12 object-contain"
        />
      </div>
    </header>
  )
}

/** Right side — scrolls with the page */
export function HeaderRight() {
  const location = useLocation()
  const showFilters = isFeedPath(location.pathname, location.search)

  return (
    <div className="flex h-[72px] w-full items-end justify-center bg-[#0d0d0b] px-4 sm:px-8">
      <div className="w-full max-w-[670px] xl:-ml-[245px]">
        {showFilters && <FeedFilters />}
      </div>
    </div>
  )
}
