-- 022: vehicles — operator_id, vehicle_type_id: uuid → TEXT
-- Chạy Supabase SQL Editor. Giữ dữ liệu (uuid hiện có → chuỗi text).
-- Gỡ FK tới operators / vehicle_types (lưu ref AppSheet, firebase_id, hoặc uuid dạng text).

BEGIN;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_schema = kcu.constraint_schema
     AND tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'vehicles'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name IN ('operator_id', 'vehicle_type_id')
  LOOP
    EXECUTE format(
      'ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS %I',
      r.constraint_name
    );
  END LOOP;
END $$;

ALTER TABLE vehicles
  ALTER COLUMN operator_id TYPE TEXT USING operator_id::text,
  ALTER COLUMN vehicle_type_id TYPE TEXT USING vehicle_type_id::text;

COMMENT ON COLUMN vehicles.operator_id IS 'Ref đơn vị: uuid hoặc operators.firebase_id (text)';
COMMENT ON COLUMN vehicles.vehicle_type_id IS 'Ref loại xe: uuid, mã loại, hoặc AppSheet ref (text)';

COMMIT;

SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vehicles'
  AND column_name IN ('operator_id', 'vehicle_type_id')
ORDER BY column_name;
