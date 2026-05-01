import { ComposePost } from '@/components/compose-post'
import { PostCard, MOCK_POSTS } from '@/components/post-card'

export function Feed() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-start justify-center px-4 pt-3 pb-6 sm:px-8">
      <div className="w-full max-w-[670px] space-y-4 xl:-ml-[245px]">
        <ComposePost />
        {MOCK_POSTS.map((post) => (
          <PostCard key={post.uuid} post={post} />
        ))}
      </div>
    </div>
  )
}
