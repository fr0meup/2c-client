import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from './NotificationsContext'
import { FILTER_TABS } from './config'
import type { FilterTab } from './types'

export function NotificationsHeader() {
  const navigate = useNavigate()
  const { filter, setFilter, counts, unreadCount, markAllRead } = useNotifications()

  const tabsRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const container = tabsRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>('[data-active="true"]')
    if (!active) return

    const update = () => {
      const cRect = container.getBoundingClientRect()
      const aRect = active.getBoundingClientRect()
      setIndicator({ left: aRect.left - cRect.left, width: aRect.width })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(active)
    ro.observe(container)
    return () => ro.disconnect()
  }, [filter])

  return (
    <div className="relative flex h-10 items-center justify-between">
      {/* Back button — flush left, mirrors the search-icon slot in FeedFilters */}
      <button
        onClick={() => navigate(-1)}
        title="Back"
        className="group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/70 transition-colors hover:bg-gradient-to-b hover:from-white/[0.09] hover:to-white/[0.04] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={2.2} />
      </button>

      {/* Filter pill — centered */}
      <div ref={tabsRef} className="relative flex items-center gap-1">
        <div
          className="pointer-events-none absolute top-0 z-0 h-8 rounded-full bg-gradient-to-b from-[#c8a44d]/15 to-[#c8a44d]/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 ease-out"
          style={{
            left: indicator.left,
            width: indicator.width,
            opacity: indicator.width > 0 ? 1 : 0,
          }}
        />
        {FILTER_TABS.map((tab) => {
          const isActive = tab.value === filter
          return (
            <button
              key={tab.value}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => setFilter(tab.value as FilterTab)}
              className={cn(
                'relative z-10 inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-3.5 text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'text-[#c8a44d]'
                  : 'text-white/60 hover:bg-gradient-to-b hover:from-white/[0.06] hover:to-white/[0.02] hover:text-white/80 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              )}
            >
              <span className="flex items-center gap-1.5">
                {tab.label}
                {tab.value !== 'all' && counts[tab.value] > 0 && (
                  <span
                    className={cn(
                      'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none tabular-nums',
                      isActive ? 'bg-[#c8a44d] text-[#0f0e0a]' : 'bg-white/10 text-white/70'
                    )}
                  >
                    {counts[tab.value]}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Mark all read — flush right */}
      <button
        onClick={markAllRead}
        disabled={unreadCount === 0}
        title="Mark all as read"
        className="group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/70 transition-colors hover:bg-gradient-to-b hover:from-white/[0.09] hover:to-white/[0.04] hover:text-[#c8a44d] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] disabled:cursor-default disabled:opacity-30 disabled:hover:bg-white/[0.06] disabled:hover:text-white/70"
      >
        <CheckCheck className="h-4 w-4" strokeWidth={2.2} />
      </button>
    </div>
  )
}
