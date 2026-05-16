-- 016: operation_notices.id_appsheet (= AppSheet THONGBAO_KHAITHAC.ID_TB)
-- Khớp schedules.Ref_ThongBaoKhaiThac → operation_notices.id_appsheet
-- Chạy trên Supabase SQL Editor (idempotent).

BEGIN;

ALTER TABLE operation_notices
  ADD COLUMN IF NOT EXISTS id_appsheet VARCHAR(100);

COMMENT ON COLUMN operation_notices.id_appsheet IS
  'AppSheet THONGBAO_KHAITHAC.ID_TB; schedules.Ref_ThongBaoKhaiThac join trực tiếp cột này';

-- Backfill từ file_path: THONGBAO_KHAITHAC_Files_/2c91d981.File.xxx.pdf
UPDATE operation_notices
SET id_appsheet = NULLIF(
  TRIM(
    SUBSTRING(
      file_path
      FROM 'THONGBAO_KHAITHAC_Files_/([^./]+)'
    )
  ),
  ''
)
WHERE id_appsheet IS NULL
  AND file_path IS NOT NULL
  AND file_path ILIKE '%THONGBAO_KHAITHAC_Files_%/%';

-- Trùng id_appsheet (import/upsert trùng): giữ 1 bản, các bản còn lại NULL → join fallback file_path
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY TRIM(id_appsheet)
      ORDER BY
        (file_url IS NOT NULL AND TRIM(file_url) <> '') DESC,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id
    ) AS rn
  FROM operation_notices
  WHERE id_appsheet IS NOT NULL
    AND TRIM(id_appsheet) <> ''
)
UPDATE operation_notices n
SET id_appsheet = NULL
FROM ranked r
WHERE n.id = r.id
  AND r.rn > 1;

DROP INDEX IF EXISTS notices_id_appsheet_idx;

CREATE UNIQUE INDEX notices_id_appsheet_idx
  ON operation_notices (id_appsheet)
  WHERE id_appsheet IS NOT NULL AND id_appsheet <> '';

COMMIT;
