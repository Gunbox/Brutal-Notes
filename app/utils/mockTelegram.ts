// Виртуальное хранилище для разработки без Telegram
class LocalStorage {
  private storage: Map<string, string> = new Map()

  getItem(key: string, callback: (error: any, value: string) => void) {
    const value = this.storage.get(key) || ''
    setTimeout(() => callback(null, value), 0)
  }

  setItem(key: string, value: string, callback: (error: any, success: boolean) => void) {
    this.storage.set(key, value)
    // Также сохраняем в localStorage браузера
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, value)
      } catch (e) {
        console.warn('localStorage not available')
      }
    }
    setTimeout(() => callback(null, true), 0)
  }

  removeItem(key: string, callback: (error: any, success: boolean) => void) {
    this.storage.delete(key)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(key)
      } catch (e) {
        console.warn('localStorage not available')
      }
    }
    setTimeout(() => callback(null, true), 0)
  }

  getKeys(callback: (error: any, keys: string[]) => void) {
    const keys = Array.from(this.storage.keys())
    setTimeout(() => callback(null, keys), 0)
  }

  // Загрузить данные из localStorage браузера
  loadFromBrowserStorage() {
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(window.localStorage)
        keys.forEach(key => {
          const value = window.localStorage.getItem(key)
          if (value) {
            this.storage.set(key, value)
          }
        })
      } catch (e) {
        console.warn('localStorage not available')
      }
    }
  }
}

export const createMockTelegramWebApp = () => {
  const storage = new LocalStorage()
  storage.loadFromBrowserStorage()

  return {
    ready: () => console.log('📱 Mock Telegram WebApp ready'),
    expand: () => console.log('📱 Mock Telegram WebApp expanded'),
    setHeaderColor: (color: string) => console.log('📱 Header color:', color),
    setBackgroundColor: (color: string) => console.log('📱 Background color:', color),
    CloudStorage: storage,
    HapticFeedback: {
      impactOccurred: (style: string) => console.log('📳 Haptic impact:', style),
      notificationOccurred: (type: string) => console.log('📳 Haptic notification:', type)
    }
  }
}
