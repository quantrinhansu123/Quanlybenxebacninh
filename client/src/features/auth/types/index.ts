// Auth Feature Types
// Re-export from shared types for consistency

export type {
  User,
  LoginCredentials,
  RegisterCredentials,
} from '@/types/auth.types'

// Feature-specific types
export interface AuthResponse {
  token: string
  user: User
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthContextValue extends AuthState {
  login: (usernameOrEmail: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateProfile: (data: { fullName?: string; email?: string; phone?: string }) => Promise<void>
}

// Import User type for AuthResponse
import type { User, RegisterCredentials } from '@/types/auth.types'
