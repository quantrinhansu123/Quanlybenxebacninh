/**
 * Parse Firebase RTDB Export
 * Splits single Firebase export file into individual JSON files for ETL
 *
 * Usage: npx tsx parse-firebase-export.ts <input-file> <output-dir>
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Mapping from Firebase paths to output file names
 * datasheet.* = large datasets from Google Sheets import
 * Top-level = app-created data (smaller)
 */
const COLLECTION_MAPPING: Record<string, string> = {
  // Datasheet collections (large - from Google Sheets)
  'datasheet.DONVIVANTAI': 'datasheet_operators',
  'datasheet.Xe': 'datasheet_vehicles',
  'datasheet.PHUHIEUXE': 'datasheet_vehicle_badges',
  'datasheet.DANHMUCTUYENCODINH': 'datasheet_routes',

  // App collections (smaller - from app)
  operators: 'operators',
  vehicles: 'vehicles',
  drivers: 'drivers',
  routes: 'routes',
  shifts: 'shifts',
  vehicle_types: 'vehicle_types',
  vehicle_badges: 'vehicle_badges',
  vehicle_documents: 'vehicle_documents',
  dispatch_records: 'dispatch_records',
  users: 'users',
  invoices: 'invoices',
  schedules: 'schedules',
  services: 'services',
  service_charges: 'service_charges',
  service_formulas: 'service_formulas',
  service_formula_usage: 'service_formula_usage',
  driver_operators: 'driver_operators',
  locations: 'locations',
  route_stops: 'route_stops',
  violation_types: 'violation_types',
  system_settings: 'system_settings',
}

interface FirebaseRecord {
  [key: string]: unknown
}

interface ParseResult {
  collection: string
  outputFile: string
  recordCount: number
  success: boolean
  error?: string
}

/**
 * Convert Firebase object format to array with firebase_id
 */
function objectToArray(
  data: Record<string, FirebaseRecord>
): Array<FirebaseRecord & { _firebase_id: string }> {
  return Object.entries(data).map(([key, value]) => ({
    _firebase_id: key,
    ...value,
  }))
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return current
}

/**
 * Parse Firebase export and write individual collection files
 */
export function parseFirebaseExport(inputPath: string, outputDir: string): ParseResult[] {
  console.log(`\n=== Firebase Export Parser ===`)
  console.log(`Input: ${inputPath}`)
  console.log(`Output: ${outputDir}`)

  // Read Firebase export
  console.log(`\nReading Firebase export...`)
  const rawData = readFileSync(inputPath, 'utf-8')
  const data = JSON.parse(rawData)
  console.log(`Loaded ${(rawData.length / 1024 / 1024).toFixed(2)} MB of data`)

  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
    console.log(`Created output directory: ${outputDir}`)
  }

  const results: ParseResult[] = []

  // Process each mapped collection
  for (const [firebasePath, outputName] of Object.entries(COLLECTION_MAPPING)) {
    const outputFile = join(outputDir, `${outputName}.json`)

    try {
      // Get collection data
      const collectionData = getNestedValue(data, firebasePath)

      if (!collectionData || typeof collectionData !== 'object') {
        results.push({
          collection: firebasePath,
          outputFile,
          recordCount: 0,
          success: false,
          error: 'Collection not found or empty',
        })
        console.log(`  [SKIP] ${firebasePath}: not found`)
        continue
      }

      // Convert to array with firebase_id
      const records = objectToArray(collectionData as Record<string, FirebaseRecord>)

      // Write to file
      writeFileSync(outputFile, JSON.stringify(records, null, 2))

      results.push({
        collection: firebasePath,
        outputFile,
        recordCount: records.length,
        success: true,
      })
      console.log(`  [OK] ${firebasePath}: ${records.length} records -> ${outputName}.json`)
    } catch (error) {
      results.push({
        collection: firebasePath,
        outputFile,
        recordCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      console.log(`  [ERROR] ${firebasePath}: ${error}`)
    }
  }

  // Summary
  console.log(`\n=== Summary ===`)
  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)
  const totalRecords = successful.reduce((sum, r) => sum + r.recordCount, 0)

  console.log(`Successful: ${successful.length}/${results.length} collections`)
  console.log(`Total records: ${totalRecords}`)
  if (failed.length > 0) {
    console.log(`Failed/Skipped: ${failed.map((r) => r.collection).join(', ')}`)
  }

  // Write summary file
  const summaryFile = join(outputDir, '_summary.json')
  writeFileSync(
    summaryFile,
    JSON.stringify(
      {
        parsedAt: new Date().toISOString(),
        inputFile: inputPath,
        totalCollections: results.length,
        successfulCollections: successful.length,
        totalRecords,
        results,
      },
      null,
      2
    )
  )
  console.log(`\nSummary written to: ${summaryFile}`)

  return results
}

// CLI entry point
const isMain = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`
if (isMain) {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log('Usage: npx tsx parse-firebase-export.ts <input-file> <output-dir>')
    console.log('Example: npx tsx parse-firebase-export.ts ./firebase-export.json ./data/firebase-export')
    process.exit(1)
  }

  const [inputPath, outputDir] = args
  parseFirebaseExport(inputPath, outputDir)
}
