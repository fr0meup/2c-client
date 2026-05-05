import { Suspense, lazy } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { headerLoaders } from '@/lib/routePreload'

const FeedFilters = lazy(headerLoaders.feed)
const PostDetailHeader = lazy(headerLoaders.post)
const NotificationsHeader = lazy(headerLoaders.notifications)
const ProfileHeader = lazy(headerLoaders.profile)
const ChatHeader = lazy(headerLoaders.room)
const MessagesListHeader = lazy(headerLoaders.messages)
const LeaderboardHeader = lazy(headerLoaders.leaderboard)

function isFeedPath(pathname: string, search: string): boolean {
  return pathname === '/' || new URLSearchParams(search).has('feed')
}

function isPostDetailPath(pathname: string): boolean {
  return pathname.startsWith('/post/')
}

function isNotificationsPath(pathname: string): boolean {
  return pathname.startsWith('/notifications')
}

function isProfilePath(pathname: string): boolean {
  return pathname.startsWith('/user/')
}

function isRoomPath(pathname: string): boolean {
  return pathname.startsWith('/room/')
}

function isMessagesListPath(pathname: string): boolean {
  return pathname === '/messages'
}

function isBookmarksPath(pathname: string): boolean {
  return pathname === '/bookmarks'
}

function isTransactionsPath(pathname: string): boolean {
  return pathname === '/transactions'
}

function isLeaderboardPath(pathname: string): boolean {
  return pathname === '/leaderboard'
}

function PageHeader({ title }: { title: string }) {
  const navigate = useNavigate()

  return (
    <div className="relative flex h-10 items-center justify-between">
      <button
        onClick={() => navigate(-1)}
        title="Back"
        className="group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/70 transition-colors hover:bg-gradient-to-b hover:from-white/[0.09] hover:to-white/[0.04] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={2.2} />
      </button>

      <span className="text-sm font-semibold text-white/80">{title}</span>

      {/* Spacer to keep title centered */}
      <div className="h-10 w-10 shrink-0" />
    </div>
  )
}

/** Left side — fixed, stays on screen when scrolling */
export function HeaderLeft() {
  return (
    <header
      className="fixed left-0 top-0 z-50 hidden h-[72px] bg-[#0a0907] xl:flex"
      style={{ width: 'calc(50% - 372px)' }}
    >
      <div className="fixed top-0 flex h-[72px] w-60 items-start justify-start pl-7 pt-6" style={{ left: 'calc(50% - 600px)' }}>
        <img
          src="https://www.twocents.money/_next/image?url=%2F2centsLogo.png&w=1920&q=75"
          alt="2C Feed"
          className="h-12 object-contain"
        />
      </div>
    </header>
  )
}

/** Right side — scrolls with the page */
export function HeaderRight() {
  const location = useLocation()
  const showFilters = isFeedPath(location.pathname, location.search)
  const showPostDetail = isPostDetailPath(location.pathname)
  const showNotifications = isNotificationsPath(location.pathname)
  const showProfile = isProfilePath(location.pathname)
  const showRoom = isRoomPath(location.pathname)
  const showMessagesList = isMessagesListPath(location.pathname)
  const showBookmarks = isBookmarksPath(location.pathname)
  const showTransactions = isTransactionsPath(location.pathname)
  const showLeaderboard = isLeaderboardPath(location.pathname)

  return (
    <div
      className={`flex h-[72px] w-full items-end justify-center bg-[#0a0907] px-4 sm:px-8 ${
        showRoom ? 'sticky top-0 z-30' : ''
      }`}
    >
      <div className="w-full max-w-[670px] xl:-ml-[245px]">
        <Suspense fallback={<div className="h-10" />}>
          {showFilters && <FeedFilters />}
          {showPostDetail && <PostDetailHeader />}
          {showNotifications && <NotificationsHeader />}
          {showProfile && <ProfileHeader />}
          {showRoom && <ChatHeader />}
          {showMessagesList && <MessagesListHeader />}
          {showBookmarks && <PageHeader title="Bookmarks" />}
          {showTransactions && <PageHeader title="Transactions" />}
          {showLeaderboard && <LeaderboardHeader />}
        </Suspense>
      </div>
    </div>
  )
}
