-- 024: Xóa trắng dữ liệu bảng vehicles (Xe / AppSheet)
-- Chạy Supabase SQL Editor — chạy TOÀN FILE (không chỉ dòng DELETE).
-- Không dùng TRUNCATE vehicles (FK từ dispatch_records, vehicle_documents, ...).

BEGIN;

SELECT COUNT(*) AS rows_before_delete FROM vehicles;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'id_mappings'
  ) THEN
    DELETE FROM id_mappings WHERE entity_type = 'vehicles';
  END IF;
END $$;

-- Gỡ mọi FK trỏ tới vehicles: cột NULL được → UPDATE NULL; NOT NULL → DELETE hết bảng con
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      child.relname AS table_name,
      att.attname AS column_name,
      NOT att.attnotnull AS is_nullable
    FROM pg_constraint con
    JOIN pg_class child ON con.conrelid = child.oid
    JOIN pg_class parent ON con.confrelid = parent.oid
    JOIN pg_namespace nsp ON child.relnamespace = nsp.oid
    JOIN pg_attribute att
      ON att.attrelid = child.oid
     AND att.attnum = ANY (con.conkey)
     AND NOT att.attisdropped
    WHERE con.contype = 'f'
      AND nsp.nspname = 'public'
      AND parent.relname = 'vehicles'
  LOOP
    IF r.is_nullable THEN
      EXECUTE format(
        'UPDATE %I SET %I = NULL WHERE %I IS NOT NULL',
        r.table_name, r.column_name, r.column_name
      );
      RAISE NOTICE 'NULL %.%', r.table_name, r.column_name;
    ELSE
      EXECUTE format('DELETE FROM %I', r.table_name);
      RAISE NOTICE 'DELETE ALL % (FK % NOT NULL)', r.table_name, r.column_name;
    END IF;
  END LOOP;
END $$;

DELETE FROM vehicles;

SELECT COUNT(*) AS rows_remaining FROM vehicles;

-- Kiểm tra còn bảng con trỏ tới vehicles không
SELECT child.relname AS referencing_table, att.attname AS column_name
FROM pg_constraint con
JOIN pg_class child ON con.conrelid = child.oid
JOIN pg_class parent ON con.confrelid = parent.oid
JOIN pg_namespace nsp ON child.relnamespace = nsp.oid
JOIN pg_attribute att
  ON att.attrelid = child.oid
 AND att.attnum = ANY (con.conkey)
WHERE con.contype = 'f'
  AND nsp.nspname = 'public'
  AND parent.relname = 'vehicles';

COMMIT;
