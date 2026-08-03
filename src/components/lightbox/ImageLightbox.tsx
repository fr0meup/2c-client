import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ZoomIn, ZoomOut, RotateCcw, Download, X } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt?: string
  downloadName?: string
  onClose: () => void
}

const ZOOM_STEPS = [0.75, 0.85, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0]

export function ImageLightbox({ src, alt = '', downloadName = 'image.jpg', onClose }: ImageLightboxProps) {
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

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === '=' || e.key === '+') zoomIn()
      else if (e.key === '-') zoomOut()
      else if (e.key === '0') resetZoom()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, zoomIn, zoomOut, resetZoom])

  // Mouse wheel zoom
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    if (e.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }

  // Pan / Dragging
  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    posStartRef.current = { ...position }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPosition({
      x: posStartRef.current.x + dx,
      y: posStartRef.current.y + dy,
    })
  }

  function handleMouseUp() {
    setIsDragging(false)
  }

  // Double click toggle 1x / 2x
  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (scale > 1) {
      resetZoom()
    } else {
      setScale(2)
    }
  }

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    // Extract filename from URL or use default
    const urlFilename = src.split('/').pop()?.split('#')[0].split('?')[0]
    const filename = downloadName && downloadName !== 'image.jpg'
      ? downloadName
      : urlFilename && urlFilename.length > 3 && urlFilename.includes('.')
        ? urlFilename
        : `image-${Date.now()}.jpg`

    // Route external URLs through local proxies to bypass CORS completely
    let fetchUrl = src
    if (src.includes('twocents-ugc.s3.us-east-2.amazonaws.com')) {
      fetchUrl = src.replace('https://twocents-ugc.s3.us-east-2.amazonaws.com', '/s3-upload')
    } else if (src.includes('api.twocents.money')) {
      fetchUrl = src.replace('https://api.twocents.money', '/ugc-proxy')
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
          img.src = src
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
        iframe.src = src
        document.body.appendChild(iframe)
        setTimeout(() => document.body.removeChild(iframe), 5000)
      }
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center overflow-hidden bg-black/90 backdrop-blur-md select-none"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
      onWheel={handleWheel}
    >
      {/* Top Controls Toolbar */}
      <div
        className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 p-1.5 backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
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

        {Math.abs(scale - 0.85) > 0.01 && (
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

      {/* Image container */}
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center p-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt={alt}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => e.stopPropagation()}
          className={`max-h-[90vh] max-w-[90vw] rounded-xl object-contain transition-transform ${
            isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-zoom-in'
          }`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          draggable={false}
        />
      </div>
    </div>,
    document.body
  )
}
