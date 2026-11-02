// store/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, LoginCredentials, SignupData } from "@/types/auth";
import { getAuthenticatedHomePath } from "@/lib/authRouting";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  role: "CEO";

  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  setUser: (user: User | null) => void;
  setOnboardingCompleted: () => void;
  redirectIfAuthenticated: () => void;
  checkOnboardingStatus: () => Promise<boolean>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010";

// Email + password auth goes through this app's own /api/auth/* routes, which
// forward to the API server-side. Sending credentials straight to the API from
// the browser made sign-in depend on its CORS allow-list, so opening the app on
// 127.0.0.1, a LAN IP or a preview host failed with an opaque network error.
const AUTH_ENDPOINT = "/api/auth";

function describeAuthError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    // fetch() rejects with a bare "Failed to fetch" when the request never
    // reaches a server; say something the visitor can act on instead.
    if (/failed to fetch|networkerror|load failed|fetch failed/i.test(error.message)) {
      return "Cannot reach the authentication service. Check your connection and try again.";
    }
    return error.message || fallback;
  }
  return fallback;
}

interface AuthApiUser extends Partial<User> {
  id: string;
  email: string;
}

interface AuthApiResponse {
  message?: string;
  code?: string;
  errors?: Array<{ msg?: string }>;
  data?: {
    token?: string;
    user?: AuthApiUser;
  };
}

async function readAuthResponse(
  response: Response
): Promise<{ token: string; user: AuthApiUser }> {
  let data: AuthApiResponse;
  try {
    data = await response.json() as AuthApiResponse;
  } catch {
    throw new Error(`Authentication service returned an invalid response (${response.status}).`);
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(data.message || data.errors?.[0]?.msg || "Authentication failed"),
      { code: data.code }
    );
  }
  if (!data.data?.token || !data.data.user?.id || !data.data.user.email) {
    throw new Error("Authentication service returned an incomplete response.");
  }
  return { token: data.data.token, user: data.data.user };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      role: "CEO",

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${AUTH_ENDPOINT}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const { token, user: authUser } = await readAuthResponse(response);
          localStorage.setItem("token", token);

          set({
            user: {
              id: authUser.id,
              email: authUser.email,
              name: authUser.name || "",
              role: authUser.role || "CEO",
              accessRole: authUser.accessRole || "CEO",
              isAdmin: Boolean(authUser.isAdmin),
              companyName: authUser.companyName,
              industry: authUser.industry,
              companySize: authUser.companySize,
              avatarUrl: authUser.avatarUrl,
              aiUsageCount: authUser.aiUsageCount || 0,
              subscriptionPlan: authUser.subscriptionPlan || "free",
              isVerified: authUser.isVerified || false,
              hasCompletedOnboarding: authUser.hasCompletedOnboarding || false,
              createdAt: authUser.createdAt,
              lastLoginAt: new Date(),
            },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          if (credentials.rememberMe) {
            localStorage.setItem("sessionExpiry", (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
          }
        } catch (error) {
          set({
            error: describeAuthError(error, "Login failed"),
            isLoading: false,
          });
          throw error;
        }
      },

      signup: async (data: SignupData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${AUTH_ENDPOINT}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: data.email,
              password: data.password,
            }),
          });

          const { token, user: authUser } = await readAuthResponse(response);
          localStorage.setItem("token", token);

          set({
            user: {
              id: authUser.id,
              email: authUser.email,
              name: authUser.name || "",
              role: authUser.role || "CEO",
              accessRole: authUser.accessRole || "CEO",
              isAdmin: Boolean(authUser.isAdmin),
              companyName: authUser.companyName,
              industry: authUser.industry,
              companySize: authUser.companySize,
              avatarUrl: authUser.avatarUrl,
              aiUsageCount: authUser.aiUsageCount || 0,
              subscriptionPlan: authUser.subscriptionPlan || "free",
              isVerified: authUser.isVerified || false,
              hasCompletedOnboarding: false,
              createdAt: authUser.createdAt,
            },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: describeAuthError(error, "Signup failed"),
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("sessionExpiry");
        localStorage.removeItem("auth-storage");
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false, 
          error: null 
        });
        window.location.href = "/login";
      },

      clearError: () => set({ error: null }),

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      setUser: (user: User | null) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        });
      },

      setOnboardingCompleted: () => {
        const currentUser = get().user;
        if (currentUser) {
          localStorage.setItem(`onboarding_${currentUser.id}`, "true");
          set({ user: { ...currentUser, hasCompletedOnboarding: true } });
        }
      },

      checkOnboardingStatus: async () => {
        const currentUser = get().user;
        if (!currentUser) return false;
        
        // Check if user has already completed onboarding from user data
        if (currentUser.hasCompletedOnboarding) {
          // Sync localStorage
          localStorage.setItem(`onboarding_${currentUser.id}`, "true");
          return false;
        }
        
        // Check localStorage as backup
        const localStatus = localStorage.getItem(`onboarding_${currentUser.id}`);
        if (localStatus === "true") {
          // Update user state if needed
          if (!currentUser.hasCompletedOnboarding) {
            set({ user: { ...currentUser, hasCompletedOnboarding: true } });
          }
          return false;
        }
        
        // User needs onboarding
        return true;
      },

      redirectIfAuthenticated: () => {
        const { isAuthenticated, user } = get();
        if (isAuthenticated && typeof window !== "undefined") {
          window.location.href = getAuthenticatedHomePath(user);
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);