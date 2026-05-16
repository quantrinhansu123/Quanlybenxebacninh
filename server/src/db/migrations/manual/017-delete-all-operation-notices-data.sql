-- 017: Xóa riêng bảng operation_notices (THONGBAO_KHAITHAC)
-- Chạy trong Supabase SQL Editor. Không hoàn tác.
--
-- CHỈ xóa: public.operation_notices
-- KHÔNG xóa: schedules, routes, operators, gio_chay_buyt, ...
-- schedules vẫn còn Ref_ThongBaoKhaiThac nhưng mất join tuyến/đơn vị qua TB cho đến khi sync lại.

BEGIN;

DELETE FROM public.operation_notices;

COMMIT;
