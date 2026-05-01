import { useState, useRef, useEffect } from 'react'
import { X, Download, Share2, MessageSquare, Triangle, MoreHorizontal, Link2, Trash2, Eye, Quote } from 'lucide-react'
import { NetworthPill } from '@/components/networth-pill'
import { UserMetaPill } from '@/components/user-meta-pill'
import type { PostCardData } from './types'
import { cleanPostText, timeAgo } from './utils'

const TEXT_LIMIT = 280

function PlatformIcon({ platform }: { platform?: string }) {
  if (platform === 'ios') {
    return (
      <img
        src="https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fapple.b409ad25.png&w=32&q=75&dpl=dpl_57sq3a4okDe2tVXZVSYu9FCcDV21"
        alt="iOS"
        className="h-3.5 w-3.5 opacity-50"
      />
    )
  }
  if (platform === 'android') {
    return (
      <img
        src="https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fandroid.c3fa6e95.png&w=32&q=75&dpl=dpl_57sq3a4okDe2tVXZVSYu9FCcDV21"
        alt="Android"
        className="h-3.5 w-3.5 opacity-50"
      />
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 text-white/40">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  )
}

// ── Picks visual only ──
function PicksVisual({ post }: { post: PostCardData }) {
  const meta = post.post_meta
  const yes = meta?.consensus_percent ?? 50
  const no = 100 - yes
  const resolved = meta?.resolution_status === 'resolved'
  const correct = meta?.correct_answer

  return (
    <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Consensus</span>
        {resolved && correct && (
          <span className="text-[12px] font-semibold" style={{ color: '#DAA520' }}>
            Resolved: {correct.charAt(0).toUpperCase() + correct.slice(1)}
          </span>
        )}
        {!resolved && meta?.resolution_deadline && (
          <span className="text-[12px] font-medium text-white/40">
            Resolves {new Date(meta.resolution_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/60" style={{ width: `${yes}%` }} />
        <div className="absolute inset-y-0 right-0 rounded-full bg-rose-500/60" style={{ width: `${no}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-medium text-emerald-400">Yes {yes}%</span>
        <span className="font-medium text-rose-400">No {no}%</span>
      </div>
    </div>
  )
}

// ── Main component ──
interface PostCardProps {
  post: PostCardData
  initialVote?: 1 | -1 | 0
  alias?: string
}

export function PostCard({ post, initialVote = 0, alias }: PostCardProps) {
  const imageSrc = post.post_meta?.src
  const isVideoPost = post.post_meta?.media_type === 'video'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [currentVote, setCurrentVote] = useState<1 | -1 | 0>(initialVote)
  const [voteCount, setVoteCount] = useState(post.upvote_count)

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const pollOptions = post.post_meta?.poll
  const isPoll = post.post_type === 2 && pollOptions && pollOptions.length > 0
  const isLikert = post.post_type === 5
  const isPicks = post.post_type === 7

  const cleanText = cleanPostText(post.text)
  const isLong = cleanText.length > TEXT_LIMIT
  const displayText = !expanded && isLong ? cleanText.slice(0, TEXT_LIMIT).trimEnd() + '…' : cleanText

  function handleVote(dir: 1 | -1) {
    setCurrentVote((prev) => {
      const next = prev === dir ? 0 : dir
      setVoteCount((c) => c + (next - prev))
      return next
    })
  }

  return (
    <>
      <article className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
        <div className="min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NetworthPill
                networth={post.author_meta.balance}
                subscriptionType={post.author_meta.subscription_type}
                authorUuid={post.author_uuid}
                role={post.author_meta.role}
                size="small"
              />
              <span className="whitespace-nowrap text-sm text-white/40">
                {timeAgo(post.created_at)}
              </span>
              <span className="text-sm text-white/40">·</span>
              <PlatformIcon platform={post.post_meta?.platform} />
              {post.topic && (
                <>
                  <span className="text-sm text-white/40">·</span>
                  <span className="text-sm font-semibold text-[#c8a44d]">$/{post.topic.toLowerCase()}</span>
                </>
              )}
              <span className="text-sm text-white/40">·</span>
              <span className="flex items-center gap-1 text-sm text-white/40">
                <Eye className="h-3.5 w-3.5" />
                {post.view_count}
              </span>
            </div>

            {/* Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p) }}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-1 shadow-xl shadow-black/40">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                  >
                    <Link2 className="h-3.5 w-3.5 text-white/40" />
                    Copy link
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06]"
                  >
                    <Quote className="h-3.5 w-3.5 text-white/40" />
                    Quote post
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-400 transition-colors hover:bg-rose-400/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          {post.title && (
            <h3 className="mt-2 text-[17px] font-bold text-white">{post.title}</h3>
          )}

          {/* Body */}
          {isPicks ? (
            <PicksVisual post={post} />
          ) : (
            <>
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">
                {displayText}
              </p>
              {isLong && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded((prev) => !prev) }}
                  className="mt-1 cursor-pointer text-sm font-medium text-[#c8a44d] transition-colors hover:text-[#c8a44d]/80"
                >
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </>
          )}

          {/* Likert visual */}
          {isLikert && (
            <div className="mt-3 space-y-2">
              {['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'].map((label, i) => (
                <div
                  key={label}
                  className="relative block w-full overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium text-white/80">{label}</span>
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-white/40">
                      {20 + i * 5}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Poll visual */}
          {isPoll && pollOptions && (
            <div className="mt-3 space-y-2">
              {pollOptions.map((opt, i) => (
                <div
                  key={i}
                  className="relative block w-full overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-medium text-white/80">{opt}</span>
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-white/40">
                      {15 + i * 10}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Media */}
          {imageSrc && (
            isVideoPost ? (
              <video
                src={imageSrc}
                controls
                onClick={(e) => e.stopPropagation()}
                className="mx-auto mt-3 w-[85%] max-h-[26rem] rounded-2xl"
              />
            ) : (
              <img
                src={imageSrc}
                alt=""
                onClick={(e) => { e.stopPropagation(); setLightboxOpen(true) }}
                className="mx-auto mt-3 w-[85%] max-h-[26rem] cursor-zoom-in rounded-2xl object-cover"
              />
            )
          )}

          {/* Lightbox */}
          {lightboxOpen && imageSrc && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
              onClick={() => setLightboxOpen(false)}
            >
              <div className="absolute right-4 top-4 flex items-center gap-2">
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  title="Download"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  title="Share"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {isVideoPost ? (
                <video src={imageSrc} controls className="max-h-[90vh] max-w-[90vw] rounded-xl" onClick={(e) => e.stopPropagation()} />
              ) : (
                <img src={imageSrc} alt="" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
              )}
            </div>
          )}

          {/* Quote post preview */}
          {post.post_meta?.quote_post && (() => {
            const q = post.post_meta.quote_post
            return (
              <div className="mt-3 cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
                <div className="mb-2 flex items-center gap-2">
                  <NetworthPill
                    networth={q.author_meta.balance}
                    subscriptionType={q.author_meta.subscription_type}
                    authorUuid={q.author_uuid}
                    role={q.author_meta.role}
                    size="small"
                  />
                  <span className="text-xs text-white/40">{timeAgo(q.created_at)}</span>
                  {q.topic && <span className="text-xs text-[#c8a44d]">$/{q.topic.toLowerCase()}</span>}
                </div>
                {q.title && <p className="mb-1 text-sm font-semibold text-white">{q.title}</p>}
                <p className="line-clamp-3 text-sm text-white/60">{q.text}</p>
                {q.post_meta?.src && (
                  <img src={q.post_meta.src} alt="" className="mt-2 max-h-32 w-full rounded-lg object-cover" />
                )}
              </div>
            )
          })()}

          {/* Bottom row */}
          <div className="mt-3 flex items-center gap-2.5">
            {/* Meta pill */}
            <UserMetaPill
              elo={post.author_meta.elo_rating}
              alias={alias}
              gender={post.author_meta.gender}
              age={post.author_meta.age}
              arena={post.author_meta.arena}
            />

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2.5">
              <button className="group flex h-[38px] cursor-pointer items-center gap-1.5 rounded-full border border-[#c8a44d]/20 bg-gradient-to-b from-white/[0.07] to-white/[0.03] px-4.5 text-sm text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.15)] transition-all hover:border-[#c8a44d]/30 hover:text-[#c8a44d] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_10px_rgba(218,178,87,0.1)] active:scale-95">
                <MessageSquare className="h-3.5 w-3.5 fill-current transition-transform group-hover:scale-110" />
                <span className="text-sm font-semibold leading-5">{post.comment_count}</span>
              </button>

              <div className="flex h-[38px] items-center rounded-full border border-[#c8a44d]/20 bg-gradient-to-b from-white/[0.07] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.15)]">
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
        </div>
      </article>
    </>
  )
}
