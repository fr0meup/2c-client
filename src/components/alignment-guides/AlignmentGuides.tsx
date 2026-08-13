import { useEffect, useState } from 'react'

const STORAGE_KEY = '2c_show_guides'

export function AlignmentGuides() {
  const [showGuides] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === '1'
  })
  const [pillLeft, setPillLeft] = useState<number | null>(null)
  const [feedTop, setFeedTop] = useState<number | null>(null)
  const [feedBottom, setFeedBottom] = useState<number | null>(null)
  const [meBottom, setMeBottom] = useState<number | null>(null)
  const [contentBounds, setContentBounds] = useState<{ left: number; right: number } | null>(null)
  const [sidebarBounds, setSidebarBounds] = useState<{ left: number; right: number } | null>(null)

  useEffect(() => {
    if (showGuides) {
      document.body.classList.add('show-alignment-guides')
    } else {
      document.body.classList.remove('show-alignment-guides')
    }
  }, [showGuides])

  useEffect(() => {
    if (!showGuides) return

    function updatePositions() {
      // 1. Vertical green guideline aligned with left edge of NetworthPill in postcards
      const pillEl = document.querySelector('[data-postcard-networth-pill]') || document.querySelector('[data-compose-networth-pill]') || document.querySelector('.user-meta-pill')
      if (pillEl) {
        const rect = pillEl.getBoundingClientRect()
        setPillLeft(rect.left)
      }

      // 2. Horizontal green guidelines aligned with top & bottom edges of highlighted Feed nav button
      const feedEl = document.querySelector('[data-feed-nav-item]')
      if (feedEl) {
        const rect = feedEl.getBoundingClientRect()
        setFeedTop(rect.top)
        setFeedBottom(rect.bottom)
      }

      // 3. Horizontal green guideline aligned with bottom edge of Me button
      const meEl = document.querySelector('[data-me-nav-item]')
      if (meEl) {
        const rect = meEl.getBoundingClientRect()
        setMeBottom(rect.bottom)
      }

      // 4. Dynamic red vertical guidelines for main content column left & right bounds
      const contentEl = document.querySelector('[data-content-column]') || document.querySelector('article')
      if (contentEl) {
        const rect = contentEl.getBoundingClientRect()
        setContentBounds({ left: rect.left, right: rect.right })
      }

      // 5. Dynamic red vertical guidelines for sidebar left & right bounds
      const sidebarEl = document.querySelector('[data-sidebar-column]') || document.querySelector('aside nav') || document.querySelector('aside')
      if (sidebarEl) {
        const rect = sidebarEl.getBoundingClientRect()
        setSidebarBounds({ left: rect.left, right: rect.right })
      }
    }

    updatePositions()
    window.addEventListener('resize', updatePositions)
    window.addEventListener('scroll', updatePositions, true)
    const interval = setInterval(updatePositions, 300)

    return () => {
      window.removeEventListener('resize', updatePositions)
      window.removeEventListener('scroll', updatePositions, true)
      clearInterval(interval)
    }
  }, [showGuides])

  if (!showGuides) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[998] overflow-hidden">
      {/* Horizontal header lines */}
      <div className="absolute left-0 right-0 top-[72px] h-px bg-red-600/40" />
      <div className="absolute left-0 right-0 top-0 h-px bg-red-600/40" />

      {/* Dynamic vertical green guideline (aligned with left edge of NetworthPill in postcards) */}
      {pillLeft !== null && (
        <div
          className="absolute bottom-0 top-0 w-px bg-emerald-500/90 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
          style={{ left: pillLeft }}
        />
      )}

      {/* Dynamic horizontal green guideline (aligned with TOP edge of highlighted Feed button) */}
      {feedTop !== null && (
        <div
          className="absolute left-0 right-0 h-px bg-emerald-500/90 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
          style={{ top: feedTop }}
        />
      )}

      {/* Dynamic horizontal green guideline (aligned with BOTTOM edge of highlighted Feed button) */}
      {feedBottom !== null && (
        <div
          className="absolute left-0 right-0 h-px bg-emerald-500/90 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
          style={{ top: feedBottom }}
        />
      )}

      {/* Dynamic horizontal green guideline (aligned with BOTTOM edge of Me button) */}
      {meBottom !== null && (
        <div
          className="absolute left-0 right-0 h-px bg-emerald-500/90 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
          style={{ top: meBottom }}
        />
      )}

      {/* Dynamic red vertical guidelines for sidebar left & right bounds */}
      {sidebarBounds && (
        <>
          <div className="absolute bottom-0 top-0 w-px bg-red-600/40" style={{ left: sidebarBounds.left }} />
          <div className="absolute bottom-0 top-0 w-px bg-red-600/40" style={{ left: sidebarBounds.right }} />
        </>
      )}

      {/* Dynamic red vertical guidelines for main content column left & right bounds */}
      {contentBounds && (
        <>
          <div className="absolute bottom-0 top-0 w-px bg-red-600/40" style={{ left: contentBounds.left }} />
          <div className="absolute bottom-0 top-0 w-px bg-red-600/40" style={{ left: contentBounds.right }} />
        </>
      )}
    </div>
  )
}
