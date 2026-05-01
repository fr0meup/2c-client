import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { NetworthPillProps } from './types'
import {
  PILL_IMAGES,
  PILL_COLORS,
  TEXT_STYLES,
  SPECIAL_LABELS,
  SIZE_CONFIG,
} from './config'
import {
  hexToRgba,
  getTierFromUUID,
  getTierFromNetworth,
} from './utils'

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
  const canNavigate = !!authorUuid && authorUuid !== 'admin' && authorUuid !== 'penny'

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (!canNavigate) return
    e.stopPropagation()
    navigate(`/user/${authorUuid}`)
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
        className={`relative inline-flex items-center justify-center ${config.height} ${config.text} min-w-[60px] rounded-full border-2 border-gray-600 bg-transparent px-2 ${className}${canNavigate ? ' cursor-pointer' : ''}`}
      >
        <span className="font-bold" style={textStyle}>
          fag
        </span>
      </div>
    )
  }

  return (
    <div
      onClick={canNavigate ? handleClick : undefined}
      className={`relative inline-flex items-center ${hasSpecialLabel ? 'justify-center px-3' : 'gap-2 pl-1 pr-2'} ${config.height} ${config.text} min-w-[50px] ${className}${canNavigate ? ' cursor-pointer' : ''}`}
      style={{
        borderStyle: 'solid',
        borderWidth: `${config.borderWidth}px`,
        borderImageSource: `url(${pillImage})`,
        borderImageSlice: '27 fill',
        borderImageWidth: '50px',
        borderImageRepeat: 'stretch',
        backgroundColor: 'transparent',
      }}
    >
      {!hasSpecialLabel && (
        <span
          className={`flex flex-shrink-0 items-center justify-center ${config.iconSize} rounded-full border-[2px]`}
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
        className={`${config.text} leading-none`}
        style={{
          ...textStyle,
          fontWeight: 500,
          marginTop: '-1px',
        }}
      >
        {displayValue}
      </span>
    </div>
  )
}
