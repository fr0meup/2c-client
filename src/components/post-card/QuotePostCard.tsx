import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { NetworthPill } from '@/components/networth-pill/NetworthPill'
import type { PostCardData } from './types'
import { timeAgo, renderPostText, formatExactDateTime } from './utils'
import { getPostImages, PostImageGallery } from './PostImageGallery'
import { ImageLightbox } from '@/components/lightbox/ImageLightbox'
import { VideoPlayer } from '@/components/video-player/VideoPlayer'
import { PollCard } from './PollCard'
import { LikertScale } from './LikertScale'
import { PicksCard } from './PicksCard'
import { TransactionCard } from './TransactionCard'
import { BudgetCard } from './BudgetCard'
import { LinkCard } from './LinkCard'
import { saveScrollPosition } from '@/App'
import { announceNavigationPending } from '@/lib/navigationPending'
import { cn } from '@/lib/utils'

interface QuotePostCardProps {
  quote: PostCardData
  className?: string
  pollUserVote?: number
  likertUserVote?: number
  pickUserVote?: 'yes' | 'no'
}

export function QuotePostCard({
  quote,
  className = '',
  pollUserVote,
  likertUserVote,
  pickUserVote,
}: QuotePostCardProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const isPoll = quote.post_type === 2 && Array.isArray(quote.post_meta?.poll) && quote.post_meta.poll.length > 0
  const isLikert = quote.post_type === 5
  const isPicks = quote.post_type === 7
  const isTransaction = quote.post_type === 8
  const isBudget = quote.post_type === 9
  const isLink = quote.post_type === 1 && !!quote.post_meta?.link

  // Look up user votes from props or cached feed queries
  const resolvedPollVote = (() => {
    if (pollUserVote !== undefined) return pollUserVote
    const feedQueries = queryClient.getQueriesData<{ pages?: { polls?: { post_uuid: string; option: number }[] }[] }>({ queryKey: ['feed'] })
    for (const [, feedData] of feedQueries) {
      if (!feedData?.pages) continue
      for (const page of feedData.pages) {
        const p = page.polls?.find((x) => x.post_uuid === quote.uuid)
        if (p !== undefined) return p.option
      }
    }
    return undefined
  })()

  const resolvedLikertVote = (() => {
    if (likertUserVote !== undefined) return likertUserVote
    const feedQueries = queryClient.getQueriesData<{ pages?: { likertVotes?: { post_uuid: string; option: number }[] }[] }>({ queryKey: ['feed'] })
    for (const [, feedData] of feedQueries) {
      if (!feedData?.pages) continue
      for (const page of feedData.pages) {
        const l = page.likertVotes?.find((x) => x.post_uuid === quote.uuid)
        if (l !== undefined) return l.option
      }
    }
    return undefined
  })()

  const resolvedPickVote = (() => {
    if (pickUserVote !== undefined) return pickUserVote
    const feedQueries = queryClient.getQueriesData<{ pages?: { pickVotes?: { post_uuid: string; vote: 'yes' | 'no' }[] }[] }>({ queryKey: ['feed'] })
    for (const [, feedData] of feedQueries) {
      if (!feedData?.pages) continue
      for (const page of feedData.pages) {
        const pk = page.pickVotes?.find((x) => x.post_uuid === quote.uuid)
        if (pk !== undefined) return pk.vote
      }
    }
    return undefined
  })()

  const images = getPostImages(quote.post_meta)
  const imageSrc = images[0] || quote.post_meta?.src
  const isVideo = quote.post_meta?.media_type === 'video'

  if (!quote?.author_meta) return null

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation()
          const parentCard = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-post-uuid]')
          const postUuid = parentCard?.dataset.postUuid || quote.uuid
          saveScrollPosition(postUuid)
          announceNavigationPending(`/post/${quote.uuid}`)
          navigate(`/post/${quote.uuid}`)
        }}
        className={cn(
          'group mt-3 relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] p-3 sm:p-3.5 transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.025]',
          className,
        )}
        style={{
          background:
            'linear-gradient(135deg, rgba(200,164,77,0.03) 0%, rgba(255,255,255,0.015) 100%)',
        }}
      >
        {/* Gold left accent */}
        <div
          className="absolute bottom-2.5 left-0 top-2.5 w-[1.5px] rounded-full transition-opacity duration-200"
          style={{
            background:
              'linear-gradient(to bottom, rgba(200,164,77,0.22), rgba(200,164,77,0.03))',
          }}
        />

        {/* Faint quote mark watermark */}
        <div
          className="pointer-events-none absolute right-3.5 top-1 select-none font-serif text-[42px] leading-none"
          style={{ color: 'rgba(200,164,77,0.04)' }}
        >
          &ldquo;
        </div>

        <div className="min-w-0 pl-1.5">
          {/* Header */}
          <div className="flex items-center gap-2">
            <NetworthPill
              networth={quote.author_meta.balance}
              subscriptionType={quote.author_meta.subscription_type}
              authorUuid={quote.author_uuid}
              role={quote.author_meta.role}
              size="small"
            />
            <span
              className="text-[11px] text-white/35 cursor-help hover:text-white/55 transition-colors"
              title={formatExactDateTime(quote.created_at)}
            >
              {timeAgo(quote.created_at)}
            </span>
            {quote.topic && (
              <span className="text-[11px] font-semibold text-[#c8a44d]/70">
                $/{quote.topic.toLowerCase()}
              </span>
            )}
          </div>

          {/* Title */}
          {quote.title && (
            <p className="mt-1.5 text-[13px] font-bold text-white/90 leading-snug">
              {quote.title}
            </p>
          )}

          {/* Body */}
          {quote.text && (
            <div className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-white/60">
              {renderPostText(quote.text)}
            </div>
          )}

          {/* Poll */}
          {isPoll && quote.post_meta?.poll && (
            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
              <PollCard
                postUuid={quote.uuid}
                options={quote.post_meta.poll}
                userVote={resolvedPollVote}
              />
            </div>
          )}

          {/* Likert Scale */}
          {isLikert && (
            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
              <LikertScale
                postUuid={quote.uuid}
                userVote={resolvedLikertVote}
              />
            </div>
          )}

          {/* Picks Card */}
          {isPicks && (
            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
              <PicksCard
                postUuid={quote.uuid}
                priceHistory={quote.post_meta?.price_history}
                resolutionDeadline={quote.post_meta?.resolution_deadline}
                userVote={resolvedPickVote}
              />
            </div>
          )}

          {/* Transaction Card */}
          {isTransaction && quote.post_meta && (
            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
              <TransactionCard
                category={quote.post_meta.category}
                merchant={quote.post_meta.merchant}
                date={quote.post_meta.date}
                transactionValue={quote.post_meta.transactionValue}
                currencyCode={quote.post_meta.currencyCode}
                categoryIconUrl={quote.post_meta.categoryIconUrl}
                imageUrl={quote.post_meta.imageUrl}
              />
            </div>
          )}

          {/* Budget Card */}
          {isBudget && quote.post_meta && (
            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
              <BudgetCard
                month={quote.post_meta.month}
                spendingLimit={quote.post_meta.spendingLimit}
                totalAllocated={quote.post_meta.totalAllocated}
                totalSpent={quote.post_meta.totalSpent}
                categories={quote.post_meta.categories}
              />
            </div>
          )}

          {/* Link Card */}
          {isLink && quote.post_meta?.link && (
            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
              <LinkCard url={quote.post_meta.link} />
            </div>
          )}

          {/* Media (Single or Multi-image Carousel) — when not a transaction */}
          {!isTransaction && images.length > 0 && !isVideo && (
            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
              <PostImageGallery
                images={images}
                compact
                onImageClick={(idx) => {
                  setLightboxIndex(idx)
                  setLightboxOpen(true)
                }}
              />
            </div>
          )}

          {/* Video */}
          {!isTransaction && imageSrc && isVideo && (
            <div className="mt-2.5 overflow-hidden rounded-xl" onClick={(e) => e.stopPropagation()}>
              <VideoPlayer src={imageSrc} />
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for quote images */}
      {lightboxOpen && images.length > 0 && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}
