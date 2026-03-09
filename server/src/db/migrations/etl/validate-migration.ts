/**
 * Validate Migration
 * Compares record counts between Firebase export and PostgreSQL
 *
 * Usage: npm run etl:validate [export-dir]
 */
import 'dotenv/config'
import { db, closeDrizzleConnection } from '../../drizzle'
import { sql } from 'drizzle-orm'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { ensureDbInitialized } from './etl-helpers'

interface ValidationResult {
  table: string
  sourceCount: number
  targetCount: number
  mappingCount: number
  status: 'PASS' | 'WARN' | 'FAIL'
}

// Tables to validate: [name, jsonFile]
const TABLES = [
  { name: 'operators', file: 'operators.json' },
  { name: 'vehicle_types', file: 'vehicle_types.json' },
  { name: 'users', file: 'users.json' },
  { name: 'shifts', file: 'shifts.json' },
  { name: 'vehicles', file: 'vehicles.json' },
  { name: 'drivers', file: 'drivers.json' },
  { name: 'routes', file: 'routes.json' },
  { name: 'vehicle_badges', file: 'vehicle_badges.json' },
  { name: 'dispatch_records', file: 'dispatch_records.json' },
  { name: 'invoices', file: 'invoices.json' },
]

// Whitelisted table names for validation
const ALLOWED_TABLES = new Set([
  'operators', 'vehicle_types', 'users', 'shifts', 'vehicles',
  'drivers', 'routes', 'vehicle_badges', 'dispatch_records', 'invoices', 'id_mappings'
])

async function getTableCount(tableName: string): Promise<number> {
  if (!db) return 0
  // Validate table name against whitelist to prevent SQL injection
  if (!ALLOWED_TABLES.has(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`)
  }
  const result = await db.execute(
    sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`)
  )
  return Number(result[0]?.count || 0)
}

async function getMappingCount(entityType: string): Promise<number> {
  if (!db) return 0
  // Validate entity type against whitelist
  if (!ALLOWED_TABLES.has(entityType)) {
    throw new Error(`Invalid entity type: ${entityType}`)
  }
  const result = await db.execute(
    sql.raw(`SELECT COUNT(*) as count FROM "id_mappings" WHERE "entity_type" = '${entityType}'`)
  )
  return Number(result[0]?.count || 0)
}

async function validateMigration(exportDir: string): Promise<boolean> {
  ensureDbInitialized()

  console.log('='.repeat(60))
  console.log('Migration Validation')
  console.log(`Export directory: ${exportDir}`)
  console.log('='.repeat(60))

  const results: ValidationResult[] = []
  let allPassed = true

  for (const { name, file } of TABLES) {
    const filePath = join(exportDir, file)

    // Get source count
    let sourceCount = 0
    if (existsSync(filePath)) {
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'))
        sourceCount = Array.isArray(data) ? data.length : 0
      } catch {
        sourceCount = -1
      }
    }

    // Get target count using raw SQL
    const targetCount = await getTableCount(name)

    // Get mapping count
    const mappingCount = await getMappingCount(name)

    // Determine status
    let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    if (sourceCount === -1) {
      status = 'WARN' // File not found or parse error
    } else if (sourceCount === 0 && targetCount === 0) {
      status = 'PASS' // Both empty is OK
    } else if (targetCount === 0 && sourceCount > 0) {
      status = 'FAIL' // Missing data
      allPassed = false
    } else if (Math.abs(sourceCount - targetCount) > sourceCount * 0.1) {
      // More than 10% difference
      status = 'WARN'
    }

    results.push({
      table: name,
      sourceCount,
      targetCount,
      mappingCount,
      status,
    })
  }

  // Print results
  console.log('\nValidation Results:')
  console.log('-'.repeat(60))
  console.log('Table                | Source  | Target  | Mapped  | Status')
  console.log('-'.repeat(60))

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'WARN' ? '⚠' : '✗'
    const src = r.sourceCount === -1 ? 'N/A' : r.sourceCount.toString()
    console.log(
      `${icon} ${r.table.padEnd(18)} | ${src.padStart(7)} | ${r.targetCount.toString().padStart(7)} | ${r.mappingCount.toString().padStart(7)} | ${r.status}`
    )
  }

  console.log('-'.repeat(60))

  // Summary
  const passed = results.filter(r => r.status === 'PASS').length
  const warned = results.filter(r => r.status === 'WARN').length
  const failed = results.filter(r => r.status === 'FAIL').length

  console.log(`\nSummary: ${passed} PASS, ${warned} WARN, ${failed} FAIL`)

  if (allPassed) {
    console.log('\n✓ All validations passed!')
  } else {
    console.log('\n✗ Some validations failed. Review the results above.')
  }

  await closeDrizzleConnection()
  return allPassed
}

// Run if executed directly
const exportDir = process.argv[2] || `./exports/${new Date().toISOString().split('T')[0]}`

validateMigration(exportDir)
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(error => {
    console.error('Validation failed:', error)
    process.exit(1)
  })

export { validateMigration }
