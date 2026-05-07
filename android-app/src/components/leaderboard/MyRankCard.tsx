import { Trophy } from 'lucide-react'
import { useMyRank } from '@/hooks/useMyRank'

function formatPercentile(myPosition: number, totalPositions: number): string | null {
  if (!totalPositions || totalPositions <= 0) return null
  const pct = (myPosition / totalPositions) * 100
  if (pct < 0.1) return 'Top 0.1%'
  if (pct < 1) return `Top ${pct.toFixed(1)}%`
  if (pct < 10) return `Top ${pct.toFixed(1)}%`
  return `Top ${Math.round(pct)}%`
}

/**
 * Personal rank card — only ever visible to the logged-in user themselves
 * because the data is sourced from their own `/v2/auth/login` response.
 * Shown at the top of the Top 100 leaderboard board.
 */
export function MyRankCard() {
  const { data } = useMyRank()

  if (!data) return null
  const { myPosition, totalPositions } = data
  if (!myPosition) return null

  const inTop100 = myPosition <= 100
  const percentile = formatPercentile(myPosition, totalPositions)

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#c8a44d]/[0.18] bg-gradient-to-b from-[#c8a44d]/[0.06] to-[#c8a44d]/[0.015] px-4 py-3.5 shadow-lg shadow-black/20">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#c8a44d]/[0.06] blur-[60px]" />

      <div className="relative flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c8a44d]/30 bg-[#c8a44d]/10 text-[#c8a44d]">
          <Trophy className="h-4 w-4" strokeWidth={2.2} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c8a44d]/70">
            Your rank
          </span>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-base font-bold tabular-nums text-white">
              #{myPosition.toLocaleString('en-US')}
            </span>
            {totalPositions > 0 && (
              <span className="truncate text-xs text-white/40 tabular-nums">
                of {totalPositions.toLocaleString('en-US')}
              </span>
            )}
          </div>
        </div>

        {percentile && (
          <span
            className={
              inTop100
                ? 'shrink-0 rounded-full border border-[#c8a44d]/30 bg-[#c8a44d]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#c8a44d]'
                : 'shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-white/70'
            }
          >
            {percentile}
          </span>
        )}
      </div>
    </section>
  )
}
