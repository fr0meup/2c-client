import { Component, Suspense, lazy, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { routeLoaders } from './lib/routePreload'

const AppLayout = lazy(routeLoaders.layout)
const Login = lazy(routeLoaders.login)
const Feed = lazy(routeLoaders.feed)
const Notifications = lazy(routeLoaders.notifications)
const Messages = lazy(routeLoaders.messages)
const Room = lazy(routeLoaders.room)
const Leaderboard = lazy(routeLoaders.leaderboard)
const Bookmarks = lazy(routeLoaders.bookmarks)
const Profile = lazy(routeLoaders.profile)
const PostDetailPage = lazy(routeLoaders.post)

function PageFallback() {
  return <div className="min-h-[calc(100vh-72px)] bg-[#0a0907]" />
}

function Transactions() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="flex w-full max-w-[670px] items-center justify-center xl:-ml-[245px]" style={{ minHeight: 'calc(100vh - 72px - 48px)' }}>
        <p className="text-sm font-medium text-white/40">Coming soon (I'm lying, this is probably never coming.)</p>
      </div>
    </div>
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

const SCROLL_CACHE_KEY = '__scroll_y'
const SCROLL_PATH_KEY = '__scroll_path'

export function saveScrollPosition() {
  sessionStorage.setItem(SCROLL_CACHE_KEY, String(document.body.scrollTop))
  sessionStorage.setItem(SCROLL_PATH_KEY, window.location.pathname)
}

function consumeScrollPosition(targetPath: string): number | null {
  const savedPath = sessionStorage.getItem(SCROLL_PATH_KEY)
  const raw = sessionStorage.getItem(SCROLL_CACHE_KEY)
  sessionStorage.removeItem(SCROLL_CACHE_KEY)
  sessionStorage.removeItem(SCROLL_PATH_KEY)
  if (raw == null || savedPath !== targetPath) return null
  return Number(raw)
}

function ScrollToTop() {
  const { pathname } = useLocation()
  const prevPath = useRef(pathname)

  useEffect(() => { window.history.scrollRestoration = 'manual' }, [])

  useLayoutEffect(() => {
    const prev = prevPath.current
    prevPath.current = pathname

    // Navigating back FROM post detail → restore cached position only if returning to the original page
    if (prev.startsWith('/post/') && !pathname.startsWith('/post/')) {
      const saved = consumeScrollPosition(pathname)
      if (saved != null) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.body.scrollTop = saved
          })
        })
        return
      }
    }

    document.body.scrollTop = 0
  }, [pathname])

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
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/bookmarks" element={<Bookmarks />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/user/:uuid" element={<Profile />} />
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
