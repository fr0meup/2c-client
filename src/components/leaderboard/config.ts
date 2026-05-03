import type { LeaderboardType, LeaderboardEntry, LeaderboardMeta } from './types'

export const LEADERBOARD_META: LeaderboardMeta[] = [
  { value: 'ppe', label: 'Penny Picks ELO', has_extra: true, extra_label: 'ELO' },
  { value: 'picks_szn', label: 'Picks Szn', has_extra: true, extra_label: 'Picks' },
  { value: 'top_100', label: 'Top 100', has_extra: false },
  { value: 'highest_debt', label: 'Highest Debt', has_extra: true, extra_label: 'Debt' },
  { value: 'credit_cards', label: 'Credit Cards', has_extra: true, extra_label: 'Credit' },
  { value: 'biggest_gains', label: 'Biggest Gains', has_extra: true, extra_label: 'Gain' },
  { value: 'biggest_losses', label: 'Biggest Losses', has_extra: true, extra_label: 'Loss' },
  { value: 'league', label: 'Streaks', has_extra: true, extra_label: 'Streak' },
]

function entry(
  uuid: string,
  balance: number,
  sub: number,
  elo: number,
  gender: 'M' | 'F',
  age: number,
  arena: string,
  bio: string,
  extra?: number,
  role?: string,
): LeaderboardEntry {
  return { uuid, balance, subscription_type: sub, role, elo_rating: elo, gender, age, arena, bio, extra_stat: extra }
}

const PPE_DATA: LeaderboardEntry[] = [
  entry('user-ghi-789', 12_000_000, 2, 2100, 'M', 35, 'Singapore', 'On-chain since 2013. Still bullish.', 2100, 'vip'),
  entry('user-mno-345', 5_500_000, 2, 1950, 'M', 31, 'San Francisco', 'Pick posts only. Track record over takes.', 1950, 'vip'),
  entry('user-abc-123', 2_500_000, 1, 1850, 'M', 28, 'London', 'London macro desk. Mostly wrong, occasionally right.', 1850),
  entry('user-def-456', 850_000, 1, 1620, 'F', 24, 'Dubai', 'Real estate, long-horizon. 18-month deals only.', 1620),
  entry('me', 500_000, 1, 1620, 'M', 25, 'New York', 'Index funds and chill. Occasional options degen.', 1620),
  entry('user-jkl-012', 450_000, 1, 1480, 'F', 22, 'Toronto', 'Ex-quant. Writing about the things nobody wants to hear.', 1480),
  entry('lb-7', 3_200_000, 1, 1440, 'M', 29, 'Tokyo', 'Swing trader. Mostly equities.', 1440),
  entry('lb-8', 1_100_000, 1, 1380, 'F', 26, 'Berlin', 'Macro & rates. Former ECB intern.', 1380),
  entry('lb-9', 780_000, 1, 1350, 'M', 33, 'Chicago', 'Options flow. Vol trader turned poster.', 1350),
  entry('lb-10', 620_000, 1, 1310, 'M', 27, 'Sydney', 'Commodities & FX. Quiet accumulator.', 1310),
]

const PICKS_SZN_DATA: LeaderboardEntry[] = [
  entry('user-mno-345', 5_500_000, 2, 1950, 'M', 31, 'San Francisco', 'Pick posts only. Track record over takes.', 47, 'vip'),
  entry('user-ghi-789', 12_000_000, 2, 2100, 'M', 35, 'Singapore', 'On-chain since 2013. Still bullish.', 42, 'vip'),
  entry('user-abc-123', 2_500_000, 1, 1850, 'M', 28, 'London', 'London macro desk. Mostly wrong, occasionally right.', 38),
  entry('lb-7', 3_200_000, 1, 1440, 'M', 29, 'Tokyo', 'Swing trader. Mostly equities.', 31),
  entry('me', 500_000, 1, 1620, 'M', 25, 'New York', 'Index funds and chill. Occasional options degen.', 28),
  entry('user-def-456', 850_000, 1, 1620, 'F', 24, 'Dubai', 'Real estate, long-horizon. 18-month deals only.', 24),
  entry('user-jkl-012', 450_000, 1, 1480, 'F', 22, 'Toronto', 'Ex-quant. Writing about the things nobody wants to hear.', 19),
  entry('lb-8', 1_100_000, 1, 1380, 'F', 26, 'Berlin', 'Macro & rates. Former ECB intern.', 15),
  entry('lb-9', 780_000, 1, 1350, 'M', 33, 'Chicago', 'Options flow. Vol trader turned poster.', 12),
  entry('lb-10', 620_000, 1, 1310, 'M', 27, 'Sydney', 'Commodities & FX. Quiet accumulator.', 9),
]

const TOP_100_DATA: LeaderboardEntry[] = [
  entry('user-ghi-789', 12_000_000, 2, 2100, 'M', 35, 'Singapore', 'On-chain since 2013. Still bullish.', undefined, 'vip'),
  entry('user-mno-345', 5_500_000, 2, 1950, 'M', 31, 'San Francisco', 'Pick posts only. Track record over takes.', undefined, 'vip'),
  entry('lb-7', 3_200_000, 1, 1440, 'M', 29, 'Tokyo', 'Swing trader. Mostly equities.', undefined),
  entry('user-abc-123', 2_500_000, 1, 1850, 'M', 28, 'London', 'London macro desk. Mostly wrong, occasionally right.'),
  entry('lb-8', 1_100_000, 1, 1380, 'F', 26, 'Berlin', 'Macro & rates. Former ECB intern.'),
  entry('user-def-456', 850_000, 1, 1620, 'F', 24, 'Dubai', 'Real estate, long-horizon. 18-month deals only.'),
  entry('lb-9', 780_000, 1, 1350, 'M', 33, 'Chicago', 'Options flow. Vol trader turned poster.'),
  entry('lb-10', 620_000, 1, 1310, 'M', 27, 'Sydney', 'Commodities & FX. Quiet accumulator.'),
  entry('me', 500_000, 1, 1620, 'M', 25, 'New York', 'Index funds and chill. Occasional options degen.'),
  entry('user-jkl-012', 450_000, 1, 1480, 'F', 22, 'Toronto', 'Ex-quant. Writing about the things nobody wants to hear.'),
]

const HIGHEST_DEBT_DATA: LeaderboardEntry[] = [
  entry('lb-debt-1', 120_000, 1, 980, 'M', 23, 'Las Vegas', 'Leverage is my love language.', 4_200_000),
  entry('lb-debt-2', 85_000, 1, 1020, 'M', 27, 'Miami', 'YOLO culture. No regrets.', 3_800_000),
  entry('lb-debt-3', 200_000, 1, 1100, 'F', 30, 'Houston', 'Oil futures gone wrong.', 2_900_000),
  entry('lb-debt-4', 50_000, 1, 890, 'M', 21, 'Atlanta', 'Margin called twice this week.', 2_400_000),
  entry('lb-debt-5', 340_000, 1, 1200, 'M', 34, 'New York', 'Short seller having a bad year.', 1_800_000),
  entry('lb-debt-6', 95_000, 1, 1050, 'F', 25, 'London', 'I blame Bitcoin.', 1_500_000),
  entry('lb-debt-7', 180_000, 1, 1150, 'M', 28, 'Dubai', 'Crypto winter survivor. Barely.', 1_200_000),
  entry('lb-debt-8', 70_000, 1, 940, 'M', 22, 'Toronto', 'Student loans + leverage = pain.', 950_000),
  entry('lb-debt-9', 250_000, 1, 1180, 'F', 29, 'Singapore', 'Derivatives are a hell of a drug.', 780_000),
  entry('lb-debt-10', 130_000, 1, 1060, 'M', 26, 'Berlin', 'Went all in. Twice.', 620_000),
]

const CREDIT_CARDS_DATA: LeaderboardEntry[] = [
  entry('user-ghi-789', 12_000_000, 2, 2100, 'M', 35, 'Singapore', 'On-chain since 2013. Still bullish.', 850_000, 'vip'),
  entry('user-mno-345', 5_500_000, 2, 1950, 'M', 31, 'San Francisco', 'Pick posts only. Track record over takes.', 620_000, 'vip'),
  entry('lb-7', 3_200_000, 1, 1440, 'M', 29, 'Tokyo', 'Swing trader. Mostly equities.', 480_000),
  entry('user-abc-123', 2_500_000, 1, 1850, 'M', 28, 'London', 'London macro desk.', 350_000),
  entry('lb-8', 1_100_000, 1, 1380, 'F', 26, 'Berlin', 'Macro & rates. Former ECB intern.', 280_000),
  entry('user-def-456', 850_000, 1, 1620, 'F', 24, 'Dubai', 'Real estate, long-horizon.', 220_000),
  entry('lb-9', 780_000, 1, 1350, 'M', 33, 'Chicago', 'Options flow.', 190_000),
  entry('me', 500_000, 1, 1620, 'M', 25, 'New York', 'Index funds and chill.', 150_000),
  entry('lb-10', 620_000, 1, 1310, 'M', 27, 'Sydney', 'Commodities & FX.', 120_000),
  entry('user-jkl-012', 450_000, 1, 1480, 'F', 22, 'Toronto', 'Ex-quant.', 95_000),
]

const BIGGEST_GAINS_DATA: LeaderboardEntry[] = [
  entry('user-ghi-789', 12_000_000, 2, 2100, 'M', 35, 'Singapore', 'On-chain since 2013. Still bullish.', 1_200_000, 'vip'),
  entry('user-mno-345', 5_500_000, 2, 1950, 'M', 31, 'San Francisco', 'Pick posts only.', 890_000, 'vip'),
  entry('user-abc-123', 2_500_000, 1, 1850, 'M', 28, 'London', 'London macro desk.', 720_000),
  entry('lb-7', 3_200_000, 1, 1440, 'M', 29, 'Tokyo', 'Swing trader. Mostly equities.', 540_000),
  entry('lb-8', 1_100_000, 1, 1380, 'F', 26, 'Berlin', 'Macro & rates.', 380_000),
  entry('user-def-456', 850_000, 1, 1620, 'F', 24, 'Dubai', 'Real estate, long-horizon.', 290_000),
  entry('me', 500_000, 1, 1620, 'M', 25, 'New York', 'Index funds and chill.', 210_000),
  entry('lb-9', 780_000, 1, 1350, 'M', 33, 'Chicago', 'Options flow.', 160_000),
  entry('lb-10', 620_000, 1, 1310, 'M', 27, 'Sydney', 'Commodities & FX.', 120_000),
  entry('user-jkl-012', 450_000, 1, 1480, 'F', 22, 'Toronto', 'Ex-quant.', 85_000),
]

const BIGGEST_LOSSES_DATA: LeaderboardEntry[] = [
  entry('lb-debt-1', 120_000, 1, 980, 'M', 23, 'Las Vegas', 'Leverage is my love language.', 2_100_000),
  entry('lb-debt-2', 85_000, 1, 1020, 'M', 27, 'Miami', 'YOLO culture.', 1_800_000),
  entry('lb-debt-4', 50_000, 1, 890, 'M', 21, 'Atlanta', 'Margin called twice this week.', 1_400_000),
  entry('lb-debt-3', 200_000, 1, 1100, 'F', 30, 'Houston', 'Oil futures gone wrong.', 1_100_000),
  entry('lb-debt-5', 340_000, 1, 1200, 'M', 34, 'New York', 'Short seller having a bad year.', 890_000),
  entry('lb-debt-7', 180_000, 1, 1150, 'M', 28, 'Dubai', 'Crypto winter survivor.', 720_000),
  entry('lb-debt-6', 95_000, 1, 1050, 'F', 25, 'London', 'I blame Bitcoin.', 580_000),
  entry('lb-debt-8', 70_000, 1, 940, 'M', 22, 'Toronto', 'Student loans + leverage.', 450_000),
  entry('lb-debt-9', 250_000, 1, 1180, 'F', 29, 'Singapore', 'Derivatives.', 340_000),
  entry('lb-debt-10', 130_000, 1, 1060, 'M', 26, 'Berlin', 'Went all in. Twice.', 260_000),
]

const LEAGUE_DATA: LeaderboardEntry[] = [
  entry('user-ghi-789', 12_000_000, 2, 2100, 'M', 35, 'Singapore', 'On-chain since 2013. Still bullish.', 14, 'vip'),
  entry('user-mno-345', 5_500_000, 2, 1950, 'M', 31, 'San Francisco', 'Pick posts only.', 11, 'vip'),
  entry('user-abc-123', 2_500_000, 1, 1850, 'M', 28, 'London', 'London macro desk.', 9),
  entry('lb-7', 3_200_000, 1, 1440, 'M', 29, 'Tokyo', 'Swing trader.', 8),
  entry('me', 500_000, 1, 1620, 'M', 25, 'New York', 'Index funds and chill.', 7),
  entry('user-def-456', 850_000, 1, 1620, 'F', 24, 'Dubai', 'Real estate, long-horizon.', 6),
  entry('lb-8', 1_100_000, 1, 1380, 'F', 26, 'Berlin', 'Macro & rates.', 5),
  entry('user-jkl-012', 450_000, 1, 1480, 'F', 22, 'Toronto', 'Ex-quant.', 4),
  entry('lb-9', 780_000, 1, 1350, 'M', 33, 'Chicago', 'Options flow.', 3),
  entry('lb-10', 620_000, 1, 1310, 'M', 27, 'Sydney', 'Commodities & FX.', 2),
]

export const LEADERBOARD_DATA: Record<LeaderboardType, LeaderboardEntry[]> = {
  ppe: PPE_DATA,
  picks_szn: PICKS_SZN_DATA,
  top_100: TOP_100_DATA,
  highest_debt: HIGHEST_DEBT_DATA,
  credit_cards: CREDIT_CARDS_DATA,
  biggest_gains: BIGGEST_GAINS_DATA,
  biggest_losses: BIGGEST_LOSSES_DATA,
  league: LEAGUE_DATA,
}
