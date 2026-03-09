/**
 * Test Database Setup
 * Utilities for setting up test database with Drizzle
 *
 * Note: For unit tests, we use mocks. This file is for integration tests
 * that need a real database connection.
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../db/schema/index.js'

// Use separate test database or mock
const testConnectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL

let testClient: ReturnType<typeof postgres> | null = null
let testDb: ReturnType<typeof drizzle> | null = null

/**
 * Get test database instance (lazy init)
 */
export function getTestDb() {
  if (!testDb && testConnectionString) {
    testClient = postgres(testConnectionString, {
      max: 5,
      idle_timeout: 10,
    })
    testDb = drizzle(testClient, { schema })
  }
  return testDb
}

/**
 * Close test database connection
 */
export async function closeTestDb() {
  if (testClient) {
    await testClient.end()
    testClient = null
    testDb = null
  }
}

/**
 * Generate unique test ID
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create test operator fixture
 */
export function createTestOperator(overrides: Partial<typeof schema.operators.$inferInsert> = {}) {
  return {
    id: generateTestId('operator'),
    code: 'TEST01',
    name: 'Test Operator',
    shortName: 'TEST',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Create test vehicle fixture
 */
export function createTestVehicle(operatorId: string, overrides: Partial<typeof schema.vehicles.$inferInsert> = {}) {
  return {
    id: generateTestId('vehicle'),
    plateNumber: `TEST-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    operatorId,
    seatCount: 45,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Create test driver fixture
 */
export function createTestDriver(operatorId: string, overrides: Partial<typeof schema.drivers.$inferInsert> = {}) {
  return {
    id: generateTestId('driver'),
    fullName: 'Test Driver',
    operatorId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Create test dispatch record fixture
 */
export function createTestDispatch(
  vehicleId: string,
  overrides: Partial<typeof schema.dispatchRecords.$inferInsert> = {}
) {
  return {
    id: generateTestId('dispatch'),
    vehicleId,
    currentStatus: 'entered' as const,
    entryTime: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Mock Drizzle database for unit tests
 * Use this when you don't need a real DB connection
 */
export function createMockDb() {
  return {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
    transaction: jest.fn().mockImplementation((fn) => fn({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    })),
  }
}
