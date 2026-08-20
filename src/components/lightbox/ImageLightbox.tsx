import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ZoomIn, ZoomOut, RotateCcw, Download, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageLightboxProps {
  src?: string
  images?: string[]
  initialIndex?: number
  alt?: string
  downloadName?: string
  onClose: () => void
}

const ZOOM_STEPS = [0.75, 0.85, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0]

export function ImageLightbox({
  src,
  images,
  initialIndex = 0,
  alt = '',
  downloadName = 'image.jpg',
  onClose,
}: ImageLightboxProps) {
  const imageList = useMemo(() => {
    if (images && images.length > 0) return images.filter(Boolean)
    if (src) return [src]
    return []
  }, [images, src])

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialIndex >= 0 && initialIndex < imageList.length) return initialIndex
    return 0
  })

  const currentSrc = imageList[currentIndex] || src || ''

  const [scale, setScale] = useState(0.85)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const posStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const zoomIn = useCallback(() => {
    setScale((s) => {
      const next = ZOOM_STEPS.find((lvl) => lvl > s + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]
      return next
    })
  }, [])

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const prevLevels = ZOOM_STEPS.filter((lvl) => lvl < s - 0.001)
      const next = prevLevels.length > 0 ? prevLevels[prevLevels.length - 1] : ZOOM_STEPS[0]
      if (next <= 0.85) setPosition({ x: 0, y: 0 })
      return next
    })
  }, [])

  const resetZoom = useCallback(() => {
    setScale(0.85)
    setPosition({ x: 0, y: 0 })
  }, [])

  const goToPrev = useCallback(() => {
    if (imageList.length <= 1) return
    setCurrentIndex((idx) => (idx > 0 ? idx - 1 : imageList.length - 1))
    setScale(0.85)
    setPosition({ x: 0, y: 0 })
  }, [imageList.length])

  const goToNext = useCallback(() => {
    if (imageList.length <= 1) return
    setCurrentIndex((idx) => (idx < imageList.length - 1 ? idx + 1 : 0))
    setScale(0.85)
    setPosition({ x: 0, y: 0 })
  }, [imageList.length])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === '=' || e.key === '+') zoomIn()
      else if (e.key === '-') zoomOut()
      else if (e.key === '0') resetZoom()
      else if (e.key === 'ArrowLeft') goToPrev()
      else if (e.key === 'ArrowRight') goToNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, zoomIn, zoomOut, resetZoom, goToPrev, goToNext])

  // Mouse wheel zoom
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    if (e.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }

  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const isPointerDownRef = useRef(false)
  const hasSwipedRef = useRef(false)

  // Pan / Dragging or Swiping
  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return // only left click
    isPointerDownRef.current = true
    hasSwipedRef.current = false
    touchStartRef.current = { x: e.clientX, y: e.clientY }

    if (scale > 0.85) {
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      posStartRef.current = { ...position }
    } else if (imageList.length > 1) {
      setIsSwiping(true)
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isPointerDownRef.current) return

    if (scale > 0.85 && isDragging) {
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      setPosition({
        x: posStartRef.current.x + dx,
        y: posStartRef.current.y + dy,
      })
    } else if (scale <= 0.85 && isSwiping && imageList.length > 1) {
      const dx = e.clientX - touchStartRef.current.x
      if (Math.abs(dx) > 5) {
        hasSwipedRef.current = true
      }
      // Dampen drag at boundaries
      const isAtStart = currentIndex === 0 && dx > 0
      const isAtEnd = currentIndex === imageList.length - 1 && dx < 0
      const dampenedDx = isAtStart || isAtEnd ? dx * 0.25 : dx
      setSwipeOffset(dampenedDx)
    }
  }

  function handlePointerUp() {
    if (!isPointerDownRef.current) return
    isPointerDownRef.current = false

    if (isDragging) {
      setIsDragging(false)
    }

    if (isSwiping) {
      setIsSwiping(false)
      const threshold = 45
      if (swipeOffset < -threshold && currentIndex < imageList.length - 1) {
        setCurrentIndex((i) => i + 1)
      } else if (swipeOffset > threshold && currentIndex > 0) {
        setCurrentIndex((i) => i - 1)
      }
      setSwipeOffset(0)
    }
  }

  // Double click toggle 85% / 200%
  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (scale > 0.85) {
      resetZoom()
    } else {
      setScale(2.0)
    }
  }

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    // Extract filename from URL or use default
    const urlFilename = currentSrc.split('/').pop()?.split('#')[0].split('?')[0]
    const filename = downloadName && downloadName !== 'image.jpg'
      ? downloadName
      : urlFilename && urlFilename.length > 3 && urlFilename.includes('.')
        ? urlFilename
        : `image-${Date.now()}.jpg`

    // Route external URLs through local proxies to bypass CORS completely
    let fetchUrl = currentSrc
    if (currentSrc.includes('twocents-ugc.s3.us-east-2.amazonaws.com')) {
      fetchUrl = currentSrc.replace('https://twocents-ugc.s3.us-east-2.amazonaws.com', '/s3-upload')
    } else if (currentSrc.includes('api.twocents.money')) {
      fetchUrl = currentSrc.replace('https://api.twocents.money', '/ugc-proxy')
    }

    const triggerBlobDownload = (blobUrl: string) => {
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      a.setAttribute('download', filename)
      a.style.display = 'none'
      a.addEventListener('click', (ev) => ev.stopPropagation())
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    try {
      const resp = await fetch(fetchUrl)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      triggerBlobDownload(url)
      URL.revokeObjectURL(url)
      return
    } catch {
      // Canvas fallback for CORS-restricted images
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = currentSrc
        })
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          canvas.toBlob((blob) => {
            if (!blob) return
            const url = URL.createObjectURL(blob)
            triggerBlobDownload(url)
            URL.revokeObjectURL(url)
          }, 'image/jpeg')
          return
        }
      } catch {
        // Hidden iframe download fallback (never navigates tab)
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = currentSrc
        document.body.appendChild(iframe)
        setTimeout(() => document.body.removeChild(iframe), 5000)
      }
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center overflow-hidden bg-black/90 backdrop-blur-md select-none touch-none"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top Controls Toolbar */}
      <div
        className="absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 p-1.5 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {imageList.length > 1 && (
          <>
            <span className="px-2 text-xs font-semibold tabular-nums text-[#c8a44d]">
              {currentIndex + 1} / {imageList.length}
            </span>
            <div className="mx-0.5 h-4 w-px bg-white/10" />
          </>
        )}

        <button
          onClick={zoomOut}
          disabled={scale <= 0.75}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom out (-)"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <span className="min-w-[40px] text-center text-xs font-semibold tabular-nums text-white/80">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={zoomIn}
          disabled={scale >= 4}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zoom in (+)"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        {scale !== 0.85 && (
          <button
            onClick={resetZoom}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Reset zoom (0)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="mx-1 h-4 w-px bg-white/10" />

        <button
          onClick={handleDownload}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          title="Download image"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          onClick={onClose}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/70 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
          title="Close (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Arrows for multi-image */}
      {imageList.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goToPrev()
            }}
            className="absolute left-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/80 backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20 hover:text-white active:scale-95 shadow-lg"
            title="Previous image (←)"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              goToNext()
            }}
            className="absolute right-4 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/80 backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20 hover:text-white active:scale-95 shadow-lg"
            title="Next image (→)"
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2.2} />
          </button>
        </>
      )}

      {/* Smooth Image Slider Track */}
      <div
        ref={containerRef}
        className="flex h-full w-full items-center will-change-transform"
        style={{
          transform: `translateX(calc(-${currentIndex * 100}% + ${swipeOffset}px))`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
        {imageList.map((imgSrc, idx) => {
          const isCurrent = idx === currentIndex
          return (
            <div
              key={idx}
              className="flex h-full w-full shrink-0 items-center justify-center p-4 select-none"
              onClick={(e) => {
                if (e.target === e.currentTarget && Math.abs(swipeOffset) < 5 && !hasSwipedRef.current) {
                  onClose()
                }
              }}
            >
              <img
                src={imgSrc}
                alt={alt}
                onDoubleClick={isCurrent ? handleDoubleClick : undefined}
                onClick={(e) => e.stopPropagation()}
                className={`max-h-[90vh] max-w-[90vw] rounded-xl object-contain select-none ${
                  isCurrent && scale > 0.85
                    ? isDragging
                      ? 'cursor-grabbing'
                      : 'cursor-grab'
                    : 'cursor-zoom-in'
                }`}
                style={{
                  transform: isCurrent
                    ? `translate(${position.x}px, ${position.y}px) scale(${scale})`
                    : 'scale(0.85)',
                  transition: isCurrent && isDragging
                    ? 'none'
                    : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                draggable={false}
              />
            </div>
          )
        })}
      </div>

      {/* Bottom pagination dots for multi-image */}
      {imageList.length > 1 && (
        <div
          className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {imageList.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentIndex(i)
                setScale(0.85)
                setPosition({ x: 0, y: 0 })
              }}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                i === currentIndex
                  ? 'w-6 bg-[#c8a44d] shadow-[0_0_8px_rgba(200,164,77,0.5)]'
                  : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
              title={`Image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}
