import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { TOPICS, TOPIC_MENU, FEED_PARAM_TO_TOPIC, getFeedUrl } from './config'

export function FeedFilters() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [topicsOpen, setTopicsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  // Derive active topic from URL query param ?feed=
  const feedParam = new URLSearchParams(location.search).get('feed')
  const activeTopic = FEED_PARAM_TO_TOPIC[feedParam ?? ''] ?? 'New'

  const topicMenuItems = TOPIC_MENU.flatMap((g) => g.items)
  const mainTabLabels = ['New', 'Hot', 'Following', 'Picks'] as const
  const isInTopicsMenu = !mainTabLabels.includes(activeTopic as unknown as typeof mainTabLabels[number]) && topicMenuItems.some((item) => item === activeTopic)

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchOpen])

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const activeBtn = containerRef.current.querySelector('[data-active="true"]') as HTMLElement | null
    if (activeBtn) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const btnRect = activeBtn.getBoundingClientRect()
      setIndicator({ left: btnRect.left - containerRect.left, width: btnRect.width })
    }
  }, [activeTopic, topicsOpen, isInTopicsMenu, searchOpen])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target instanceof Element)) return
      if (e.target.closest('[data-topics-dropdown]')) return
      setTopicsOpen(false)
    }
    if (topicsOpen) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [topicsOpen])

  return (
    <div className="relative flex h-10 items-center">
      {/* Search expanding bar */}
      <div
        className="group absolute left-0 top-0 h-10 cursor-pointer overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.06] hover:bg-gradient-to-b hover:from-white/[0.09] hover:to-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        style={{ width: searchOpen ? '18rem' : '2.5rem', transition: 'width 300ms ease-out' }}
        onMouseDown={(e) => {
          if (searchOpen && e.target === e.currentTarget) {
            e.preventDefault()
            setSearchOpen(false)
          }
        }}
        onClick={() => !searchOpen && setSearchOpen(true)}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          className="absolute left-10 top-0 h-10 bg-transparent pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
          style={{
            fontFamily: 'inherit',
            opacity: searchOpen ? 1 : 0,
            transition: 'opacity 200ms ease 100ms',
            width: 'calc(100% - 3.25rem)',
          }}
          tabIndex={searchOpen ? 0 : -1}
          onBlur={() => setSearchOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
        />
      </div>

      {/* Search icon */}
      <div
        className="group absolute left-0 top-0 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/[0.08]"
        onMouseDown={(e) => {
          e.preventDefault()
          setSearchOpen((prev) => !prev)
        }}
      >
        <img
          src="https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsearch.8f12a89e.png&w=1200&q=75&dpl=dpl_57sq3a4okDe2tVXZVSYu9FCcDV21"
          alt="Search"
          className="h-7 w-7 object-contain opacity-70 transition-transform duration-200 group-hover:scale-110"
        />
      </div>

      {/* Topic pills */}
      <div
        ref={containerRef}
        className="relative flex items-center gap-1.5"
        style={{ marginLeft: searchOpen ? '18.75rem' : '3rem', transition: 'margin-left 300ms ease-out' }}
      >
        {/* Sliding gold indicator */}
        <div
          className="pointer-events-none absolute top-0 z-0 h-8 rounded-full bg-gradient-to-b from-[#c8a44d]/15 to-[#c8a44d]/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 ease-out"
          style={{
            left: indicator.left,
            width: indicator.width,
            opacity: indicator.width > 0 ? 1 : 0,
          }}
        />

        {TOPICS.slice(0, -1).map((topic) => {
          const isActive = topic === activeTopic && !isInTopicsMenu

          return (
            <button
              key={topic}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => {
                navigate(getFeedUrl(topic))
                setTopicsOpen(false)
              }}
              className={cn(
                'relative z-10 inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-3.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'text-[#c8a44d]'
                  : 'text-white/60 hover:bg-gradient-to-b hover:from-white/[0.06] hover:to-white/[0.02] hover:text-white/80 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              )}
            >
              {topic}
            </button>
          )
        })}

        {/* Topics dropdown button */}
        <div className="relative">
          <button
            data-active={topicsOpen || isInTopicsMenu ? 'true' : 'false'}
            onClick={(e) => {
              e.stopPropagation()
              setTopicsOpen((prev) => !prev)
            }}
            className={cn(
              'relative z-10 inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-3.5 text-sm font-medium transition-all duration-200',
              topicsOpen || isInTopicsMenu
                ? 'text-[#c8a44d]'
                : 'text-white/60 hover:bg-gradient-to-b hover:from-white/[0.06] hover:to-white/[0.02] hover:text-white/80 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
            )}
          >
            {isInTopicsMenu ? (
              <span className="flex items-center gap-1.5">
                {activeTopic}
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c8a44d]" />
              </span>
            ) : (
              'Topics'
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn(
                'ml-1 inline-block transition-transform duration-200',
                topicsOpen && 'rotate-180'
              )}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {topicsOpen && (
            <div
              data-topics-dropdown
              className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-lg border border-white/[0.06] bg-[#141410] py-1 shadow-lg"
            >
            {TOPIC_MENU.map((group) => (
              <div key={group.category}>
                <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/30">
                  {group.category}
                </div>
                {group.items.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      navigate(getFeedUrl(item))
                      setTopicsOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center px-3 py-2 text-sm transition-colors',
                      item === activeTopic
                        ? 'bg-white/[0.03] text-[#c8a44d]'
                        : 'text-white/60 hover:bg-white/[0.03] hover:text-white/80'
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
