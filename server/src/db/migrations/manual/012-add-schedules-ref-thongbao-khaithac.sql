-- 012: schedules.ref_thongbao_khaithac (AppSheet Ref_ThongBaoKhaiThac)
-- Run in Supabase SQL Editor.

ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS ref_thongbao_khaithac VARCHAR(100);

COMMENT ON COLUMN schedules.ref_thongbao_khaithac IS
  'AppSheet Ref_ThongBaoKhaiThac -> THONGBAO_KHAITHAC.ID_TB';

CREATE INDEX IF NOT EXISTS schedules_ref_thongbao_khaithac_idx
  ON schedules (ref_thongbao_khaithac);

UPDATE schedules
SET ref_thongbao_khaithac = NULLIF(
  COALESCE(
    metadata #>> '{schedule_meta,Ref_ThongBaoKhaiThac}',
    metadata #>> '{schedule_meta,ref_thongbao_khaithac}'
  ),
  ''
)
WHERE ref_thongbao_khaithac IS NULL
  AND COALESCE(
    metadata #>> '{schedule_meta,Ref_ThongBaoKhaiThac}',
    metadata #>> '{schedule_meta,ref_thongbao_khaithac}'
  ) IS NOT NULL;
