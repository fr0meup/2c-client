import { NetworthPill } from '@/components/networth-pill'
import { UserMetaPill } from '@/components/user-meta-pill'
import { useFollow } from '@/components/profile/FollowContext'
import { useAuth } from '@/lib/auth'
import type { LeaderboardEntry, LeaderboardMeta } from './types'

function formatStat(value: number, label?: string): string {
  if (!label) return value.toLocaleString('en-US')
  if (label === 'ELO' || label === 'Picks' || label === 'Streak') return value.toLocaleString('en-US')
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString('en-US')}`
}

interface Props {
  entries: LeaderboardEntry[]
  meta: LeaderboardMeta
  startRank?: number
}

export function LeaderboardList({ entries, meta, startRank = 4 }: Props) {
  const { aliasFor } = useFollow()
  const { auth } = useAuth()
  if (entries.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      {entries.map((entry, i) => {
        const rank = startRank + i
        return (
          <div
            key={entry.uuid}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-4 transition-colors ${
              entry.uuid === auth?.userUuid
                ? 'border-[#c8a44d]/40 bg-gradient-to-b from-[#c8a44d]/[0.08] to-[#c8a44d]/[0.03] hover:from-[#c8a44d]/[0.11] hover:to-[#c8a44d]/[0.05]'
                : 'border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:from-white/[0.05] hover:to-white/[0.02]'
            }`}
          >
            {/* Rank */}
            <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-white/40">
              {rank}
            </span>

            {/* Main content */}
            <div className="min-w-0 flex-1">
              {/* Top line: NW pill + UserMetaPill */}
              <div className="flex items-center gap-2.5">
                <NetworthPill
                  networth={entry.balance}
                  subscriptionType={entry.subscription_type}
                  authorUuid={entry.uuid}
                  role={entry.role}
                  size="default"
                />
                <UserMetaPill
                  elo={entry.elo_rating}
                  alias={aliasFor(entry.uuid)}
                  gender={entry.gender}
                  age={entry.age}
                  arena={entry.arena}
                  size="small"
                />
              </div>
              {/* Bio below */}
              {entry.bio && (
                <p className="mt-1.5 truncate text-[13px] leading-snug text-white/45">{entry.bio}</p>
              )}
            </div>

            {/* Extra stat */}
            {meta.has_extra && entry.extra_stat != null && (
              <div className="flex shrink-0 flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-white/30">{meta.extra_label}</span>
                <span className="text-sm font-bold tabular-nums text-white/90">{formatStat(entry.extra_stat, meta.extra_label)}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
