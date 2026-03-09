/**
 * Import Dispatch Records from Firebase Export
 * Level 3: Depends on vehicles, drivers, routes, users, operators
 */
import { db } from '../../drizzle'
import { dispatchRecords } from '../../schema'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  storeIdMapping,
  getPostgresId,
  normalizeStatus,
  parseDate,
  logProgress,
  ensureDbInitialized,
  logInvalidFK,
} from './etl-helpers'

interface FirebaseDispatch {
  _firebase_id: string
  id: string
  vehicle_id?: string
  driver_id?: string
  route_id?: string
  operator_id?: string
  user_id?: string // Entry user
  shift_id?: string

  // Status
  current_status?: string
  status?: string // Alternative field name

  // Timing
  entry_time?: string
  passenger_drop_time?: string
  boarding_permit_time?: string
  payment_time?: string
  exit_time?: string

  // Passenger data
  passengers_arrived?: number
  passengers_boarding?: number
  passengers_total?: number

  // Financial
  payment_amount?: number
  fee_amount?: number

  // Permit
  permit_status?: string
  permit_number?: string

  // Denormalized fields (kept for reporting)
  vehicle_plate_number?: string
  vehicle_seat_count?: number
  operator_name?: string
  driver_full_name?: string
  route_name?: string
  route_code?: string

  // Notes
  notes?: string
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export async function importDispatchRecords(exportDir: string): Promise<number> {
  ensureDbInitialized()

  const filePath = join(exportDir, 'dispatch_records.json')
  let data: FirebaseDispatch[]

  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    console.log('  ⚠ dispatch_records.json not found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} dispatch records...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    try {
      // Lookup foreign keys
      const vehicleId = await getPostgresId(item.vehicle_id, 'vehicles')
      const driverId = await getPostgresId(item.driver_id, 'drivers')
      const routeId = await getPostgresId(item.route_id, 'routes')
      const operatorId = await getPostgresId(item.operator_id, 'operators')
      const entryUserId = await getPostgresId(item.user_id, 'users')
      const shiftId = await getPostgresId(item.shift_id, 'shifts')

      // Log invalid FKs
      if (item.vehicle_id && !vehicleId) {
        await logInvalidFK(exportDir, 'dispatch_records', item.id, 'vehicle_id', item.vehicle_id, 'vehicles')
      }
      if (item.driver_id && !driverId) {
        await logInvalidFK(exportDir, 'dispatch_records', item.id, 'driver_id', item.driver_id, 'drivers')
      }
      if (item.route_id && !routeId) {
        await logInvalidFK(exportDir, 'dispatch_records', item.id, 'route_id', item.route_id, 'routes')
      }
      if (item.operator_id && !operatorId) {
        await logInvalidFK(exportDir, 'dispatch_records', item.id, 'operator_id', item.operator_id, 'operators')
      }
      if (item.user_id && !entryUserId) {
        await logInvalidFK(exportDir, 'dispatch_records', item.id, 'user_id', item.user_id, 'users')
      }
      if (item.shift_id && !shiftId) {
        await logInvalidFK(exportDir, 'dispatch_records', item.id, 'shift_id', item.shift_id, 'shifts')
      }

      const status = normalizeStatus(item.current_status || item.status, 'entered')

      const [inserted] = await db!.insert(dispatchRecords).values({
        firebaseId: item._firebase_id || item.id,

        // Foreign keys
        vehicleId,
        driverId,
        routeId,
        operatorId,
        userId: entryUserId,
        shiftId,

        // Status
        status,

        // Timing
        entryTime: parseDate(item.entry_time) || new Date(),
        passengerDropTime: parseDate(item.passenger_drop_time),
        boardingPermitTime: parseDate(item.boarding_permit_time),
        paymentTime: parseDate(item.payment_time),
        exitTime: parseDate(item.exit_time),

        // Passenger data
        passengersArrived: item.passengers_arrived || null,
        passengersDeparting: item.passengers_boarding || item.passengers_total || null,

        // Financial
        paymentAmount: item.payment_amount ? String(item.payment_amount) : null,

        // Permit
        permitStatus: item.permit_status?.substring(0, 50) || null,
        permitNumber: item.permit_number?.substring(0, 50) || null,

        // Denormalized fields (kept for reporting)
        vehiclePlateNumber: item.vehicle_plate_number?.substring(0, 20) || null,
        vehicleSeatCount: item.vehicle_seat_count || null,
        operatorName: item.operator_name?.substring(0, 255) || null,
        driverFullName: item.driver_full_name?.substring(0, 255) || null,
        routeName: item.route_name?.substring(0, 255) || null,
        routeCode: item.route_code?.substring(0, 50) || null,

        // Notes
        notes: item.notes || null,
        metadata: item.metadata || null,

        createdAt: parseDate(item.created_at) || new Date(),
        updatedAt: parseDate(item.updated_at) || new Date(),
      }).returning()

      await storeIdMapping(item._firebase_id || item.id, inserted.id, 'dispatch_records')
      imported++
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (!message.includes('duplicate')) {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
      }
      skipped++
    }

    if (i % 500 === 0) {
      logProgress(i + 1, data.length, 'dispatch_records')
    }
  }

  console.log(`\n  ✓ Dispatch Records: ${imported} imported, ${skipped} skipped`)
  return imported
}
