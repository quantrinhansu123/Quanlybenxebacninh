/**
 * Export Firebase RTDB Data
 * Exports all collections to JSON files for migration to Supabase
 *
 * Usage: npm run etl:export
 */
import { firebaseDb } from '../../../config/database'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// All collections to export based on dependency order
const COLLECTIONS = [
  // Level 1: No dependencies
  'operators',
  'vehicle_types',
  'provinces',
  'users',
  'shifts',
  // Level 2: Depends on Level 1
  'vehicles',
  'drivers',
  'routes',
  'schedules',
  // Level 3: Depends on Level 2
  'vehicle_badges',
  'dispatch_records',
  // Level 4: Depends on Level 3
  'invoices',
  // Also export datasheet for reference
  'datasheet',
  'locations',
]

interface ExportStats {
  collection: string
  recordCount: number
  exportedAt: string
}

async function exportFirebaseData(): Promise<ExportStats[]> {
  const timestamp = new Date().toISOString().split('T')[0]
  const exportDir = join(process.cwd(), 'exports', timestamp)

  // Create export directory
  if (!existsSync(exportDir)) {
    mkdirSync(exportDir, { recursive: true })
  }

  console.log('='.repeat(60))
  console.log('Firebase RTDB Export')
  console.log(`Export directory: ${exportDir}`)
  console.log('='.repeat(60))

  const stats: ExportStats[] = []
  let totalRecords = 0

  for (const collection of COLLECTIONS) {
    console.log(`\nExporting ${collection}...`)

    try {
      const data = await firebaseDb.get(collection)

      if (!data) {
        console.log(`  ⚠ No data in ${collection}`)
        stats.push({
          collection,
          recordCount: 0,
          exportedAt: new Date().toISOString()
        })
        continue
      }

      // Convert Firebase object to array with IDs
      const records = Object.entries(data).map(([id, value]) => ({
        _firebase_id: id,
        id,
        ...(value as object),
      }))

      // Write to JSON file
      const filePath = join(exportDir, `${collection}.json`)
      writeFileSync(filePath, JSON.stringify(records, null, 2))

      console.log(`  ✓ Exported ${records.length} records`)
      totalRecords += records.length

      stats.push({
        collection,
        recordCount: records.length,
        exportedAt: new Date().toISOString()
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`  ✗ Failed to export ${collection}: ${message}`)
      stats.push({
        collection,
        recordCount: -1,
        exportedAt: new Date().toISOString()
      })
    }
  }

  // Write export manifest
  const manifestPath = join(exportDir, '_manifest.json')
  writeFileSync(manifestPath, JSON.stringify({
    exportedAt: new Date().toISOString(),
    collections: stats,
    totalRecords,
  }, null, 2))

  console.log('\n' + '='.repeat(60))
  console.log(`Export complete!`)
  console.log(`  Total: ${totalRecords} records`)
  console.log(`  Location: ${exportDir}`)
  console.log('='.repeat(60))

  return stats
}

// Run if executed directly
exportFirebaseData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Export failed:', error)
    process.exit(1)
  })

export { exportFirebaseData }
