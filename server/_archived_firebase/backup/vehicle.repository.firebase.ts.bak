/**
 * Vehicle Repository
 * Data access layer for Vehicle entity
 */

import { firebaseREST } from '../../../lib/firebase-rest.js'
import { BaseRepository } from '../../../shared/database/base-repository.js'
import {
  VehicleDB,
  VehicleAPI,
  VehicleTypeDB,
  OperatorDB,
  mapVehicle,
  mapVehicleToDB,
} from '../../../shared/mappers/entity-mappers.js'
import { DatabaseError } from '../../../shared/errors/app-error.js'

export class VehicleRepository extends BaseRepository<VehicleDB, VehicleAPI> {
  constructor() {
    super('vehicles')
  }

  protected mapToAPI(db: VehicleDB): VehicleAPI {
    return mapVehicle(db)
  }

  protected mapToDB(api: Partial<VehicleAPI>): Partial<VehicleDB> {
    return mapVehicleToDB(api)
  }

  /**
   * Find all vehicles with related data (vehicleType, operator)
   */
  async findAllWithRelations(): Promise<VehicleAPI[]> {
    try {
      const [vehiclesData, vehicleTypesData, operatorsData] = await Promise.all([
        firebaseREST.get(this.collectionPath),
        firebaseREST.get('vehicle_types'),
        firebaseREST.get('operators'),
      ])

      if (!vehiclesData) return []

      const vehicleTypes = vehicleTypesData || {}
      const operators = operatorsData || {}

      return Object.keys(vehiclesData).map((key) => {
        const vehicle: VehicleDB = { id: key, ...vehiclesData[key] }
        const vehicleType = vehicle.vehicle_type_id
          ? (vehicleTypes[vehicle.vehicle_type_id] as VehicleTypeDB)
          : null
        const operator = vehicle.operator_id
          ? (operators[vehicle.operator_id] as OperatorDB)
          : null

        return mapVehicle(vehicle, vehicleType, operator)
      })
    } catch (error) {
      console.error('[vehicles] findAllWithRelations error:', error)
      throw new DatabaseError('Failed to fetch vehicles with relations')
    }
  }

  /**
   * Find vehicle by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<VehicleAPI | null> {
    try {
      const [vehicleData, vehicleTypesData, operatorsData] = await Promise.all([
        firebaseREST.get(`${this.collectionPath}/${id}`),
        firebaseREST.get('vehicle_types'),
        firebaseREST.get('operators'),
      ])

      if (!vehicleData) return null

      const vehicle: VehicleDB = { id, ...vehicleData }
      const vehicleType = vehicle.vehicle_type_id
        ? ((vehicleTypesData || {})[vehicle.vehicle_type_id] as VehicleTypeDB)
        : null
      const operator = vehicle.operator_id
        ? ((operatorsData || {})[vehicle.operator_id] as OperatorDB)
        : null

      return mapVehicle(vehicle, vehicleType, operator)
    } catch (error) {
      console.error('[vehicles] findByIdWithRelations error:', error)
      throw new DatabaseError(`Failed to fetch vehicle ${id}`)
    }
  }

  /**
   * Find vehicles by operator ID
   */
  async findByOperatorId(operatorId: string): Promise<VehicleAPI[]> {
    const all = await this.findAllWithRelations()
    return all.filter((v) => v.operatorId === operatorId)
  }

  /**
   * Find vehicles by active status
   */
  async findByActiveStatus(isActive: boolean): Promise<VehicleAPI[]> {
    const all = await this.findAllWithRelations()
    return all.filter((v) => v.isActive === isActive)
  }

  /**
   * Find vehicle by plate number
   */
  async findByPlateNumber(plateNumber: string): Promise<VehicleAPI | null> {
    const all = await this.findAll()
    return all.find((v) => v.plateNumber === plateNumber) || null
  }

  /**
   * Check if plate number exists
   */
  async plateNumberExists(plateNumber: string, excludeId?: string): Promise<boolean> {
    const all = await this.findAll()
    return all.some((v) => v.plateNumber === plateNumber && v.id !== excludeId)
  }
}

// Export singleton instance
export const vehicleRepository = new VehicleRepository()
