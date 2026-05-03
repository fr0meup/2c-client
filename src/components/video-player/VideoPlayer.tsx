import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'

interface VideoPlayerProps {
  src: string
  compact?: boolean
  className?: string
}

function formatTime(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function VideoPlayer({ src, compact = false, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [hovering, setHovering] = useState(false)
  const [seeking, setSeeking] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current)
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2500)
    }
  }, [playing])

  useEffect(() => {
    if (!playing) {
      setShowControls(true)
      clearTimeout(hideTimer.current)
    } else {
      scheduleHide()
    }
    return () => clearTimeout(hideTimer.current)
  }, [playing, scheduleHide])

  function handleMouseMove() {
    setShowControls(true)
    scheduleHide()
  }

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  function handleTimeUpdate() {
    const v = videoRef.current
    if (!v || seeking) return
    setCurrentTime(v.currentTime)
    setDuration(v.duration)
    setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0)

    if (v.buffered.length > 0) {
      setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100)
    }
  }

  function handleSeek(e: React.MouseEvent) {
    e.stopPropagation()
    const v = videoRef.current
    const bar = progressRef.current
    if (!v || !bar) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.currentTime = pct * v.duration
    setProgress(pct * 100)
    setCurrentTime(v.currentTime)
  }

  function handleSeekStart(e: React.MouseEvent) {
    e.stopPropagation()
    setSeeking(true)
    handleSeek(e)

    function onMove(ev: MouseEvent) {
      const bar = progressRef.current
      const v = videoRef.current
      if (!bar || !v) return
      const rect = bar.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
      v.currentTime = pct * v.duration
      setProgress(pct * 100)
      setCurrentTime(v.currentTime)
    }

    function onUp() {
      setSeeking(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function handleFullscreen(e: React.MouseEvent) {
    e.stopPropagation()
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen()
    }
  }

  function handleEnded() {
    setPlaying(false)
    setShowControls(true)
  }

  const controlsVisible = showControls || hovering || !playing

  return (
    <div
      ref={containerRef}
      className={`group relative overflow-hidden bg-black ${isFullscreen ? 'flex items-center justify-center' : 'rounded-2xl'} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        autoPlay={false}
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={handleEnded}
        className={`w-full ${isFullscreen ? 'max-h-screen' : compact ? 'max-h-[26rem]' : 'max-h-[32rem]'}`}
      />

      {/* Big play button overlay */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-sm transition-all hover:scale-110 hover:bg-black/60"
          >
            <Play className="h-6 w-6 fill-current pl-0.5" />
          </button>
        </div>
      )}

      {/* Bottom controls bar */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col transition-opacity duration-200 ${
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient fade */}
        <div className="h-20 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="group/bar relative mb-2 h-1 cursor-pointer rounded-full bg-white/[0.15] transition-all hover:h-1.5"
            onMouseDown={handleSeekStart}
          >
            {/* Buffered */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/[0.15]"
              style={{ width: `${buffered}%` }}
            />
            {/* Progress */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#c8a44d]"
              style={{ width: `${progress}%` }}
            />
            {/* Scrubber thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-[#c8a44d] shadow-[0_0_6px_rgba(200,164,77,0.4)] opacity-0 transition-opacity group-hover/bar:opacity-100"
              style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:text-white"
            >
              {playing ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current pl-px" />
              )}
            </button>

            <span className="text-[11px] font-medium tabular-nums text-white/50">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            <button
              onClick={toggleMute}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:text-white"
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              onClick={handleFullscreen}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:text-white"
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
