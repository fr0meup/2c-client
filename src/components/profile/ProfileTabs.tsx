import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ProfileTab } from './UserProfile'

const ALL_TABS: { value: ProfileTab; label: string }[] = [
  { value: 'posts', label: 'Posts' },
  { value: 'comments', label: 'Comments' },
  { value: 'votes', label: 'Votes' },
  { value: 'picks', label: 'Picks' },
]

const OWN_ONLY_TABS = new Set<ProfileTab>(['votes', 'picks'])

interface Props {
  active: ProfileTab
  onChange: (tab: ProfileTab) => void
  isOwnProfile?: boolean
}

export function ProfileTabs({ active, onChange, isOwnProfile = true }: Props) {
  const TABS = isOwnProfile ? ALL_TABS : ALL_TABS.filter((t) => !OWN_ONLY_TABS.has(t.value))
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const activeBtn = container.querySelector<HTMLElement>('[data-active="true"]')
    if (!activeBtn) return
    const update = () => {
      const cRect = container.getBoundingClientRect()
      const aRect = activeBtn.getBoundingClientRect()
      setIndicator({ left: aRect.left - cRect.left, width: aRect.width })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(activeBtn)
    ro.observe(container)
    return () => ro.disconnect()
  }, [active])

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      <div
        className="pointer-events-none absolute top-0 z-0 h-8 rounded-full bg-gradient-to-b from-[#c8a44d]/15 to-[#c8a44d]/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 ease-out"
        style={{
          transform: `translate3d(${indicator.left}px, 0, 0)`,
          width: indicator.width,
          opacity: indicator.width > 0 ? 1 : 0,
          willChange: 'transform, width',
        }}
      />
      {TABS.map((tab) => {
        const isActive = active === tab.value
        return (
          <button
            key={tab.value}
            data-active={isActive ? 'true' : 'false'}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative z-10 inline-flex h-8 cursor-pointer items-center justify-center rounded-full px-3.5 text-sm font-medium transition-colors duration-200',
              isActive
                ? 'text-[#c8a44d]'
                : 'text-white/60 hover:bg-gradient-to-b hover:from-white/[0.06] hover:to-white/[0.02] hover:text-white/80 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
