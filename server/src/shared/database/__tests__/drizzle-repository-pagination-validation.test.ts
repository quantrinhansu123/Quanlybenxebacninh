/**
 * Drizzle Repository Pagination Validation Tests
 * Unit tests for pagination parameter validation logic
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { DrizzleRepository } from '../drizzle-repository.js'
import { ErrorCode } from '../../errors/app-error.js'
import { PgTable, PgColumn } from 'drizzle-orm/pg-core'

/**
 * Mock table and column for testing
 */
const mockTable = {} as PgTable
const mockIdColumn = {} as PgColumn

/**
 * Concrete repository implementation for testing
 */
class TestRepository extends DrizzleRepository<
  typeof mockTable,
  { id: string; name: string },
  { name: string }
> {
  protected table = mockTable
  protected idColumn = mockIdColumn

  // Expose protected method for testing
  public testValidatePagination(limit?: number, offset?: number) {
    return this.validatePagination(limit, offset)
  }
}

// Mock the database module to prevent real database calls
jest.mock('../../../db/drizzle', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
  },
}))

describe('DrizzleRepository Pagination Validation', () => {
  let repository: TestRepository

  beforeEach(() => {
    repository = new TestRepository()
    jest.clearAllMocks()
  })

  describe('validatePagination', () => {
    it('should apply default limit (10) and offset (0) when not provided', () => {
      const result = repository.testValidatePagination()

      expect(result.limit).toBe(10)
      expect(result.offset).toBe(0)
    })

    it('should use provided valid limit and offset', () => {
      const result = repository.testValidatePagination(20, 5)

      expect(result.limit).toBe(20)
      expect(result.offset).toBe(5)
    })

    it('should throw error for negative limit with correct message', () => {
      expect(() => {
        repository.testValidatePagination(-1, 0)
      }).toThrow('Limit must be non-negative')
    })

    it('should throw error for negative offset with correct message', () => {
      expect(() => {
        repository.testValidatePagination(10, -1)
      }).toThrow('Offset must be non-negative')
    })

    it('should throw ValidationError with code VALIDATION_ERROR for negative limit', () => {
      try {
        repository.testValidatePagination(-1, 0)
        fail('Should have thrown error')
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
        expect(error.statusCode).toBe(400)
        expect(error.message).toBe('Limit must be non-negative')
      }
    })

    it('should throw ValidationError with code VALIDATION_ERROR for negative offset', () => {
      try {
        repository.testValidatePagination(10, -1)
        fail('Should have thrown error')
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
        expect(error.statusCode).toBe(400)
        expect(error.message).toBe('Offset must be non-negative')
      }
    })

    it('should cap limit at MAX_LIMIT (1000) to prevent DoS', () => {
      const result = repository.testValidatePagination(2000, 0)

      expect(result.limit).toBe(1000)
      expect(result.offset).toBe(0)
    })

    it('should accept zero as valid limit and offset', () => {
      const result = repository.testValidatePagination(0, 0)

      expect(result.limit).toBe(0)
      expect(result.offset).toBe(0)
    })

    it('should accept limit exactly at MAX_LIMIT (1000)', () => {
      const result = repository.testValidatePagination(1000, 0)

      expect(result.limit).toBe(1000)
      expect(result.offset).toBe(0)
    })

    it('should include error details with field and value for negative limit', () => {
      try {
        repository.testValidatePagination(-5, 0)
        fail('Should have thrown error')
      } catch (error: any) {
        expect(error.details).toBeDefined()
        expect(error.details).toHaveLength(1)
        expect(error.details[0].field).toBe('limit')
        expect(error.details[0].value).toBe(-5)
        expect(error.details[0].message).toBe('Limit cannot be negative')
      }
    })

    it('should include error details with field and value for negative offset', () => {
      try {
        repository.testValidatePagination(10, -3)
        fail('Should have thrown error')
      } catch (error: any) {
        expect(error.details).toBeDefined()
        expect(error.details).toHaveLength(1)
        expect(error.details[0].field).toBe('offset')
        expect(error.details[0].value).toBe(-3)
        expect(error.details[0].message).toBe('Offset cannot be negative')
      }
    })

    it('should handle large positive limit values by capping', () => {
      const result = repository.testValidatePagination(999999, 100)

      expect(result.limit).toBe(1000) // Capped at MAX_LIMIT
      expect(result.offset).toBe(100) // Not affected
    })

    it('should handle undefined limit with default', () => {
      const result = repository.testValidatePagination(undefined, 50)

      expect(result.limit).toBe(10) // Default
      expect(result.offset).toBe(50)
    })

    it('should handle undefined offset with default', () => {
      const result = repository.testValidatePagination(25, undefined)

      expect(result.limit).toBe(25)
      expect(result.offset).toBe(0) // Default
    })
  })
})
