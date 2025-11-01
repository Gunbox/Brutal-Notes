export interface Note {
  id: string;
  title: string;
  text: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

// Глобальное состояние (singleton)
const notes = ref<Note[]>([]);
const loading = ref(false);
const STORAGE_KEY = "brutal_notes";

export const useNotes = () => {
  const { getItem, setItem, hapticFeedback } = useTelegram();

  // Загрузка заметок из Telegram Cloud Storage
  const loadNotes = async () => {
    loading.value = true;
    try {
      const data = await getItem(STORAGE_KEY);
      if (data) {
        notes.value = JSON.parse(data);
        console.log(`📚 Loaded ${notes.value.length} notes`);
      }
    } catch (e) {
      console.error("Error loading notes:", e);
    } finally {
      loading.value = false;
    }
  };

  // Сохранение заметок в Telegram Cloud Storage
  const saveNotes = async () => {
    try {
      const data = JSON.stringify(notes.value);
      const success = await setItem(STORAGE_KEY, data);
      if (success) {
        console.log(`💾 Saved ${notes.value.length} notes successfully`);
      } else {
        console.error("❌ Failed to save notes");
      }
      return success;
    } catch (e) {
      console.error("❌ Error saving notes:", e);
      return false;
    }
  };

  // Добавление новой заметки
  const addNote = async (title: string, text: string) => {
    const note: Note = {
      id: crypto.randomUUID(),
      title: title.trim(),
      text: text.trim(),
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    notes.value.unshift(note);
    await saveNotes();
    hapticFeedback("success");
    console.log("✅ Note added:", note.id);
  };

  // Обновление заметки
  const updateNote = async (id: string, updates: Partial<Note>) => {
    const index = notes.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      const currentNote = notes.value[index]!;
      notes.value[index] = {
        id: currentNote.id,
        title: updates.title ?? currentNote.title,
        text: updates.text ?? currentNote.text,
        completed: updates.completed ?? currentNote.completed,
        createdAt: currentNote.createdAt,
        updatedAt: Date.now(),
      };
      await saveNotes();
      hapticFeedback("light");
      console.log("📝 Note updated:", id);
    }
  };

  // Переключение статуса заметки
  const toggleNote = async (id: string) => {
    const note = notes.value.find((n) => n.id === id);
    if (note) {
      await updateNote(id, { completed: !note.completed });
      hapticFeedback("medium");
    }
  };

  // Удаление заметки
  const deleteNote = async (id: string) => {
    notes.value = notes.value.filter((n) => n.id !== id);
    await saveNotes();
    hapticFeedback("warning");
    console.log("🗑️ Note deleted:", id);
  };

  // Удаление всех завершённых заметок
  const clearCompleted = async () => {
    const completedCount = notes.value.filter((n) => n.completed).length;
    if (completedCount > 0) {
      notes.value = notes.value.filter((n) => !n.completed);
      await saveNotes();
      hapticFeedback("success");
      console.log(`🧹 Cleared ${completedCount} completed notes`);
    }
  };

  // Принудительная синхронизация с Cloud Storage
  const syncNotes = async () => {
    console.log("🔄 Syncing notes from Cloud Storage...");
    await loadNotes();
  };

  // Статистика
  const stats = computed(() => ({
    total: notes.value.length,
    completed: notes.value.filter((n) => n.completed).length,
    active: notes.value.filter((n) => !n.completed).length,
  }));

  return {
    notes,
    loading,
    stats,
    loadNotes,
    syncNotes,
    addNote,
    updateNote,
    toggleNote,
    deleteNote,
    clearCompleted,
  };
};
