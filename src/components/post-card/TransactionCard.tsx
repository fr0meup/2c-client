import { useState } from 'react'
import { ImageLightbox } from '@/components/lightbox/ImageLightbox'

interface TransactionCardProps {
  category?: string
  merchant?: string
  date?: string
  transactionValue?: number
  currencyCode?: string
  gradient?: string
  categoryIconUrl?: string
  imageUrl?: string
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
  imageUrl,
  className = '',
}: TransactionCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const val = transactionValue ?? 0
  const isIncoming = Boolean(
    categoryIconUrl &&
      (categoryIconUrl.includes('PFC_INCOME.png') || categoryIconUrl.toLowerCase().includes('income'))
  )
  const isExpense = !isIncoming

  return (
    <>
      <div
        className={`group relative mt-3 overflow-hidden rounded-xl transition-all duration-200 hover:brightness-110 ${className}`}
        style={{
          border: isIncoming ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(244,63,94,0.3)',
          background: isIncoming
            ? 'linear-gradient(135deg, rgba(52,211,153,0.06) 0%, transparent 60%)'
            : 'linear-gradient(135deg, rgba(244,63,94,0.06) 0%, transparent 60%)',
          boxShadow: isIncoming
            ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 10px rgba(52,211,153,0.1)'
            : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 10px rgba(244,63,94,0.1)',
        }}
      >
        {/* Left accent */}
        <div
          className="absolute bottom-2 left-0 top-2 w-[2.5px] rounded-full"
          style={{
            background: isIncoming
              ? 'linear-gradient(to bottom, rgba(52,211,153,0.8), rgba(52,211,153,0.15))'
              : 'linear-gradient(to bottom, rgba(244,63,94,0.8), rgba(244,63,94,0.15))',
          }}
        />

        <div className="flex items-center justify-between gap-3 py-3.5 pl-4 pr-4">
          {/* Left details */}
          <div className="min-w-0 flex-1">
            {/* Category pill */}
            {(category || isIncoming || isExpense) && (
              <div
                className={`mb-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
                  isIncoming
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-rose-500/30 bg-rose-500/10'
                }`}
              >
                {categoryIconUrl && (
                  <img
                    src={categoryIconUrl}
                    alt=""
                    className="h-3.5 w-3.5 rounded-sm opacity-90"
                  />
                )}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isIncoming ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isIncoming
                    ? category ? `Income • ${category}` : 'Income'
                    : category ? `Outgoing • ${category}` : 'Outgoing'}
                </span>
              </div>
            )}

            {/* Amount */}
            <div className="flex items-baseline gap-0.5">
              <span
                className="text-[26px] font-bold tabular-nums tracking-tight sm:text-[30px]"
                style={{
                  color: isIncoming ? '#34d399' : '#f43f5e',
                  textShadow: isIncoming
                    ? '0 0 18px rgba(52,211,153,0.3)'
                    : '0 0 18px rgba(244,63,94,0.3)',
                }}
              >
                {isIncoming ? '+' : '−'}
                {formatAmount(val, currencyCode)}
              </span>
            </div>

            {/* Merchant & date */}
            {(merchant || date) && (
              <div className="mt-1 flex items-center gap-2">
                <span className="truncate text-[11px] font-semibold uppercase tracking-widest text-white/25">
                  {merchant && merchant}
                  {merchant && date && (
                    <span className="mx-1.5 text-white/15">•</span>
                  )}
                  {date && formatTxDate(date)}
                </span>
              </div>
            )}
          </div>

          {/* Right image thumbnail */}
          {imageUrl && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                setLightboxOpen(true)
              }}
              className="group/img relative h-20 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] shadow-md transition-all duration-200 hover:scale-[1.03] hover:border-white/25 sm:h-24 sm:w-24"
            >
              <img
                src={imageUrl}
                alt="Transaction attachment"
                className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
              />
            </div>
          )}
        </div>
      </div>

      {lightboxOpen && imageUrl && (
        <ImageLightbox
          src={imageUrl}
          downloadName={`transaction-${merchant || 'receipt'}.jpg`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}
