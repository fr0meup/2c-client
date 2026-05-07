import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'money.twocents.client',
  appName: '2C Client',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#0a0907',
  },
  server: {
    androidScheme: 'https',
  },
}

export default config
