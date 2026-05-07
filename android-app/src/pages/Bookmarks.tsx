import { PostCard } from '@/components/post-card/PostCard'
import type { PostCardData } from '@/components/post-card/types'
import { PostCardSkeleton } from '@/components/skeleton/Skeleton'
import { useBookmarks } from '@/hooks/useBookmarks'

export function Bookmarks() {
  const { data, isLoading, isError } = useBookmarks()

  const posts: PostCardData[] = (data?.posts ?? []) as unknown as PostCardData[]

  // Build a vote lookup so we can pass initialVote to each card
  const voteMap = new Map<string, 1 | -1 | 0>()
  for (const v of data?.votes ?? []) {
    voteMap.set(v.content_uuid, v.vote_type)
  }
  const pollVoteMap = new Map<string, number>()
  for (const p of data?.polls ?? []) {
    pollVoteMap.set(p.post_uuid, p.option)
  }
  const pickVoteMap = new Map<string, 'yes' | 'no'>()
  for (const pk of data?.pickVotes ?? []) {
    pickVoteMap.set(pk.post_uuid, pk.vote)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
        <div className="w-full max-w-[670px] space-y-4 xl:-ml-[245px]">
          {[...Array(4)].map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
        <div className="w-full max-w-[670px] xl:-ml-[245px]">
          <p className="py-20 text-center text-sm text-white/40">Failed to load bookmarks</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="w-full max-w-[670px] space-y-4 xl:-ml-[245px]">
        {posts.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16">
            <p className="text-sm text-white/40">No bookmarks yet</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.uuid}
              post={post}
              initialVote={voteMap.get(post.uuid) ?? 0}
              pollUserVote={pollVoteMap.get(post.uuid) ?? undefined}
              pickUserVote={pickVoteMap.get(post.uuid) ?? undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}
