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
  togglePin,
  deleteNote,
  clearCompleted,
} = useNotes();

// Сортировка заметок: закрепленные всегда вверху
const sortedNotes = computed(() => {
  return [...notes.value].sort((a, b) => {
    // Сначала закрепленные
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // Потом по дате создания (новые сверху)
    return b.createdAt - a.createdAt;
  });
});

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

// Debounce для синхронизации (избегаем множественных вызовов)
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSync = async () => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    await syncNotes();
  }, 300); // 300ms задержка
};

// Инициализация
onMounted(async () => {
  console.log("🚀 App mounting...");
  await initTelegram();
  console.log("✅ Telegram initialized, isReady:", isReady.value);

  // Даем дополнительное время для инициализации CloudStorage
  await new Promise((resolve) => setTimeout(resolve, 200));

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
  // Фокус на input после рендера
  nextTick(() => {
    const titleInput = document.querySelector(
      'input[placeholder="Enter title..."]'
    ) as HTMLInputElement;
    if (titleInput) {
      titleInput.focus();
    }
  });
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
BRUTAL NOTES v0.0.1
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
        <div
          v-for="note in sortedNotes"
          :key="note.id"
          :style="[
            'margin-bottom: 24px;',
            note.pinned &&
              'background: #1a1a1a; border-left: 4px solid #0f0; padding: 8px;',
          ]"
        >
          <pre
            :style="[
              note.completed && 'text-decoration: line-through;',
              'white-space: pre-wrap;',
              note.pinned && 'color: #0f0;',
            ]"
          >
ID: {{ note.id }}
TITLE: {{ note.title }}
TEXT: {{ note.text }}
DATE: {{ formatDate(note.createdAt) }}
STATUS: {{ note.completed ? "DONE" : "ACTIVE" }}
          </pre>

          <!-- Подтверждение удаления для конкретной заметки -->
          <div
            v-if="
              confirmModal.show &&
              confirmModal.action === 'delete' &&
              confirmModal.noteId === note.id
            "
            style="
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-bottom: 8px;
              white-space: pre-wrap;
            "
          >
            <pre style="color: red">DELETE THIS NOTE? CANNOT BE UNDONE.</pre>
            <span
              @click="confirmAction"
              style="
                cursor: pointer;
                background: #222;
                color: red;
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
                color: #eee;
                padding: 2px 8px;
                user-select: none;
              "
              >[CANCEL]</span
            >
          </div>

          <!-- Кнопки действий -->
          <div v-else style="display: flex; gap: 8px; flex-wrap: wrap">
            <span
              @click="togglePin(note.id)"
              style="
                cursor: pointer;
                background: #222;
                padding: 2px 8px;
                user-select: none;
              "
              >[{{ note.pinned ? "UNPIN" : "PIN" }}]</span
            >
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
      <!-- Кнопка очистки завершенных и её подтверждение -->
      <div v-if="stats.completed > 0" style="margin-bottom: 16px">
        <div
          v-if="confirmModal.show && confirmModal.action === 'clear'"
          style="
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 16px;
            white-space: pre-wrap;
          "
        >
          <pre style="color: red">
CLEAR ALL {{ stats.completed }} DONE NOTES? CANNOT BE UNDONE.</pre
          >
          <span
            @click="confirmAction"
            style="
              cursor: pointer;
              background: #222;
              color: red;
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
              color: #eee;
              padding: 2px 8px;
              user-select: none;
            "
            >[CANCEL]</span
          >
        </div>
        <span
          v-else
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

      <!-- Кнопка открытия модалки добавления -->
      <span
        @click="openAddModal"
        style="
          cursor: pointer;
          background: #222;
          color: #0f0;
          padding: 2px 8px;
          user-select: none;
        "
        >[+ NEW NOTE]</span
      >

      <!-- Модальное окно добавления в стиле MS-DOS -->
      <div
        v-if="addModal"
        style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 1000;
        "
        @click.self="closeAddModal"
      >
        <div
          style="
            background: #000;
            border: 3px double #aaa;
            max-width: 500px;
            width: 100%;
          "
        >
          <div
            style="
              background: blue;
              color: #fff;
              padding: 8px 12px;
              margin: 0;
              font-weight: bold;
              text-align: center;
              border-bottom: 2px solid #aaa;
            "
          >
            █ ADD NEW NOTE █
          </div>
          <div style="padding: 16px">
            <pre style="margin: 0 0 8px 0">TITLE:</pre>
            <input
              v-model="newTitle"
              type="text"
              placeholder="Enter title..."
              style="
                background: #000;
                color: #eee;
                border: 1px solid #555;
                border-radius: 0;
                outline: none;
                padding: 8px;
                width: 100%;
                margin: 0 0 16px 0;
                font-family: monospace;
                font-size: 14px;
              "
            />
            <pre style="margin: 0 0 8px 0">TEXT:</pre>
            <textarea
              v-model="newText"
              rows="6"
              placeholder="Enter note text..."
              style="
                background: #000;
                color: #eee;
                border: 1px solid #555;
                border-radius: 0;
                outline: none;
                padding: 8px;
                width: 100%;
                margin: 0 0 16px 0;
                font-family: monospace;
                font-size: 14px;
                resize: vertical;
              "
            ></textarea>
            <div style="display: flex; gap: 8px; justify-content: flex-end">
              <span
                @click="closeAddModal"
                style="
                  cursor: pointer;
                  background: #333;
                  color: #eee;
                  border: 1px solid #555;
                  padding: 4px 16px;
                  user-select: none;
                "
                >CANCEL</span
              >
              <span
                @click="handleAdd"
                :style="
                  canAdd
                    ? 'cursor:pointer;background:#0a0;color:#000;border:1px solid #0f0;padding:4px 16px;user-select:none;font-weight:bold;'
                    : 'background:#333;color:#555;border:1px solid #444;padding:4px 16px;user-select:none;'
                "
                >ADD</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="toast.show" style="margin-top: 14px">
      <pre>{{ toast.message }}</pre>
    </div>
  </div>
</template>
<style scoped></style>
