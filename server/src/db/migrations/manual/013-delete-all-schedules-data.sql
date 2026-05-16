-- 013: Xóa toàn bộ dữ liệu bảng schedules
-- Chạy trong Supabase SQL Editor. Không hoàn tác.
-- Giữ nguyên cấu trúc bảng, index, trigger.

BEGIN;

DELETE FROM schedules;

COMMIT;
