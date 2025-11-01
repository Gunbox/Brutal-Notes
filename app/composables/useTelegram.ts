export const useTelegram = () => {
  const isReady = ref(false)
  const error = ref<string | null>(null)
  const storage = ref<any>(null)

  const init = async () => {
    try {
      if (typeof window !== 'undefined') {
        let WebApp: any
        
        // Проверяем наличие Telegram WebApp
        if ((window as any).Telegram?.WebApp) {
          WebApp = (window as any).Telegram.WebApp
          console.log('✅ Using Telegram WebApp')
        } else {
          // Используем mock для разработки
          const { createMockTelegramWebApp } = await import('~/utils/mockTelegram')
          WebApp = createMockTelegramWebApp()
          console.log('⚠️ Using Mock Telegram WebApp for development')
        }
        
        // Расширяем viewport
        WebApp.expand()
        
        // Настройка темы
        WebApp.setHeaderColor('#ffffff')
        WebApp.setBackgroundColor('#ffffff')
        
        // Готов к показу
        WebApp.ready()
        
        // Сохраняем ссылку на CloudStorage
        if (WebApp.CloudStorage) {
          storage.value = WebApp.CloudStorage
        }
        
        console.log('✅ Telegram Mini App initialized')
      }
      
      isReady.value = true
    } catch (e: any) {
      error.value = e.message
      console.error('❌ Telegram initialization error:', e)
      isReady.value = true
    }
  }

  // Методы работы с Cloud Storage
  const getItem = async (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        if (!storage.value) {
          resolve(null)
          return
        }
        
        storage.value.getItem(key, (error: any, value: string) => {
          if (error) {
            console.error('Error getting item:', error)
            resolve(null)
          } else {
            resolve(value || null)
          }
        })
      } catch (e) {
        console.error('Error getting item from cloud storage:', e)
        resolve(null)
      }
    })
  }

  const setItem = async (key: string, value: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        if (!storage.value) {
          resolve(false)
          return
        }
        
        storage.value.setItem(key, value, (error: any, success: boolean) => {
          if (error) {
            console.error('Error setting item:', error)
            resolve(false)
          } else {
            resolve(success)
          }
        })
      } catch (e) {
        console.error('Error setting item to cloud storage:', e)
        resolve(false)
      }
    })
  }

  const deleteItem = async (key: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        if (!storage.value) {
          resolve(false)
          return
        }
        
        storage.value.removeItem(key, (error: any, success: boolean) => {
          if (error) {
            console.error('Error deleting item:', error)
            resolve(false)
          } else {
            resolve(success)
          }
        })
      } catch (e) {
        console.error('Error deleting item from cloud storage:', e)
        resolve(false)
      }
    })
  }

  const getKeys = async (): Promise<string[]> => {
    return new Promise((resolve) => {
      try {
        if (!storage.value) {
          resolve([])
          return
        }
        
        storage.value.getKeys((error: any, keys: string[]) => {
          if (error) {
            console.error('Error getting keys:', error)
            resolve([])
          } else {
            resolve(keys || [])
          }
        })
      } catch (e) {
        console.error('Error getting keys from cloud storage:', e)
        resolve([])
      }
    })
  }

  // Haptic feedback
  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium') => {
    try {
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
        const feedback = (window as any).Telegram.WebApp.HapticFeedback
        switch (type) {
          case 'light':
          case 'medium':
          case 'heavy':
            feedback.impactOccurred(type)
            break
          case 'success':
          case 'warning':
          case 'error':
            feedback.notificationOccurred(type)
            break
        }
      }
    } catch (e) {
      console.log('Haptic feedback not available')
    }
  }

  return {
    isReady,
    error,
    init,
    getItem,
    setItem,
    deleteItem,
    getKeys,
    hapticFeedback
  }
}
