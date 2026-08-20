import type { QueryClient } from '@tanstack/react-query'
import type { Vote } from '@/lib/types'

export interface PatchablePosts {
  votes?: Vote[]
  posts?: { uuid: string; upvote_count: number }[]
}

/** Patch a votes array + posts array for a given post_uuid / vote_type */
export function patchVotesAndPosts<T extends PatchablePosts>(
  section: T,
  postUuid: string,
  voteType: 1 | -1 | 0,
): T {
  if (!section?.posts) return section
  const oldVote = (section.votes ?? []).find((v) => v.content_uuid === postUuid)
  const oldVoteType = oldVote?.vote_type ?? 0
  const delta = voteType - oldVoteType

  return {
    ...section,
    votes: [
      ...(section.votes ?? []).filter((v) => v.content_uuid !== postUuid),
      ...(voteType !== 0
        ? [{ ...oldVote, content_uuid: postUuid, vote_type: voteType } as Vote]
        : []),
    ],
    posts: (section.posts ?? []).map((p) =>
      p.uuid === postUuid ? { ...p, upvote_count: p.upvote_count + delta } : p,
    ),
  }
}

/** Increment or decrement comment_count for a post across an array of posts */
export function bumpCommentCount<T extends { uuid: string; comment_count: number }>(
  posts: T[] | undefined,
  postUuid: string,
  delta = 1,
): T[] {
  if (!Array.isArray(posts)) return []
  return posts.map((p) =>
    p.uuid === postUuid ? { ...p, comment_count: Math.max(0, (p.comment_count ?? 0) + delta) } : p,
  )
}

export interface CacheSnapshot {
  feed?: [readonly unknown[], unknown][]
  userProfile?: [readonly unknown[], unknown][]
  bookmarks?: unknown
  post?: unknown
}

/** Cancel outgoing queries and snapshot current cache state for optimistic rollbacks */
export async function snapshotPostCaches(
  queryClient: QueryClient,
  postUuid: string,
): Promise<CacheSnapshot> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: ['feed'] }),
    queryClient.cancelQueries({ queryKey: ['userProfile'] }),
    queryClient.cancelQueries({ queryKey: ['bookmarks'] }),
    queryClient.cancelQueries({ queryKey: ['post', postUuid] }),
  ])

  return {
    feed: queryClient.getQueriesData({ queryKey: ['feed'] }),
    userProfile: queryClient.getQueriesData({ queryKey: ['userProfile'] }),
    bookmarks: queryClient.getQueryData(['bookmarks']),
    post: queryClient.getQueryData(['post', postUuid]),
  }
}

/** Restore cache state from a previous snapshot on mutation failure */
export function rollbackPostCaches(
  queryClient: QueryClient,
  postUuid: string,
  snapshot: CacheSnapshot | undefined,
): void {
  if (!snapshot) return

  if (snapshot.feed) {
    for (const [key, data] of snapshot.feed) {
      queryClient.setQueryData(key, data)
    }
  }

  if (snapshot.userProfile) {
    for (const [key, data] of snapshot.userProfile) {
      queryClient.setQueryData(key, data)
    }
  }

  if (snapshot.bookmarks !== undefined) {
    queryClient.setQueryData(['bookmarks'], snapshot.bookmarks)
  }

  if (snapshot.post !== undefined) {
    queryClient.setQueryData(['post', postUuid], snapshot.post)
  }
}
