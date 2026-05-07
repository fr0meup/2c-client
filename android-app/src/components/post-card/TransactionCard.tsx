interface TransactionCardProps {
  category?: string
  merchant?: string
  date?: string
  transactionValue?: number
  currencyCode?: string
  gradient?: string
  categoryIconUrl?: string
  className?: string
}

function formatTxDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

function formatAmount(value: number, currency: string): string {
  const abs = Math.abs(value)
  return abs.toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function TransactionCard({
  category,
  merchant,
  date,
  transactionValue,
  currencyCode = 'USD',
  categoryIconUrl,
  className = '',
}: TransactionCardProps) {
  const isExpense = (transactionValue ?? 0) < 0

  return (
    <div
      className={`group relative mt-3 overflow-hidden rounded-xl transition-all duration-200 hover:brightness-110 ${className}`}
      style={{
        border: '1px solid rgba(200,164,77,0.2)',
        background: 'linear-gradient(135deg, rgba(200,164,77,0.04) 0%, transparent 60%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Gold left accent — matches QuotePostCard pattern */}
      <div
        className="absolute bottom-2 left-0 top-2 w-[2.5px] rounded-full"
        style={{
          background: 'linear-gradient(to bottom, rgba(200,164,77,0.5), rgba(200,164,77,0.08))',
        }}
      />

      <div className="py-3.5 pl-4 pr-4">
        {/* Category pill */}
        {category && (
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {categoryIconUrl && (
              <img
                src={categoryIconUrl}
                alt=""
                className="h-3.5 w-3.5 rounded-sm opacity-60"
              />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {category}
            </span>
          </div>
        )}

        {/* Amount */}
        <div className="flex items-baseline gap-0.5">
          <span
            className="text-[26px] font-bold tabular-nums tracking-tight"
            style={{
              color: '#c8a44d',
              textShadow: '0 0 18px rgba(200,164,77,0.2)',
            }}
          >
            {isExpense && '−'}
            {formatAmount(transactionValue ?? 0, currencyCode)}
          </span>
        </div>

        {/* Merchant & date */}
        {(merchant || date) && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/25">
              {merchant && merchant}
              {merchant && date && (
                <span className="mx-1.5 text-white/15">•</span>
              )}
              {date && formatTxDate(date)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
