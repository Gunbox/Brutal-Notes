export default defineNuxtPlugin(() => {
  // Плагин для инициализации Telegram Web App
  if (import.meta.client) {
    // Добавим скрипт Telegram Web App API если его нет
    if (typeof window !== "undefined" && !(window as any).Telegram) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-web-app.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }
});
