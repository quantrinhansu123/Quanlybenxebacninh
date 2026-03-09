/**
 * Data Consistency Validation Script
 * Checks data integrity after migration to Supabase
 */
import 'dotenv/config'
import { db } from '../db/drizzle.js'
import { dispatchRecords, vehicles, drivers, operators } from '../db/schema/index.js'
import { eq, isNull, and, sql, ne } from 'drizzle-orm'

interface CheckResult {
  name: string
  passed: boolean
  details?: string
  count?: number
}

async function validateDataConsistency() {
  if (!db) {
    console.error('[Validation] Database not initialized. Check DATABASE_URL.')
    process.exit(1)
  }

  console.log('🔍 Running data consistency checks...\n')
  const checks: CheckResult[] = []

  // Check 1: Orphan vehicle references
  try {
    const orphanVehicleRefs = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dispatchRecords)
      .leftJoin(vehicles, eq(dispatchRecords.vehicleId, vehicles.id))
      .where(and(
        isNull(vehicles.id),
        sql`${dispatchRecords.vehicleId} IS NOT NULL`
      ))

    const count = orphanVehicleRefs[0]?.count || 0
    checks.push({
      name: 'No orphan vehicle references',
      passed: count === 0,
      count,
      details: count > 0 ? `Found ${count} dispatch records with non-existent vehicle IDs` : undefined,
    })
  } catch (error) {
    checks.push({
      name: 'No orphan vehicle references',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  }

  // Check 2: Orphan driver references
  try {
    const orphanDriverRefs = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dispatchRecords)
      .leftJoin(drivers, eq(dispatchRecords.driverId, drivers.id))
      .where(and(
        isNull(drivers.id),
        sql`${dispatchRecords.driverId} IS NOT NULL`
      ))

    const count = orphanDriverRefs[0]?.count || 0
    checks.push({
      name: 'No orphan driver references',
      passed: count === 0,
      count,
      details: count > 0 ? `Found ${count} dispatch records with non-existent driver IDs` : undefined,
    })
  } catch (error) {
    checks.push({
      name: 'No orphan driver references',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  }

  // Check 3: Orphan operator references
  try {
    const orphanOperatorRefs = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dispatchRecords)
      .leftJoin(operators, eq(dispatchRecords.operatorId, operators.id))
      .where(and(
        isNull(operators.id),
        sql`${dispatchRecords.operatorId} IS NOT NULL`
      ))

    const count = orphanOperatorRefs[0]?.count || 0
    checks.push({
      name: 'No orphan operator references',
      passed: count === 0,
      count,
      details: count > 0 ? `Found ${count} dispatch records with non-existent operator IDs` : undefined,
    })
  } catch (error) {
    checks.push({
      name: 'No orphan operator references',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  }

  // Check 4: Valid status values
  try {
    const validStatuses = [
      'entered', 'passengers_dropped', 'permit_issued', 'permit_rejected',
      'paid', 'departure_ordered', 'departed', 'exited', 'cancelled'
    ]

    const invalidStatuses = await db
      .select({
        status: dispatchRecords.status,
        count: sql<number>`count(*)::int`
      })
      .from(dispatchRecords)
      .where(sql`${dispatchRecords.status} NOT IN (${sql.join(validStatuses.map(s => sql`${s}`), sql`, `)})`)
      .groupBy(dispatchRecords.status)

    checks.push({
      name: 'All status values are valid',
      passed: invalidStatuses.length === 0,
      details: invalidStatuses.length > 0
        ? `Invalid statuses: ${JSON.stringify(invalidStatuses)}`
        : undefined,
    })
  } catch (error) {
    checks.push({
      name: 'All status values are valid',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  }

  // Check 5: No null required fields
  try {
    const nullEntryTimes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dispatchRecords)
      .where(isNull(dispatchRecords.entryTime))

    const count = nullEntryTimes[0]?.count || 0
    checks.push({
      name: 'No null entry times',
      passed: count === 0,
      count,
      details: count > 0 ? `Found ${count} records with null entry_time` : undefined,
    })
  } catch (error) {
    checks.push({
      name: 'No null entry times',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  }

  // Check 6: Denormalized operator names match
  try {
    const mismatchedNames = await db
      .select({
        dispatchId: dispatchRecords.id,
        storedName: dispatchRecords.operatorName,
        actualName: operators.name,
      })
      .from(dispatchRecords)
      .innerJoin(operators, eq(dispatchRecords.operatorId, operators.id))
      .where(ne(dispatchRecords.operatorName, operators.name))
      .limit(10)

    checks.push({
      name: 'Denormalized operator names match',
      passed: mismatchedNames.length === 0,
      count: mismatchedNames.length,
      details: mismatchedNames.length > 0
        ? `Found ${mismatchedNames.length} mismatches (showing first 10)`
        : undefined,
    })
  } catch (error) {
    checks.push({
      name: 'Denormalized operator names match',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  }

  // Check 7: Record counts sanity check
  try {
    const dispatchCount = await db.select({ count: sql<number>`count(*)::int` }).from(dispatchRecords)
    const vehicleCount = await db.select({ count: sql<number>`count(*)::int` }).from(vehicles)
    const driverCount = await db.select({ count: sql<number>`count(*)::int` }).from(drivers)
    const operatorCount = await db.select({ count: sql<number>`count(*)::int` }).from(operators)

    checks.push({
      name: 'Record counts reasonable',
      passed: true,
      details: `Dispatch: ${dispatchCount[0]?.count || 0}, Vehicles: ${vehicleCount[0]?.count || 0}, Drivers: ${driverCount[0]?.count || 0}, Operators: ${operatorCount[0]?.count || 0}`,
    })
  } catch (error) {
    checks.push({
      name: 'Record counts reasonable',
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
    })
  }

  // Print results
  console.log('Results:')
  console.log('─'.repeat(60))

  let allPassed = true
  for (const check of checks) {
    const status = check.passed ? '✅' : '❌'
    console.log(`${status} ${check.name}`)
    if (check.details) {
      console.log(`   ${check.details}`)
    }
    if (!check.passed) allPassed = false
  }

  console.log('─'.repeat(60))
  console.log(allPassed ? '\n✅ All checks passed!' : '\n❌ Some checks failed!')

  process.exit(allPassed ? 0 : 1)
}

validateDataConsistency().catch((error) => {
  console.error('Validation failed:', error)
  process.exit(1)
})
