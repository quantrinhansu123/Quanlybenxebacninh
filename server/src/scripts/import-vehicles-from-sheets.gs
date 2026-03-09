/**
 * @deprecated SCRIPT NÀY ĐÃ LỖI THỜI - KHÔNG SỬ DỤNG
 *
 * Script này được viết cho Supabase nhưng dự án đã migrate sang Firebase Realtime Database.
 *
 * KHÔNG SỬ DỤNG SCRIPT NÀY NỮA.
 *
 * Để import dữ liệu vào Firebase, vui lòng:
 * 1. Sử dụng Firebase Console để import JSON trực tiếp
 * 2. Hoặc liên hệ admin để được hỗ trợ import qua API backend
 *
 * ---
 *
 * [LEGACY] Google Apps Script để import dữ liệu xe từ Google Sheets lên Supabase
 *
 * HƯỚNG DẪN SỬ DỤNG (ĐÃ LỖI THỜI):
 * 1. Mở Google Sheets chứa dữ liệu xe
 * 2. Vào Extensions > Apps Script
 * 3. Dán code này vào editor
 * 4. Cập nhật các biến cấu hình ở dưới (SUPABASE_URL, SUPABASE_KEY)
 * 5. Chạy hàm importVehicles() hoặc tạo menu để chạy
 */

// ============================================
// CẤU HÌNH
// ============================================
const CONFIG = {
  // URL của Supabase project (ví dụ: https://xxxxx.supabase.co)
  SUPABASE_URL: 'YOUR_SUPABASE_URL_HERE',
  
  // Service Role Key hoặc Anon Key từ Supabase
  // Lưu ý: Nên dùng Service Role Key để có quyền ghi đầy đủ
  SUPABASE_KEY: 'YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE',
  
  // Tên sheet chứa dữ liệu (mặc định là sheet đầu tiên)
  SHEET_NAME: null, // null = sheet đầu tiên
  
  // Số dòng header (thường là 1)
  HEADER_ROW: 1,
  
  // Bắt đầu đọc từ dòng nào (sau header)
  START_ROW: 2,
  
  // Cột ID trong sheet (để đánh dấu đã import)
  STATUS_COLUMN: 'Z', // Cột để đánh dấu trạng thái import
  
  // Số lượng records gửi cùng lúc (batch size)
  // Tăng số này để import nhanh hơn, Supabase hỗ trợ tối đa ~1000 records/batch
  // Nhưng để an toàn, nên dùng 100-200
  BATCH_SIZE: 200, // Tăng lên 200 để giảm số lần gọi API
  
  // Delay giữa các batch (ms) - giảm để tăng tốc, tăng để tránh rate limit
  // Với Service Role Key, có thể giảm xuống 0 hoặc rất nhỏ
  BATCH_DELAY: 0, // Không delay để tăng tốc tối đa
  
  // Số lượng records tối đa xử lý trong một lần chạy (để tránh timeout)
  // Nếu có nhiều hơn, sẽ cần chạy nhiều lần
  MAX_RECORDS_PER_RUN: 1000, // Tăng lên 1000 để xử lý nhiều hơn mỗi lần
  
  // Tự động skip các records bị duplicate (đã tồn tại) thay vì báo lỗi
  SKIP_DUPLICATES: true,
  
  // Mapping các cột từ sheet sang database
  // Key = tên cột trong sheet, Value = tên field trong database
  COLUMN_MAPPING: {
    'IDXe': 'id',
    'BienSo': 'plate_number',
    'SoKhung': 'chassis_number',
    'SoMay': 'engine_number',
    'SoCho': 'seat_capacity',
    'NienHan': 'inspection_expiry_date',
    'TenDangKyXe': 'notes_owner_name',
    'DiaChiChuXe': 'notes_owner_address',
    'NhanHieu': 'notes_brand',
    'LoaiXe': 'notes_vehicle_type',
    'LoaiPhuongTien': 'notes_vehicle_category',
    'TaiTrong': 'notes_weight_capacity',
    'MauSon': 'notes_color',
    'NamSanXuat': 'notes_manufacture_year',
    'LaBienDinhDanh': 'notes_is_identification_plate',
    'TrangThaiBienDinhDanh': 'notes_plate_status',
    'LyDoThuBienDinhDanh': 'notes_plate_revocation_reason',
    'ThongTinDangKyXe': 'notes_registration_info',
    'User': 'created_by_username',
    'ThoiGianNhap': 'imported_at',
    'Nienhan': 'notes_expiry_year',
    'CoKDVT': 'notes_has_operator'
  }
};

// ============================================
// HÀM CHÍNH
// ============================================

/**
 * Hàm chính để import dữ liệu (Batch mode - tốc độ cao)
 */
function importVehicles() {
  try {
    const sheet = getSheet();
    const data = readSheetData(sheet);
    
    Logger.log(`Đã đọc ${data.length} dòng dữ liệu từ sheet`);
    Logger.log(`Sử dụng batch size: ${CONFIG.BATCH_SIZE}`);
    
    // Đọc trạng thái hiện tại của tất cả các dòng (để tránh đọc lại nhiều lần)
    const statusColumnIndex = columnLetterToIndex(CONFIG.STATUS_COLUMN);
    const statusRange = sheet.getRange(CONFIG.START_ROW, statusColumnIndex, data.length, 1);
    const statusValues = statusRange.getValues();
    
    // Chuẩn bị dữ liệu và lọc các dòng chưa import
    const rowsToProcess = [];
    let alreadyImportedCount = 0;
    let alreadyExistsCount = 0;
    
    for (let i = 0; i < data.length; i++) {
      const status = statusValues[i][0];
      if (status === 'Đã import' || status === 'Success') {
        alreadyImportedCount++;
      } else if (status === 'Đã tồn tại') {
        alreadyExistsCount++;
      } else if (status !== '') {
        // Có status nhưng không phải các trạng thái trên (có thể là lỗi cũ)
        rowsToProcess.push({
          data: data[i],
          rowNumber: CONFIG.START_ROW + i,
          index: i
        });
      } else {
        // Chưa có status - cần import
        rowsToProcess.push({
          data: data[i],
          rowNumber: CONFIG.START_ROW + i,
          index: i
        });
      }
    }
    
    Logger.log(`Tổng số dòng: ${data.length}`);
    Logger.log(`- Đã import: ${alreadyImportedCount}`);
    Logger.log(`- Đã tồn tại: ${alreadyExistsCount}`);
    Logger.log(`- Cần import: ${rowsToProcess.length}`);
    
    if (rowsToProcess.length === 0) {
      SpreadsheetApp.getUi().alert('Tất cả dữ liệu đã được import hoặc đã tồn tại!');
      return;
    }
    
    // Giới hạn số records xử lý trong một lần chạy để tránh timeout
    const recordsToProcess = rowsToProcess.slice(0, CONFIG.MAX_RECORDS_PER_RUN);
    
    // Kiểm tra an toàn
    if (!recordsToProcess || recordsToProcess.length === 0) {
      SpreadsheetApp.getUi().alert('Không có dữ liệu để xử lý!');
      return;
    }
    
    if (rowsToProcess.length > CONFIG.MAX_RECORDS_PER_RUN) {
      Logger.log(`⚠️ Cảnh báo: Có ${rowsToProcess.length} dòng cần import, nhưng chỉ xử lý ${CONFIG.MAX_RECORDS_PER_RUN} dòng trong lần chạy này.`);
      Logger.log(`⚠️ Vui lòng chạy lại script để xử lý các dòng còn lại.`);
    }
    
    const totalBatches = Math.ceil(recordsToProcess.length / CONFIG.BATCH_SIZE);
    Logger.log(`Sẽ xử lý ${totalBatches} batch(es) với ${recordsToProcess.length} records`);
    
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors = [];
    const statusUpdates = []; // Lưu các cập nhật status để batch update
    
    // Lưu thời gian bắt đầu để theo dõi
    const overallStartTime = new Date().getTime();
    
    // Chia thành các batch
    for (let batchStart = 0; batchStart < recordsToProcess.length; batchStart += CONFIG.BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + CONFIG.BATCH_SIZE, recordsToProcess.length);
      const batch = recordsToProcess.slice(batchStart, batchEnd);
      
      // Kiểm tra thời gian còn lại (ước tính)
      const startTime = new Date().getTime();
      
      Logger.log(`Xử lý batch ${Math.floor(batchStart / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(recordsToProcess.length / CONFIG.BATCH_SIZE)} (${batch.length} records)`);
      
      // Chuẩn bị dữ liệu cho batch
      const vehicleBatch = [];
      const batchRowInfo = []; // Lưu thông tin row để update status sau
      
      for (let j = 0; j < batch.length; j++) {
        const rowInfo = batch[j];
        try {
          const vehicleData = mapRowToVehicle(rowInfo.data, rowInfo.rowNumber);
          vehicleBatch.push(vehicleData);
          batchRowInfo.push({
            rowNumber: rowInfo.rowNumber,
            index: rowInfo.index,
            plateNumber: vehicleData.plate_number
          });
        } catch (error) {
          // Lỗi khi map dữ liệu (ví dụ: thiếu biển số)
          errorCount++;
          const errorMsg = error.toString();
          errors.push(`Dòng ${rowInfo.rowNumber}: ${errorMsg}`);
          statusUpdates.push({
            row: rowInfo.index,
            value: `Lỗi: ${errorMsg}`,
            background: '#f8d7da'
          });
        }
      }
      
      // Gửi batch lên Supabase
      if (vehicleBatch.length > 0) {
        const result = insertVehiclesBatchToSupabase(vehicleBatch);
        
        // Xử lý kết quả
        if (result.success) {
          // Tất cả đều thành công
          for (let k = 0; k < batchRowInfo.length; k++) {
            successCount++;
            statusUpdates.push({
              row: batchRowInfo[k].index,
              value: 'Đã import',
              background: '#d4edda'
            });
            Logger.log(`Dòng ${batchRowInfo[k].rowNumber}: Import thành công - ${batchRowInfo[k].plateNumber}`);
          }
        } else if (result.partial) {
          // Một số thành công, một số lỗi hoặc duplicate
          const successIndices = result.successIndices || [];
          const duplicateIndices = result.duplicateIndices || [];
          const errorDetails = result.errors || [];
          
          for (let k = 0; k < batchRowInfo.length; k++) {
            if (successIndices.includes(k)) {
              // Thành công
              successCount++;
              statusUpdates.push({
                row: batchRowInfo[k].index,
                value: 'Đã import',
                background: '#d4edda'
              });
            } else if (duplicateIndices.includes(k)) {
              // Duplicate - skip nếu SKIP_DUPLICATES = true
              if (CONFIG.SKIP_DUPLICATES) {
                // Đánh dấu là "Đã tồn tại" thay vì "Lỗi"
                duplicateCount++;
                statusUpdates.push({
                  row: batchRowInfo[k].index,
                  value: 'Đã tồn tại',
                  background: '#fff3cd' // Màu vàng nhạt
                });
                Logger.log(`Dòng ${batchRowInfo[k].rowNumber}: Đã tồn tại - ${batchRowInfo[k].plateNumber}`);
              } else {
                // Báo lỗi nếu không skip
                errorCount++;
                errors.push(`Dòng ${batchRowInfo[k].rowNumber}: Biển số đã tồn tại`);
                statusUpdates.push({
                  row: batchRowInfo[k].index,
                  value: 'Lỗi: Đã tồn tại',
                  background: '#f8d7da'
                });
              }
            } else {
              // Lỗi khác
              errorCount++;
              const errorMsg = errorDetails[k] || 'Lỗi không xác định';
              errors.push(`Dòng ${batchRowInfo[k].rowNumber}: ${errorMsg}`);
              statusUpdates.push({
                row: batchRowInfo[k].index,
                value: `Lỗi: ${errorMsg}`,
                background: '#f8d7da'
              });
            }
          }
        } else {
          // Tất cả đều lỗi - nhưng vẫn kiểm tra xem có duplicate không
          const duplicateIndices = result.duplicateIndices || [];
          const errorDetails = result.errors || [];
          
          for (let k = 0; k < batchRowInfo.length; k++) {
            if (duplicateIndices.includes(k) && CONFIG.SKIP_DUPLICATES) {
              // Duplicate - skip
              duplicateCount++;
              statusUpdates.push({
                row: batchRowInfo[k].index,
                value: 'Đã tồn tại',
                background: '#fff3cd'
              });
              Logger.log(`Dòng ${batchRowInfo[k].rowNumber}: Đã tồn tại - ${batchRowInfo[k].plateNumber}`);
            } else {
              // Lỗi thật sự
              errorCount++;
              const errorMsg = errorDetails[k] || result.error || 'Lỗi không xác định';
              errors.push(`Dòng ${batchRowInfo[k].rowNumber}: ${errorMsg}`);
              statusUpdates.push({
                row: batchRowInfo[k].index,
                value: `Lỗi: ${errorMsg}`,
                background: '#f8d7da'
              });
            }
          }
        }
      }
      
      // Batch update status trong sheet (cập nhật nhiều cell cùng lúc)
      // Chỉ update khi kết thúc batch hoặc khi có nhiều updates để giảm số lần gọi API
      if (statusUpdates.length > 0 && (statusUpdates.length >= 100 || batchEnd >= recordsToProcess.length)) {
        try {
          updateStatusBatch(sheet, statusUpdates, statusColumnIndex);
          statusUpdates.length = 0; // Clear sau khi update
        } catch (updateError) {
          Logger.log('Lỗi khi update status: ' + updateError.toString());
          // Thử update từng cell nếu batch update lỗi (nhưng chỉ một số cell để tránh timeout)
          const maxCellUpdates = 20; // Giới hạn số cell update để tránh timeout
          for (let u = 0; u < Math.min(statusUpdates.length, maxCellUpdates); u++) {
            try {
              const update = statusUpdates[u];
              const cell = sheet.getRange(update.row + CONFIG.START_ROW - 1, statusColumnIndex);
              cell.setValue(update.value);
              cell.setBackground(update.background || '#ffffff');
            } catch (cellError) {
              Logger.log(`Lỗi khi update cell row ${update.row}: ${cellError.toString()}`);
            }
          }
          // Xóa các updates đã xử lý
          statusUpdates.splice(0, Math.min(statusUpdates.length, maxCellUpdates));
        }
      }
      
      // Delay giữa các batch (chỉ nếu cần)
      if (CONFIG.BATCH_DELAY > 0 && batchEnd < recordsToProcess.length) {
        Utilities.sleep(CONFIG.BATCH_DELAY);
      }
      
      // Kiểm tra thời gian đã chạy (ước tính 5 phút 30 giây để an toàn)
      const totalElapsed = (new Date().getTime() - overallStartTime) / 1000;
      if (totalElapsed > 300) { // 5 phút
        Logger.log(`⚠️ Đã chạy ${Math.round(totalElapsed)} giây, dừng để tránh timeout.`);
        Logger.log(`⚠️ Đã xử lý ${batchEnd}/${recordsToProcess.length} records. Vui lòng chạy lại để tiếp tục.`);
        // Update status cho các records đã xử lý trước khi dừng
        if (statusUpdates.length > 0) {
          try {
            updateStatusBatch(sheet, statusUpdates, statusColumnIndex);
          } catch (e) {
            Logger.log('Lỗi khi update status cuối cùng: ' + e.toString());
          }
        }
        break;
      }
    }
    
    // Update status cuối cùng cho các records còn lại
    if (statusUpdates.length > 0) {
      try {
        updateStatusBatch(sheet, statusUpdates, statusColumnIndex);
      } catch (e) {
        Logger.log('Lỗi khi update status cuối cùng: ' + e.toString());
      }
    }
    
    // Hiển thị kết quả
    const totalProcessed = successCount + errorCount + duplicateCount;
    let message = `Hoàn thành!\n\nThành công: ${successCount}`;
    if (duplicateCount > 0) {
      message += `\nĐã tồn tại (skip): ${duplicateCount}`;
    }
    message += `\nLỗi: ${errorCount}\nTổng: ${totalProcessed} records`;
    
    Logger.log('=== KẾT QUẢ CUỐI CÙNG ===');
    Logger.log(message);
    
    if (errors.length > 0 && errors.length <= 20) {
      Logger.log('Các lỗi:\n' + errors.slice(0, 20).join('\n'));
      if (errors.length > 20) {
        Logger.log(`... và ${errors.length - 20} lỗi khác`);
      }
    }
    
    Logger.log('Đang hiển thị thông báo...');
    try {
      SpreadsheetApp.getUi().alert(message);
      Logger.log('Đã hiển thị thông báo thành công');
    } catch (alertError) {
      Logger.log('Lỗi khi hiển thị thông báo: ' + alertError.toString());
      // Vẫn tiếp tục, không throw exception
    }
    Logger.log('Script đã hoàn thành!');
    
  } catch (error) {
    Logger.log('Lỗi tổng quát: ' + error.toString());
    SpreadsheetApp.getUi().alert('Lỗi: ' + error.toString());
  }
}

/**
 * Chuyển đổi chữ cột thành số (A=1, B=2, ..., Z=26, AA=27, ...)
 */
function columnLetterToIndex(column) {
  let result = 0;
  for (let i = 0; i < column.length; i++) {
    result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result;
}

/**
 * Batch update status trong sheet (cập nhật nhiều cell cùng lúc)
 */
function updateStatusBatch(sheet, updates, columnIndex) {
  if (updates.length === 0) return;
  
  try {
    // Sắp xếp updates theo row để tối ưu
    updates.sort((a, b) => a.row - b.row);
    
    // Tạo map để truy cập nhanh
    const updateMap = {};
    for (let i = 0; i < updates.length; i++) {
      updateMap[updates[i].row] = updates[i];
    }
    
    // Lấy range từ row đầu đến row cuối
    const rows = updates.map(u => u.row);
    if (rows.length === 0) return;
    
    const firstRow = Math.min(...rows) + CONFIG.START_ROW - 1;
    const lastRow = Math.max(...rows) + CONFIG.START_ROW - 1;
    const numRows = lastRow - firstRow + 1;
    
    // Tạo mảng values và backgrounds cho toàn bộ range
    const values = [];
    const backgrounds = [];
    for (let r = 0; r < numRows; r++) {
      const actualRow = firstRow + r;
      const rowIndex = actualRow - CONFIG.START_ROW + 1; // Convert về index trong data
      const update = updateMap[rowIndex];
      
      if (update) {
        values.push([update.value || '']);
        backgrounds.push([update.background || '#ffffff']);
      } else {
        // Giữ nguyên giá trị hiện tại (đọc từ sheet) - nhưng có thể bỏ qua để tăng tốc
        values.push(['']);
        backgrounds.push(['#ffffff']);
      }
    }
    
    // Batch update toàn bộ range cùng lúc
    if (numRows > 0 && values.length > 0) {
      const range = sheet.getRange(firstRow, columnIndex, numRows, 1);
      range.setValues(values);
      range.setBackgrounds(backgrounds);
    }
  } catch (error) {
    Logger.log('Lỗi trong updateStatusBatch: ' + error.toString());
    throw error; // Re-throw để xử lý ở nơi gọi
  }
}

/**
 * Lấy sheet để đọc dữ liệu
 */
function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  if (CONFIG.SHEET_NAME) {
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      throw new Error(`Không tìm thấy sheet: ${CONFIG.SHEET_NAME}`);
    }
    return sheet;
  } else {
    return spreadsheet.getActiveSheet();
  }
}

/**
 * Đọc dữ liệu từ sheet
 */
function readSheetData(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.START_ROW) {
    return [];
  }
  
  // Đọc header để xác định vị trí cột
  const headerRange = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, sheet.getLastColumn());
  const headers = headerRange.getValues()[0];
  
  // Đọc dữ liệu
  const dataRange = sheet.getRange(CONFIG.START_ROW, 1, lastRow - CONFIG.START_ROW + 1, sheet.getLastColumn());
  const dataValues = dataRange.getValues();
  
  // Chuyển đổi thành object với key là tên cột
  const data = [];
  for (let i = 0; i < dataValues.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (header) {
        row[header] = dataValues[i][j];
      }
    }
    data.push(row);
  }
  
  return data;
}

/**
 * Chuyển đổi dữ liệu từ sheet sang format của database
 */
function mapRowToVehicle(row, rowNumber) {
  const vehicle = {};
  
  // Map các trường cơ bản
  const mapping = CONFIG.COLUMN_MAPPING;
  
  // ID - nếu có IDXe thì dùng, không thì generate UUID
  if (row['IDXe']) {
    vehicle.id = String(row['IDXe']).trim();
  } else {
    // Generate UUID v4 (đơn giản)
    vehicle.id = generateUUID();
  }
  
  // Plate number - bắt buộc
  if (!row['BienSo'] || !String(row['BienSo']).trim()) {
    throw new Error('Biển số không được để trống');
  }
  vehicle.plate_number = String(row['BienSo']).trim();
  
  // Seat capacity
  if (row['SoCho']) {
    const seats = parseInt(row['SoCho']);
    vehicle.seat_capacity = isNaN(seats) ? 0 : seats;
  } else {
    vehicle.seat_capacity = 0;
  }
  
  // Chassis number
  if (row['SoKhung']) {
    vehicle.chassis_number = String(row['SoKhung']).trim() || null;
  }
  
  // Engine number
  if (row['SoMay']) {
    vehicle.engine_number = String(row['SoMay']).trim() || null;
  }
  
  // Inspection expiry date (NienHan)
  if (row['NienHan']) {
    const dateStr = parseDate(row['NienHan']);
    if (dateStr) {
      vehicle.inspection_expiry_date = dateStr;
    }
  }
  
  // Tập hợp các thông tin bổ sung vào notes
  const notesParts = [];
  
  if (row['TenDangKyXe']) notesParts.push(`Tên đăng ký: ${row['TenDangKyXe']}`);
  if (row['DiaChiChuXe']) notesParts.push(`Địa chỉ chủ xe: ${row['DiaChiChuXe']}`);
  if (row['NhanHieu']) notesParts.push(`Nhãn hiệu: ${row['NhanHieu']}`);
  if (row['LoaiXe']) notesParts.push(`Loại xe: ${row['LoaiXe']}`);
  if (row['LoaiPhuongTien']) notesParts.push(`Loại phương tiện: ${row['LoaiPhuongTien']}`);
  if (row['TaiTrong']) notesParts.push(`Tải trọng: ${row['TaiTrong']}`);
  if (row['MauSon']) notesParts.push(`Màu sơn: ${row['MauSon']}`);
  if (row['NamSanXuat']) notesParts.push(`Năm sản xuất: ${row['NamSanXuat']}`);
  if (row['LaBienDinhDanh']) notesParts.push(`Là biển định danh: ${row['LaBienDinhDanh']}`);
  if (row['TrangThaiBienDinhDanh']) notesParts.push(`Trạng thái biển định danh: ${row['TrangThaiBienDinhDanh']}`);
  if (row['LyDoThuBienDinhDanh']) notesParts.push(`Lý do thu biển định danh: ${row['LyDoThuBienDinhDanh']}`);
  if (row['ThongTinDangKyXe']) notesParts.push(`Thông tin đăng ký: ${row['ThongTinDangKyXe']}`);
  if (row['Nienhan']) notesParts.push(`Niên hạn: ${row['Nienhan']}`);
  if (row['CoKDVT']) notesParts.push(`Có KDV: ${row['CoKDVT']}`);
  if (row['User']) notesParts.push(`Người nhập: ${row['User']}`);
  if (row['ThoiGianNhap']) notesParts.push(`Thời gian nhập: ${row['ThoiGianNhap']}`);
  
  if (notesParts.length > 0) {
    vehicle.notes = notesParts.join('\n');
  }
  
  // Các trường mặc định
  vehicle.is_active = true;
  vehicle.bed_capacity = 0;
  
  return vehicle;
}

/**
 * Parse date từ nhiều format khác nhau
 */
function parseDate(dateValue) {
  if (!dateValue) return null;
  
  // Nếu là Date object
  if (dateValue instanceof Date) {
    return formatDate(dateValue);
  }
  
  // Nếu là string
  const str = String(dateValue).trim();
  if (!str) return null;
  
  // Thử parse các format phổ biến
  // Format: DD/MM/YYYY hoặc DD-MM-YYYY
  const datePattern1 = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match1 = str.match(datePattern1);
  if (match1) {
    const day = parseInt(match1[1]);
    const month = parseInt(match1[2]) - 1; // Month is 0-indexed
    const year = parseInt(match1[3]);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return formatDate(date);
    }
  }
  
  // Format: YYYY-MM-DD
  const datePattern2 = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
  const match2 = str.match(datePattern2);
  if (match2) {
    const year = parseInt(match2[1]);
    const month = parseInt(match2[2]) - 1;
    const day = parseInt(match2[3]);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return formatDate(date);
    }
  }
  
  // Thử parse trực tiếp
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return formatDate(date);
  }
  
  return null;
}

/**
 * Format date thành YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate UUID v4 (đơn giản)
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Gửi một vehicle lên Supabase (dùng cho single insert)
 */
function insertVehicleToSupabase(vehicleData) {
  try {
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/vehicles`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.SUPABASE_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      payload: JSON.stringify(vehicleData),
      muteHttpExceptions: true // Để xem full error response
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode >= 200 && responseCode < 300) {
      return { success: true, data: JSON.parse(responseText) };
    } else {
      let error;
      try {
        error = JSON.parse(responseText);
      } catch (e) {
        error = { message: responseText };
      }
      
      // Kiểm tra lỗi duplicate (409 Conflict hoặc code 23505)
      const errorMsg = (error.message || error.error_description || `HTTP ${responseCode}`).toLowerCase();
      const isDuplicate = responseCode === 409 || 
                         (error.code === '23505') || 
                         errorMsg.includes('duplicate') ||
                         errorMsg.includes('already exists') ||
                         errorMsg.includes('unique constraint');
      
      return { 
        success: false, 
        error: error.message || error.error_description || `HTTP ${responseCode}`,
        isDuplicate: isDuplicate
      };
    }
    
  } catch (error) {
    return { 
      success: false, 
      error: error.toString(),
      isDuplicate: false
    };
  }
}

/**
 * Gửi nhiều vehicles lên Supabase cùng lúc (Batch insert - TỐC ĐỘ CAO)
 */
function insertVehiclesBatchToSupabase(vehiclesArray) {
  try {
    if (!vehiclesArray || vehiclesArray.length === 0) {
      return { success: false, error: 'Không có dữ liệu để gửi' };
    }
    
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/vehicles`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.SUPABASE_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      payload: JSON.stringify(vehiclesArray), // Gửi mảng thay vì object đơn
      muteHttpExceptions: true // Để xem full error response
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode >= 200 && responseCode < 300) {
      // Thành công - tất cả đều được insert
      const insertedData = JSON.parse(responseText);
      return { 
        success: true, 
        data: insertedData,
        count: Array.isArray(insertedData) ? insertedData.length : 1
      };
    } else {
      // Có lỗi - có thể là một số records lỗi
      let error;
      try {
        error = JSON.parse(responseText);
      } catch (parseError) {
        error = { message: responseText };
      }
      
      // Kiểm tra lỗi duplicate (409 Conflict hoặc code 23505)
      const isDuplicate = responseCode === 409 || 
                         (error.code === '23505') || 
                         (error.message && (
                           error.message.toLowerCase().includes('duplicate') ||
                           error.message.toLowerCase().includes('already exists') ||
                           error.message.toLowerCase().includes('unique constraint')
                         ));
      
      // Luôn thử insert từng record để xác định record nào thành công/lỗi/duplicate
      // Vì Supabase batch insert có thể fail toàn bộ nếu một record lỗi
      return handlePartialBatchError(vehiclesArray, error);
    }
    
  } catch (error) {
    return { 
      success: false, 
      error: error.toString(),
      partial: false
    };
  }
}

/**
 * Xử lý lỗi partial batch - thử insert từng record để xác định record nào lỗi
 * Tối ưu: Giảm logging và delay để tăng tốc tối đa
 */
function handlePartialBatchError(vehiclesArray, originalError) {
  const successIndices = [];
  const duplicateIndices = [];
  const errors = [];
  
  // Chỉ log khi batch rất lớn
  if (vehiclesArray.length > 50) {
    Logger.log(`Xử lý từng record (${vehiclesArray.length} records)...`);
  }
  
  // Tối ưu: Giảm logging tối đa - chỉ log khi cần thiết
  const logEvery = vehiclesArray.length > 100 ? 50 : (vehiclesArray.length > 20 ? 20 : 10);
  
  // Tối ưu: Sử dụng batch nhỏ hơn thay vì từng record một
  // Chia thành các mini-batch để tăng tốc
  const miniBatchSize = 10; // Thử insert 10 records cùng lúc
  
  for (let i = 0; i < vehiclesArray.length; i += miniBatchSize) {
    const miniBatch = vehiclesArray.slice(i, i + miniBatchSize);
    const miniBatchEnd = Math.min(i + miniBatchSize, vehiclesArray.length);
    
    // Thử insert mini-batch trước
    const miniResult = insertVehiclesBatchToSupabase(miniBatch);
    
    if (miniResult.success) {
      // Tất cả trong mini-batch thành công
      for (let j = i; j < miniBatchEnd; j++) {
        successIndices.push(j);
        errors.push(null);
      }
      if (i % logEvery === 0) {
        Logger.log(`Records ${i + 1}-${miniBatchEnd}/${vehiclesArray.length}: Thành công (mini-batch)`);
      }
    } else if (miniResult.partial) {
      // Một số thành công, một số lỗi - xử lý từng record
      const miniSuccess = miniResult.successIndices || [];
      const miniDuplicate = miniResult.duplicateIndices || [];
      const miniErrors = miniResult.errors || [];
      
      for (let j = 0; j < miniBatch.length; j++) {
        const actualIndex = i + j;
        if (miniSuccess.includes(j)) {
          successIndices.push(actualIndex);
          errors.push(null);
        } else if (miniDuplicate.includes(j) && CONFIG.SKIP_DUPLICATES) {
          duplicateIndices.push(actualIndex);
          errors.push('DUPLICATE');
        } else {
          errors.push(miniErrors[j] || 'Lỗi không xác định');
        }
      }
    } else {
      // Mini-batch lỗi - thử từng record
      for (let j = 0; j < miniBatch.length; j++) {
        const actualIndex = i + j;
        const result = insertVehicleToSupabase(miniBatch[j]);
        if (result.success) {
          successIndices.push(actualIndex);
          errors.push(null);
        } else if (result.isDuplicate && CONFIG.SKIP_DUPLICATES) {
          duplicateIndices.push(actualIndex);
          errors.push('DUPLICATE');
        } else {
          errors.push(result.error);
        }
      }
    }
    
    // Không delay để tăng tốc tối đa
  }
  
  const totalProcessed = successIndices.length + duplicateIndices.length;
  const realErrors = errors.filter(e => e !== null && e !== 'DUPLICATE').length;
  Logger.log(`Kết quả: ${successIndices.length} thành công, ${duplicateIndices.length} duplicate, ${realErrors} lỗi`);
  
  // Nếu có duplicate và SKIP_DUPLICATES = true, coi như partial (đã xử lý)
  // Nếu tất cả đều duplicate, vẫn coi như partial để xử lý đúng
  const hasProcessed = totalProcessed > 0 || (duplicateIndices.length > 0 && CONFIG.SKIP_DUPLICATES);
  
  return {
    success: successIndices.length === vehiclesArray.length,
    partial: hasProcessed && (totalProcessed < vehiclesArray.length || duplicateIndices.length > 0),
    successIndices: successIndices,
    duplicateIndices: duplicateIndices,
    errors: errors,
    error: originalError.message || originalError.error_description
  };
}

/**
 * Tạo menu trong Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Import Xe')
    .addItem('Import lên Supabase (Batch - Tốc độ cao)', 'importVehicles')
    .addSeparator()
    .addItem('Test kết nối Supabase', 'testConnection')
    .addToUi();
}

/**
 * Hàm test để kiểm tra kết nối Supabase
 */
function testConnection() {
  try {
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/vehicles?select=id&limit=1`;
    
    const options = {
      method: 'GET',
      headers: {
        'apikey': CONFIG.SUPABASE_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
      }
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode >= 200 && responseCode < 300) {
      SpreadsheetApp.getUi().alert('Kết nối Supabase thành công!');
    } else {
      SpreadsheetApp.getUi().alert(`Lỗi kết nối: HTTP ${responseCode}`);
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert('Lỗi: ' + error.toString());
  }
}

