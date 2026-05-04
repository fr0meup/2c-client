import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Triangle, Star } from 'lucide-react'
import { UserMetaPill } from '@/components/user-meta-pill'
import { timeAgo, cleanPostText } from '@/components/post-card'
import { useFollow } from './FollowContext'
import { useVoteComment } from '@/hooks/useVotes'
import type { Comment } from '@/lib/types'
import { saveGif, removeGif, isGifSaved } from '@/lib/gif'

function GifWithStar({ url }: { url: string }) {
  const [saved, setSaved] = useState(() => isGifSaved(url))

  useEffect(() => {
    function onSync() { setSaved(isGifSaved(url)) }
    window.addEventListener('gif-storage-change', onSync)
    return () => window.removeEventListener('gif-storage-change', onSync)
  }, [url])

  return (
    <div className="group/gif relative w-fit" onClick={(e) => e.stopPropagation()}>
      <img
        src={url}
        alt="GIF"
        className="max-w-[240px] rounded-lg"
        loading="lazy"
      />
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (saved) {
            removeGif(url)
            setSaved(false)
          } else {
            saveGif(url)
            setSaved(true)
          }
        }}
        className={`absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full opacity-0 transition-all group-hover/gif:opacity-100 ${
          saved
            ? 'bg-[#c8a44d]/90 text-[#0f0e0a]'
            : 'bg-black/60 text-white/60 hover:bg-black/80 hover:text-white'
        }`}
        title={saved ? 'Remove from saved GIFs' : 'Save GIF'}
      >
        <Star className={`h-3 w-3 ${saved ? 'fill-current' : ''}`} />
      </button>
    </div>
  )
}

interface Props {
  comment: Comment
  postTitle?: string
  initialVote?: 1 | -1 | 0
}

export function ProfileCommentCard({ comment, postTitle, initialVote = 0 }: Props) {
  const navigate = useNavigate()
  const { aliasFor } = useFollow()
  const isDeleted = !!comment.deleted_at
  const [currentVote, setCurrentVote] = useState<1 | -1 | 0>(initialVote)
  const [voteCount, setVoteCount] = useState(comment.upvote_count)
  const voteMutation = useVoteComment()

  function handleVote(dir: 1 | -1) {
    const next = currentVote === dir ? 0 : dir
    setVoteCount((c) => c + (next - currentVote))
    setCurrentVote(next)
    voteMutation.mutate({
      comment_uuid: comment.uuid,
      post_uuid: comment.post_uuid,
      vote_type: next,
    })
  }

  return (
    <div
      onClick={() => navigate(`/post/${comment.post_uuid}`)}
      className="flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
    >
      {/* Post context */}
      {postTitle && (
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <MessageSquare className="h-3 w-3 shrink-0" />
          <span className="truncate">Commented on: {postTitle}</span>
        </div>
      )}

      {/* Comment text + inline GIFs */}
      {isDeleted ? (
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed italic text-white/30">[deleted]</p>
      ) : (() => {
        const text = cleanPostText(comment.text)
        const gifRegex = /(https?:\/\/\S+\.gif(?:\?\S*)?)/gi
        const gifUrls: string[] = text.match(gifRegex) ?? []
        const strippedText = text.replace(gifRegex, '').trim()
        const rawGifFromMeta = (comment.comment_meta as { giphy_url?: string })?.giphy_url
        const gifFromMeta = rawGifFromMeta ? rawGifFromMeta.replace(/\/\d+\.gif/, '/giphy.gif') : undefined
        const allGifs: string[] = [...gifUrls, ...(gifFromMeta && !gifUrls.includes(gifFromMeta) ? [gifFromMeta] : [])]

        return (
          <>
            {strippedText && (
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-white/90">{strippedText}</p>
            )}
            {allGifs.map((url, i) => (
              <GifWithStar key={i} url={url} />
            ))}
          </>
        )
      })()}

      {/* Footer: meta pill + timestamp + vote buttons */}
      <div className="flex items-center gap-2">
        <UserMetaPill
          elo={comment.author_meta.elo_rating}
          alias={aliasFor(comment.author_uuid)}
          gender={comment.author_meta.gender}
          age={comment.author_meta.age}
          arena={comment.author_meta.arena}
          variant="comment"
        />
        <span className="text-xs text-white/30">{timeAgo(comment.created_at)}</span>

        <div className="ml-auto flex h-[38px] items-center rounded-full border border-[#c8a44d]/20 bg-gradient-to-b from-white/[0.07] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.15)]">
          <button
            onClick={(e) => { e.stopPropagation(); handleVote(1) }}
            className={`group flex h-full cursor-pointer items-center px-2.5 transition-all active:scale-90 ${
              currentVote === 1 ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]' : 'text-white/40 hover:text-emerald-400'
            }`}
          >
            <Triangle className={`h-3.5 w-3.5 fill-current transition-transform group-hover:-translate-y-0.5 ${currentVote === 1 ? 'drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]' : 'group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]'}`} />
          </button>
          <span className={`min-w-[1rem] text-center text-sm font-semibold leading-5 tabular-nums ${currentVote === 1 ? 'text-emerald-400' : currentVote === -1 ? 'text-rose-400' : 'text-white/80'}`}>
            {voteCount}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleVote(-1) }}
            className={`group flex h-full cursor-pointer items-center px-2.5 transition-all active:scale-90 ${
              currentVote === -1 ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]' : 'text-white/40 hover:text-rose-400'
            }`}
          >
            <Triangle className={`h-3.5 w-3.5 rotate-180 fill-current transition-transform group-hover:translate-y-0.5 ${currentVote === -1 ? 'drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]' : 'group-hover:drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
