import { debugLog, debugError } from "@/lib/logger";
// store/projectStore.ts
import { create } from 'zustand';
import { useAuthStore } from "@/store/authStore";
import { isAdminPath, isPlatformAdmin } from "@/lib/authRouting";

function canUseExecutiveWorkspace(): boolean {
  if (typeof window === "undefined" || isAdminPath()) return false;
  const user = useAuthStore.getState().user;
  return Boolean(user) && !isPlatformAdmin(user);
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  assignedTo?: string;
  dueDate?: string;
  completedAt?: Date;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  progress: number;
  startDate?: string;
  deadline?: string;
  budget?: number;
  teamSize?: number;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<Project | null>;
  createProject: (project: Partial<Project>) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<void>;
  refreshProject: (id: string) => Promise<Project | null>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010';

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    if (!canUseExecutiveWorkspace()) {
      set({ projects: [], isLoading: false, error: null });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ isLoading: false, error: 'No authentication token found' });
        return;
      }

      debugLog('📡 Fetching projects from:', `${API_URL}/api/projects`);
      
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      debugLog('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        debugError('❌ Fetch failed:', errorText);
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }
      
      const data = await response.json();
      debugLog('✅ Fetched projects:', data.data?.length || 0, 'projects');
      
      set({ projects: data.data || [], isLoading: false });
    } catch (error) {
      debugError('❌ Fetch projects error:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ isLoading: false, error: 'No authentication token found' });
        return null;
      }

      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) throw new Error('Failed to fetch project');
      
      const data = await response.json();
      const project = data.data;
      
      set(state => ({
        projects: state.projects.map(p => p.id === id ? project : p),
        isLoading: false
      }));
      
      return project;
    } catch (error) {
      debugError('Fetch project error:', error);
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  refreshProject: async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) throw new Error('Failed to refresh project');
      
      const data = await response.json();
      const project = data.data;
      
      debugLog('🔄 Refreshed project:', project.name);
      
      set(state => ({
        projects: state.projects.map(p => p.id === id ? project : p),
        isLoading: false
      }));
      
      return project;
    } catch (error) {
      debugError('Refresh project error:', error);
      return null;
    }
  },

  createProject: async (project: Partial<Project>) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ isLoading: false, error: 'No authentication token found' });
        return null;
      }

      debugLog('📝 Creating project:', project.name);

      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...project,
          tasks: project.tasks || []
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugError('❌ Create failed:', errorText);
        throw new Error('Failed to create project');
      }
      
      const data = await response.json();
      const newProject = data.data;
      
      debugLog('✅ Created project:', newProject.name);
      
      set(state => ({
        projects: [...state.projects, newProject],
        isLoading: false
      }));
      
      return newProject;
    } catch (error) {
      debugError('Create project error:', error);
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  updateProject: async (id: string, updates: Partial<Project>) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ isLoading: false, error: 'No authentication token found' });
        return null;
      }

      debugLog('✏️ Updating project:', id, updates);

      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugError('❌ Update failed:', errorText);
        throw new Error('Failed to update project');
      }
      
      const data = await response.json();
      const updatedProject = data.data;
      
      debugLog('✅ Updated project:', updatedProject.name);
      
      set(state => ({
        projects: state.projects.map(p => p.id === id ? updatedProject : p),
        isLoading: false
      }));
      
      return updatedProject;
    } catch (error) {
      debugError('Update project error:', error);
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ isLoading: false, error: 'No authentication token found' });
        return;
      }

      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) throw new Error('Failed to delete project');
      
      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        isLoading: false
      }));
      
      debugLog('🗑️ Deleted project:', id);
    } catch (error) {
      debugError('Delete project error:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  }
}));