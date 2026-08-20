import { Component, Suspense, lazy, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { routeLoaders } from './lib/routePreload'

const AppLayout = lazy(routeLoaders.layout)
const Login = lazy(routeLoaders.login)
const Feed = lazy(routeLoaders.feed)
const Notifications = lazy(routeLoaders.notifications)
const Messages = lazy(routeLoaders.messages)
const Room = lazy(routeLoaders.room)
const JoinRoom = lazy(routeLoaders.joinRoom)
const Leaderboard = lazy(routeLoaders.leaderboard)
const Bookmarks = lazy(routeLoaders.bookmarks)
const Profile = lazy(routeLoaders.profile)
const PostDetailPage = lazy(routeLoaders.post)
const NotFoundPage = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFoundPage })))

import { CenteredGuidelineShell } from './components/not-found/CenteredGuidelineShell'

function PageFallback() {
  return <div className="min-h-[calc(100vh-72px)] bg-[#0a0907]" />
}

function Transactions() {
  return (
    <CenteredGuidelineShell>
      <div className="flex items-center justify-center py-6">
        <p className="text-sm font-medium text-white/40">Coming soon (I'm lying, this is probably never coming.)</p>
      </div>
    </CenteredGuidelineShell>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0907] px-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-white/70">Something went wrong</p>
            <p className="mt-2 text-sm text-white/40">An unexpected error occurred.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => { this.setState({ hasError: false }); window.history.back() }}
                className="rounded-lg bg-white/[0.08] px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.12] hover:text-white"
              >
                Go back
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-[#c8a44d]/20 px-4 py-2 text-sm font-semibold text-[#c8a44d] transition-colors hover:bg-[#c8a44d]/30"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Scroll position management ──
interface ScrollTarget {
  y: number
  postUuid?: string
  viewportOffset?: number
}

const scrollMap = new Map<string, ScrollTarget>()
const scrollMapByPath = new Map<string, ScrollTarget>()
const lockedKeys = new Set<string>()
let _currentLocationKey = ''
let _currentPathKey = ''
let isRestoringScroll = false

function getPageScrollTop() {
  return Math.max(
    window.scrollY,
    document.documentElement.scrollTop,
    document.body.scrollTop,
  )
}

function setPageScrollTop(y: number) {
  document.documentElement.scrollTop = y
  document.body.scrollTop = y
  window.scrollTo(0, y)
}

export function saveScrollPosition(postUuid?: string) {
  const y = getPageScrollTop()
  let targetPostUuid = postUuid
  let viewportOffset: number | undefined

  if (targetPostUuid) {
    const el = document.getElementById(`post-${targetPostUuid}`) || document.querySelector(`[data-post-uuid="${targetPostUuid}"]`)
    if (el) {
      viewportOffset = el.getBoundingClientRect().top
    }
  }

  if (viewportOffset === undefined) {
    // Find topmost visible post in the viewport
    const cards = document.querySelectorAll<HTMLElement>('[data-post-uuid]')
    for (const card of cards) {
      const rect = card.getBoundingClientRect()
      if (rect.bottom > 80 && rect.top < window.innerHeight) {
        targetPostUuid = card.dataset.postUuid
        viewportOffset = rect.top
        break
      }
    }
  }

  const target: ScrollTarget = { y, postUuid: targetPostUuid, viewportOffset }

  if (_currentLocationKey) {
    if (y > 0 || targetPostUuid) {
      scrollMap.set(_currentLocationKey, target)
    }
    lockedKeys.add(_currentLocationKey)
  }
  if (_currentPathKey && (y > 0 || targetPostUuid)) {
    scrollMapByPath.set(_currentPathKey, target)
  }
}

export function clearScrollPosition(path = '/') {
  scrollMapByPath.delete(path)
  if (path === '/') {
    for (const key of Array.from(scrollMapByPath.keys())) {
      if (key === '/' || key.startsWith('/?')) {
        scrollMapByPath.delete(key)
      }
    }
  }
}

function restoreScrollPosition(target: ScrollTarget | number) {
  const targetY = typeof target === 'number' ? target : target.y
  const targetPostUuid = typeof target === 'object' ? target.postUuid : undefined
  const targetViewportOffset = typeof target === 'object' ? target.viewportOffset : undefined

  isRestoringScroll = true

  const align = () => {
    if (targetPostUuid) {
      const el = document.getElementById(`post-${targetPostUuid}`) || document.querySelector(`[data-post-uuid="${targetPostUuid}"]`)
      if (el) {
        const currentTop = el.getBoundingClientRect().top
        const desiredOffset = targetViewportOffset ?? 80
        const diff = currentTop - desiredOffset
        if (Math.abs(diff) > 1) {
          setPageScrollTop(getPageScrollTop() + diff)
        }
        return
      }
    }

    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
      document.body.scrollHeight - window.innerHeight,
    )
    if (maxScroll >= targetY - 20) {
      setPageScrollTop(targetY)
    } else if (maxScroll > 0) {
      setPageScrollTop(Math.min(targetY, maxScroll))
    }
  }

  align()

  let animationFrameId: number | null = null
  let resizeObserver: ResizeObserver | null = null
  let mutationObserver: MutationObserver | null = null
  let isDone = false

  const cleanup = () => {
    if (isDone) return
    isDone = true
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
    if (resizeObserver) resizeObserver.disconnect()
    if (mutationObserver) mutationObserver.disconnect()
    window.removeEventListener('wheel', onUserInteract)
    window.removeEventListener('touchmove', onUserInteract)
    window.removeEventListener('keydown', onUserInteract)
    setTimeout(() => {
      isRestoringScroll = false
    }, 150)
  }

  // Release control immediately if user manually interacts
  const onUserInteract = () => {
    cleanup()
  }

  window.addEventListener('wheel', onUserInteract, { passive: true })
  window.addEventListener('touchmove', onUserInteract, { passive: true })
  window.addEventListener('keydown', onUserInteract, { passive: true })

  let attempts = 0
  const maxAttempts = 75 // ~1.2s

  const step = () => {
    if (isDone) return
    attempts++
    align()

    if (attempts < maxAttempts) {
      animationFrameId = requestAnimationFrame(step)
    } else {
      cleanup()
    }
  }

  animationFrameId = requestAnimationFrame(step)

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (isDone) return
      align()
    })
    if (document.documentElement) resizeObserver.observe(document.documentElement)
    if (document.body) resizeObserver.observe(document.body)
  }

  if (typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver(() => {
      if (isDone) return
      align()
    })
    const root = document.getElementById('root') || document.body
    if (root) {
      mutationObserver.observe(root, { childList: true, subtree: true })
    }
  }

  const timeoutId = setTimeout(cleanup, 1200)

  return () => {
    clearTimeout(timeoutId)
    cleanup()
  }
}

function ScrollToTop() {
  const location = useLocation()
  const navType = useNavigationType()
  const prevKeyRef = useRef(_currentLocationKey)
  const prevPathRef = useRef(_currentPathKey)

  useEffect(() => {
    window.history.scrollRestoration = 'manual'

    const onScroll = () => {
      if (isRestoringScroll) return
      const y = getPageScrollTop()
      if (y > 0) {
        if (_currentLocationKey && !lockedKeys.has(_currentLocationKey)) {
          scrollMap.set(_currentLocationKey, { y })
        }
        if (_currentPathKey) {
          scrollMapByPath.set(_currentPathKey, { y })
        }
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    const prevKey = prevKeyRef.current
    const prevPath = prevPathRef.current
    const currKey = location.key ?? ''
    const currPath = location.pathname + location.search

    if (prevKey && prevKey !== currKey && !isRestoringScroll) {
      if (!lockedKeys.has(prevKey)) {
        const y = getPageScrollTop()
        if (y > 0) {
          scrollMap.set(prevKey, { y })
          if (prevPath) scrollMapByPath.set(prevPath, { y })
        }
        lockedKeys.add(prevKey)
      }
    }

    _currentLocationKey = currKey
    _currentPathKey = currPath
    prevKeyRef.current = currKey
    prevPathRef.current = currPath
    lockedKeys.clear()

    if (navType === 'POP') {
      const saved = scrollMap.get(currKey) ?? scrollMapByPath.get(currPath)
      if (saved != null && (saved.y > 0 || saved.postUuid)) {
        return restoreScrollPosition(saved)
      }
    }

    setPageScrollTop(0)
  }, [location.key, location.pathname, location.search, navType])

  return null
}

function RequireAuth() {
  const { auth } = useAuth()
  if (!auth) return <Navigate to="/login" replace />
  return <Outlet />
}

function RedirectIfAuth() {
  const { auth } = useAuth()
  if (auth) return <Navigate to="/" replace />
  return <Login />
}

function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<RedirectIfAuth />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Feed />} />
                <Route path="/post/:uuid" element={<PostDetailPage />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/room/:uuid" element={<Room />} />
                <Route path="/join/:roomUuid/:roomCode" element={<JoinRoom />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/bookmarks" element={<Bookmarks />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/user/:uuid" element={<Profile />} />
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
