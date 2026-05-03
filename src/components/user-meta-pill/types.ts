export interface UserMetaPillProps {
  elo?: number
  alias?: string
  gender?: string
  age?: number
  arena?: string
  /** Visual variant: 'post' uses gold border, 'comment' uses plain border */
  variant?: 'post' | 'comment'
  /** Compact size for leaderboard / constrained contexts */
  size?: 'default' | 'small'
  /** Extra content rendered after the built-in fields but before the closing edge */
  children?: React.ReactNode
  className?: string
}
