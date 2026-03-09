/**
 * Operator Controller
 * HTTP request handlers for Operator entity
 */

import { Request, Response } from 'express'
import { operatorService } from '../services/operator.service.js'
import { asyncHandler } from '../../../shared/errors/error-handler.js'
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
} from '../../../shared/response/api-response.js'

/**
 * GET /operators
 * Get all operators
 */
export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.query
  const operators = await operatorService.getAll(
    isActive !== undefined ? isActive === 'true' : undefined
  )
  sendSuccess(res, operators)
})

/**
 * GET /operators/:id
 * Get operator by ID
 */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const operator = await operatorService.getById(id)
  sendSuccess(res, operator)
})

/**
 * POST /operators
 * Create a new operator
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const operator = await operatorService.create(req.body)
  sendCreated(res, operator)
})

/**
 * PUT /operators/:id
 * Update an operator
 */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const operator = await operatorService.update(id, req.body)
  sendSuccess(res, operator)
})

/**
 * DELETE /operators/:id
 * Delete an operator
 */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  await operatorService.delete(id)
  sendNoContent(res)
})

/**
 * PATCH /operators/:id/toggle-active
 * Toggle operator active status
 */
export const toggleActive = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const operator = await operatorService.toggleActive(id)
  sendSuccess(res, operator)
})
