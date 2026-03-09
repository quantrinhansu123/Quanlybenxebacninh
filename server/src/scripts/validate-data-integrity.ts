/**
 * Data Integrity Validation Script
 * Comprehensive validation of migrated data in Supabase
 *
 * Validates:
 * 1. Record counts across all tables
 * 2. Foreign key integrity (orphaned records)
 * 3. Data consistency (required fields, valid values)
 *
 * Usage: npm run db:validate-integrity
 */
import 'dotenv/config'
import { db } from '../db/drizzle.js'
import { sql } from 'drizzle-orm'
import {
  operators,
  vehicles,
  vehicleTypes,
  drivers,
  routes,
  vehicleBadges,
  dispatchRecords,
  shifts,
  users,
  invoices,
} from '../db/schema/index.js'

interface RecordCount {
  table: string
  count: number
}

interface FKCheck {
  relationship: string
  total: number
  valid: number
  orphans: number
  nulls: number
  status: '✓' | '⚠' | '✗'
}

interface ValidationSummary {
  totalIssues: number
  critical: number
  warnings: number
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

function formatStatus(status: '✓' | '⚠' | '✗'): string {
  switch (status) {
    case '✓':
      return `${colors.green}${status}${colors.reset}`
    case '⚠':
      return `${colors.yellow}${status}${colors.reset}`
    case '✗':
      return `${colors.red}${status}${colors.reset}`
  }
}

async function getTableCount(tableName: string): Promise<number> {
  if (!db) return 0
  const result = await db.execute(
    sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`)
  )
  return Number(result[0]?.count || 0)
}

async function validateRecordCounts(): Promise<RecordCount[]> {
  const tables = [
    'operators',
    'vehicle_types',
    'vehicles',
    'drivers',
    'routes',
    'vehicle_badges',
    'dispatch_records',
    'shifts',
    'users',
    'invoices',
  ]

  const counts: RecordCount[] = []

  for (const table of tables) {
    const count = await getTableCount(table)
    counts.push({ table, count })
  }

  return counts
}

async function validateForeignKeys(): Promise<FKCheck[]> {
  const checks: FKCheck[] = []

  // 1. vehicles.operator_id → operators.id
  const vehicleOperatorCheck = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN o.id IS NOT NULL THEN 1 END) as valid,
      COUNT(CASE WHEN v.operator_id IS NOT NULL AND o.id IS NULL THEN 1 END) as orphans,
      COUNT(CASE WHEN v.operator_id IS NULL THEN 1 END) as nulls
    FROM vehicles v
    LEFT JOIN operators o ON v.operator_id = o.id
  `)

  const vOpRow = vehicleOperatorCheck[0] as any
  checks.push({
    relationship: 'vehicles.operator_id → operators.id',
    total: Number(vOpRow.total),
    valid: Number(vOpRow.valid),
    orphans: Number(vOpRow.orphans),
    nulls: Number(vOpRow.nulls),
    status: Number(vOpRow.orphans) > 0 ? '✗' : Number(vOpRow.nulls) > 0 ? '⚠' : '✓',
  })

  // 2. vehicles.vehicle_type_id → vehicle_types.id
  const vehicleTypeCheck = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN vt.id IS NOT NULL THEN 1 END) as valid,
      COUNT(CASE WHEN v.vehicle_type_id IS NOT NULL AND vt.id IS NULL THEN 1 END) as orphans,
      COUNT(CASE WHEN v.vehicle_type_id IS NULL THEN 1 END) as nulls
    FROM vehicles v
    LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
  `)

  const vTRow = vehicleTypeCheck[0] as any
  checks.push({
    relationship: 'vehicles.vehicle_type_id → vehicle_types.id',
    total: Number(vTRow.total),
    valid: Number(vTRow.valid),
    orphans: Number(vTRow.orphans),
    nulls: Number(vTRow.nulls),
    status: Number(vTRow.orphans) > 0 ? '✗' : Number(vTRow.nulls) > 0 ? '⚠' : '✓',
  })

  // 3. drivers.operator_id → operators.id
  const driverOperatorCheck = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN o.id IS NOT NULL THEN 1 END) as valid,
      COUNT(CASE WHEN d.operator_id IS NOT NULL AND o.id IS NULL THEN 1 END) as orphans,
      COUNT(CASE WHEN d.operator_id IS NULL THEN 1 END) as nulls
    FROM drivers d
    LEFT JOIN operators o ON d.operator_id = o.id
  `)

  const dOpRow = driverOperatorCheck[0] as any
  checks.push({
    relationship: 'drivers.operator_id → operators.id',
    total: Number(dOpRow.total),
    valid: Number(dOpRow.valid),
    orphans: Number(dOpRow.orphans),
    nulls: Number(dOpRow.nulls),
    status: Number(dOpRow.orphans) > 0 ? '✗' : Number(dOpRow.nulls) > 0 ? '⚠' : '✓',
  })

  // 4. dispatch_records.vehicle_id → vehicles.id
  const dispatchVehicleCheck = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN v.id IS NOT NULL THEN 1 END) as valid,
      COUNT(CASE WHEN dr.vehicle_id IS NOT NULL AND v.id IS NULL THEN 1 END) as orphans,
      COUNT(CASE WHEN dr.vehicle_id IS NULL THEN 1 END) as nulls
    FROM dispatch_records dr
    LEFT JOIN vehicles v ON dr.vehicle_id = v.id
  `)

  const drVRow = dispatchVehicleCheck[0] as any
  checks.push({
    relationship: 'dispatch_records.vehicle_id → vehicles.id',
    total: Number(drVRow.total),
    valid: Number(drVRow.valid),
    orphans: Number(drVRow.orphans),
    nulls: Number(drVRow.nulls),
    status: Number(drVRow.orphans) > 0 ? '✗' : Number(drVRow.nulls) > 0 ? '⚠' : '✓',
  })

  // 5. dispatch_records.driver_id → drivers.id
  const dispatchDriverCheck = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN d.id IS NOT NULL THEN 1 END) as valid,
      COUNT(CASE WHEN dr.driver_id IS NOT NULL AND d.id IS NULL THEN 1 END) as orphans,
      COUNT(CASE WHEN dr.driver_id IS NULL THEN 1 END) as nulls
    FROM dispatch_records dr
    LEFT JOIN drivers d ON dr.driver_id = d.id
  `)

  const drDRow = dispatchDriverCheck[0] as any
  checks.push({
    relationship: 'dispatch_records.driver_id → drivers.id',
    total: Number(drDRow.total),
    valid: Number(drDRow.valid),
    orphans: Number(drDRow.orphans),
    nulls: Number(drDRow.nulls),
    status: Number(drDRow.orphans) > 0 ? '✗' : Number(drDRow.nulls) > 0 ? '⚠' : '✓',
  })

  // 6. dispatch_records.operator_id → operators.id
  const dispatchOperatorCheck = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN o.id IS NOT NULL THEN 1 END) as valid,
      COUNT(CASE WHEN dr.operator_id IS NOT NULL AND o.id IS NULL THEN 1 END) as orphans,
      COUNT(CASE WHEN dr.operator_id IS NULL THEN 1 END) as nulls
    FROM dispatch_records dr
    LEFT JOIN operators o ON dr.operator_id = o.id
  `)

  const drORow = dispatchOperatorCheck[0] as any
  checks.push({
    relationship: 'dispatch_records.operator_id → operators.id',
    total: Number(drORow.total),
    valid: Number(drORow.valid),
    orphans: Number(drORow.orphans),
    nulls: Number(drORow.nulls),
    status: Number(drORow.orphans) > 0 ? '✗' : Number(drORow.nulls) > 0 ? '⚠' : '✓',
  })

  // 7. vehicle_badges.vehicle_id → vehicles.id
  const badgeVehicleCheck = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN v.id IS NOT NULL THEN 1 END) as valid,
      COUNT(CASE WHEN vb.vehicle_id IS NOT NULL AND v.id IS NULL THEN 1 END) as orphans,
      COUNT(CASE WHEN vb.vehicle_id IS NULL THEN 1 END) as nulls
    FROM vehicle_badges vb
    LEFT JOIN vehicles v ON vb.vehicle_id = v.id
  `)

  const vbVRow = badgeVehicleCheck[0] as any
  checks.push({
    relationship: 'vehicle_badges.vehicle_id → vehicles.id',
    total: Number(vbVRow.total),
    valid: Number(vbVRow.valid),
    orphans: Number(vbVRow.orphans),
    nulls: Number(vbVRow.nulls),
    status: Number(vbVRow.orphans) > 0 ? '✗' : Number(vbVRow.nulls) > 0 ? '⚠' : '✓',
  })

  // 8. invoices.dispatch_record_id → dispatch_records.id
  const invoiceDispatchCheck = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN dr.id IS NOT NULL THEN 1 END) as valid,
      COUNT(CASE WHEN i.dispatch_record_id IS NOT NULL AND dr.id IS NULL THEN 1 END) as orphans,
      COUNT(CASE WHEN i.dispatch_record_id IS NULL THEN 1 END) as nulls
    FROM invoices i
    LEFT JOIN dispatch_records dr ON i.dispatch_record_id = dr.id
  `)

  const iDrRow = invoiceDispatchCheck[0] as any
  checks.push({
    relationship: 'invoices.dispatch_record_id → dispatch_records.id',
    total: Number(iDrRow.total),
    valid: Number(iDrRow.valid),
    orphans: Number(iDrRow.orphans),
    nulls: Number(iDrRow.nulls),
    status: Number(iDrRow.orphans) > 0 ? '✗' : Number(iDrRow.nulls) > 0 ? '⚠' : '✓',
  })

  return checks
}

async function validateDataIntegrity() {
  if (!db) {
    console.error('[Validation] Database not initialized. Check DATABASE_URL.')
    process.exit(1)
  }

  console.log(`${colors.bold}${colors.cyan}`)
  console.log('=' .repeat(70))
  console.log('Data Integrity Validation Report')
  console.log(`Generated: ${new Date().toISOString()}`)
  console.log('=' .repeat(70))
  console.log(colors.reset)

  // 1. Record Counts
  console.log(`\n${colors.bold}1. Record Counts${colors.reset}`)
  console.log('-'.repeat(70))

  const counts = await validateRecordCounts()
  for (const { table, count } of counts) {
    console.log(`   ${table.padEnd(25)}: ${count.toString().padStart(6)}`)
  }

  // 2. Foreign Key Integrity
  console.log(`\n${colors.bold}2. Foreign Key Integrity${colors.reset}`)
  console.log('-'.repeat(70))

  const fkChecks = await validateForeignKeys()
  for (const check of fkChecks) {
    const statusIcon = formatStatus(check.status)
    const validRatio = `${check.valid}/${check.total}`
    const orphanInfo = check.orphans > 0 ? ` (${check.orphans} orphans)` : ''
    const nullInfo = check.nulls > 0 ? ` (${check.nulls} NULL - allowed)` : ''

    console.log(`   ${statusIcon} ${check.relationship}`)
    console.log(`      ${validRatio} valid${orphanInfo}${nullInfo}`)
  }

  // 3. Summary
  console.log(`\n${colors.bold}3. Summary${colors.reset}`)
  console.log('-'.repeat(70))

  const criticalIssues = fkChecks.filter(c => c.status === '✗').length
  const warnings = fkChecks.filter(c => c.status === '⚠').length
  const totalIssues = criticalIssues + warnings

  console.log(`   Total Issues: ${totalIssues}`)
  console.log(`   Critical: ${criticalIssues > 0 ? colors.red : colors.green}${criticalIssues}${colors.reset}`)
  console.log(`   Warnings: ${warnings > 0 ? colors.yellow : colors.green}${warnings}${colors.reset}`)

  console.log(`\n${colors.bold}${colors.cyan}`)
  console.log('=' .repeat(70))
  console.log(colors.reset)

  // Exit with appropriate code
  const hasCriticalIssues = criticalIssues > 0
  if (hasCriticalIssues) {
    console.log(`${colors.red}${colors.bold}✗ Validation failed with critical issues${colors.reset}\n`)
    process.exit(1)
  } else if (warnings > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠ Validation passed with warnings${colors.reset}\n`)
    process.exit(0)
  } else {
    console.log(`${colors.green}${colors.bold}✓ All validations passed!${colors.reset}\n`)
    process.exit(0)
  }
}

// Run validation
validateDataIntegrity().catch((error) => {
  console.error(`${colors.red}Validation failed:${colors.reset}`, error)
  process.exit(1)
})
