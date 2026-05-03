import { Component, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { AppLayout } from './layouts/AppLayout'
import { Login } from './pages/Login'
import { Feed } from './pages/Feed'
import { Notifications } from './pages/Notifications'
import { Messages } from './pages/Messages'
import { Room } from './pages/Room'
import { Leaderboard } from './pages/Leaderboard'
import { Bookmarks } from './pages/Bookmarks'
import { Transactions } from './pages/Transactions'
import { Profile } from './pages/Profile'
import { PostDetailPage } from './pages/PostDetailPage'

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

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
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
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
