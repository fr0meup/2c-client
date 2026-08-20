import { X, Plus, Minus } from 'lucide-react'

interface PollComposerProps {
  pollOptions: string[]
  setPollOptions: React.Dispatch<React.SetStateAction<string[]>>
  onClose: () => void
  maxOptions?: number
}

export function PollComposer({
  pollOptions,
  setPollOptions,
  onClose,
  maxOptions = 10,
}: PollComposerProps) {
  return (
    <div className="mb-3 space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Poll
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {pollOptions.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              value={opt}
              onChange={(e) => {
                const updated = [...pollOptions]
                updated[i] = e.target.value
                setPollOptions(updated)
              }}
              placeholder={`Option ${i + 1}`}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 pr-12 text-sm text-white placeholder:text-white/20 focus:border-[#c8a44d]/30 focus:outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/20">
              {50 - opt.length}
            </span>
          </div>
          {pollOptions.length > 2 && (
            <button
              type="button"
              onClick={() =>
                setPollOptions((prev) => prev.filter((_, idx) => idx !== i))
              }
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white"
            >
              <Minus className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {pollOptions.length < maxOptions && (
        <button
          type="button"
          onClick={() => setPollOptions((prev) => [...prev, ''])}
          className="flex cursor-pointer items-center gap-1 text-xs text-white/40 transition-colors hover:text-white"
        >
          <Plus className="h-3 w-3" />
          <span>Add option</span>
        </button>
      )}
    </div>
  )
}
