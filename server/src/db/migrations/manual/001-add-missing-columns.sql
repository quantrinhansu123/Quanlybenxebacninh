-- Manual migration: Add missing columns to dispatch_records and operators
-- Run this in Supabase SQL Editor

-- =====================================================
-- OPERATORS TABLE - Add missing columns
-- =====================================================
ALTER TABLE operators
ADD COLUMN IF NOT EXISTS representative_position VARCHAR(100),
ADD COLUMN IF NOT EXISTS province VARCHAR(100),
ADD COLUMN IF NOT EXISTS district VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_ticket_delegated BOOLEAN DEFAULT FALSE;

-- =====================================================
-- DISPATCH_RECORDS TABLE - Add missing columns
-- =====================================================

-- Schedule reference
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS schedule_id UUID;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS permit_status VARCHAR(20);

-- Entry step fields
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS entry_by UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS entry_by_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS entry_shift_id UUID REFERENCES shifts(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS entry_image_url TEXT;

-- Passenger drop step fields
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS passengers_arrived INTEGER;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS passenger_drop_by UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS passenger_drop_by_name VARCHAR(255);

-- Boarding permit step fields
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS boarding_permit_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS boarding_permit_by UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS boarding_permit_by_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS permit_shift_id UUID REFERENCES shifts(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS planned_departure_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS transport_order_code VARCHAR(50);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS seat_count INTEGER;

-- Payment step fields
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12, 2);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_by UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_by_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_shift_id UUID REFERENCES shifts(id);

-- Departure order step fields
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS departure_order_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS passengers_departing INTEGER;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS departure_order_by UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS departure_order_by_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS departure_order_shift_id UUID REFERENCES shifts(id);

-- Exit step fields
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS exit_by UUID REFERENCES users(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS exit_by_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS exit_shift_id UUID REFERENCES shifts(id);

-- Vehicle operator snapshot fields
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS vehicle_operator_id UUID;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS vehicle_operator_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS vehicle_operator_code VARCHAR(50);

-- Rename driver_name to driver_full_name (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'dispatch_records' AND column_name = 'driver_name') THEN
        ALTER TABLE dispatch_records RENAME COLUMN driver_name TO driver_full_name;
    ELSE
        ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS driver_full_name VARCHAR(255);
    END IF;
END $$;

-- Route extended snapshot fields
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS route_type VARCHAR(50);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS route_destination_id UUID;
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS route_destination_name VARCHAR(255);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS route_destination_code VARCHAR(50);

-- =====================================================
-- CREATE INDEXES for new columns
-- =====================================================
CREATE INDEX IF NOT EXISTS dispatch_permit_status_idx ON dispatch_records(permit_status);
CREATE INDEX IF NOT EXISTS dispatch_payment_time_idx ON dispatch_records(payment_time);
CREATE INDEX IF NOT EXISTS dispatch_boarding_permit_time_idx ON dispatch_records(boarding_permit_time);

-- Done!
SELECT 'Migration completed successfully' AS result;
