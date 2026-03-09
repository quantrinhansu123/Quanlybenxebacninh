/**
 * Smoke Test Script
 * Verify all critical API endpoints are working after deployment
 * Usage: npm run smoke-test -- --url=http://localhost:3000
 */
import 'dotenv/config'

interface TestEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  expectStatus: number
  requiresAuth: boolean
  body?: Record<string, unknown>
  description: string
}

const ENDPOINTS: TestEndpoint[] = [
  // Health check
  { method: 'GET', path: '/health', expectStatus: 200, requiresAuth: false, description: 'Health check' },

  // Auth (no token needed for login)
  { method: 'POST', path: '/api/auth/login', expectStatus: 401, requiresAuth: false, body: { username: 'invalid', password: 'invalid' }, description: 'Auth login (invalid creds)' },

  // Core endpoints (require auth)
  { method: 'GET', path: '/api/dispatch', expectStatus: 200, requiresAuth: true, description: 'List dispatches' },
  { method: 'GET', path: '/api/vehicles', expectStatus: 200, requiresAuth: true, description: 'List vehicles' },
  { method: 'GET', path: '/api/drivers', expectStatus: 200, requiresAuth: true, description: 'List drivers' },
  { method: 'GET', path: '/api/operators', expectStatus: 200, requiresAuth: true, description: 'List operators' },
  { method: 'GET', path: '/api/routes', expectStatus: 200, requiresAuth: true, description: 'List routes' },
  { method: 'GET', path: '/api/shifts', expectStatus: 200, requiresAuth: true, description: 'List shifts' },
  { method: 'GET', path: '/api/schedules', expectStatus: 200, requiresAuth: true, description: 'List schedules' },

  // Dashboard & Reports
  { method: 'GET', path: '/api/dashboard/summary', expectStatus: 200, requiresAuth: true, description: 'Dashboard summary' },

  // Reference data
  { method: 'GET', path: '/api/vehicle-types', expectStatus: 200, requiresAuth: true, description: 'List vehicle types' },
  { method: 'GET', path: '/api/vehicle-badges', expectStatus: 200, requiresAuth: true, description: 'List vehicle badges' },
  { method: 'GET', path: '/api/provinces', expectStatus: 200, requiresAuth: true, description: 'List provinces' },
  { method: 'GET', path: '/api/services', expectStatus: 200, requiresAuth: true, description: 'List services' },
]

async function runSmokeTests(baseUrl: string, authToken?: string): Promise<boolean> {
  console.log(`\n🔥 Running smoke tests against ${baseUrl}\n`)
  console.log('─'.repeat(60))

  let passed = 0
  let failed = 0
  let skipped = 0

  for (const endpoint of ENDPOINTS) {
    // Skip auth-required endpoints if no token
    if (endpoint.requiresAuth && !authToken) {
      console.log(`⏭️  SKIP ${endpoint.method.padEnd(6)} ${endpoint.path} - No auth token`)
      skipped++
      continue
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (endpoint.requiresAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers,
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
      })

      if (response.status === endpoint.expectStatus) {
        console.log(`✅ PASS ${endpoint.method.padEnd(6)} ${endpoint.path}`)
        passed++
      } else {
        console.log(`❌ FAIL ${endpoint.method.padEnd(6)} ${endpoint.path} - Expected ${endpoint.expectStatus}, got ${response.status}`)
        failed++
      }
    } catch (error) {
      console.log(`❌ FAIL ${endpoint.method.padEnd(6)} ${endpoint.path} - ${error instanceof Error ? error.message : 'Unknown error'}`)
      failed++
    }
  }

  console.log('─'.repeat(60))
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${skipped} skipped`)
  console.log(`   Total: ${ENDPOINTS.length} endpoints tested\n`)

  if (failed > 0) {
    console.log('❌ SMOKE TESTS FAILED - Do not proceed with deployment\n')
    return false
  }

  if (skipped > 0) {
    console.log('⚠️  SMOKE TESTS PASSED WITH SKIPS - Provide auth token for full coverage\n')
    console.log('   Usage: AUTH_TOKEN=xxx npm run smoke-test\n')
  } else {
    console.log('✅ ALL SMOKE TESTS PASSED - Safe to proceed\n')
  }

  return true
}

// Parse CLI arguments
const args = process.argv.slice(2)
const urlArg = args.find(a => a.startsWith('--url='))
const baseUrl = urlArg?.split('=')[1] || process.env.SMOKE_TEST_URL || 'http://localhost:3000'
const authToken = process.env.AUTH_TOKEN

runSmokeTests(baseUrl, authToken)
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Smoke test failed:', error)
    process.exit(1)
  })
