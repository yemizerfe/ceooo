import { create } from 'zustand';

export interface Note {
  id: string;
  title: string;
  content?: string;
  category: 'MEETING' | 'IDEA' | 'DECISION' | 'TASK' | 'GENERAL';
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
}

// Payload accepted by the API. `priority`, `linkedProject` and `participants` are
// editor-only extras the notes page collects (the API currently stores the core fields).
export type NotePayload = Partial<Note> & {
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  linkedProject?: string;
  participants?: string;
};

interface NotesState {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  fetchNotes: (category?: string) => Promise<void>;
  createNote: (data: NotePayload) => Promise<void>;
  updateNote: (id: string, data: NotePayload) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  summarizeNote: (id: string) => Promise<{ summary: string; keyPoints: string[]; actionItems: string[] }>;
  clearError: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010';
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  isLoading: false,
  error: null,

  fetchNotes: async (category) => {
    set({ isLoading: true, error: null });
    try {
      const params = category ? `?category=${category}` : '';
      const res = await fetch(`${API_URL}/api/notes${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) set({ notes: data.data });
      else throw new Error(data.message);
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },

  createNote: async (noteData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(noteData),
      });
      const data = await res.json();
      if (data.success) set((s) => ({ notes: [data.data, ...s.notes] }));
      else throw new Error(data.message);
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  updateNote: async (id, noteData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(noteData),
      });
      const data = await res.json();
      if (data.success) set((s) => ({ notes: s.notes.map((n) => n.id === id ? data.data : n) }));
      else throw new Error(data.message);
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteNote: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/api/notes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
      else throw new Error(data.message);
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },

  summarizeNote: async (id) => {
    const res = await fetch(`${API_URL}/api/notes/${id}/summarize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (data.success) {
      set((s) => ({
        notes: s.notes.map((n) => n.id === id ? { ...n, aiSummary: data.data.summary } : n),
      }));
      return data.data;
    }
    throw new Error(data.message);
  },

  clearError: () => set({ error: null }),
}));
