/**
 * Measure real server startup time by adding instrumentation to index.ts
 */
import 'dotenv/config'
import { performance } from 'perf_hooks'

const STARTUP_START = performance.now()

async function measureRealStartup() {
  console.log('\n=== REAL SERVER STARTUP MEASUREMENT ===\n')

  // Intercept console.log to measure "Server is running" time
  const originalLog = console.log
  let serverReadyTime = 0

  console.log = function (...args: unknown[]) {
    const message = args.join(' ')
    if (message.includes('Server is running')) {
      serverReadyTime = performance.now() - STARTUP_START
      originalLog.call(console, `[TIMING] Server ready in ${serverReadyTime.toFixed(2)}ms\n`)
    }
    originalLog.apply(console, args)
  }

  // Now import and run the actual server
  console.log('Importing server/src/index.ts...\n')

  try {
    await import('../index.js')

    // Wait a bit for async initialization
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('\n=== MEASUREMENT COMPLETE ===\n')

    if (serverReadyTime > 0) {
      console.log(`Server startup time: ${serverReadyTime.toFixed(2)}ms`)

      if (serverReadyTime > 5000) {
        console.log('\n⚠️  SLOW STARTUP (>5s)')
        console.log('   → Expected ~1.5-2s based on profiling')
        console.log('   → Extra 3-4s delay is unexplained\n')
      } else if (serverReadyTime > 2000) {
        console.log('\n⚠️  MODERATE DELAY (>2s)')
        console.log('   → Route imports + DB test = ~1.7s (expected)')
        console.log('   → Extra delay likely from:')
        console.log('     - Heavy route file imports')
        console.log('     - Module-level code execution')
        console.log('     - Network delays\n')
      } else {
        console.log('\n✓ Startup time is acceptable\n')
      }
    } else {
      console.log('⚠️  Could not measure server ready time')
      console.log('   (Server might not have started)\n')
    }

    process.exit(0)
  } catch (err) {
    console.error('Failed to import server:', err)
    process.exit(1)
  }
}

measureRealStartup()
