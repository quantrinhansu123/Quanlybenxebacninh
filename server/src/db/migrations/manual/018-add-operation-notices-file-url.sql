-- 018: Thêm file_url (tùy chọn, lưu link AppSheet đã build sẵn)
-- Query schedules chỉ cần file_path; cột này cho sync/ETL tương lai.

BEGIN;

ALTER TABLE operation_notices
  ADD COLUMN IF NOT EXISTS file_url TEXT;

COMMENT ON COLUMN operation_notices.file_url IS
  'URL file (AppSheet gettablefileurl); có thể build runtime từ file_path';

COMMIT;
