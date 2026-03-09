/**
 * Vehicle Repository - Drizzle ORM Version
 * Handles all PostgreSQL operations for vehicle records via Supabase
 */
import { vehicles, operators, vehicleTypes } from '../../../db/schema'
import { DrizzleRepository, eq, and, desc, sql } from '../../../shared/database/drizzle-repository'
import { VehicleAPI, mapVehicle } from '../../../shared/mappers/entity-mappers'

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
      .select({
        // Vehicle fields
        id: vehicles.id,
        plateNumber: vehicles.plateNumber,
        operatorId: vehicles.operatorId,
        vehicleTypeId: vehicles.vehicleTypeId,
        seatCount: vehicles.seatCount,
        bedCapacity: vehicles.bedCapacity,
        brand: vehicles.brand,
        model: vehicles.model,
        yearOfManufacture: vehicles.yearOfManufacture,
        color: vehicles.color,
        chassisNumber: vehicles.chassisNumber,
        engineNumber: vehicles.engineNumber,
        imageUrl: vehicles.imageUrl,
        roadWorthinessExpiry: vehicles.roadWorthinessExpiry,
        insuranceExpiry: vehicles.insuranceExpiry,
        cargoLength: vehicles.cargoLength,
        cargoWidth: vehicles.cargoWidth,
        cargoHeight: vehicles.cargoHeight,
        gpsProvider: vehicles.gpsProvider,
        gpsUsername: vehicles.gpsUsername,
        gpsPassword: vehicles.gpsPassword,
        province: vehicles.province,
        notes: vehicles.notes,
        isActive: vehicles.isActive,
        operationalStatus: vehicles.operationalStatus,
        operatorName: vehicles.operatorName,
        operatorCode: vehicles.operatorCode,
        metadata: vehicles.metadata,
        createdAt: vehicles.createdAt,
        updatedAt: vehicles.updatedAt,
        // Operator fields
        operatorFullName: operators.name,
        operatorCodeRel: operators.code,
        operatorProvince: operators.province,
        // VehicleType fields
        vehicleTypeName: vehicleTypes.name,
      })
      .from(vehicles)
      .leftJoin(operators, eq(vehicles.operatorId, operators.id))
      .leftJoin(vehicleTypes, eq(vehicles.vehicleTypeId, vehicleTypes.id))
      .orderBy(desc(vehicles.createdAt))

    return results.map((row) => {
      const operator = row.operatorFullName
        ? {
            id: row.operatorId!,
            name: row.operatorFullName,
            code: row.operatorCodeRel || '',
          }
        : undefined

      const vehicleType = row.vehicleTypeName
        ? {
            id: row.vehicleTypeId!,
            name: row.vehicleTypeName,
          }
        : undefined

      return mapVehicle(
        {
          id: row.id,
          plate_number: row.plateNumber,
          operator_id: row.operatorId ?? undefined,
          vehicle_type_id: row.vehicleTypeId ?? undefined,
          seat_capacity: row.seatCount || 0,
          bed_capacity: row.bedCapacity || 0,
          chassis_number: row.chassisNumber ?? undefined,
          engine_number: row.engineNumber ?? undefined,
          image_url: row.imageUrl ?? undefined,
          insurance_expiry_date: row.insuranceExpiry ?? undefined,
          inspection_expiry_date: row.roadWorthinessExpiry ?? undefined,
          cargo_length: row.cargoLength ?? undefined,
          cargo_width: row.cargoWidth ?? undefined,
          cargo_height: row.cargoHeight ?? undefined,
          gps_provider: row.gpsProvider ?? undefined,
          gps_username: row.gpsUsername ?? undefined,
          gps_password: row.gpsPassword ?? undefined,
          province: row.province || row.operatorProvince || undefined,
          is_active: row.isActive,
          operator_name: row.operatorName ?? undefined,
          notes: row.notes ?? undefined,
          created_at: row.createdAt.toISOString(),
          updated_at: row.updatedAt.toISOString(),
        } as any,
        vehicleType
          ? {
              id: vehicleType.id,
              name: vehicleType.name,
            }
          : null,
        operator
          ? {
              id: operator.id,
              name: operator.name,
              code: operator.code,
              is_active: true,
            }
          : null
      )
    })
  }

  /**
   * Find vehicle by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<VehicleAPI | null> {
    const database = this.getDb()

    const results = await database
      .select({
        // Vehicle fields
        id: vehicles.id,
        plateNumber: vehicles.plateNumber,
        operatorId: vehicles.operatorId,
        vehicleTypeId: vehicles.vehicleTypeId,
        seatCount: vehicles.seatCount,
        bedCapacity: vehicles.bedCapacity,
        brand: vehicles.brand,
        model: vehicles.model,
        yearOfManufacture: vehicles.yearOfManufacture,
        color: vehicles.color,
        chassisNumber: vehicles.chassisNumber,
        engineNumber: vehicles.engineNumber,
        imageUrl: vehicles.imageUrl,
        roadWorthinessExpiry: vehicles.roadWorthinessExpiry,
        insuranceExpiry: vehicles.insuranceExpiry,
        cargoLength: vehicles.cargoLength,
        cargoWidth: vehicles.cargoWidth,
        cargoHeight: vehicles.cargoHeight,
        gpsProvider: vehicles.gpsProvider,
        gpsUsername: vehicles.gpsUsername,
        gpsPassword: vehicles.gpsPassword,
        province: vehicles.province,
        notes: vehicles.notes,
        isActive: vehicles.isActive,
        operationalStatus: vehicles.operationalStatus,
        operatorName: vehicles.operatorName,
        operatorCode: vehicles.operatorCode,
        metadata: vehicles.metadata,
        createdAt: vehicles.createdAt,
        updatedAt: vehicles.updatedAt,
        // Operator fields
        operatorFullName: operators.name,
        operatorCodeRel: operators.code,
        operatorProvince: operators.province,
        // VehicleType fields
        vehicleTypeName: vehicleTypes.name,
      })
      .from(vehicles)
      .leftJoin(operators, eq(vehicles.operatorId, operators.id))
      .leftJoin(vehicleTypes, eq(vehicles.vehicleTypeId, vehicleTypes.id))
      .where(eq(vehicles.id, id))
      .limit(1)

    if (results.length === 0) return null

    const row = results[0]
    const operator = row.operatorFullName
      ? {
          id: row.operatorId!,
          name: row.operatorFullName,
          code: row.operatorCodeRel || '',
        }
      : undefined

    const vehicleType = row.vehicleTypeName
      ? {
          id: row.vehicleTypeId!,
          name: row.vehicleTypeName,
        }
      : undefined

    return mapVehicle(
      {
        id: row.id,
        plate_number: row.plateNumber,
        operator_id: row.operatorId ?? undefined,
        vehicle_type_id: row.vehicleTypeId ?? undefined,
        seat_capacity: row.seatCount || 0,
        bed_capacity: row.bedCapacity || 0,
        chassis_number: row.chassisNumber ?? undefined,
        engine_number: row.engineNumber ?? undefined,
        image_url: row.imageUrl ?? undefined,
        insurance_expiry_date: row.insuranceExpiry ?? undefined,
        inspection_expiry_date: row.roadWorthinessExpiry ?? undefined,
        cargo_length: row.cargoLength ?? undefined,
        cargo_width: row.cargoWidth ?? undefined,
        cargo_height: row.cargoHeight ?? undefined,
        gps_provider: row.gpsProvider ?? undefined,
        gps_username: row.gpsUsername ?? undefined,
        gps_password: row.gpsPassword ?? undefined,
        province: row.province ?? undefined,
        is_active: row.isActive,
        operator_name: row.operatorName ?? undefined,
        notes: row.notes ?? undefined,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      } as any,
      vehicleType
        ? {
            id: vehicleType.id,
            name: vehicleType.name,
          }
        : null,
      operator
        ? {
            id: operator.id,
            name: operator.name,
            code: operator.code,
            is_active: true,
          }
        : null
    )
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
        vehicleTypeId: data.vehicleTypeId || null,
        operatorId: data.operatorId || null,
        seatCount: data.seatCapacity,
        chassisNumber: data.chassisNumber || null,
        engineNumber: data.engineNumber || null,
        insuranceExpiry: data.insuranceExpiryDate || null,
        roadWorthinessExpiry: data.inspectionExpiryDate || null,
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
    if (data.vehicleTypeId !== undefined) updateData.vehicleTypeId = data.vehicleTypeId || null
    if (data.operatorId !== undefined) updateData.operatorId = data.operatorId || null
    if (data.seatCapacity !== undefined) updateData.seatCount = data.seatCapacity
    if (data.chassisNumber !== undefined) updateData.chassisNumber = data.chassisNumber || null
    if (data.engineNumber !== undefined) updateData.engineNumber = data.engineNumber || null
    if (data.insuranceExpiryDate !== undefined)
      updateData.insuranceExpiry = data.insuranceExpiryDate || null
    if (data.inspectionExpiryDate !== undefined)
      updateData.roadWorthinessExpiry = data.inspectionExpiryDate || null
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
