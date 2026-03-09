/**
 * Dispatch Controller
 * Thin controller that delegates to repository and helpers
 *
 * Migrated to use Drizzle ORM with camelCase field names
 */

import { Request, Response } from 'express'
import { AuthRequest } from '../../../middleware/auth.js'
import { getCurrentVietnamTime, convertVietnamISOToUTCForStorage } from '../../../utils/timezone.js'
import { getErrorMessage, isValidationError } from '../../../types/common.js'
import {
  fetchDenormalizedData,
  buildDenormalizedFields,
  fetchUserName,
  fetchRouteData,
  buildRouteDenormalizedFields
} from '../../../utils/denormalization.js'
import { dispatchRepository } from '../dispatch-repository.js'
import { mapDispatchToAPI, mapDispatchListToAPI } from '../dispatch-mappers.js'
import {
  validateCreateDispatch,
  validatePassengerDrop,
  validateIssuePermit,
  validatePayment,
  validateDepartureOrder,
  validateExit,
  DISPATCH_STATUS,
} from '../dispatch-validation.js'
import { validateStatusTransition } from '../../../shared/validation/dispatch-status.js'
import { calculateTripLimit } from '../../../controllers/schedule.controller.js'
import { db } from '../../../db/drizzle.js'
import { vehicles as vehiclesTable } from '../../../db/schema/index.js'
import { eq } from 'drizzle-orm'

/**
 * Helper to get current Vietnam time as Date object
 */
function getCurrentVietnamTimeAsDate(): Date {
  return new Date(getCurrentVietnamTime())
}

/**
 * Helper to convert ISO string to Date
 */
function toDate(isoString: string): Date {
  return new Date(convertVietnamISOToUTCForStorage(isoString))
}

/**
 * Update dispatch record with status-based concurrency check
 * Uses status match instead of updatedAt timestamp to avoid false conflicts
 */
async function updateWithStatusCheck(
  id: string,
  updateData: Record<string, unknown>,
  expectedStatus: string
) {
  return dispatchRepository.updateWithStatusCheck(id, updateData, expectedStatus)
}

/**
 * Get all dispatch records with optional filters
 */
export const getAllDispatchRecords = async (req: Request, res: Response) => {
  try {
    const { status, vehicleId, driverId, routeId } = req.query
    const records = await dispatchRepository.findAllWithFilters({
      status: status as string,
      vehicleId: vehicleId as string,
      driverId: driverId as string,
      routeId: routeId as string,
    })
    return res.json(mapDispatchListToAPI(records))
  } catch (error) {
    console.error('Error fetching dispatch records:', error)
    return res.status(500).json({ error: 'Failed to fetch dispatch records' })
  }
}

/**
 * Get single dispatch record by ID
 */
export const getDispatchRecordById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const record = await dispatchRepository.findById(id)

    if (!record) {
      return res.status(404).json({ error: 'Dispatch record not found' })
    }

    return res.json(mapDispatchToAPI(record))
  } catch (error) {
    console.error('Error fetching dispatch record:', error)
    return res.status(500).json({ error: 'Failed to fetch dispatch record' })
  }
}

/**
 * Create new dispatch record (vehicle entry)
 */
export const createDispatchRecord = async (req: AuthRequest, res: Response) => {
  try {
    const input = validateCreateDispatch(req.body)
    const userId = req.user?.id

    // Resolve vehicleId: if not UUID, lookup by plate number
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(input.vehicleId)) {
      const vehicle = await db!.select({ id: vehiclesTable.id })
        .from(vehiclesTable)
        .where(eq(vehiclesTable.plateNumber, input.vehicleId))
        .limit(1)
      if (vehicle.length > 0) {
        input.vehicleId = vehicle[0].id
      } else {
        return res.status(400).json({ error: `Không tìm thấy xe với biển số "${input.vehicleId}"` })
      }
    }

    // Check if vehicle already has active dispatch (still in station)
    const { hasActive, existingRecord } = await dispatchRepository.hasActiveDispatch(input.vehicleId)
    if (hasActive && existingRecord) {
      return res.status(400).json({
        error: `Xe ${existingRecord.vehiclePlateNumber || 'này'} đang ở trong bến (trạng thái: ${existingRecord.status}). Không thể thêm xe vào bến khi chưa xuất bến.`
      })
    }

    const entryTimeForDB = new Date(convertVietnamISOToUTCForStorage(input.entryTime))
    const denormData = await fetchDenormalizedData({
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      routeId: input.routeId,
      userId,
    })

    const insertData = {
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      scheduleId: input.scheduleId || null,
      routeId: input.routeId || null,
      entryTime: entryTimeForDB,
      entryBy: userId || null,
      entryShiftId: input.entryShiftId || null,
      transportOrderCode: input.transportOrderCode || null,
      status: DISPATCH_STATUS.ENTERED,
      notes: input.notes || null,
      ...buildDenormalizedFields(denormData),
      entryByName: denormData.user?.fullName || null,
    }

    const record = await dispatchRepository.create(insertData)
    return res.status(201).json(mapDispatchToAPI(record))
  } catch (error: unknown) {
    console.error('Error creating dispatch record:', error)
    if (isValidationError(error)) {
      return res.status(400).json({ error: getErrorMessage(error) })
    }
    return res.status(500).json({ error: getErrorMessage(error, 'Failed to create dispatch record') })
  }
}

/**
 * Record passenger drop
 */
export const recordPassengerDrop = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const input = validatePassengerDrop(req.body)
    const userId = req.user?.id
    const userName = await fetchUserName(userId)

    // Fetch current record to validate status transition
    const currentRecord = await dispatchRepository.findById(id)
    if (!currentRecord) return res.status(404).json({ error: 'Dispatch record not found' })

    // Validate status transition
    validateStatusTransition(currentRecord.status, DISPATCH_STATUS.PASSENGERS_DROPPED)

    const updateData: Record<string, unknown> = {
      passengerDropTime: getCurrentVietnamTimeAsDate(),
      passengersArrived: input.passengersArrived ?? null,
      passengerDropBy: userId || null,
      passengerDropByName: userName,
      status: DISPATCH_STATUS.PASSENGERS_DROPPED,
    }

    if (input.routeId) {
      updateData.routeId = input.routeId
      const routeData = await fetchRouteData(input.routeId)
      if (routeData) Object.assign(updateData, buildRouteDenormalizedFields(routeData))
    }

    const record = await updateWithStatusCheck(id, updateData, currentRecord.status)
    if (!record) return res.status(409).json({ error: 'Record đã được cập nhật bởi người khác. Vui lòng tải lại trang.' })

    return res.json({ message: 'Passenger drop recorded', dispatch: record })
  } catch (error: unknown) {
    console.error('Error recording passenger drop:', error)
    if (isValidationError(error)) return res.status(400).json({ error: getErrorMessage(error) })
    return res.status(500).json({ error: getErrorMessage(error, 'Failed to record passenger drop') })
  }
}

/**
 * Issue boarding permit
 */
export const issuePermit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const input = validateIssuePermit(req.body)
    const userId = req.user?.id
    const userName = await fetchUserName(userId)

    const currentRecord = await dispatchRepository.findById(id)
    if (!currentRecord) return res.status(404).json({ error: 'Dispatch record not found' })

    // Validate status transition based on permit decision
    const targetStatus = input.permitStatus === 'approved' ? DISPATCH_STATUS.PERMIT_ISSUED : DISPATCH_STATUS.PERMIT_REJECTED
    validateStatusTransition(currentRecord.status, targetStatus)

    // Trip limit enforcement (only for approved permits)
    if (input.permitStatus === 'approved' && (input.routeId || currentRecord.routeId)) {
      const routeIdToCheck = input.routeId || currentRecord.routeId!
      const vehiclePlate = currentRecord.vehiclePlateNumber
      if (vehiclePlate) {
        const depTime = input.plannedDepartureTime
          ? new Date(input.plannedDepartureTime)
          : getCurrentVietnamTimeAsDate()
        const year = depTime.getFullYear()
        const month = String(depTime.getMonth() + 1).padStart(2, '0')
        const day = String(depTime.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`

        const { maxTrips, canIssue } = await calculateTripLimit(routeIdToCheck, vehiclePlate, dateStr)

        if (!canIssue) {
          const msg = maxTrips === 0
            ? `Tuyến không có biểu đồ giờ chiều đi hợp lệ cho ngày ${dateStr}. Không thể cấp phép.`
            : `Xe ${vehiclePlate} đã đạt giới hạn ${maxTrips} chuyến/ngày trên tuyến này. Không thể cấp thêm phép.`
          return res.status(400).json({
            error: msg,
            code: 'TRIP_LIMIT_EXCEEDED',
          })
        }
      }
    }

    const metadata = { ...(currentRecord.metadata as Record<string, unknown> || {}) }
    if (input.replacementVehicleId) metadata.replacementVehicleId = input.replacementVehicleId
    else if (input.replacementVehicleId === '') delete metadata.replacementVehicleId

    const updateData: Record<string, unknown> = {
      boardingPermitTime: getCurrentVietnamTimeAsDate(),
      boardingPermitBy: userId || null,
      boardingPermitByName: userName,
      permitStatus: input.permitStatus,
      metadata,
      permitShiftId: input.permitShiftId || null,
    }

    if (input.routeId) {
      updateData.routeId = input.routeId
      const routeData = await fetchRouteData(input.routeId)
      if (routeData) Object.assign(updateData, buildRouteDenormalizedFields(routeData))
    }
    if (input.scheduleId) updateData.scheduleId = input.scheduleId

    if (input.permitStatus === 'approved') {
      updateData.transportOrderCode = input.transportOrderCode
      updateData.plannedDepartureTime = input.plannedDepartureTime ? toDate(input.plannedDepartureTime) : null
      updateData.seatCount = input.seatCount
      updateData.status = DISPATCH_STATUS.PERMIT_ISSUED
      updateData.rejectionReason = input.rejectionReason || null
    } else {
      updateData.transportOrderCode = input.transportOrderCode || null
      updateData.plannedDepartureTime = input.plannedDepartureTime ? toDate(input.plannedDepartureTime) : null
      updateData.seatCount = input.seatCount || null
      updateData.status = DISPATCH_STATUS.PERMIT_REJECTED
      updateData.rejectionReason = input.rejectionReason || null
    }

    const record = await updateWithStatusCheck(id, updateData, currentRecord.status)
    if (!record) return res.status(409).json({ error: 'Record đã được cập nhật bởi người khác. Vui lòng tải lại trang.' })
    return res.json({ message: 'Permit processed', dispatch: record })
  } catch (error: unknown) {
    console.error('Error issuing permit:', error)
    if (isValidationError(error)) return res.status(400).json({ error: getErrorMessage(error) })
    return res.status(500).json({ error: getErrorMessage(error, 'Failed to issue permit') })
  }
}

/**
 * Process payment
 */
export const processPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const input = validatePayment(req.body)
    const userId = req.user?.id
    const userName = await fetchUserName(userId)

    // Check if record exists and validate status transition
    const currentRecord = await dispatchRepository.findById(id)
    if (!currentRecord) {
      return res.status(404).json({ error: 'Dispatch record not found' })
    }

    // Validate invoice number uniqueness
    if (input.invoiceNumber) {
      const existing = await dispatchRepository.findByInvoiceNumber(input.invoiceNumber)
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: 'Số hóa đơn đã tồn tại' })
      }
    }

    // Validate status transition
    if (currentRecord.status === DISPATCH_STATUS.PAID) {
      return res.status(400).json({ error: 'Đơn hàng đã được thanh toán' })
    }
    validateStatusTransition(currentRecord.status, DISPATCH_STATUS.PAID)

    const updateData = {
      paymentTime: getCurrentVietnamTimeAsDate(),
      paymentAmount: String(input.paymentAmount),
      paymentMethod: input.paymentMethod || 'cash',
      invoiceNumber: input.invoiceNumber || null,
      paymentBy: userId || null,
      paymentByName: userName,
      paymentShiftId: input.paymentShiftId || null,
      status: DISPATCH_STATUS.PAID,
    }

    const record = await updateWithStatusCheck(id, updateData, currentRecord.status)
    if (!record) return res.status(409).json({ error: 'Record đã được cập nhật bởi người khác. Vui lòng tải lại trang.' })

    return res.json({ message: 'Payment processed', dispatch: record })
  } catch (error: unknown) {
    console.error('Error processing payment:', error)
    if (isValidationError(error)) return res.status(400).json({ error: getErrorMessage(error) })
    return res.status(500).json({ error: getErrorMessage(error, 'Failed to process payment') })
  }
}

/**
 * Issue departure order
 */
export const issueDepartureOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const input = validateDepartureOrder(req.body)
    const userId = req.user?.id
    const userName = await fetchUserName(userId)

    // Fetch current record to validate status transition
    const currentRecord = await dispatchRepository.findById(id)
    if (!currentRecord) return res.status(404).json({ error: 'Dispatch record not found' })

    // Validate status transition
    validateStatusTransition(currentRecord.status, DISPATCH_STATUS.DEPARTURE_ORDERED)

    const updateData = {
      departureOrderTime: getCurrentVietnamTimeAsDate(),
      passengersDeparting: input.passengersDeparting ?? null,
      departureOrderBy: userId || null,
      departureOrderByName: userName,
      departureOrderShiftId: input.departureOrderShiftId || null,
      status: DISPATCH_STATUS.DEPARTURE_ORDERED,
    }

    const record = await updateWithStatusCheck(id, updateData, currentRecord.status)
    if (!record) return res.status(409).json({ error: 'Record đã được cập nhật bởi người khác. Vui lòng tải lại trang.' })

    return res.json({ message: 'Departure order issued', dispatch: record })
  } catch (error: unknown) {
    console.error('Error issuing departure order:', error)
    if (isValidationError(error)) return res.status(400).json({ error: getErrorMessage(error) })
    return res.status(500).json({ error: getErrorMessage(error, 'Failed to issue departure order') })
  }
}

/**
 * Record vehicle exit
 */
export const recordExit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const input = validateExit(req.body)
    const userId = req.user?.id
    const userName = await fetchUserName(userId)

    // Fetch current record to validate status transition
    const currentRecord = await dispatchRepository.findById(id)
    if (!currentRecord) return res.status(404).json({ error: 'Dispatch record not found' })

    // Validate status transition
    validateStatusTransition(currentRecord.status, DISPATCH_STATUS.DEPARTED)

    const updateData: Record<string, unknown> = {
      exitTime: input.exitTime ? toDate(input.exitTime) : getCurrentVietnamTimeAsDate(),
      exitBy: userId || null,
      exitByName: userName,
      exitShiftId: input.exitShiftId || null,
      status: DISPATCH_STATUS.DEPARTED,
    }

    if (input.passengersDeparting !== undefined) {
      updateData.passengersDeparting = input.passengersDeparting
    }

    const record = await updateWithStatusCheck(id, updateData, currentRecord.status)
    if (!record) return res.status(409).json({ error: 'Record đã được cập nhật bởi người khác. Vui lòng tải lại trang.' })

    return res.json({ message: 'Exit recorded', dispatch: record })
  } catch (error: unknown) {
    console.error('Error recording exit:', error)
    if (isValidationError(error)) return res.status(400).json({ error: getErrorMessage(error) })
    return res.status(500).json({ error: getErrorMessage(error, 'Failed to record exit') })
  }
}

/**
 * Update entry image URL (set or remove)
 */
export const updateEntryImage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { entryImageUrl } = req.body

    // Allow null to remove image, or string to set image
    if (entryImageUrl !== null && typeof entryImageUrl !== 'string') {
      return res.status(400).json({ error: 'entryImageUrl must be a string or null' })
    }

    const record = await dispatchRepository.update(id, {
      entryImageUrl: entryImageUrl,
    })

    if (!record) return res.status(404).json({ error: 'Dispatch record not found' })

    const message = entryImageUrl ? 'Entry image updated' : 'Entry image removed'
    return res.json({ message, dispatch: mapDispatchToAPI(record) })
  } catch (error: unknown) {
    console.error('Error updating entry image:', error)
    return res.status(500).json({ error: getErrorMessage(error, 'Failed to update entry image') })
  }
}

/**
 * Delete dispatch record (only for records that haven't departed)
 */
export const deleteDispatchRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const existingRecord = await dispatchRepository.findById(id)
    if (!existingRecord) {
      return res.status(404).json({ error: 'Dispatch record not found' })
    }

    // Only allow deletion of records that haven't departed yet
    if (existingRecord.status === 'departed') {
      return res.status(400).json({ error: 'Không thể xóa record đã xuất bến. Hãy sử dụng chức năng Hủy bỏ.' })
    }

    await dispatchRepository.delete(id)
    return res.json({ message: 'Dispatch record deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting dispatch record:', error)
    return res.status(500).json({ error: getErrorMessage(error, 'Failed to delete dispatch record') })
  }
}

/**
 * Cancel dispatch record (soft delete - mark as cancelled)
 * Used for records that have already departed but need to be voided
 */
export const cancelDispatchRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const userId = req.user?.id

    const existingRecord = await dispatchRepository.findById(id)
    if (!existingRecord) {
      return res.status(404).json({ error: 'Dispatch record not found' })
    }

    // Already cancelled
    if (existingRecord.status === 'cancelled') {
      return res.status(400).json({ error: 'Record đã được hủy bỏ trước đó' })
    }

    const userName = await fetchUserName(userId)

    // Update status to cancelled and store cancellation info in metadata
    const updatedRecord = await dispatchRepository.update(id, {
      status: 'cancelled',
      metadata: {
        ...(existingRecord.metadata as Record<string, unknown> || {}),
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancelled_by_name: userName,
        cancellation_reason: reason || 'Hủy bỏ bởi người dùng',
        previous_status: existingRecord.status,
      }
    })

    if (!updatedRecord) {
      return res.status(500).json({ error: 'Failed to update record' })
    }

    return res.json({
      message: 'Record đã được hủy bỏ thành công',
      dispatch: mapDispatchToAPI(updatedRecord)
    })
  } catch (error: unknown) {
    console.error('Error cancelling dispatch record:', error)
    return res.status(500).json({ error: getErrorMessage(error, 'Failed to cancel dispatch record') })
  }
}

/**
 * Update dispatch record (edit entry)
 * Allows editing vehicle, driver, route, entry time for records in early stages
 */
export const updateDispatchRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { vehicleId, driverId, routeId, entryTime, notes } = req.body

    // Check if record exists
    const existingRecord = await dispatchRepository.findById(id)
    if (!existingRecord) {
      return res.status(404).json({ error: 'Dispatch record not found' })
    }

    // Only allow editing of records in early stages
    const editableStatuses = ['entered', 'passengers_dropped']
    if (!editableStatuses.includes(existingRecord.status)) {
      return res.status(400).json({
        error: 'Cannot edit a record that has already been permitted or paid'
      })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Update vehicle if changed
    if (vehicleId && vehicleId !== existingRecord.vehicleId) {
      updateData.vehicleId = vehicleId
      try {
        const denormData = await fetchDenormalizedData({ vehicleId })
        Object.assign(updateData, buildDenormalizedFields(denormData))
      } catch (denormError) {
        // Legacy vehicle (legacy_* or badge_*) - fetch may fail
        // Keep existing denormalized data, just update the vehicleId
        console.warn(`[updateDispatchRecord] fetchDenormalizedData failed for ${vehicleId}:`, denormError)
      }
    }

    // Update driver if changed
    if (driverId && driverId !== existingRecord.driverId) {
      const driverName = await fetchUserName(driverId)
      updateData.driverId = driverId
      updateData.driverFullName = driverName
    }

    // Update route if changed
    if (routeId !== undefined) {
      if (routeId && routeId !== existingRecord.routeId) {
        const routeData = await fetchRouteData(routeId)
        updateData.routeId = routeId
        Object.assign(updateData, buildRouteDenormalizedFields(routeData))
      } else if (!routeId) {
        updateData.routeId = null
        updateData.routeName = null
        updateData.routeType = null
        updateData.routeDestinationId = null
        updateData.routeDestinationName = null
        updateData.routeDestinationCode = null
      }
    }

    // Update entry time if changed
    if (entryTime) {
      updateData.entryTime = toDate(entryTime)
    }

    // Update notes if provided
    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Perform update
    const updatedRecord = await dispatchRepository.update(id, updateData)
    if (!updatedRecord) {
      return res.status(500).json({ error: 'Failed to update dispatch record' })
    }

    return res.json(mapDispatchToAPI(updatedRecord))
  } catch (error: unknown) {
    console.error('Error updating dispatch record:', error)
    return res.status(500).json({ error: getErrorMessage(error, 'Failed to update dispatch record') })
  }
}

// Legacy endpoints
export const updateDispatchStatus = async (_req: Request, res: Response) => {
  return res.status(400).json({ error: 'This endpoint is deprecated. Use specific workflow endpoints instead.' })
}

export const depart = async (_req: Request, res: Response) => {
  return res.status(400).json({ error: 'This endpoint is deprecated. Use /depart endpoint instead.' })
}
