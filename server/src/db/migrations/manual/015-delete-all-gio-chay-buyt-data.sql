-- 015: Xóa riêng bảng gio_chay_buyt (AppSheet GIOCHAY_BUYT)
-- Chạy trong Supabase SQL Editor. Không hoàn tác.
--
-- CHỈ xóa: public.gio_chay_buyt
-- KHÔNG xóa: bieu_do_chay_buyt, routes, schedules, vehicle_badges, ...

BEGIN;

DELETE FROM public.gio_chay_buyt;

COMMIT;
