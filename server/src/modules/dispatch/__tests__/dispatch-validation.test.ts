/**
 * Dispatch Validation Tests
 * Tests for dispatch module validation functions
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateCreateDispatch,
  validatePassengerDrop,
  validateIssuePermit,
  validatePayment,
  validateDepartureOrder,
  validateExit,
  DISPATCH_STATUS,
  validateStatusTransition,
} from '../dispatch-validation.js';

describe('Dispatch Validation', () => {
  describe('validateCreateDispatch', () => {
    it('should validate valid dispatch create data', () => {
      const validData = {
        vehicleId: 'vehicle-1',
        driverId: 'driver-1',
        routeId: 'route-1',
        entryTime: '2024-12-18T08:00:00+07:00',
      };

      const result = validateCreateDispatch(validData);

      expect(result.vehicleId).toBe('vehicle-1');
      expect(result.driverId).toBe('driver-1');
      expect(result.routeId).toBe('route-1');
    });

    it('should validate data with optional fields', () => {
      const validData = {
        vehicleId: 'vehicle-1',
        driverId: 'driver-1',
        entryTime: '2024-12-18T08:00:00Z',
        notes: 'Test notes',
        entryShiftId: 'shift-1',
      };

      const result = validateCreateDispatch(validData);

      expect(result.notes).toBe('Test notes');
      expect(result.entryShiftId).toBe('shift-1');
    });

    it('should throw error for missing vehicleId', () => {
      const invalidData = {
        driverId: 'driver-1',
        entryTime: '2024-12-18T08:00:00Z',
      };

      expect(() => validateCreateDispatch(invalidData)).toThrow();
    });

    it('should allow missing driverId (optional)', () => {
      const validData = {
        vehicleId: 'vehicle-1',
        entryTime: '2024-12-18T08:00:00Z',
      };

      const result = validateCreateDispatch(validData);
      expect(result.vehicleId).toBe('vehicle-1');
      expect(result.driverId).toBeUndefined();
    });

    it('should throw error for invalid entryTime format', () => {
      const invalidData = {
        vehicleId: 'vehicle-1',
        driverId: 'driver-1',
        entryTime: 'not-a-date',
      };

      expect(() => validateCreateDispatch(invalidData)).toThrow();
    });

    it('should throw error for empty vehicleId', () => {
      const invalidData = {
        vehicleId: '',
        driverId: 'driver-1',
        entryTime: '2024-12-18T08:00:00Z',
      };

      expect(() => validateCreateDispatch(invalidData)).toThrow();
    });
  });

  describe('validatePassengerDrop', () => {
    it('should validate valid passenger drop data', () => {
      const validData = {
        passengersArrived: 30,
        routeId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = validatePassengerDrop(validData);

      expect(result.passengersArrived).toBe(30);
      expect(result.routeId).toBe('550e8400-e29b-41d4-a716-446655440001');
    });

    it('should allow empty object (all fields optional)', () => {
      const result = validatePassengerDrop({});

      expect(result.passengersArrived).toBeUndefined();
      expect(result.routeId).toBeUndefined();
    });

    it('should allow zero passengers', () => {
      const validData = { passengersArrived: 0 };

      const result = validatePassengerDrop(validData);

      expect(result.passengersArrived).toBe(0);
    });

    it('should throw error for negative passengers', () => {
      const invalidData = { passengersArrived: -5 };

      expect(() => validatePassengerDrop(invalidData)).toThrow();
    });

    it('should throw error for non-integer passengers', () => {
      const invalidData = { passengersArrived: 30.5 };

      expect(() => validatePassengerDrop(invalidData)).toThrow();
    });
  });

  describe('validateIssuePermit', () => {
    it('should validate approved permit with transport order code', () => {
      const validData = {
        permitStatus: 'approved',
        transportOrderCode: 'TO-001',
        seatCount: 45,
        plannedDepartureTime: '2024-12-18T10:00:00Z',
      };

      const result = validateIssuePermit(validData);

      expect(result.permitStatus).toBe('approved');
      expect(result.transportOrderCode).toBe('TO-001');
      expect(result.seatCount).toBe(45);
    });

    it('should throw error for approved permit without transport order code', () => {
      const invalidData = {
        permitStatus: 'approved',
        seatCount: 45,
      };

      expect(() => validateIssuePermit(invalidData)).toThrow();
    });

    it('should allow rejected permit without transport order code', () => {
      const validData = {
        permitStatus: 'rejected',
        rejectionReason: 'Invalid documents',
      };

      const result = validateIssuePermit(validData);

      expect(result.permitStatus).toBe('rejected');
      expect(result.rejectionReason).toBe('Invalid documents');
    });

    it('should validate with optional replacement vehicle', () => {
      const validData = {
        permitStatus: 'approved',
        transportOrderCode: 'TO-001',
        replacementVehicleId: 'vehicle-2',
      };

      const result = validateIssuePermit(validData);

      expect(result.replacementVehicleId).toBe('vehicle-2');
    });

    it('should throw error for invalid permit status', () => {
      const invalidData = {
        permitStatus: 'pending', // Not in enum
      };

      expect(() => validateIssuePermit(invalidData)).toThrow();
    });
  });

  describe('validatePayment', () => {
    it('should validate valid payment data', () => {
      const validData = {
        paymentAmount: 150000,
        paymentMethod: 'cash',
        invoiceNumber: 'INV-001',
      };

      const result = validatePayment(validData);

      expect(result.paymentAmount).toBe(150000);
      expect(result.paymentMethod).toBe('cash');
    });

    it('should allow zero payment amount', () => {
      const validData = { paymentAmount: 0 };

      const result = validatePayment(validData);

      expect(result.paymentAmount).toBe(0);
    });

    it('should throw error for negative payment', () => {
      const invalidData = { paymentAmount: -100 };

      expect(() => validatePayment(invalidData)).toThrow();
    });

    it('should throw error for invalid payment method', () => {
      const invalidData = {
        paymentAmount: 100,
        paymentMethod: 'crypto', // Not in enum
      };

      expect(() => validatePayment(invalidData)).toThrow();
    });

    it('should accept all valid payment methods', () => {
      const methods = ['cash', 'transfer', 'card'] as const;

      methods.forEach((method) => {
        const result = validatePayment({
          paymentAmount: 100,
          paymentMethod: method,
        });
        expect(result.paymentMethod).toBe(method);
      });
    });
  });

  describe('validateDepartureOrder', () => {
    it('should validate valid departure order data', () => {
      const validData = {
        passengersDeparting: 40,
        departureOrderShiftId: '550e8400-e29b-41d4-a716-446655440002',
      };

      const result = validateDepartureOrder(validData);

      expect(result.passengersDeparting).toBe(40);
      expect(result.departureOrderShiftId).toBe('550e8400-e29b-41d4-a716-446655440002');
    });

    it('should allow empty object (all fields optional)', () => {
      const result = validateDepartureOrder({});

      expect(result.passengersDeparting).toBeUndefined();
    });

    it('should throw error for negative passengers', () => {
      const invalidData = { passengersDeparting: -1 };

      expect(() => validateDepartureOrder(invalidData)).toThrow();
    });
  });

  describe('validateExit', () => {
    it('should validate valid exit data', () => {
      const validData = {
        exitTime: '2024-12-18T10:30:00Z',
        passengersDeparting: 42,
        exitShiftId: '550e8400-e29b-41d4-a716-446655440003',
      };

      const result = validateExit(validData);

      expect(result.exitTime).toBe('2024-12-18T10:30:00Z');
      expect(result.passengersDeparting).toBe(42);
    });

    it('should allow empty object (all fields optional)', () => {
      const result = validateExit({});

      expect(result.exitTime).toBeUndefined();
      expect(result.passengersDeparting).toBeUndefined();
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow valid transition: entered -> passengers_dropped', () => {
      expect(() => {
        validateStatusTransition(
          DISPATCH_STATUS.ENTERED,
          DISPATCH_STATUS.PASSENGERS_DROPPED
        );
      }).not.toThrow();
    });

    it('should allow valid transition: passengers_dropped -> permit_issued', () => {
      expect(() => {
        validateStatusTransition(
          DISPATCH_STATUS.PASSENGERS_DROPPED,
          DISPATCH_STATUS.PERMIT_ISSUED
        );
      }).not.toThrow();
    });

    it('should allow valid transition: permit_issued -> paid', () => {
      expect(() => {
        validateStatusTransition(
          DISPATCH_STATUS.PERMIT_ISSUED,
          DISPATCH_STATUS.PAID
        );
      }).not.toThrow();
    });

    it('should allow valid transition: paid -> departure_ordered', () => {
      expect(() => {
        validateStatusTransition(
          DISPATCH_STATUS.PAID,
          DISPATCH_STATUS.DEPARTURE_ORDERED
        );
      }).not.toThrow();
    });

    it('should allow valid transition: departure_ordered -> departed', () => {
      expect(() => {
        validateStatusTransition(
          DISPATCH_STATUS.DEPARTURE_ORDERED,
          DISPATCH_STATUS.DEPARTED
        );
      }).not.toThrow();
    });

    it('should throw for invalid transition: entered -> paid (skipping steps)', () => {
      expect(() => {
        validateStatusTransition(DISPATCH_STATUS.ENTERED, DISPATCH_STATUS.PAID);
      }).toThrow();
    });

    it('should throw for backward transition: paid -> entered', () => {
      expect(() => {
        validateStatusTransition(DISPATCH_STATUS.PAID, DISPATCH_STATUS.ENTERED);
      }).toThrow();
    });
  });
});
