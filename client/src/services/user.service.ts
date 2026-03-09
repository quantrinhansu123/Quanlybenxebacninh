/**
 * User Service
 * API service for user management (Nhân sự)
 */
import api from '@/lib/api'

export interface User {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: 'admin' | 'dispatcher' | 'accountant' | 'reporter' | 'user'
  isActive: boolean
  emailVerified: boolean
  benPhuTrach: string | null
  benPhuTrachName?: string | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateUserData {
  email: string
  password: string
  name: string
  phone?: string
  role?: 'admin' | 'dispatcher' | 'accountant' | 'reporter' | 'user'
  isActive?: boolean
  benPhuTrach?: string | null
}

export interface UpdateUserData {
  email?: string
  name?: string
  phone?: string
  role?: 'admin' | 'dispatcher' | 'accountant' | 'reporter' | 'user'
  isActive?: boolean
  password?: string
  benPhuTrach?: string | null
}

export interface UsersResponse {
  data: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const userService = {
  /**
   * Get all users with pagination and filters
   */
  getAll: async (params?: {
    page?: number
    limit?: number
    search?: string
    role?: string
    isActive?: boolean
  }): Promise<UsersResponse> => {
    const response = await api.get<UsersResponse>('/users', { params })
    return response.data
  },

  /**
   * Get user by ID
   */
  getById: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`)
    return response.data
  },

  /**
   * Create new user
   */
  create: async (data: CreateUserData): Promise<User> => {
    const response = await api.post<User>('/users', data)
    return response.data
  },

  /**
   * Update user
   */
  update: async (id: string, data: UpdateUserData): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data)
    return response.data
  },

  /**
   * Delete user
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`)
  },
}
