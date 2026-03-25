import axios, { AxiosError, AxiosInstance } from 'axios'

/**
 * Base URL phải trỏ tới prefix `/api` của Express (vd `https://host/api`).
 * Nhiều cấu hình Vercel chỉ ghi `https://host` → mọi request thành `/quanly-data`
 * thay vì `/api/quanly-data` → backend trả 404 `{ error: 'Route not found' }`.
 */
/** Exported for pdf-cache và chỗ khác cần cùng base URL với axios. */
export function normalizeApiBase(raw: string): string {
  const u = raw.trim().replace(/\/+$/, '')
  if (!u) return u
  if (u.endsWith('/api')) return u
  return `${u}/api`
}

/** Base URL axios (có `/api`). Dùng khi cần hiển thị trong toast/debug. */
export const getApiUrl = (): string => {
  const raw = import.meta.env.VITE_API_URL?.trim()

  if (import.meta.env.DEV) {
    // Trống → `/api` trên origin Vite (5173) + proxy trong vite.config (VITE_DEV_API_PORT, mặc định 3000).
    // Đã set VITE_API_URL (kể cả http://localhost:3006/api) → dùng đúng URL đó, không bỏ qua cổng.
    if (!raw) {
      return '/api'
    }
    return normalizeApiBase(raw)
  }

  if (raw) {
    return normalizeApiBase(raw)
  }

  if (import.meta.env.PROD) {
    console.error('VITE_API_URL is not set in production environment!')
    return 'https://quanlybenxebacninh-server.vercel.app/api'
  }

  return '/api'
}

const api: AxiosInstance = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname === '/login'
      const isLoginRequest = error.config?.url?.includes('/auth/login')
      
      // Don't clear token or redirect if this is a login request (let login page handle the error)
      if (!isLoginRequest) {
        // Handle unauthorized - clear token
        localStorage.removeItem('auth_token')
        
        // Show user-friendly message
        const responseData = error.response?.data as { error?: string; code?: string } | undefined
        if (responseData?.code === 'TOKEN_EXPIRED') {
          console.warn('Token đã hết hạn. Vui lòng đăng nhập lại.')
        } else {
          console.warn('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.')
        }
        
        // Only redirect if not already on login page
        if (!isLoginPage) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

