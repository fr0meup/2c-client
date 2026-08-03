import { useNavigate } from 'react-router-dom'
import { NetworthPill } from '@/components/networth-pill/NetworthPill'
import type { PostCardData } from './types'
import { timeAgo, renderPostText, formatExactDateTime } from './utils'

interface QuotePostCardProps {
  quote: PostCardData
  className?: string
}

export function QuotePostCard({ quote, className = '' }: QuotePostCardProps) {
  const navigate = useNavigate()
  const imageSrc = quote.post_meta?.src
  const isVideo = quote.post_meta?.media_type === 'video'

  if (!quote?.author_meta) return null

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        navigate(`/post/${quote.uuid}`)
      }}
      className={`group mt-3 relative cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-200 hover:border-white/[0.1] hover:brightness-110 ${className}`}
      style={{
        background:
          'linear-gradient(135deg, rgba(200,164,77,0.025) 0%, transparent 50%)',
      }}
    >
      {/* Gold left accent */}
      <div
        className="absolute bottom-2 left-0 top-2 w-[2.5px] rounded-full"
        style={{
          background:
            'linear-gradient(to bottom, rgba(200,164,77,0.5), rgba(200,164,77,0.08))',
        }}
      />

      {/* Faint quote mark watermark */}
      <div
        className="pointer-events-none absolute right-3 top-0.5 select-none font-serif text-[44px] leading-none"
        style={{ color: 'rgba(200,164,77,0.04)' }}
      >
        &ldquo;
      </div>

      <div className="flex gap-3 py-3 pl-4 pr-3.5">
        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex items-center gap-2">
            <NetworthPill
              networth={quote.author_meta.balance}
              subscriptionType={quote.author_meta.subscription_type}
              authorUuid={quote.author_uuid}
              role={quote.author_meta.role}
              size="small"
            />
            <span className="text-[11px] text-white/30 cursor-help hover:text-white/50 transition-colors" title={formatExactDateTime(quote.created_at)}>
              {timeAgo(quote.created_at)}
            </span>
            {quote.topic && (
              <span className="text-[11px] font-semibold text-[#c8a44d]/60">
                $/{quote.topic.toLowerCase()}
              </span>
            )}
          </div>

          {/* Title */}
          {quote.title && (
            <p className="mt-1.5 text-[13px] font-bold text-white/85">
              {quote.title}
            </p>
          )}

          {/* Body */}
          <div className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-white/45">
            {renderPostText(quote.text)}
          </div>
        </div>

        {/* Image thumbnail — avoids cut-off by showing as a compact square */}
        {imageSrc && !isVideo && (
          <img
            src={imageSrc}
            alt=""
            className="h-[56px] w-[56px] shrink-0 self-center rounded-lg object-cover ring-1 ring-white/[0.06] transition-opacity group-hover:opacity-80"
          />
        )}

        {/* Video badge thumbnail */}
        {imageSrc && isVideo && (
          <div className="relative h-[56px] w-[56px] shrink-0 self-center overflow-hidden rounded-lg ring-1 ring-white/[0.06]">
            <video
              src={imageSrc}
              muted
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <svg
                className="h-4 w-4 text-white/80"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
