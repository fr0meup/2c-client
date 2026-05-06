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
    icon: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcents.1470b620.png&w=1080&q=75',
    iconSelected: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcents_selected.a270c47b.png&w=1080&q=75',
    scale: 1,
  },
  {
    label: 'Notifications',
    path: '/notifications',
    icon: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fnotifications_unselected.19d14a80.webp&w=1080&q=75',
    iconSelected: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fnotifications_selected.474ec42b.webp&w=1080&q=75',
    scale: 1.15,
    offset: '-2px',
  },
  {
    label: 'Messages',
    path: '/messages',
    icon: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Frooms-unselected.e6b03b15.webp&w=1080&q=75',
    iconSelected: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Frooms-selected.80aa6aba.webp&w=1080&q=75',
    scale: 1.1,
  },
  {
    label: 'Leaderboard',
    path: '/leaderboard',
    icon: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Franking.f2b26d2a.png&w=1080&q=75',
    iconSelected: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Franking_selected.8d67736b.png&w=1080&q=75',
    scale: 1.15,
  },
  {
    label: 'Bookmarks',
    path: '/bookmarks',
    icon: 'https://i.imgur.com/8SM5ktA.png',
    iconSelected: 'https://i.imgur.com/8G4fgOe.png',
    scale: 1.1,
  },
  {
    label: 'Transactions',
    path: '/transactions',
    icon: 'https://i.imgur.com/MpITh4E.png',
    iconSelected: 'https://i.imgur.com/28xotrc.png',
    scale: 0.85,
  },
  {
    label: 'Me',
    path: '/user/me',
    icon: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fprofile.e10844f4.png&w=1080&q=75',
    iconSelected: 'https://www.twocents.money/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fprofile_selected.99c4e5cf.png&w=1080&q=75',
    scale: 1.1,
  },
]
