import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import { ComposePost } from '@/components/compose-post'
import { NotificationsProvider } from '@/components/notifications'
import { MessagesProvider } from '@/components/messages'
import { FollowProvider } from '@/components/profile'
import { LeaderboardProvider } from '@/components/leaderboard'
import { ToastProvider } from '@/components/toast/ToastContext'
import { Sidebar, BottomNav } from '@/components/sidebar/Sidebar'
import { HeaderLeft, HeaderRight } from './Header'
import type { PostCardData } from '@/components/post-card/types'
import { useAuthLogin } from '@/hooks/useAuthLogin'

// ── Compose context so any component can open the compose modal ──
interface ComposeCtx {
  openCompose: () => void
  openQuote: (post: PostCardData) => void
}
const ComposeContext = createContext<ComposeCtx>({ openCompose: () => {}, openQuote: () => {} })
export function useCompose() { return useContext(ComposeContext) }

export function AppLayout() {
  useAuthLogin()
  // const [guidesEnabled, setGuidesEnabled] = useState(true)
  const [composeOpen, setComposeOpen] = useState(false)
  const [quotedPost, setQuotedPost] = useState<PostCardData | null>(null)

  const openCompose = useCallback(() => { setQuotedPost(null); setComposeOpen(true) }, [])
  const openQuote = useCallback((post: PostCardData) => { setQuotedPost(post); setComposeOpen(true) }, [])
  const closeCompose = useCallback(() => { setComposeOpen(false); setQuotedPost(null) }, [])

  useEffect(() => {
    if (!composeOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeCompose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [composeOpen, closeCompose])

  return (
    <ToastProvider>
    <NotificationsProvider>
    <MessagesProvider>
    <FollowProvider>
    <LeaderboardProvider>
    <div className="min-h-screen bg-[#0a0907] pb-[88px] xl:pb-0">
      <HeaderLeft onToggleGuides={() => {}} guidesEnabled={false} />
      {/* {guidesEnabled && (
        <div className="hidden xl:block">
          <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 h-px bg-red-500/30" />
          <div className="pointer-events-none fixed left-0 right-0 top-[84px] z-40 h-px bg-red-500/30" />
          <div className="pointer-events-none fixed bottom-0 left-[calc(50%-588px)] top-0 z-[60] w-px bg-red-500/30" />
          <div className="pointer-events-none fixed bottom-0 left-[calc(50%-372px)] top-0 z-[60] w-px bg-red-500/30" />
          <div className="pointer-events-none fixed bottom-[70px] left-0 right-0 z-40 h-px bg-red-500/30" />
          <div className="pointer-events-none fixed bottom-0 left-[calc(50%-338px)] top-0 z-[60] w-px bg-red-500/30" />
          <div className="pointer-events-none fixed bottom-0 left-[calc(50%+332px)] top-0 z-[60] w-px bg-red-500/30" />
        </div>
      )} */}
      <Sidebar onNewPostClick={openCompose} />
      <BottomNav onNewPostClick={openCompose} />
      <ComposeContext.Provider value={{ openCompose, openQuote }}>
      <div className="xl:ml-60">
        <HeaderRight />
        <main className="bg-[#0a0907] min-h-screen">
          <Outlet />
        </main>
      </div>
      </ComposeContext.Provider>

      {composeOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={closeCompose}
          />
          <div className="relative z-10 w-full max-w-[600px] mx-4 max-h-[90vh]">
            <div className="rounded-xl bg-[#141410]">
              <ComposePost onClose={closeCompose} scrollHeight={360} quotedPost={quotedPost} />
            </div>
          </div>
        </div>
      )}
    </div>
    </LeaderboardProvider>
    </FollowProvider>
    </MessagesProvider>
    </NotificationsProvider>
    </ToastProvider>
  )
}
