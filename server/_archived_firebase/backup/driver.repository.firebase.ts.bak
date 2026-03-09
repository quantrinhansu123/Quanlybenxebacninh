/**
 * Driver Repository
 * Data access layer for Driver entity
 */

import { firebaseREST } from '../../../lib/firebase-rest.js'
import { BaseRepository } from '../../../shared/database/base-repository.js'
import {
  DriverDB,
  DriverAPI,
  OperatorDB,
  mapDriver,
  mapDriverToDB,
} from '../../../shared/mappers/entity-mappers.js'
import { DatabaseError } from '../../../shared/errors/app-error.js'

export class DriverRepository extends BaseRepository<DriverDB, DriverAPI> {
  constructor() {
    super('drivers')
  }

  protected mapToAPI(db: DriverDB): DriverAPI {
    return mapDriver(db)
  }

  protected mapToDB(api: Partial<DriverAPI>): Partial<DriverDB> {
    return mapDriverToDB(api)
  }

  /**
   * Find all drivers with operator relations
   */
  async findAllWithRelations(): Promise<DriverAPI[]> {
    try {
      const [driversData, operatorsData] = await Promise.all([
        firebaseREST.get(this.collectionPath),
        firebaseREST.get('operators'),
      ])

      if (!driversData) return []

      const operators = operatorsData || {}

      return Object.keys(driversData).map((key) => {
        const driver: DriverDB = { id: key, ...driversData[key] }
        const operator = driver.operator_id
          ? (operators[driver.operator_id] as OperatorDB)
          : null

        return mapDriver(driver, operator)
      })
    } catch (error) {
      console.error('[drivers] findAllWithRelations error:', error)
      throw new DatabaseError('Failed to fetch drivers with relations')
    }
  }

  /**
   * Find driver by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<DriverAPI | null> {
    try {
      const [driverData, operatorsData] = await Promise.all([
        firebaseREST.get(`${this.collectionPath}/${id}`),
        firebaseREST.get('operators'),
      ])

      if (!driverData) return null

      const driver: DriverDB = { id, ...driverData }
      const operator = driver.operator_id
        ? ((operatorsData || {})[driver.operator_id] as OperatorDB)
        : null

      return mapDriver(driver, operator)
    } catch (error) {
      console.error('[drivers] findByIdWithRelations error:', error)
      throw new DatabaseError(`Failed to fetch driver ${id}`)
    }
  }

  /**
   * Find drivers by operator ID
   */
  async findByOperatorId(operatorId: string): Promise<DriverAPI[]> {
    const all = await this.findAllWithRelations()
    return all.filter((d) => d.operatorId === operatorId)
  }

  /**
   * Find drivers by active status
   */
  async findByActiveStatus(isActive: boolean): Promise<DriverAPI[]> {
    const all = await this.findAllWithRelations()
    return all.filter((d) => d.isActive === isActive)
  }

  /**
   * Find driver by ID number
   */
  async findByIdNumber(idNumber: string): Promise<DriverAPI | null> {
    const all = await this.findAll()
    return all.find((d) => d.idNumber === idNumber) || null
  }

  /**
   * Find driver by license number
   */
  async findByLicenseNumber(licenseNumber: string): Promise<DriverAPI | null> {
    const all = await this.findAll()
    return all.find((d) => d.licenseNumber === licenseNumber) || null
  }

  /**
   * Check if ID number exists
   */
  async idNumberExists(idNumber: string, excludeId?: string): Promise<boolean> {
    const all = await this.findAll()
    return all.some((d) => d.idNumber === idNumber && d.id !== excludeId)
  }

  /**
   * Check if license number exists
   */
  async licenseNumberExists(licenseNumber: string, excludeId?: string): Promise<boolean> {
    const all = await this.findAll()
    return all.some((d) => d.licenseNumber === licenseNumber && d.id !== excludeId)
  }
}

// Export singleton instance
export const driverRepository = new DriverRepository()
