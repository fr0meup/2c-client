import type { CSSProperties, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrefetch } from '@/hooks/usePrefetch'
import { preloadRoute } from '@/lib/routePreload'
import { announceNavigationPending } from '@/lib/navigationPending'
import { saveScrollPosition } from '@/App'

type PillTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'ultra'
  | 'evil'
  | 'admin'
  | 'mod'
  | 'news'
  | 'staff'
  | 'penny'
  | 'unverified'

interface NetworthPillProps {
  networth?: number
  tier?: PillTier
  subscriptionType?: number
  authorUuid?: string
  role?: string
  size?: 'small' | 'default' | 'huge'
  className?: string
}

const PILL_IMAGES: Record<PillTier, string> = {
  admin: 'https://www.twocents.money/pills/andi2.png',
  mod: 'https://www.twocents.money/pills/mod.png',
  evil: 'https://www.twocents.money/pills/evil2.png',
  news: 'https://api.twocents.money/ugc/20260813/images/459874cc-cea1-4802-990a-5d830c871876/f50e9d6a-d7a2-4dda-a21d-7e7674afe664.png',
  staff: 'https://twocents.money/pills/dark_staff_badge_bg.png',
  bronze: 'https://www.twocents.money/pills/bronze2.png',
  silver: 'https://www.twocents.money/pills/silver2.png',
  gold: 'https://www.twocents.money/pills/gold4.png',
  platinum: 'https://www.twocents.money/pills/infiniteSafe2.png',
  ultra: 'https://www.twocents.money/pills/ultra.png',
  penny: 'https://www.twocents.money/pills/penny.png',
  unverified: '',
}

const PILL_COLORS: Record<PillTier, string> = {
  bronze: '#3F1815',
  gold: '#3D2319',
  silver: '#1F2225',
  platinum: '#002A4B',
  admin: '#07080A',
  evil: '#FF4E5A',
  mod: '#FFB34B',
  news: '#253141',
  staff: '#0044BB',
  unverified: '#ACC4C1',
  ultra: '#9590c4',
  penny: '#8B4513',
}

const gradientText = (from: string, to: string): CSSProperties => ({
  backgroundImage: `linear-gradient(180deg, ${from} 0%, ${to} 100%)`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
})

const TEXT_STYLES: Record<PillTier, CSSProperties> = {
  bronze: gradientText('#3F1815', '#6E3839'),
  gold: gradientText('#3D2319', '#6D3629'),
  silver: gradientText('#1F2225', '#38484D'),
  platinum: gradientText('#002A4B', '#653676'),
  admin: gradientText('#07080A', '#22272B'),
  evil: gradientText('#FF4E5A', '#ED3341'),
  mod: gradientText('#FFC294', '#FFB34B'),
  news: {
    color: '#253141',
    fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    letterSpacing: '0.04em',
    filter: 'blur(0.2px)',
  },
  staff: { color: '#ffffff', textShadow: '0 0.5px 1px rgba(0, 0, 0, 0.4)' },
  unverified: { color: '#ffffff' },
  ultra: gradientText('#232323', '#1D1668'),
  penny: {
    color: '#3D1A08',
    textShadow: '0 0.75px 0.5px rgba(255, 255, 255, 0.20)',
  },
}

const SPECIAL_LABELS: Partial<Record<PillTier, string>> = {
  admin: 'ANDI',
  mod: 'MOD',
  news: 'POLLS',
  staff: 'STAFF',
  penny: 'PENNY',
}

const SIZE_CONFIG = {
  small: { height: 'h-6 sm:h-8', text: 'text-[11px] sm:text-sm', borderWidth: 6, iconSize: 'w-3.5 h-3.5 sm:w-4 sm:h-4', iconText: 'text-[9px] sm:text-xs', minWidth: 'min-w-[42px] sm:min-w-[50px]' },
  default: { height: 'h-8', text: 'text-sm', borderWidth: 6, iconSize: 'w-5 h-5', iconText: 'text-xs', minWidth: 'min-w-[50px]' },
  huge: { height: 'h-10', text: 'text-base', borderWidth: 20, iconSize: 'w-6 h-6', iconText: 'text-base', minWidth: 'min-w-[50px]' },
}

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return `rgba(0, 0, 0, ${alpha})`
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`
}

function getTierFromNetworth(networth: number): PillTier {
  if (networth >= 10_000_000) return 'ultra'
  if (networth >= 1_000_000) return 'platinum'
  if (networth >= 300_000) return 'gold'
  if (networth >= 50_000) return 'silver'
  if (networth >= 0) return 'bronze'
  return 'evil'
}

const MOD_UUIDS = new Set([
  '3d940646-0265-4c72-bc93-a98dd9b8d68e',
  '4814e409-b55a-4a71-86f6-34da365d4119',
  'e5dbcd9b-6dc9-4831-ad30-43f50d72487d',
  '444cc266-c0ca-43f2-bd49-5be4d80114e3',
  'afbde593-9103-4046-8caf-d28cfd5ced61',
  '69c8c5e3-135c-43d3-8649-17c3dedea54e',
])

const NEWS_UUIDS = new Set([
  'news',
])

function getTierFromUUID(uuid: string, subscriptionType: number, networth: number, role?: string): PillTier {
  const lower = uuid.toLowerCase()
  if (lower === 'admin') return 'admin'
  if (lower === 'penny') return 'penny'
  if (lower === 'staff' || role === 'staff') return 'staff'
  if (lower === 'news' || NEWS_UUIDS.has(lower) || role === 'news') return 'news'
  if (role === 'moderator' || MOD_UUIDS.has(lower)) return 'mod'
  if (subscriptionType === 0) return 'unverified'
  return getTierFromNetworth(networth)
}

export function NetworthPill({
  networth = 0,
  tier,
  subscriptionType,
  authorUuid,
  role,
  size = 'default',
  className = '',
}: NetworthPillProps) {
  const navigate = useNavigate()
  const { prefetchUserProfile } = usePrefetch()
  const canNavigate = !!authorUuid

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (!canNavigate) return
    e.stopPropagation()
    saveScrollPosition()
    announceNavigationPending(`/user/${authorUuid}`)
    navigate(`/user/${authorUuid}`)
  }

  function handleHover() {
    if (canNavigate) {
      preloadRoute('profile')
      prefetchUserProfile(authorUuid!)
    }
  }

  const actualTier =
    tier ??
    (authorUuid != null
      ? getTierFromUUID(authorUuid, subscriptionType ?? 1, networth, role)
      : subscriptionType === 0
        ? 'unverified'
        : getTierFromNetworth(networth))

  const config = SIZE_CONFIG[size]
  const pillImage = PILL_IMAGES[actualTier]
  const pillColor = PILL_COLORS[actualTier]
  const textStyle = TEXT_STYLES[actualTier]
  const specialLabel = SPECIAL_LABELS[actualTier]

  const formattedNetworth = Math.round(networth).toLocaleString('en-US')
  const displayValue = specialLabel ?? formattedNetworth

  const isUnverified = actualTier === 'unverified'
  const hasSpecialLabel = !!specialLabel
  const isNegative = networth < 0

  if (isUnverified) {
    return (
      <div
        onClick={canNavigate ? handleClick : undefined}
        onMouseEnter={canNavigate ? handleHover : undefined}
        className={`relative inline-flex max-w-full items-center justify-center gap-1 ${config.height} ${config.text} ${config.minWidth} rounded-full border-2 border-gray-600 bg-transparent px-1.5 ${className}${canNavigate ? ' cursor-pointer' : ''}`}
      >
        <span className="font-bold" style={textStyle}>
          fag
        </span>
        <span className="truncate text-[10px] font-medium text-white/30">
          {formattedNetworth}
        </span>
      </div>
    )
  }

  const isStaff = actualTier === 'staff'

  return (
    <div
      onClick={canNavigate ? handleClick : undefined}
      onMouseEnter={canNavigate ? handleHover : undefined}
      className={`relative inline-flex max-w-full items-center justify-center ${hasSpecialLabel ? 'px-2' : 'gap-1 pl-0.5 pr-1.5'} ${config.height} ${config.text} ${config.minWidth} ${className}${canNavigate ? ' cursor-pointer' : ''}`}
      style={
        isStaff
          ? {
              backgroundImage: `url(${pillImage})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
            }
          : {
              borderStyle: 'solid',
              borderWidth: `${config.borderWidth}px`,
              borderImageSource: `url(${pillImage})`,
              borderImageSlice: '27 fill',
              borderImageWidth: '50px',
              borderImageRepeat: 'stretch',
              backgroundColor: 'transparent',
            }
      }
    >
      {!hasSpecialLabel && (
        <span
          className={`flex flex-shrink-0 items-center justify-center ${config.iconSize} rounded-full border`}
          style={{
            borderColor: hexToRgba(pillColor, 0.5),
            outline: `2px solid ${hexToRgba(pillColor, 0.5)}`,
            outlineOffset: '-2px',
            marginTop: '-1px',
          }}
        >
          <span
            className={`${config.iconText} font-bold leading-none`}
            style={{
              ...textStyle,
              fontWeight: 550,
              transform: isNegative ? 'rotate(180deg)' : undefined,
            }}
          >
            $
          </span>
        </span>
      )}

      <span
        className={`${config.text} flex items-center justify-center min-w-0 truncate leading-none text-center`}
        style={{
          fontWeight: hasSpecialLabel ? 700 : (isStaff ? 700 : 500),
          marginTop: 0,
          ...textStyle,
        }}
      >
        {displayValue}
      </span>
    </div>
  )
}
