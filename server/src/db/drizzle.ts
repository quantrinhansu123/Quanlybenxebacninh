/**
 * Drizzle Database Client
 * Connects to Supabase PostgreSQL using connection pooling
 */
import 'dotenv/config' // Load env vars before anything else
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

// Connection string from environment
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn('[Drizzle] DATABASE_URL not set. Supabase features will be unavailable.')
}

// Serverless-optimized connection pooling
// On Vercel: fewer connections per instance (PgBouncer multiplexes transactions)
// Locally: more connections for development convenience
const isServerless = !!process.env.VERCEL

const client = connectionString
  ? postgres(connectionString, {
      max: isServerless ? 3 : 10,
      idle_timeout: isServerless ? 10 : 30,
      connect_timeout: isServerless ? 5 : 15,
      prepare: false, // Required for Supabase Transaction Mode
      max_lifetime: isServerless ? 300 : 60 * 30,
    })
  : null

// Create drizzle instance with schema for type inference
export const db = client ? drizzle(client, { schema }) : null

// Export type for use in repositories
export type Database = typeof db

/**
 * Execute operations within a transaction
 * Rollback automatically on error
 *
 * @example
 * await withTransaction(async (tx) => {
 *   await tx.insert(table1).values(data1)
 *   await tx.insert(table2).values(data2)
 * })
 */
export async function withTransaction<T>(
  fn: (tx: NonNullable<typeof db>) => Promise<T>
): Promise<T> {
  if (!db) {
    throw new Error('[Drizzle] Database not initialized. Check DATABASE_URL.')
  }

  return db.transaction(async (tx) => {
    return fn(tx as unknown as NonNullable<typeof db>)
  })
}

/**
 * Test database connection
 * Call this on startup to verify configuration
 */
export async function testDrizzleConnection(): Promise<boolean> {
  if (!db) {
    console.error('[Drizzle] Database client not initialized. Check DATABASE_URL.')
    return false
  }

  try {
    // Simple query to test connection
    const result = await db.execute('SELECT NOW() as current_time')
    console.log('[Drizzle] Connection test: SUCCESS at', result[0]?.current_time)
    return true
  } catch (error: unknown) {
    console.error('[Drizzle] Connection test: FAILED -', error)
    return false
  }
}

/**
 * Gracefully close database connection
 * Call this on server shutdown
 */
export async function closeDrizzleConnection(): Promise<void> {
  if (client) {
    await client.end()
    console.log('[Drizzle] Database connection closed.')
  }
}
