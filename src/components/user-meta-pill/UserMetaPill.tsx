import { GenderIcon } from '@/components/gender-icon'
import type { UserMetaPillProps } from './types'

export function UserMetaPill({
  elo,
  alias,
  gender,
  age,
  arena,
  children,
  className = '',
}: UserMetaPillProps) {
  const hasElo = elo != null && elo > 0
  const hasAlias = alias != null && alias.trim().length > 0
  const hasGender = gender != null && gender.trim().length > 0
  const hasAge = age != null && age > 0
  const hasArena = arena != null && arena.trim().length > 0

  const hasAny = hasElo || hasAlias || hasGender || hasAge || hasArena || children != null
  if (!hasAny) return null

  function Separator() {
    return <span className="h-5 w-px shrink-0 bg-white/[0.1]" />
  }

  const tier = hasElo
    ? elo >= 1700 ? 'gold' : elo >= 1500 ? 'silver' : 'bronze'
    : null

  const tierColors = tier && {
    gold: {
      from: 'rgba(218,178,50,0.25)',
      to: 'rgba(218,178,50,0.10)',
      border: 'rgba(218,178,50,0.35)',
      text: '#dab232',
      shadow: 'rgba(218,178,50,0.15)',
    },
    silver: {
      from: 'rgba(192,192,210,0.25)',
      to: 'rgba(192,192,210,0.10)',
      border: 'rgba(192,192,210,0.35)',
      text: '#c0c0d2',
      shadow: 'rgba(192,192,210,0.15)',
    },
    bronze: {
      from: 'rgba(205,127,50,0.25)',
      to: 'rgba(205,127,50,0.10)',
      border: 'rgba(205,127,50,0.35)',
      text: '#cd7f32',
      shadow: 'rgba(205,127,50,0.15)',
    },
  }[tier]

  return (
    <div
      className={`inline-flex h-[38px] min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap rounded-full border border-[#c8a44d]/20 bg-gradient-to-r from-[#c8a44d]/[0.06] via-white/[0.04] to-[#c8a44d]/[0.06] text-sm text-white/70 shadow-[0_0_12px_rgba(218,178,87,0.05),inset_0_1px_0_rgba(255,255,255,0.1)] ${className}`}
    >
      {tierColors && (
        <>
          <span className="px-2.5 py-2">
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium"
              style={{
                background: `linear-gradient(to bottom, ${tierColors.from}, ${tierColors.to})`,
                border: `1px solid ${tierColors.border}`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 1px 3px rgba(0,0,0,0.2), 0 0 8px ${tierColors.shadow}`,
                color: tierColors.text,
              }}
            >
              <span className="text-[10px]">★</span>
              {elo}
            </span>
          </span>
          <Separator />
        </>
      )}

      {hasAlias && (
        <>
          <span className="min-w-0 truncate bg-gradient-to-r from-[#c8a44d] to-[#c8a44d]/80 bg-clip-text px-3 py-2 font-medium text-transparent">
            {alias}
          </span>
          <Separator />
        </>
      )}

      {hasGender && (
        <>
          <span className="flex items-center px-3 py-2">
            <GenderIcon
              gender={gender === 'female' || gender === 'F' ? 'female' : 'male'}
              className="h-3.5 w-3.5 text-white/40"
            />
          </span>
          <Separator />
        </>
      )}

      {hasAge && (
        <>
          <span className="px-3 py-2">{age}</span>
          <Separator />
        </>
      )}

      {hasArena && (
        <>
          <span className="flex min-w-0 items-center gap-1 px-3 py-2">
            <img
              src="https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flocation-icon.bbe094a7.png&w=48&q=75&dpl=dpl_57sq3a4okDe2tVXZVSYu9FCcDV21"
              alt=""
              className="h-4 w-4 shrink-0 opacity-60"
            />
            <span className="truncate">{arena}</span>
          </span>
          <Separator />
        </>
      )}

      {/* Extra user-supplied content */}
      {children}
    </div>
  )
}
