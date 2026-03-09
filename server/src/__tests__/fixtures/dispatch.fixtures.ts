/**
 * Dispatch Test Fixtures
 * Sample data for dispatch module testing
 */

import { DISPATCH_STATUS } from '../../modules/dispatch/dispatch-validation.js';

export const mockDispatchDBRecord = {
  id: 'dispatch-1',
  vehicle_id: 'vehicle-1',
  driver_id: 'driver-1',
  route_id: 'route-1',
  schedule_id: null,
  current_status: DISPATCH_STATUS.ENTERED,
  entry_time: '2024-12-18T08:00:00Z',
  entry_by: 'user-1',
  entry_shift_id: 'shift-1',
  vehicle_plate_number: '51A-12345',
  vehicle_seat_capacity: 45,
  vehicle_type_name: 'Ghế ngồi',
  driver_full_name: 'Nguyễn Văn A',
  route_name: 'Sài Gòn - Vũng Tàu',
  operator_id: 'operator-1',
  operator_name: 'Nhà Xe ABC',
  operator_code: 'ABC',
  created_at: '2024-12-18T08:00:00Z',
  updated_at: '2024-12-18T08:00:00Z',
};

export const mockDispatchRecord = {
  id: 'dispatch-1',
  vehicleId: 'vehicle-1',
  driverId: 'driver-1',
  routeId: 'route-1',
  scheduleId: null,
  currentStatus: DISPATCH_STATUS.ENTERED,
  entryTime: '2024-12-18T08:00:00Z',
  entryBy: 'user-1',
  entryShiftId: 'shift-1',
  vehiclePlateNumber: '51A-12345',
  vehicleSeatCapacity: 45,
  vehicleTypeName: 'Ghế ngồi',
  driverName: 'Nguyễn Văn A',
  routeName: 'Sài Gòn - Vũng Tàu',
  operatorId: 'operator-1',
  operatorName: 'Nhà Xe ABC',
  operatorCode: 'ABC',
  createdAt: '2024-12-18T08:00:00Z',
  updatedAt: '2024-12-18T08:00:00Z',
};

export const validCreateDispatchInput = {
  vehicleId: 'vehicle-1',
  driverId: 'driver-1',
  routeId: 'route-1',
  entryTime: '2024-12-18T08:00:00+07:00',
  notes: 'Test entry',
};

export const validPassengerDropInput = {
  passengersArrived: 30,
  routeId: 'route-1',
};

export const validIssuePermitInput = {
  permitStatus: 'approved' as const,
  transportOrderCode: 'TO-2024-001',
  plannedDepartureTime: '2024-12-18T10:00:00+07:00',
  seatCount: 45,
  routeId: 'route-1',
};

export const validPaymentInput = {
  paymentAmount: 150000,
  paymentMethod: 'cash' as const,
  invoiceNumber: 'INV-2024-001',
};

export const validDepartureOrderInput = {
  passengersDeparting: 42,
};

export const validExitInput = {
  exitTime: '2024-12-18T10:30:00+07:00',
  passengersDeparting: 42,
};
