import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LEADERBOARD_META } from './config'
import { useLeaderboard } from './LeaderboardContext'

export function LeaderboardHeader() {
  const navigate = useNavigate()
  const { board, setBoard } = useLeaderboard()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const activeMeta = LEADERBOARD_META.find((m) => m.value === board)!

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative flex h-10 items-center justify-between">
      <button
        onClick={() => navigate(-1)}
        title="Back"
        className="group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/70 transition-colors hover:bg-gradient-to-b hover:from-white/[0.09] hover:to-white/[0.04] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={2.2} />
      </button>

      {/* Selector */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((p) => !p)}
          className="group flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-4 text-sm font-semibold text-white/80 transition-all hover:border-[#c8a44d]/30 hover:bg-gradient-to-b hover:from-[#c8a44d]/[0.1] hover:to-[#c8a44d]/[0.04] hover:text-[#c8a44d] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        >
          <span>{activeMeta.label}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} strokeWidth={2.2} />
        </button>

        {open && (
          <div className="absolute left-1/2 top-full z-50 mt-1.5 w-52 -translate-x-1/2 rounded-xl border border-white/[0.08] bg-[#141410] p-1 shadow-xl shadow-black/40">
            {LEADERBOARD_META.map((meta) => (
              <button
                key={meta.value}
                onClick={() => { setBoard(meta.value); setOpen(false) }}
                className={cn(
                  'flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  meta.value === board
                    ? 'bg-[#c8a44d]/10 font-medium text-[#c8a44d]'
                    : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                )}
              >
                {meta.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="h-10 w-10 shrink-0" />
    </div>
  )
}
