import { Capacitor } from '@capacitor/core'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { StatusBar, Style } from '@capacitor/status-bar'

export async function initializeMobileShell() {
  if (!Capacitor.isNativePlatform()) return

  document.documentElement.classList.add('is-native')

  try {
    await StatusBar.setBackgroundColor({ color: '#0a0907' })
    await StatusBar.setStyle({ style: Style.Dark })
  } catch {
    // Non-critical native polish; the app should still boot if a device API is unavailable.
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body })
  } catch {
    // Same here: keyboard resizing support differs across Android WebView versions.
  }
}
