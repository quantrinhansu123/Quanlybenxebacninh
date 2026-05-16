-- 014: Xóa toàn bộ dữ liệu bảng routes
-- Chạy trong Supabase SQL Editor. Không hoàn tác.
-- Giữ nguyên cấu trúc bảng, index, trigger.

BEGIN;

-- Gỡ tham chiếu FK (mặc định RESTRICT — không xóa được routes nếu còn trỏ tới)
UPDATE vehicle_badges SET route_id = NULL WHERE route_id IS NOT NULL;
UPDATE dispatch_records SET route_id = NULL WHERE route_id IS NOT NULL;

DELETE FROM routes;

COMMIT;
