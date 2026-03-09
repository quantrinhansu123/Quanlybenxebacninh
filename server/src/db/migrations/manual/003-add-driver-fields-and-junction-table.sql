-- Manual migration: Add missing columns to drivers and create driver_operators junction table
-- Run this in Supabase SQL Editor

-- =====================================================
-- DRIVERS TABLE - Add missing columns
-- =====================================================

-- Rename 'name' to 'full_name' for consistency
ALTER TABLE drivers RENAME COLUMN name TO full_name;

-- Rename 'license_expiry' to 'license_expiry_date'
ALTER TABLE drivers RENAME COLUMN license_expiry TO license_expiry_date;

-- Add missing columns
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS image_url TEXT;

-- =====================================================
-- DRIVER_OPERATORS JUNCTION TABLE
-- =====================================================

-- Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS driver_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, operator_id)
);

-- Create indexes for junction table
CREATE INDEX IF NOT EXISTS driver_operators_driver_id_idx ON driver_operators(driver_id);
CREATE INDEX IF NOT EXISTS driver_operators_operator_id_idx ON driver_operators(operator_id);
CREATE INDEX IF NOT EXISTS driver_operators_primary_idx ON driver_operators(is_primary) WHERE is_primary = TRUE;

-- Done!
SELECT 'Migration 003 completed successfully' AS result;
