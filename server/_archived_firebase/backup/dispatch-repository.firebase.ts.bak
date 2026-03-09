/**
 * Dispatch Repository
 * Handles all Firebase operations for dispatch records
 */

import { firebase } from '../../config/database.js'
import type { DispatchDBRecord, DispatchFilters } from './dispatch-types.js'

/**
 * Dispatch Repository class
 */
class DispatchRepository {
  private collection = 'dispatch_records'

  /**
   * Find all dispatch records with optional filters
   */
  async findAll(filters?: DispatchFilters): Promise<DispatchDBRecord[]> {
    let query = firebase
      .from(this.collection)
      .select('*')
      .order('entry_time', { ascending: false })

    if (filters?.status) {
      query = query.eq('current_status', filters.status)
    }
    if (filters?.vehicleId) {
      query = query.eq('vehicle_id', filters.vehicleId)
    }
    if (filters?.driverId) {
      query = query.eq('driver_id', filters.driverId)
    }
    if (filters?.routeId) {
      query = query.eq('route_id', filters.routeId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  /**
   * Find single dispatch record by ID
   */
  async findById(id: string): Promise<DispatchDBRecord | null> {
    const { data, error } = await firebase
      .from(this.collection)
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data || null
  }

  /**
   * Create new dispatch record
   */
  async create(insertData: Partial<DispatchDBRecord>): Promise<DispatchDBRecord> {
    const { data, error } = await firebase
      .from(this.collection)
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update dispatch record
   */
  async update(id: string, updateData: Partial<DispatchDBRecord>): Promise<DispatchDBRecord | null> {
    const { data, error } = await firebase
      .from(this.collection)
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return data || null
  }

  /**
   * Delete dispatch record
   */
  async delete(id: string): Promise<void> {
    const { error } = await firebase
      .from(this.collection)
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// Export singleton instance
export const dispatchRepository = new DispatchRepository()
