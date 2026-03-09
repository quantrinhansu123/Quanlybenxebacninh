import api from '@/lib/api'
import axios from 'axios'
import type { LoginCredentials, RegisterCredentials, User, AuthResponse } from '../types'

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      // Clear any old/invalid token before login attempt
      localStorage.removeItem('auth_token')
      
      const normalizedCredentials: LoginCredentials = {
        ...credentials,
        usernameOrEmail: credentials.usernameOrEmail.trim(),
      }

      const response = await api.post<AuthResponse>('/auth/login', normalizedCredentials)
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token)
      }
      return response.data
    } catch (error) {
      // Clear token on login failure
      localStorage.removeItem('auth_token')
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const backendMessage = error.response?.data?.error
        
        // Provide more specific error messages
        if (status === 401) {
          throw new Error(
            typeof backendMessage === 'string' 
              ? backendMessage 
              : 'Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại email và mật khẩu.'
          )
        }
        if (status === 403) {
          throw new Error('Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.')
        }
        if (status === 500) {
          throw new Error('Lỗi server. Vui lòng thử lại sau.')
        }
        if (!error.response) {
          throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.')
        }
        throw new Error(
          typeof backendMessage === 'string' 
            ? backendMessage 
            : 'Đăng nhập thất bại'
        )
      }
      throw new Error('Đăng nhập thất bại')
    }
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', credentials)
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token)
    }
    return response.data
  },

  logout: (): void => {
    localStorage.removeItem('auth_token')
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me')
    return response.data
  },

  updateProfile: async (data: { fullName?: string; email?: string; phone?: string }): Promise<User> => {
    const response = await api.put<User>('/auth/profile', data)
    return response.data
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('auth_token')
  },
}

// Backward compatibility
export default authApi
