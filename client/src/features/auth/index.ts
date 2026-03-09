// Auth Feature Public API
// Only export what should be used by other features/modules

// Components
export { ProtectedRoute } from './components/ProtectedRoute'

// Hooks
export { useAuth } from './hooks/useAuth'

// Store (for direct access if needed)
export { useAuthStore } from './store/authStore'

// API (for advanced usage)
export { authApi } from './api/authApi'

// Types
export type {
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  AuthState,
  AuthContextValue,
} from './types'
