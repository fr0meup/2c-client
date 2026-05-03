import type { BalancePoint, UserProfileData } from './types'

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

/** Generates a monotonically-drifting synthetic balance history for mock profiles. */
function generateHistory(
  startBalance: number,
  endBalance: number,
  points: number,
  volatility = 0.08,
): BalancePoint[] {
  const out: BalancePoint[] = []
  const step = (endBalance - startBalance) / (points - 1)
  for (let i = 0; i < points; i++) {
    const trend = startBalance + step * i
    const noise = trend * volatility * (Math.sin(i * 1.37) + Math.cos(i * 0.73)) * 0.5
    const balance = Math.max(0, Math.round(trend + noise))
    out.push({ balance, date: daysAgo((points - 1 - i) * 30) })
  }
  return out
}

/** "me" represents the currently-logged-in user. */
export const CURRENT_USER_UUID = 'me'

export const MOCK_PROFILES: Record<string, UserProfileData> = {
  me: {
    uuid: 'me',
    username: 'you',
    balance: 500_000,
    delta_balance: 28_400,
    bio: 'Index funds and chill. Occasional options degen.',
    age: 25,
    gender: 'M',
    arena: 'New York',
    subscription_type: 1,
    elo_rating: 1620,
    created_at: daysAgo(410),
    followers: 128,
    following: 72,
    upvotes_received: 3_420,
    balance_history: generateHistory(180_000, 500_000, 14, 0.06),
  },
  'user-abc-123': {
    uuid: 'user-abc-123',
    username: 'marketmaven',
    balance: 2_500_000,
    delta_balance: 120_000,
    bio: 'London macro desk. Mostly wrong, occasionally right.',
    age: 28,
    gender: 'M',
    arena: 'London',
    subscription_type: 1,
    elo_rating: 1850,
    created_at: daysAgo(820),
    followers: 4_210,
    following: 190,
    upvotes_received: 22_180,
    balance_history: generateHistory(800_000, 2_500_000, 16, 0.07),
  },
  'user-def-456': {
    uuid: 'user-def-456',
    username: 'propertyplaybook',
    balance: 850_000,
    delta_balance: -15_000,
    bio: 'Real estate, long-horizon. 18-month deals only.',
    age: 24,
    gender: 'F',
    arena: 'Dubai',
    subscription_type: 1,
    elo_rating: 1620,
    created_at: daysAgo(500),
    followers: 980,
    following: 140,
    upvotes_received: 6_200,
    balance_history: generateHistory(400_000, 850_000, 12, 0.1),
  },
  'user-ghi-789': {
    uuid: 'user-ghi-789',
    username: 'cryptoking',
    balance: 12_000_000,
    delta_balance: 1_200_000,
    bio: 'On-chain since 2013. Still bullish.',
    age: 35,
    gender: 'M',
    arena: 'Singapore',
    subscription_type: 2,
    role: 'vip',
    elo_rating: 2100,
    created_at: daysAgo(1_200),
    followers: 18_400,
    following: 62,
    upvotes_received: 94_100,
    balance_history: generateHistory(2_000_000, 12_000_000, 18, 0.12),
  },
  'user-jkl-012': {
    uuid: 'user-jkl-012',
    username: 'aiskeptic',
    balance: 450_000,
    delta_balance: 4_500,
    bio: 'Ex-quant. Writing about the things nobody wants to hear.',
    age: 22,
    gender: 'F',
    arena: 'Toronto',
    subscription_type: 1,
    elo_rating: 1480,
    created_at: daysAgo(210),
    followers: 540,
    following: 310,
    upvotes_received: 2_180,
    balance_history: generateHistory(300_000, 450_000, 10, 0.09),
  },
  'user-mno-345': {
    uuid: 'user-mno-345',
    username: 'picksguy',
    balance: 5_500_000,
    delta_balance: -80_000,
    bio: 'Pick posts only. Track record over takes.',
    age: 31,
    gender: 'M',
    arena: 'San Francisco',
    subscription_type: 2,
    role: 'vip',
    elo_rating: 1950,
    created_at: daysAgo(730),
    followers: 6_700,
    following: 88,
    upvotes_received: 41_300,
    balance_history: generateHistory(1_800_000, 5_500_000, 15, 0.08),
  },
}

export function getMockProfile(uuid: string | undefined): UserProfileData | null {
  if (!uuid) return null
  return MOCK_PROFILES[uuid] ?? null
}
