import { create } from 'zustand'
import type { User, RegisterCredentials } from '../types'
import { authApi } from '../api/authApi'

interface AuthStoreState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (usernameOrEmail: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateProfile: (data: { fullName?: string; email?: string; phone?: string }) => Promise<void>
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (usernameOrEmail: string, password: string, rememberMe = false) => {
    try {
      const data = await authApi.login({ usernameOrEmail, password, rememberMe })
      set({ user: data.user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (credentials: RegisterCredentials) => {
    try {
      const data = await authApi.register(credentials)
      set({ user: data.user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    authApi.logout()
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    if (authApi.isAuthenticated()) {
      try {
        const user = await authApi.getCurrentUser()
        set({ user, isAuthenticated: true, isLoading: false })
      } catch {
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    } else {
      set({ isLoading: false })
    }
  },

  updateProfile: async (data: { fullName?: string; email?: string; phone?: string }) => {
    try {
      const updatedUser = await authApi.updateProfile(data)
      set({ user: updatedUser })
    } catch (error) {
      throw error
    }
  },
}))
