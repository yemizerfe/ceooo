// hooks/useAuth.ts
import { useAuthStore } from "@/store/authStore";

export const useAuth = () => {
  const { 
    login, 
    signup, 
    logout, 
    user, 
    isAuthenticated, 
    isLoading, 
    error, 
    clearError,
    redirectIfAuthenticated 
  } = useAuthStore();

  return {
    login,
    signup,
    logout,
    user,
    isAuthenticated,
    isLoading,
    error,
    clearError,
    redirectIfAuthenticated,
  };
};