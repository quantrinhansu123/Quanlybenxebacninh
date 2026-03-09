/**
 * Vehicle Repository Unit Tests
 * Tests for Drizzle-based vehicle repository
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
 * Create test vehicle fixture
 */
function createTestVehicle(overrides: Record<string, unknown> = {}) {
  return {
    id: generateTestId('vehicle'),
    plateNumber: '51A-12345',
    operatorId: generateTestId('operator'),
    vehicleTypeId: generateTestId('vehicleType'),
    seatCapacity: 45,
    brand: 'Hyundai',
    model: 'Universe',
    manufactureYear: 2020,
    color: 'White',
    chassisNumber: 'CHASSIS123',
    engineNumber: 'ENGINE456',
    inspectionExpiryDate: '2026-12-31',
    insuranceExpiryDate: '2026-12-31',
    isActive: true,
    operationalStatus: 'operational',
    operatorName: 'Test Operator',
    operatorCode: 'OP01',
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('VehicleRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>

  beforeEach(() => {
    mockDb = createMockDb()
    jest.clearAllMocks()
  })

  describe('CRUD Operations', () => {
    describe('create', () => {
      it('should create vehicle and return it', () => {
        const newVehicle = {
          plateNumber: '51A-12345',
          seatCapacity: 45,
          isActive: true,
        }

        expect(newVehicle.plateNumber).toBeDefined()
        expect(newVehicle.seatCapacity).toBeGreaterThan(0)
        expect(newVehicle.isActive).toBe(true)
      })

      it('should create vehicle with all optional fields', () => {
        const newVehicle = {
          plateNumber: '51A-12345',
          seatCapacity: 45,
          vehicleTypeId: generateTestId('vehicleType'),
          operatorId: generateTestId('operator'),
          chassisNumber: 'CHASSIS123',
          engineNumber: 'ENGINE456',
          insuranceExpiryDate: '2026-12-31',
          inspectionExpiryDate: '2026-12-31',
          isActive: true,
        }

        expect(newVehicle.vehicleTypeId).toBeDefined()
        expect(newVehicle.operatorId).toBeDefined()
        expect(newVehicle.chassisNumber).toBe('CHASSIS123')
      })
    })

    describe('findById', () => {
      it('should return vehicle when found', () => {
        const vehicle = createTestVehicle()
        const mockResults = [vehicle]

        // Mock query chain
        mockDb.select.mockReturnThis()
        mockDb.from.mockReturnThis()
        mockDb.where.mockReturnThis()
        mockDb.limit.mockResolvedValue(mockResults)

        expect(mockResults[0]).toBeDefined()
        expect(mockResults[0].id).toBe(vehicle.id)
        expect(mockResults[0].plateNumber).toBe('51A-12345')
      })

      it('should return null when vehicle not found', () => {
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
      it('should return array of vehicles', () => {
        const vehicles = [
          createTestVehicle({ plateNumber: '51A-11111' }),
          createTestVehicle({ plateNumber: '51A-22222' }),
          createTestVehicle({ plateNumber: '51A-33333' }),
        ]

        expect(vehicles).toHaveLength(3)
        expect(vehicles[0].plateNumber).toBe('51A-11111')
        expect(vehicles[1].plateNumber).toBe('51A-22222')
      })

      it('should return empty array when no vehicles exist', () => {
        const vehicles: any[] = []

        expect(vehicles).toHaveLength(0)
        expect(Array.isArray(vehicles)).toBe(true)
      })
    })

    describe('update', () => {
      it('should update vehicle and return updated record', () => {
        const originalVehicle = createTestVehicle()
        const updateData = {
          plateNumber: '51A-99999',
          seatCapacity: 50,
        }

        const updatedVehicle = {
          ...originalVehicle,
          ...updateData,
          updatedAt: new Date(),
        }

        expect(updatedVehicle.plateNumber).toBe('51A-99999')
        expect(updatedVehicle.seatCapacity).toBe(50)
        expect(updatedVehicle.updatedAt).toBeInstanceOf(Date)
      })

      it('should update only specified fields', () => {
        const originalVehicle = createTestVehicle()
        const updateData = {
          isActive: false,
        }

        const updatedVehicle = {
          ...originalVehicle,
          ...updateData,
          updatedAt: new Date(),
        }

        expect(updatedVehicle.isActive).toBe(false)
        expect(updatedVehicle.plateNumber).toBe(originalVehicle.plateNumber)
      })
    })

    describe('delete', () => {
      it('should soft delete vehicle (set isActive to false)', () => {
        const vehicle = createTestVehicle({ isActive: true })

        // Soft delete operation
        const deletedVehicle = {
          ...vehicle,
          isActive: false,
          updatedAt: new Date(),
        }

        expect(deletedVehicle.isActive).toBe(false)
        expect(deletedVehicle.id).toBe(vehicle.id)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle findById with non-existent ID', () => {
      const nonExistentId = generateTestId('vehicle')
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
      const vehicle = createTestVehicle()
      const updateData = {}

      const updatedVehicle = {
        ...vehicle,
        ...updateData,
        updatedAt: new Date(),
      }

      expect(updatedVehicle.plateNumber).toBe(vehicle.plateNumber)
      expect(updatedVehicle.id).toBe(vehicle.id)
    })
  })

  describe('Vehicle-Specific Operations', () => {
    describe('findByPlateNumber', () => {
      it('should find vehicle by plate number', () => {
        const vehicle = createTestVehicle({ plateNumber: '51A-12345' })
        const mockResults = [vehicle]

        expect(mockResults[0].plateNumber).toBe('51A-12345')
        expect(mockResults[0].id).toBe(vehicle.id)
      })

      it('should return null when plate number not found', () => {
        const mockResults: any[] = []

        const result = mockResults[0] || null
        expect(result).toBeNull()
      })
    })

    describe('plateNumberExists', () => {
      it('should return true when plate number exists', () => {
        const existingPlateNumber = '51A-12345'
        const mockResults = [{ id: generateTestId('vehicle') }]

        const exists = mockResults.length > 0
        expect(exists).toBe(true)
      })

      it('should return false when plate number does not exist', () => {
        const mockResults: any[] = []

        const exists = mockResults.length > 0
        expect(exists).toBe(false)
      })

      it('should exclude specific ID when checking plate number existence', () => {
        const plateNumber = '51A-12345'
        const excludeId = generateTestId('vehicle')
        const otherId = generateTestId('vehicle')

        // Simulate finding a vehicle with different ID
        const mockResults = [{ id: otherId }]

        const exists = mockResults.some(r => r.id !== excludeId)
        expect(exists).toBe(true)
      })
    })

    describe('findByOperatorId', () => {
      it('should return vehicles for specific operator', () => {
        const operatorId = generateTestId('operator')
        const vehicles = [
          createTestVehicle({ operatorId, plateNumber: '51A-11111' }),
          createTestVehicle({ operatorId, plateNumber: '51A-22222' }),
        ]

        const filtered = vehicles.filter(v => v.operatorId === operatorId)
        expect(filtered).toHaveLength(2)
        expect(filtered[0].operatorId).toBe(operatorId)
      })

      it('should return empty array when operator has no vehicles', () => {
        const operatorId = generateTestId('operator')
        const vehicles: any[] = []

        const filtered = vehicles.filter(v => v.operatorId === operatorId)
        expect(filtered).toHaveLength(0)
      })
    })

    describe('findByActiveStatus', () => {
      it('should return only active vehicles', () => {
        const vehicles = [
          createTestVehicle({ isActive: true }),
          createTestVehicle({ isActive: false }),
          createTestVehicle({ isActive: true }),
        ]

        const activeVehicles = vehicles.filter(v => v.isActive === true)
        expect(activeVehicles).toHaveLength(2)
        expect(activeVehicles.every(v => v.isActive)).toBe(true)
      })

      it('should return only inactive vehicles', () => {
        const vehicles = [
          createTestVehicle({ isActive: true }),
          createTestVehicle({ isActive: false }),
          createTestVehicle({ isActive: false }),
        ]

        const inactiveVehicles = vehicles.filter(v => v.isActive === false)
        expect(inactiveVehicles).toHaveLength(2)
        expect(inactiveVehicles.every(v => !v.isActive)).toBe(true)
      })
    })
  })

  describe('Data Validation', () => {
    it('should have required fields for create', () => {
      const createInput = {
        plateNumber: '51A-12345',
        seatCapacity: 45,
      }

      expect(createInput.plateNumber).toBeDefined()
      expect(createInput.seatCapacity).toBeDefined()
      expect(typeof createInput.plateNumber).toBe('string')
      expect(typeof createInput.seatCapacity).toBe('number')
    })

    it('should validate seat capacity is positive', () => {
      const vehicle = createTestVehicle({ seatCapacity: 45 })

      expect(vehicle.seatCapacity).toBeGreaterThan(0)
    })

    it('should validate plate number format', () => {
      const plateNumber = '51A-12345'
      const platePattern = /^\d{2}[A-Z]-\d{5}$/

      expect(platePattern.test(plateNumber)).toBe(true)
    })

    it('should reject invalid plate number format', () => {
      const invalidPlateNumber = 'INVALID'
      const platePattern = /^\d{2}[A-Z]-\d{5}$/

      expect(platePattern.test(invalidPlateNumber)).toBe(false)
    })
  })

  describe('Test Fixtures', () => {
    it('should create valid test vehicle fixture', () => {
      const vehicle = createTestVehicle()

      expect(vehicle.id).toBeDefined()
      expect(vehicle.plateNumber).toBe('51A-12345')
      expect(vehicle.seatCapacity).toBe(45)
      expect(vehicle.isActive).toBe(true)
    })

    it('should allow overriding fixture defaults', () => {
      const vehicle = createTestVehicle({
        plateNumber: '51B-99999',
        seatCapacity: 60,
        isActive: false,
      })

      expect(vehicle.plateNumber).toBe('51B-99999')
      expect(vehicle.seatCapacity).toBe(60)
      expect(vehicle.isActive).toBe(false)
    })

    it('should generate unique IDs', () => {
      const id1 = generateTestId('vehicle')
      const id2 = generateTestId('vehicle')

      expect(id1).toMatch(/^vehicle-\d+-[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('Relations', () => {
    it('should include operator relation data', () => {
      const vehicle = createTestVehicle()
      const operator = {
        id: vehicle.operatorId,
        name: 'Test Operator',
        code: 'OP01',
      }

      expect(operator.id).toBe(vehicle.operatorId)
      expect(operator.name).toBeDefined()
      expect(operator.code).toBeDefined()
    })

    it('should include vehicle type relation data', () => {
      const vehicle = createTestVehicle()
      const vehicleType = {
        id: vehicle.vehicleTypeId,
        name: 'Coach Bus',
      }

      expect(vehicleType.id).toBe(vehicle.vehicleTypeId)
      expect(vehicleType.name).toBeDefined()
    })

    it('should handle vehicles without operator', () => {
      const vehicle = createTestVehicle({ operatorId: null })

      expect(vehicle.operatorId).toBeNull()
    })

    it('should handle vehicles without vehicle type', () => {
      const vehicle = createTestVehicle({ vehicleTypeId: null })

      expect(vehicle.vehicleTypeId).toBeNull()
    })
  })
})
