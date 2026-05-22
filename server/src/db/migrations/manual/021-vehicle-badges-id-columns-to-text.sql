-- 021: vehicle_badges — vehicle_id, operator_id, route_id: uuid → TEXT
-- Chạy Supabase SQL Editor. Giữ dữ liệu (uuid hiện có → chuỗi text).
-- Gỡ FK tới vehicles / operators / routes (lưu ref AppSheet, firebase_id, hoặc uuid dạng text).

BEGIN;

-- Gỡ mọi FOREIGN KEY trên 3 cột (tên constraint có thể khác giữa môi trường)
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
      AND tc.table_name = 'vehicle_badges'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name IN ('vehicle_id', 'operator_id', 'route_id')
  LOOP
    EXECUTE format(
      'ALTER TABLE vehicle_badges DROP CONSTRAINT IF EXISTS %I',
      r.constraint_name
    );
  END LOOP;
END $$;

ALTER TABLE vehicle_badges
  ALTER COLUMN vehicle_id TYPE TEXT USING vehicle_id::text,
  ALTER COLUMN operator_id TYPE TEXT USING operator_id::text,
  ALTER COLUMN route_id TYPE TEXT USING route_id::text;

COMMENT ON COLUMN vehicle_badges.vehicle_id IS 'Ref xe: uuid, plate ref, hoặc AppSheet ID (text)';
COMMENT ON COLUMN vehicle_badges.operator_id IS 'Ref đơn vị: uuid hoặc operators.firebase_id (text)';
COMMENT ON COLUMN vehicle_badges.route_id IS 'Ref tuyến: uuid, route_code, hoặc routes.firebase_id (text)';

COMMIT;

-- Kiểm tra
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vehicle_badges'
  AND column_name IN ('vehicle_id', 'operator_id', 'route_id')
ORDER BY column_name;
