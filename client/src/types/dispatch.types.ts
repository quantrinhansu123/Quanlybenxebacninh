// Dispatch Feature Types
import type { Vehicle, Driver } from './fleet.types'
import type { Route, Schedule } from './common.types'

export type DispatchStatus =
  | 'entered'
  | 'passengers_dropped'
  | 'permit_issued'
  | 'permit_rejected'
  | 'paid'
  | 'departure_ordered'
  | 'departed'
  | 'cancelled'

export type PermitStatus = 'approved' | 'rejected' | 'pending'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'card'

export interface DispatchRecord {
  id: string
  vehicleId: string
  vehicle?: Vehicle
  vehiclePlateNumber: string
  driverId: string
  driver?: Driver
  driverName: string
  scheduleId?: string
  schedule?: Schedule
  routeId: string
  route?: Route
  routeName: string

  // Entry
  entryTime: string
  entryBy?: string
  entryImageUrl?: string

  // Passenger drop-off
  passengerDropTime?: string
  passengersArrived?: number
  passengerDropBy?: string

  // Boarding permit
  boardingPermitTime?: string
  plannedDepartureTime?: string
  transportOrderCode?: string
  seatCount?: number
  permitStatus?: PermitStatus
  rejectionReason?: string
  boardingPermitBy?: string

  // Payment
  paymentTime?: string
  paymentAmount?: number
  paymentMethod?: PaymentMethod
  invoiceNumber?: string
  paymentBy?: string

  // Departure order
  departureOrderTime?: string
  passengersDeparting?: number
  departureOrderBy?: string

  // Exit
  exitTime?: string
  exitBy?: string

  // Status
  currentStatus: DispatchStatus
  notes?: string
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface DispatchInput {
  vehicleId: string
  driverId?: string  // Optional - bypass driver requirement
  scheduleId?: string
  routeId?: string
  entryTime: string
  notes?: string
  entryShiftId?: string
  transportOrderCode?: string
}
