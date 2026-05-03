import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { formatCompact } from './utils'
import { useVoteLikert } from '@/hooks/useVotes'
import { useLikertResults } from '@/hooks/usePostResults'

export interface LikertOptionResult {
  votes: number
  avgBalance: number
}

interface LikertScaleProps {
  postUuid: string
  results?: Record<number, LikertOptionResult>
  userVote?: number | null
  isOwner?: boolean
  className?: string
}

const LABELS = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
] as const

function nwTier(balance: number) {
  const abs = Math.abs(balance)
  if (abs >= 1_000_000) return { color: '#c8a44d', glow: '0 0 12px rgba(200,164,77,0.35)' }
  if (abs >= 100_000) return { color: '#c0c0d2', glow: '0 0 10px rgba(192,192,210,0.25)' }
  return { color: '#cd7f32', glow: '0 0 10px rgba(205,127,50,0.25)' }
}

export function LikertScale({
  postUuid,
  results,
  userVote = null,
  isOwner = false,
  className = '',
}: LikertScaleProps) {
  const voteMutation = useVoteLikert()
  const [localVote, setLocalVote] = useState<number | null>(userVote ?? null)

  useEffect(() => {
    if (userVote != null) setLocalVote(userVote)
  }, [userVote])

  // Fetch results internally once the user has voted (so we don't wait on the parent)
  const { data: internalData } = useLikertResults(
    postUuid,
    localVote !== null && !results
  )
  const effectiveResults = results ?? internalData?.results

  function handleLikertVote(option: number) {
    if (localVote !== null) return
    setLocalVote(option)
    voteMutation.mutate({ postUuid, option })
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
    <div className={`mt-4 ${className}`}>
      <div className="flex justify-between gap-1">
        {LABELS.map((label, i) => {
          const r = effectiveResults?.[i]
          const votes = r?.votes ?? 0
          const avgBal = r?.avgBalance ?? 0
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
          const isWinning = show && votes > 0 && votes === maxVotes
          const isSelected = localVote === i
          const intensity = show ? Math.max(0.2, pct / 100) : 0
          const tier = nwTier(avgBal)

          return (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{ flex: '1 1 0', minWidth: 0 }}
            >
              {/* Bubble */}
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  if (!show) handleLikertVote(i)
                }}
                className={`relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-full transition-all duration-300 ${
                  !show ? 'hover:scale-110 hover:border-white/15' : 'hover:brightness-110'
                }`}
                style={{
                  background: isWinning
                    ? `radial-gradient(circle at 40% 35%, rgba(200,164,77,${0.12 + intensity * 0.18}) 0%, rgba(200,164,77,0.03) 80%)`
                    : isSelected
                      ? 'radial-gradient(circle at 40% 35%, rgba(52,211,153,0.1) 0%, rgba(52,211,153,0.02) 80%)'
                      : show
                        ? `rgba(255,255,255,${0.02 + intensity * 0.035})`
                        : 'rgba(255,255,255,0.03)',
                  border: isWinning
                    ? '1.5px solid rgba(200,164,77,0.45)'
                    : isSelected
                      ? '1.5px solid rgba(52,211,153,0.35)'
                      : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isWinning
                    ? '0 0 24px rgba(200,164,77,0.15), 0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
                    : '0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                {show ? (
                  <span
                    className="text-[15px] font-bold tabular-nums"
                    style={{
                      color: isWinning
                        ? '#c8a44d'
                        : isSelected
                          ? '#34d399'
                          : `rgba(255,255,255,${Math.max(0.35, intensity * 0.85)})`,
                    }}
                  >
                    {votes}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-white/20">
                    •
                  </span>
                )}

                {/* Selected check badge */}
                {isSelected && hasVoted && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 ring-2 ring-[#0a0907]">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </span>
                )}
              </div>

              {/* Full label */}
              <span
                className="mt-2 text-center text-[10px] font-semibold leading-tight"
                style={{
                  color: isWinning
                    ? '#c8a44d'
                    : isSelected
                      ? '#34d399'
                      : 'rgba(255,255,255,0.25)',
                }}
              >
                {label}
              </span>

              {/* Percentage */}
              {show && (
                <span
                  className="mt-1 text-[10px] font-medium tabular-nums"
                  style={{
                    color: isWinning
                      ? 'rgba(200,164,77,0.7)'
                      : 'rgba(255,255,255,0.18)',
                  }}
                >
                  {pct}%
                </span>
              )}

              {/* Avg NW — tier-colored glow text */}
              {show && votes > 0 && (
                <span
                  className="mt-1 text-[11px] font-bold tabular-nums"
                  style={{
                    color: isWinning ? tier.color : `${tier.color}88`,
                    textShadow: isWinning ? tier.glow : 'none',
                  }}
                >
                  <span className="text-[9px] opacity-50">$</span>
                  {formatCompact(avgBal)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Total votes footer */}
      {show && totalVotes > 0 && (
        <div className="mt-4 flex items-center gap-2">
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
