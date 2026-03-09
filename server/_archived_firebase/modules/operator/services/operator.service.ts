/**
 * Operator Service
 * Business logic layer for Operator entity
 */

import { OperatorAPI } from '../../../shared/mappers/entity-mappers.js'
import { AlreadyExistsError, ValidationError } from '../../../shared/errors/app-error.js'
import { operatorRepository, OperatorRepository } from '../repositories/operator.repository.js'

export interface CreateOperatorDTO {
  name: string
  code: string
  taxCode?: string
  phone?: string
  email?: string
  address?: string
  province?: string
  district?: string
  representativeName?: string
  representativePosition?: string
  isTicketDelegated?: boolean
  isActive?: boolean
}

export interface UpdateOperatorDTO extends Partial<CreateOperatorDTO> {}

export class OperatorService {
  constructor(private repository: OperatorRepository) {}

  /**
   * Get all operators
   */
  async getAll(isActive?: boolean): Promise<OperatorAPI[]> {
    if (isActive !== undefined) {
      return this.repository.findByActiveStatus(isActive)
    }
    return this.repository.findAll()
  }

  /**
   * Get operator by ID
   */
  async getById(id: string): Promise<OperatorAPI> {
    return this.repository.findByIdOrFail(id)
  }

  /**
   * Create a new operator
   */
  async create(data: CreateOperatorDTO): Promise<OperatorAPI> {
    // Validate required fields
    if (!data.name?.trim()) {
      throw new ValidationError('Operator name is required')
    }
    if (!data.code?.trim()) {
      throw new ValidationError('Operator code is required')
    }

    // Check for duplicate code
    const codeExists = await this.repository.codeExists(data.code)
    if (codeExists) {
      throw new AlreadyExistsError('Operator', 'code', data.code)
    }

    return this.repository.create({
      ...data,
      isActive: data.isActive ?? true,
    })
  }

  /**
   * Update an operator
   */
  async update(id: string, data: UpdateOperatorDTO): Promise<OperatorAPI> {
    // Ensure operator exists
    await this.repository.findByIdOrFail(id)

    // Check for duplicate code if updating code
    if (data.code) {
      const codeExists = await this.repository.codeExists(data.code, id)
      if (codeExists) {
        throw new AlreadyExistsError('Operator', 'code', data.code)
      }
    }

    return this.repository.updateById(id, data)
  }

  /**
   * Delete an operator
   */
  async delete(id: string): Promise<void> {
    await this.repository.deleteById(id)
  }

  /**
   * Toggle operator active status
   */
  async toggleActive(id: string): Promise<OperatorAPI> {
    const operator = await this.repository.findByIdOrFail(id)
    return this.repository.updateById(id, { isActive: !operator.isActive })
  }
}

// Export singleton instance
export const operatorService = new OperatorService(operatorRepository)
