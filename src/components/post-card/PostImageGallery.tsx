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
}

export function PostImageGallery({
  images,
  onImageClick,
  className = '',
  fullWidth = false,
}: PostImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isIntersectingRef = useRef(false)
  const isManualNavRef = useRef(false)
  const manualNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Trigger 5-second reveal when the gallery enters the viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting) {
          // Only trigger if transitioning from NOT visible to VISIBLE
          if (!isIntersectingRef.current) {
            isIntersectingRef.current = true
            handleMouseEnter()
            handleMouseLeave()
          }
        } else {
          isIntersectingRef.current = false
        }
      },
      {
        threshold: 0.2, // When at least 20% enters the viewport
      }
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

  if (!images || images.length === 0) return null

  // ── Single Image ──
  if (images.length === 1) {
    if (fullWidth) {
      // PostDetail: natural uncropped sizing, tight border
      return (
        <div
          className={cn(
            'w-fit max-w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]',
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
      )
    }

    // PostCard / Feed: standard 85% width frame, 26rem max-h, object-cover
    return (
      <div
        className={cn(
          'mx-auto w-[85%] overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20',
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
    if (isManualNavRef.current) return // Don't jitter during programmatic smooth scrolling

    const el = scrollRef.current
    if (!el) return
    const scrollLeft = el.scrollLeft
    const children = Array.from(el.children) as HTMLElement[]
    if (children.length === 0) return

    let closestIndex = 0
    let minDistance = Infinity

    children.forEach((child, idx) => {
      const distance = Math.abs(scrollLeft - child.offsetLeft)
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = idx
      }
    })

    setActiveIndex((prev) => (prev !== closestIndex ? closestIndex : prev))
  }

  const scrollToIndex = (idx: number) => {
    handleMouseEnter()
    const el = scrollRef.current
    if (!el) return

    // Lock out handleScroll jitter while smooth scrolling
    isManualNavRef.current = true
    if (manualNavTimerRef.current) clearTimeout(manualNavTimerRef.current)
    manualNavTimerRef.current = setTimeout(() => {
      isManualNavRef.current = false
    }, 450)

    setActiveIndex(idx)

    const targetChild = el.children[idx] as HTMLElement | undefined
    if (targetChild) {
      targetChild.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    }
    handleMouseLeave()
  }

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
      {/* Top right unified segmented page indicator with smooth sliding gold highlight */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'absolute right-3 top-3 z-20 flex items-center rounded-full border border-white/12 bg-black/75 p-0.5 text-xs font-semibold tabular-nums shadow-lg backdrop-blur-md transition-opacity duration-300',
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      >
        {/* Sliding active gold indicator pill */}
        <div
          className="absolute bottom-0.5 top-0.5 rounded-full bg-[#c8a44d] shadow-[0_0_8px_rgba(200,164,77,0.5)] transition-transform duration-200 ease-out pointer-events-none"
          style={{
            width: '22px',
            transform: `translateX(${activeIndex * 22}px)`,
          }}
        />

        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIndex(i)}
            className={cn(
              'relative z-10 flex h-5 w-[22px] items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-200 cursor-pointer',
              i === activeIndex
                ? 'text-[#0f0e0a]'
                : 'text-white/50 hover:text-white',
            )}
            title={`Go to image ${i + 1}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Left Navigation Arrow Button */}
      {activeIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            scrollToIndex(activeIndex - 1)
          }}
          className={cn(
            'absolute left-2.5 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/75 text-white/90 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/95 hover:text-white active:scale-95',
            showControls ? 'opacity-90 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          )}
          title="Previous image"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
        </button>
      )}

      {/* Right Navigation Arrow Button */}
      {activeIndex < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            scrollToIndex(activeIndex + 1)
          }}
          className={cn(
            'absolute right-2.5 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/75 text-white/90 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/95 hover:text-white active:scale-95',
            showControls ? 'opacity-90 hover:opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          )}
          title="Next image"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.2} />
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
          const isCurrent = idx === activeIndex
          return (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation()
                if (isCurrent) {
                  onImageClick(idx)
                } else {
                  scrollToIndex(idx)
                }
              }}
              className={cn(
                'relative shrink-0 snap-start overflow-hidden rounded-2xl border transition-all duration-200 w-fit',
                isCurrent
                  ? 'border-white/[0.15] bg-white/[0.02] shadow-lg cursor-zoom-in'
                  : 'border-white/[0.06] bg-white/[0.02] opacity-75 hover:opacity-95 hover:border-white/15 cursor-pointer',
              )}
            >
              {/* Main Image */}
              <img
                src={img}
                alt=""
                loading="lazy"
                className={cn(
                  'block w-auto max-w-[85vw] sm:max-w-[620px] transition-transform duration-300',
                  fullWidth
                    ? 'h-[340px] sm:h-[440px]'
                    : 'h-[280px] sm:h-[360px]',
                  isCurrent && 'group-hover/gallery:scale-[1.005]',
                )}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
