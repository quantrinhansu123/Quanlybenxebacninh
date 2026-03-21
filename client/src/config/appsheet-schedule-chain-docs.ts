/**
 * Văn bản giải thích chuỗi dữ liệu lịch AppSheet (hiển thị trong UI tiến trình).
 * Khớp với bảng/cột trong CLAUDE.md và appsheet.config.ts.
 */

export const ENV = {
  fixedSchedules: 'VITE_GTVT_APPSHEET_SCHEDULES_ENDPOINT',
  notifications: 'VITE_GTVT_APPSHEET_NOTIFICATIONS_ENDPOINT',
  busSchedules: 'VITE_GTVT_APPSHEET_BUS_SCHEDULES_ENDPOINT',
  busLookup: 'VITE_GTVT_APPSHEET_BUS_LOOKUP_ENDPOINT',
} as const

/** Gợi ý khi thiếu endpoint */
export function missingEndpointHint(logicalTable: keyof typeof ENV): string {
  return `\n\n⚠ Chưa cấu hình: ${ENV[logicalTable]} trong client/.env (tham chiếu client/.env.example).`
}

export const DOC_FULL = {
  fixedLoad: `① Tải bảng AppSheet «BieuDoChayXeChiTiet» (tuyến cố định — nút chạy)
• Endpoint env: ${ENV.fixedSchedules}
• Trên mỗi dòng, các cột dùng sau:
  – Ref_ThongBaoKhaiThac → giá trị này sẽ được tra ở bước ghép với THONGBAO_KHAITHAC.ID_TB
  – GioXuatBen → giờ xuất bến (sau bước chuẩn hóa)
  – Chieu → chiều chạy (chỉ giữ «Đi» / DI khi lọc)`,

  notificationsLoad: (routeCode: string) => `② Tải bảng «THONGBAO_KHAITHAC» (thông báo khai thác)
• Endpoint env: ${ENV.notifications}
• Cột ID_TB: khóa — mỗi giá trị khớp với Ref_ThongBaoKhaiThac từ bước ①
• Cột Ref_Tuyen: mã tuyến — sau này so với mã tuyến đã chọn trên form: «${routeCode}»
• Cột Ref_DonVi: tham chiếu đơn vị (dùng khi lọc/ghép operator)`,

  busSchedLoad: `③ Tải «GIOCHAY_BUYT» (giờ chạy xe buýt)
• Endpoint env: ${ENV.busSchedules}
• Cột BieuDo: giá trị tra cứu sang bước ④ tại BIEUDOCHAY_BUYT.ID_BieuDo`,

  busLookupLoad: `④ Tải «BIEUDOCHAY_BUYT» (biểu đồ chạy buýt — tra cứu)
• Endpoint env: ${ENV.busLookup}
• Cột ID_BieuDo: khóa — nhận giá trị từ GIOCHAY_BUYT.BieuDo (bước ③)
• Cột TuyenBuyt → map thành Ref_Tuyen; DonViKhaiThac → map thành Ref_DonVi (cùng logic enrich buýt)`,

  mergeFixed: `⑤ Ghép tuyến cố định (enrichRows)
• Lấy từng dòng BieuDoChayXeChiTiet: đọc Ref_ThongBaoKhaiThac
• Tra bảng THONGBAO_KHAITHAC: tìm dòng có ID_TB = giá trị đó
• Khi khớp: ghi đè/ghép vào dòng nút chạy các trường Ref_Tuyen, Ref_DonVi lấy từ bản ghi TB
• Sau đó normalizeScheduleRows: đọc GioXuatBen, Chieu, LoaiNgay, … → đối tượng lịch chuẩn`,

  mergeBus: `⑥ Ghép lịch buýt (enrichRows)
• Lấy từng dòng GIOCHAY_BUYT: đọc BieuDo
• Tra BIEUDOCHAY_BUYT: ID_BieuDo = giá trị đó → lấy TuyenBuyt, DonViKhaiThac
• normalizeBusScheduleRows: cùng họ cột thời gian/chiều như cố định (theo normalizer buýt)`,

  filter: (routeCode: string, operatorCode: string) => `⑦ Lọc theo tuyến + chiều + đơn vị (trên dữ liệu đã chuẩn hóa)
• So khớp routeCode (chuẩn hóa in hoa/khoảng trắng) = «${routeCode}» với trường routeCode sau normalize (nguồn từ Ref_Tuyen / MaTuyen / SoHieuTuyen tùy dòng)
• Chỉ giữ direction = Đi hoặc DI
• ${
    operatorCode
      ? `Lọc thêm operatorCode từ AppSheet = «${operatorCode}» (khớp mã đơn vị đã chọn trên form).`
      : 'Chưa chọn đơn vị → không lọc theo MaDonVi; vẫn cần gán được operatorId từ mã trên từng dòng.'
  }`,

  resolve: `⑧ Gán operator trong ứng dụng
• Mỗi lịch có operatorCode (từ Ref_DonVi / MaDonVi sau normalize)
• Tra danh sách operators trong DB form: khớp operators.code → lấy operators.id (UUID)
• Không gán được → bỏ qua dòng đó (không hiển thị trong dropdown)`,
}

export const DOC_TB = {
  fixedLoad: `① Tải «BieuDoChayXeChiTiet»
• ${ENV.fixedSchedules}
• Cột Ref_ThongBaoKhaiThac sẽ khớp ID_TB ở bước sau`,

  notificationsLoad: (routeCode: string) => `② Tải «THONGBAO_KHAITHAC»
• ${ENV.notifications}
• Lọc logic: chỉ các TB có Ref_Tuyen (chuẩn hóa) = mã tuyến form «${routeCode}» → thu được tập ID_TB hợp lệ`,

  filterTb: (routeCode: string) => `③ Lọc nút chạy theo chuỗi TB
• Giữ dòng BieuDoChayXeChiTiet khi Ref_ThongBaoKhaiThac ∈ {ID_TB từ bước ②}
• Và Chieu hiển thị rõ «Đi» / DI
• Mã tuyến đối chiếu: «${routeCode}» qua Ref_Tuyen trên TB`,

  enrich: `④ Ghép lại TB vào dòng đã lọc (enrichRows)
• Ref_ThongBaoKhaiThac = ID_TB → copy Ref_Tuyen, Ref_DonVi vào dòng`,

  normalize: `⑤ Chuẩn hóa (normalizeScheduleRows)
• Giờ: GioXuatBen → departureTime; Chiều → direction`,

  operatorFilter: (operatorCode: string) => `⑥ Lọc/ghép đơn vị
• ${
    operatorCode
      ? `Chỉ giữ dòng có operatorCode khớp «${operatorCode}»; gán operatorId = UUID đơn vị đã chọn.`
      : 'Không chọn ĐV trên form: gán operatorId theo MaDonVi từng dòng nếu khớp danh sách operators.'
  }`,
}
