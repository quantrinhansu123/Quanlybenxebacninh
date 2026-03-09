// Authentication Types

export interface User {
  id: string
  username: string
  fullName: string
  role: 'admin' | 'dispatcher' | 'accountant' | 'reporter'
  email?: string
  phone?: string
}

export interface LoginCredentials {
  usernameOrEmail: string
  password: string
  rememberMe?: boolean
}

export interface RegisterCredentials {
  username: string
  password: string
  fullName: string
  email?: string
  phone?: string
  role?: 'admin' | 'dispatcher' | 'accountant' | 'reporter'
}
