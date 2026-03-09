/**
 * Fleet Test Fixtures
 * Sample data for fleet module testing
 */

export const mockVehicleDBRecord = {
  id: 'vehicle-1',
  plate_number: '51A-12345',
  operator_id: 'operator-1',
  vehicle_type_id: 'type-1',
  seat_capacity: 45,
  bed_capacity: 0,
  chassis_number: 'CH123456',
  engine_number: 'EN789012',
  is_active: true,
  operator_name: 'Nhà Xe ABC',
  operator_code: 'ABC',
  vehicle_type_name: 'Ghế ngồi',
  created_at: '2024-12-01T00:00:00Z',
  updated_at: '2024-12-18T08:00:00Z',
};

export const mockVehicleRecord = {
  id: 'vehicle-1',
  plateNumber: '51A-12345',
  operatorId: 'operator-1',
  vehicleTypeId: 'type-1',
  seatCapacity: 45,
  bedCapacity: 0,
  chassisNumber: 'CH123456',
  engineNumber: 'EN789012',
  isActive: true,
  operatorName: 'Nhà Xe ABC',
  operatorCode: 'ABC',
  vehicleTypeName: 'Ghế ngồi',
  createdAt: '2024-12-01T00:00:00Z',
  updatedAt: '2024-12-18T08:00:00Z',
};

export const mockDriverDBRecord = {
  id: 'driver-1',
  first_name: 'Văn A',
  last_name: 'Nguyễn',
  phone_number: '0901234567',
  id_number: '123456789012',
  license_number: 'B2-123456',
  license_class: 'B2',
  license_expiry: '2026-12-31',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-12-18T08:00:00Z',
};

export const mockDriverRecord = {
  id: 'driver-1',
  firstName: 'Văn A',
  lastName: 'Nguyễn',
  fullName: 'Nguyễn Văn A',
  phoneNumber: '0901234567',
  idNumber: '123456789012',
  licenseNumber: 'B2-123456',
  licenseClass: 'B2',
  licenseExpiry: '2026-12-31',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-12-18T08:00:00Z',
};

export const validCreateVehicleInput = {
  plateNumber: '51B-67890',
  operatorId: 'operator-1',
  vehicleTypeId: 'type-1',
  seatCapacity: 45,
  bedCapacity: 0,
  chassisNumber: 'CH999888',
  engineNumber: 'EN777666',
};

export const validUpdateVehicleInput = {
  seatCapacity: 50,
  isActive: true,
};

export const validCreateDriverInput = {
  firstName: 'Văn B',
  lastName: 'Trần',
  phoneNumber: '0909876543',
  idNumber: '987654321098',
  licenseNumber: 'C-654321',
  licenseClass: 'C',
  licenseExpiry: '2027-06-30',
};

export const validUpdateDriverInput = {
  phoneNumber: '0912345678',
  isActive: true,
};

export const validVehicleDocumentInput = {
  registrationCertificate: {
    documentNumber: 'REG-2024-001',
    expiryDate: '2025-12-31',
    isValid: true,
  },
  insurance: {
    documentNumber: 'INS-2024-001',
    expiryDate: '2025-06-30',
    isValid: true,
  },
};
