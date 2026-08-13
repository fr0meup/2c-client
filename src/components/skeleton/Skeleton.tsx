import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-white/[0.06]',
        className
      )}
    />
  )
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      {/* Title */}
      <Skeleton className="mt-3 h-5 w-3/4" />
      {/* Body lines */}
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-5/6" />
      <Skeleton className="mt-1.5 h-4 w-2/3" />
      {/* Bottom row */}
      <div className="mt-4 flex items-center gap-2.5">
        <Skeleton className="h-[38px] flex-1 rounded-full" />
        <Skeleton className="h-[38px] w-24 rounded-full" />
        <Skeleton className="h-[38px] w-28 rounded-full" />
      </div>
    </div>
  )
}

export function PostDetailSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pb-6 sm:px-8">
      <div className="w-full max-w-[670px] xl:-ml-[245px]" data-content-column>
        <div className="flex flex-col">
          <div className="pb-4 pt-1.5">
            {/* Author row */}
            <div className="mt-1.5 flex items-center gap-2">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
            {/* Title */}
            <Skeleton className="mt-3.5 h-6 w-3/4" />
            {/* Body */}
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-1.5 h-4 w-5/6" />
            <Skeleton className="mt-1.5 h-4 w-2/3" />
            {/* Bottom bar */}
            <div className="mt-4 flex items-center gap-2.5">
              <Skeleton className="h-[38px] flex-1 rounded-full" />
              <Skeleton className="h-[38px] w-24 rounded-full" />
              <Skeleton className="h-[38px] w-28 rounded-full" />
            </div>
            <div className="mt-4 h-px bg-white/[0.06]" />
          </div>
          {/* Comment input */}
          <div className="pt-1 pb-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-10 w-full rounded-full" />
          </div>
          {/* Comments */}
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-3 py-3">
              <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function NotificationItemSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] px-4 py-3.5">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-3.5 w-5/6" />
      </div>
    </div>
  )
}

export function NotificationsFeedSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[...Array(6)].map((_, i) => (
        <NotificationItemSkeleton key={i} />
      ))}
    </div>
  )
}

export function RoomCardSkeleton() {
  return (
    <div className="flex min-h-[120px] flex-col rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3.5 w-3.5 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-3">
        <Skeleton className="h-3 w-4/5" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  )
}

export function DMRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] px-4 py-3.5">
      <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="mt-1.5 h-3.5 w-3/4" />
      </div>
    </div>
  )
}

export function MessagesListSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="flex w-full max-w-[670px] flex-col gap-5 xl:-ml-[245px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <RoomCardSkeleton key={i} />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="ml-2 h-px flex-1" />
          </div>
          {[...Array(3)].map((_, i) => (
            <DMRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="flex w-full max-w-[670px] flex-col gap-4 xl:-ml-[245px]">
        {/* Identity panel */}
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] px-4 pb-5 pt-4 shadow-lg shadow-black/20">
          {/* Chart area */}
          <Skeleton className="h-40 w-full rounded-xl" />
          {/* Bio */}
          <Skeleton className="mx-auto mt-4 h-4 w-3/5" />
          {/* Stats row */}
          <div className="mt-4 flex items-center justify-center gap-5">
            <Skeleton className="h-4 w-20" />
            <span className="h-4 w-px bg-white/10" />
            <Skeleton className="h-4 w-20" />
            <span className="h-4 w-px bg-white/10" />
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Meta pill */}
          <div className="mt-4 flex items-center justify-center">
            <Skeleton className="h-10 w-64 rounded-full" />
          </div>
        </section>
        {/* Tabs */}
        <div className="flex items-center justify-center pt-1">
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
        {/* Post cards */}
        {[...Array(3)].map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function LeaderboardContentSkeleton() {
  return (
    <>
      {/* Podium skeleton */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#141410] to-[#0a0907] px-3 pb-0 pt-5">
        <div className="flex items-end justify-center gap-1.5">
          <div className="flex flex-1 flex-col items-center">
            <div className="flex flex-col items-center gap-1.5 pb-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-full" />
            </div>
            <Skeleton className="h-20 w-full rounded-t-xl" />
          </div>
          <div className="flex flex-1 flex-col items-center">
            <div className="flex flex-col items-center gap-1.5 pb-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-8 w-36 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-28 w-full rounded-t-xl" />
          </div>
          <div className="flex flex-1 flex-col items-center">
            <div className="flex flex-col items-center gap-1.5 pb-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-full" />
            </div>
            <Skeleton className="h-14 w-full rounded-t-xl" />
          </div>
        </div>
      </div>
      {/* List skeleton */}
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
          <Skeleton className="h-5 w-6 rounded" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-8 w-40 rounded-full" />
            </div>
            <Skeleton className="mt-1.5 h-3 w-3/5" />
          </div>
          <Skeleton className="h-8 w-14 shrink-0 rounded-md" />
        </div>
      ))}
    </>
  )
}

export function FollowingModalSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>
      ))}
    </>
  )
}

export function CommentsSkeleton() {
  return (
    <div className="flex flex-col">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3 py-3">
          <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
