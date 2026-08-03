import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { formatNumber } from './utils'
import { useVotePoll } from '@/hooks/useVotes'
import { usePollResults } from '@/hooks/usePostResults'

export interface PollOptionResult {
  votes: number
  avgBalance: number
}

interface PollCardProps {
  postUuid: string
  options: string[]
  results?: Record<number, PollOptionResult>
  userVote?: number | null
  isOwner?: boolean
  className?: string
}

function nwTier(balance: number) {
  const abs = Math.abs(balance)
  if (abs >= 1_000_000) return { color: '#c8a44d', glow: '0 0 10px rgba(200,164,77,0.3)' }
  if (abs >= 100_000) return { color: '#c0c0d2', glow: '0 0 8px rgba(192,192,210,0.2)' }
  return { color: '#cd7f32', glow: '0 0 8px rgba(205,127,50,0.2)' }
}

export function PollCard({
  postUuid,
  options,
  results,
  userVote = null,
  isOwner = false,
  className = '',
}: PollCardProps) {
  const voteMutation = useVotePoll()
  const [localVote, setLocalVote] = useState<number | null>(userVote ?? null)

  useEffect(() => {
    if (userVote != null) setLocalVote(userVote)
  }, [userVote])

  // Fetch results internally once the user has voted (so we don't wait on the parent)
  const { data: internalResults } = usePollResults(
    postUuid,
    localVote !== null && !results
  )
  const effectiveResults = results ?? internalResults

  function handlePollVote(option: number) {
    if (localVote !== null) return
    setLocalVote(option)
    voteMutation.mutate({ post_uuid: postUuid, option })
  }

  const hasVoted = localVote !== null
  const hasResults = effectiveResults != null
  const show = hasVoted || (hasResults && isOwner)
  const totalVotes = hasResults
    ? Object.values(effectiveResults).reduce((sum, r) => sum + r.votes, 0)
    : 0
  const maxVotes = hasResults
    ? Math.max(...Object.values(effectiveResults).map((r) => r.votes), 0)
    : 0

  return (
    <div className={`mt-3 space-y-2 ${className}`}>
      {options.map((label, i) => {
        const r = effectiveResults?.[i]
        const votes = r?.votes ?? 0
        const avgBal = r?.avgBalance ?? 0
        const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
        const isWinning = show && votes > 0 && votes === maxVotes
        const isSelected = localVote === i
        const tier = nwTier(avgBal)

        return (
          <div
            key={i}
            onClick={(e) => {
              e.stopPropagation()
              if (!show) handlePollVote(i)
            }}
            className={`group relative block w-full overflow-hidden rounded-xl transition-all duration-200 ${
              !show
                ? 'cursor-pointer hover:scale-[1.01] hover:bg-white/[0.05] hover:border-white/[0.12]'
                : 'hover:brightness-105'
            }`}
            style={{
              background: show
                ? isWinning
                  ? 'linear-gradient(135deg, rgba(200,164,77,0.07) 0%, rgba(200,164,77,0.02) 100%)'
                  : 'rgba(255,255,255,0.025)'
                : 'rgba(255,255,255,0.025)',
              border: isWinning
                ? '1px solid rgba(200,164,77,0.25)'
                : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Fill bar */}
            {show && (
              <div
                className="absolute inset-y-0 left-0 rounded-l-xl transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: isWinning
                    ? 'linear-gradient(90deg, rgba(200,164,77,0.16) 0%, rgba(200,164,77,0.04) 100%)'
                    : 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 100%)',
                }}
              />
            )}

            <div className="relative flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                {isSelected && hasVoted && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                  </span>
                )}
                <span
                  className={`text-sm ${isSelected && hasVoted ? 'font-bold' : 'font-medium'}`}
                  style={{
                    color: isWinning ? '#c8a44d' : 'rgba(255,255,255,0.8)',
                  }}
                >
                  {label}
                </span>
                {show && (
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium tabular-nums text-white/40">
                    {pct}%
                  </span>
                )}
              </div>

              {show && (
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-medium tabular-nums text-white/25">
                    {votes}
                  </span>
                  {votes > 0 && (
                    <span
                      className="text-[11px] font-bold tabular-nums"
                      style={{
                        color: isWinning ? tier.color : `${tier.color}77`,
                        textShadow: isWinning ? tier.glow : 'none',
                      }}
                    >
                      {avgBal < 0 && '-'}
                      <span className="text-[9px] opacity-50">$</span>
                      {formatNumber(avgBal)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Total votes */}
      {show && totalVotes > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[11px] font-medium text-white/20">
            {totalVotes.toLocaleString('en-US')} votes
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>
      )}
    </div>
  )
}
