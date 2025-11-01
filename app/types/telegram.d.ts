declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        setHeaderColor: (color: string) => void
        setBackgroundColor: (color: string) => void
        CloudStorage?: {
          getItem: (key: string, callback: (error: any, value: string) => void) => void
          setItem: (key: string, value: string, callback: (error: any, success: boolean) => void) => void
          removeItem: (key: string, callback: (error: any, success: boolean) => void) => void
          getKeys: (callback: (error: any, keys: string[]) => void) => void
        }
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
          notificationOccurred: (type: 'success' | 'warning' | 'error') => void
        }
      }
    }
  }
}

export {}
