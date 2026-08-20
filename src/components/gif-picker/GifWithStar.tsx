import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { saveGif, removeGif, isGifSaved } from '@/lib/gif'
import { cn } from '@/lib/utils'

interface GifWithStarProps {
  url: string
  onOpenLightbox?: (url: string) => void
  className?: string
  imgClassName?: string
  alt?: string
}

export function GifWithStar({
  url,
  onOpenLightbox,
  className,
  imgClassName,
  alt = 'GIF',
}: GifWithStarProps) {
  const [saved, setSaved] = useState(() => isGifSaved(url))

  useEffect(() => {
    function onSync() {
      setSaved(isGifSaved(url))
    }
    window.addEventListener('gif-storage-change', onSync)
    return () => window.removeEventListener('gif-storage-change', onSync)
  }, [url])

  return (
    <div
      className={cn('group/gif relative mt-1.5 w-fit', className)}
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src={url}
        alt={alt}
        onClick={onOpenLightbox ? () => onOpenLightbox(url) : undefined}
        className={cn(
          'max-w-[240px] rounded-lg',
          onOpenLightbox && 'cursor-pointer transition-opacity hover:opacity-95',
          imgClassName
        )}
        loading="lazy"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (saved) {
            removeGif(url)
            setSaved(false)
          } else {
            saveGif(url)
            setSaved(true)
          }
        }}
        className={`absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full opacity-0 transition-all group-hover/gif:opacity-100 ${
          saved
            ? 'bg-[#c8a44d]/90 text-[#0f0e0a]'
            : 'bg-black/60 text-white/60 hover:bg-black/80 hover:text-white'
        }`}
        title={saved ? 'Remove from saved GIFs' : 'Save GIF'}
      >
        <Star className={`h-3 w-3 ${saved ? 'fill-current' : ''}`} />
      </button>
    </div>
  )
}
