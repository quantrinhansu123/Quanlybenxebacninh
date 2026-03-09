/**
 * Migration Script: Denormalize Existing Dispatch Records
 *
 * This script populates denormalized fields in existing dispatch_records
 * to enable single-query reads for improved performance.
 *
 * Run with: npx tsx src/scripts/migrate-denormalize-dispatch.ts
 *
 * Fields populated:
 * - vehicle_plate_number, vehicle_operator_id, vehicle_operator_name, vehicle_operator_code
 * - driver_full_name
 * - route_name, route_type, route_destination_id, route_destination_name, route_destination_code
 * - entry_by_name, passenger_drop_by_name, boarding_permit_by_name
 * - payment_by_name, departure_order_by_name, exit_by_name
 */

import { firebase, firebaseDb } from '../config/database.js'

interface MigrationStats {
  total: number
  processed: number
  failed: number
  skipped: number
  startTime: number
}

async function migrateDispatchRecords() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  DISPATCH RECORDS DENORMALIZATION MIGRATION')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')

  const stats: MigrationStats = {
    total: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    startTime: Date.now(),
  }

  try {
    // Step 1: Fetch all dispatch records
    console.log('📥 Fetching all dispatch records...')
    const { data: records, error: recordsError } = await firebase.from('dispatch_records').select('*')

    if (recordsError) {
      console.error('❌ Failed to fetch dispatch records:', recordsError)
      return
    }

    stats.total = records.length
    console.log(`   Found ${stats.total} records to migrate`)
    console.log('')

    if (stats.total === 0) {
      console.log('✅ No records to migrate')
      return
    }

    // Step 2: Fetch all reference data in parallel
    console.log('📥 Fetching reference data (vehicles, drivers, routes, users)...')
    const [vehiclesResult, driversResult, routesResult, usersResult] = await Promise.all([
      firebase.from('vehicles').select('id, plate_number, operator_id, operators:operator_id(id, name, code)'),
      firebase.from('drivers').select('id, full_name'),
      firebase.from('routes').select('id, route_name, route_type, destination:destination_id(id, name, code)'),
      firebase.from('users').select('id, full_name'),
    ])

    // Create lookup maps for O(1) access
    const vehicleMap = new Map<string, any>()
    vehiclesResult.data?.forEach((v: any) => {
      const operatorData = Array.isArray(v.operators) ? v.operators[0] : v.operators
      vehicleMap.set(v.id, {
        plateNumber: v.plate_number || '',
        operatorId: v.operator_id || null,
        operatorName: operatorData?.name || null,
        operatorCode: operatorData?.code || null,
      })
    })

    const driverMap = new Map<string, string>()
    driversResult.data?.forEach((d: any) => {
      driverMap.set(d.id, d.full_name || '')
    })

    const routeMap = new Map<string, any>()
    routesResult.data?.forEach((r: any) => {
      const destData = Array.isArray(r.destination) ? r.destination[0] : r.destination
      routeMap.set(r.id, {
        name: r.route_name || null,
        type: r.route_type || null,
        destinationId: destData?.id || null,
        destinationName: destData?.name || null,
        destinationCode: destData?.code || null,
      })
    })

    const userMap = new Map<string, string>()
    usersResult.data?.forEach((u: any) => {
      userMap.set(u.id, u.full_name || '')
    })

    console.log(`   Vehicles: ${vehicleMap.size}`)
    console.log(`   Drivers: ${driverMap.size}`)
    console.log(`   Routes: ${routeMap.size}`)
    console.log(`   Users: ${userMap.size}`)
    console.log('')

    // Step 3: Process records in batches
    const batchSize = 50
    const totalBatches = Math.ceil(stats.total / batchSize)
    console.log(`🔄 Processing ${stats.total} records in ${totalBatches} batches of ${batchSize}...`)
    console.log('')

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * batchSize
      const endIdx = Math.min(startIdx + batchSize, stats.total)
      const batch = records.slice(startIdx, endIdx)

      const batchPromises = batch.map(async (record: any) => {
        try {
          // Check if record already has denormalized data
          if (record.vehicle_plate_number && record.driver_full_name) {
            stats.skipped++
            return
          }

          // Get related data from lookup maps
          const vehicle = vehicleMap.get(record.vehicle_id)
          const driver = driverMap.get(record.driver_id)
          const route = record.route_id ? routeMap.get(record.route_id) : null

          // Build update object with denormalized fields
          const updateData: Record<string, any> = {
            // Vehicle denormalized data
            vehicle_plate_number: vehicle?.plateNumber || '',
            vehicle_operator_id: vehicle?.operatorId || null,
            vehicle_operator_name: vehicle?.operatorName || null,
            vehicle_operator_code: vehicle?.operatorCode || null,

            // Driver denormalized data
            driver_full_name: driver || '',

            // Route denormalized data
            route_name: route?.name || null,
            route_type: route?.type || null,
            route_destination_id: route?.destinationId || null,
            route_destination_name: route?.destinationName || null,
            route_destination_code: route?.destinationCode || null,

            // User denormalized data (audit trail)
            entry_by_name: record.entry_by ? userMap.get(record.entry_by) || null : null,
            passenger_drop_by_name: record.passenger_drop_by ? userMap.get(record.passenger_drop_by) || null : null,
            boarding_permit_by_name: record.boarding_permit_by ? userMap.get(record.boarding_permit_by) || null : null,
            payment_by_name: record.payment_by ? userMap.get(record.payment_by) || null : null,
            departure_order_by_name: record.departure_order_by ? userMap.get(record.departure_order_by) || null : null,
            exit_by_name: record.exit_by ? userMap.get(record.exit_by) || null : null,
          }

          // Update record in Firebase
          await firebaseDb.update(`dispatch_records/${record.id}`, updateData)
          stats.processed++
        } catch (err) {
          console.error(`   ❌ Failed to migrate record ${record.id}:`, err)
          stats.failed++
        }
      })

      await Promise.all(batchPromises)

      // Progress update
      const progress = ((endIdx / stats.total) * 100).toFixed(1)
      const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1)
      console.log(`   Batch ${batchIndex + 1}/${totalBatches} complete [${progress}%] - ${elapsed}s elapsed`)
    }

    // Final summary
    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('  MIGRATION COMPLETE')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`   Total records: ${stats.total}`)
    console.log(`   ✅ Processed: ${stats.processed}`)
    console.log(`   ⏭️  Skipped (already migrated): ${stats.skipped}`)
    console.log(`   ❌ Failed: ${stats.failed}`)
    console.log(`   ⏱️  Duration: ${((Date.now() - stats.startTime) / 1000).toFixed(2)}s`)
    console.log('')

    if (stats.failed > 0) {
      console.log('⚠️  Some records failed to migrate. Review logs above for details.')
    } else {
      console.log('✅ All records migrated successfully!')
    }
  } catch (error) {
    console.error('❌ Migration failed with error:', error)
    process.exit(1)
  }
}

// Run migration
console.log('')
migrateDispatchRecords()
  .then(() => {
    console.log('')
    console.log('Migration script finished.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Unhandled error:', err)
    process.exit(1)
  })
