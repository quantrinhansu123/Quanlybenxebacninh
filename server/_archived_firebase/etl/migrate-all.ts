/**
 * Master Migration Script
 * Runs all ETL import scripts in dependency order
 *
 * Usage: npm run etl:migrate [export-dir]
 */
import 'dotenv/config'
import { closeDrizzleConnection } from '../../drizzle'
import { importOperators } from './import-operators'
import { importVehicleTypes } from './import-vehicle-types'
import { importUsers } from './import-users'
import { importShifts } from './import-shifts'
import { importVehicles } from './import-vehicles'
import { importDrivers } from './import-drivers'
import { importRoutes } from './import-routes'
import { importVehicleBadges } from './import-vehicle-badges'
import { importDispatchRecords } from './import-dispatch-records'
import { importInvoices } from './import-invoices'

interface MigrationResult {
  entity: string
  imported: number
  duration: number
}

async function migrateAll(exportDir: string): Promise<MigrationResult[]> {
  console.log('='.repeat(60))
  console.log('Firebase to Supabase Migration')
  console.log(`Export directory: ${exportDir}`)
  console.log('='.repeat(60))

  const results: MigrationResult[] = []
  const startTime = Date.now()

  try {
    // Level 1: No dependencies (can run in parallel conceptually, but sequential for logging clarity)
    console.log('\n--- Level 1: Reference Data ---')

    let start = Date.now()
    const operators = await importOperators(exportDir)
    results.push({ entity: 'operators', imported: operators, duration: Date.now() - start })

    start = Date.now()
    const vehicleTypes = await importVehicleTypes(exportDir)
    results.push({ entity: 'vehicle_types', imported: vehicleTypes, duration: Date.now() - start })

    start = Date.now()
    const users = await importUsers(exportDir)
    results.push({ entity: 'users', imported: users, duration: Date.now() - start })

    start = Date.now()
    const shifts = await importShifts(exportDir)
    results.push({ entity: 'shifts', imported: shifts, duration: Date.now() - start })

    // Level 2: Depends on Level 1
    console.log('\n--- Level 2: Entities ---')

    start = Date.now()
    const vehicles = await importVehicles(exportDir)
    results.push({ entity: 'vehicles', imported: vehicles, duration: Date.now() - start })

    start = Date.now()
    const drivers = await importDrivers(exportDir)
    results.push({ entity: 'drivers', imported: drivers, duration: Date.now() - start })

    start = Date.now()
    const routes = await importRoutes(exportDir)
    results.push({ entity: 'routes', imported: routes, duration: Date.now() - start })

    // Level 3: Depends on Level 2
    console.log('\n--- Level 3: Complex Entities ---')

    start = Date.now()
    const badges = await importVehicleBadges(exportDir)
    results.push({ entity: 'vehicle_badges', imported: badges, duration: Date.now() - start })

    start = Date.now()
    const dispatch = await importDispatchRecords(exportDir)
    results.push({ entity: 'dispatch_records', imported: dispatch, duration: Date.now() - start })

    // Level 4: Depends on Level 3
    console.log('\n--- Level 4: Transactional Data ---')

    start = Date.now()
    const invoicesCount = await importInvoices(exportDir)
    results.push({ entity: 'invoices', imported: invoicesCount, duration: Date.now() - start })

    // Summary
    const totalDuration = Date.now() - startTime
    const totalImported = results.reduce((sum, r) => sum + r.imported, 0)

    console.log('\n' + '='.repeat(60))
    console.log('Migration Summary')
    console.log('='.repeat(60))

    for (const r of results) {
      console.log(`  ${r.entity}: ${r.imported} records (${r.duration}ms)`)
    }

    console.log('-'.repeat(60))
    console.log(`  Total: ${totalImported} records in ${(totalDuration / 1000).toFixed(1)}s`)
    console.log('='.repeat(60))

    return results
  } catch (error) {
    console.error('\nMigration failed:', error)
    throw error
  } finally {
    await closeDrizzleConnection()
  }
}

// Run if executed directly
const exportDir = process.argv[2] || `./exports/${new Date().toISOString().split('T')[0]}`

migrateAll(exportDir)
  .then(() => process.exit(0))
  .catch(() => process.exit(1))

export { migrateAll }
