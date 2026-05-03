import { useEffect, useMemo, useRef, useState } from 'react'
import { formatCompact } from './utils'
import type { BalancePoint } from './types'

interface Props {
  history: BalancePoint[]
}

interface HoverState {
  index: number
  x: number
  y: number
  balance: number
  date: string
}

const W = 680
const H = 200
const PAD_X = 16
const PAD_Y = 24

function buildSmoothPath(xs: number[], ys: number[]): string {
  if (xs.length === 0) return ''
  let d = `M ${xs[0]} ${ys[0]}`
  for (let i = 1; i < xs.length; i++) {
    const mx = (xs[i - 1] + xs[i]) / 2
    d += ` C ${mx} ${ys[i - 1]}, ${mx} ${ys[i]}, ${xs[i]} ${ys[i]}`
  }
  return d
}

export function BalanceChart({ history }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)
  const [pathLength, setPathLength] = useState(0)

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength())
    }
  }, [history])

  const geometry = useMemo(() => {
    if (history.length < 2) return null
    const ordered = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const balances = ordered.map((p) => p.balance)
    const rawMin = Math.min(...balances)
    const rawMax = Math.max(...balances)
    const span = rawMax - rawMin || Math.max(1, rawMax * 0.1)
    const min = rawMin - span * 0.12
    const max = rawMax + span * 0.12
    const range = max - min

    const xs = ordered.map((_, i) => PAD_X + (i / (ordered.length - 1)) * (W - PAD_X * 2))
    const ys = ordered.map((p) => PAD_Y + ((max - p.balance) / range) * (H - PAD_Y * 2))
    const linePath = buildSmoothPath(xs, ys)
    const areaPath = `${linePath} L ${xs[xs.length - 1]} ${H} L ${xs[0]} ${H} Z`

    return { ordered, xs, ys, linePath, areaPath, min: rawMin, max: rawMax }
  }, [history])

  if (!geometry) return null

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const xRatio = (e.clientX - rect.left) / rect.width
    const xSvg = xRatio * W

    let nearest = 0
    let minDist = Infinity
    for (let i = 0; i < geometry.xs.length; i++) {
      const d = Math.abs(geometry.xs[i] - xSvg)
      if (d < minDist) {
        minDist = d
        nearest = i
      }
    }
    const point = geometry.ordered[nearest]
    setHover({
      index: nearest,
      x: geometry.xs[nearest],
      y: geometry.ys[nearest],
      balance: point.balance,
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    })
  }

  return (
    <div className="flex flex-col">
      {/* Centered label */}
      <div className="flex items-center justify-center pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Networth</span>
      </div>

      {/* Chart */}
      <div className="relative h-[180px] w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8a44d" stopOpacity="0.4" />
              <stop offset="55%" stopColor="#c8a44d" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#c8a44d" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="balStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a3823a" />
              <stop offset="50%" stopColor="#e8c879" />
              <stop offset="100%" stopColor="#c8a44d" />
            </linearGradient>
            <filter id="balGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = PAD_Y + t * (H - PAD_Y * 2)
            const isEdge = t === 0 || t === 1
            return (
              <line
                key={t}
                x1={PAD_X}
                y1={y}
                x2={W - PAD_X}
                y2={y}
                stroke={isEdge ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.035)'}
                strokeWidth="1"
                strokeDasharray={isEdge ? undefined : '3 5'}
              />
            )
          })}

          {/* Area */}
          <path d={geometry.areaPath} fill="url(#balFill)">
            <animate attributeName="opacity" from="0" to="1" dur="1.1s" fill="freeze" />
          </path>

          {/* Glow underlay */}
          <path
            d={geometry.linePath}
            fill="none"
            stroke="#c8a44d"
            strokeOpacity="0.35"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#balGlow)"
          />

          {/* Line (animated draw) */}
          <path
            ref={pathRef}
            d={geometry.linePath}
            fill="none"
            stroke="url(#balStroke)"
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={
              pathLength
                ? {
                    strokeDasharray: pathLength,
                    strokeDashoffset: pathLength,
                    animation: 'balDraw 1.4s cubic-bezier(0.65, 0, 0.35, 1) forwards',
                  }
                : undefined
            }
          />

          {/* End-point pulsing dot */}
          {!hover && geometry.xs.length > 0 && (
            <g>
              <circle
                cx={geometry.xs[geometry.xs.length - 1]}
                cy={geometry.ys[geometry.ys.length - 1]}
                r="6"
                fill="#c8a44d"
                fillOpacity="0.25"
              >
                <animate attributeName="r" values="6;14;6" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle
                cx={geometry.xs[geometry.xs.length - 1]}
                cy={geometry.ys[geometry.ys.length - 1]}
                r="3.5"
                fill="#e8c879"
                stroke="#0a0907"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Hover marker */}
          {hover && (
            <g>
              <line
                x1={hover.x}
                y1={PAD_Y}
                x2={hover.x}
                y2={H - PAD_Y}
                stroke="rgba(200,164,77,0.35)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={hover.x} cy={hover.y} r="10" fill="#c8a44d" fillOpacity="0.18">
                <animate attributeName="r" values="8;12;8" dur="1.4s" repeatCount="indefinite" />
              </circle>
              <circle cx={hover.x} cy={hover.y} r="4" fill="#e8c879" stroke="#0a0907" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* Axis labels */}
        <span className="pointer-events-none absolute left-2 top-1 text-[10px] font-medium text-white/30 tabular-nums">
          ${formatCompact(geometry.max)}
        </span>
        <span className="pointer-events-none absolute bottom-1 left-2 text-[10px] font-medium text-white/30 tabular-nums">
          ${formatCompact(geometry.min)}
        </span>

        {/* Tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-[#c8a44d]/30 bg-[#141410]/95 px-2.5 py-1.5 text-center shadow-lg shadow-black/40 backdrop-blur-sm"
            style={{
              left: `${(hover.x / W) * 100}%`,
              top: `calc(${(hover.y / H) * 100}% - 56px)`,
            }}
          >
            <div className="text-[12px] font-bold leading-none text-[#c8a44d] tabular-nums">
              ${hover.balance.toLocaleString()}
            </div>
            <div className="mt-1 text-[10px] leading-none text-white/50">{hover.date}</div>
          </div>
        )}
      </div>
    </div>
  )
}
