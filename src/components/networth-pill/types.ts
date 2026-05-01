import type { CSSProperties } from "react"

export type PillTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "ultra"
  | "evil"
  | "admin"
  | "mod"
  | "news"
  | "penny"
  | "unverified"

export interface NetworthPillProps {
  networth?: number
  tier?: PillTier
  subscriptionType?: number
  authorUuid?: string
  role?: string
  size?: "small" | "default" | "huge"
  className?: string
}

export type PillSize = "small" | "default" | "huge"

export interface SizeConfig {
  height: string
  text: string
  borderWidth: number
  iconSize: string
  iconText: string
}

export interface HexToRgbaFn {
  (hex: string, alpha: number): string
}

export type SpecialLabels = Partial<Record<PillTier, string>>
export type PillImages = Record<PillTier, string>
export type PillColors = Record<PillTier, string>
export type TextStyles = Record<PillTier, CSSProperties>
