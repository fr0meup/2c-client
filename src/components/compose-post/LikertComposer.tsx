import { X } from 'lucide-react'

interface LikertComposerProps {
  likertValue: number | null
  setLikertValue: (val: number | null) => void
  onClose: () => void
}

const LIKERT_LABELS = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
]

export function LikertComposer({
  likertValue,
  setLikertValue,
  onClose,
}: LikertComposerProps) {
  return (
    <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Likert Scale
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-white/40 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex justify-between gap-1">
        {LIKERT_LABELS.map((label, i) => (
          <div key={label} className="flex flex-col items-center" style={{ flex: '1 1 0', minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setLikertValue(i)}
              className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition-all duration-200 ${
                likertValue === i
                  ? 'scale-110'
                  : 'hover:scale-105 hover:border-white/15'
              }`}
              style={{
                background:
                  likertValue === i
                    ? 'radial-gradient(circle at 40% 35%, rgba(200,164,77,0.2) 0%, rgba(200,164,77,0.04) 80%)'
                    : 'rgba(255,255,255,0.03)',
                border:
                  likertValue === i
                    ? '1.5px solid rgba(200,164,77,0.45)'
                    : '1px solid rgba(255,255,255,0.08)',
                boxShadow:
                  likertValue === i
                    ? '0 0 20px rgba(200,164,77,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: likertValue === i ? '#c8a44d' : 'rgba(255,255,255,0.2)' }}
              >
                •
              </span>
            </button>
            <span
              className="mt-1.5 text-center text-[9px] font-semibold leading-tight"
              style={{ color: likertValue === i ? '#c8a44d' : 'rgba(255,255,255,0.25)' }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
