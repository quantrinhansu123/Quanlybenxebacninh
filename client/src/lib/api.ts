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

// Auto-detect API URL based on environment
// In production/Vercel, use VITE_API_URL from env vars
// In local dev, fallback to localhost if VITE_API_URL not set
const getApiUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return normalizeApiBase(import.meta.env.VITE_API_URL)
  }

  if (import.meta.env.PROD) {
    console.error('VITE_API_URL is not set in production environment!')
    return 'https://quanlybenxebacninh-server.vercel.app/api'
  }

  return 'http://localhost:3000/api'
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

