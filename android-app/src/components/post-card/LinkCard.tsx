import { ExternalLink, Globe } from 'lucide-react'

interface LinkCardProps {
  url: string
  className?: string
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function LinkCard({ url, className = '' }: LinkCardProps) {
  const domain = extractDomain(url)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`group mt-3 flex items-center gap-3 overflow-hidden rounded-xl transition-all duration-200 hover:brightness-110 ${className}`}
      style={{
        border: '1px solid rgba(200,164,77,0.18)',
        background: 'linear-gradient(135deg, rgba(200,164,77,0.04) 0%, transparent 60%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Icon area */}
      <div className="flex h-full shrink-0 items-center pl-3.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            background: 'rgba(200,164,77,0.08)',
            border: '1px solid rgba(200,164,77,0.12)',
          }}
        >
          <Globe className="h-4 w-4 text-[#c8a44d]/70" />
        </div>
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1 py-3 pr-1">
        <p className="truncate text-[13px] font-semibold text-white/80 group-hover:text-white/90">
          {domain}
        </p>
        <p className="truncate text-[11px] text-white/30 group-hover:text-white/40">
          {url}
        </p>
      </div>

      {/* Arrow */}
      <div className="shrink-0 pr-3.5">
        <ExternalLink className="h-3.5 w-3.5 text-white/20 transition-colors group-hover:text-[#c8a44d]/60" />
      </div>
    </a>
  )
}
