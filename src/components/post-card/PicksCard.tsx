import { useState, useRef, useEffect } from 'react'
import { Check } from 'lucide-react'
import { formatNumber } from './utils'
import { usePicksResults } from '@/hooks/usePostResults'
import { useVotePick } from '@/hooks/useVotes'

// ── Types ──

interface PicksCardProps {
  postUuid: string
  priceHistory?: Array<{ price: number; timestamp?: number; date?: string }>
  userVote?: 'yes' | 'no' | null
  resolutionDeadline?: string
  className?: string
}

// ── NW tier helper (shared pattern) ──

function nwTier(balance: number) {
  const abs = Math.abs(balance)
  if (abs >= 1_000_000) return { color: '#c8a44d', glow: '0 0 10px rgba(200,164,77,0.3)' }
  if (abs >= 100_000) return { color: '#c0c0d2', glow: '0 0 8px rgba(192,192,210,0.2)' }
  return { color: '#cd7f32', glow: '0 0 8px rgba(205,127,50,0.2)' }
}

// ── Sparkline ──

interface TooltipState {
  x: number
  y: number
  price: number
  visible: boolean
}

function Sparkline({ points, id }: { points: Array<{ price: number; timestamp?: number; date?: string }>; id: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tip, setTip] = useState<TooltipState>({ x: 0, y: 0, price: 0, visible: false })

  if (!points || points.length < 2) return null

  const prices = points.map((p) => p.price)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const range = maxP - minP || 1

  const W = 400
  const H = 120
  const padX = 4
  const padY = 12

  const xs = points.map((_, i) => padX + (i / (points.length - 1)) * (W - padX * 2))
  const ys = points.map((p) => padY + ((maxP - p.price) / range) * (H - padY * 2))

  const linePath = xs.reduce((acc, x, i) => {
    if (i === 0) return `M${x},${ys[i]}`
    const px = xs[i - 1]
    const py = ys[i - 1]
    const cpx = px + (x - px) * 0.5
    return `${acc} C${cpx},${py} ${cpx},${ys[i]} ${x},${ys[i]}`
  }, '')

  const areaPath = `${linePath} L${xs[xs.length - 1]},${H + 2} L${xs[0]},${H + 2} Z`
  const gradId = `sparkg-${id}`
  const clipId = `sparkcl-${id}`

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width
    const idx = Math.min(points.length - 1, Math.max(0, Math.round(relX * (points.length - 1))))
    setTip({ x: xs[idx], y: ys[idx], price: points[idx].price, visible: true })
  }

  const tooltipW = 68
  const tooltipX = Math.min(Math.max(tip.x - tooltipW / 2, 2), W - tooltipW - 2)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTip((t) => ({ ...t, visible: false }))}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(200,164,77,0.25)" />
          <stop offset="80%" stopColor="rgba(200,164,77,0.03)" />
          <stop offset="100%" stopColor="rgba(200,164,77,0)" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={W} height={H} />
        </clipPath>
      </defs>

      <path d={areaPath} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />
      <path
        d={linePath}
        fill="none"
        stroke="#c8a44d"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 5px rgba(200,164,77,0.5))' }}
      />

      {tip.visible && (
        <>
          <line
            x1={tip.x} y1={padY - 4}
            x2={tip.x} y2={H}
            stroke="rgba(200,164,77,0.25)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle
            cx={tip.x}
            cy={tip.y}
            r="3.5"
            fill="#c8a44d"
            style={{ filter: 'drop-shadow(0 0 4px rgba(200,164,77,0.6))' }}
          />
          <rect
            x={tooltipX} y={4}
            width={tooltipW} height={20}
            rx="5"
            fill="rgba(13,13,11,0.92)"
            stroke="rgba(200,164,77,0.2)"
            strokeWidth="0.8"
          />
          <text
            x={tooltipX + tooltipW / 2}
            y={18}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#c8a44d"
            style={{ fontFamily: 'inherit' }}
          >
            {Math.round(tip.price)}%
          </text>
        </>
      )}
    </svg>
  )
}

// ── Vote button ──

function VoteButton({
  label,
  choice,
  userVote,
  avgNw,
  showResults,
  onClick,
}: {
  label: string
  choice: 'yes' | 'no'
  userVote: string | null
  avgNw?: number
  showResults: boolean
  onClick?: () => void
}) {
  const isSelected = userVote === choice
  const hasVoted = userVote !== null
  const canVote = !hasVoted
  const tier = avgNw != null ? nwTier(avgNw) : null

  return (
    <div
      onClick={canVote ? onClick : undefined}
      className={`relative w-full overflow-hidden rounded-xl transition-all duration-200 ${
        canVote
          ? 'cursor-pointer hover:scale-[1.02] hover:border-white/[0.14] hover:bg-white/[0.06]'
          : ''
      } ${showResults && !isSelected ? 'opacity-50' : ''}`}
      style={{
        background: isSelected
          ? 'linear-gradient(135deg, rgba(200,164,77,0.08) 0%, rgba(200,164,77,0.02) 100%)'
          : 'rgba(255,255,255,0.03)',
        border: isSelected
          ? '1px solid rgba(200,164,77,0.3)'
          : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          {isSelected && showResults && (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-2.5 w-2.5 text-emerald-400" />
            </span>
          )}
          <span
            className={`text-[13px] ${isSelected ? 'font-bold' : 'font-medium'}`}
            style={{ color: isSelected ? '#c8a44d' : 'rgba(255,255,255,0.7)' }}
          >
            {label}
          </span>
        </div>
        {showResults && avgNw != null && tier && (
          <span
            className="text-[11px] font-bold tabular-nums"
            style={{
              color: isSelected ? tier.color : `${tier.color}77`,
              textShadow: isSelected ? tier.glow : 'none',
            }}
          >
            {avgNw < 0 && '-'}
            <span className="text-[9px] opacity-50">$</span>
            {formatNumber(avgNw)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main component ──

export function PicksCard({
  postUuid,
  priceHistory = [],
  userVote = null,
  resolutionDeadline,
  className = '',
}: PicksCardProps) {
  const { data: picksData } = usePicksResults(postUuid)
  const voteMutation = useVotePick()
  const [localVote, setLocalVote] = useState<'yes' | 'no' | null>(userVote ?? null)

  useEffect(() => {
    if (userVote != null) setLocalVote(userVote)
  }, [userVote])

  const resolved = picksData?.resolution_status === 'resolved'
  const correctAnswer = picksData?.correct_answer ?? null
  const yesPct = picksData?.results.yes_percent
  const noPct = picksData?.results.no_percent
  const yesAvgNw = picksData?.results.yes.average_balance
  const noAvgNw = picksData?.results.no.average_balance

  function handlePickVote(choice: 'yes' | 'no') {
    if (localVote !== null) return
    setLocalVote(choice)
    voteMutation.mutate({ post_uuid: postUuid, vote_type: choice === 'yes' ? 0 : 1 })
  }

  const showResults = localVote !== null || resolved
  const yp = yesPct ?? 50
  const np = noPct ?? 50

  return (
    <div
      className={`mt-3 overflow-hidden rounded-xl border border-white/[0.06] ${className}`}
      style={{ background: 'linear-gradient(160deg, rgba(200,164,77,0.025) 0%, transparent 70%)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Resolution header */}
      {(resolved || resolutionDeadline) && (
        <div className="flex items-center justify-between px-3.5 pt-3 pb-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/25">
            Penny Pick
          </span>
          {resolved && correctAnswer ? (
            <span className="text-[11px] font-bold" style={{ color: '#c8a44d' }}>
              Resolved: {correctAnswer.charAt(0).toUpperCase() + correctAnswer.slice(1)}
            </span>
          ) : resolutionDeadline ? (
            <span className="text-[11px] font-medium text-white/30">
              Resolves {new Date(resolutionDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          ) : null}
        </div>
      )}

      {/* Sparkline + vote buttons */}
      <div className="flex items-stretch gap-3 p-3 pb-2">
        <div className="min-w-0 flex-1" style={{ height: 120 }}>
          {priceHistory.length >= 2 ? (
            <Sparkline points={priceHistory} id={postUuid} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg bg-white/[0.02]">
              <span className="text-[11px] text-white/20">No price data</span>
            </div>
          )}
        </div>

        <div className="flex w-[170px] shrink-0 flex-col justify-center gap-2">
          <VoteButton
            label="Yes"
            choice="yes"
            userVote={localVote}
            avgNw={yesAvgNw}
            showResults={showResults}
            onClick={() => handlePickVote('yes')}
          />
          <VoteButton
            label="No"
            choice="no"
            userVote={localVote}
            avgNw={noAvgNw}
            showResults={showResults}
            onClick={() => handlePickVote('no')}
          />
        </div>
      </div>

      {/* Consensus bar */}
      {showResults && (
        <div className="px-3.5 pb-3 pt-1">
          <div className="relative mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${yp}%`,
                background: 'linear-gradient(90deg, rgba(200,164,77,0.8) 0%, rgba(200,164,77,0.4) 100%)',
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold" style={{ color: '#c8a44d' }}>
              Yes {Math.round(yp)}%
            </span>
            <span className="text-[11px] font-bold text-white/25">
              No {Math.round(np)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
