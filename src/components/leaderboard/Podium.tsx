import { NetworthPill } from '@/components/networth-pill'
import { UserMetaPill } from '@/components/user-meta-pill'
import type { LeaderboardEntry, LeaderboardMeta } from './types'

function formatStat(value: number, label?: string): string {
  if (!label) return value.toLocaleString('en-US')
  if (label === 'ELO' || label === 'Picks' || label === 'Streak') return value.toLocaleString('en-US')
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString('en-US')}`
}

const PODIUM_CONFIG = {
  1: { height: 'h-28', color: '#FFD700', glow: 'shadow-[0_0_20px_rgba(255,215,0,0.15)]' },
  2: { height: 'h-20', color: '#C0C0C0', glow: 'shadow-[0_0_14px_rgba(192,192,192,0.1)]' },
  3: { height: 'h-14', color: '#CD7F32', glow: 'shadow-[0_0_14px_rgba(205,127,50,0.1)]' },
} as const

interface PodiumSlotProps {
  entry: LeaderboardEntry
  rank: 1 | 2 | 3
  meta: LeaderboardMeta
}

function PodiumSlot({ entry, rank, meta }: PodiumSlotProps) {
  const cfg = PODIUM_CONFIG[rank]

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center overflow-hidden transition-transform duration-200 hover:-translate-y-1.5">
      {/* User info above pedestal */}
      <div className="flex w-full flex-col items-center gap-1.5 pb-3">
        {/* Rank badge */}
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
          style={{
            background: `linear-gradient(145deg, ${cfg.color}, ${cfg.color}90)`,
            color: '#0f0e0a',
            boxShadow: `0 2px 8px ${cfg.color}40`,
          }}
        >
          {rank}
        </div>

        {/* NW pill */}
        <NetworthPill
          networth={entry.balance}
          subscriptionType={entry.subscription_type}
          authorUuid={entry.uuid}
          role={entry.role}
          size={rank === 1 ? 'default' : 'small'}
        />

        {/* Extra stat */}
        {meta.has_extra && entry.extra_stat != null && (
          <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5">
            <span className="text-[9px] uppercase tracking-wider text-white/40">{meta.extra_label}</span>
            <span className="text-[11px] font-bold tabular-nums text-white/90">{formatStat(entry.extra_stat, meta.extra_label)}</span>
          </div>
        )}

        {/* Meta pill */}
        <UserMetaPill
          elo={entry.elo_rating}
          gender={entry.gender}
          age={entry.age}
          arena={entry.arena}
          size="small"
          className="max-w-full"
        />

      </div>

      {/* Pedestal block */}
      <div
        className={`w-full rounded-t-xl ${cfg.height} ${cfg.glow} relative overflow-hidden`}
        style={{
          background: `linear-gradient(180deg, ${cfg.color}20 0%, ${cfg.color}08 100%)`,
          borderTop: `2px solid ${cfg.color}50`,
          borderLeft: `1px solid ${cfg.color}20`,
          borderRight: `1px solid ${cfg.color}20`,
        }}
      >
        {/* Inner shine */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}60, transparent)` }}
        />
        {/* Rank number large watermark */}
        <span
          className="absolute inset-0 flex items-center justify-center text-4xl font-black opacity-[0.07]"
          style={{ color: cfg.color }}
        >
          {rank}
        </span>
      </div>
    </div>
  )
}

interface PodiumProps {
  entries: LeaderboardEntry[]
  meta: LeaderboardMeta
}

export function Podium({ entries, meta }: PodiumProps) {
  const first = entries[0]
  const second = entries[1]
  const third = entries[2]

  if (!first) return null

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#141410] to-[#0a0907] px-3 pb-0 pt-5 shadow-xl shadow-black/30">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-6 h-48 w-96 -translate-x-1/2 rounded-full bg-[#c8a44d]/[0.03] blur-[80px]" />

      {/* Podium — order: #2 left, #1 center, #3 right */}
      <div className="relative flex w-full items-end justify-center gap-1.5">
        {second && <PodiumSlot entry={second} rank={2} meta={meta} />}
        <PodiumSlot entry={first} rank={1} meta={meta} />
        {third && <PodiumSlot entry={third} rank={3} meta={meta} />}
      </div>
    </section>
  )
}
