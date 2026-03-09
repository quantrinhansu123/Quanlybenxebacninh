/**
 * Base Repository for Firebase Realtime Database
 * Provides common CRUD operations for all entities
 */

import { firebaseREST } from '../../lib/firebase-rest.js'
import { DatabaseError, NotFoundError } from '../errors/app-error.js'

export interface QueryOptions {
  orderBy?: string
  limitToFirst?: number
  limitToLast?: number
  startAt?: string | number
  endAt?: string | number
  equalTo?: string | number | boolean
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
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

/**
 * Base repository class with common CRUD operations
 */
export abstract class BaseRepository<TDB, TAPI> {
  protected readonly collectionPath: string

  constructor(collectionPath: string) {
    this.collectionPath = collectionPath
  }

  /**
   * Map database entity to API format
   * Must be implemented by child classes
   */
  protected abstract mapToAPI(db: TDB, ...args: unknown[]): TAPI

  /**
   * Map API entity to database format
   * Must be implemented by child classes
   */
  protected abstract mapToDB(api: Partial<TAPI>): Partial<TDB>

  /**
   * Generate a unique ID
   */
  protected generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Get current timestamp
   */
  protected getTimestamp(): string {
    return new Date().toISOString()
  }

  /**
   * Get all records from the collection
   */
  async findAll(): Promise<TAPI[]> {
    try {
      const data = await firebaseREST.get(this.collectionPath)
      if (!data) return []

      return Object.keys(data).map((key) => {
        const record = { id: key, ...data[key] } as TDB
        return this.mapToAPI(record)
      })
    } catch (error) {
      console.error(`[${this.collectionPath}] findAll error:`, error)
      throw new DatabaseError(`Failed to fetch ${this.collectionPath}`)
    }
  }

  /**
   * Get all records with filtering
   */
  async findAllFiltered(filterFn: (item: TAPI) => boolean): Promise<TAPI[]> {
    const all = await this.findAll()
    return all.filter(filterFn)
  }

  /**
   * Get paginated records
   */
  async findPaginated(
    options: PaginationOptions = {},
    filterFn?: (item: TAPI) => boolean
  ): Promise<PaginatedResult<TAPI>> {
    const { page = 1, limit = 50 } = options

    let allItems = await this.findAll()
    if (filterFn) {
      allItems = allItems.filter(filterFn)
    }

    const total = allItems.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const data = allItems.slice(startIndex, startIndex + limit)

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<TAPI | null> {
    try {
      const data = await firebaseREST.get(`${this.collectionPath}/${id}`)
      if (!data) return null

      const record = { id, ...data } as TDB
      return this.mapToAPI(record)
    } catch (error) {
      console.error(`[${this.collectionPath}] findById error:`, error)
      throw new DatabaseError(`Failed to fetch ${this.collectionPath}/${id}`)
    }
  }

  /**
   * Find a single record by ID or throw NotFoundError
   */
  async findByIdOrFail(id: string): Promise<TAPI> {
    const record = await this.findById(id)
    if (!record) {
      throw new NotFoundError(this.collectionPath, id)
    }
    return record
  }

  /**
   * Find records by a specific field value
   */
  async findByField(field: string, value: string | number | boolean): Promise<TAPI[]> {
    const all = await this.findAll()
    return all.filter((item) => {
      const record = item as Record<string, unknown>
      return record[field] === value
    })
  }

  /**
   * Find single record by field
   */
  async findOneByField(field: string, value: string | number | boolean): Promise<TAPI | null> {
    const results = await this.findByField(field, value)
    return results[0] || null
  }

  /**
   * Create a new record
   */
  async create(data: Partial<TAPI>): Promise<TAPI> {
    try {
      const id = this.generateId()
      const dbData = this.mapToDB(data)
      const timestamp = this.getTimestamp()

      const record = {
        ...dbData,
        id,
        created_at: timestamp,
        updated_at: timestamp,
      }

      await firebaseREST.set(`${this.collectionPath}/${id}`, record)

      return this.mapToAPI(record as unknown as TDB)
    } catch (error) {
      console.error(`[${this.collectionPath}] create error:`, error)
      throw new DatabaseError(`Failed to create ${this.collectionPath}`)
    }
  }

  /**
   * Update an existing record
   */
  async updateById(id: string, data: Partial<TAPI>): Promise<TAPI> {
    try {
      // Check if exists
      const existing = await this.findById(id)
      if (!existing) {
        throw new NotFoundError(this.collectionPath, id)
      }

      const dbData = this.mapToDB(data)
      const updateData = {
        ...dbData,
        updated_at: this.getTimestamp(),
      }

      await firebaseREST.update(`${this.collectionPath}/${id}`, updateData)

      return this.findByIdOrFail(id)
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      console.error(`[${this.collectionPath}] update error:`, error)
      throw new DatabaseError(`Failed to update ${this.collectionPath}/${id}`)
    }
  }

  /**
   * Delete a record
   */
  async deleteById(id: string): Promise<void> {
    try {
      // Check if exists
      const existing = await this.findById(id)
      if (!existing) {
        throw new NotFoundError(this.collectionPath, id)
      }

      await firebaseREST.remove(`${this.collectionPath}/${id}`)
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      console.error(`[${this.collectionPath}] delete error:`, error)
      throw new DatabaseError(`Failed to delete ${this.collectionPath}/${id}`)
    }
  }

  /**
   * Soft delete (set is_active to false)
   */
  async softDelete(id: string): Promise<TAPI> {
    return this.updateById(id, { isActive: false } as unknown as Partial<TAPI>)
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    const record = await this.findById(id)
    return record !== null
  }

  /**
   * Count all records
   */
  async count(filterFn?: (item: TAPI) => boolean): Promise<number> {
    const all = await this.findAll()
    if (filterFn) {
      return all.filter(filterFn).length
    }
    return all.length
  }

  /**
   * Get raw data from Firebase (for complex queries)
   */
  protected async getRawData(): Promise<Record<string, TDB> | null> {
    try {
      return await firebaseREST.get(this.collectionPath)
    } catch (error) {
      console.error(`[${this.collectionPath}] getRawData error:`, error)
      throw new DatabaseError(`Failed to fetch raw data from ${this.collectionPath}`)
    }
  }
}
