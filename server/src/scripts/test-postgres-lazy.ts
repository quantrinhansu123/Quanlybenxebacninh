/**
 * Test if postgres.js makes eager or lazy connections
 */
import 'dotenv/config'
import postgres from 'postgres'

async function testLazyConnection() {
  console.log('\n=== POSTGRES CONNECTION TEST ===\n')

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ DATABASE_URL not set')
    return
  }

  console.log('1. Creating postgres client...')
  const start1 = performance.now()

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  })

  const duration1 = performance.now() - start1
  console.log(`   ✓ Client created in ${duration1.toFixed(2)}ms`)
  console.log('   Question: Did it connect to database yet?\n')

  console.log('2. Executing first query (SELECT NOW())...')
  const start2 = performance.now()

  const result = await client`SELECT NOW() as current_time`

  const duration2 = performance.now() - start2
  console.log(`   ✓ Query executed in ${duration2.toFixed(2)}ms`)
  console.log(`   Result: ${result[0]?.current_time}\n`)

  console.log('3. Executing second query...')
  const start3 = performance.now()

  await client`SELECT 1 as test`

  const duration3 = performance.now() - start3
  console.log(`   ✓ Second query in ${duration3.toFixed(2)}ms\n`)

  // Cleanup
  await client.end()

  console.log('=== ANALYSIS ===\n')

  if (duration1 > 500) {
    console.log('⚠️  Client creation is slow (>500ms)')
    console.log('   → This suggests EAGER connection')
    console.log('   → postgres.js is connecting immediately at creation\n')
  } else {
    console.log('✓ Client creation is fast (<500ms)')
    console.log('   → This suggests LAZY connection\n')
  }

  if (duration2 > 500) {
    console.log('⚠️  First query is slow (>500ms)')
    console.log('   → Connection is made on first query (lazy)\n')
  } else {
    console.log('✓ First query is fast (<500ms)')
    console.log('   → Connection was already established\n')
  }

  if (duration3 < 100) {
    console.log('✓ Second query is fast (<100ms)')
    console.log('   → Connection is reused (pooling works)\n')
  }

  console.log('Summary:')
  console.log(`- Client creation: ${duration1.toFixed(2)}ms`)
  console.log(`- First query: ${duration2.toFixed(2)}ms`)
  console.log(`- Second query: ${duration3.toFixed(2)}ms`)
  console.log(`- Total: ${(duration1 + duration2 + duration3).toFixed(2)}ms\n`)

  console.log('Recommendation:')
  if (duration1 > 100 || duration2 > 500) {
    console.log('→ Make connection lazy by NOT creating client at module level')
    console.log('→ Create client only when first query is executed')
    console.log('→ Or create client in app.listen() callback\n')
  } else {
    console.log('→ Connection is already optimized\n')
  }
}

testLazyConnection().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
