/**
 * Dispatch Module Types
 *
 * Note: DB types are inferred from Drizzle schema (dispatch-records.ts)
 * API types are manually defined for frontend compatibility
 */

// Re-export Drizzle types for DB operations
export type { DispatchRecord as DrizzleDispatchRecord, NewDispatchRecord } from '../../db/schema/dispatch-records.js'

/**
 * API Response type for dispatch records
 * This is what gets sent to the frontend
 */
export interface DispatchRecord {
  id: string
  vehicleId: string
  vehiclePlateNumber: string
  vehicle?: {
    id: string
    plateNumber: string
    operatorId?: string | null
    operator?: {
      id: string
      name: string
      code: string
    }
  }
  driverId: string
  driverName: string
  scheduleId?: string | null
  routeId?: string | null
  routeName?: string
  route?: {
    id: string
    routeName: string
    routeType?: string | null
    destination?: {
      id: string
      name: string
      code: string
    }
  }
  entryTime: string
  entryBy?: string | null
  entryImageUrl?: string | null
  passengerDropTime?: string | null
  passengersArrived?: number | null
  passengerDropBy?: string | null
  boardingPermitTime?: string | null
  plannedDepartureTime?: string | null
  transportOrderCode?: string | null
  seatCount?: number | null
  permitStatus?: 'approved' | 'rejected' | null
  rejectionReason?: string | null
  boardingPermitBy?: string | null
  paymentTime?: string | null
  paymentAmount?: number | null
  paymentMethod?: 'cash' | 'transfer' | 'card' | null
  invoiceNumber?: string | null
  paymentBy?: string | null
  departureOrderTime?: string | null
  passengersDeparting?: number | null
  departureOrderBy?: string | null
  exitTime?: string | null
  exitBy?: string | null
  currentStatus: string
  notes?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

/**
 * Legacy DB Record type - DEPRECATED
 * Now aliased to Drizzle schema type for migration compatibility
 * @deprecated Use DrizzleDispatchRecord instead
 */
import type { DispatchRecord as DrizzleDispatch } from '../../db/schema/dispatch-records.js'
export type DispatchDBRecord = DrizzleDispatch

export interface DispatchFilters {
  status?: string
  vehicleId?: string
  driverId?: string
  routeId?: string
  startDate?: string
  endDate?: string
}

// Note: Input types are defined in dispatch-validation.ts via Zod schemas
// Use those types instead: CreateDispatchInput, PassengerDropInput, IssuePermitInput,
// PaymentInput, DepartureOrderInput, ExitInput
