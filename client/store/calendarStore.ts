import { debugError } from "@/lib/logger";
import { create } from "zustand";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { isAdminPath, isPlatformAdmin } from "@/lib/authRouting";

function canUseExecutiveWorkspace(): boolean {
  if (typeof window === "undefined" || isAdminPath()) return false;
  const user = useAuthStore.getState().user;
  return Boolean(user) && !isPlatformAdmin(user);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location?: string;
  meetingLink?: string;
  attendees: string[];
  reminderMinutes?: number;
  status: string;
  priority: string;
  recurring: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CalendarState {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  fetchUpcoming: () => Promise<void>;
  createEvent: (data: Partial<CalendarEvent>) => Promise<void>;
  updateEvent: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  isLoading: false,
  error: null,

  fetchEvents: async () => {
    if (!canUseExecutiveWorkspace()) {
      set({ events: [], isLoading: false, error: null });
      return;
    }
    try {
      set({ isLoading: true, error: null });
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/api/calendar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        set({ events: response.data.data, isLoading: false });
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      debugError("Fetch events error:", error);
      set({ error: error.response?.data?.message || "Failed to fetch events", isLoading: false });
    }
  },

  fetchUpcoming: async () => {
    if (!canUseExecutiveWorkspace()) {
      set({ events: [], isLoading: false, error: null });
      return;
    }
    try {
      set({ isLoading: true, error: null });
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/api/calendar/upcoming`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        set({ events: response.data.data, isLoading: false });
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      debugError("Fetch upcoming error:", error);
      set({ error: error.response?.data?.message || "Failed to fetch upcoming events", isLoading: false });
    }
  },

  createEvent: async (eventData) => {
    try {
      set({ isLoading: true, error: null });
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`${API_URL}/api/calendar`, eventData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        set(state => ({ 
          events: [...state.events, response.data.data],
          isLoading: false 
        }));
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      debugError("Create event error:", error);
      set({ error: error.response?.data?.message || "Failed to create event", isLoading: false });
      throw error;
    }
  },

  updateEvent: async (id, eventData) => {
    try {
      set({ isLoading: true, error: null });
      const token = localStorage.getItem('token');
      
      const response = await axios.put(`${API_URL}/api/calendar/${id}`, eventData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        set(state => ({
          events: state.events.map(event => event.id === id ? response.data.data : event),
          isLoading: false
        }));
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      debugError("Update event error:", error);
      set({ error: error.response?.data?.message || "Failed to update event", isLoading: false });
      throw error;
    }
  },

  deleteEvent: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(`${API_URL}/api/calendar/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        set(state => ({
          events: state.events.filter(event => event.id !== id),
          isLoading: false
        }));
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      debugError("Delete event error:", error);
      set({ error: error.response?.data?.message || "Failed to delete event", isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));