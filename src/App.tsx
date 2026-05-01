import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { Feed } from './pages/Feed'
import { Notifications } from './pages/Notifications'
import { Messages } from './pages/Messages'
import { Leaderboard } from './pages/Leaderboard'
import { Bookmarks } from './pages/Bookmarks'
import { Transactions } from './pages/Transactions'
import { Profile } from './pages/Profile'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Feed />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/user/:uuid" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
