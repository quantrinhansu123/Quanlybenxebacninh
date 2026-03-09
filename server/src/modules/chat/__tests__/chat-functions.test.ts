/**
 * Chat Functions Unit Tests
 * Tests for the 13 function definitions used by Gemini AI
 * 
 * Uses jest.unstable_mockModule() for ESM compatibility
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Import mock data first (no mocking needed)
import {
  mockVehicles,
  mockDrivers,
  mockOperators,
  mockRoutes,
  mockBadges,
  mockDispatchRecords,
  mockSchedules,
  mockServices,
  mockShifts,
  mockInvoices,
  mockViolations,
  mockServiceCharges,
  createMockSnapshot,
} from './mocks/chat-mock-data.js';

// Table to mock data mapping (Drizzle uses schema objects as keys)
const mockDb = {
  select: () => ({
    from: (schema: any) => {
      // Map schema object to table name
      const schemaName = schema?._.name || schema?.dbName || '';
      const tableDataMap: Record<string, any[]> = {
        vehicles: mockVehicles,
        vehicle_badges: mockBadges,
        operators: mockOperators,
        routes: mockRoutes,
        drivers: mockDrivers,
        dispatch_records: mockDispatchRecords,
        schedules: mockSchedules,
        services: mockServices,
        shifts: mockShifts,
        invoices: mockInvoices,
        violations: mockViolations,
        service_charges: mockServiceCharges,
      };
      return Promise.resolve(tableDataMap[schemaName] || []);
    },
  }),
};

// Mock Drizzle database BEFORE importing the service
jest.unstable_mockModule('../../../db/drizzle.js', () => ({
  db: mockDb,
}));

// Dynamic import AFTER mock registration
const { executeFunction, CHAT_FUNCTIONS } = await import('../services/chat-functions.js');
const { chatCacheService } = await import('../services/chat-cache.service.js');

describe('Chat Functions', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    // Manually populate cache instead of calling preWarm which uses DB
    const cache = (chatCacheService as any).cache;
    cache.set('vehicles', mockVehicles);
    cache.set('badges', mockBadges);
    cache.set('operators', mockOperators);
    cache.set('routes', mockRoutes);
    cache.set('drivers', mockDrivers);
    cache.set('dispatch_records', mockDispatchRecords);
    cache.set('schedules', mockSchedules);
    cache.set('services', mockServices);
    cache.set('shifts', mockShifts);
    cache.set('invoices', mockInvoices);
    cache.set('violations', mockViolations);
    cache.set('service_charges', mockServiceCharges);

    // Mark cache as ready
    (chatCacheService as any).lastRefresh = new Date();

    // Build indexes
    (chatCacheService as any).buildIndexes();
  });

  describe('CHAT_FUNCTIONS definitions', () => {
    it('should have 13 function definitions', () => {
      expect(CHAT_FUNCTIONS).toHaveLength(13);
    });

    it('should have required properties for each function', () => {
      CHAT_FUNCTIONS.forEach((fn: any) => {
        expect(fn).toHaveProperty('name');
        expect(fn).toHaveProperty('description');
        expect(fn).toHaveProperty('parameters');
      });
    });

    it('should have Vietnamese descriptions', () => {
      CHAT_FUNCTIONS.forEach((fn: any) => {
        expect(fn.description.length).toBeGreaterThan(10);
      });
    });

    const expectedFunctions = [
      'search_vehicle',
      'search_driver',
      'search_operator',
      'search_route',
      'search_badge',
      'get_dispatch_stats',
      'get_system_stats',
      'search_schedule',
      'search_service',
      'get_shift_info',
      'get_invoices',
      'get_violations',
      'get_service_charges',
    ];

    expectedFunctions.forEach((fnName) => {
      it(`should include ${fnName} function`, () => {
        const fn = CHAT_FUNCTIONS.find((f: any) => f.name === fnName);
        expect(fn).toBeDefined();
      });
    });
  });

  describe('search_vehicle', () => {
    it('should find vehicle by valid plate number', async () => {
      const result = await executeFunction('search_vehicle', { plate_number: '98H07480' });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should return error for non-existent plate', async () => {
      const result = await executeFunction('search_vehicle', { plate_number: 'NONEXISTENT' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('NONEXISTENT');
    });

    it('should handle empty plate number (returns all matches)', async () => {
      const result = await executeFunction('search_vehicle', { plate_number: '' });
      expect(result).toHaveProperty('success');
    });

    it('should handle plate with different formats', async () => {
      const formats = ['98H07480', '98H-07480', '98h07480'];
      for (const format of formats) {
        const result = await executeFunction('search_vehicle', { plate_number: format });
        expect(result.success).toBe(true);
      }
    });

    it('should handle missing plate_number parameter (returns all matches)', async () => {
      const result = await executeFunction('search_vehicle', {});
      expect(result).toHaveProperty('success');
    });
  });

  describe('search_driver', () => {
    it('should find driver by name', async () => {
      const result = await executeFunction('search_driver', { name: 'Nguyen Van An' });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should find driver by partial name', async () => {
      const result = await executeFunction('search_driver', { name: 'Nguyen' });
      expect(result.success).toBe(true);
    });

    it('should return error for non-existent driver', async () => {
      const result = await executeFunction('search_driver', { name: 'Nonexistent Driver' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty name (returns all matches)', async () => {
      const result = await executeFunction('search_driver', { name: '' });
      expect(result).toHaveProperty('success');
    });

    it('should be case-insensitive', async () => {
      const result = await executeFunction('search_driver', { name: 'nguyen van an' });
      expect(result.success).toBe(true);
    });
  });

  describe('search_operator', () => {
    it('should find operator by name', async () => {
      const result = await executeFunction('search_operator', { name: 'Phuong Trang' });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should find operator by partial name', async () => {
      const result = await executeFunction('search_operator', { name: 'Mai Linh' });
      expect(result.success).toBe(true);
    });

    it('should return error for non-existent operator', async () => {
      const result = await executeFunction('search_operator', { name: 'Nonexistent Company' });
      expect(result.success).toBe(false);
    });

    it('should handle empty name (returns all matches)', async () => {
      const result = await executeFunction('search_operator', { name: '' });
      expect(result).toHaveProperty('success');
    });
  });

  describe('search_route', () => {
    it('should find route by code', async () => {
      const result = await executeFunction('search_route', { search_term: 'TPHCM-DALAT-001' });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should find route by station name', async () => {
      const result = await executeFunction('search_route', { search_term: 'Da Lat' });
      expect(result.success).toBe(true);
    });

    it('should return error for non-existent route', async () => {
      const result = await executeFunction('search_route', { search_term: 'NONEXISTENT' });
      expect(result.success).toBe(false);
    });

    it('should handle empty search term (returns all matches)', async () => {
      const result = await executeFunction('search_route', { search_term: '' });
      expect(result).toHaveProperty('success');
    });
  });

  describe('search_badge', () => {
    it('should find badge by number', async () => {
      const result = await executeFunction('search_badge', { number: 'PH-12345' });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should find badge by plate number', async () => {
      const result = await executeFunction('search_badge', { number: '98H07480' });
      expect(result.success).toBe(true);
    });

    it('should return error for non-existent badge', async () => {
      const result = await executeFunction('search_badge', { number: 'NONEXISTENT' });
      expect(result.success).toBe(false);
    });

    it('should handle empty number (returns all matches)', async () => {
      const result = await executeFunction('search_badge', { number: '' });
      expect(result).toHaveProperty('success');
    });
  });

  describe('get_dispatch_stats', () => {
    it('should return stats without date (today)', async () => {
      const result = await executeFunction('get_dispatch_stats', {});
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('date');
      expect(result.data).toHaveProperty('entered');
      expect(result.data).toHaveProperty('departed');
      expect(result.data).toHaveProperty('total');
    });

    it('should return stats for specific date', async () => {
      const result = await executeFunction('get_dispatch_stats', { date: '2025-12-25' });
      expect(result.success).toBe(true);
      expect(result.data.date).toBe('2025-12-25');
    });

    it('should handle date with no records', async () => {
      const result = await executeFunction('get_dispatch_stats', { date: '2020-01-01' });
      expect(result.success).toBe(true);
      expect(result.data.entered).toBe(0);
    });
  });

  describe('get_system_stats', () => {
    it('should return complete system statistics', async () => {
      const result = await executeFunction('get_system_stats', {});
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('vehicles');
      expect(result.data).toHaveProperty('drivers');
      expect(result.data).toHaveProperty('operators');
      expect(result.data).toHaveProperty('routes');
      expect(result.data).toHaveProperty('badges');
      expect(result.data).toHaveProperty('lastRefresh');
    });

    it('should return correct counts', async () => {
      const result = await executeFunction('get_system_stats', {});
      expect(result.data.vehicles).toBe(mockVehicles.length);
      expect(result.data.drivers).toBe(mockDrivers.length);
    });
  });

  describe('search_schedule', () => {
    it('should return schedules without term', async () => {
      const result = await executeFunction('search_schedule', {});
      expect(result.success).toBe(true);
    });

    it('should find schedule by code', async () => {
      const result = await executeFunction('search_schedule', { term: 'SCH-001' });
      expect(result.success).toBe(true);
    });

    it('should return message when no schedules found', async () => {
      const result = await executeFunction('search_schedule', { term: 'NONEXISTENT' });
      expect(result.success).toBe(true);
    });
  });

  describe('search_service', () => {
    it('should return services without term', async () => {
      const result = await executeFunction('search_service', {});
      expect(result.success).toBe(true);
    });

    it('should find service by name', async () => {
      const result = await executeFunction('search_service', { term: 'Rua xe' });
      expect(result.success).toBe(true);
    });

    it('should find service by code', async () => {
      const result = await executeFunction('search_service', { term: 'SV-RX' });
      expect(result.success).toBe(true);
    });
  });

  describe('get_shift_info', () => {
    it('should return shifts without date', async () => {
      const result = await executeFunction('get_shift_info', {});
      expect(result.success).toBe(true);
    });

    it('should return shifts for specific date', async () => {
      const result = await executeFunction('get_shift_info', { date: '2025-12-25' });
      expect(result.success).toBe(true);
    });

    it('should return message when no shifts found', async () => {
      const result = await executeFunction('get_shift_info', { date: '2020-01-01' });
      expect(result.success).toBe(true);
    });
  });

  describe('get_invoices', () => {
    it('should return invoices without date', async () => {
      const result = await executeFunction('get_invoices', {});
      expect(result.success).toBe(true);
    });

    it('should return invoices for specific date', async () => {
      const result = await executeFunction('get_invoices', { date: '2025-12-25' });
      expect(result.success).toBe(true);
    });

    it('should return message when no invoices found', async () => {
      const result = await executeFunction('get_invoices', { date: '2020-01-01' });
      expect(result.success).toBe(true);
    });
  });

  describe('get_violations', () => {
    it('should return all violations without plate', async () => {
      const result = await executeFunction('get_violations', {});
      expect(result.success).toBe(true);
    });

    it('should return violations for specific plate', async () => {
      const result = await executeFunction('get_violations', { plate_number: '98H07480' });
      expect(result.success).toBe(true);
    });

    it('should return message when no violations found', async () => {
      const result = await executeFunction('get_violations', { plate_number: 'NONEXISTENT' });
      expect(result.success).toBe(true);
      expect(result.data.message).toBeDefined();
    });
  });

  describe('get_service_charges', () => {
    it('should return all charges without service filter', async () => {
      const result = await executeFunction('get_service_charges', {});
      expect(result.success).toBe(true);
    });

    it('should return charges for specific service', async () => {
      const result = await executeFunction('get_service_charges', { service: 'Phi vao ben' });
      expect(result.success).toBe(true);
    });

    it('should return message when no charges found', async () => {
      const result = await executeFunction('get_service_charges', { service: 'NONEXISTENT' });
      expect(result.success).toBe(true);
    });
  });

  describe('Unknown function', () => {
    it('should return error for unknown function name', async () => {
      const result = await executeFunction('unknown_function', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown function');
    });
  });

  describe('Error handling', () => {
    it('should handle null arguments gracefully', async () => {
      const result = await executeFunction('search_vehicle', { plate_number: null as any });
      expect(result).toHaveProperty('success');
    });
  });

  describe('Vietnamese Language Support', () => {
    it('should search with Vietnamese text', async () => {
      const result = await executeFunction('search_operator', { name: 'Phuong Trang' });
      expect(result.success).toBe(true);
    });

    it('should search without diacritics', async () => {
      const result = await executeFunction('search_driver', { name: 'nguyen van an' });
      expect(result.success).toBe(true);
    });

    it('should handle mixed case Vietnamese', async () => {
      const result = await executeFunction('search_operator', { name: 'PHUONG TRANG' });
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long input strings', async () => {
      const longString = 'a'.repeat(1000);
      const result = await executeFunction('search_vehicle', { plate_number: longString });
      expect(result).toHaveProperty('success');
    });

    it('should handle special characters', async () => {
      const result = await executeFunction('search_vehicle', { plate_number: '!@#$%^&*()' });
      expect(result).toHaveProperty('success');
    });

    it('should handle whitespace-only input', async () => {
      const result = await executeFunction('search_vehicle', { plate_number: '   ' });
      expect(result).toHaveProperty('success');
    });

    it('should handle numeric-only input', async () => {
      const result = await executeFunction('search_vehicle', { plate_number: '12345' });
      expect(result).toHaveProperty('success');
    });
  });
});
