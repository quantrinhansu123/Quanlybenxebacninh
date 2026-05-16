-- Chạy riêng nếu 016 đã fail ở bước CREATE UNIQUE INDEX (cột id_appsheet đã có).
-- Gỡ trùng rồi tạo lại index.

BEGIN;

WITH ranked AS (
  SELECT
    id,
    TRIM(id_appsheet) AS id_appsheet_key,
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

-- Kiểm tra (phải 0 dòng) trước khi tạo index:
-- SELECT id_appsheet, COUNT(*) FROM operation_notices
-- WHERE id_appsheet IS NOT NULL AND TRIM(id_appsheet) <> ''
-- GROUP BY 1 HAVING COUNT(*) > 1;

DROP INDEX IF EXISTS notices_id_appsheet_idx;

CREATE UNIQUE INDEX notices_id_appsheet_idx
  ON operation_notices (id_appsheet)
  WHERE id_appsheet IS NOT NULL AND id_appsheet <> '';

COMMIT;
