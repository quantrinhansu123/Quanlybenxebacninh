-- Enable RLS on all public tables
-- Backend uses service_role key which bypasses RLS, so this is for security best practice

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_formula_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_charges ENABLE ROW LEVEL SECURITY;

-- Create policies for service_role only (backend access)
-- service_role bypasses RLS by default, but explicit policies satisfy the linter
-- Anon users get no access (correct for backend-only apps)

CREATE POLICY "Backend service role access" ON users TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON routes TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON vehicle_badges TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON shifts TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON id_mappings TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON vehicle_types TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON invoices TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON operators TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON dispatch_records TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON vehicles TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON vehicle_documents TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON audit_logs TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON locations TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON drivers TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON driver_operators TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON services TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON service_formula_usage TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON service_formulas TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend service role access" ON service_charges TO service_role USING (true) WITH CHECK (true);

-- Fix function search_path for update_locations_updated_at
CREATE OR REPLACE FUNCTION public.update_locations_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
