import { useAuthStore } from '../store/authStore'
import type { RegisterCredentials } from '../types'

/**
 * Wrapper hook for auth functionality
 * Provides cleaner API and hides store implementation
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
    updateProfile,
  } = useAuthStore()

  return {
    // State
    user,
    isAuthenticated,
    isLoading,

    // Actions
    login: async (usernameOrEmail: string, password: string, rememberMe?: boolean) => {
      await login(usernameOrEmail, password, rememberMe)
    },
    register: async (credentials: RegisterCredentials) => {
      await register(credentials)
    },
    logout: () => {
      logout()
    },
    checkAuth: async () => {
      await checkAuth()
    },
    updateProfile: async (data: { fullName?: string; email?: string; phone?: string }) => {
      await updateProfile(data)
    },
  }
}
