import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Quote, Loader2, AlertTriangle } from 'lucide-react'
import { usePostQuotes } from '@/hooks/usePostQuotes'
import { PostCard } from './PostCard'
import { PostCardSkeleton } from '@/components/skeleton/Skeleton'
import type { PostCardData } from './types'

interface PostQuotesModalProps {
  postUuid: string
  postTitle?: string
  onClose: () => void
}

export function PostQuotesModal({ postUuid, postTitle, onClose }: PostQuotesModalProps) {
  const { data, isLoading, isError, refetch } = usePostQuotes(postUuid)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const posts = data?.posts ?? []

  const { voteMap, pollVoteMap, pickVoteMap, likertVoteMap } = useMemo(() => {
    const voteMap = new Map<string, 1 | -1 | 0>()
    const pollVoteMap = new Map<string, number>()
    const pickVoteMap = new Map<string, 'yes' | 'no'>()
    const likertVoteMap = new Map<string, number>()

    if (data) {
      for (const v of data.votes ?? []) {
        if (v.content_uuid) voteMap.set(v.content_uuid, v.vote_type)
      }
      for (const p of data.polls ?? []) {
        if (p.post_uuid) pollVoteMap.set(p.post_uuid, p.option)
      }
      for (const l of data.likertVotes ?? []) {
        if (l.post_uuid) likertVoteMap.set(l.post_uuid, l.option)
      }
      for (const pk of data.pickVotes ?? []) {
        if (pk.post_uuid) pickVoteMap.set(pk.post_uuid, pk.vote)
      }
    }

    return { voteMap, pollVoteMap, pickVoteMap, likertVoteMap }
  }, [data])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 px-2 backdrop-blur-md sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[calc(100svh-1rem)] w-full flex-col overflow-hidden rounded-t-3xl border border-white/[0.1] bg-gradient-to-b from-[#14130e] via-[#0f0e0a] to-[#0a0907] shadow-2xl shadow-black/90 backdrop-blur-xl sm:max-h-[85svh] sm:max-w-2xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="relative flex items-center gap-3 border-b border-white/[0.08] px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#c8a44d]/25 bg-gradient-to-b from-[#c8a44d]/20 to-[#c8a44d]/5 text-[#c8a44d] shadow-[0_0_15px_rgba(200,164,77,0.15)]">
            <Quote className="h-4.5 w-4.5 text-[#c8a44d]" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold tracking-tight text-white sm:text-base">Quotes</p>
            <p className="mt-0.5 text-[12px] text-white/50">
              {isLoading
                ? 'Loading quotes...'
                : `${posts.length} ${posts.length === 1 ? 'quote post' : 'quote posts'}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 transition-all hover:bg-white/[0.1] hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Quotes List */}
        <div
          className="flex flex-col gap-3 overflow-y-auto px-3.5 py-3.5 sm:px-5 sm:py-4"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#333330 transparent' }}
        >
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-white/60">Failed to load quote posts</p>
              <button
                onClick={() => refetch()}
                className="mt-3 rounded-lg bg-white/[0.08] px-4 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.12] hover:text-white"
              >
                Retry
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02]"
              >
                <Quote className="h-5 w-5 text-white/30" />
              </div>
              <p className="mt-4 text-sm font-semibold text-white/70">No quotes yet</p>
              <p className="mt-1 text-xs text-white/40">This post hasn't been quoted by anyone yet.</p>
            </div>
          ) : (
            posts.map((quotePost: PostCardData) => (
              <PostCard
                key={quotePost.uuid}
                post={quotePost}
                initialVote={voteMap.get(quotePost.uuid) ?? 0}
                pollUserVote={pollVoteMap.get(quotePost.uuid)}
                likertUserVote={likertVoteMap.get(quotePost.uuid)}
                pickUserVote={pickVoteMap.get(quotePost.uuid)}
                pollVoteMap={pollVoteMap}
                likertVoteMap={likertVoteMap}
                pickVoteMap={pickVoteMap}
              />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
