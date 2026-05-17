-- 020: Xóa trắng bảng vehicle_badges (PHUHIEUXE)
-- Chạy trong Supabase SQL Editor. Không hoàn tác.
-- Giữ nguyên cấu trúc bảng, cột AppSheet (Ref_*, MaHoSo, ...), index.
--
-- KHÔNG xóa: vehicles, routes, operators, schedules, operation_notices, ...
-- Sau khi xóa: sync lại từ AppSheet / sheet hoặc ETL.

-- (Tuỳ chọn) Xóa mapping firebase → uuid để import lại sạch
DELETE FROM id_mappings WHERE entity_type = 'vehicle_badges';

DELETE FROM vehicle_badges;

-- Kiểm tra
SELECT COUNT(*) AS remaining FROM vehicle_badges;
