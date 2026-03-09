// Dispatch Feature Types - Re-export from shared types

export type {
  DispatchStatus,
  PermitStatus,
  PaymentMethod,
  DispatchRecord,
  DispatchInput,
} from '@/types/dispatch.types'

// Display status type for UI tabs (different from backend status)
export type DisplayStatus = 'in-station' | 'permit-issued' | 'paid' | 'departed'

// Feature-specific types
export interface DispatchFilters {
  status?: string
  vehicleId?: string
  driverId?: string
  routeId?: string
  from?: string
  to?: string
}

export interface PassengerDropInput {
  passengersArrived: number
  routeId?: string
}

export interface PermitInput {
  transportOrderCode?: string
  plannedDepartureTime: string
  seatCount: number
  permitStatus?: 'approved' | 'rejected'
  rejectionReason?: string
  routeId?: string
  scheduleId?: string
  replacementVehicleId?: string
  permitShiftId?: string
}

export interface PaymentInput {
  paymentAmount: number
  paymentMethod?: 'cash' | 'bank_transfer' | 'card'
  invoiceNumber?: string
  paymentShiftId?: string
}

export interface DepartureOrderInput {
  passengersDeparting: number
  departureOrderShiftId?: string
}

export interface ExitInput {
  exitTime?: string
  passengersDeparting?: number
  exitShiftId?: string
}

export interface DispatchWorkflowState {
  currentStep: 'entry' | 'passenger-drop' | 'permit' | 'payment' | 'departure' | 'exit'
  selectedRecord: import('@/types/dispatch.types').DispatchRecord | null
  isProcessing: boolean
}
