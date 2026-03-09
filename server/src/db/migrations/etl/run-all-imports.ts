/**
 * ETL Master Runner
 * Run all ETL imports in dependency order
 */
import { importOperators } from './import-operators'
import { importVehicleTypes } from './import-vehicle-types'
import { importShifts } from './import-shifts'
import { importUsers } from './import-users'
import { importRoutes } from './import-routes'
import { importVehicles } from './import-vehicles'
import { importDrivers } from './import-drivers'
import { importVehicleBadges } from './import-vehicle-badges'
import { importDispatchRecords } from './import-dispatch-records'
import { importInvoices } from './import-invoices'

interface ImportResult {
  table: string
  imported: number
  success: boolean
  error?: string
}

export async function runAllImports(exportDir: string): Promise<ImportResult[]> {
  console.log('\n========================================')
  console.log('    ETL Master Import - Firebase → Supabase')
  console.log('========================================\n')
  console.log(`Source directory: ${exportDir}`)

  const results: ImportResult[] = []

  // Level 1: No dependencies
  console.log('\n--- Level 1: Base Tables (No Dependencies) ---\n')

  try {
    console.log('[1/10] Operators')
    const opCount = await importOperators(exportDir)
    results.push({ table: 'operators', imported: opCount, success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.log(`  ✗ Operators failed: ${msg}`)
    results.push({ table: 'operators', imported: 0, success: false, error: msg })
  }

  try {
    console.log('\n[2/10] Vehicle Types')
    const vtCount = await importVehicleTypes(exportDir)
    results.push({ table: 'vehicle_types', imported: vtCount, success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.log(`  ✗ Vehicle Types failed: ${msg}`)
    results.push({ table: 'vehicle_types', imported: 0, success: false, error: msg })
  }

  try {
    console.log('\n[3/10] Shifts')
    const shiftCount = await importShifts(exportDir)
    results.push({ table: 'shifts', imported: shiftCount, success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.log(`  ✗ Shifts failed: ${msg}`)
    results.push({ table: 'shifts', imported: 0, success: false, error: msg })
  }

  try {
    console.log('\n[4/10] Users')
    const userCount = await importUsers(exportDir)
    results.push({ table: 'users', imported: userCount, success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.log(`  ✗ Users failed: ${msg}`)
    results.push({ table: 'users', imported: 0, success: false, error: msg })
  }

  try {
    console.log('\n[5/10] Routes')
    const routeCount = await importRoutes(exportDir)
    results.push({ table: 'routes', imported: routeCount, success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.log(`  ✗ Routes failed: ${msg}`)
    results.push({ table: 'routes', imported: 0, success: false, error: msg })
  }

  // Level 2: Depends on Level 1
  console.log('\n--- Level 2: Depends on Operators/Vehicle Types ---\n')

  try {
    console.log('[6/10] Vehicles')
    const vehicleCount = await importVehicles(exportDir)
    results.push({ table: 'vehicles', imported: vehicleCount, success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.log(`  ✗ Vehicles failed: ${msg}`)
    results.push({ table: 'vehicles', imported: 0, success: false, error: msg })
  }

  try {
    console.log('\n[7/10] Drivers')
    const driverCount = await importDrivers(exportDir)
    results.push({ table: 'drivers', imported: driverCount, success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.log(`  ✗ Drivers failed: ${msg}`)
    results.push({ table: 'drivers', imported: 0, success: false, error: msg })
  }

  // Level 3: Depends on Level 2
  console.log('\n--- Level 3: Depends on Vehicles/Drivers ---\n')

  try {
    console.log('[8/10] Vehicle Badges')
    const badgeCount = await importVehicleBadges(exportDir)
    results.push({ table: 'vehicle_badges', imported: badgeCount, success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.log(`  ✗ Vehicle Badges failed: ${msg}`)
    results.push({ table: 'vehicle_badges', imported: 0, success: false, error: msg })
  }

  try {
    console.log('\n[9/10] Dispatch Records')
    const dispatchCount = await importDispatchRecords(exportDir)
    results.push({ table: 'dispatch_records', imported: dispatchCount, success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.log(`  ✗ Dispatch Records failed: ${msg}`)
    results.push({ table: 'dispatch_records', imported: 0, success: false, error: msg })
  }

  // Level 4: Depends on Level 3
  console.log('\n--- Level 4: Final ---\n')

  try {
    console.log('[10/10] Invoices')
    const invoiceCount = await importInvoices(exportDir)
    results.push({ table: 'invoices', imported: invoiceCount, success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.log(`  ✗ Invoices failed: ${msg}`)
    results.push({ table: 'invoices', imported: 0, success: false, error: msg })
  }

  // Summary
  console.log('\n========================================')
  console.log('             ETL Summary')
  console.log('========================================\n')

  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)
  const totalImported = results.reduce((sum, r) => sum + r.imported, 0)

  console.log(`Tables: ${successful.length}/${results.length} successful`)
  console.log(`Total records imported: ${totalImported}`)

  if (failed.length > 0) {
    console.log(`\nFailed tables:`)
    failed.forEach((r) => console.log(`  - ${r.table}: ${r.error}`))
  }

  console.log('\n========================================\n')

  return results
}

// CLI entry point
const args = process.argv.slice(2)
if (args.length > 0) {
  const exportDir = args[0]
  runAllImports(exportDir)
    .then((results) => {
      const failed = results.filter((r) => !r.success)
      process.exit(failed.length > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error('ETL Master failed:', error)
      process.exit(1)
    })
}
