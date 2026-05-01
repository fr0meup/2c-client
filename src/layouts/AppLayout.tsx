import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { ComposePost } from '@/components/compose-post'
import { Sidebar, BottomNav } from '@/components/sidebar/Sidebar'
import { HeaderLeft, HeaderRight } from './Header'

export function AppLayout() {
  const [guidesEnabled, setGuidesEnabled] = useState(true)
  const [composeOpen, setComposeOpen] = useState(false)

  useEffect(() => {
    if (!composeOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setComposeOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [composeOpen])

  return (
    <div className="min-h-screen pb-[88px] xl:pb-0">
      <HeaderLeft onToggleGuides={() => setGuidesEnabled((v) => !v)} guidesEnabled={guidesEnabled} />
      {guidesEnabled && (
        <div className="hidden xl:block">
          <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 h-px bg-red-500/30" />
          <div className="pointer-events-none fixed left-0 right-0 top-[84px] z-40 h-px bg-red-500/30" />
          <div className="pointer-events-none fixed bottom-0 left-[calc(50%-588px)] top-0 z-[60] w-px bg-red-500/30" />
          <div className="pointer-events-none fixed bottom-0 left-[calc(50%-372px)] top-0 z-[60] w-px bg-red-500/30" />
          <div className="pointer-events-none fixed bottom-[70px] left-0 right-0 z-40 h-px bg-red-500/30" />
          <div className="pointer-events-none fixed bottom-0 left-[calc(50%-338px)] top-0 z-[60] w-px bg-red-500/30" />
          <div className="pointer-events-none fixed bottom-0 left-[calc(50%+332px)] top-0 z-[60] w-px bg-red-500/30" />
        </div>
      )}
      <Sidebar onNewPostClick={() => setComposeOpen(true)} />
      <BottomNav onNewPostClick={() => setComposeOpen(true)} />
      <div className="xl:ml-60">
        <HeaderRight />
        <main>
          <Outlet />
        </main>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setComposeOpen(false)}
          />
          <div className="relative z-10 w-full max-w-[600px] mx-4 max-h-[90vh]">
            <div className="rounded-xl bg-[#141410]">
              <ComposePost onClose={() => setComposeOpen(false)} scrollHeight={360} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
