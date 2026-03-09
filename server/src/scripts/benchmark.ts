/**
 * Performance Benchmark Script for Supabase/Drizzle
 * Tests query performance against defined thresholds
 */
import 'dotenv/config'
import { db } from '../db/drizzle.js'
import { operators, vehicles, dispatchRecords } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'

interface BenchmarkResult {
  name: string
  count?: number
  timeMs: number
  threshold: number
  passed: boolean
}

/**
 * Measure execution time of an async function
 */
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  return { result, timeMs: end - start }
}

/**
 * Print benchmark result
 */
function printResult(result: BenchmarkResult): void {
  console.log(`\nTest ${result.name}:`)
  if (result.count !== undefined) {
    console.log(`  Count: ${result.count} records`)
  }
  console.log(`  Time: ${result.timeMs.toFixed(2)}ms`)
  console.log(`  Status: ${result.passed ? '✓ PASS' : '✗ FAIL'} (< ${result.threshold}ms)`)
}

/**
 * Run all benchmarks
 */
async function runBenchmark(): Promise<void> {
  if (!db) {
    console.error('Database not initialized. Check DATABASE_URL.')
    process.exit(1)
  }

  console.log('=====================================')
  console.log('Performance Benchmark - Supabase/Drizzle')
  console.log('=====================================')

  const results: BenchmarkResult[] = []

  // Test 1: List Operators (simple select)
  console.log('\n[1/4] Testing: List Operators...')
  const { result: operatorsList, timeMs: listTime } = await measureTime(async () => {
    return await db.select().from(operators).limit(1000)
  })

  const listResult: BenchmarkResult = {
    name: '1: List Operators',
    count: operatorsList.length,
    timeMs: listTime,
    threshold: 500,
    passed: listTime < 500,
  }
  results.push(listResult)
  printResult(listResult)

  // Test 2: Single Lookups (100x)
  console.log('\n[2/4] Testing: Single Lookups (100x)...')

  if (operatorsList.length === 0) {
    console.warn('⚠ No operators found. Skipping single lookup test.')
    const lookupResult: BenchmarkResult = {
      name: '2: Single Lookups (100x)',
      timeMs: 0,
      threshold: 50,
      passed: false,
    }
    results.push(lookupResult)
    console.log('\nTest 2: Single Lookups (100x):')
    console.log('  Status: ⊘ SKIPPED (no data)')
  } else {
    const firstOperatorId = operatorsList[0].id
    const lookupTimes: number[] = []

    for (let i = 0; i < 100; i++) {
      const { timeMs } = await measureTime(async () => {
        return await db.select().from(operators).where(eq(operators.id, firstOperatorId))
      })
      lookupTimes.push(timeMs)
    }

    const avgLookupTime = lookupTimes.reduce((sum, t) => sum + t, 0) / lookupTimes.length

    const lookupResult: BenchmarkResult = {
      name: '2: Single Lookups (100x)',
      timeMs: avgLookupTime,
      threshold: 50,
      passed: avgLookupTime < 50,
    }
    results.push(lookupResult)
    printResult(lookupResult)
  }

  // Test 3: Complex Join (dispatch + vehicle + operator)
  console.log('\n[3/4] Testing: Complex Join...')
  const { result: joinData, timeMs: joinTime } = await measureTime(async () => {
    return await db
      .select({
        dispatchId: dispatchRecords.id,
        dispatchDate: dispatchRecords.dispatchDate,
        vehiclePlate: vehicles.licensePlate,
        vehicleType: vehicles.vehicleTypeId,
        operatorName: operators.name,
      })
      .from(dispatchRecords)
      .leftJoin(vehicles, eq(dispatchRecords.vehicleId, vehicles.id))
      .leftJoin(operators, eq(dispatchRecords.operatorId, operators.id))
      .limit(1000)
  })

  const joinResult: BenchmarkResult = {
    name: '3: Complex Join (dispatch + vehicle + operator)',
    count: joinData.length,
    timeMs: joinTime,
    threshold: 1000,
    passed: joinTime < 1000,
  }
  results.push(joinResult)
  printResult(joinResult)

  // Test 4: Insert Operation
  console.log('\n[4/4] Testing: Insert Operation...')
  const testOperator = {
    name: `BENCHMARK_TEST_${Date.now()}`,
    contactInfo: 'benchmark@test.com',
    address: 'Benchmark Test Address',
    status: 'active' as const,
  }

  const { result: insertedOperator, timeMs: insertTime } = await measureTime(async () => {
    return await db.insert(operators).values(testOperator).returning()
  })

  // Cleanup: Delete test record
  if (insertedOperator[0]?.id) {
    await db.delete(operators).where(eq(operators.id, insertedOperator[0].id))
  }

  const insertResult: BenchmarkResult = {
    name: '4: Insert Operation',
    timeMs: insertTime,
    threshold: 100,
    passed: insertTime < 100,
  }
  results.push(insertResult)
  printResult(insertResult)

  // Summary
  const passed = results.filter((r) => r.passed).length
  const total = results.length
  const skipped = results.filter((r) => r.timeMs === 0 && !r.passed).length

  console.log('\n=====================================')
  console.log(`Summary: ${passed}/${total} tests passed`)
  if (skipped > 0) {
    console.log(`         ${skipped} test(s) skipped (no data)`)
  }
  console.log('=====================================')

  // Exit with success if all non-skipped tests passed
  const effectiveTests = total - skipped
  const shouldPass = passed === effectiveTests
  process.exit(shouldPass ? 0 : 1)
}

// Run benchmark
runBenchmark().catch((error) => {
  console.error('Benchmark failed:', error)
  process.exit(1)
})
