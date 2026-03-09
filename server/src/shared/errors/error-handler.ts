/**
 * Global Error Handler Middleware
 * Handles all errors and returns consistent API responses
 */

import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { AppError, ErrorCode } from './app-error.js'

interface ErrorResponse {
  error: string
  code?: string
  details?: unknown
  stack?: string
}

/**
 * Format Zod validation errors into a readable format
 */
function formatZodErrors(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }))
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error for debugging
  console.error(`[Error] ${req.method} ${req.path}:`, err.message)
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack)
  }

  // Handle AppError (our custom errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON())
    return
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      code: ErrorCode.VALIDATION_ERROR,
      details: formatZodErrors(err),
    })
    return
  }

  // Handle Firebase errors
  if (err.name === 'FirebaseError' || (err as any).code?.startsWith?.('auth/')) {
    const firebaseError = err as any
    let statusCode = 500
    let message = firebaseError.message || 'Firebase operation failed'

    if (firebaseError.code === 'auth/id-token-expired') {
      statusCode = 401
      message = 'Token expired'
    } else if (firebaseError.code === 'auth/invalid-id-token') {
      statusCode = 401
      message = 'Invalid token'
    } else if (firebaseError.code === 'PERMISSION_DENIED') {
      statusCode = 403
      message = 'Permission denied'
    }

    res.status(statusCode).json({
      error: message,
      code: firebaseError.code,
    })
    return
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Invalid token',
      code: ErrorCode.UNAUTHORIZED,
    })
    return
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token expired',
      code: ErrorCode.TOKEN_EXPIRED,
    })
    return
  }

  // Handle PostgreSQL/Drizzle errors
  if (err && typeof err === 'object') {
    const pgError = err as any

    // Check for postgres error codes (Postgres uses string codes like '23503')
    if (pgError.code && typeof pgError.code === 'string') {
      // Foreign key violation
      if (pgError.code === '23503') {
        res.status(400).json({
          error: 'Referenced record does not exist',
          code: ErrorCode.VALIDATION_ERROR,
          details: pgError.detail || 'Foreign key constraint violation',
        })
        return
      }

      // Unique constraint violation (duplicate key)
      if (pgError.code === '23505') {
        res.status(409).json({
          error: 'Record already exists',
          code: ErrorCode.ALREADY_EXISTS,
          details: pgError.detail || 'Unique constraint violation',
        })
        return
      }

      // Not null violation
      if (pgError.code === '23502') {
        res.status(400).json({
          error: 'Required field is missing',
          code: ErrorCode.VALIDATION_ERROR,
          details: pgError.detail || 'Not null constraint violation',
        })
        return
      }

      // Check constraint violation
      if (pgError.code === '23514') {
        res.status(400).json({
          error: 'Invalid field value',
          code: ErrorCode.VALIDATION_ERROR,
          details: pgError.detail || 'Check constraint violation',
        })
        return
      }
    }
  }

  // Default to 500 Internal Server Error
  const response: ErrorResponse = {
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    code: ErrorCode.INTERNAL_ERROR,
  }

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack
  }

  res.status(500).json(response)
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: ErrorCode.NOT_FOUND,
  })
}
