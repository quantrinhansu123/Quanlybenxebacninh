// Common/Shared Types
import type { DispatchStatus } from './dispatch.types'
import type { Operator } from './fleet.types'

// ==================== Shift Types ====================

export interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  isActive: boolean
  createdAt?: string
}

// ==================== Location Types ====================

export interface Location {
  id: string
  name: string
  code: string
  stationType?: string
  province?: string
  district?: string
  phone?: string
  email?: string
  address?: string
  latitude?: number
  longitude?: number
  isActive: boolean
  createdAt?: string
}

export interface LocationInput {
  name: string
  code: string
  stationType?: string
  province?: string
  district?: string
  phone?: string
  email?: string
  address?: string
  latitude?: number
  longitude?: number
  isActive?: boolean
}

// ==================== Route Types ====================

export interface RouteStop {
  id: string
  routeId: string
  locationId: string
  location?: Location
  stopOrder: number
  distanceFromOriginKm?: number
  estimatedMinutesFromOrigin?: number
  createdAt?: string
}

export interface Route {
  id: string
  routeCode: string
  routeName: string
  routeType?: string
  originId: string
  origin?: Location
  originName?: string
  destinationId: string
  destination?: Location
  destinationName?: string
  distanceKm?: number
  estimatedDurationMinutes?: number

  plannedFrequency?: string
  boardingPoint?: string
  journeyDescription?: string
  departureTimesDescription?: string
  restStops?: string

  isActive: boolean
  stops?: RouteStop[]
  createdAt?: string
  updatedAt?: string
}

export interface RouteInput {
  routeCode: string
  routeName: string
  routeType?: string
  originId: string
  destinationId: string
  distanceKm?: number
  estimatedDurationMinutes?: number

  plannedFrequency?: string
  boardingPoint?: string
  journeyDescription?: string
  departureTimesDescription?: string
  restStops?: string

  isActive?: boolean
  stops?: Omit<RouteStop, 'id' | 'routeId' | 'createdAt'>[]
}

// ==================== Schedule Types ====================

export interface Schedule {
  id: string
  scheduleCode: string
  routeId: string
  route?: Route
  operatorId: string
  operator?: Operator
  departureTime: string
  frequencyType: 'daily' | 'weekly' | 'specific_days'
  daysOfWeek?: number[]
  effectiveFrom: string
  effectiveTo?: string
  isActive: boolean
  direction?: string
  daysOfMonth?: number[]
  calendarType?: string
  notificationNumber?: string
  tripStatus?: string
  createdAt?: string
  updatedAt?: string
}

export interface ScheduleInput {
  scheduleCode?: string // Optional - will be auto-generated if not provided
  routeId: string
  operatorId: string
  departureTime: string
  frequencyType: 'daily' | 'weekly' | 'specific_days'
  daysOfWeek?: number[]
  effectiveFrom: string
  effectiveTo?: string
}

export interface ValidateDayResponse {
  valid: boolean
  calendarType: string
  dayInMonth: number
  daysOfMonth: number[]
  frequencyType: string
  message?: string
}

export interface TripLimitResponse {
  maxTrips: number
  currentTrips: number
  remaining: number
  canIssue: boolean
}

// ==================== Violation Types ====================

export interface ViolationType {
  id: string
  code: string
  name: string
  description?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  createdAt?: string
}

export interface Violation {
  id: string
  dispatchRecordId?: string
  vehicleId?: string
  driverId?: string
  violationTypeId: string
  violationType?: ViolationType
  violationDate: string
  description?: string
  resolutionStatus: 'pending' | 'resolved' | 'dismissed'
  resolutionNotes?: string
  recordedBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface ViolationInput {
  dispatchRecordId?: string
  vehicleId?: string
  driverId?: string
  violationTypeId: string
  violationDate: string
  description?: string
}

// ==================== Service Types ====================

export interface ServiceType {
  id: string
  code: string
  name: string
  description?: string
  basePrice: number
  unit?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ServiceCharge {
  id: string
  dispatchRecordId: string
  serviceTypeId: string
  serviceType?: ServiceType
  quantity: number
  unitPrice: number
  totalAmount: number
  createdAt?: string
}

export interface ServiceChargeInput {
  dispatchRecordId: string
  serviceTypeId: string
  quantity?: number
  unitPrice: number
  totalAmount: number
}

// Service Management types (Quan ly dich vu)
export interface Service {
  id: string
  code: string // Ma dich vu
  name: string // Ten dich vu
  unit: string // Don vi tinh
  taxPercentage: number // Phan tram thue
  materialType: string // Loai vat tu/hang hoa
  useQuantityFormula: boolean // Su dung cong thuc tinh so luong
  usePriceFormula: boolean // Su dung cong thuc tinh don gia
  displayOrder: number // Thu tu hien thi
  isDefault: boolean // Mac dinh chon
  autoCalculateQuantity: boolean // Tu dong tinh so luong
  isActive: boolean // Trang thai
  quantityFormulaExpression?: string // ID bieu thuc tinh so luong
  priceFormulaExpression?: string // ID bieu thuc tinh don gia
  createdAt?: string
  updatedAt?: string
}

export interface ServiceInput {
  code: string
  name: string
  unit: string
  taxPercentage: number
  materialType: string
  useQuantityFormula: boolean
  usePriceFormula: boolean
  displayOrder: number
  isDefault: boolean
  autoCalculateQuantity: boolean
  isActive?: boolean
}

// Service Formula types (Quan ly bieu thuc)
export interface ServiceFormula {
  id: string
  code: string // Ma bieu thuc
  name: string // Ten bieu thuc
  description?: string // Ghi chu
  formulaType: 'quantity' | 'price' // Loai bieu thuc: tinh so luong hoac tinh don gia
  formulaExpression?: string // Bieu thuc cong thuc
  isActive: boolean // Trang thai
  usageCount?: number // So luong dich vu dang su dung (tu view)
  usedByServices?: string // Danh sach dich vu dang su dung (tu view)
  createdAt?: string
  updatedAt?: string
}

export interface ServiceFormulaInput {
  code: string
  name: string
  description?: string
  formulaType: 'quantity' | 'price'
  formulaExpression?: string
  isActive?: boolean
}

// ==================== Invoice Types ====================

export interface Invoice {
  id: string
  invoiceNumber: string
  dispatchRecordId?: string
  operatorId: string
  operator?: Operator
  issueDate: string
  dueDate?: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'cancelled'
  paymentDate?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface InvoiceInput {
  invoiceNumber: string
  dispatchRecordId?: string
  operatorId: string
  issueDate: string
  dueDate?: string
  subtotal: number
  taxAmount?: number
  totalAmount: number
  notes?: string
}

// ==================== Operation Notice Types ====================

export interface OperationNotice {
  id: string
  routeCode: string
  operatorRef?: string
  noticeNumber: string
  issueDate?: string
  effectiveDate?: string
  filePath?: string
  fileUrl?: string
  issuingAuthority?: string
  status?: string
  noticeType?: string
}

// ==================== Report Types ====================

export interface ReportFilter {
  startDate: string
  endDate: string
  vehicleId?: string
  driverId?: string
  operatorId?: string
  routeId?: string
  status?: DispatchStatus
}

export interface RevenueReport {
  date: string
  totalRevenue: number
  vehicleCount: number
  transactionCount: number
}

export interface InvoiceReport {
  id: string
  invoiceNumber: string
  dispatchId: string
  operatorName: string
  amount: number
  issueDate: string
  status: string
}
