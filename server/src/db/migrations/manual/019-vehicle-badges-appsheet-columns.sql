-- 019: vehicle_badges — bỏ source/synced_at/metadata/route_name; thêm cột AppSheet PHUHIEUXE
-- Chạy trên Supabase SQL Editor (idempotent).
-- Ref/MaHoSo: VARCHAR(255) + LEFT() khi backfill metadata.

-- 1) Thêm cột mới
ALTER TABLE vehicle_badges ADD COLUMN IF NOT EXISTS "Ref_GPKD" VARCHAR(255);
ALTER TABLE vehicle_badges ADD COLUMN IF NOT EXISTS "Ref_ThongBao" VARCHAR(255);
ALTER TABLE vehicle_badges ADD COLUMN IF NOT EXISTS "Ref_DonViCapPhuHieu" VARCHAR(255);
ALTER TABLE vehicle_badges ADD COLUMN IF NOT EXISTS "LoaiCap" VARCHAR(255);
ALTER TABLE vehicle_badges ADD COLUMN IF NOT EXISTS "LyDoCapLai" TEXT;
ALTER TABLE vehicle_badges ADD COLUMN IF NOT EXISTS "SoPhuHieuCu" VARCHAR(50);
ALTER TABLE vehicle_badges ADD COLUMN IF NOT EXISTS "MaHoSo" VARCHAR(255);

-- Mở rộng nếu đã tạo VARCHAR(100) từ lần chạy lỗi
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicle_badges' AND column_name = 'Ref_GPKD'
  ) THEN
    EXECUTE 'ALTER TABLE vehicle_badges
      ALTER COLUMN "Ref_GPKD" TYPE VARCHAR(255),
      ALTER COLUMN "Ref_ThongBao" TYPE VARCHAR(255),
      ALTER COLUMN "Ref_DonViCapPhuHieu" TYPE VARCHAR(255),
      ALTER COLUMN "LoaiCap" TYPE VARCHAR(255)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicle_badges' AND column_name = 'MaHoSo'
  ) THEN
    EXECUTE 'ALTER TABLE vehicle_badges ALTER COLUMN "MaHoSo" TYPE VARCHAR(255)';
  END IF;
END $$;

COMMENT ON COLUMN vehicle_badges."Ref_GPKD" IS 'AppSheet PHUHIEUXE.Ref_GPKD';
COMMENT ON COLUMN vehicle_badges."Ref_ThongBao" IS 'AppSheet PHUHIEUXE.Ref_ThongBao';
COMMENT ON COLUMN vehicle_badges."Ref_DonViCapPhuHieu" IS 'AppSheet PHUHIEUXE.Ref_DonViCapPhuHieu (operator firebase_id)';
COMMENT ON COLUMN vehicle_badges."LoaiCap" IS 'AppSheet PHUHIEUXE.LoaiCap';
COMMENT ON COLUMN vehicle_badges."LyDoCapLai" IS 'AppSheet PHUHIEUXE.LyDoCapLai';
COMMENT ON COLUMN vehicle_badges."SoPhuHieuCu" IS 'AppSheet PHUHIEUXE.SoPhuHieuCu';
COMMENT ON COLUMN vehicle_badges."MaHoSo" IS 'AppSheet PHUHIEUXE.MaHoSo (mã hồ sơ)';

-- 2) Backfill từ metadata (trước khi DROP)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicle_badges' AND column_name = 'metadata'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicle_badges' AND column_name = 'Ref_GPKD'
  ) THEN
    UPDATE vehicle_badges
    SET
      "Ref_GPKD" = LEFT(COALESCE(
        NULLIF(TRIM("Ref_GPKD"), ''),
        NULLIF(TRIM(metadata->>'business_license_ref'), '')
      ), 255),
      "Ref_DonViCapPhuHieu" = LEFT(COALESCE(
        NULLIF(TRIM("Ref_DonViCapPhuHieu"), ''),
        NULLIF(TRIM(metadata->>'issuing_authority_ref'), '')
      ), 255),
      "LoaiCap" = LEFT(COALESCE(
        NULLIF(TRIM("LoaiCap"), ''),
        NULLIF(TRIM(metadata->>'issue_type'), ''),
        NULLIF(TRIM(metadata->>'issueType'), '')
      ), 255),
      "LyDoCapLai" = COALESCE(
        NULLIF(TRIM("LyDoCapLai"), ''),
        NULLIF(TRIM(metadata->>'renewal_reason'), '')
      ),
      "SoPhuHieuCu" = LEFT(COALESCE(
        NULLIF(TRIM("SoPhuHieuCu"), ''),
        NULLIF(TRIM(metadata->>'old_badge_number'), '')
      ), 50),
      "Ref_ThongBao" = LEFT(COALESCE(
        NULLIF(TRIM("Ref_ThongBao"), ''),
        NULLIF(TRIM(metadata->>'notification_ref'), ''),
        NULLIF(TRIM(metadata->>'route_ref'), '')
      ), 255),
      "MaHoSo" = LEFT(COALESCE(
        NULLIF(TRIM("MaHoSo"), ''),
        NULLIF(TRIM(metadata->>'file_number'), ''),
        NULLIF(TRIM(metadata->>'file_code'), '')
      ), 255)
    WHERE metadata IS NOT NULL;
  END IF;
END $$;

-- 3) Xóa cột cũ
ALTER TABLE vehicle_badges DROP COLUMN IF EXISTS source;
ALTER TABLE vehicle_badges DROP COLUMN IF EXISTS synced_at;
ALTER TABLE vehicle_badges DROP COLUMN IF EXISTS metadata;
ALTER TABLE vehicle_badges DROP COLUMN IF EXISTS route_name;

CREATE INDEX IF NOT EXISTS vb_ref_don_vi_cap_idx ON vehicle_badges ("Ref_DonViCapPhuHieu");
CREATE INDEX IF NOT EXISTS vb_ref_thong_bao_idx ON vehicle_badges ("Ref_ThongBao");
