import type { PillTier } from "./types"

export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return `rgba(0, 0, 0, ${alpha})`
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`
}

export function getTierFromNetworth(networth: number): PillTier {
  if (networth >= 10_000_000) return "ultra"
  if (networth >= 1_000_000) return "platinum"
  if (networth >= 300_000) return "gold"
  if (networth >= 50_000) return "silver"
  if (networth >= 0) return "bronze"
  return "evil"
}

const ADMIN_UUID = 'admin'
const PENNY_UUID = 'penny'
const MOD_UUIDS = new Set([
  '3d940646-0265-4c72-bc93-a98dd9b8d68e',
  '4814e409-b55a-4a71-86f6-34da365d4119',
  'd72a2aa3-df71-4ddb-88a4-a8181254e031',
  'e5dbcd9b-6dc9-4831-ad30-43f50d72487d',
])

export function getTierFromUUID(
  uuid: string,
  subscriptionType: number,
  networth: number,
  role?: string
): PillTier {
  const lower = uuid.toLowerCase()
  if (lower === ADMIN_UUID) return 'admin'
  if (lower === PENNY_UUID) return 'penny'
  if (role === 'moderator' || MOD_UUIDS.has(lower)) return 'mod'
  if (subscriptionType === 0) return 'unverified'
  return getTierFromNetworth(networth)
}

export function getTierFromSubscription(subscriptionType: number, networth: number): PillTier {
  if (subscriptionType === 0) return 'unverified'
  return getTierFromNetworth(networth)
}
