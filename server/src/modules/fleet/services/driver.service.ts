/**
 * Driver Service
 * Business logic layer for Driver entity
 */

import { DriverAPI } from '../../../shared/mappers/entity-mappers.js'
import { AlreadyExistsError, ValidationError } from '../../../shared/errors/app-error.js'
import { driverRepository, DriverRepository } from '../repositories/driver.repository.js'

export interface CreateDriverDTO {
  operatorId?: string
  fullName: string
  idNumber: string
  phone?: string
  email?: string
  province?: string
  district?: string
  address?: string
  licenseNumber: string
  licenseClass: string
  licenseIssueDate?: string
  licenseExpiryDate?: string
  imageUrl?: string
  isActive?: boolean
}

export interface UpdateDriverDTO extends Partial<CreateDriverDTO> {}

export interface DriverFilters {
  operatorId?: string
  isActive?: boolean
}

export class DriverService {
  constructor(private repository: DriverRepository) {}

  /**
   * Get all drivers with optional filters
   */
  async getAll(filters?: DriverFilters): Promise<DriverAPI[]> {
    let drivers = await this.repository.findAllWithRelations()

    if (filters?.operatorId) {
      drivers = drivers.filter((d) => d.operatorId === filters.operatorId)
    }
    if (filters?.isActive !== undefined) {
      drivers = drivers.filter((d) => d.isActive === filters.isActive)
    }

    return drivers
  }

  /**
   * Get driver by ID with relations
   */
  async getById(id: string): Promise<DriverAPI> {
    const driver = await this.repository.findByIdWithRelations(id)
    if (!driver) {
      throw new ValidationError(`Driver with ID '${id}' not found`)
    }
    return driver
  }

  /**
   * Create a new driver
   */
  async create(data: CreateDriverDTO): Promise<DriverAPI> {
    // Validate required fields
    if (!data.fullName?.trim()) {
      throw new ValidationError('Driver name is required')
    }
    if (!data.idNumber?.trim()) {
      throw new ValidationError('ID number is required')
    }
    if (!data.licenseNumber?.trim()) {
      throw new ValidationError('License number is required')
    }
    if (!data.licenseClass?.trim()) {
      throw new ValidationError('License class is required')
    }

    // Check for duplicate ID number
    const idExists = await this.repository.idNumberExists(data.idNumber)
    if (idExists) {
      throw new AlreadyExistsError('Driver', 'idNumber', data.idNumber)
    }

    // Check for duplicate license number
    const licenseExists = await this.repository.licenseNumberExists(data.licenseNumber)
    if (licenseExists) {
      throw new AlreadyExistsError('Driver', 'licenseNumber', data.licenseNumber)
    }

    return this.repository.createFromAPI({
      ...data,
      isActive: data.isActive ?? true,
    })
  }

  /**
   * Update a driver
   */
  async update(id: string, data: UpdateDriverDTO): Promise<DriverAPI> {
    // Ensure driver exists
    await this.getById(id)

    // Check for duplicate ID number if updating
    if (data.idNumber) {
      const idExists = await this.repository.idNumberExists(data.idNumber, id)
      if (idExists) {
        throw new AlreadyExistsError('Driver', 'idNumber', data.idNumber)
      }
    }

    // Check for duplicate license number if updating
    if (data.licenseNumber) {
      const licenseExists = await this.repository.licenseNumberExists(data.licenseNumber, id)
      if (licenseExists) {
        throw new AlreadyExistsError('Driver', 'licenseNumber', data.licenseNumber)
      }
    }

    await this.repository.updateById(id, data)
    return this.getById(id)
  }

  /**
   * Delete a driver
   */
  async delete(id: string): Promise<void> {
    await this.repository.deleteById(id)
  }

  /**
   * Toggle driver active status
   */
  async toggleActive(id: string): Promise<DriverAPI> {
    const driver = await this.getById(id)
    await this.repository.updateById(id, { isActive: !driver.isActive })
    return this.getById(id)
  }

  /**
   * Get drivers by operator
   */
  async getByOperator(operatorId: string): Promise<DriverAPI[]> {
    return this.repository.findByOperatorId(operatorId)
  }
}

// Export singleton instance
export const driverService = new DriverService(driverRepository)
