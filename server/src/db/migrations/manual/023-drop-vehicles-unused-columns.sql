-- 023: vehicles — xóa cột không dùng (resolve qua phù hiệu / AppSheet)
-- Chạy Supabase SQL Editor. Không hoàn tác.
-- Giữ: plate_number, seat_count, firebase_id, is_active, synced_at, ...

BEGIN;

DROP INDEX IF EXISTS vehicles_operator_idx;

ALTER TABLE vehicles DROP COLUMN IF EXISTS operator_id;
ALTER TABLE vehicles DROP COLUMN IF EXISTS vehicle_type_id;
ALTER TABLE vehicles DROP COLUMN IF EXISTS registration_expiry;
ALTER TABLE vehicles DROP COLUMN IF EXISTS insurance_expiry;
ALTER TABLE vehicles DROP COLUMN IF EXISTS road_worthiness_expiry;
ALTER TABLE vehicles DROP COLUMN IF EXISTS operational_status;
ALTER TABLE vehicles DROP COLUMN IF EXISTS operator_name;
ALTER TABLE vehicles DROP COLUMN IF EXISTS operator_code;
ALTER TABLE vehicles DROP COLUMN IF EXISTS metadata;
ALTER TABLE vehicles DROP COLUMN IF EXISTS source;

COMMIT;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vehicles'
ORDER BY ordinal_position;
