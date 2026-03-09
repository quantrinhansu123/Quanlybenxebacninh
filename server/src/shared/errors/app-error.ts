/**
 * Custom Application Error Classes
 * Provides standardized error handling across the application
 */

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // Business Logic
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Generic
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
}

export interface ErrorDetails {
  field?: string
  message?: string
  value?: unknown
}

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: ErrorDetails[]
  public readonly isOperational: boolean

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    details?: ErrorDetails[],
    isOperational: boolean = true
  ) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.isOperational = isOperational

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor)
    Object.setPrototypeOf(this, AppError.prototype)
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
    }
  }
}

// Convenience error classes
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`
    super(message, ErrorCode.NOT_FOUND, 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails[]) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, ErrorCode.UNAUTHORIZED, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, ErrorCode.FORBIDDEN, 403)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ErrorDetails[]) {
    super(message, ErrorCode.CONFLICT, 409, details)
  }
}

export class AlreadyExistsError extends AppError {
  constructor(resource: string, field: string, value: string) {
    super(
      `${resource} with ${field} '${value}' already exists`,
      ErrorCode.ALREADY_EXISTS,
      409,
      [{ field, value }]
    )
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, ErrorCode.DATABASE_ERROR, 500, undefined, false)
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: ErrorDetails[]) {
    super(message, ErrorCode.BUSINESS_RULE_VIOLATION, 422, details)
  }
}
