/**
 * Import Vehicles from Firebase Export
 * Level 2: Depends on operators, vehicle_types
 */
import { db } from '../../drizzle'
import { vehicles } from '../../schema'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  storeIdMapping,
  getPostgresId,
  parseBoolean,
  parseDate,
  logProgress,
  ensureDbInitialized,
  logInvalidFK,
} from './etl-helpers'

interface FirebaseVehicle {
  _firebase_id: string
  id: string
  plate_number?: string
  operator_id?: string
  vehicle_type_id?: string
  seat_capacity?: number
  seat_count?: number
  bed_capacity?: number
  load_capacity?: number
  manufacturer?: string
  brand?: string
  model?: string
  manufacture_year?: number
  year_of_manufacture?: number
  color?: string
  chassis_number?: string
  engine_number?: string
  insurance_expiry_date?: string
  inspection_expiry_date?: string
  image_url?: string
  cargo_length?: number
  cargo_width?: number
  cargo_height?: number
  gps_provider?: string
  gps_username?: string
  gps_password?: string
  province?: string
  notes?: string
  registration_info?: string
  is_active?: boolean | string
  operational_status?: string
  operator_name?: string
  operator_code?: string
  owner_name?: string
  owner_address?: string
  has_transport_business?: boolean
  vehicle_category?: string
  vehicle_type?: string
  metadata?: Record<string, unknown>
  synced_at?: string
  source?: string
  created_at?: string
  updated_at?: string
}

/**
 * Normalize plate number: trim, uppercase, remove spaces/dots/dashes
 * Example: "98H-082.80" -> "98H08280"
 */
function normalizePlateNumber(plate: string): string {
  return plate.trim().toUpperCase().replace(/[\s.\-]/g, '')
}

export async function importVehicles(exportDir: string): Promise<number> {
  ensureDbInitialized()

  // Try both vehicles.json and datasheet_vehicles.json
  const vehiclesFile = join(exportDir, 'vehicles.json')
  const datasheetFile = join(exportDir, 'datasheet_vehicles.json')

  let data: FirebaseVehicle[] = []

  // Load vehicles.json (app-created, small)
  if (existsSync(vehiclesFile)) {
    try {
      const appVehicles = JSON.parse(readFileSync(vehiclesFile, 'utf-8'))
      data = data.concat(appVehicles)
      console.log(`  Loaded ${appVehicles.length} vehicles from vehicles.json`)
    } catch {
      console.log('  ⚠ Failed to read vehicles.json')
    }
  }

  // Load datasheet_vehicles.json (bulk import from Google Sheets)
  if (existsSync(datasheetFile)) {
    try {
      const datasheetVehicles = JSON.parse(readFileSync(datasheetFile, 'utf-8'))
      data = data.concat(datasheetVehicles)
      console.log(`  Loaded ${datasheetVehicles.length} vehicles from datasheet_vehicles.json`)
    } catch (error) {
      console.log('  ⚠ Failed to read datasheet_vehicles.json:', error)
    }
  }

  if (data.length === 0) {
    console.log('  ⚠ No vehicles data found, skipping...')
    return 0
  }

  console.log(`  Importing ${data.length} vehicles total...`)

  let imported = 0
  let skipped = 0

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    try {
      // Resolve foreign keys
      let operatorId = null
      if (item.operator_id) {
        operatorId = await getPostgresId(item.operator_id, 'operators')
        if (!operatorId) {
          await logInvalidFK(exportDir, 'vehicles', item.id, 'operator_id', item.operator_id, 'operators')
        }
      }

      let vehicleTypeId = null
      if (item.vehicle_type_id) {
        vehicleTypeId = await getPostgresId(item.vehicle_type_id, 'vehicle_types')
        if (!vehicleTypeId) {
          await logInvalidFK(exportDir, 'vehicles', item.id, 'vehicle_type_id', item.vehicle_type_id, 'vehicle_types')
        }
      }

      // Get and normalize plate number
      const plateNumber = item.plate_number
      if (!plateNumber) {
        console.log(`\n  ⚠ Skipping vehicle ${item.id}: no plate_number`)
        skipped++
        continue
      }

      const normalizedPlate = normalizePlateNumber(plateNumber)

      // Get seat count (prefer seat_count from datasheet, fallback to seat_capacity)
      const seatCount = item.seat_count ?? item.seat_capacity ?? 0

      // Get notes (combine notes and registration_info if both exist)
      let notes = item.notes || ''
      if (item.registration_info) {
        notes = notes ? `${notes}\n\n${item.registration_info}` : item.registration_info
      }

      const [inserted] = await db!.insert(vehicles).values({
        firebaseId: item._firebase_id || item.id,
        plateNumber: normalizedPlate.substring(0, 20),
        operatorId: operatorId,
        vehicleTypeId: vehicleTypeId,
        seatCount: seatCount,
        bedCapacity: item.bed_capacity || item.load_capacity || 0,
        brand: (item.brand || item.manufacturer)?.substring(0, 100) || null,
        model: item.model?.substring(0, 100) || null,
        yearOfManufacture: item.manufacture_year || item.year_of_manufacture || null,
        color: item.color?.substring(0, 50) || null,
        chassisNumber: item.chassis_number?.substring(0, 50) || null,
        engineNumber: item.engine_number?.substring(0, 50) || null,
        registrationExpiry: null,
        insuranceExpiry: item.insurance_expiry_date || null,
        roadWorthinessExpiry: item.inspection_expiry_date || null,
        imageUrl: item.image_url?.substring(0, 500) || null,
        cargoLength: item.cargo_length || null,
        cargoWidth: item.cargo_width || null,
        cargoHeight: item.cargo_height || null,
        gpsProvider: item.gps_provider?.substring(0, 100) || null,
        gpsUsername: item.gps_username?.substring(0, 100) || null,
        gpsPassword: item.gps_password?.substring(0, 100) || null,
        province: item.province?.substring(0, 100) || null,
        notes: notes?.substring(0, 500) || null,
        isActive: parseBoolean(item.is_active),
        operationalStatus: item.operational_status?.substring(0, 50) || 'active',
        operatorName: (item.operator_name || item.owner_name)?.substring(0, 255) || null,
        operatorCode: item.operator_code?.substring(0, 50) || null,
        metadata: item.metadata || null,
        syncedAt: parseDate(item.synced_at),
        source: item.source?.substring(0, 50) || 'firebase_migration',
        createdAt: parseDate(item.created_at) || new Date(),
        updatedAt: parseDate(item.updated_at) || new Date(),
      }).returning()

      await storeIdMapping(item._firebase_id || item.id, inserted.id, 'vehicles')
      imported++
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('duplicate')) {
        skipped++
      } else {
        console.log(`\n  ✗ Failed: ${item.id} - ${message}`)
        skipped++
      }
    }

    if (i % 50 === 0) {
      logProgress(i + 1, data.length, 'vehicles')
    }
  }

  console.log(`\n  ✓ Vehicles: ${imported} imported, ${skipped} skipped`)
  return imported
}
