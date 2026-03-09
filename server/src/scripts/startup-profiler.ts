/**
 * Startup Performance Profiler
 * Measures module import and initialization times
 */

interface TimingResult {
  name: string
  duration: number
  start: number
  end: number
}

const timings: TimingResult[] = []

function startTiming(name: string): () => void {
  const start = performance.now()
  return () => {
    const end = performance.now()
    const duration = end - start
    timings.push({ name, duration, start, end })
    console.log(`[TIMING] ${name}: ${duration.toFixed(2)}ms`)
  }
}

async function profileStartup() {
  console.log('\n=== SERVER STARTUP PROFILING ===\n')
  const scriptStart = performance.now()

  // 1. Environment variables
  let endTiming = startTiming('Load dotenv')
  await import('dotenv/config')
  endTiming()

  // 2. Core Express
  endTiming = startTiming('Import express + cors')
  await import('express')
  await import('cors')
  endTiming()

  // 3. Database client (postgres.js)
  endTiming = startTiming('Import postgres.js driver')
  await import('postgres')
  endTiming()

  // 4. Drizzle ORM + Schema
  endTiming = startTiming('Import drizzle-orm/postgres-js')
  await import('drizzle-orm/postgres-js')
  endTiming()

  endTiming = startTiming('Import db/schema (all tables)')
  await import('../db/schema/index.js')
  endTiming()

  // 5. Drizzle client initialization
  endTiming = startTiming('Initialize Drizzle client (db/drizzle.ts)')
  const drizzleModule = await import('../db/drizzle.js')
  endTiming()

  // 6. Test database connection
  endTiming = startTiming('Test Postgres connection (SELECT NOW())')
  const isConnected = await drizzleModule.testDrizzleConnection()
  endTiming()

  if (!isConnected) {
    console.error('⚠️  Database connection failed!')
  }

  // 7. Route imports (static)
  const routeFiles = [
    'auth.routes',
    'modules/fleet/driver.routes',
    'modules/fleet/vehicle.routes',
    'operator.routes',
    'location.routes',
    'route.routes',
    'schedule.routes',
    'vehicle-type.routes',
    'shift.routes',
    'modules/dispatch/dispatch.routes',
    'violation.routes',
    'invoice.routes',
    'service-charge.routes',
    'service.routes',
    'service-formula.routes',
    'report.routes',
    'dashboard.routes',
    'upload.routes',
    'vehicle-badge.routes',
    'province.routes',
    'modules/chat/chat.routes',
    'quanly-data.routes',
  ]

  console.log('\n--- Route Imports ---')
  for (const route of routeFiles) {
    endTiming = startTiming(`Import routes/${route}`)
    try {
      await import(`../routes/${route}.js`)
    } catch (e) {
      try {
        await import(`../${route}.js`)
      } catch (err) {
        console.error(`❌ Failed to import ${route}:`, err)
      }
    }
    endTiming()
  }

  // 8. Dynamic imports (cache preloading)
  console.log('\n--- Cache Service Imports ---')

  endTiming = startTiming('Import vehicle-cache.service')
  await import('../modules/fleet/services/vehicle-cache.service.js')
  endTiming()

  endTiming = startTiming('Import cached-data.service')
  await import('../services/cached-data.service.js')
  endTiming()

  endTiming = startTiming('Import chat-cache.service')
  await import('../modules/chat/services/chat-cache.service.js')
  endTiming()

  const totalDuration = performance.now() - scriptStart

  // Summary
  console.log('\n=== TIMING SUMMARY ===\n')

  // Sort by duration (slowest first)
  const sorted = [...timings].sort((a, b) => b.duration - a.duration)

  console.log('Top 10 slowest operations:')
  sorted.slice(0, 10).forEach((t, i) => {
    const pct = ((t.duration / totalDuration) * 100).toFixed(1)
    console.log(`${i + 1}. ${t.name}: ${t.duration.toFixed(2)}ms (${pct}%)`)
  })

  console.log(`\nTotal profiling time: ${totalDuration.toFixed(2)}ms`)

  // Group analysis
  const dbTimings = timings.filter(t =>
    t.name.includes('postgres') ||
    t.name.includes('drizzle') ||
    t.name.includes('schema') ||
    t.name.includes('connection')
  )
  const routeTimings = timings.filter(t => t.name.includes('routes'))
  const cacheTimings = timings.filter(t => t.name.includes('cache'))

  const dbTotal = dbTimings.reduce((sum, t) => sum + t.duration, 0)
  const routeTotal = routeTimings.reduce((sum, t) => sum + t.duration, 0)
  const cacheTotal = cacheTimings.reduce((sum, t) => sum + t.duration, 0)

  console.log('\n--- Category Breakdown ---')
  console.log(`Database setup: ${dbTotal.toFixed(2)}ms (${((dbTotal / totalDuration) * 100).toFixed(1)}%)`)
  console.log(`Route imports: ${routeTotal.toFixed(2)}ms (${((routeTotal / totalDuration) * 100).toFixed(1)}%)`)
  console.log(`Cache services: ${cacheTotal.toFixed(2)}ms (${((cacheTotal / totalDuration) * 100).toFixed(1)}%)`)
  console.log(`Other: ${(totalDuration - dbTotal - routeTotal - cacheTotal).toFixed(2)}ms`)

  console.log('\n=== RECOMMENDATIONS ===\n')

  if (dbTotal > 1000) {
    console.log('⚠️  Database initialization is slow (>1s)')
    console.log('   - Check if postgres client is making eager connections')
    console.log('   - Consider lazy connection initialization')
    console.log('   - Verify DATABASE_URL points to connection pooler (port 6543)')
  }

  if (routeTotal > 500) {
    console.log('⚠️  Route imports are slow (>500ms)')
    console.log('   - Consider lazy route loading')
    console.log('   - Check for heavy imports in route files')
  }

  const slowImports = sorted.filter(t => t.duration > 200)
  if (slowImports.length > 0) {
    console.log('\n⚠️  Slow imports detected (>200ms):')
    slowImports.forEach(t => {
      console.log(`   - ${t.name}: ${t.duration.toFixed(2)}ms`)
    })
  }

  console.log('\n✓ Profile complete\n')
}

// Run profiler
profileStartup().catch(err => {
  console.error('Profiling failed:', err)
  process.exit(1)
})
