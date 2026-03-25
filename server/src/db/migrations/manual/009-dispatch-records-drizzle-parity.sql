-- Đồng bộ bảng dispatch_records với Drizzle schema (server/src/db/schema/dispatch-records.ts).
-- Chạy TOÀN BỘ file trong Supabase → SQL Editor (an toàn: IF NOT EXISTS).
-- Sửa lỗi: column "..." does not exist / toast liệt kê nhiều tên cột snake_case.

-- Bảng gốc có thể đã có một số cột; chỉ thêm còn thiếu.

ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS firebase_id VARCHAR(100);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES drivers(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES operators(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS schedule_id UUID;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'entered';
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS permit_status VARCHAR(20);

ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS entry_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS entry_by UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS entry_by_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS entry_shift_id UUID REFERENCES shifts(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS entry_image_url TEXT;

ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS passenger_drop_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS passengers_arrived INTEGER;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS passenger_drop_by UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS passenger_drop_by_name VARCHAR(255);

ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS boarding_permit_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS boarding_permit_by UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS boarding_permit_by_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS permit_shift_id UUID REFERENCES shifts(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS planned_departure_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS transport_order_code VARCHAR(50);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS seat_count INTEGER;

ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12, 2);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_by UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_by_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_shift_id UUID REFERENCES shifts(id);

ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS departure_order_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS passengers_departing INTEGER;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS departure_order_by UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS departure_order_by_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS departure_order_shift_id UUID REFERENCES shifts(id);

ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS exit_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS exit_by UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS exit_by_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS exit_shift_id UUID REFERENCES shifts(id);

ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS passengers INTEGER DEFAULT 0;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS passenger_manifest JSONB;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS fare NUMERIC(12, 2);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS service_charges JSONB;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS permit_number VARCHAR(50);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS departure_order_number VARCHAR(50);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS vehicle_plate_number VARCHAR(20);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS vehicle_seat_count INTEGER;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS vehicle_operator_id UUID;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS vehicle_operator_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS vehicle_operator_code VARCHAR(50);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS driver_full_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(20);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS operator_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS operator_code VARCHAR(50);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS route_code VARCHAR(50);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS route_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS route_type VARCHAR(50);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS route_destination_id UUID;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS route_destination_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS route_destination_code VARCHAR(50);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS departure_station VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS arrival_station VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);

ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Unique firebase_id (chỉ tạo nếu chưa có)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispatch_records_firebase_id_unique'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dispatch_records' AND column_name = 'firebase_id'
  ) THEN
    ALTER TABLE dispatch_records ADD CONSTRAINT dispatch_records_firebase_id_unique UNIQUE (firebase_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS dispatch_permit_status_idx ON dispatch_records(permit_status);
CREATE INDEX IF NOT EXISTS dispatch_payment_time_idx ON dispatch_records(payment_time);
CREATE INDEX IF NOT EXISTS dispatch_boarding_permit_time_idx ON dispatch_records(boarding_permit_time);
CREATE INDEX IF NOT EXISTS dispatch_plate_number_idx ON dispatch_records(vehicle_plate_number);

SELECT '009 dispatch_records drizzle parity OK' AS result;
