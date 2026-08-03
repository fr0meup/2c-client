interface BudgetCategory {
  id: string
  label: string
  color: string
  icon: string
  allocated: number
  spent: number
}

interface BudgetCardProps {
  month?: string
  spendingLimit?: number
  totalAllocated?: number
  totalSpent?: number
  categories?: BudgetCategory[]
  className?: string
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatUSD(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function BudgetCard({
  month,
  totalAllocated = 0,
  totalSpent = 0,
  categories = [],
  className = '',
}: BudgetCardProps) {
  const overallPercent = totalAllocated > 0 ? Math.min((totalSpent / totalAllocated) * 100, 100) : 0

  // Build stacked bar segments from spent categories
  const spentCategories = categories.filter((c) => c.spent > 0)
  const stackedSegments = spentCategories.map((cat) => ({
    color: cat.color,
    width: totalAllocated > 0 ? (cat.spent / totalAllocated) * 100 : 0,
  }))

  return (
    <div
      className={`group relative mt-3 overflow-hidden rounded-xl transition-all duration-200 ${className}`}
      style={{
        border: '1px solid rgba(200,164,77,0.15)',
        background: 'linear-gradient(135deg, rgba(200,164,77,0.03) 0%, rgba(15,14,10,0.6) 60%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      {/* Gold left accent */}
      <div
        className="absolute bottom-2 left-0 top-2 w-[2.5px] rounded-full"
        style={{
          background: 'linear-gradient(to bottom, rgba(200,164,77,0.5), rgba(200,164,77,0.08))',
        }}
      />

      <div className="px-4 py-3.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#c8a44d] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            Budget
          </span>
          {month && (
            <span className="text-xs font-medium text-white/35">{formatMonth(month)}</span>
          )}
        </div>

        {/* Spent summary */}
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-white/60">Spent</span>
          <div className="flex items-baseline gap-1">
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: '#c8a44d' }}
            >
              {formatUSD(totalSpent)}
            </span>
            <span className="text-xs text-white/30">of</span>
            <span className="text-xs font-medium tabular-nums text-white/40">
              {formatUSD(totalAllocated)}
            </span>
          </div>
        </div>

        {/* Stacked overall bar */}
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="flex h-full" style={{ width: `${Math.min(overallPercent, 100)}%` }}>
            {stackedSegments.map((seg, i) => (
              <div
                key={i}
                className="h-full transition-all duration-500"
                style={{
                  width: `${(seg.width / overallPercent) * 100}%`,
                  backgroundColor: seg.color,
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
        </div>

        {/* Category rows */}
        <div className="mt-3.5 flex flex-col gap-1">
          {categories.map((cat) => {
            const pctOfBudget = totalAllocated > 0 ? Math.round((cat.allocated / totalAllocated) * 100) : 0
            const spentPct = cat.allocated > 0 ? Math.min((cat.spent / cat.allocated) * 100, 100) : 0
            const isOver = cat.spent > cat.allocated && cat.allocated > 0

            return (
              <div key={cat.id} className="group/cat py-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <img
                      src={cat.icon}
                      alt=""
                      className="h-4 w-4 shrink-0 opacity-50"
                      loading="lazy"
                    />
                    <span className="truncate text-[13px] font-medium text-white/70">
                      {cat.label}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums">
                    <span className="text-white/30">{pctOfBudget}%</span>
                    <span className="text-white/15">|</span>
                    <span className={isOver ? 'font-semibold text-rose-400' : 'text-white/40'}>
                      {formatUSD(cat.spent)}
                    </span>
                    <span className="text-white/20">of</span>
                    <span className="text-white/30">{formatUSD(cat.allocated)}</span>
                  </div>
                </div>

                {/* Category progress bar */}
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${isOver ? 100 : spentPct}%`,
                      backgroundColor: cat.color,
                      opacity: cat.spent > 0 ? 0.7 : 0.15,
                      boxShadow: isOver ? `0 0 8px ${cat.color}40` : 'none',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
