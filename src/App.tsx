import { useEffect } from 'react'
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
  )
}

export default App
