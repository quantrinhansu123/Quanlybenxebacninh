/**
 * Vehicle Repository - Drizzle ORM Version
 * Handles all PostgreSQL operations for vehicle records via Supabase
 */
import { vehicles } from '../../../db/schema/index.js'
import { DrizzleRepository, eq, and, desc, sql } from '../../../shared/database/drizzle-repository.js'
import { VehicleAPI, mapVehicle } from '../../../shared/mappers/entity-mappers.js'
import { resolveOperatorForVehicle } from '../../../utils/vehicle-operator-resolve.js'

const vehicleBaseSelect = {
  id: vehicles.id,
  firebaseId: vehicles.firebaseId,
  plateNumber: vehicles.plateNumber,
  seatCount: vehicles.seatCount,
  bedCapacity: vehicles.bedCapacity,
  brand: vehicles.brand,
  model: vehicles.model,
  yearOfManufacture: vehicles.yearOfManufacture,
  color: vehicles.color,
  chassisNumber: vehicles.chassisNumber,
  engineNumber: vehicles.engineNumber,
  imageUrl: vehicles.imageUrl,
  cargoLength: vehicles.cargoLength,
  cargoWidth: vehicles.cargoWidth,
  cargoHeight: vehicles.cargoHeight,
  gpsProvider: vehicles.gpsProvider,
  gpsUsername: vehicles.gpsUsername,
  gpsPassword: vehicles.gpsPassword,
  gpsUrl: vehicles.gpsUrl,
  province: vehicles.province,
  notes: vehicles.notes,
  isActive: vehicles.isActive,
  syncedAt: vehicles.syncedAt,
  createdAt: vehicles.createdAt,
  updatedAt: vehicles.updatedAt,
} as const

function mapVehicleRow(
  row: {
    id: string
    plateNumber: string
    seatCount: number | null
    bedCapacity: number | null
    chassisNumber: string | null
    engineNumber: string | null
    imageUrl: string | null
    cargoLength: number | null
    cargoWidth: number | null
    cargoHeight: number | null
    gpsProvider: string | null
    gpsUsername: string | null
    gpsPassword: string | null
    province: string | null
    isActive: boolean
    notes: string | null
    createdAt: Date
    updatedAt: Date
  },
  operator?: { id: string; name: string; code: string } | null,
): VehicleAPI {
  return mapVehicle(
    {
      id: row.id,
      plate_number: row.plateNumber,
      seat_capacity: row.seatCount || 0,
      bed_capacity: row.bedCapacity || 0,
      chassis_number: row.chassisNumber ?? undefined,
      engine_number: row.engineNumber ?? undefined,
      image_url: row.imageUrl ?? undefined,
      cargo_length: row.cargoLength ?? undefined,
      cargo_width: row.cargoWidth ?? undefined,
      cargo_height: row.cargoHeight ?? undefined,
      gps_provider: row.gpsProvider ?? undefined,
      gps_username: row.gpsUsername ?? undefined,
      gps_password: row.gpsPassword ?? undefined,
      province: row.province ?? undefined,
      is_active: row.isActive,
      operator_name: operator?.name,
      notes: row.notes ?? undefined,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    } as Parameters<typeof mapVehicle>[0],
    null,
    operator
      ? { id: operator.id, name: operator.name, code: operator.code, is_active: true }
      : null,
  )
}

// Infer types from schema
type Vehicle = typeof vehicles.$inferSelect
type NewVehicle = typeof vehicles.$inferInsert

/**
 * Normalize plate number: remove dots, dashes, spaces, convert to uppercase
 * Examples: "98H-036.55" -> "98H03655", "51B 123.45" -> "51B12345"
 */
const normalizePlateNumber = (plate: string): string => {
  return (plate || '').replace(/[.\-\s]/g, '').toUpperCase()
}

/**
 * Vehicle Repository class - extends DrizzleRepository for common CRUD
 */
class DrizzleVehicleRepository extends DrizzleRepository<
  typeof vehicles,
  Vehicle,
  NewVehicle
> {
  protected table = vehicles
  protected idColumn = vehicles.id

  /**
   * Find all vehicles with related data (vehicleType, operator)
   */
  async findAllWithRelations(): Promise<VehicleAPI[]> {
    const database = this.getDb()

    const results = await database
      .select(vehicleBaseSelect)
      .from(vehicles)
      .orderBy(desc(vehicles.createdAt))

    return results.map((row) => mapVehicleRow(row))
  }

  /**
   * Find vehicle by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<VehicleAPI | null> {
    const database = this.getDb()

    const results = await database
      .select(vehicleBaseSelect)
      .from(vehicles)
      .where(eq(vehicles.id, id))
      .limit(1)

    if (results.length === 0) return null

    const row = results[0]
    const op = await resolveOperatorForVehicle({
      firebaseId: row.firebaseId,
      plateNumber: row.plateNumber,
    })
    const operator = op.operatorId
      ? { id: op.operatorId, name: op.operatorName || '', code: op.operatorCode || '' }
      : null

    return mapVehicleRow(row, operator)
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
   * Find vehicle by plate number (using normalized comparison)
   */
  async findByPlateNumber(plateNumber: string): Promise<VehicleAPI | null> {
    const database = this.getDb()
    const normalizedInput = normalizePlateNumber(plateNumber)

    // Use SQL to normalize DB values for comparison
    const normalizedPlateExpr = sql<string>`UPPER(REPLACE(REPLACE(REPLACE(${vehicles.plateNumber}, '.', ''), '-', ''), ' ', ''))`

    const [result] = await database
      .select()
      .from(vehicles)
      .where(sql`${normalizedPlateExpr} = ${normalizedInput}`)
      .limit(1)

    if (!result) return null

    return this.findByIdWithRelations(result.id)
  }

  /**
   * Check if plate number exists (using normalized comparison)
   * Prevents duplicates like "98H03655" and "98H-036.55"
   */
  async plateNumberExists(plateNumber: string, excludeId?: string): Promise<boolean> {
    const database = this.getDb()
    const normalizedInput = normalizePlateNumber(plateNumber)

    // Use SQL to normalize DB values for comparison
    const normalizedPlateExpr = sql<string>`UPPER(REPLACE(REPLACE(REPLACE(${vehicles.plateNumber}, '.', ''), '-', ''), ' ', ''))`

    const baseCondition = sql`${normalizedPlateExpr} = ${normalizedInput}`

    let query
    if (excludeId) {
      query = database
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(and(baseCondition, sql`${vehicles.id} != ${excludeId}`))
        .limit(1)
    } else {
      query = database
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(baseCondition)
        .limit(1)
    }

    const [result] = await query
    return result !== undefined
  }

  /**
   * Create vehicle with API data format
   */
  async createFromAPI(data: {
    plateNumber: string
    vehicleTypeId?: string
    operatorId?: string
    seatCapacity: number
    bedCapacity?: number
    chassisNumber?: string
    engineNumber?: string
    imageUrl?: string
    insuranceExpiryDate?: string
    inspectionExpiryDate?: string
    cargoLength?: number
    cargoWidth?: number
    cargoHeight?: number
    gpsProvider?: string
    gpsUsername?: string
    gpsPassword?: string
    province?: string
    notes?: string
    isActive?: boolean
  }): Promise<VehicleAPI> {
    const database = this.getDb()

    // Normalize plate number before saving (remove dots, dashes, spaces)
    const normalizedPlate = normalizePlateNumber(data.plateNumber)

    const [vehicle] = await database
      .insert(vehicles)
      .values({
        plateNumber: normalizedPlate,
        seatCount: data.seatCapacity,
        bedCapacity: data.bedCapacity ?? null,
        chassisNumber: data.chassisNumber || null,
        engineNumber: data.engineNumber || null,
        imageUrl: data.imageUrl || null,
        cargoLength: data.cargoLength ?? null,
        cargoWidth: data.cargoWidth ?? null,
        cargoHeight: data.cargoHeight ?? null,
        gpsProvider: data.gpsProvider || null,
        gpsUsername: data.gpsUsername || null,
        gpsPassword: data.gpsPassword || null,
        province: data.province || null,
        notes: data.notes || null,
        isActive: data.isActive ?? true,
      })
      .returning()

    const result = await this.findByIdWithRelations(vehicle.id)
    if (!result) {
      throw new Error('Failed to fetch created vehicle')
    }

    return result
  }

  /**
   * Update vehicle by ID with API data format
   */
  async updateById(
    id: string,
    data: {
      plateNumber?: string
      vehicleTypeId?: string
      operatorId?: string
      seatCapacity?: number
      bedCapacity?: number
      chassisNumber?: string
      engineNumber?: string
      imageUrl?: string
      insuranceExpiryDate?: string
      inspectionExpiryDate?: string
      cargoLength?: number
      cargoWidth?: number
      cargoHeight?: number
      gpsProvider?: string
      gpsUsername?: string
      gpsPassword?: string
      province?: string
      notes?: string
      isActive?: boolean
    }
  ): Promise<void> {
    const database = this.getDb()

    const updateData: Partial<NewVehicle> = {}

    // Normalize plate number when updating
    if (data.plateNumber !== undefined) updateData.plateNumber = normalizePlateNumber(data.plateNumber)
    if (data.seatCapacity !== undefined) updateData.seatCount = data.seatCapacity
    if (data.bedCapacity !== undefined) updateData.bedCapacity = data.bedCapacity
    if (data.chassisNumber !== undefined) updateData.chassisNumber = data.chassisNumber || null
    if (data.engineNumber !== undefined) updateData.engineNumber = data.engineNumber || null
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null
    if (data.cargoLength !== undefined) updateData.cargoLength = data.cargoLength ?? null
    if (data.cargoWidth !== undefined) updateData.cargoWidth = data.cargoWidth ?? null
    if (data.cargoHeight !== undefined) updateData.cargoHeight = data.cargoHeight ?? null
    if (data.gpsProvider !== undefined) updateData.gpsProvider = data.gpsProvider || null
    if (data.gpsUsername !== undefined) updateData.gpsUsername = data.gpsUsername || null
    if (data.gpsPassword !== undefined) updateData.gpsPassword = data.gpsPassword || null
    if (data.province !== undefined) updateData.province = data.province || null
    if (data.notes !== undefined) updateData.notes = data.notes || null
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    await database
      .update(vehicles)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, id))
  }

  /**
   * Delete vehicle by ID (soft delete - set isActive to false)
   */
  async deleteById(id: string): Promise<void> {
    const database = this.getDb()

    await database.update(vehicles).set({ isActive: false }).where(eq(vehicles.id, id))
  }
}

// Export singleton instance
export const vehicleRepository = new DrizzleVehicleRepository()

// Re-export types
export type { Vehicle, NewVehicle, VehicleAPI }
export { DrizzleVehicleRepository as VehicleRepository }
