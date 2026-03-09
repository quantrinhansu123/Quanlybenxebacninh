/**
 * Test server startup with different strategies
 */
import 'dotenv/config'

async function testActualServerStartup() {
  console.log('\n=== ACTUAL SERVER STARTUP TEST ===\n')

  const totalStart = performance.now()

  // Simulate index.ts import sequence
  console.log('Step 1: Import express, cors, middleware...')
  let stepStart = performance.now()
  await import('express')
  await import('cors')
  console.log(`   Time: ${(performance.now() - stepStart).toFixed(2)}ms\n`)

  console.log('Step 2: Import 22 route files...')
  stepStart = performance.now()

  const routes = [
    '../routes/auth.routes.js',
    '../modules/fleet/driver.routes.js',
    '../modules/fleet/vehicle.routes.js',
    '../routes/operator.routes.js',
    '../routes/location.routes.js',
    '../routes/route.routes.js',
    '../routes/schedule.routes.js',
    '../routes/vehicle-type.routes.js',
    '../routes/shift.routes.js',
    '../modules/dispatch/dispatch.routes.js',
    '../routes/violation.routes.js',
    '../routes/invoice.routes.js',
    '../routes/service-charge.routes.js',
    '../routes/service.routes.js',
    '../routes/service-formula.routes.js',
    '../routes/report.routes.js',
    '../routes/dashboard.routes.js',
    '../routes/upload.routes.js',
    '../routes/vehicle-badge.routes.js',
    '../routes/province.routes.js',
    '../modules/chat/chat.routes.js',
    '../routes/quanly-data.routes.js',
  ]

  // These route files import db/drizzle.ts at module level
  // which triggers postgres client creation
  for (const route of routes) {
    try {
      await import(route)
    } catch (e) {
      // Ignore errors for test
    }
  }

  const routeTime = performance.now() - stepStart
  console.log(`   Time: ${routeTime.toFixed(2)}ms`)
  console.log(`   → This includes db/drizzle.ts import (if routes use it)\n`)

  console.log('Step 3: Test database connection...')
  stepStart = performance.now()

  const { testDrizzleConnection } = await import('../db/drizzle.js')
  await testDrizzleConnection()

  const dbTestTime = performance.now() - stepStart
  console.log(`   Time: ${dbTestTime.toFixed(2)}ms`)
  console.log(`   → This executes SELECT NOW() query\n`)

  const totalTime = performance.now() - totalStart

  console.log('=== RESULTS ===\n')
  console.log(`Total startup time: ${totalTime.toFixed(2)}ms`)
  console.log(`Route imports: ${routeTime.toFixed(2)}ms (${((routeTime / totalTime) * 100).toFixed(1)}%)`)
  console.log(`DB test: ${dbTestTime.toFixed(2)}ms (${((dbTestTime / totalTime) * 100).toFixed(1)}%)\n`)

  console.log('=== BOTTLENECK ANALYSIS ===\n')

  if (routeTime > 500) {
    console.log('⚠️  Route imports are slow')
    console.log('   Possible causes:')
    console.log('   1. Routes import db/drizzle.ts → triggers postgres client creation')
    console.log('   2. Routes import heavy dependencies')
    console.log('   3. Routes have module-level code execution\n')
  }

  if (dbTestTime > 500) {
    console.log('⚠️  Database test connection is slow')
    console.log('   → First query makes actual TCP connection (~700ms)')
    console.log('   → This is unavoidable but can be moved to background\n')
  }

  console.log('Expected behavior in index.ts:')
  console.log('1. Import routes (includes db/drizzle import): ~500ms')
  console.log('2. Dynamic import config/database: ~50ms (just re-export)')
  console.log('3. testFirebaseConnection (deprecated): ~0ms (returns false)')
  console.log('4. app.listen(): ~5ms')
  console.log('5. First DB query from route handler: ~700ms (lazy connection)\n')

  console.log('Current issue:')
  console.log('→ testFirebaseConnection in index.ts likely doing extra work')
  console.log('→ Or there\'s blocking operation we haven\'t measured yet\n')

  process.exit(0)
}

testActualServerStartup().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
