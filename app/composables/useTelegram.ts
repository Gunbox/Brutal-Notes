// Глобальное состояние (singleton)
const isReady = ref(false);
const error = ref<string | null>(null);
const storage = ref<any>(null);

export const useTelegram = () => {
  const init = async (): Promise<void> => {
    try {
      if (typeof window !== "undefined") {
        let WebApp: any;

        // Даем время Telegram WebApp инициализироваться
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Проверяем наличие Telegram WebApp более тщательно
        const hasTelegramWebApp = !!(
          (window as any).Telegram?.WebApp?.initData ||
          (window as any).Telegram?.WebApp?.platform
        );

        if (hasTelegramWebApp) {
          WebApp = (window as any).Telegram.WebApp;
          console.log("✅ Using Telegram WebApp", {
            platform: WebApp.platform,
            version: WebApp.version,
          });

          // Для реального Telegram используем реальный CloudStorage
          if (WebApp.CloudStorage) {
            storage.value = WebApp.CloudStorage;
            console.log("✅ Using Telegram CloudStorage");
          } else {
            console.warn("⚠️ CloudStorage not available in Telegram WebApp");
          }
        } else {
          // Используем mock для разработки
          const { createMockTelegramWebApp } = await import(
            "~/utils/mockTelegram"
          );
          WebApp = createMockTelegramWebApp();
          console.log("⚠️ Using Mock Telegram WebApp for development");

          // Для mock используем mock storage
          if (WebApp.CloudStorage) {
            storage.value = WebApp.CloudStorage;
            console.log("✅ Using Mock CloudStorage");
          }
        }

        // Расширяем viewport
        WebApp.expand();

        // Настройка темы (темно-серый цвет как фон приложения)
        WebApp.setHeaderColor("#161616");
        WebApp.setBackgroundColor("#161616");

        // Готов к показу
        WebApp.ready();

        console.log("✅ Telegram Mini App initialized");
      }

      isReady.value = true;
    } catch (e: any) {
      error.value = e.message;
      console.error("❌ Telegram initialization error:", e);
      isReady.value = true;
    }
  };

  // Методы работы с Cloud Storage
  const getItem = async (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        console.log("🔍 getItem called, storage.value:", !!storage.value);
        if (!storage.value) {
          console.warn("⚠️ CloudStorage not initialized for getItem");
          resolve(null);
          return;
        }

        storage.value.getItem(key, (error: any, value: string) => {
          if (error) {
            console.error("❌ Error getting item:", error);
            resolve(null);
          } else {
            console.log(
              `📖 Retrieved item "${key}":`,
              value ? `${value.length} chars` : "null"
            );
            resolve(value || null);
          }
        });
      } catch (e) {
        console.error("❌ Exception getting item from cloud storage:", e);
        resolve(null);
      }
    });
  };

  const setItem = async (key: string, value: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        if (!storage.value) {
          console.warn("⚠️ CloudStorage not initialized for setItem");
          resolve(false);
          return;
        }

        storage.value.setItem(key, value, (error: any, success: boolean) => {
          if (error) {
            console.error("❌ Error setting item:", error);
            resolve(false);
          } else {
            console.log(
              `💾 Saved item "${key}":`,
              value ? `${value.length} chars` : "empty",
              "Success:",
              success
            );
            resolve(success);
          }
        });
      } catch (e) {
        console.error("❌ Exception setting item to cloud storage:", e);
        resolve(false);
      }
    });
  };

  const deleteItem = async (key: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        if (!storage.value) {
          resolve(false);
          return;
        }

        storage.value.removeItem(key, (error: any, success: boolean) => {
          if (error) {
            console.error("Error deleting item:", error);
            resolve(false);
          } else {
            resolve(success);
          }
        });
      } catch (e) {
        console.error("Error deleting item from cloud storage:", e);
        resolve(false);
      }
    });
  };

  const getKeys = async (): Promise<string[]> => {
    return new Promise((resolve) => {
      try {
        if (!storage.value) {
          resolve([]);
          return;
        }

        storage.value.getKeys((error: any, keys: string[]) => {
          if (error) {
            console.error("Error getting keys:", error);
            resolve([]);
          } else {
            resolve(keys || []);
          }
        });
      } catch (e) {
        console.error("Error getting keys from cloud storage:", e);
        resolve([]);
      }
    });
  };

  // Haptic feedback
  const hapticFeedback = (
    type:
      | "light"
      | "medium"
      | "heavy"
      | "success"
      | "warning"
      | "error" = "medium"
  ) => {
    try {
      if (
        typeof window !== "undefined" &&
        (window as any).Telegram?.WebApp?.HapticFeedback
      ) {
        const feedback = (window as any).Telegram.WebApp.HapticFeedback;
        switch (type) {
          case "light":
          case "medium":
          case "heavy":
            feedback.impactOccurred(type);
            break;
          case "success":
          case "warning":
          case "error":
            feedback.notificationOccurred(type);
            break;
        }
      }
    } catch (e) {
      console.log("Haptic feedback not available");
    }
  };

  return {
    isReady,
    error,
    init,
    getItem,
    setItem,
    deleteItem,
    getKeys,
    hapticFeedback,
  };
};
