-- Chạy trên Supabase SQL Editor nếu API báo lỗi liên quan payment_shift_id / permit_shift_id / column does not exist.
-- Idempotent (IF NOT EXISTS).

ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS entry_shift_id UUID REFERENCES shifts(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS permit_shift_id UUID REFERENCES shifts(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_shift_id UUID REFERENCES shifts(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS departure_order_shift_id UUID REFERENCES shifts(id);
ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS exit_shift_id UUID REFERENCES shifts(id);

SELECT '008 dispatch shift columns OK' AS result;
