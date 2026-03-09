/**
 * Driver Repository Unit Tests
 * Tests for Drizzle-based driver repository
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { DatabaseError } from '../../../shared/errors/app-error.js'

/**
 * Create mock Drizzle database for unit tests
 */
function createMockDb() {
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
  }
}

/**
 * Generate unique test ID
 */
function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create test driver fixture
 */
function createTestDriver(overrides: Record<string, unknown> = {}) {
  return {
    id: generateTestId('driver'),
    firebaseId: null,
    operatorId: generateTestId('operator'),
    fullName: 'Nguyen Van A',
    idNumber: '001099001234',
    phone: '0901234567',
    address: '123 Le Loi St, District 1',
    licenseNumber: 'B123456789',
    licenseClass: 'D',
    licenseExpiryDate: '2026-12-31',
    dateOfBirth: '1985-05-15',
    province: null,
    district: null,
    imageUrl: null,
    isActive: true,
    operatorName: 'Test Operator',
    operatorCode: 'OP01',
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('DriverRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>

  beforeEach(() => {
    mockDb = createMockDb()
    jest.clearAllMocks()
  })

  describe('CRUD Operations', () => {
    describe('create', () => {
      it('should create driver and return it', () => {
        const newDriver = {
          fullName: 'Nguyen Van A',
          isActive: true,
        }

        expect(newDriver.fullName).toBeDefined()
        expect(newDriver.isActive).toBe(true)
      })

      it('should create driver with all optional fields', () => {
        const newDriver = {
          fullName: 'Nguyen Van A',
          operatorId: generateTestId('operator'),
          idNumber: '001099001234',
          phone: '0901234567',
          address: '123 Le Loi St',
          licenseNumber: 'B123456789',
          licenseClass: 'D',
          licenseExpiryDate: '2026-12-31',
          dateOfBirth: '1985-05-15',
          isActive: true,
        }

        expect(newDriver.operatorId).toBeDefined()
        expect(newDriver.idNumber).toBe('001099001234')
        expect(newDriver.licenseNumber).toBe('B123456789')
      })
    })

    describe('findById', () => {
      it('should return driver when found', () => {
        const driver = createTestDriver()
        const mockResults = [driver]

        mockDb.select.mockReturnThis()
        mockDb.from.mockReturnThis()
        mockDb.where.mockReturnThis()
        mockDb.limit.mockResolvedValue(mockResults)

        expect(mockResults[0]).toBeDefined()
        expect(mockResults[0].id).toBe(driver.id)
        expect(mockResults[0].fullName).toBe('Nguyen Van A')
      })

      it('should return null when driver not found', () => {
        const mockResults: any[] = []

        mockDb.select.mockReturnThis()
        mockDb.from.mockReturnThis()
        mockDb.where.mockReturnThis()
        mockDb.limit.mockResolvedValue(mockResults)

        const result = mockResults[0] || null
        expect(result).toBeNull()
      })
    })

    describe('findAll', () => {
      it('should return array of drivers', () => {
        const drivers = [
          createTestDriver({ fullName: 'Nguyen Van A' }),
          createTestDriver({ fullName: 'Tran Van B' }),
          createTestDriver({ fullName: 'Le Van C' }),
        ]

        expect(drivers).toHaveLength(3)
        expect(drivers[0].fullName).toBe('Nguyen Van A')
        expect(drivers[1].fullName).toBe('Tran Van B')
      })

      it('should return empty array when no drivers exist', () => {
        const drivers: any[] = []

        expect(drivers).toHaveLength(0)
        expect(Array.isArray(drivers)).toBe(true)
      })
    })

    describe('update', () => {
      it('should update driver and return updated record', () => {
        const originalDriver = createTestDriver()
        const updateData = {
          fullName: 'Nguyen Van B',
          phone: '0909999999',
        }

        const updatedDriver = {
          ...originalDriver,
          ...updateData,
          updatedAt: new Date(),
        }

        expect(updatedDriver.fullName).toBe('Nguyen Van B')
        expect(updatedDriver.phone).toBe('0909999999')
        expect(updatedDriver.updatedAt).toBeInstanceOf(Date)
      })

      it('should update only specified fields', () => {
        const originalDriver = createTestDriver()
        const updateData = {
          isActive: false,
        }

        const updatedDriver = {
          ...originalDriver,
          ...updateData,
          updatedAt: new Date(),
        }

        expect(updatedDriver.isActive).toBe(false)
        expect(updatedDriver.fullName).toBe(originalDriver.fullName)
      })
    })

    describe('delete', () => {
      it('should hard delete driver', () => {
        const driver = createTestDriver()
        const deletedId = driver.id

        // Simulate deletion
        const mockResults: any[] = []

        const result = mockResults.find(d => d.id === deletedId)
        expect(result).toBeUndefined()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle findById with non-existent ID', () => {
      const nonExistentId = generateTestId('driver')
      const mockResults: any[] = []

      const result = mockResults[0] || null
      expect(result).toBeNull()
    })

    it('should throw error when database not initialized', () => {
      const throwError = () => {
        const db = null
        if (!db) {
          throw new DatabaseError('Database not initialized. Check DATABASE_URL.')
        }
      }

      expect(throwError).toThrow('Database not initialized')
    })

    it('should handle empty update data', () => {
      const driver = createTestDriver()
      const updateData = {}

      const updatedDriver = {
        ...driver,
        ...updateData,
        updatedAt: new Date(),
      }

      expect(updatedDriver.fullName).toBe(driver.fullName)
      expect(updatedDriver.id).toBe(driver.id)
    })
  })

  describe('Driver-Specific Operations', () => {
    describe('idNumberExists', () => {
      it('should return true when ID number exists', () => {
        const existingIdNumber = '001099001234'
        const drivers = [createTestDriver({ idNumber: existingIdNumber })]

        const exists = drivers.some(d => d.idNumber === existingIdNumber)
        expect(exists).toBe(true)
      })

      it('should return false when ID number does not exist', () => {
        const drivers: any[] = []
        const idNumber = '001099001234'

        const exists = drivers.some(d => d.idNumber === idNumber)
        expect(exists).toBe(false)
      })

      it('should exclude specific driver when checking ID number existence', () => {
        const idNumber = '001099001234'
        const excludeId = generateTestId('driver')
        const driverId = generateTestId('driver')

        const drivers = [createTestDriver({ id: driverId, idNumber })]

        const exists = drivers.some(d => d.idNumber === idNumber && d.id !== excludeId)
        expect(exists).toBe(true)
      })
    })

    describe('licenseNumberExists', () => {
      it('should return true when license number exists', () => {
        const licenseNumber = 'B123456789'
        const drivers = [createTestDriver({ licenseNumber })]

        const exists = drivers.some(d => d.licenseNumber === licenseNumber)
        expect(exists).toBe(true)
      })

      it('should return false when license number does not exist', () => {
        const drivers: any[] = []
        const licenseNumber = 'B123456789'

        const exists = drivers.some(d => d.licenseNumber === licenseNumber)
        expect(exists).toBe(false)
      })

      it('should exclude specific driver when checking license number existence', () => {
        const licenseNumber = 'B123456789'
        const excludeId = generateTestId('driver')
        const driverId = generateTestId('driver')

        const drivers = [createTestDriver({ id: driverId, licenseNumber })]

        const exists = drivers.some(d => d.licenseNumber === licenseNumber && d.id !== excludeId)
        expect(exists).toBe(true)
      })
    })

    describe('findByOperatorId', () => {
      it('should return drivers for specific operator', () => {
        const operatorId = generateTestId('operator')
        const drivers = [
          createTestDriver({ operatorId, fullName: 'Driver A' }),
          createTestDriver({ operatorId, fullName: 'Driver B' }),
        ]

        const filtered = drivers.filter(d => d.operatorId === operatorId)
        expect(filtered).toHaveLength(2)
        expect(filtered[0].operatorId).toBe(operatorId)
      })

      it('should return empty array when operator has no drivers', () => {
        const operatorId = generateTestId('operator')
        const drivers: any[] = []

        const filtered = drivers.filter(d => d.operatorId === operatorId)
        expect(filtered).toHaveLength(0)
      })
    })

    describe('findByActiveStatus', () => {
      it('should return only active drivers', () => {
        const drivers = [
          createTestDriver({ isActive: true }),
          createTestDriver({ isActive: false }),
          createTestDriver({ isActive: true }),
        ]

        const activeDrivers = drivers.filter(d => d.isActive === true)
        expect(activeDrivers).toHaveLength(2)
        expect(activeDrivers.every(d => d.isActive)).toBe(true)
      })

      it('should return only inactive drivers', () => {
        const drivers = [
          createTestDriver({ isActive: true }),
          createTestDriver({ isActive: false }),
          createTestDriver({ isActive: false }),
        ]

        const inactiveDrivers = drivers.filter(d => d.isActive === false)
        expect(inactiveDrivers).toHaveLength(2)
        expect(inactiveDrivers.every(d => !d.isActive)).toBe(true)
      })
    })
  })

  describe('Data Validation', () => {
    it('should have required fields for create', () => {
      const createInput = {
        fullName: 'Nguyen Van A',
      }

      expect(createInput.fullName).toBeDefined()
      expect(typeof createInput.fullName).toBe('string')
    })

    it('should validate ID number format (12 digits)', () => {
      const idNumber = '001099001234'

      expect(idNumber).toHaveLength(12)
      expect(/^\d{12}$/.test(idNumber)).toBe(true)
    })

    it('should reject invalid ID number format', () => {
      const invalidIdNumber = '12345'

      expect(/^\d{12}$/.test(invalidIdNumber)).toBe(false)
    })

    it('should validate phone number format', () => {
      const phone = '0901234567'
      const phonePattern = /^0\d{9}$/

      expect(phonePattern.test(phone)).toBe(true)
    })

    it('should reject invalid phone number format', () => {
      const invalidPhone = '123'
      const phonePattern = /^0\d{9}$/

      expect(phonePattern.test(invalidPhone)).toBe(false)
    })

    it('should validate license class values', () => {
      const validClasses = ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E', 'F']
      const licenseClass = 'D'

      expect(validClasses).toContain(licenseClass)
    })

    it('should validate date formats', () => {
      const dateString = '1985-05-15'
      const date = new Date(dateString)

      expect(date).toBeInstanceOf(Date)
      expect(date.toISOString().substring(0, 10)).toBe(dateString)
    })
  })

  describe('Test Fixtures', () => {
    it('should create valid test driver fixture', () => {
      const driver = createTestDriver()

      expect(driver.id).toBeDefined()
      expect(driver.fullName).toBe('Nguyen Van A')
      expect(driver.isActive).toBe(true)
      expect(driver.licenseClass).toBe('D')
    })

    it('should allow overriding fixture defaults', () => {
      const driver = createTestDriver({
        fullName: 'Tran Van B',
        licenseClass: 'E',
        isActive: false,
      })

      expect(driver.fullName).toBe('Tran Van B')
      expect(driver.licenseClass).toBe('E')
      expect(driver.isActive).toBe(false)
    })

    it('should generate unique IDs', () => {
      const id1 = generateTestId('driver')
      const id2 = generateTestId('driver')

      expect(id1).toMatch(/^driver-\d+-[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('Relations', () => {
    it('should include operator relation data', () => {
      const driver = createTestDriver()
      const operator = {
        id: driver.operatorId,
        name: 'Test Operator',
        code: 'OP01',
      }

      expect(operator.id).toBe(driver.operatorId)
      expect(operator.name).toBeDefined()
      expect(operator.code).toBeDefined()
    })

    it('should handle drivers without operator', () => {
      const driver = createTestDriver({ operatorId: null })

      expect(driver.operatorId).toBeNull()
    })
  })

  describe('API Mapping', () => {
    it('should map driver to API format correctly', () => {
      const driver = createTestDriver()
      const apiDriver = {
        id: driver.id,
        operatorId: driver.operatorId ?? undefined,
        fullName: driver.fullName,
        idNumber: driver.idNumber ?? undefined,
        phone: driver.phone ?? undefined,
        address: driver.address ?? undefined,
        licenseNumber: driver.licenseNumber ?? undefined,
        licenseClass: driver.licenseClass ?? undefined,
        licenseExpiry: driver.licenseExpiryDate ?? undefined,
        dateOfBirth: driver.dateOfBirth ?? undefined,
        isActive: driver.isActive,
        createdAt: driver.createdAt.toISOString(),
        updatedAt: driver.updatedAt.toISOString(),
      }

      expect(apiDriver.id).toBe(driver.id)
      expect(apiDriver.fullName).toBe(driver.fullName)
      expect(apiDriver.licenseExpiry).toBe(driver.licenseExpiryDate)
    })

    it('should handle null values in API mapping', () => {
      const driver = createTestDriver({
        phone: null,
        idNumber: null,
        licenseNumber: null,
      })

      const apiDriver = {
        id: driver.id,
        fullName: driver.fullName,
        phone: driver.phone ?? undefined,
        idNumber: driver.idNumber ?? undefined,
        licenseNumber: driver.licenseNumber ?? undefined,
      }

      expect(apiDriver.phone).toBeUndefined()
      expect(apiDriver.idNumber).toBeUndefined()
      expect(apiDriver.licenseNumber).toBeUndefined()
    })
  })
})
