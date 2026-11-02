import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'DECISION' | 'CALENDAR' | 'FINANCIAL' | 'STAKEHOLDER' | 'AI_INSIGHT' | 'SYSTEM' | 'REMINDER';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isRead: boolean;
  metadata: Record<string, any>;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearError: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010';
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (unreadOnly) => {
    set({ isLoading: true, error: null });
    try {
      const params = unreadOnly ? '?unreadOnly=true' : '';
      const res = await fetch(`${API_URL}/api/notifications${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) set({ notifications: data.data, unreadCount: data.unreadCount });
      else throw new Error(data.message);
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PATCH', headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        set((s) => ({
          notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
          unreadCount: Math.max(0, s.unreadCount - 1),
        }));
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  markAllAsRead: async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PATCH', headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  deleteNotification: async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/${id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        set((s) => {
          const notif = s.notifications.find((n) => n.id === id);
          return {
            notifications: s.notifications.filter((n) => n.id !== id),
            unreadCount: notif && !notif.isRead ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
          };
        });
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  clearError: () => set({ error: null }),
}));
