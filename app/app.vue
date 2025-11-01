<script setup lang="ts">
const { init: initTelegram, isReady } = useTelegram();
const {
  notes,
  loading,
  stats,
  loadNotes,
  syncNotes,
  addNote,
  toggleNote,
  deleteNote,
  clearCompleted,
} = useNotes();

const newTitle = ref("");
const newText = ref("");
const toast = ref({
  show: false,
  message: "",
  type: "success" as "success" | "error",
});

// Модальное окно подтверждения
const confirmModal = ref({
  show: false,
  noteId: "",
  noteTitle: "",
  action: "delete" as "delete" | "clear",
});

// Модальное окно для добавления
const addModal = ref(false);

const canAdd = computed(() => {
  return newTitle.value.trim().length > 0 && newText.value.trim().length > 0;
});

// Индикатор синхронизации
const syncing = ref(false);

// Debounce для синхронизации (избегаем множественных вызовов)
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSync = async () => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    syncing.value = true;
    await syncNotes();
    syncing.value = false;
  }, 300); // 300ms задержка
};

// Инициализация
onMounted(async () => {
  console.log("🚀 App mounting...");
  await initTelegram();
  console.log("✅ Telegram initialized, isReady:", isReady.value);
  await loadNotes();
  console.log("✅ Notes loaded");

  // Синхронизация при разворачивании приложения
  if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
    const WebApp = (window as any).Telegram.WebApp;

    // Подписываемся на событие изменения viewport
    WebApp.onEvent("viewportChanged", async () => {
      console.log("📱 Viewport changed, syncing data...");
      await debouncedSync();
    });

    // Также синхронизируем при получении фокуса
    window.addEventListener("focus", async () => {
      console.log("👁️ App focused, syncing data...");
      await debouncedSync();
    });

    // Синхронизация при возвращении из фона (visibilitychange)
    document.addEventListener("visibilitychange", async () => {
      if (!document.hidden) {
        console.log("👁️ App visible again, syncing data...");
        await debouncedSync();
      }
    });
  }
});

// Добавление заметки
const handleAdd = async () => {
  if (!canAdd.value) return;

  try {
    await addNote(newTitle.value, newText.value);
    newTitle.value = "";
    newText.value = "";
    addModal.value = false;
    showToast("Note added!", "success");
  } catch (e) {
    showToast("Error adding note", "error");
  }
};

// Открытие модалки добавления
const openAddModal = () => {
  addModal.value = true;
};

// Закрытие модалки добавления
const closeAddModal = () => {
  addModal.value = false;
  newTitle.value = "";
  newText.value = "";
};

// Показ подтверждения удаления
const showDeleteConfirm = (id: string, title: string) => {
  confirmModal.value = {
    show: true,
    noteId: id,
    noteTitle: title,
    action: "delete",
  };
};

// Показ подтверждения очистки
const showClearConfirm = () => {
  confirmModal.value = {
    show: true,
    noteId: "",
    noteTitle: "",
    action: "clear",
  };
};

// Подтверждение действия
const confirmAction = async () => {
  try {
    if (confirmModal.value.action === "delete") {
      await deleteNote(confirmModal.value.noteId);
      showToast("Note deleted", "success");
    } else if (confirmModal.value.action === "clear") {
      await clearCompleted();
      showToast("Cleared completed", "success");
    }
  } catch (e) {
    showToast("Error", "error");
  } finally {
    confirmModal.value.show = false;
  }
};

// Отмена действия
const cancelAction = () => {
  confirmModal.value.show = false;
};

// Форматирование даты
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return "TODAY";
  } else if (days === 1) {
    return "YESTERDAY";
  } else if (days < 7) {
    return `${days}D AGO`;
  } else {
    return date
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      .toUpperCase();
  }
};

// Показ тоста
const showToast = (message: string, type: "success" | "error" = "success") => {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 2000);
};
</script>

<template>
  <div style="padding: 1rem; margin: 0">
    <pre>
BRUTAL NOTES v0.0.1{{ syncing ? " [SYNCING...]" : "" }}
-----------------------------------------
TOTAL: {{ stats.total }} | ACTIVE: {{ stats.active }} | DONE: {{
        stats.completed
      }}
-----------------------------------------
    </pre>
    <div v-if="loading">
      <pre>LOADING...</pre>
    </div>
    <div v-else>
      <div v-if="notes.length === 0">
        <pre>
NO NOTES YET
ADD NOTE BELOW
-----------------------------------------
        </pre>
      </div>
      <div v-else>
        <div v-for="note in notes" :key="note.id">
          <pre :style="[note.completed && 'text-decoration: line-through;']">
ID: {{ note.id }}
TITLE: {{ note.title }}
TEXT: {{ note.text }}
DATE: {{ formatDate(note.createdAt) }}
STATUS: {{ note.completed ? "DONE" : "ACTIVE" }}
          </pre>
          <div style="display: flex; gap: 8px; margin-bottom: 16px">
            <span
              @click="toggleNote(note.id)"
              style="
                cursor: pointer;
                background: #222;
                padding: 2px 8px;
                user-select: none;
              "
              >[{{ note.completed ? "UNDO" : "DONE" }}]</span
            >
            <span
              @click="showDeleteConfirm(note.id, note.title)"
              style="
                cursor: pointer;
                background: #222;
                color: red;
                padding: 2px 8px;
                user-select: none;
              "
              >[DELETE]</span
            >
          </div>
        </div>
      </div>
      <div v-if="stats.completed > 0" style="margin-bottom: 16px">
        <span
          @click="showClearConfirm"
          style="
            cursor: pointer;
            background: #222;
            padding: 2px 8px;
            user-select: none;
          "
          >[CLEAR DONE ({{ stats.completed }})]</span
        >
      </div>
      <div
        v-if="confirmModal.show"
        style="
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
          white-space: pre-wrap;
        "
      >
        <pre
          >{{
            confirmModal.action === "delete"
              ? `DELETE "${confirmModal.noteTitle}"? THIS ACTION CANNOT BE UNDONE.`
              : `CLEAR ALL COMPLETED NOTES? THIS WILL DELETE ${stats.completed} ITEM(S). THIS ACTION CANNOT BE UNDONE.`
          }}
        </pre>
        <span
          @click="confirmAction"
          style="
            cursor: pointer;
            background: #222;
            color: #eee;
            padding: 2px 8px;
            user-select: none;
          "
          >[CONFIRM]</span
        >
        <span
          @click="cancelAction"
          style="
            cursor: pointer;
            background: #222;
            color: red;
            padding: 2px 8px;
            user-select: none;
          "
          >[CANCEL]</span
        >
      </div>
      <div>
        <pre>
ADD NOTE:
TITLE:
<input v-model="newTitle" type="text" style="background:#222;color:#eee;border:none;outline:none;padding: 5px;width: 100%;margin:4px 0;" />
TEXT:
<textarea v-model="newText" rows="4" style="background:#222;color:#eee;border:none;outline:none;padding: 5px;width: 100%;margin:4px 0;"></textarea>
        </pre>
        <span
          @click="handleAdd"
          :style="
            canAdd
              ? 'cursor:pointer;background:#222;color:#eee;padding:2px 8px;user-select:none;'
              : 'background:#222;color:#555;padding:2px 8px;user-select:none;'
          "
          >[ADD]</span
        >
      </div>
    </div>
    <div v-if="toast.show" style="margin-top: 14px">
      <pre>{{ toast.message }}</pre>
    </div>
  </div>
</template>
<style scoped></style>
