-- 019d: Chỉ tạo index (nếu 019c đã chạy xong bước 1–4, chỉ lỗi ở index)
-- Chạy 2 dòng sau (hoặc cả file):

CREATE INDEX IF NOT EXISTS vb_ref_don_vi_cap_idx ON vehicle_badges ("Ref_DonViCapPhuHieu");
CREATE INDEX IF NOT EXISTS vb_ref_thong_bao_idx ON vehicle_badges ("Ref_ThongBao");
