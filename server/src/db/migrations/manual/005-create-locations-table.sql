-- Create locations table (Điểm đón trả/Trạm xe)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  station_type VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS locations_code_idx ON locations(code);
CREATE INDEX IF NOT EXISTS locations_active_idx ON locations(is_active);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS locations_updated_at_trigger ON locations;
CREATE TRIGGER locations_updated_at_trigger
BEFORE UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION update_locations_updated_at();

-- Add comment
COMMENT ON TABLE locations IS 'Pickup/dropoff locations and bus stations (Điểm đón trả/Trạm xe)';
