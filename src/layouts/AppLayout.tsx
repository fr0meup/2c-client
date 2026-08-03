import { Suspense, lazy, useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Outlet, useLocation } from 'react-router-dom'
import { NotificationsProvider } from '@/components/notifications/NotificationsContext'
import { MessagesProvider } from '@/components/messages/MessagesContext'
import { FollowProvider } from '@/components/profile/FollowContext'
import { LeaderboardProvider } from '@/components/leaderboard/config'
import { ToastProvider } from '@/components/toast/ToastContext'
import { Sidebar, BottomNav } from '@/components/sidebar/Sidebar'
import { HeaderLeft, HeaderRight } from './Header'
import type { PostCardData } from '@/components/post-card/types'
import { ONBOARDING_KEY } from '@/components/onboarding/constants'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { rpc } from '@/lib/api'
import { NAVIGATION_PENDING_EVENT } from '@/lib/navigationPending'
import { seedAuthLoginCache } from '@/hooks/useMyRank'
import type { AuthLoginResponse } from '@/lib/types'
import {
  LeaderboardContentSkeleton,
  MessagesListSkeleton,
  NotificationsFeedSkeleton,
  PostCardSkeleton,
  PostDetailSkeleton,
  ProfileSkeleton,
  Skeleton,
} from '@/components/skeleton/Skeleton'

const ComposePost = lazy(() => import('@/components/compose-post/ComposePost').then((m) => ({ default: m.ComposePost })))
const OnboardingTutorial = lazy(() => import('@/components/onboarding/OnboardingTutorial').then((m) => ({ default: m.OnboardingTutorial })))

// ── Compose context so any component can open the compose modal ──
interface ComposeCtx {
  openCompose: () => void
  openQuote: (post: PostCardData) => void
}
const ComposeContext = createContext<ComposeCtx>({ openCompose: () => {}, openQuote: () => {} })
export function useCompose() { return useContext(ComposeContext) }

function CenteredPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="w-full max-w-[670px] space-y-4 xl:-ml-[245px]">
        {children}
      </div>
    </div>
  )
}

function PageSkeletonFallback({ pathname: pathnameProp }: { pathname?: string }) {
  const location = useLocation()
  const pathname = pathnameProp ?? location.pathname

  if (pathname.startsWith('/user/')) return <ProfileSkeleton />
  if (pathname.startsWith('/post/')) {
    return (
      <CenteredPageShell>
        <PostDetailSkeleton />
      </CenteredPageShell>
    )
  }
  if (pathname === '/notifications') {
    return (
      <CenteredPageShell>
        <NotificationsFeedSkeleton />
      </CenteredPageShell>
    )
  }
  if (pathname === '/messages' || pathname.startsWith('/room/')) return <MessagesListSkeleton />
  if (pathname === '/leaderboard') {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
        <div className="flex w-full max-w-[670px] flex-col gap-4 xl:-ml-[245px]">
          <LeaderboardContentSkeleton />
        </div>
      </div>
    )
  }
  if (pathname === '/transactions') {
    return (
      <CenteredPageShell>
        <Skeleton className="mx-auto mt-20 h-4 w-52" />
      </CenteredPageShell>
    )
  }
  if (pathname === '/') {
    return (
      <CenteredPageShell>
        <Suspense fallback={<Skeleton className="h-[260px] rounded-2xl" />}>
          <ComposePost defaultTopic="New" />
        </Suspense>
        {[...Array(4)].map((_, i) => <PostCardSkeleton key={i} />)}
      </CenteredPageShell>
    )
  }
  return (
    <CenteredPageShell>
      {[...Array(4)].map((_, i) => <PostCardSkeleton key={i} />)}
    </CenteredPageShell>
  )
}

function useAuthLogin() {
  const { auth, logout } = useAuth()
  const qc = useQueryClient()
  const called = useRef(false)

  useEffect(() => {
    if (!auth || called.current) return
    called.current = true

    rpc<AuthLoginResponse>(
      '/v2/auth/login',
      { version: 'web-v0.1.3', secret_key: auth.secretKey },
      auth.token,
      auth.userUuid,
    )
      .then((res) => seedAuthLoginCache(qc, res))
      .catch((err) => {
        console.warn('[useAuthLogin] /v2/auth/login failed, logging out:', err)
        logout()
      })
  }, [auth, logout, qc])
}

export function AppLayout() {
  useAuthLogin()
  const location = useLocation()
  const [composeOpen, setComposeOpen] = useState(false)
  const [quotedPost, setQuotedPost] = useState<PostCardData | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [pendingPath, setPendingPath] = useState<string | null>(null)

  const openCompose = useCallback(() => { setQuotedPost(null); setComposeOpen(true) }, [])
  const openQuote = useCallback((post: PostCardData) => { setQuotedPost(post); setComposeOpen(true) }, [])
  const closeCompose = useCallback(() => { setComposeOpen(false); setQuotedPost(null) }, [])
  const showBottomNav = !location.pathname.startsWith('/room/') && !location.pathname.startsWith('/post/')

  useEffect(() => {
    if (!composeOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeCompose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [composeOpen, closeCompose])

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY) === '1') return
    const win = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void }
    if (win.requestIdleCallback) {
      const id = win.requestIdleCallback(() => setShowOnboarding(true))
      return () => win.cancelIdleCallback?.(id)
    }
    const id = window.setTimeout(() => setShowOnboarding(true), 500)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!pendingPath) return
    if (location.pathname !== pendingPath) return
    const frame = window.requestAnimationFrame(() => {
      setPendingPath(null)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname, location.search, pendingPath])

  useEffect(() => {
    function handlePending(e: Event) {
      const detail = (e as CustomEvent<{ pathname?: string }>).detail
      if (detail?.pathname && detail.pathname !== location.pathname) {
        flushSync(() => {
          setPendingPath(detail.pathname!)
        })
      }
    }
    window.addEventListener(NAVIGATION_PENDING_EVENT, handlePending)
    return () => window.removeEventListener(NAVIGATION_PENDING_EVENT, handlePending)
  }, [location.pathname])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const target = e.target instanceof Element ? e.target.closest('a[href]') : null
      if (!(target instanceof HTMLAnchorElement)) return
      if (target.hasAttribute('download') || target.download || target.href.startsWith('blob:')) return
      const url = new URL(target.href, window.location.href)
      if (url.protocol === 'blob:' || url.origin !== window.location.origin) return
      const next = `${url.pathname}${url.search}`
      const current = `${location.pathname}${location.search}`
      if (next !== current && url.pathname !== location.pathname) {
        flushSync(() => {
          setPendingPath(url.pathname)
        })
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [location.pathname, location.search])

  return (
    <ToastProvider>
    <NotificationsProvider>
    <MessagesProvider>
    <FollowProvider>
    <LeaderboardProvider>
    <div className={`min-h-screen bg-[#0a0907] ${showBottomNav ? 'pb-[88px] xl:pb-0' : 'pb-0'}`}>
      <HeaderLeft />
      <Sidebar onNewPostClick={openCompose} />
      {showBottomNav && <BottomNav onNewPostClick={openCompose} />}
      <ComposeContext.Provider value={{ openCompose, openQuote }}>
      <div className="xl:ml-60">
        <HeaderRight />
        <main className="min-h-[calc(100vh-72px)] bg-[#0a0907]">
          {pendingPath ? (
            <PageSkeletonFallback pathname={pendingPath} />
          ) : (
            <Suspense fallback={<PageSkeletonFallback />}>
              <div key={location.pathname}>
                <Outlet />
              </div>
            </Suspense>
          )}
        </main>
      </div>
      </ComposeContext.Provider>

      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingTutorial />
        </Suspense>
      )}

      {composeOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={closeCompose}
          />
          <div className="relative z-10 mx-3 w-full max-w-[600px] max-h-[92svh] sm:mx-4">
            <div className="rounded-xl bg-[#141410]">
              <Suspense fallback={<div className="h-[360px] rounded-xl bg-[#141410]" />}>
                <ComposePost onClose={closeCompose} scrollHeight={360} quotedPost={quotedPost} />
              </Suspense>
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
