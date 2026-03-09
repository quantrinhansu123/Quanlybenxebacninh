-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_code VARCHAR(50) UNIQUE NOT NULL,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  departure_time TIME NOT NULL,
  frequency_type VARCHAR(20) NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'specific_days')),
  days_of_week JSONB,
  effective_from VARCHAR(20) NOT NULL,
  effective_to VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS schedules_code_idx ON schedules(schedule_code);
CREATE INDEX IF NOT EXISTS schedules_route_idx ON schedules(route_id);
CREATE INDEX IF NOT EXISTS schedules_operator_idx ON schedules(operator_id);
CREATE INDEX IF NOT EXISTS schedules_active_idx ON schedules(is_active);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedules_updated_at_trigger
BEFORE UPDATE ON schedules
FOR EACH ROW
EXECUTE FUNCTION update_schedules_updated_at();

-- Add comment
COMMENT ON TABLE schedules IS 'Fixed operating schedules for routes by operators (Lịch trình cố định)';
