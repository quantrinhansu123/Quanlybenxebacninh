/**
 * Rollback Migration
 * Truncates all PostgreSQL tables to allow re-migration
 *
 * Usage: npm run etl:rollback -- --confirm
 */
import 'dotenv/config'
import { db, closeDrizzleConnection } from '../../drizzle'
import { sql } from 'drizzle-orm'
import { ensureDbInitialized } from './etl-helpers'

// Tables in reverse dependency order (children first)
const TABLES = [
  'invoices',
  'dispatch_records',
  'vehicle_badges',
  'routes',
  'drivers',
  'vehicles',
  'shifts',
  'users',
  'vehicle_types',
  'operators',
  'id_mappings',
]

async function rollback(confirm: boolean): Promise<void> {
  console.log('='.repeat(60))
  console.log('Migration Rollback')
  console.log('='.repeat(60))
  console.log('\n⚠️  WARNING: This will DELETE ALL DATA from PostgreSQL tables!')
  console.log('    Firebase data will NOT be affected.\n')

  if (!confirm) {
    console.log('To proceed, run with --confirm flag:')
    console.log('  npm run etl:rollback -- --confirm')
    return
  }

  ensureDbInitialized()

  console.log('Rolling back migration...\n')

  for (const table of TABLES) {
    try {
      // Use TRUNCATE CASCADE to handle foreign key constraints
      await db!.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`))
      console.log(`  ✓ Truncated ${table}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('does not exist')) {
        console.log(`  ⚠ Table ${table} does not exist, skipping...`)
      } else {
        console.log(`  ✗ Failed to truncate ${table}: ${message}`)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Rollback complete!')
  console.log('You can now re-run the migration with: npm run etl:migrate')
  console.log('='.repeat(60))

  await closeDrizzleConnection()
}

// Parse --confirm flag
const confirm = process.argv.includes('--confirm')

rollback(confirm)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Rollback failed:', error)
    process.exit(1)
  })

export { rollback }
