/**
 * Common Types
 * Shared type definitions used across the application
 */

// ========== Error Types ==========

/**
 * Standard error object structure from various sources
 * (Firebase, Zod, custom errors)
 */
export interface AppError {
  name?: string
  message?: string
  code?: string | number
  errors?: Array<{ message: string; path?: string[] }>
}

/**
 * Type guard to check if an unknown error has an error structure
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('message' in error || 'code' in error || 'errors' in error)
  )
}

/**
 * Extract error message from unknown error
 */
/** Postgres undefined_column (node-postgres 42703; có thể bọc trong Drizzle cause) */
export function isPostgresUndefinedColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; message?: string; cause?: unknown }
  if (e.code === '42703') return true
  if (typeof e.message === 'string' && /column .* does not exist/i.test(e.message)) return true
  if (e.cause) return isPostgresUndefinedColumnError(e.cause)
  return false
}

export function getDbSchemaMismatchHint(error: unknown): string | null {
  if (!isPostgresUndefinedColumnError(error)) return null
  return 'Thiếu cột trên PostgreSQL (dispatch_records hoặc users). Supabase → SQL Editor → chạy 009-dispatch-records-drizzle-parity.sql và/hoặc 010-users-drizzle-parity.sql trong server/src/db/migrations/manual/.'
}

export function getErrorMessage(error: unknown, defaultMessage = 'An error occurred'): string {
  const schemaHint = getDbSchemaMismatchHint(error)
  if (schemaHint) return schemaHint

  if (isAppError(error)) {
    // Zod validation error
    if (error.name === 'ZodError' && error.errors?.[0]?.message) {
      return error.errors[0].message
    }
    // Standard error
    if (error.message) {
      return error.message
    }
  }
  // String error
  if (typeof error === 'string') {
    return error
  }
  return defaultMessage
}

/**
 * Check if error is a duplicate key error (PostgreSQL/Firebase)
 */
export function isDuplicateKeyError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.code === '23505' || error.code === 'ALREADY_EXISTS'
  }
  return false
}

/**
 * Check if error is a Zod validation error
 */
export function isValidationError(error: unknown): boolean {
  return isAppError(error) && error.name === 'ZodError'
}

// ========== API Response Types ==========

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
}

/**
 * Combined API response type
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// ========== Pagination Types ==========

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ========== Database Types ==========

/**
 * Base fields present in all database records
 */
export interface BaseDBRecord {
  id: string
  created_at: string
  updated_at: string
}

/**
 * Firebase query result structure
 */
export interface FirebaseQueryResult<T> {
  data: T[] | null
  error: Error | null
}

/**
 * Firebase single record result structure
 */
export interface FirebaseSingleResult<T> {
  data: T | null
  error: Error | null
}

// ========== Relation Types ==========

/**
 * Operator summary for embedded relations
 */
export interface OperatorSummary {
  id: string
  name: string
  code: string
}

/**
 * Vehicle type summary for embedded relations
 */
export interface VehicleTypeSummary {
  id: string
  name: string
}

/**
 * Route summary for embedded relations
 */
export interface RouteSummary {
  id: string
  routeName: string
  routeType?: string | null
}

/**
 * User summary for audit fields
 */
export interface UserSummary {
  id: string
  fullName?: string
  username?: string
}
