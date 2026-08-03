export interface NavItem {
  label: string
  path: string
  icon: string
  iconSelected: string
  scale: number
  offset?: string
}

export const navItems: NavItem[] = [
  {
    label: 'Feed',
    path: '/',
    icon: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcents.3k1vs4nsahmw3.png&w=64&q=75&dpl=dpl_5ovAARAu8zMP9MtrCL9RTcRsDq7b',
    iconSelected: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcents_selected.1kijz1n8iyp6g.png&w=64&q=75&dpl=dpl_5ovAARAu8zMP9MtrCL9RTcRsDq7b',
    scale: 1,
  },
  {
    label: 'Notifications',
    path: '/notifications',
    icon: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fnotifications_unselected.2obyabpp22-i9.webp&w=64&q=75&dpl=dpl_5ovAARAu8zMP9MtrCL9RTcRsDq7b',
    iconSelected: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fnotifications_selected.1aciiibp9k4ul.webp&w=64&q=75&dpl=dpl_5ovAARAu8zMP9MtrCL9RTcRsDq7b',
    scale: 1.15,
    offset: '-2px',
  },
  {
    label: 'Messages',
    path: '/messages',
    icon: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Frooms-unselected.39ncw0-wi44wo.webp&w=64&q=75&dpl=dpl_5ovAARAu8zMP9MtrCL9RTcRsDq7b',
    iconSelected: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Frooms-selected.1moc2sjafidme.webp&w=64&q=75&dpl=dpl_5ovAARAu8zMP9MtrCL9RTcRsDq7b',
    scale: 1.1,
  },
  {
    label: 'Leaderboard',
    path: '/leaderboard',
    icon: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Franking.2ckts82eqd6xz.png&w=64&q=75&dpl=dpl_qd5KpQkmz3vTm4nZjLszSmnyBBwc',
    iconSelected: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Franking_selected.3krnhlag54_op.png&w=64&q=75&dpl=dpl_qd5KpQkmz3vTm4nZjLszSmnyBBwc',
    scale: 1.15,
  },
  {
    label: 'Bookmarks',
    path: '/bookmarks',
    icon: 'https://iili.io/BpuaxaI.png',
    iconSelected: 'https://iili.io/Bpuazvt.png',
    scale: 1.1,
  },
  {
    label: 'Transactions',
    path: '/transactions',
    icon: 'https://iili.io/BpuaIyX.png',
    iconSelected: 'https://iili.io/Bpuauun.png',
    scale: 0.85,
  },
  {
    label: 'Me',
    path: '/user/me',
    icon: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fprofile.1y-b2iwc4vm0h.png&w=64&q=75&dpl=dpl_qd5KpQkmz3vTm4nZjLszSmnyBBwc',
    iconSelected: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fprofile_selected.34g28uj1rdvvl.png&w=64&q=75&dpl=dpl_qd5KpQkmz3vTm4nZjLszSmnyBBwc',
    scale: 1.1,
  },
]
