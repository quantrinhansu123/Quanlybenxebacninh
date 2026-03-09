// ============================================================
// DANH SÁCH 63 TỈNH THÀNH VIỆT NAM TRƯỚC SÁP NHẬP (V1)
// ============================================================
export const PROVINCES_V1 = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bạc Liêu", "Bắc Giang", "Bắc Kạn",
  "Bắc Ninh", "Bến Tre", "Bình Dương", "Bình Định", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cao Bằng", "Cần Thơ", "Đà Nẵng",
  "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp",
  "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh",
  "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
  "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng",
  "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An",
  "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình",
  "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng",
  "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa",
  "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang", "Vĩnh Long",
  "Vĩnh Phúc", "Yên Bái",
]

// Quận huyện theo tỉnh thành TRƯỚC sáp nhập (V1)
export const DISTRICTS_BY_PROVINCE_V1: Record<string, string[]> = {
  "An Giang": [
    "TP. Long Xuyên", "TP. Châu Đốc", "TX. Tân Châu",
    "H. An Phú", "H. Tịnh Biên", "H. Tri Tôn", "H. Châu Phú",
    "H. Chợ Mới", "H. Phú Tân", "H. Thoại Sơn", "H. Châu Thành",
  ],
  "Bà Rịa - Vũng Tàu": [
    "TP. Vũng Tàu", "TP. Bà Rịa", "TX. Phú Mỹ",
    "H. Châu Đức", "H. Xuyên Mộc", "H. Long Điền", "H. Đất Đỏ", "H. Côn Đảo",
  ],
  "Bạc Liêu": [
    "TP. Bạc Liêu", "TX. Giá Rai",
    "H. Vĩnh Lợi", "H. Hồng Dân", "H. Phước Long", "H. Hòa Bình", "H. Đông Hải",
  ],
  "Bắc Giang": [
    "TP. Bắc Giang",
    "H. Yên Thế", "H. Tân Yên", "H. Lạng Giang", "H. Lục Nam",
    "H. Lục Ngạn", "H. Sơn Động", "H. Yên Dũng", "H. Việt Yên", "H. Hiệp Hòa",
  ],
  "Bắc Kạn": [
    "TP. Bắc Kạn",
    "H. Pác Nặm", "H. Ba Bể", "H. Ngân Sơn", "H. Bạch Thông",
    "H. Chợ Đồn", "H. Chợ Mới", "H. Na Rì",
  ],
  "Bắc Ninh": [
    "TP. Bắc Ninh", "TX. Từ Sơn",
    "H. Yên Phong", "H. Quế Võ", "H. Tiên Du", "H. Thuận Thành",
    "H. Gia Bình", "H. Lương Tài",
  ],
  "Bến Tre": [
    "TP. Bến Tre",
    "H. Châu Thành", "H. Chợ Lách", "H. Mỏ Cày Nam", "H. Giồng Trôm",
    "H. Bình Đại", "H. Ba Tri", "H. Thạnh Phú", "H. Mỏ Cày Bắc",
  ],
  "Bình Dương": [
    "TP. Thủ Dầu Một", "TP. Thuận An", "TP. Dĩ An", "TP. Tân Uyên",
    "TX. Bến Cát", "H. Bàu Bàng", "H. Dầu Tiếng", "H. Phú Giáo", "H. Bắc Tân Uyên",
  ],
  "Bình Định": [
    "TP. Quy Nhơn", "TX. An Nhơn", "TX. Hoài Nhơn",
    "H. An Lão", "H. Hoài Ân", "H. Phù Mỹ", "H. Vĩnh Thạnh",
    "H. Tây Sơn", "H. Phù Cát", "H. Vân Canh", "H. Tuy Phước",
  ],
  "Bình Phước": [
    "TP. Đồng Xoài", "TX. Bình Long", "TX. Phước Long", "TX. Chơn Thành",
    "H. Bù Gia Mập", "H. Lộc Ninh", "H. Bù Đốp", "H. Hớn Quản",
    "H. Đồng Phú", "H. Bù Đăng", "H. Phú Riềng",
  ],
  "Bình Thuận": [
    "TP. Phan Thiết", "TX. La Gi",
    "H. Tuy Phong", "H. Bắc Bình", "H. Hàm Thuận Bắc", "H. Hàm Thuận Nam",
    "H. Tánh Linh", "H. Hàm Tân", "H. Đức Linh", "H. Phú Quý",
  ],
  "Cà Mau": [
    "TP. Cà Mau",
    "H. U Minh", "H. Thới Bình", "H. Trần Văn Thời", "H. Cái Nước",
    "H. Đầm Dơi", "H. Năm Căn", "H. Phú Tân", "H. Ngọc Hiển",
  ],
  "Cao Bằng": [
    "TP. Cao Bằng",
    "H. Bảo Lâm", "H. Bảo Lạc", "H. Hà Quảng", "H. Trùng Khánh",
    "H. Hạ Lang", "H. Quảng Hòa", "H. Hoà An", "H. Nguyên Bình", "H. Thạch An",
  ],
  "Cần Thơ": [
    "Q. Ninh Kiều", "Q. Ô Môn", "Q. Bình Thủy", "Q. Cái Răng", "Q. Thốt Nốt",
    "H. Vĩnh Thạnh", "H. Cờ Đỏ", "H. Phong Điền", "H. Thới Lai",
  ],
  "Đà Nẵng": [
    "Q. Hải Châu", "Q. Thanh Khê", "Q. Sơn Trà", "Q. Ngũ Hành Sơn",
    "Q. Liên Chiểu", "Q. Cẩm Lệ", "H. Hòa Vang", "H. Hoàng Sa",
  ],
  "Đắk Lắk": [
    "TP. Buôn Ma Thuột", "TX. Buôn Hồ",
    "H. Ea H'leo", "H. Ea Súp", "H. Buôn Đôn", "H. Cư M'gar",
    "H. Krông Búk", "H. Krông Năng", "H. Ea Kar", "H. M'Đrắk",
    "H. Krông Bông", "H. Krông Pắc", "H. Krông A Na", "H. Lắk", "H. Cư Kuin",
  ],
  "Đắk Nông": [
    "TP. Gia Nghĩa",
    "H. Đắk Glong", "H. Cư Jút", "H. Đắk Mil", "H. Krông Nô",
    "H. Đắk Song", "H. Đắk R'Lấp", "H. Tuy Đức",
  ],
  "Điện Biên": [
    "TP. Điện Biên Phủ", "TX. Mường Lay",
    "H. Mường Nhé", "H. Mường Chà", "H. Tủa Chùa", "H. Tuần Giáo",
    "H. Điện Biên", "H. Điện Biên Đông", "H. Mường Ảng", "H. Nậm Pồ",
  ],
  "Đồng Nai": [
    "TP. Biên Hòa", "TP. Long Khánh",
    "H. Tân Phú", "H. Vĩnh Cửu", "H. Định Quán", "H. Trảng Bom",
    "H. Thống Nhất", "H. Cẩm Mỹ", "H. Long Thành", "H. Xuân Lộc", "H. Nhơn Trạch",
  ],
  "Đồng Tháp": [
    "TP. Cao Lãnh", "TP. Sa Đéc", "TX. Hồng Ngự",
    "H. Tân Hồng", "H. Hồng Ngự", "H. Tam Nông", "H. Tháp Mười",
    "H. Cao Lãnh", "H. Thanh Bình", "H. Lấp Vò", "H. Lai Vung", "H. Châu Thành",
  ],
  "Gia Lai": [
    "TP. Pleiku", "TX. An Khê", "TX. Ayun Pa",
    "H. Kbang", "H. Đăk Đoa", "H. Chư Păh", "H. Ia Grai",
    "H. Mang Yang", "H. Kông Chro", "H. Đức Cơ", "H. Chư Prông",
    "H. Chư Sê", "H. Đăk Pơ", "H. Ia Pa", "H. Krông Pa", "H. Phú Thiện", "H. Chư Pưh",
  ],
  "Hà Giang": [
    "TP. Hà Giang",
    "H. Đồng Văn", "H. Mèo Vạc", "H. Yên Minh", "H. Quản Bạ",
    "H. Vị Xuyên", "H. Bắc Mê", "H. Hoàng Su Phì", "H. Xín Mần",
    "H. Bắc Quang", "H. Quang Bình",
  ],
  "Hà Nam": [
    "TP. Phủ Lý",
    "H. Duy Tiên", "H. Kim Bảng", "H. Thanh Liêm", "H. Bình Lục", "H. Lý Nhân",
  ],
  "Hà Nội": [
    "Q. Ba Đình", "Q. Hoàn Kiếm", "Q. Tây Hồ", "Q. Long Biên", "Q. Cầu Giấy",
    "Q. Đống Đa", "Q. Hai Bà Trưng", "Q. Hoàng Mai", "Q. Thanh Xuân",
    "Q. Nam Từ Liêm", "Q. Bắc Từ Liêm", "Q. Hà Đông",
    "TX. Sơn Tây",
    "H. Sóc Sơn", "H. Đông Anh", "H. Gia Lâm", "H. Mê Linh", "H. Ba Vì",
    "H. Phúc Thọ", "H. Đan Phượng", "H. Hoài Đức", "H. Quốc Oai",
    "H. Thạch Thất", "H. Chương Mỹ", "H. Thanh Oai", "H. Thường Tín",
    "H. Phú Xuyên", "H. Ứng Hòa", "H. Mỹ Đức", "H. Thanh Trì",
  ],
  "Hà Tĩnh": [
    "TP. Hà Tĩnh", "TX. Hồng Lĩnh", "TX. Kỳ Anh",
    "H. Hương Sơn", "H. Đức Thọ", "H. Vũ Quang", "H. Nghi Xuân",
    "H. Can Lộc", "H. Hương Khê", "H. Thạch Hà", "H. Cẩm Xuyên",
    "H. Kỳ Anh", "H. Lộc Hà",
  ],
  "Hải Dương": [
    "TP. Hải Dương", "TX. Chí Linh", "TX. Kinh Môn",
    "H. Nam Sách", "H. Thanh Hà", "H. Kim Thành", "H. Gia Lộc",
    "H. Tứ Kỳ", "H. Ninh Giang", "H. Thanh Miện", "H. Cẩm Giàng", "H. Bình Giang",
  ],
  "Hải Phòng": [
    "Q. Hồng Bàng", "Q. Ngô Quyền", "Q. Lê Chân", "Q. Hải An", "Q. Kiến An",
    "Q. Đồ Sơn", "Q. Dương Kinh",
    "H. Thuỷ Nguyên", "H. An Dương", "H. An Lão", "H. Kiến Thuỵ",
    "H. Tiên Lãng", "H. Vĩnh Bảo", "H. Cát Hải", "H. Bạch Long Vĩ",
  ],
  "Hậu Giang": [
    "TP. Vị Thanh", "TX. Ngã Bảy", "TX. Long Mỹ",
    "H. Châu Thành A", "H. Châu Thành", "H. Phụng Hiệp", "H. Vị Thủy",
  ],
  "Hòa Bình": [
    "TP. Hòa Bình",
    "H. Đà Bắc", "H. Lương Sơn", "H. Kim Bôi", "H. Cao Phong",
    "H. Tân Lạc", "H. Mai Châu", "H. Lạc Sơn", "H. Yên Thủy", "H. Lạc Thủy",
  ],
  "Hưng Yên": [
    "TP. Hưng Yên",
    "H. Văn Lâm", "H. Văn Giang", "H. Yên Mỹ", "H. Mỹ Hào",
    "H. Ân Thi", "H. Khoái Châu", "H. Kim Động", "H. Tiên Lữ", "H. Phù Cừ",
  ],
  "Khánh Hòa": [
    "TP. Nha Trang", "TP. Cam Ranh", "TX. Ninh Hòa",
    "H. Vạn Ninh", "H. Khánh Vĩnh", "H. Diên Khánh", "H. Khánh Sơn",
    "H. Trường Sa", "H. Cam Lâm",
  ],
  "Kiên Giang": [
    "TP. Rạch Giá", "TP. Hà Tiên", "TX. Kiên Lương",
    "H. Kiên Hải", "H. Châu Thành", "H. Giồng Riềng", "H. Gò Quao",
    "H. An Biên", "H. An Minh", "H. Vĩnh Thuận", "H. Phú Quốc",
    "H. Tân Hiệp", "H. Hòn Đất", "H. Giang Thành", "H. U Minh Thượng",
  ],
  "Kon Tum": [
    "TP. Kon Tum",
    "H. Đắk Glei", "H. Ngọc Hồi", "H. Đắk Tô", "H. Kon Plông",
    "H. Kon Rẫy", "H. Đắk Hà", "H. Sa Thầy", "H. Tu Mơ Rông", "H. Ia H'Drai",
  ],
  "Lai Châu": [
    "TP. Lai Châu",
    "H. Tam Đường", "H. Mường Tè", "H. Sìn Hồ", "H. Phong Thổ",
    "H. Than Uyên", "H. Tân Uyên", "H. Nậm Nhùn",
  ],
  "Lâm Đồng": [
    "TP. Đà Lạt", "TP. Bảo Lộc",
    "H. Đức Trọng", "H. Lạc Dương", "H. Đơn Dương", "H. Đạ Huoai",
    "H. Đạ Tẻh", "H. Cát Tiên", "H. Đam Rông", "H. Lâm Hà", "H. Bảo Lâm",
  ],
  "Lạng Sơn": [
    "TP. Lạng Sơn",
    "H. Tràng Định", "H. Bình Gia", "H. Văn Lãng", "H. Cao Lộc",
    "H. Văn Quan", "H. Bắc Sơn", "H. Hữu Lũng", "H. Chi Lăng",
    "H. Lộc Bình", "H. Đình Lập",
  ],
  "Lào Cai": [
    "TP. Lào Cai", "TX. Sa Pa",
    "H. Bát Xát", "H. Mường Khương", "H. Si Ma Cai", "H. Bắc Hà",
    "H. Bảo Thắng", "H. Bảo Yên", "H. Văn Bàn",
  ],
  "Long An": [
    "TP. Tân An", "TX. Kiến Tường",
    "H. Tân Hưng", "H. Vĩnh Hưng", "H. Mộc Hóa", "H. Tân Thạnh",
    "H. Thạnh Hóa", "H. Đức Huệ", "H. Đức Hòa", "H. Bến Lức",
    "H. Thủ Thừa", "H. Tân Trụ", "H. Cần Đước", "H. Cần Giuộc", "H. Châu Thành",
  ],
  "Nam Định": [
    "TP. Nam Định",
    "H. Mỹ Lộc", "H. Vụ Bản", "H. Ý Yên", "H. Nghĩa Hưng", "H. Nam Trực",
    "H. Trực Ninh", "H. Xuân Trường", "H. Giao Thủy", "H. Hải Hậu",
  ],
  "Nghệ An": [
    "TP. Vinh", "TX. Cửa Lò", "TX. Thái Hòa", "TX. Hoàng Mai",
    "H. Quế Phong", "H. Quỳ Châu", "H. Kỳ Sơn", "H. Tương Dương",
    "H. Nghĩa Đàn", "H. Quỳ Hợp", "H. Quỳnh Lưu", "H. Con Cuông",
    "H. Tân Kỳ", "H. Anh Sơn", "H. Diễn Châu", "H. Yên Thành",
    "H. Đô Lương", "H. Thanh Chương", "H. Nghi Lộc", "H. Nam Đàn", "H. Hưng Nguyên",
  ],
  "Ninh Bình": [
    "TP. Ninh Bình", "TP. Tam Điệp",
    "H. Nho Quan", "H. Gia Viễn", "H. Hoa Lư", "H. Yên Khánh",
    "H. Kim Sơn", "H. Yên Mô",
  ],
  "Ninh Thuận": [
    "TP. Phan Rang-Tháp Chàm",
    "H. Bác Ái", "H. Ninh Sơn", "H. Ninh Hải", "H. Ninh Phước",
    "H. Thuận Bắc", "H. Thuận Nam",
  ],
  "Phú Thọ": [
    "TP. Việt Trì", "TX. Phú Thọ",
    "H. Đoan Hùng", "H. Hạ Hoà", "H. Thanh Ba", "H. Phù Ninh",
    "H. Yên Lập", "H. Cẩm Khê", "H. Tam Nông", "H. Lâm Thao",
    "H. Thanh Sơn", "H. Thanh Thuỷ", "H. Tân Sơn",
  ],
  "Phú Yên": [
    "TP. Tuy Hòa", "TX. Sông Cầu",
    "H. Đồng Xuân", "H. Tuy An", "H. Sơn Hòa", "H. Sông Hinh",
    "H. Tây Hòa", "H. Phú Hòa", "H. Đông Hòa",
  ],
  "Quảng Bình": [
    "TP. Đồng Hới", "TX. Ba Đồn",
    "H. Minh Hóa", "H. Tuyên Hóa", "H. Quảng Trạch", "H. Bố Trạch",
    "H. Quảng Ninh", "H. Lệ Thủy",
  ],
  "Quảng Nam": [
    "TP. Tam Kỳ", "TP. Hội An", "TX. Điện Bàn",
    "H. Đại Lộc", "H. Duy Xuyên", "H. Quế Sơn", "H. Nam Giang",
    "H. Phước Sơn", "H. Hiệp Đức", "H. Thăng Bình", "H. Tiên Phước",
    "H. Bắc Trà My", "H. Nam Trà My", "H. Núi Thành", "H. Phú Ninh",
    "H. Nông Sơn", "H. Đông Giang", "H. Tây Giang",
  ],
  "Quảng Ngãi": [
    "TP. Quảng Ngãi",
    "H. Bình Sơn", "H. Trà Bồng", "H. Sơn Tịnh", "H. Tư Nghĩa",
    "H. Sơn Hà", "H. Sơn Tây", "H. Minh Long", "H. Nghĩa Hành",
    "H. Mộ Đức", "H. Đức Phổ", "H. Ba Tơ", "H. Lý Sơn",
  ],
  "Quảng Ninh": [
    "TP. Hạ Long", "TP. Móng Cái", "TP. Cẩm Phả", "TP. Uông Bí",
    "TX. Quảng Yên", "TX. Đông Triều",
    "H. Bình Liêu", "H. Tiên Yên", "H. Đầm Hà", "H. Hải Hà",
    "H. Ba Chẽ", "H. Vân Đồn", "H. Cô Tô",
  ],
  "Quảng Trị": [
    "TP. Đông Hà", "TX. Quảng Trị",
    "H. Vĩnh Linh", "H. Hướng Hóa", "H. Gio Linh", "H. Đa Krông",
    "H. Cam Lộ", "H. Triệu Phong", "H. Hải Lăng", "H. Cồn Cỏ",
  ],
  "Sóc Trăng": [
    "TP. Sóc Trăng", "TX. Vĩnh Châu", "TX. Ngã Năm",
    "H. Kế Sách", "H. Mỹ Tú", "H. Cù Lao Dung", "H. Long Phú",
    "H. Mỹ Xuyên", "H. Thạnh Trị", "H. Châu Thành", "H. Trần Đề",
  ],
  "Sơn La": [
    "TP. Sơn La",
    "H. Quỳnh Nhai", "H. Thuận Châu", "H. Mường La", "H. Bắc Yên",
    "H. Phù Yên", "H. Mộc Châu", "H. Yên Châu", "H. Mai Sơn",
    "H. Sông Mã", "H. Sốp Cộp", "H. Vân Hồ",
  ],
  "Tây Ninh": [
    "TP. Tây Ninh",
    "H. Tân Biên", "H. Tân Châu", "H. Dương Minh Châu", "H. Châu Thành",
    "H. Hòa Thành", "H. Gò Dầu", "H. Bến Cầu", "H. Trảng Bàng",
  ],
  "Thái Bình": [
    "TP. Thái Bình",
    "H. Quỳnh Phụ", "H. Hưng Hà", "H. Đông Hưng", "H. Thái Thụy",
    "H. Tiền Hải", "H. Kiến Xương", "H. Vũ Thư",
  ],
  "Thái Nguyên": [
    "TP. Thái Nguyên", "TP. Sông Công", "TX. Phổ Yên",
    "H. Định Hóa", "H. Phú Lương", "H. Đồng Hỷ", "H. Võ Nhai",
    "H. Đại Từ", "H. Phú Bình",
  ],
  "Thanh Hóa": [
    "TP. Thanh Hóa", "TX. Bỉm Sơn", "TX. Sầm Sơn", "TX. Nghi Sơn",
    "H. Mường Lát", "H. Quan Hóa", "H. Bá Thước", "H. Quan Sơn",
    "H. Lang Chánh", "H. Ngọc Lặc", "H. Cẩm Thủy", "H. Thạch Thành",
    "H. Hà Trung", "H. Vĩnh Lộc", "H. Yên Định", "H. Thọ Xuân",
    "H. Thường Xuân", "H. Triệu Sơn", "H. Thiệu Hóa", "H. Hoằng Hóa",
    "H. Hậu Lộc", "H. Nga Sơn", "H. Như Xuân", "H. Như Thanh",
    "H. Nông Cống", "H. Đông Sơn", "H. Quảng Xương",
  ],
  "Thừa Thiên Huế": [
    "TP. Huế", "TX. Hương Thuỷ", "TX. Hương Trà",
    "H. Phong Điền", "H. Quảng Điền", "H. Phú Vang", "H. Phú Lộc",
    "H. A Lưới", "H. Nam Đông",
  ],
  "Tiền Giang": [
    "TP. Mỹ Tho", "TX. Gò Công", "TX. Cai Lậy",
    "H. Tân Phước", "H. Cái Bè", "H. Cai Lậy", "H. Châu Thành",
    "H. Chợ Gạo", "H. Gò Công Tây", "H. Gò Công Đông", "H. Tân Phú Đông",
  ],
  "Trà Vinh": [
    "TP. Trà Vinh", "TX. Duyên Hải",
    "H. Càng Long", "H. Cầu Kè", "H. Tiểu Cần", "H. Châu Thành",
    "H. Cầu Ngang", "H. Trà Cú", "H. Duyên Hải",
  ],
  "Tuyên Quang": [
    "TP. Tuyên Quang",
    "H. Lâm Bình", "H. Na Hang", "H. Chiêm Hóa", "H. Hàm Yên",
    "H. Yên Sơn", "H. Sơn Dương",
  ],
  "Vĩnh Long": [
    "TP. Vĩnh Long", "TX. Bình Minh",
    "H. Long Hồ", "H. Mang Thít", "H. Vũng Liêm", "H. Tam Bình",
    "H. Bình Tân", "H. Trà Ôn",
  ],
  "Vĩnh Phúc": [
    "TP. Vĩnh Yên", "TX. Phúc Yên",
    "H. Lập Thạch", "H. Tam Dương", "H. Tam Đảo", "H. Bình Xuyên",
    "H. Yên Lạc", "H. Vĩnh Tường", "H. Sông Lô",
  ],
  "Yên Bái": [
    "TP. Yên Bái", "TX. Nghĩa Lộ",
    "H. Lục Yên", "H. Văn Yên", "H. Mù Cang Chải", "H. Trấn Yên",
    "H. Trạm Tấu", "H. Văn Chấn", "H. Yên Bình",
  ],
}

// ============================================================
// DANH SÁCH 34 TỈNH THÀNH VIỆT NAM SAU SÁP NHẬP 2025 (V2)
// Theo Nghị quyết của Quốc hội ngày 12/6/2025, có hiệu lực từ 01/07/2025
// Nguồn: https://xaydungchinhsach.chinhphu.vn/chi-tiet-34-don-vi-hanh-chinh-cap-tinh-tu-12-6-2025
// ============================================================
export const PROVINCES_V2 = [
  // 28 tỉnh + 6 thành phố trực thuộc TW = 34 đơn vị hành chính cấp tỉnh
  "An Giang",
  "Bắc Ninh",
  "Cà Mau",
  "Cao Bằng",
  "Đắk Lắk",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Tĩnh",
  "Hưng Yên",
  "Khánh Hòa",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Nghệ An",
  "Ninh Bình",
  "Phú Thọ",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sơn La",
  "Tây Ninh",
  "Thái Nguyên",
  "Thanh Hóa",
  "Tuyên Quang",
  "Vĩnh Long",
  // 6 thành phố trực thuộc TW
  "TP. Cần Thơ",
  "TP. Đà Nẵng",
  "TP. Hà Nội",
  "TP. Hải Phòng",
  "TP. Hồ Chí Minh",
  "TP. Huế",
]

// Backward compatibility - export PROVINCES as V1 by default (before merger)
export const PROVINCES = PROVINCES_V1

export const STATION_TYPES = [
  "Loại 1",
  "Loại 2",
  "Loại 3",
  "Loại 4",
  "Loại 5",
  "Loại 6",
]

// Mapping chi tiết tỉnh thành sáp nhập (cho mục đích tra cứu tỉnh cũ)
export const PROVINCE_MERGE_MAP: Record<string, string[]> = {
  // Các tỉnh hợp nhất từ nhiều tỉnh cũ
  "An Giang": ["An Giang", "Kiên Giang"],
  "Bắc Ninh": ["Bắc Giang", "Bắc Ninh", "Hải Dương"],
  "Cà Mau": ["Bạc Liêu", "Cà Mau"],
  "Đắk Lắk": ["Đắk Lắk", "Phú Yên"],
  "Đồng Nai": ["Bình Phước", "Đồng Nai"],
  "Đồng Tháp": ["Bến Tre", "Đồng Tháp", "Tiền Giang", "Trà Vinh"],
  "Gia Lai": ["Bình Định", "Gia Lai"],
  "Hưng Yên": ["Hà Nam", "Hưng Yên", "Nam Định", "Thái Bình"],
  "Khánh Hòa": ["Khánh Hòa", "Ninh Thuận"],
  "Lâm Đồng": ["Bình Thuận", "Đắk Nông", "Lâm Đồng"],
  "Lào Cai": ["Lào Cai", "Yên Bái"],
  "Phú Thọ": ["Hòa Bình", "Phú Thọ", "Vĩnh Phúc"],
  "Quảng Ngãi": ["Kon Tum", "Quảng Ngãi"],
  "Quảng Trị": ["Quảng Bình", "Quảng Trị"],
  "Tây Ninh": ["Long An", "Tây Ninh"],
  "Thái Nguyên": ["Bắc Kạn", "Thái Nguyên"],
  "Tuyên Quang": ["Hà Giang", "Tuyên Quang"],
  "TP. Cần Thơ": ["Cần Thơ", "Hậu Giang", "Sóc Trăng"],
  "TP. Đà Nẵng": ["Đà Nẵng", "Quảng Nam"],
  "TP. Hồ Chí Minh": ["Bà Rịa - Vũng Tàu", "Bình Dương", "TP. Hồ Chí Minh"],
  // Các tỉnh không sáp nhập
  "Cao Bằng": ["Cao Bằng"],
  "Điện Biên": ["Điện Biên"],
  "Hà Tĩnh": ["Hà Tĩnh"],
  "Lai Châu": ["Lai Châu"],
  "Lạng Sơn": ["Lạng Sơn"],
  "Nghệ An": ["Nghệ An"],
  "Ninh Bình": ["Ninh Bình"],
  "Quảng Ninh": ["Quảng Ninh"],
  "Sơn La": ["Sơn La"],
  "Thanh Hóa": ["Thanh Hóa"],
  "Vĩnh Long": ["Vĩnh Long"],
  "TP. Hà Nội": ["Hà Nội"],
  "TP. Hải Phòng": ["Hải Phòng"],
  "TP. Huế": ["Thừa Thiên Huế"],
}

// ============================================================
// PHƯỜNG XÃ THEO TỈNH THÀNH SAU SÁP NHẬP 2025 (V2)
// Sau sáp nhập chỉ còn 2 cấp: Tỉnh/TP → Phường/Xã (không còn Quận/Huyện)
// ============================================================
export const WARDS_BY_PROVINCE_V2: Record<string, string[]> = {
  // ===== 6 THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG =====
  "TP. Hồ Chí Minh": [
    // Các quận/huyện cũ của TP.HCM
    "Q. 1", "Q. 3", "Q. 4", "Q. 5", "Q. 6", "Q. 7", "Q. 8",
    "Q. 10", "Q. 11", "Q. 12", "Q. Bình Thạnh", "Q. Bình Tân",
    "Q. Gò Vấp", "Q. Phú Nhuận", "Q. Tân Bình", "Q. Tân Phú",
    "TP. Thủ Đức",
    "H. Bình Chánh", "H. Cần Giờ", "H. Củ Chi", "H. Hóc Môn", "H. Nhà Bè",
    // Các quận/huyện từ Bình Dương
    "TP. Thủ Dầu Một", "TP. Thuận An", "TP. Dĩ An", "TP. Tân Uyên",
    "TX. Bến Cát", "H. Bàu Bàng", "H. Dầu Tiếng", "H. Phú Giáo", "H. Bắc Tân Uyên",
    // Các quận/huyện từ Bà Rịa - Vũng Tàu
    "TP. Vũng Tàu", "TP. Bà Rịa", "TX. Phú Mỹ",
    "H. Châu Đức", "H. Xuyên Mộc", "H. Long Điền", "H. Đất Đỏ", "H. Côn Đảo",
  ],
  "TP. Hà Nội": [
    "Q. Ba Đình", "Q. Hoàn Kiếm", "Q. Tây Hồ", "Q. Long Biên", "Q. Cầu Giấy",
    "Q. Đống Đa", "Q. Hai Bà Trưng", "Q. Hoàng Mai", "Q. Thanh Xuân",
    "Q. Nam Từ Liêm", "Q. Bắc Từ Liêm", "Q. Hà Đông",
    "TX. Sơn Tây",
    "H. Sóc Sơn", "H. Đông Anh", "H. Gia Lâm", "H. Mê Linh", "H. Ba Vì",
    "H. Phúc Thọ", "H. Đan Phượng", "H. Hoài Đức", "H. Quốc Oai",
    "H. Thạch Thất", "H. Chương Mỹ", "H. Thanh Oai", "H. Thường Tín",
    "H. Phú Xuyên", "H. Ứng Hòa", "H. Mỹ Đức", "H. Thanh Trì",
  ],
  "TP. Đà Nẵng": [
    // Các quận cũ của Đà Nẵng
    "Q. Hải Châu", "Q. Thanh Khê", "Q. Sơn Trà", "Q. Ngũ Hành Sơn",
    "Q. Liên Chiểu", "Q. Cẩm Lệ", "H. Hòa Vang", "H. Hoàng Sa",
    // Các huyện từ Quảng Nam
    "TP. Tam Kỳ", "TP. Hội An", "TX. Điện Bàn",
    "H. Đại Lộc", "H. Duy Xuyên", "H. Quế Sơn", "H. Nam Giang",
    "H. Phước Sơn", "H. Hiệp Đức", "H. Thăng Bình", "H. Tiên Phước",
    "H. Bắc Trà My", "H. Nam Trà My", "H. Núi Thành", "H. Phú Ninh",
    "H. Nông Sơn", "H. Đông Giang", "H. Tây Giang",
  ],
  "TP. Cần Thơ": [
    // Các quận cũ của Cần Thơ
    "Q. Ninh Kiều", "Q. Ô Môn", "Q. Bình Thủy", "Q. Cái Răng", "Q. Thốt Nốt",
    "H. Vĩnh Thạnh", "H. Cờ Đỏ", "H. Phong Điền", "H. Thới Lai",
    // Các huyện từ Hậu Giang
    "TP. Vị Thanh", "TX. Ngã Bảy", "TX. Long Mỹ",
    "H. Châu Thành A", "H. Châu Thành", "H. Phụng Hiệp", "H. Vị Thủy",
    // Các huyện từ Sóc Trăng
    "TP. Sóc Trăng", "TX. Vĩnh Châu", "TX. Ngã Năm",
    "H. Kế Sách", "H. Mỹ Tú", "H. Cù Lao Dung", "H. Long Phú",
    "H. Mỹ Xuyên", "H. Thạnh Trị", "H. Châu Thành (ST)", "H. Trần Đề",
  ],
  "TP. Hải Phòng": [
    "Q. Hồng Bàng", "Q. Ngô Quyền", "Q. Lê Chân", "Q. Hải An", "Q. Kiến An",
    "Q. Đồ Sơn", "Q. Dương Kinh",
    "H. Thuỷ Nguyên", "H. An Dương", "H. An Lão", "H. Kiến Thuỵ",
    "H. Tiên Lãng", "H. Vĩnh Bảo", "H. Cát Hải", "H. Bạch Long Vĩ",
  ],
  "TP. Huế": [
    "Q. Thuận Hoà", "Q. Phú Xuân", "Q. Vĩnh Ninh",
    "TX. Hương Thuỷ", "TX. Hương Trà",
    "H. Phong Điền (TT)", "H. Quảng Điền", "H. Phú Vang", "H. Phú Lộc",
    "H. A Lưới", "H. Nam Đông",
  ],

  // ===== 28 TỈNH =====
  "An Giang": [
    // An Giang cũ
    "TP. Long Xuyên", "TP. Châu Đốc", "TX. Tân Châu",
    "H. An Phú", "H. Tịnh Biên", "H. Tri Tôn", "H. Châu Phú",
    "H. Chợ Mới", "H. Phú Tân", "H. Thoại Sơn", "H. Châu Thành (AG)",
    // Từ Kiên Giang
    "TP. Rạch Giá", "TP. Hà Tiên", "TX. Kiên Lương",
    "H. Kiên Hải", "H. Châu Thành (KG)", "H. Giồng Riềng", "H. Gò Quao",
    "H. An Biên", "H. An Minh", "H. Vĩnh Thuận", "H. Phú Quốc",
    "H. Tân Hiệp", "H. Hòn Đất", "H. Giang Thành", "H. U Minh Thượng",
  ],
  "Bắc Ninh": [
    // Bắc Ninh cũ
    "TP. Bắc Ninh", "TX. Từ Sơn",
    "H. Yên Phong", "H. Quế Võ", "H. Tiên Du", "H. Thuận Thành",
    "H. Gia Bình", "H. Lương Tài",
    // Từ Bắc Giang
    "TP. Bắc Giang",
    "H. Yên Thế", "H. Tân Yên", "H. Lạng Giang", "H. Lục Nam",
    "H. Lục Ngạn", "H. Sơn Động", "H. Yên Dũng", "H. Việt Yên", "H. Hiệp Hòa",
    // Từ Hải Dương
    "TP. Hải Dương", "TX. Chí Linh", "TX. Kinh Môn",
    "H. Nam Sách", "H. Thanh Hà", "H. Kim Thành", "H. Gia Lộc",
    "H. Tứ Kỳ", "H. Ninh Giang", "H. Thanh Miện", "H. Cẩm Giàng", "H. Bình Giang",
  ],
  "Cà Mau": [
    // Cà Mau cũ
    "TP. Cà Mau",
    "H. U Minh", "H. Thới Bình", "H. Trần Văn Thời", "H. Cái Nước",
    "H. Đầm Dơi", "H. Năm Căn", "H. Phú Tân (CM)", "H. Ngọc Hiển",
    // Từ Bạc Liêu
    "TP. Bạc Liêu", "TX. Giá Rai",
    "H. Vĩnh Lợi", "H. Hồng Dân", "H. Phước Long", "H. Hòa Bình", "H. Đông Hải",
  ],
  "Cao Bằng": [
    "TP. Cao Bằng",
    "H. Bảo Lâm", "H. Bảo Lạc", "H. Hà Quảng", "H. Trùng Khánh",
    "H. Hạ Lang", "H. Quảng Hòa", "H. Hoà An", "H. Nguyên Bình",
    "H. Thạch An",
  ],
  "Đắk Lắk": [
    // Đắk Lắk cũ
    "TP. Buôn Ma Thuột", "TX. Buôn Hồ",
    "H. Ea H'leo", "H. Ea Súp", "H. Buôn Đôn", "H. Cư M'gar",
    "H. Krông Búk", "H. Krông Năng", "H. Ea Kar", "H. M'Đrắk",
    "H. Krông Bông", "H. Krông Pắc", "H. Krông A Na", "H. Lắk", "H. Cư Kuin",
    // Từ Phú Yên
    "TP. Tuy Hòa", "TX. Sông Cầu",
    "H. Đồng Xuân", "H. Tuy An", "H. Sơn Hòa", "H. Sông Hinh",
    "H. Tây Hòa", "H. Phú Hòa", "H. Đông Hòa",
  ],
  "Điện Biên": [
    "TP. Điện Biên Phủ", "TX. Mường Lay",
    "H. Mường Nhé", "H. Mường Chà", "H. Tủa Chùa", "H. Tuần Giáo",
    "H. Điện Biên", "H. Điện Biên Đông", "H. Mường Ảng", "H. Nậm Pồ",
  ],
  "Đồng Nai": [
    // Đồng Nai cũ
    "TP. Biên Hòa", "TP. Long Khánh",
    "H. Tân Phú", "H. Vĩnh Cửu", "H. Định Quán", "H. Trảng Bom",
    "H. Thống Nhất", "H. Cẩm Mỹ", "H. Long Thành", "H. Xuân Lộc", "H. Nhơn Trạch",
    // Từ Bình Phước
    "TP. Đồng Xoài", "TX. Bình Long", "TX. Phước Long", "TX. Chơn Thành",
    "H. Bù Gia Mập", "H. Lộc Ninh", "H. Bù Đốp", "H. Hớn Quản",
    "H. Đồng Phú", "H. Bù Đăng", "H. Phú Riềng",
  ],
  "Đồng Tháp": [
    // Đồng Tháp cũ
    "TP. Cao Lãnh", "TP. Sa Đéc", "TX. Hồng Ngự",
    "H. Tân Hồng", "H. Hồng Ngự", "H. Tam Nông", "H. Tháp Mười",
    "H. Cao Lãnh", "H. Thanh Bình", "H. Lấp Vò", "H. Lai Vung", "H. Châu Thành (ĐT)",
    // Từ Bến Tre
    "TP. Bến Tre",
    "H. Châu Thành (BT)", "H. Chợ Lách", "H. Mỏ Cày Nam", "H. Giồng Trôm",
    "H. Bình Đại", "H. Ba Tri", "H. Thạnh Phú", "H. Mỏ Cày Bắc",
    // Từ Tiền Giang
    "TP. Mỹ Tho", "TX. Gò Công", "TX. Cai Lậy",
    "H. Tân Phước", "H. Cái Bè", "H. Cai Lậy", "H. Châu Thành (TG)",
    "H. Chợ Gạo", "H. Gò Công Tây", "H. Gò Công Đông", "H. Tân Phú Đông",
    // Từ Trà Vinh
    "TP. Trà Vinh", "TX. Duyên Hải",
    "H. Càng Long", "H. Cầu Kè", "H. Tiểu Cần", "H. Châu Thành (TV)",
    "H. Cầu Ngang", "H. Trà Cú", "H. Duyên Hải",
  ],
  "Gia Lai": [
    // Gia Lai cũ
    "TP. Pleiku", "TX. An Khê", "TX. Ayun Pa",
    "H. Kbang", "H. Đăk Đoa", "H. Chư Păh", "H. Ia Grai",
    "H. Mang Yang", "H. Kông Chro", "H. Đức Cơ", "H. Chư Prông",
    "H. Chư Sê", "H. Đăk Pơ", "H. Ia Pa", "H. Krông Pa",
    "H. Phú Thiện", "H. Chư Pưh",
    // Từ Bình Định
    "TP. Quy Nhơn", "TX. An Nhơn", "TX. Hoài Nhơn",
    "H. An Lão", "H. Hoài Ân", "H. Phù Mỹ", "H. Vĩnh Thạnh",
    "H. Tây Sơn", "H. Phù Cát", "H. Vân Canh", "H. Tuy Phước",
  ],
  "Hà Tĩnh": [
    "TP. Hà Tĩnh", "TX. Hồng Lĩnh", "TX. Kỳ Anh",
    "H. Hương Sơn", "H. Đức Thọ", "H. Vũ Quang", "H. Nghi Xuân",
    "H. Can Lộc", "H. Hương Khê", "H. Thạch Hà", "H. Cẩm Xuyên",
    "H. Kỳ Anh", "H. Lộc Hà",
  ],
  "Hưng Yên": [
    // Hưng Yên cũ
    "TP. Hưng Yên",
    "H. Văn Lâm", "H. Văn Giang", "H. Yên Mỹ", "H. Mỹ Hào",
    "H. Ân Thi", "H. Khoái Châu", "H. Kim Động", "H. Tiên Lữ", "H. Phù Cừ",
    // Từ Hà Nam
    "TP. Phủ Lý",
    "H. Duy Tiên", "H. Kim Bảng", "H. Thanh Liêm", "H. Bình Lục", "H. Lý Nhân",
    // Từ Nam Định
    "TP. Nam Định",
    "H. Mỹ Lộc", "H. Vụ Bản", "H. Ý Yên", "H. Nghĩa Hưng", "H. Nam Trực",
    "H. Trực Ninh", "H. Xuân Trường", "H. Giao Thủy", "H. Hải Hậu",
    // Từ Thái Bình
    "TP. Thái Bình",
    "H. Quỳnh Phụ", "H. Hưng Hà", "H. Đông Hưng", "H. Thái Thụy",
    "H. Tiền Hải", "H. Kiến Xương", "H. Vũ Thư",
  ],
  "Khánh Hòa": [
    // Khánh Hòa cũ
    "TP. Nha Trang", "TP. Cam Ranh",
    "TX. Ninh Hòa",
    "H. Vạn Ninh", "H. Khánh Vĩnh", "H. Diên Khánh", "H. Khánh Sơn",
    "H. Trường Sa", "H. Cam Lâm",
    // Từ Ninh Thuận
    "TP. Phan Rang-Tháp Chàm",
    "H. Bác Ái", "H. Ninh Sơn", "H. Ninh Hải", "H. Ninh Phước", "H. Thuận Bắc", "H. Thuận Nam",
  ],
  "Lai Châu": [
    "TP. Lai Châu",
    "H. Tam Đường", "H. Mường Tè", "H. Sìn Hồ", "H. Phong Thổ",
    "H. Than Uyên", "H. Tân Uyên", "H. Nậm Nhùn",
  ],
  "Lâm Đồng": [
    // Lâm Đồng cũ
    "TP. Đà Lạt", "TP. Bảo Lộc",
    "H. Đức Trọng", "H. Lạc Dương", "H. Đơn Dương", "H. Đạ Huoai",
    "H. Đạ Tẻh", "H. Cát Tiên", "H. Đam Rông", "H. Lâm Hà", "H. Bảo Lâm",
    // Từ Đắk Nông
    "TP. Gia Nghĩa", "H. Đắk Glong", "H. Cư Jút", "H. Đắk Mil",
    "H. Krông Nô", "H. Đắk Song", "H. Đắk R'Lấp", "H. Tuy Đức",
    // Từ Bình Thuận
    "TP. Phan Thiết", "TX. La Gi",
    "H. Tuy Phong", "H. Bắc Bình", "H. Hàm Thuận Bắc", "H. Hàm Thuận Nam",
    "H. Tánh Linh", "H. Hàm Tân", "H. Đức Linh", "H. Phú Quý",
  ],
  "Lạng Sơn": [
    "TP. Lạng Sơn",
    "H. Tràng Định", "H. Bình Gia", "H. Văn Lãng", "H. Cao Lộc",
    "H. Văn Quan", "H. Bắc Sơn", "H. Hữu Lũng", "H. Chi Lăng",
    "H. Lộc Bình", "H. Đình Lập",
  ],
  "Lào Cai": [
    // Lào Cai cũ
    "TP. Lào Cai", "TX. Sa Pa",
    "H. Bát Xát", "H. Mường Khương", "H. Si Ma Cai", "H. Bắc Hà",
    "H. Bảo Thắng", "H. Bảo Yên", "H. Văn Bàn",
    // Từ Yên Bái
    "TP. Yên Bái", "TX. Nghĩa Lộ",
    "H. Lục Yên", "H. Văn Yên", "H. Mù Cang Chải", "H. Trấn Yên",
    "H. Trạm Tấu", "H. Văn Chấn", "H. Yên Bình",
  ],
  "Nghệ An": [
    "TP. Vinh", "TX. Cửa Lò", "TX. Thái Hòa", "TX. Hoàng Mai",
    "H. Quế Phong", "H. Quỳ Châu", "H. Kỳ Sơn", "H. Tương Dương",
    "H. Nghĩa Đàn", "H. Quỳ Hợp", "H. Quỳnh Lưu", "H. Con Cuông",
    "H. Tân Kỳ", "H. Anh Sơn", "H. Diễn Châu", "H. Yên Thành",
    "H. Đô Lương", "H. Thanh Chương", "H. Nghi Lộc", "H. Nam Đàn", "H. Hưng Nguyên",
  ],
  "Ninh Bình": [
    "TP. Ninh Bình", "TP. Tam Điệp",
    "H. Nho Quan", "H. Gia Viễn", "H. Hoa Lư", "H. Yên Khánh",
    "H. Kim Sơn", "H. Yên Mô",
  ],
  "Phú Thọ": [
    // Phú Thọ cũ
    "TP. Việt Trì", "TX. Phú Thọ",
    "H. Đoan Hùng", "H. Hạ Hoà", "H. Thanh Ba", "H. Phù Ninh",
    "H. Yên Lập", "H. Cẩm Khê", "H. Tam Nông (PT)", "H. Lâm Thao",
    "H. Thanh Sơn", "H. Thanh Thuỷ", "H. Tân Sơn",
    // Từ Hòa Bình
    "TP. Hòa Bình",
    "H. Đà Bắc", "H. Lương Sơn", "H. Kim Bôi", "H. Cao Phong",
    "H. Tân Lạc", "H. Mai Châu", "H. Lạc Sơn", "H. Yên Thủy", "H. Lạc Thủy",
    // Từ Vĩnh Phúc
    "TP. Vĩnh Yên", "TX. Phúc Yên",
    "H. Lập Thạch", "H. Tam Dương", "H. Tam Đảo", "H. Bình Xuyên",
    "H. Yên Lạc", "H. Vĩnh Tường", "H. Sông Lô",
  ],
  "Quảng Ngãi": [
    // Quảng Ngãi cũ
    "TP. Quảng Ngãi",
    "H. Bình Sơn", "H. Trà Bồng", "H. Sơn Tịnh", "H. Tư Nghĩa",
    "H. Sơn Hà", "H. Sơn Tây", "H. Minh Long", "H. Nghĩa Hành",
    "H. Mộ Đức", "H. Đức Phổ", "H. Ba Tơ", "H. Lý Sơn",
    // Từ Kon Tum
    "TP. Kon Tum",
    "H. Đắk Glei", "H. Ngọc Hồi", "H. Đắk Tô", "H. Kon Plông",
    "H. Kon Rẫy", "H. Đắk Hà", "H. Sa Thầy", "H. Tu Mơ Rông", "H. Ia H'Drai",
  ],
  "Quảng Ninh": [
    "TP. Hạ Long", "TP. Móng Cái", "TP. Cẩm Phả", "TP. Uông Bí",
    "TX. Quảng Yên", "TX. Đông Triều",
    "H. Bình Liêu", "H. Tiên Yên", "H. Đầm Hà", "H. Hải Hà",
    "H. Ba Chẽ", "H. Vân Đồn", "H. Cô Tô",
  ],
  "Quảng Trị": [
    // Quảng Trị cũ
    "TP. Đông Hà", "TX. Quảng Trị",
    "H. Vĩnh Linh", "H. Hướng Hóa", "H. Gio Linh", "H. Đa Krông",
    "H. Cam Lộ", "H. Triệu Phong", "H. Hải Lăng", "H. Cồn Cỏ",
    // Từ Quảng Bình
    "TP. Đồng Hới", "TX. Ba Đồn",
    "H. Minh Hóa", "H. Tuyên Hóa", "H. Quảng Trạch", "H. Bố Trạch",
    "H. Quảng Ninh (QB)", "H. Lệ Thủy",
  ],
  "Sơn La": [
    "TP. Sơn La",
    "H. Quỳnh Nhai", "H. Thuận Châu", "H. Mường La", "H. Bắc Yên",
    "H. Phù Yên", "H. Mộc Châu", "H. Yên Châu", "H. Mai Sơn",
    "H. Sông Mã", "H. Sốp Cộp", "H. Vân Hồ",
  ],
  "Tây Ninh": [
    // Tây Ninh cũ
    "TP. Tây Ninh",
    "H. Tân Biên", "H. Tân Châu (TN)", "H. Dương Minh Châu", "H. Châu Thành (TN)",
    "H. Hòa Thành", "H. Gò Dầu", "H. Bến Cầu", "H. Trảng Bàng",
    // Từ Long An
    "TP. Tân An", "TX. Kiến Tường",
    "H. Tân Hưng", "H. Vĩnh Hưng", "H. Mộc Hóa", "H. Tân Thạnh",
    "H. Thạnh Hóa", "H. Đức Huệ", "H. Đức Hòa", "H. Bến Lức",
    "H. Thủ Thừa", "H. Tân Trụ", "H. Cần Đước", "H. Cần Giuộc", "H. Châu Thành (LA)",
  ],
  "Thái Nguyên": [
    // Thái Nguyên cũ
    "TP. Thái Nguyên", "TP. Sông Công", "TX. Phổ Yên",
    "H. Định Hóa", "H. Phú Lương", "H. Đồng Hỷ", "H. Võ Nhai",
    "H. Đại Từ", "H. Phú Bình",
    // Từ Bắc Kạn
    "TP. Bắc Kạn",
    "H. Pác Nặm", "H. Ba Bể", "H. Ngân Sơn", "H. Bạch Thông",
    "H. Chợ Đồn", "H. Chợ Mới (BK)", "H. Na Rì",
  ],
  "Thanh Hóa": [
    "TP. Thanh Hóa", "TX. Bỉm Sơn", "TX. Sầm Sơn", "TX. Nghi Sơn",
    "H. Mường Lát", "H. Quan Hóa", "H. Bá Thước", "H. Quan Sơn",
    "H. Lang Chánh", "H. Ngọc Lặc", "H. Cẩm Thủy", "H. Thạch Thành",
    "H. Hà Trung", "H. Vĩnh Lộc", "H. Yên Định", "H. Thọ Xuân",
    "H. Thường Xuân", "H. Triệu Sơn", "H. Thiệu Hóa", "H. Hoằng Hóa",
    "H. Hậu Lộc", "H. Nga Sơn", "H. Như Xuân", "H. Như Thanh",
    "H. Nông Cống", "H. Đông Sơn", "H. Quảng Xương",
  ],
  "Tuyên Quang": [
    // Tuyên Quang cũ
    "TP. Tuyên Quang",
    "H. Lâm Bình", "H. Na Hang", "H. Chiêm Hóa", "H. Hàm Yên",
    "H. Yên Sơn", "H. Sơn Dương",
    // Từ Hà Giang
    "TP. Hà Giang",
    "H. Đồng Văn", "H. Mèo Vạc", "H. Yên Minh", "H. Quản Bạ",
    "H. Vị Xuyên", "H. Bắc Mê", "H. Hoàng Su Phì", "H. Xín Mần",
    "H. Bắc Quang", "H. Quang Bình",
  ],
  "Vĩnh Long": [
    "TP. Vĩnh Long", "TX. Bình Minh",
    "H. Long Hồ", "H. Mang Thít", "H. Vũng Liêm", "H. Tam Bình",
    "H. Bình Tân (VL)", "H. Trà Ôn",
  ],
}

// Backward compatibility - export DISTRICTS_BY_PROVINCE as V1 by default (before merger)
export const DISTRICTS_BY_PROVINCE = DISTRICTS_BY_PROVINCE_V1

// Hàm lấy danh sách quận huyện theo tỉnh thành (V1 - trước sáp nhập)
export function getDistrictsByProvince(province: string): string[] {
  return DISTRICTS_BY_PROVINCE_V1[province] || []
}

// Hàm lấy danh sách phường xã theo tỉnh thành (V2 - sau sáp nhập 2025)
// Sau sáp nhập chỉ còn 2 cấp: Tỉnh/TP → Phường/Xã
export function getWardsByProvinceV2(province: string): string[] {
  return WARDS_BY_PROVINCE_V2[province] || []
}

// Hàm tìm tỉnh mới từ tỉnh cũ
export function getNewProvinceFromOld(oldProvince: string): string | null {
  for (const [newProv, oldProvs] of Object.entries(PROVINCE_MERGE_MAP)) {
    if (oldProvs.includes(oldProvince)) {
      return newProv
    }
  }
  return null
}

// Hàm lấy danh sách tỉnh cũ từ tỉnh mới
export function getOldProvincesFromNew(newProvince: string): string[] {
  return PROVINCE_MERGE_MAP[newProvince] || []
}
