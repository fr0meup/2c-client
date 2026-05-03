import { NotificationsFeed } from '@/components/notifications'
import { usePageLoad, NotificationsFeedSkeleton } from '@/components/skeleton'

export function Notifications() {
  const loading = usePageLoad()

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="w-full max-w-[670px] xl:-ml-[245px]">
        {loading ? <NotificationsFeedSkeleton /> : <NotificationsFeed />}
      </div>
    </div>
  )
}
