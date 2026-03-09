/**
 * Test Drizzle Connection Script
 * Run: npx tsx src/scripts/test-drizzle-connection.ts
 */
import 'dotenv/config'
import { testDrizzleConnection, closeDrizzleConnection, db } from '../db/drizzle'
import { operators } from '../db/schema'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('=== Drizzle Connection Test ===\n')

  // Test 1: Basic connection
  console.log('1. Testing basic connection...')
  const connected = await testDrizzleConnection()
  if (!connected) {
    console.error('❌ Basic connection failed. Check DATABASE_URL.')
    process.exit(1)
  }
  console.log('✅ Basic connection successful\n')

  // Test 2: Check if tables exist
  console.log('2. Checking if tables exist...')
  if (!db) {
    console.error('❌ Database client not available')
    process.exit(1)
  }

  try {
    const tableCheck = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    if (tableCheck.length === 0) {
      console.log('⚠️  No tables found. Run migrations first: npm run db:push')
    } else {
      console.log('✅ Found tables:')
      tableCheck.forEach((row: { table_name?: string }) => {
        console.log(`   - ${row.table_name}`)
      })
    }
    console.log()
  } catch (error) {
    console.log('⚠️  Could not check tables (may need migration first)\n')
  }

  // Test 3: Try a simple query on operators table
  console.log('3. Testing query on operators table...')
  try {
    const result = await db.select().from(operators).limit(1)
    console.log(`✅ Query successful. Found ${result.length} operator(s).\n`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('does not exist')) {
      console.log('⚠️  operators table does not exist. Run migrations first.\n')
    } else {
      console.error('❌ Query failed:', message, '\n')
    }
  }

  // Cleanup
  await closeDrizzleConnection()
  console.log('=== Test Complete ===')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
