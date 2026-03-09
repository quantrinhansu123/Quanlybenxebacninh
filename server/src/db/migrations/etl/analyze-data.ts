/**
 * Analyze Firebase Export Data
 * Detects data issues before import to Supabase
 *
 * Usage: npm run etl:analyze
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// Issue types
type IssueType = 'duplicate' | 'invalid_fk' | 'null_required' | 'type_mismatch'

interface DataIssue {
  collection: string
  recordId: string
  issueType: IssueType
  field: string
  details: string
}

interface AnalysisReport {
  analyzedAt: string
  exportDir: string
  totalIssues: number
  issuesByType: Record<IssueType, number>
  issuesByCollection: Record<string, number>
  issues: DataIssue[]
}

// Collections with dependencies
const COLLECTIONS = {
  // Level 1: No dependencies
  level1: ['operators', 'vehicle_types', 'provinces', 'users', 'shifts'],
  // Level 2: Depends on Level 1
  level2: ['vehicles', 'drivers', 'routes'],
  // Level 3: Depends on Level 2
  level3: ['vehicle_badges', 'dispatch_records'],
  // Level 4: Depends on Level 3
  level4: ['invoices'],
} as const

// FK relationships
const FK_RELATIONSHIPS = {
  vehicles: [
    { field: 'operator_id', targetCollection: 'operators' },
    { field: 'vehicle_type_id', targetCollection: 'vehicle_types' },
  ],
  drivers: [{ field: 'operator_id', targetCollection: 'operators' }],
  vehicle_badges: [
    { field: 'vehicle_id', targetCollection: 'vehicles' },
    { field: 'route_id', targetCollection: 'routes' },
  ],
  dispatch_records: [
    { field: 'vehicle_id', targetCollection: 'vehicles' },
    { field: 'driver_id', targetCollection: 'drivers' },
    { field: 'route_id', targetCollection: 'routes' },
    { field: 'operator_id', targetCollection: 'operators' },
    { field: 'user_id', targetCollection: 'users' },
    { field: 'shift_id', targetCollection: 'shifts' },
  ],
  invoices: [{ field: 'dispatch_record_id', targetCollection: 'dispatch_records' }],
} as const

// Unique fields per collection
const UNIQUE_FIELDS = {
  operators: ['code'],
  vehicles: ['plate_number', 'biensoxe'],
  drivers: ['phone'],
  users: ['email', 'phone'],
  routes: ['code'],
} as const

// Required fields per collection
const REQUIRED_FIELDS = {
  operators: ['name', 'code'],
  vehicles: ['plate_number'],
  drivers: ['name'],
  users: ['email', 'phone'], // At least one required
  routes: ['name', 'code'],
} as const

/**
 * Load JSON file safely
 */
function loadCollection(exportDir: string, collection: string): any[] {
  const filePath = join(exportDir, `${collection}.json`)

  if (!existsSync(filePath)) {
    return []
  }

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'))
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error(`  ✗ Failed to parse ${collection}.json:`, error)
    return []
  }
}

/**
 * Check for duplicate IDs or unique field values
 */
function checkDuplicates(
  collection: string,
  data: any[],
  issues: DataIssue[]
): void {
  const seenIds = new Set<string>()
  const uniqueFields = UNIQUE_FIELDS[collection as keyof typeof UNIQUE_FIELDS] || []

  // Track unique field values
  const uniqueFieldValues: Record<string, Set<string>> = {}
  uniqueFields.forEach(field => {
    uniqueFieldValues[field] = new Set()
  })

  for (const record of data) {
    const recordId = record._firebase_id || record.id

    // Check duplicate IDs
    if (seenIds.has(recordId)) {
      issues.push({
        collection,
        recordId,
        issueType: 'duplicate',
        field: 'id',
        details: `Duplicate ID: ${recordId}`,
      })
    }
    seenIds.add(recordId)

    // Check duplicate unique fields
    for (const field of uniqueFields) {
      const value = record[field]
      if (value) {
        const normalizedValue = String(value).trim().toLowerCase()
        if (uniqueFieldValues[field].has(normalizedValue)) {
          issues.push({
            collection,
            recordId,
            issueType: 'duplicate',
            field,
            details: `Duplicate ${field}: ${value}`,
          })
        }
        uniqueFieldValues[field].add(normalizedValue)
      }
    }
  }
}

/**
 * Check for invalid foreign keys
 */
function checkForeignKeys(
  collection: string,
  data: any[],
  exportDir: string,
  issues: DataIssue[]
): void {
  const relationships = FK_RELATIONSHIPS[collection as keyof typeof FK_RELATIONSHIPS]
  if (!relationships) return

  // Build ID sets for target collections
  const targetIdSets: Record<string, Set<string>> = {}

  for (const rel of relationships) {
    const targetData = loadCollection(exportDir, rel.targetCollection)
    targetIdSets[rel.targetCollection] = new Set(
      targetData.map(r => r._firebase_id || r.id)
    )
  }

  // Validate each record
  for (const record of data) {
    const recordId = record._firebase_id || record.id

    for (const rel of relationships) {
      const fkValue = record[rel.field]

      if (fkValue && !targetIdSets[rel.targetCollection].has(fkValue)) {
        issues.push({
          collection,
          recordId,
          issueType: 'invalid_fk',
          field: rel.field,
          details: `Invalid FK: ${rel.field}=${fkValue} (${rel.targetCollection} not found)`,
        })
      }
    }
  }
}

/**
 * Check for null required fields
 */
function checkRequiredFields(
  collection: string,
  data: any[],
  issues: DataIssue[]
): void {
  const requiredFields = REQUIRED_FIELDS[collection as keyof typeof REQUIRED_FIELDS]
  if (!requiredFields) return

  for (const record of data) {
    const recordId = record._firebase_id || record.id

    // Special handling for users (email OR phone required)
    if (collection === 'users') {
      const hasEmail = record.email && String(record.email).trim() !== ''
      const hasPhone = record.phone && String(record.phone).trim() !== ''

      if (!hasEmail && !hasPhone) {
        issues.push({
          collection,
          recordId,
          issueType: 'null_required',
          field: 'email|phone',
          details: 'Missing required: at least one of email or phone',
        })
      }
      continue
    }

    // Standard required field checks
    for (const field of requiredFields) {
      const value = record[field]
      if (value === null || value === undefined || String(value).trim() === '') {
        issues.push({
          collection,
          recordId,
          issueType: 'null_required',
          field,
          details: `Missing required field: ${field}`,
        })
      }
    }
  }
}

/**
 * Check for type mismatches
 */
function checkTypeMismatches(
  collection: string,
  data: any[],
  issues: DataIssue[]
): void {
  for (const record of data) {
    const recordId = record._firebase_id || record.id

    // Check ID is string
    if (record.id && typeof record.id !== 'string') {
      issues.push({
        collection,
        recordId,
        issueType: 'type_mismatch',
        field: 'id',
        details: `ID should be string, got ${typeof record.id}`,
      })
    }

    // Check date fields
    const dateFields = ['created_at', 'updated_at', 'synced_at', 'last_login']
    for (const field of dateFields) {
      if (record[field]) {
        const dateValue = new Date(record[field])
        if (isNaN(dateValue.getTime())) {
          issues.push({
            collection,
            recordId,
            issueType: 'type_mismatch',
            field,
            details: `Invalid date format: ${field}=${record[field]}`,
          })
        }
      }
    }

    // Check numeric fields
    const numericFields: Record<string, string[]> = {
      vehicles: ['seat_count', 'soghe'],
      invoices: ['amount', 'total'],
    }

    const fieldsToCheck = numericFields[collection] || []
    for (const field of fieldsToCheck) {
      if (record[field] !== undefined && record[field] !== null) {
        const numValue = Number(record[field])
        if (isNaN(numValue)) {
          issues.push({
            collection,
            recordId,
            issueType: 'type_mismatch',
            field,
            details: `Should be numeric: ${field}=${record[field]}`,
          })
        }
      }
    }

    // Check boolean fields
    const boolFields = ['is_active']
    for (const field of boolFields) {
      if (record[field] !== undefined && record[field] !== null) {
        const val = record[field]
        if (typeof val !== 'boolean' && val !== 'true' && val !== 'false' && val !== 0 && val !== 1) {
          issues.push({
            collection,
            recordId,
            issueType: 'type_mismatch',
            field,
            details: `Invalid boolean: ${field}=${record[field]}`,
          })
        }
      }
    }
  }
}

/**
 * Analyze all collections
 */
function analyzeData(exportDir: string): AnalysisReport {
  console.log('='.repeat(60))
  console.log('Firebase Export Data Analysis')
  console.log(`Export directory: ${exportDir}`)
  console.log('='.repeat(60))

  const issues: DataIssue[] = []

  // Get all collection names
  const allCollections = [
    ...COLLECTIONS.level1,
    ...COLLECTIONS.level2,
    ...COLLECTIONS.level3,
    ...COLLECTIONS.level4,
  ]

  for (const collection of allCollections) {
    console.log(`\nAnalyzing ${collection}...`)

    const data = loadCollection(exportDir, collection)
    if (data.length === 0) {
      console.log(`  ⚠ No data found`)
      continue
    }

    console.log(`  Records: ${data.length}`)

    // Run checks
    checkDuplicates(collection, data, issues)
    checkForeignKeys(collection, data, exportDir, issues)
    checkRequiredFields(collection, data, issues)
    checkTypeMismatches(collection, data, issues)

    const collectionIssues = issues.filter(i => i.collection === collection)
    console.log(`  Issues found: ${collectionIssues.length}`)
  }

  // Build summary
  const issuesByType: Record<IssueType, number> = {
    duplicate: 0,
    invalid_fk: 0,
    null_required: 0,
    type_mismatch: 0,
  }

  const issuesByCollection: Record<string, number> = {}

  for (const issue of issues) {
    issuesByType[issue.issueType]++
    issuesByCollection[issue.collection] = (issuesByCollection[issue.collection] || 0) + 1
  }

  const report: AnalysisReport = {
    analyzedAt: new Date().toISOString(),
    exportDir,
    totalIssues: issues.length,
    issuesByType,
    issuesByCollection,
    issues,
  }

  return report
}

/**
 * Print summary to console
 */
function printSummary(report: AnalysisReport): void {
  console.log('\n' + '='.repeat(60))
  console.log('Analysis Summary')
  console.log('='.repeat(60))

  console.log(`\nTotal Issues: ${report.totalIssues}`)

  console.log('\nIssues by Type:')
  for (const [type, count] of Object.entries(report.issuesByType)) {
    if (count > 0) {
      console.log(`  ${type}: ${count}`)
    }
  }

  console.log('\nIssues by Collection:')
  for (const [collection, count] of Object.entries(report.issuesByCollection)) {
    console.log(`  ${collection}: ${count}`)
  }

  if (report.totalIssues > 0) {
    console.log('\n⚠ Data quality issues detected. Review data-issues-report.json')
  } else {
    console.log('\n✓ No data quality issues found!')
  }

  console.log('='.repeat(60))
}

/**
 * Main execution
 */
async function main() {
  // Get most recent export directory
  const exportsBaseDir = join(process.cwd(), 'exports')

  if (!existsSync(exportsBaseDir)) {
    console.error('Error: exports/ directory not found. Run npm run etl:export first.')
    process.exit(1)
  }

  // Use latest export directory (assume format: YYYY-MM-DD)
  const fs = await import('fs')
  const exportDirs = fs.readdirSync(exportsBaseDir)
    .filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort()
    .reverse()

  if (exportDirs.length === 0) {
    console.error('Error: No export directories found in exports/')
    process.exit(1)
  }

  const latestExportDir = join(exportsBaseDir, exportDirs[0])
  console.log(`Using export: ${latestExportDir}\n`)

  // Run analysis
  const report = analyzeData(latestExportDir)

  // Print summary
  printSummary(report)

  // Write JSON report
  const reportPath = join(latestExportDir, 'data-issues-report.json')
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\nReport saved to: ${reportPath}`)

  process.exit(report.totalIssues > 0 ? 1 : 0)
}

// Run if executed directly
// Check if this is the main module using require.main for CommonJS compatibility
if (require.main === module) {
  main().catch(error => {
    console.error('Analysis failed:', error)
    process.exit(1)
  })
}

export { analyzeData }
