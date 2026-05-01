export interface UserMetaPillProps {
  elo?: number
  alias?: string
  gender?: string
  age?: number
  arena?: string
  /** Extra content rendered after the built-in fields but before the closing edge */
  children?: React.ReactNode
  className?: string
}
