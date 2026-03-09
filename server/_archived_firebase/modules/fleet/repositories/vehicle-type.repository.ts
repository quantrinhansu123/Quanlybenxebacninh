/**
 * Vehicle Type Repository
 * Data access layer for VehicleType entity
 */

import { BaseRepository } from '../../../shared/database/base-repository.js'
import {
  VehicleTypeDB,
  VehicleTypeAPI,
  mapVehicleType,
} from '../../../shared/mappers/entity-mappers.js'

export class VehicleTypeRepository extends BaseRepository<VehicleTypeDB, VehicleTypeAPI> {
  constructor() {
    super('vehicle_types')
  }

  protected mapToAPI(db: VehicleTypeDB): VehicleTypeAPI {
    return mapVehicleType(db)
  }

  protected mapToDB(api: Partial<VehicleTypeAPI>): Partial<VehicleTypeDB> {
    const result: Partial<VehicleTypeDB> = {}
    if (api.name !== undefined) result.name = api.name
    if (api.description !== undefined) result.description = api.description
    return result
  }

  /**
   * Find by name
   */
  async findByName(name: string): Promise<VehicleTypeAPI | null> {
    return this.findOneByField('name', name)
  }

  /**
   * Check if name exists
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    const all = await this.findAll()
    return all.some((vt) => vt.name === name && vt.id !== excludeId)
  }
}

// Export singleton instance
export const vehicleTypeRepository = new VehicleTypeRepository()
