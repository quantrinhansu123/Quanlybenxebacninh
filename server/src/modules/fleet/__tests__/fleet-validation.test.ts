/**
 * Fleet Validation Tests
 * Tests for fleet module validation functions
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateCreateVehicle,
  validateUpdateVehicle,
  validateCreateDriver,
  validateUpdateDriver,
} from '../fleet-validation.js';

describe('Fleet Validation', () => {
  describe('validateCreateVehicle', () => {
    it('should validate valid vehicle data', () => {
      const validData = {
        plateNumber: '51A-12345',
        operatorId: 'operator-1',
        vehicleTypeId: 'type-1',
        seatCapacity: 45,
      };

      const result = validateCreateVehicle(validData);

      expect(result.plateNumber).toBe('51A-12345');
      expect(result.seatCapacity).toBe(45);
    });

    it('should validate vehicle with all optional fields', () => {
      const validData = {
        plateNumber: '51B-67890',
        seatCapacity: 45,
        bedCapacity: 20,
        chassisNumber: 'CH123456',
        engineNumber: 'EN789012',
        insuranceExpiryDate: '2025-12-31',
        inspectionExpiryDate: '2025-06-30',
        province: 'TP.HCM',
        notes: 'Test vehicle',
      };

      const result = validateCreateVehicle(validData);

      expect(result.chassisNumber).toBe('CH123456');
      expect(result.bedCapacity).toBe(20);
      expect(result.province).toBe('TP.HCM');
    });

    it('should validate vehicle with documents', () => {
      const validData = {
        plateNumber: '51A-12345',
        seatCapacity: 45,
        documents: {
          registration: {
            number: 'REG-001',
            issueDate: '2024-01-01',
            expiryDate: '2025-01-01',
          },
          insurance: {
            number: 'INS-001',
            issueDate: '2024-01-01',
            expiryDate: '2025-01-01',
            issuingAuthority: 'Insurance Co.',
          },
        },
      };

      const result = validateCreateVehicle(validData);

      expect(result.documents?.registration?.number).toBe('REG-001');
      expect(result.documents?.insurance?.issuingAuthority).toBe('Insurance Co.');
    });

    it('should throw error for missing plate number', () => {
      const invalidData = {
        operatorId: 'operator-1',
        seatCapacity: 45,
      };

      expect(() => validateCreateVehicle(invalidData)).toThrow();
    });

    it('should throw error for empty plate number', () => {
      const invalidData = {
        plateNumber: '',
        seatCapacity: 45,
      };

      expect(() => validateCreateVehicle(invalidData)).toThrow();
    });

    it('should throw error for missing seat capacity', () => {
      const invalidData = {
        plateNumber: '51A-12345',
      };

      expect(() => validateCreateVehicle(invalidData)).toThrow();
    });

    it('should throw error for negative seat capacity', () => {
      const invalidData = {
        plateNumber: '51A-12345',
        seatCapacity: -1,
      };

      expect(() => validateCreateVehicle(invalidData)).toThrow();
    });

    it('should throw error for zero seat capacity', () => {
      const invalidData = {
        plateNumber: '51A-12345',
        seatCapacity: 0,
      };

      expect(() => validateCreateVehicle(invalidData)).toThrow();
    });

    it('should throw error for non-integer seat capacity', () => {
      const invalidData = {
        plateNumber: '51A-12345',
        seatCapacity: 45.5,
      };

      expect(() => validateCreateVehicle(invalidData)).toThrow();
    });

    it('should allow empty string for imageUrl', () => {
      const validData = {
        plateNumber: '51A-12345',
        seatCapacity: 45,
        imageUrl: '',
      };

      const result = validateCreateVehicle(validData);

      expect(result.imageUrl).toBe('');
    });

    it('should validate valid URL for imageUrl', () => {
      const validData = {
        plateNumber: '51A-12345',
        seatCapacity: 45,
        imageUrl: 'https://example.com/image.jpg',
      };

      const result = validateCreateVehicle(validData);

      expect(result.imageUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('validateUpdateVehicle', () => {
    it('should validate partial update with only seatCapacity', () => {
      const validData = {
        seatCapacity: 50,
      };

      const result = validateUpdateVehicle(validData);

      expect(result.seatCapacity).toBe(50);
    });

    it('should validate empty object (no fields required)', () => {
      const result = validateUpdateVehicle({});

      expect(result).toEqual({});
    });

    it('should validate update with multiple fields', () => {
      const validData = {
        plateNumber: '51A-99999',
        seatCapacity: 50,
        notes: 'Updated notes',
      };

      const result = validateUpdateVehicle(validData);

      expect(result.plateNumber).toBe('51A-99999');
      expect(result.seatCapacity).toBe(50);
    });
  });

  describe('validateCreateDriver', () => {
    it('should validate valid driver data', () => {
      const validData = {
        operatorIds: ['operator-1'],
        fullName: 'Nguyễn Văn A',
        idNumber: '123456789012',
        licenseNumber: 'B2-123456',
        licenseClass: 'B2',
        licenseExpiryDate: '2026-12-31',
      };

      const result = validateCreateDriver(validData);

      expect(result.fullName).toBe('Nguyễn Văn A');
      expect(result.operatorIds).toEqual(['operator-1']);
      expect(result.licenseClass).toBe('B2');
    });

    it('should validate driver with multiple operators', () => {
      const validData = {
        operatorIds: ['operator-1', 'operator-2', 'operator-3'],
        fullName: 'Trần Văn B',
        idNumber: '987654321098',
        licenseNumber: 'C-654321',
        licenseClass: 'C',
        licenseExpiryDate: '2027-06-30',
      };

      const result = validateCreateDriver(validData);

      expect(result.operatorIds).toHaveLength(3);
    });

    it('should validate driver with optional address fields', () => {
      const validData = {
        operatorIds: ['operator-1'],
        fullName: 'Lê Văn C',
        idNumber: '111222333444',
        licenseNumber: 'D-111222',
        licenseClass: 'D',
        licenseExpiryDate: '2028-01-01',
        phone: '0909123456',
        province: 'TP.HCM',
        district: 'Quận 1',
        address: '123 Nguyễn Huệ',
      };

      const result = validateCreateDriver(validData);

      expect(result.phone).toBe('0909123456');
      expect(result.province).toBe('TP.HCM');
      expect(result.address).toBe('123 Nguyễn Huệ');
    });

    it('should throw error for empty operatorIds array', () => {
      const invalidData = {
        operatorIds: [],
        fullName: 'Test Driver',
        idNumber: '123456789',
        licenseNumber: 'B2-123',
        licenseClass: 'B2',
        licenseExpiryDate: '2026-12-31',
      };

      expect(() => validateCreateDriver(invalidData)).toThrow();
    });

    it('should throw error for missing fullName', () => {
      const invalidData = {
        operatorIds: ['operator-1'],
        idNumber: '123456789012',
        licenseNumber: 'B2-123456',
        licenseClass: 'B2',
        licenseExpiryDate: '2026-12-31',
      };

      expect(() => validateCreateDriver(invalidData)).toThrow();
    });

    it('should throw error for empty fullName', () => {
      const invalidData = {
        operatorIds: ['operator-1'],
        fullName: '',
        idNumber: '123456789012',
        licenseNumber: 'B2-123456',
        licenseClass: 'B2',
        licenseExpiryDate: '2026-12-31',
      };

      expect(() => validateCreateDriver(invalidData)).toThrow();
    });

    it('should throw error for missing license fields', () => {
      const invalidData = {
        operatorIds: ['operator-1'],
        fullName: 'Test Driver',
        idNumber: '123456789012',
      };

      expect(() => validateCreateDriver(invalidData)).toThrow();
    });
  });

  describe('validateUpdateDriver', () => {
    it('should validate partial update', () => {
      const validData = {
        phone: '0912345678',
      };

      const result = validateUpdateDriver(validData);

      expect(result.phone).toBe('0912345678');
    });

    it('should validate empty object (no fields required)', () => {
      const result = validateUpdateDriver({});

      expect(result).toEqual({});
    });

    it('should validate update with multiple fields', () => {
      const validData = {
        fullName: 'Updated Name',
        phone: '0999888777',
        address: 'New Address',
      };

      const result = validateUpdateDriver(validData);

      expect(result.fullName).toBe('Updated Name');
      expect(result.phone).toBe('0999888777');
    });
  });
});
