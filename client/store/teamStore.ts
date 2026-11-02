import { debugError } from "@/lib/logger";
import { create } from "zustand";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  location?: string;
  avatar?: string;
  employmentType?: string;
  status?: string;
  priority?: string;
  performanceScore: number;
  workloadScore: number;
  engagementScore: number;
  burnoutRisk?: number;
  activeTasks?: number;
  meetingsThisWeek?: number;
  completedTasks?: number;
  pendingTasks?: number;
  skills?: string[];
  projects?: string[];
  notes?: string;
  managerName?: string;
  joinedAt?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TeamStore {
  team: TeamMember[];
  members: TeamMember[];
  selectedMember: TeamMember | null;
  isLoading: boolean;
  error: string | null;

  fetchMembers: () => Promise<void>;
  createMember: (payload: any) => Promise<void>;
  updateMember: (id: string, payload: any) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  setSelectedMember: (member: TeamMember | null) => void;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  team: [],
  members: [],
  selectedMember: null,
  isLoading: false,
  error: null,

  fetchMembers: async () => {
    try {
      set({ isLoading: true, error: null });
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/api/team`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        set({ 
          team: response.data.data,
          members: response.data.data,
          isLoading: false 
        });
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      debugError("Fetch members error:", error);
      set({ 
        error: error.response?.data?.message || "Failed to fetch members", 
        isLoading: false 
      });
    }
  },

  createMember: async (payload) => {
    try {
      set({ isLoading: true, error: null });
      const token = localStorage.getItem('token');
      
      // Transform payload to match backend expectations
      const memberData = {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
        department: payload.department,
        location: payload.location,
        employmentType: payload.employmentType || "FULL_TIME",
        status: payload.status || "AVAILABLE",
        priority: payload.priority || "MEDIUM",
        performanceScore: payload.performanceScore || 70,
        workloadScore: payload.workload || 50,
        engagementScore: payload.engagementScore || 70,
        burnoutRisk: payload.burnoutRisk || 30,
        activeTasks: payload.activeTasks || 0,
        meetingsThisWeek: payload.meetingsThisWeek || 0,
        completedTasks: payload.completedTasks || 0,
        pendingTasks: payload.pendingTasks || 0,
        skills: payload.skills || [],
        projects: payload.projects || [],
        notes: payload.notes,
        managerName: payload.managerName,
        joinedAt: payload.joinedAt,
        lastActiveAt: payload.lastActiveAt
      };
      
      const response = await axios.post(`${API_URL}/api/team`, memberData, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        set(state => ({
          team: [response.data.data, ...state.team],
          members: [response.data.data, ...state.members],
          isLoading: false
        }));
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      debugError("Create member error:", error);
      set({ 
        error: error.response?.data?.message || "Failed to create member", 
        isLoading: false 
      });
      throw error;
    }
  },

  updateMember: async (id, payload) => {
    try {
      set({ isLoading: true, error: null });
      const token = localStorage.getItem('token');
      
      const response = await axios.put(`${API_URL}/api/team/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        set(state => ({
          team: state.team.map(m => m.id === id ? response.data.data : m),
          members: state.members.map(m => m.id === id ? response.data.data : m),
          selectedMember: state.selectedMember?.id === id ? response.data.data : state.selectedMember,
          isLoading: false
        }));
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      debugError("Update member error:", error);
      set({ 
        error: error.response?.data?.message || "Failed to update member", 
        isLoading: false 
      });
      throw error;
    }
  },

  deleteMember: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(`${API_URL}/api/team/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        set(state => ({
          team: state.team.filter(m => m.id !== id),
          members: state.members.filter(m => m.id !== id),
          selectedMember: state.selectedMember?.id === id ? null : state.selectedMember,
          isLoading: false
        }));
      } else {
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      debugError("Delete member error:", error);
      set({ 
        error: error.response?.data?.message || "Failed to delete member", 
        isLoading: false 
      });
      throw error;
    }
  },

  setSelectedMember: (member) => {
    set({ selectedMember: member });
  },
}));