/**
 * Driver Repository - Drizzle ORM Version
 * Handles all PostgreSQL operations for driver records via Supabase
 */
import { drivers, operators } from '../../../db/schema'
import { DrizzleRepository, eq, desc } from '../../../shared/database/drizzle-repository'
import { DriverAPI } from '../../../shared/mappers/entity-mappers'

// Infer types from schema
type Driver = typeof drivers.$inferSelect
type NewDriver = typeof drivers.$inferInsert

/**
 * Driver Repository class - extends DrizzleRepository for common CRUD
 */
class DrizzleDriverRepository extends DrizzleRepository<
  typeof drivers,
  Driver,
  NewDriver
> {
  protected table = drivers
  protected idColumn = drivers.id

  /**
   * Map Drizzle Driver to API format
   */
  private mapToAPI(
    driver: Driver,
    operator?: { id: string; name: string; code: string }
  ): DriverAPI {
    const operators = operator
      ? [
          {
            id: operator.id,
            name: operator.name,
            code: operator.code,
            isPrimary: true,
          },
        ]
      : []

    return {
      id: driver.id,
      operatorId: driver.operatorId ?? undefined,
      operator,
      operatorIds: operators.map((op) => op.id),
      operators,
      fullName: driver.fullName,
      idNumber: driver.idNumber ?? undefined,
      phone: driver.phone ?? undefined,
      province: undefined,
      district: undefined,
      address: driver.address ?? undefined,
      licenseNumber: driver.licenseNumber ?? undefined,
      licenseClass: driver.licenseClass ?? undefined,
      licenseExpiry: driver.licenseExpiryDate ?? undefined,
      dateOfBirth: driver.dateOfBirth ?? undefined,
      imageUrl: undefined,
      isActive: driver.isActive,
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString(),
    } as DriverAPI
  }

  /**
   * Find all drivers with related operator data
   */
  async findAllWithRelations(): Promise<DriverAPI[]> {
    const database = this.getDb()

    const results = await database
      .select({
        // Driver fields
        id: drivers.id,
        operatorId: drivers.operatorId,
        fullName: drivers.fullName,
        phone: drivers.phone,
        idNumber: drivers.idNumber,
        licenseNumber: drivers.licenseNumber,
        licenseClass: drivers.licenseClass,
        licenseExpiryDate: drivers.licenseExpiryDate,
        dateOfBirth: drivers.dateOfBirth,
        address: drivers.address,
        isActive: drivers.isActive,
        operatorName: drivers.operatorName,
        operatorCode: drivers.operatorCode,
        metadata: drivers.metadata,
        createdAt: drivers.createdAt,
        updatedAt: drivers.updatedAt,
        // Operator fields
        operatorFullName: operators.name,
        operatorCodeRel: operators.code,
      })
      .from(drivers)
      .leftJoin(operators, eq(drivers.operatorId, operators.id))
      .orderBy(desc(drivers.createdAt))

    return results.map((row) => {
      const operator = row.operatorFullName
        ? {
            id: row.operatorId!,
            name: row.operatorFullName,
            code: row.operatorCodeRel || '',
          }
        : undefined

      return this.mapToAPI(
        {
          id: row.id,
          firebaseId: null,
          fullName: row.fullName,
          phone: row.phone,
          idNumber: row.idNumber,
          operatorId: row.operatorId,
          licenseNumber: row.licenseNumber,
          licenseClass: row.licenseClass,
          licenseExpiryDate: row.licenseExpiryDate,
          dateOfBirth: row.dateOfBirth,
          address: row.address,
          isActive: row.isActive,
          operatorName: row.operatorName,
          operatorCode: row.operatorCode,
          metadata: row.metadata,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt, province: null, district: null, imageUrl: null,
        },
        operator
      )
    })
  }

  /**
   * Find driver by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<DriverAPI | null> {
    const database = this.getDb()

    const results = await database
      .select({
        // Driver fields
        id: drivers.id,
        operatorId: drivers.operatorId,
        fullName: drivers.fullName,
        phone: drivers.phone,
        idNumber: drivers.idNumber,
        licenseNumber: drivers.licenseNumber,
        licenseClass: drivers.licenseClass,
        licenseExpiryDate: drivers.licenseExpiryDate,
        dateOfBirth: drivers.dateOfBirth,
        address: drivers.address,
        isActive: drivers.isActive,
        operatorName: drivers.operatorName,
        operatorCode: drivers.operatorCode,
        metadata: drivers.metadata,
        createdAt: drivers.createdAt,
        updatedAt: drivers.updatedAt,
        // Operator fields
        operatorFullName: operators.name,
        operatorCodeRel: operators.code,
      })
      .from(drivers)
      .leftJoin(operators, eq(drivers.operatorId, operators.id))
      .where(eq(drivers.id, id))
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

    return this.mapToAPI(
      {
        id: row.id,
        firebaseId: null,
        fullName: row.fullName,
        phone: row.phone,
        idNumber: row.idNumber,
        operatorId: row.operatorId,
        licenseNumber: row.licenseNumber,
        licenseClass: row.licenseClass,
        licenseExpiryDate: row.licenseExpiryDate,
        dateOfBirth: row.dateOfBirth,
        address: row.address,
        isActive: row.isActive,
        operatorName: row.operatorName,
        operatorCode: row.operatorCode,
        metadata: row.metadata,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt, province: null, district: null, imageUrl: null,
      },
      operator
    )
  }

  /**
   * Find drivers by operator ID - uses DB WHERE clause instead of fetch-all
   */
  async findByOperatorId(operatorId: string): Promise<DriverAPI[]> {
    const database = this.getDb()

    const results = await database
      .select({
        id: drivers.id,
        operatorId: drivers.operatorId,
        fullName: drivers.fullName,
        phone: drivers.phone,
        idNumber: drivers.idNumber,
        licenseNumber: drivers.licenseNumber,
        licenseClass: drivers.licenseClass,
        licenseExpiryDate: drivers.licenseExpiryDate,
        dateOfBirth: drivers.dateOfBirth,
        address: drivers.address,
        isActive: drivers.isActive,
        operatorName: drivers.operatorName,
        operatorCode: drivers.operatorCode,
        metadata: drivers.metadata,
        createdAt: drivers.createdAt,
        updatedAt: drivers.updatedAt,
        operatorFullName: operators.name,
        operatorCodeRel: operators.code,
      })
      .from(drivers)
      .leftJoin(operators, eq(drivers.operatorId, operators.id))
      .where(eq(drivers.operatorId, operatorId))
      .orderBy(desc(drivers.createdAt))

    return results.map((row) => {
      const operator = row.operatorFullName
        ? { id: row.operatorId!, name: row.operatorFullName, code: row.operatorCodeRel || '' }
        : undefined

      return this.mapToAPI(
        {
          id: row.id,
          firebaseId: null,
          fullName: row.fullName,
          phone: row.phone,
          idNumber: row.idNumber,
          operatorId: row.operatorId,
          licenseNumber: row.licenseNumber,
          licenseClass: row.licenseClass,
          licenseExpiryDate: row.licenseExpiryDate,
          dateOfBirth: row.dateOfBirth,
          address: row.address,
          isActive: row.isActive,
          operatorName: row.operatorName,
          operatorCode: row.operatorCode,
          metadata: row.metadata,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          province: null,
          district: null,
          imageUrl: null,
        },
        operator
      )
    })
  }

  /**
   * Find drivers by active status - uses DB WHERE clause instead of fetch-all
   */
  async findByActiveStatus(isActive: boolean): Promise<DriverAPI[]> {
    const database = this.getDb()

    const results = await database
      .select({
        id: drivers.id,
        operatorId: drivers.operatorId,
        fullName: drivers.fullName,
        phone: drivers.phone,
        idNumber: drivers.idNumber,
        licenseNumber: drivers.licenseNumber,
        licenseClass: drivers.licenseClass,
        licenseExpiryDate: drivers.licenseExpiryDate,
        dateOfBirth: drivers.dateOfBirth,
        address: drivers.address,
        isActive: drivers.isActive,
        operatorName: drivers.operatorName,
        operatorCode: drivers.operatorCode,
        metadata: drivers.metadata,
        createdAt: drivers.createdAt,
        updatedAt: drivers.updatedAt,
        operatorFullName: operators.name,
        operatorCodeRel: operators.code,
      })
      .from(drivers)
      .leftJoin(operators, eq(drivers.operatorId, operators.id))
      .where(eq(drivers.isActive, isActive))
      .orderBy(desc(drivers.createdAt))

    return results.map((row) => {
      const operator = row.operatorFullName
        ? { id: row.operatorId!, name: row.operatorFullName, code: row.operatorCodeRel || '' }
        : undefined

      return this.mapToAPI(
        {
          id: row.id,
          firebaseId: null,
          fullName: row.fullName,
          phone: row.phone,
          idNumber: row.idNumber,
          operatorId: row.operatorId,
          licenseNumber: row.licenseNumber,
          licenseClass: row.licenseClass,
          licenseExpiryDate: row.licenseExpiryDate,
          dateOfBirth: row.dateOfBirth,
          address: row.address,
          isActive: row.isActive,
          operatorName: row.operatorName,
          operatorCode: row.operatorCode,
          metadata: row.metadata,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          province: null,
          district: null,
          imageUrl: null,
        },
        operator
      )
    })
  }

  /**
   * Create driver with API data format
   */
  async createFromAPI(data: {
    operatorId?: string
    fullName: string
    idNumber?: string
    phone?: string
    province?: string
    district?: string
    address?: string
    licenseNumber?: string
    licenseClass?: string
    licenseExpiryDate?: string
    dateOfBirth?: string
    imageUrl?: string
    isActive?: boolean
  }): Promise<DriverAPI> {
    const database = this.getDb()

    const [driver] = await database
      .insert(drivers)
      .values({
        operatorId: data.operatorId || null,
        fullName: data.fullName,
        idNumber: data.idNumber || null,
        phone: data.phone || null,
        address: data.address || null,
        licenseNumber: data.licenseNumber || null,
        licenseClass: data.licenseClass || null,
        licenseExpiryDate: data.licenseExpiryDate || null,
        dateOfBirth: data.dateOfBirth || null,
        isActive: data.isActive ?? true,
      })
      .returning()

    const result = await this.findByIdWithRelations(driver.id)
    if (!result) {
      throw new Error('Failed to fetch created driver')
    }

    return result
  }

  /**
   * Update driver by ID with API data format
   */
  async updateById(
    id: string,
    data: {
      operatorId?: string
      fullName?: string
      idNumber?: string
      phone?: string
      province?: string
      district?: string
      address?: string
      licenseNumber?: string
      licenseClass?: string
      licenseExpiryDate?: string
      dateOfBirth?: string
      imageUrl?: string
      isActive?: boolean
    }
  ): Promise<void> {
    const database = this.getDb()

    const updateData: Partial<NewDriver> = {}

    if (data.operatorId !== undefined) updateData.operatorId = data.operatorId || null
    if (data.fullName !== undefined) updateData.fullName = data.fullName
    if (data.idNumber !== undefined) updateData.idNumber = data.idNumber || null
    if (data.phone !== undefined) updateData.phone = data.phone || null
    if (data.address !== undefined) updateData.address = data.address || null
    if (data.licenseNumber !== undefined) updateData.licenseNumber = data.licenseNumber || null
    if (data.licenseClass !== undefined) updateData.licenseClass = data.licenseClass || null
    if (data.licenseExpiryDate !== undefined)
      updateData.licenseExpiryDate = data.licenseExpiryDate || null
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth || null
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    await database
      .update(drivers)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, id))
  }

  /**
   * Delete driver by ID (hard delete for drivers)
   */
  async deleteById(id: string): Promise<void> {
    const database = this.getDb()

    await database.delete(drivers).where(eq(drivers.id, id))
  }

  /**
   * Check if ID number exists - uses DB query instead of fetch-all
   */
  async idNumberExists(idNumber: string, excludeId?: string): Promise<boolean> {
    const database = this.getDb()

    const results = await database
      .select({ id: drivers.id })
      .from(drivers)
      .where(eq(drivers.idNumber, idNumber))
      .limit(excludeId ? 2 : 1)

    if (!excludeId) return results.length > 0
    return results.some((d) => d.id !== excludeId)
  }

  /**
   * Check if license number exists - uses DB query instead of fetch-all
   */
  async licenseNumberExists(licenseNumber: string, excludeId?: string): Promise<boolean> {
    const database = this.getDb()

    const results = await database
      .select({ id: drivers.id })
      .from(drivers)
      .where(eq(drivers.licenseNumber, licenseNumber))
      .limit(excludeId ? 2 : 1)

    if (!excludeId) return results.length > 0
    return results.some((d) => d.id !== excludeId)
  }
}

// Export singleton instance
export const driverRepository = new DrizzleDriverRepository()

// Re-export types
export type { Driver, NewDriver }
export { DrizzleDriverRepository as DriverRepository }
