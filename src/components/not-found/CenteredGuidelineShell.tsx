import { useEffect, useState, type ReactNode } from 'react'

export function CenteredGuidelineShell({ children }: { children: ReactNode }) {
  const [bounds, setBounds] = useState<{ feedTop: number; meBottom: number } | null>(null)

  useEffect(() => {
    function update() {
      const feedEl = document.querySelector('[data-feed-nav-item]')
      const meEl = document.querySelector('[data-me-nav-item]')
      if (feedEl && meEl) {
        setBounds({
          feedTop: feedEl.getBoundingClientRect().top,
          meBottom: meEl.getBoundingClientRect().bottom,
        })
      }
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const timer = setInterval(update, 300)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      clearInterval(timer)
    }
  }, [])

  const feedTop = bounds?.feedTop ?? 84
  const meBottom = bounds?.meBottom ?? 420
  const containerHeight = Math.max(280, meBottom - feedTop)
  const marginTop = Math.max(0, feedTop - 72)

  return (
    <div
      className="flex items-center justify-center px-4 sm:px-8 transition-all"
      style={{
        marginTop: `${marginTop}px`,
        height: `${containerHeight}px`,
      }}
    >
      <div className="w-full max-w-[670px] xl:-ml-[245px]" data-content-column>
        {children}
      </div>
    </div>
  )
}
