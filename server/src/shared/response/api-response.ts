/**
 * Standardized API Response Utilities
 * Provides consistent response formats across all endpoints
 */

import { Response } from 'express'

export interface SuccessResponse<T> {
  success: true
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ErrorResponse {
  success: false
  error: string
  code?: string
  details?: unknown
}

/**
 * Send a success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  }
  if (message) {
    response.message = message
  }
  res.status(statusCode).json(response)
}

/**
 * Send a created response (201)
 */
export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, 201, message)
}

/**
 * Send a paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginatedResponse<T>['pagination']
): void {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination,
  }
  res.status(200).json(response)
}

/**
 * Send a no content response (204)
 */
export function sendNoContent(res: Response): void {
  res.status(204).send()
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  error: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
): void {
  const response: ErrorResponse = {
    success: false,
    error,
  }
  if (code) response.code = code
  if (details) response.details = details
  res.status(statusCode).json(response)
}

/**
 * Send validation error (400)
 */
export function sendValidationError(
  res: Response,
  error: string,
  details?: unknown
): void {
  sendError(res, error, 400, 'VALIDATION_ERROR', details)
}

/**
 * Send not found error (404)
 */
export function sendNotFound(res: Response, resource: string): void {
  sendError(res, `${resource} not found`, 404, 'NOT_FOUND')
}

/**
 * Send unauthorized error (401)
 */
export function sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
  sendError(res, message, 401, 'UNAUTHORIZED')
}

/**
 * Send forbidden error (403)
 */
export function sendForbidden(res: Response, message: string = 'Access forbidden'): void {
  sendError(res, message, 403, 'FORBIDDEN')
}
