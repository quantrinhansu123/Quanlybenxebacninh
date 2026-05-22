-- 020: Xóa trắng dữ liệu bảng vehicle_badges (PHUHIEUXE)
-- Chạy trong Supabase SQL Editor. Không hoàn tác.
-- Giữ nguyên cấu trúc bảng, cột AppSheet (Ref_*, MaHoSo, ...), index.
--
-- KHÔNG xóa: vehicles, routes, operators, schedules, operation_notices, ...
-- Sau khi xóa: sync lại — npm run etl:sync-vehicle-badges (server) hoặc AppSheet sync.

BEGIN;

SELECT COUNT(*) AS rows_before_delete FROM vehicle_badges;

-- Mapping firebase_id → uuid (ETL/import)
DELETE FROM id_mappings WHERE entity_type = 'vehicle_badges';

-- Bảng staging ETL (nếu còn sau lần sync dở)
DROP TABLE IF EXISTS _sync_vehicle_badges_tmp;

-- Xóa toàn bộ phù hiệu (~22k dòng). Không DROP TABLE.
TRUNCATE TABLE vehicle_badges;

SELECT COUNT(*) AS rows_remaining FROM vehicle_badges;

COMMIT;
