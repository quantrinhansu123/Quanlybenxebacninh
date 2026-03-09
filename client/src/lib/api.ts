import axios, { AxiosError, AxiosInstance } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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

