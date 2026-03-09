/**
 * Dispatch Mappers
 * Transform Drizzle DB records to API format
 *
 * Note: Drizzle returns camelCase field names matching the schema
 */

import type { DispatchDBRecord, DispatchRecord } from './dispatch-types.js'

/**
 * Map Drizzle database record to API response format
 */
export function mapDispatchToAPI(record: DispatchDBRecord): DispatchRecord {
  return {
    id: record.id,
    vehicleId: record.vehicleId || '',
    vehicle: {
      id: record.vehicleId || '',
      plateNumber: record.vehiclePlateNumber || '',
      operatorId: record.vehicleOperatorId || null,
      operator: record.vehicleOperatorName ? {
        id: record.vehicleOperatorId!,
        name: record.vehicleOperatorName,
        code: record.vehicleOperatorCode || '',
      } : undefined,
    },
    vehiclePlateNumber: record.vehiclePlateNumber || '',
    driverId: record.driverId || '',
    driverName: record.driverFullName || '',
    scheduleId: record.scheduleId || null,
    routeId: record.routeId || null,
    route: record.routeName ? {
      id: record.routeId!,
      routeName: record.routeName,
      routeType: record.routeType || null,
      destination: record.routeDestinationName ? {
        id: record.routeDestinationId || '',
        name: record.routeDestinationName,
        code: record.routeDestinationCode || '',
      } : undefined,
    } : undefined,
    routeName: record.routeName || '',
    entryTime: record.entryTime?.toISOString() || '',
    entryBy: record.entryByName || record.entryBy || null,
    entryImageUrl: record.entryImageUrl || null,
    passengerDropTime: record.passengerDropTime?.toISOString() || null,
    passengersArrived: record.passengersArrived ?? null,
    passengerDropBy: record.passengerDropByName || record.passengerDropBy || null,
    boardingPermitTime: record.boardingPermitTime?.toISOString() || null,
    plannedDepartureTime: record.plannedDepartureTime?.toISOString() || null,
    transportOrderCode: record.transportOrderCode || null,
    seatCount: record.seatCount ?? null,
    permitStatus: record.permitStatus as 'approved' | 'rejected' | null,
    rejectionReason: record.rejectionReason || null,
    boardingPermitBy: record.boardingPermitByName || record.boardingPermitBy || null,
    paymentTime: record.paymentTime?.toISOString() || null,
    paymentAmount: record.paymentAmount ? parseFloat(String(record.paymentAmount)) : null,
    paymentMethod: record.paymentMethod as 'cash' | 'transfer' | 'card' | null,
    invoiceNumber: record.invoiceNumber || null,
    paymentBy: record.paymentByName || record.paymentBy || null,
    departureOrderTime: record.departureOrderTime?.toISOString() || null,
    passengersDeparting: record.passengersDeparting ?? null,
    departureOrderBy: record.departureOrderByName || record.departureOrderBy || null,
    exitTime: record.exitTime?.toISOString() || null,
    exitBy: record.exitByName || record.exitBy || null,
    currentStatus: record.status || 'entered',
    notes: record.notes || null,
    metadata: record.metadata as Record<string, unknown> | null,
    createdAt: record.createdAt?.toISOString() || '',
    updatedAt: record.updatedAt?.toISOString() || '',
  }
}

/**
 * Map array of database records to API format
 */
export function mapDispatchListToAPI(records: DispatchDBRecord[]): DispatchRecord[] {
  return records.map(mapDispatchToAPI)
}
