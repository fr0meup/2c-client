import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PostMeta } from './types'

export function getPostImages(postMeta?: PostMeta): string[] {
  if (!postMeta) return []
  if (Array.isArray(postMeta.imageUrls) && postMeta.imageUrls.length > 0) {
    return postMeta.imageUrls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
  }
  if (Array.isArray(postMeta.image_urls) && postMeta.image_urls.length > 0) {
    return postMeta.image_urls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
  }
  const single = postMeta.src || postMeta.imageUrl
  if (single && typeof single === 'string' && single.trim().length > 0) {
    return [single.trim()]
  }
  return []
}

interface PostImageGalleryProps {
  images: string[]
  onImageClick: (index: number) => void
  className?: string
  fullWidth?: boolean
  compact?: boolean
}

export function PostImageGallery({
  images,
  onImageClick,
  className = '',
  fullWidth = false,
  compact = false,
}: PostImageGalleryProps) {
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 })
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isIntersectingRef = useRef(false)

  const handleMouseEnter = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    setShowControls(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
    }
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false)
      hideTimerRef.current = null
    }, 5000)
  }, [])

  // Reveal controls for 5 seconds when entering viewport without any auto-scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting) {
          if (!isIntersectingRef.current) {
            isIntersectingRef.current = true
            handleMouseEnter()
            handleMouseLeave()
          }
        } else {
          isIntersectingRef.current = false
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [handleMouseEnter, handleMouseLeave])

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
      }
    }
  }, [])

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const { scrollLeft, clientWidth, scrollWidth } = el
    const maxScroll = scrollWidth - clientWidth

    // Arrow bounds
    const atStart = scrollLeft <= 4
    const atEnd = maxScroll <= 4 || scrollLeft >= maxScroll - 6

    setCanScrollLeft(!atStart && maxScroll > 4)
    setCanScrollRight(!atEnd && maxScroll > 4)

    const children = Array.from(el.children) as HTMLElement[]
    if (children.length === 0) return

    const viewLeft = scrollLeft
    const viewRight = scrollLeft + clientWidth

    const visibleIndices: number[] = []
    let maxOverlapIdx = 0
    let maxOverlap = 0

    children.forEach((child, idx) => {
      const childLeft = child.offsetLeft
      const childRight = child.offsetLeft + child.offsetWidth
      const childWidth = child.offsetWidth || 1

      const overlap = Math.max(0, Math.min(childRight, viewRight) - Math.max(childLeft, viewLeft))
      if (overlap > maxOverlap) {
        maxOverlap = overlap
        maxOverlapIdx = idx
      }

      // An image is considered shown ONLY if the ENTIRE image is fully visible in view
      if (overlap >= childWidth - 3 || overlap / childWidth >= 0.96) {
        visibleIndices.push(idx)
      }
    })

    if (visibleIndices.length > 0) {
      const start = visibleIndices[0]
      const end = visibleIndices[visibleIndices.length - 1]
      setVisibleRange((prev) => (prev.start !== start || prev.end !== end ? { start, end } : prev))
    } else {
      setVisibleRange({ start: maxOverlapIdx, end: maxOverlapIdx })
    }
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => updateScrollState())
    ro.observe(el)
    return () => ro.disconnect()
  }, [images, updateScrollState])

  if (!images || images.length === 0) return null

  // ── Single Image ──
  if (images.length === 1) {
    if (compact) {
      // Quote post: full-width cropped image
      return (
        <div
          className={cn(
            'w-full overflow-hidden rounded-xl',
            className,
          )}
        >
          <img
            src={images[0]}
            alt=""
            onClick={(e) => {
              e.stopPropagation()
              onImageClick(0)
            }}
            loading="lazy"
            className="w-full max-h-[16rem] sm:max-h-[18rem] object-cover cursor-zoom-in transition-transform duration-300 hover:scale-[1.008]"
          />
        </div>
      )
    }

    if (fullWidth) {
      // PostDetail: natural uncropped sizing, centered
      return (
        <div className="flex w-full justify-center">
          <div
            className={cn(
              'w-fit max-w-full overflow-hidden rounded-2xl',
              className,
            )}
          >
            <img
              src={images[0]}
              alt=""
              onClick={(e) => {
                e.stopPropagation()
                onImageClick(0)
              }}
              loading="lazy"
              className="block w-auto h-auto max-w-full max-h-[38rem] cursor-zoom-in transition-opacity duration-200 hover:opacity-95"
            />
          </div>
        </div>
      )
    }

    // PostCard / Feed: standard 85% width frame, 26rem max-h, object-cover
    return (
      <div
        className={cn(
          'mx-auto w-[85%] overflow-hidden rounded-2xl',
          className,
        )}
      >
        <img
          src={images[0]}
          alt=""
          onClick={(e) => {
            e.stopPropagation()
            onImageClick(0)
          }}
          loading="lazy"
          className="w-full max-h-[26rem] object-cover cursor-zoom-in transition-opacity duration-200 hover:opacity-95"
        />
      </div>
    )
  }

  // ── Multi-Image Carousel + Peek Track ──
  const handleScroll = () => {
    updateScrollState()
  }

  const scrollToIndex = (idx: number) => {
    handleMouseEnter()
    const el = scrollRef.current
    if (!el) return

    const targetChild = el.children[idx] as HTMLElement | undefined
    if (targetChild) {
      targetChild.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }

    handleMouseLeave()
  }

  const visibleCount = visibleRange.end - visibleRange.start + 1

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group/gallery relative w-full select-none',
        className,
      )}
    >
      {/* Top right unified segmented page indicator with smooth sliding gold highlight spanning all visible images */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'absolute z-20 flex items-center rounded-full border border-white/12 bg-black/75 p-0.5 text-xs font-semibold tabular-nums shadow-lg backdrop-blur-md transition-opacity duration-300',
          compact ? 'right-2 top-2 scale-90' : 'right-3 top-3',
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      >
        {/* Sliding active gold indicator pill */}
        <div
          className="absolute bottom-0.5 top-0.5 rounded-full bg-[#c8a44d] shadow-[0_0_8px_rgba(200,164,77,0.5)] transition-all duration-100 ease-out pointer-events-none"
          style={{
            left: '2px',
            width: `${visibleCount * 22}px`,
            transform: `translateX(${visibleRange.start * 22}px)`,
          }}
        />

        {images.map((_, i) => {
          const isVisible = i >= visibleRange.start && i <= visibleRange.end
          return (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              className={cn(
                'relative z-10 flex h-5 w-[22px] items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-200 cursor-pointer',
                isVisible
                  ? 'text-[#0f0e0a]'
                  : 'text-white/50 hover:text-white',
              )}
              title={`Go to image ${i + 1}`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Left Navigation Arrow Button */}
      {canScrollLeft && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            scrollToIndex(Math.max(0, visibleRange.start - 1))
          }}
          className={cn(
            'absolute top-1/2 z-20 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/75 text-white/90 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/95 hover:text-white active:scale-95',
            compact ? 'left-1.5 h-7 w-7' : 'left-2.5 h-9 w-9',
            showControls ? 'opacity-90 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          )}
          title="Previous image"
        >
          <ChevronLeft className={compact ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={2.2} />
        </button>
      )}

      {/* Right Navigation Arrow Button */}
      {canScrollRight && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            scrollToIndex(Math.min(images.length - 1, visibleRange.end + 1))
          }}
          className={cn(
            'absolute top-1/2 z-20 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/75 text-white/90 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/95 hover:text-white active:scale-95',
            compact ? 'right-1.5 h-7 w-7' : 'right-2.5 h-9 w-9',
            showControls ? 'opacity-90 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          )}
          title="Next image"
        >
          <ChevronRight className={compact ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={2.2} />
        </button>
      )}

      {/* Scrollable Track */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex w-full items-center gap-2 overflow-x-auto px-0.5 py-0.5 snap-x snap-mandatory scroll-smooth no-scrollbar"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {images.map((img, idx) => {
          const isVisible = idx >= visibleRange.start && idx <= visibleRange.end
          return (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation()
                onImageClick(idx)
              }}
              className={cn(
                'relative shrink-0 snap-start overflow-hidden transition-all duration-200 w-fit cursor-zoom-in',
                compact ? 'rounded-xl' : 'rounded-2xl',
                !isVisible && 'opacity-75 hover:opacity-95',
              )}
            >
              {/* Main Image */}
              <img
                src={img}
                alt=""
                loading="lazy"
                className={cn(
                  'block w-auto max-w-[85vw] transition-transform duration-300',
                  compact
                    ? 'h-[160px] sm:h-[200px] sm:max-w-[440px]'
                    : fullWidth
                      ? 'h-[340px] sm:h-[440px] sm:max-w-[620px]'
                      : 'h-[280px] sm:h-[360px] sm:max-w-[620px]',
                  isVisible && 'group-hover/gallery:scale-[1.005]',
                )}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
