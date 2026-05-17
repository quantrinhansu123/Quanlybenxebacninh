-- 019b: Thêm MaHoSo nếu đã chạy 019 trước khi có cột này (metadata đã DROP → không backfill được)
-- Chạy trên Supabase SQL Editor (idempotent).

BEGIN;

ALTER TABLE vehicle_badges ADD COLUMN IF NOT EXISTS "MaHoSo" VARCHAR(255);

COMMENT ON COLUMN vehicle_badges."MaHoSo" IS 'AppSheet PHUHIEUXE.MaHoSo (mã hồ sơ)';

COMMIT;
