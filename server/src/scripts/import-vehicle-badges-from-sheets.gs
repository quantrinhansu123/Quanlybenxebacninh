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
 * [LEGACY] Google Apps Script để import dữ liệu phù hiệu xe từ Google Sheets lên Supabase
 *
 * HƯỚNG DẪN SỬ DỤNG (ĐÃ LỖI THỜI):
 * 1. Mở Google Sheets chứa dữ liệu phù hiệu xe
 * 2. Vào Extensions > Apps Script
 * 3. Dán code này vào editor
 * 4. Cập nhật các biến cấu hình ở dưới (SUPABASE_URL, SUPABASE_KEY)
 * 5. Chạy hàm importVehicleBadges() hoặc tạo menu để chạy
 */

// ============================================
// CẤU HÌNH
// ============================================
const CONFIG_BADGES = {
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
  STATUS_COLUMN: 'AC', // Cột để đánh dấu trạng thái import
  
  // Số lượng records gửi cùng lúc (batch size)
  BATCH_SIZE: 50, // Tăng lên 50 để tối ưu tốc độ
  
  // Delay giữa các batch (ms)
  BATCH_DELAY: 10, // Delay 10ms để tránh rate limit
  
  // Số lượng records tối đa xử lý trong một lần chạy (để tránh timeout)
  MAX_RECORDS_PER_RUN: 1000,
  
  // Tự động skip các records bị duplicate (đã tồn tại) thay vì báo lỗi
  SKIP_DUPLICATES: true
};

// ============================================
// HÀM CHÍNH
// ============================================

/**
 * Hàm chính để import dữ liệu phù hiệu xe (Batch mode - tốc độ cao)
 */
function importVehicleBadges() {
  try {
    const sheet = getSheet();
    const data = readSheetData(sheet);
    
    Logger.log(`Đã đọc ${data.length} dòng dữ liệu từ sheet`);
    Logger.log(`Cấu hình: Batch size=${CONFIG_BADGES.BATCH_SIZE}, Delay=${CONFIG_BADGES.BATCH_DELAY}ms, Max records/run=${CONFIG_BADGES.MAX_RECORDS_PER_RUN}`);
    
    // Đọc trạng thái hiện tại của tất cả các dòng
    const statusColumnIndex = columnLetterToIndex(CONFIG_BADGES.STATUS_COLUMN);
    const statusRange = sheet.getRange(CONFIG_BADGES.START_ROW, statusColumnIndex, data.length, 1);
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
        rowsToProcess.push({
          data: data[i],
          rowNumber: CONFIG_BADGES.START_ROW + i,
          index: i
        });
      } else {
        rowsToProcess.push({
          data: data[i],
          rowNumber: CONFIG_BADGES.START_ROW + i,
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
    const recordsToProcess = rowsToProcess.slice(0, CONFIG_BADGES.MAX_RECORDS_PER_RUN);
    
    // Kiểm tra an toàn
    if (!recordsToProcess || recordsToProcess.length === 0) {
      SpreadsheetApp.getUi().alert('Không có dữ liệu để xử lý!');
      return;
    }
    
    if (rowsToProcess.length > CONFIG_BADGES.MAX_RECORDS_PER_RUN) {
      Logger.log(`⚠️ Cảnh báo: Có ${rowsToProcess.length} dòng cần import, nhưng chỉ xử lý ${CONFIG_BADGES.MAX_RECORDS_PER_RUN} dòng trong lần chạy này.`);
      Logger.log(`⚠️ Vui lòng chạy lại script để xử lý các dòng còn lại.`);
    }
    
    const totalBatches = Math.ceil(recordsToProcess.length / CONFIG_BADGES.BATCH_SIZE);
    Logger.log(`Sẽ xử lý ${totalBatches} batch(es) với ${recordsToProcess.length} records`);
    
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors = [];
    const statusUpdates = [];
    
    // Lưu thời gian bắt đầu để theo dõi
    const overallStartTime = new Date().getTime();
    
    // Lưu ý: Cột BienSoXe trong sheet chứa vehicle_id (VARCHAR)
    // Cần lookup plate_number từ vehicle_id để lưu vào license_plate_sheet
    Logger.log('Đang lookup plate_number từ vehicle_id...');
    
    // Cache để lưu vehicle_id -> plate_number
    const vehiclePlateCache = {};
    const allVehicleIds = [];
    const vehicleIdToRowMap = {};
    
    // Thu thập tất cả vehicle_id cần lookup
    for (let i = 0; i < recordsToProcess.length; i++) {
      const vehicleId = String(recordsToProcess[i].data['BienSoXe'] || '').trim();
      if (vehicleId && !vehiclePlateCache[vehicleId]) {
        if (!vehicleIdToRowMap[vehicleId]) {
          allVehicleIds.push(vehicleId);
          vehicleIdToRowMap[vehicleId] = [];
        }
        vehicleIdToRowMap[vehicleId].push(i);
      }
    }
    
    // Batch lookup plate_number từ vehicle_id
    if (allVehicleIds.length > 0) {
      Logger.log(`Cần lookup plate_number cho ${allVehicleIds.length} vehicle_id...`);
      const BATCH_LOOKUP_SIZE = 20; // Giảm xuống 20 để tránh URL quá dài
      for (let i = 0; i < allVehicleIds.length; i += BATCH_LOOKUP_SIZE) {
        const batch = allVehicleIds.slice(i, i + BATCH_LOOKUP_SIZE);
        Logger.log(`Lookup batch ${Math.floor(i / BATCH_LOOKUP_SIZE) + 1}/${Math.ceil(allVehicleIds.length / BATCH_LOOKUP_SIZE)} (${batch.length} vehicle_id)...`);
        const plateLookupResult = batchLookupPlateNumbersByVehicleIds(batch);
        for (const vid in plateLookupResult) {
          vehiclePlateCache[vid] = plateLookupResult[vid];
        }
        // Delay nhỏ giữa các batch để tránh rate limit
        if (i + BATCH_LOOKUP_SIZE < allVehicleIds.length) {
          Utilities.sleep(50);
        }
      }
      Logger.log(`Đã lookup xong ${Object.keys(vehiclePlateCache).length} plate_number`);
    }
    
    // Chia thành các batch
    for (let batchStart = 0; batchStart < recordsToProcess.length; batchStart += CONFIG_BADGES.BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + CONFIG_BADGES.BATCH_SIZE, recordsToProcess.length);
      const batch = recordsToProcess.slice(batchStart, batchEnd);
      
      const batchNumber = Math.floor(batchStart / CONFIG_BADGES.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(recordsToProcess.length / CONFIG_BADGES.BATCH_SIZE);
      Logger.log(`Xử lý batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);
      
      const batchStartTime = new Date().getTime();
      
      // Chuẩn bị dữ liệu cho batch
      const badgeBatch = [];
      const batchRowInfo = [];
      
      for (let j = 0; j < batch.length; j++) {
        const rowInfo = batch[j];
        try {
          const badgeData = mapRowToBadge(rowInfo.data, rowInfo.rowNumber, vehiclePlateCache);
          if (badgeData) {
            badgeBatch.push(badgeData);
            batchRowInfo.push({
              rowNumber: rowInfo.rowNumber,
              index: rowInfo.index,
              badgeNumber: badgeData.badge_number
            });
          } else {
            // Lỗi khi map dữ liệu (ví dụ: thiếu vehicle_id)
            errorCount++;
            const vehicleId = String(rowInfo.data['BienSoXe'] || '').trim();
            errors.push(`Dòng ${rowInfo.rowNumber}: Lỗi khi xử lý vehicle_id: ${vehicleId}`);
            statusUpdates.push({
              row: rowInfo.index,
              value: 'Lỗi: Xử lý dữ liệu',
              background: '#f8d7da'
            });
          }
        } catch (error) {
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
      if (badgeBatch.length > 0) {
        // Normalize tất cả objects để có cùng keys (Supabase yêu cầu)
        const normalizedBatch = normalizeBadgeBatch(badgeBatch);
        Logger.log(`Đang gửi ${normalizedBatch.length} badges lên Supabase...`);
        const batchInsertStartTime = new Date().getTime();
        const result = insertBadgesBatchToSupabase(normalizedBatch);
        const batchInsertElapsed = ((new Date().getTime() - batchInsertStartTime) / 1000).toFixed(1);
        Logger.log(`Insert ${badgeBatch.length} badges hoàn thành trong ${batchInsertElapsed}s`);
        
        // Xử lý kết quả
        Logger.log(`Kết quả batch: success=${result.success}, partial=${result.partial || false}, count=${result.count || 0}, error=${result.error || 'none'}`);
        
        if (result.success) {
          Logger.log(`✅ Batch thành công: ${result.count || batchRowInfo.length} badges đã insert`);
          for (let k = 0; k < batchRowInfo.length; k++) {
            successCount++;
            statusUpdates.push({
              row: batchRowInfo[k].index,
              value: 'Đã import',
              background: '#d4edda'
            });
          }
        } else if (result.partial) {
          Logger.log(`⚠️ Batch một phần: ${result.successIndices?.length || 0} thành công, ${result.duplicateIndices?.length || 0} duplicate`);
          const successIndices = result.successIndices || [];
          const duplicateIndices = result.duplicateIndices || [];
          const errorDetails = result.errors || [];
          
          for (let k = 0; k < batchRowInfo.length; k++) {
            if (successIndices.includes(k)) {
              successCount++;
              statusUpdates.push({
                row: batchRowInfo[k].index,
                value: 'Đã import',
                background: '#d4edda'
              });
            } else if (duplicateIndices.includes(k)) {
              if (CONFIG_BADGES.SKIP_DUPLICATES) {
                duplicateCount++;
                statusUpdates.push({
                  row: batchRowInfo[k].index,
                  value: 'Đã tồn tại',
                  background: '#fff3cd'
                });
              } else {
                errorCount++;
                errors.push(`Dòng ${batchRowInfo[k].rowNumber}: Phù hiệu đã tồn tại`);
                statusUpdates.push({
                  row: batchRowInfo[k].index,
                  value: 'Lỗi: Đã tồn tại',
                  background: '#f8d7da'
                });
              }
            } else {
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
          const duplicateIndices = result.duplicateIndices || [];
          const errorDetails = result.errors || [];
          
          for (let k = 0; k < batchRowInfo.length; k++) {
            if (duplicateIndices.includes(k) && CONFIG_BADGES.SKIP_DUPLICATES) {
              duplicateCount++;
              statusUpdates.push({
                row: batchRowInfo[k].index,
                value: 'Đã tồn tại',
                background: '#fff3cd'
              });
            } else {
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
        
        const batchTotalElapsed = ((new Date().getTime() - batchStartTime) / 1000).toFixed(1);
        Logger.log(`Batch ${batchNumber} hoàn thành: ${result.success ? 'Thành công' : result.partial ? 'Một phần' : 'Lỗi'} trong ${batchTotalElapsed}s`);
      }
      
      // Batch update status
      if (statusUpdates.length > 0 && (statusUpdates.length >= 100 || batchEnd >= recordsToProcess.length)) {
        try {
          updateStatusBatch(sheet, statusUpdates, statusColumnIndex);
          statusUpdates.length = 0;
        } catch (updateError) {
          Logger.log('Lỗi khi update status: ' + updateError.toString());
        }
      }
      
      // Delay giữa các batch
      if (CONFIG_BADGES.BATCH_DELAY > 0 && batchEnd < recordsToProcess.length) {
        Utilities.sleep(CONFIG_BADGES.BATCH_DELAY);
      }
      
      // Kiểm tra thời gian
      const totalElapsed = (new Date().getTime() - overallStartTime) / 1000;
      if (totalElapsed > 300) {
        Logger.log(`⚠️ Đã chạy ${Math.round(totalElapsed)} giây, dừng để tránh timeout.`);
        Logger.log(`⚠️ Đã xử lý ${batchEnd}/${recordsToProcess.length} records. Vui lòng chạy lại để tiếp tục.`);
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
    
    // Update status cuối cùng
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
    
    try {
      SpreadsheetApp.getUi().alert(message);
    } catch (alertError) {
      Logger.log('Lỗi khi hiển thị thông báo: ' + alertError.toString());
    }
    Logger.log('Script đã hoàn thành!');
    
  } catch (error) {
    Logger.log('Lỗi tổng quát: ' + error.toString());
    SpreadsheetApp.getUi().alert('Lỗi: ' + error.toString());
  }
}

/**
 * Map dữ liệu từ sheet sang format database
 * Lưu ý: Cột BienSoXe chứa vehicle_id (VARCHAR)
 * @param {Object} row - Dữ liệu từ sheet
 * @param {number} rowNumber - Số dòng trong sheet
 * @param {Object} vehiclePlateCache - Cache vehicle_id -> plate_number
 */
function mapRowToBadge(row, rowNumber, vehiclePlateCache) {
  const badge = {};
  
  // ID - nếu có ID_PhuHieu thì dùng, không thì generate UUID
  if (row['ID_PhuHieu']) {
    badge.id = String(row['ID_PhuHieu']).trim();
  } else {
    badge.id = generateUUID();
  }
  
  // Badge number - bắt buộc
  if (!row['SoPhuHieu'] || !String(row['SoPhuHieu']).trim()) {
    throw new Error('Số phù hiệu không được để trống');
  }
  badge.badge_number = String(row['SoPhuHieu']).trim();
  
  // File code
  if (row['MaHoSo']) {
    badge.file_code = String(row['MaHoSo']).trim() || null;
  }
  
  // Badge type - bắt buộc
  if (!row['LoaiPH'] || !String(row['LoaiPH']).trim()) {
    throw new Error('Loại phù hiệu không được để trống');
  }
  badge.badge_type = String(row['LoaiPH']).trim();
  
  // Vehicle ID - cột BienSoXe chứa vehicle_id (VARCHAR), dùng trực tiếp
  if (!row['BienSoXe'] || !String(row['BienSoXe']).trim()) {
    throw new Error('ID xe (BienSoXe) không được để trống');
  }
  const vehicleId = String(row['BienSoXe']).trim();
  badge.vehicle_id = vehicleId;
  
  // License plate - lookup plate_number từ vehicle_id
  if (vehiclePlateCache && vehiclePlateCache[vehicleId]) {
    badge.license_plate_sheet = vehiclePlateCache[vehicleId];
  } else {
    // Fallback: thử lookup nếu không có trong cache
    const plateNumber = lookupPlateNumberByVehicleId(vehicleId);
    if (plateNumber) {
      badge.license_plate_sheet = plateNumber;
      if (vehiclePlateCache) {
        vehiclePlateCache[vehicleId] = plateNumber;
      }
    } else {
      // Không tìm thấy plate_number, có thể bỏ qua hoặc để null
      badge.license_plate_sheet = null;
    }
  }
  
  // Warning flag
  if (row['CanhBaoTrungBienSoKhiCapPH']) {
    badge.warn_duplicate_plate = String(row['CanhBaoTrungBienSoKhiCapPH']).toLowerCase() === 'true' || 
                                String(row['CanhBaoTrungBienSoKhiCapPH']) === '1' ||
                                String(row['CanhBaoTrungBienSoKhiCapPH']).toLowerCase() === 'có';
  }
  
  // References
  // issuing_authority_id - có thể là ID không tồn tại, set null nếu không hợp lệ
  if (row['Ref_DonViCapPhuHieu']) {
    const issuingAuthorityId = String(row['Ref_DonViCapPhuHieu']).trim();
    if (issuingAuthorityId) {
      // Lưu giá trị, nhưng sẽ validate sau hoặc để null nếu lỗi FK
      badge.issuing_authority_id = issuingAuthorityId;
    } else {
      badge.issuing_authority_id = null;
    }
  } else {
    badge.issuing_authority_id = null;
  }
  if (row['Ref_GPKD']) {
    badge.business_license_ref = String(row['Ref_GPKD']).trim() || null;
  }
  if (row['Ref_ThongBao']) {
    badge.notification_ref = String(row['Ref_ThongBao']).trim() || null;
  }
  if (row['Ref_Tuyen']) {
    badge.route_id = String(row['Ref_Tuyen']).trim() || null;
  }
  if (row['Ref_TuyenBuyt']) {
    badge.bus_route_ref = String(row['Ref_TuyenBuyt']).trim() || null;
  }
  
  // Dates
  if (row['NgayCap']) {
    const issueDate = parseDate(row['NgayCap']);
    if (issueDate) {
      badge.issue_date = issueDate;
    } else {
      throw new Error('Ngày cấp không hợp lệ');
    }
  } else {
    throw new Error('Ngày cấp không được để trống');
  }
  
  if (row['NgayHetHan']) {
    const expiryDate = parseDate(row['NgayHetHan']);
    if (expiryDate) {
      badge.expiry_date = expiryDate;
    } else {
      throw new Error('Ngày hết hạn không hợp lệ');
    }
  } else {
    throw new Error('Ngày hết hạn không được để trống');
  }
  
  if (row['Hancap']) {
    const renewalDueDate = parseDate(row['Hancap']);
    if (renewalDueDate) {
      badge.renewal_due_date = renewalDueDate;
    }
  }
  
  // Issue type - chỉ cho phép: 'new', 'renewal', 'replacement'
  if (row['LoaiCap']) {
    const issueType = String(row['LoaiCap']).trim().toLowerCase();
    // Xử lý các biến thể của "mới" / "new"
    if (issueType === 'mới' || issueType === 'new' || issueType === 'cấp mới' || issueType === 'cap moi' || issueType.includes('mới') || issueType.includes('new')) {
      badge.issue_type = 'new';
    } 
    // Xử lý các biến thể của "cấp lại" / "renewal"
    else if (issueType === 'cấp lại' || issueType === 'renewal' || issueType === 'cap lai' || issueType.includes('lại') || issueType.includes('renewal')) {
      badge.issue_type = 'renewal';
    } 
    // Xử lý các biến thể của "thay thế" / "replacement"
    else if (issueType === 'thay thế' || issueType === 'replacement' || issueType === 'thay the' || issueType.includes('thay') || issueType.includes('replacement')) {
      badge.issue_type = 'replacement';
    } else {
      // Nếu giá trị không hợp lệ, để null (không set issue_type)
      Logger.log(`⚠️ Dòng ${rowNumber}: LoaiCap không hợp lệ: "${issueType}", bỏ qua (để null)`);
      badge.issue_type = null; // Không set nếu không hợp lệ
    }
  } else {
    // Không có giá trị, để null
    badge.issue_type = null;
  }
  
  // Renewal reason
  if (row['LyDoCapLai']) {
    badge.renewal_reason = String(row['LyDoCapLai']).trim() || null;
  }
  
  // Previous badge number
  if (row['SoPhuHieuCu']) {
    badge.previous_badge_number = String(row['SoPhuHieuCu']).trim() || null;
  }
  
  // Status
  if (row['TrangThai']) {
    const status = String(row['TrangThai']).trim().toLowerCase();
    if (status === 'hoạt động' || status === 'active') {
      badge.status = 'active';
    } else if (status === 'hết hạn' || status === 'expired') {
      badge.status = 'expired';
    } else if (status === 'thu hồi' || status === 'revoked') {
      badge.status = 'revoked';
    } else if (status === 'thay thế' || status === 'replaced') {
      badge.status = 'replaced';
    } else if (status === 'chờ' || status === 'pending') {
      badge.status = 'pending';
    } else {
      badge.status = status;
    }
  } else {
    badge.status = 'active'; // Default
  }
  
  // Email notification
  if (row['GuiEmailbao']) {
    badge.email_notification_sent = String(row['GuiEmailbao']).toLowerCase() === 'true' || 
                                    String(row['GuiEmailbao']) === '1' ||
                                    String(row['GuiEmailbao']).toLowerCase() === 'có';
  }
  
  // Revocation
  if (row['QDThuHoi']) {
    badge.revocation_decision = String(row['QDThuHoi']).trim() || null;
  }
  if (row['LyDoThuHoi']) {
    badge.revocation_reason = String(row['LyDoThuHoi']).trim() || null;
  }
  if (row['NgayThuHoi']) {
    const revocationDate = parseDate(row['NgayThuHoi']);
    if (revocationDate) {
      badge.revocation_date = revocationDate;
    }
  }
  
  // Replacement vehicle - cũng là vehicle_id (VARCHAR)
  if (row['XeThayThe'] || row['Xebithaythe']) {
    const replacementVehicleId = String(row['XeThayThe'] || row['Xebithaythe']).trim();
    if (replacementVehicleId) {
      badge.replacement_vehicle_id = replacementVehicleId;
    }
  }
  
  // Badge color
  if (row['MauPhuHieu']) {
    badge.badge_color = String(row['MauPhuHieu']).trim() || null;
  }
  
  // Notes
  if (row['GhiChu']) {
    badge.notes = String(row['GhiChu']).trim() || null;
  }
  
  // Renewal reminder
  if (row['CanCapLaiPopup']) {
    badge.renewal_reminder_shown = String(row['CanCapLaiPopup']).toLowerCase() === 'true' || 
                                   String(row['CanCapLaiPopup']) === '1' ||
                                   String(row['CanCapLaiPopup']).toLowerCase() === 'có';
  }
  
  return badge;
}

/**
 * Batch lookup plate_number từ nhiều vehicle_id cùng lúc
 * @param {Array<string>} vehicleIds - Mảng các vehicle_id cần lookup
 * @returns {Object} Object với key là vehicle_id, value là plate_number
 */
function batchLookupPlateNumbersByVehicleIds(vehicleIds) {
  const result = {};
  
  if (!vehicleIds || vehicleIds.length === 0) {
    return result;
  }
  
  // Dùng mini-batch (10 records) để tránh lỗi URL với Google Apps Script
  // Google Apps Script có thể không hỗ trợ URL phức tạp với nhiều id
  const MINI_BATCH_SIZE = 10;
  let successCount = 0;
  
  for (let i = 0; i < vehicleIds.length; i += MINI_BATCH_SIZE) {
    const miniBatch = vehicleIds.slice(i, i + MINI_BATCH_SIZE);
    const batchEnd = Math.min(i + MINI_BATCH_SIZE, vehicleIds.length);
    
    try {
      // Thử dùng 'or' operator với format đơn giản
      const orConditions = miniBatch.map(id => {
        const cleanId = String(id).trim();
        return `id.eq.${encodeURIComponent(cleanId)}`;
      }).join(',');
      
      const baseUrl = `${CONFIG_BADGES.SUPABASE_URL}/rest/v1/vehicles`;
      const filter = `or=(${orConditions})`;
      const select = `select=id,plate_number`;
      const url = `${baseUrl}?${filter}&${select}`;
      
      const options = {
        method: 'GET',
        headers: {
          'apikey': CONFIG_BADGES.SUPABASE_KEY,
          'Authorization': `Bearer ${CONFIG_BADGES.SUPABASE_KEY}`
        },
        muteHttpExceptions: true
      };
      
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      if (responseCode >= 200 && responseCode < 300) {
        const data = JSON.parse(responseText);
        if (data && Array.isArray(data)) {
          for (let j = 0; j < data.length; j++) {
            if (data[j].id && data[j].plate_number) {
              result[data[j].id] = data[j].plate_number;
              successCount++;
            }
          }
        }
      } else {
        // Nếu mini-batch lỗi, fallback về từng cái
        for (let j = 0; j < miniBatch.length; j++) {
          const plateNumber = lookupPlateNumberByVehicleId(miniBatch[j]);
          if (plateNumber) {
            result[miniBatch[j]] = plateNumber;
            successCount++;
          }
        }
      }
    } catch (error) {
      // Nếu có lỗi, fallback về từng cái
      for (let j = 0; j < miniBatch.length; j++) {
        try {
          const plateNumber = lookupPlateNumberByVehicleId(miniBatch[j]);
          if (plateNumber) {
            result[miniBatch[j]] = plateNumber;
            successCount++;
          }
        } catch (e) {
          // Bỏ qua lỗi từng cái
        }
      }
    }
    
    // Delay nhỏ giữa các mini-batch
    if (batchEnd < vehicleIds.length) {
      Utilities.sleep(20);
    }
  }
  
  Logger.log(`Đã lookup xong ${successCount}/${vehicleIds.length} vehicle_id`);
  return result;
}

/**
 * Lookup plate_number từ vehicle_id (single)
 * @param {string} vehicleId - vehicle_id cần lookup
 * @returns {string|null} plate_number hoặc null nếu không tìm thấy
 */
function lookupPlateNumberByVehicleId(vehicleId) {
  try {
    const url = `${CONFIG_BADGES.SUPABASE_URL}/rest/v1/vehicles?id=eq.${encodeURIComponent(vehicleId)}&select=plate_number&limit=1`;
    
    const options = {
      method: 'GET',
      headers: {
        'apikey': CONFIG_BADGES.SUPABASE_KEY,
        'Authorization': `Bearer ${CONFIG_BADGES.SUPABASE_KEY}`
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode >= 200 && responseCode < 300) {
      const data = JSON.parse(response.getContentText());
      if (data && data.length > 0 && data[0].plate_number) {
        return data[0].plate_number;
      }
    }
    
    return null;
  } catch (error) {
    Logger.log(`Lỗi khi lookup plate_number: ${error.toString()}`);
    return null;
  }
}

/**
 * Normalize batch để đảm bảo tất cả objects có cùng keys
 * Supabase PostgREST yêu cầu tất cả objects trong batch phải có cùng keys
 */
function normalizeBadgeBatch(badgesArray) {
  if (!badgesArray || badgesArray.length === 0) {
    return [];
  }
  
  // Bước 1: Lấy TẤT CẢ keys từ TẤT CẢ objects
  const allKeys = new Set();
  for (let i = 0; i < badgesArray.length; i++) {
    for (const key in badgesArray[i]) {
      if (badgesArray[i][key] !== undefined) {
        allKeys.add(key);
      }
    }
  }
  
  // Bước 2: Normalize mỗi object để có ĐẦY ĐỦ keys (từ tất cả objects)
  const normalized = [];
  for (let i = 0; i < badgesArray.length; i++) {
    const normalizedBadge = {};
    // Thêm TẤT CẢ keys vào mỗi object
    for (const key of allKeys) {
      if (badgesArray[i].hasOwnProperty(key) && badgesArray[i][key] !== undefined) {
        normalizedBadge[key] = badgesArray[i][key];
      } else {
        // Nếu key không có trong object này, set null (không phải undefined)
        // Supabase sẽ bỏ qua null values hoặc dùng default
        normalizedBadge[key] = null;
      }
    }
    normalized.push(normalizedBadge);
  }
  
  // Bước 3: Kiểm tra lại để đảm bảo tất cả có cùng keys
  const firstKeys = Object.keys(normalized[0] || {}).sort();
  for (let i = 1; i < normalized.length; i++) {
    const currentKeys = Object.keys(normalized[i] || {}).sort();
    if (JSON.stringify(firstKeys) !== JSON.stringify(currentKeys)) {
      Logger.log(`⚠️ Lỗi normalize: Object ${i} vẫn có keys khác sau khi normalize`);
      Logger.log(`First keys (${firstKeys.length}): ${firstKeys.join(', ')}`);
      Logger.log(`Current keys (${currentKeys.length}): ${currentKeys.join(', ')}`);
      
      // Force: thêm keys thiếu vào object hiện tại
      for (const key of firstKeys) {
        if (!normalized[i].hasOwnProperty(key)) {
          normalized[i][key] = null;
        }
      }
      // Thêm keys từ object hiện tại vào object đầu tiên
      for (const key of currentKeys) {
        if (!normalized[0].hasOwnProperty(key)) {
          normalized[0][key] = null;
        }
      }
    }
  }
  
  // Bước 4: Đảm bảo tất cả objects có cùng keys (lần cuối)
  const finalKeys = Object.keys(normalized[0] || {}).sort();
  for (let i = 0; i < normalized.length; i++) {
    const currentKeys = Object.keys(normalized[i] || {}).sort();
    if (JSON.stringify(finalKeys) !== JSON.stringify(currentKeys)) {
      // Thêm keys thiếu
      for (const key of finalKeys) {
        if (!normalized[i].hasOwnProperty(key)) {
          normalized[i][key] = null;
        }
      }
    }
  }
  
  return normalized;
}

/**
 * Gửi nhiều badges lên Supabase cùng lúc (Batch insert)
 */
function insertBadgesBatchToSupabase(badgesArray) {
  try {
    if (!badgesArray || badgesArray.length === 0) {
      return { success: false, error: 'Không có dữ liệu để gửi' };
    }
    
    const url = `${CONFIG_BADGES.SUPABASE_URL}/rest/v1/vehicle_badges`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG_BADGES.SUPABASE_KEY,
        'Authorization': `Bearer ${CONFIG_BADGES.SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      payload: JSON.stringify(badgesArray),
      muteHttpExceptions: true
    };
    
    Logger.log(`Đang gửi request với ${badgesArray.length} badges...`);
    const requestStartTime = new Date().getTime();
    const response = UrlFetchApp.fetch(url, options);
    const requestElapsed = ((new Date().getTime() - requestStartTime) / 1000).toFixed(1);
    Logger.log(`Request hoàn thành trong ${requestElapsed}s`);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log(`Response code: ${responseCode}`);
    Logger.log(`Response length: ${responseText ? responseText.length : 0} ký tự`);
    
    if (responseCode >= 200 && responseCode < 300) {
      // Kiểm tra response có rỗng không
      if (!responseText || responseText.trim() === '') {
        Logger.log(`⚠️ Response rỗng nhưng code ${responseCode} - có thể insert thành công nhưng không trả về data`);
        // Vẫn coi là thành công nếu code 200-299
        return { 
          success: true, 
          data: [],
          count: badgesArray.length // Giả định tất cả đã insert
        };
      }
      
      try {
        const insertedData = JSON.parse(responseText);
        const insertedCount = Array.isArray(insertedData) ? insertedData.length : (insertedData ? 1 : 0);
        Logger.log(`✅ Insert thành công: ${insertedCount} badges (gửi ${badgesArray.length})`);
        
        // Kiểm tra số lượng
        if (insertedCount === 0 && badgesArray.length > 0) {
          Logger.log(`⚠️ Cảnh báo: Response trả về 0 records nhưng đã gửi ${badgesArray.length}`);
        }
        
        return { 
          success: true, 
          data: insertedData,
          count: insertedCount
        };
      } catch (parseError) {
        Logger.log(`❌ Lỗi parse response: ${parseError.toString()}`);
        Logger.log(`Response text (first 500 chars): ${responseText.substring(0, 500)}`);
        return { 
          success: false, 
          error: 'Lỗi parse response: ' + parseError.toString(),
          partial: false
        };
      }
    } else {
      Logger.log(`❌ Response lỗi (HTTP ${responseCode}): ${responseText.substring(0, 500)}`);
      let error;
      try {
        error = JSON.parse(responseText);
      } catch (parseError) {
        error = { message: responseText };
      }
      
      // Kiểm tra nếu là lỗi foreign key constraint
      const errorMsg = (error.message || error.error_description || '').toLowerCase();
      if (errorMsg.includes('foreign key') || errorMsg.includes('violates foreign key') || error.code === '23503') {
        Logger.log(`⚠️ Lỗi foreign key constraint: ${error.message || error.error_description}`);
        Logger.log(`Thử set null cho các foreign keys không hợp lệ và insert từng record...`);
        // Thử lại với các foreign keys set null
        return handleForeignKeyError(badgesArray, error);
      }
      
      return handlePartialBatchError(badgesArray, error);
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
 * Xử lý lỗi foreign key constraint bằng cách set null cho các foreign keys không hợp lệ
 */
function handleForeignKeyError(badgesArray, originalError) {
  const successIndices = [];
  const duplicateIndices = [];
  const errors = [];
  
  // Các foreign key fields có thể gây lỗi
  const foreignKeyFields = ['issuing_authority_id', 'route_id', 'replacement_vehicle_id'];
  
  Logger.log(`Xử lý ${badgesArray.length} records với foreign key errors...`);
  
  // Thử lại từng record với foreign keys set null nếu cần
  for (let i = 0; i < badgesArray.length; i++) {
    const badge = JSON.parse(JSON.stringify(badgesArray[i])); // Deep copy
    let inserted = false;
    
    // Thử insert với giá trị hiện tại trước
    const firstResult = insertBadgeToSupabase(badge);
    Logger.log(`Record ${i}: firstResult success=${firstResult.success}, isDuplicate=${firstResult.isDuplicate}, isFK=${firstResult.isForeignKeyError}, error=${firstResult.error?.substring(0, 100)}`);
    
    if (firstResult.success) {
      successIndices.push(i);
      errors.push(null);
      inserted = true;
      Logger.log(`✅ Record ${i}: Insert thành công`);
    } else if (firstResult.isDuplicate && CONFIG_BADGES.SKIP_DUPLICATES) {
      duplicateIndices.push(i);
      errors.push('DUPLICATE');
      inserted = true;
      Logger.log(`🔄 Record ${i}: Đã tồn tại (duplicate)`);
    } else if (firstResult.isForeignKeyError || (firstResult.error && firstResult.error.includes('foreign key'))) {
      Logger.log(`🔑 Record ${i}: Lỗi foreign key, thử set null...`);
      // Nếu lỗi foreign key, thử set null cho từng foreign key
      for (const fkField of foreignKeyFields) {
        if (badge[fkField] && !inserted) {
          const testBadge = JSON.parse(JSON.stringify(badge));
          testBadge[fkField] = null;
          
          const result = insertBadgeToSupabase(testBadge);
          Logger.log(`Record ${i}: Thử set null ${fkField}, success=${result.success}, isDuplicate=${result.isDuplicate}, isFK=${result.isForeignKeyError}`);
          
          if (result.success) {
            successIndices.push(i);
            errors.push(null);
            inserted = true;
            Logger.log(`✅ Record ${i}: Set null cho ${fkField} và insert thành công`);
            break;
          } else if (result.isDuplicate && CONFIG_BADGES.SKIP_DUPLICATES) {
            duplicateIndices.push(i);
            errors.push('DUPLICATE');
            inserted = true;
            Logger.log(`🔄 Record ${i}: Set null ${fkField} nhưng vẫn duplicate`);
            break;
          } else if (result.isForeignKeyError) {
            Logger.log(`🔑 Record ${i}: Set null ${fkField} vẫn lỗi foreign key, thử tiếp...`);
            // Tiếp tục thử foreign key khác
          }
        }
      }
      
      // Nếu vẫn chưa insert được, thử set null cho tất cả foreign keys
      if (!inserted) {
        const allNullBadge = JSON.parse(JSON.stringify(badge));
        for (const fkField of foreignKeyFields) {
          allNullBadge[fkField] = null;
        }
        
        const result = insertBadgeToSupabase(allNullBadge);
        Logger.log(`Record ${i}: Thử set null tất cả FK, success=${result.success}, isDuplicate=${result.isDuplicate}, isFK=${result.isForeignKeyError}, error=${result.error?.substring(0, 100)}`);
        
        if (result.success) {
          successIndices.push(i);
          errors.push(null);
          inserted = true;
          Logger.log(`✅ Record ${i}: Set null cho tất cả foreign keys và insert thành công`);
        } else if (result.isDuplicate && CONFIG_BADGES.SKIP_DUPLICATES) {
          duplicateIndices.push(i);
          errors.push('DUPLICATE');
          inserted = true;
          Logger.log(`🔄 Record ${i}: Set null tất cả FK vẫn duplicate`);
        } else {
          Logger.log(`❌ Record ${i}: Vẫn lỗi sau khi set null tất cả FK: ${result.error}`);
          errors.push(result.error || 'Lỗi không xác định');
        }
      }
    } else {
      // Lỗi khác, không phải foreign key
      Logger.log(`❌ Record ${i}: Lỗi khác (không phải FK): ${firstResult.error}`);
      errors.push(firstResult.error || 'Lỗi không xác định');
    }
  }
  
  const totalProcessed = successIndices.length + duplicateIndices.length;
  Logger.log(`Xử lý foreign key errors: ${successIndices.length} thành công, ${duplicateIndices.length} duplicate, ${errors.filter(e => e && e !== 'DUPLICATE').length} lỗi`);
  
  return {
    success: successIndices.length === badgesArray.length,
    partial: totalProcessed > 0 && totalProcessed < badgesArray.length,
    successIndices: successIndices,
    duplicateIndices: duplicateIndices,
    errors: errors,
    error: originalError.message || originalError.error_description
  };
}

/**
 * Xử lý lỗi partial batch
 * Tránh đệ quy quá sâu bằng cách chỉ thử mini-batch một lần
 */
function handlePartialBatchError(badgesArray, originalError) {
  const successIndices = [];
  const duplicateIndices = [];
  const errors = [];
  
  // Nếu batch quá nhỏ rồi (<= 10), thử từng cái luôn
  if (badgesArray.length <= 10) {
    Logger.log(`Batch nhỏ (${badgesArray.length}), thử từng record...`);
    for (let j = 0; j < badgesArray.length; j++) {
      const result = insertBadgeToSupabase(badgesArray[j]);
      if (result.success) {
        successIndices.push(j);
        errors.push(null);
      } else if (result.isDuplicate && CONFIG_BADGES.SKIP_DUPLICATES) {
        duplicateIndices.push(j);
        errors.push('DUPLICATE');
      } else {
        errors.push(result.error || 'Lỗi không xác định');
      }
    }
  } else {
    // Chia thành mini-batch 10 records
    const miniBatchSize = 10;
    Logger.log(`Chia batch ${badgesArray.length} thành mini-batches ${miniBatchSize}...`);
    
    for (let i = 0; i < badgesArray.length; i += miniBatchSize) {
      const miniBatch = badgesArray.slice(i, i + miniBatchSize);
      const miniBatchEnd = Math.min(i + miniBatchSize, badgesArray.length);
      
      // Chỉ thử mini-batch một lần, không đệ quy
      const miniResult = insertBadgesBatchToSupabaseDirect(miniBatch);
      
      if (miniResult.success) {
        for (let j = i; j < miniBatchEnd; j++) {
          successIndices.push(j);
          errors.push(null);
        }
      } else {
        // Nếu mini-batch vẫn lỗi, thử từng cái
        for (let j = 0; j < miniBatch.length; j++) {
          const actualIndex = i + j;
          const result = insertBadgeToSupabase(miniBatch[j]);
          if (result.success) {
            successIndices.push(actualIndex);
            errors.push(null);
          } else if (result.isDuplicate && CONFIG_BADGES.SKIP_DUPLICATES) {
            duplicateIndices.push(actualIndex);
            errors.push('DUPLICATE');
          } else {
            errors.push(result.error || 'Lỗi không xác định');
          }
        }
      }
    }
  }
  
  const totalProcessed = successIndices.length + duplicateIndices.length;
  
  return {
    success: successIndices.length === badgesArray.length,
    partial: totalProcessed > 0 && totalProcessed < badgesArray.length,
    successIndices: successIndices,
    duplicateIndices: duplicateIndices,
    errors: errors,
    error: originalError.message || originalError.error_description
  };
}

/**
 * Insert batch trực tiếp (không gọi handlePartialBatchError để tránh đệ quy)
 */
function insertBadgesBatchToSupabaseDirect(badgesArray) {
  try {
    if (!badgesArray || badgesArray.length === 0) {
      return { success: false, error: 'Không có dữ liệu để gửi' };
    }
    
    const url = `${CONFIG_BADGES.SUPABASE_URL}/rest/v1/vehicle_badges`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG_BADGES.SUPABASE_KEY,
        'Authorization': `Bearer ${CONFIG_BADGES.SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      payload: JSON.stringify(badgesArray),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode >= 200 && responseCode < 300) {
      const insertedData = JSON.parse(responseText);
      return { 
        success: true, 
        data: insertedData,
        count: Array.isArray(insertedData) ? insertedData.length : 1
      };
    } else {
      return { 
        success: false, 
        error: responseText.substring(0, 200),
        partial: false
      };
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
 * Gửi một badge lên Supabase
 */
function insertBadgeToSupabase(badgeData) {
  try {
    const url = `${CONFIG_BADGES.SUPABASE_URL}/rest/v1/vehicle_badges`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG_BADGES.SUPABASE_KEY,
        'Authorization': `Bearer ${CONFIG_BADGES.SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      payload: JSON.stringify(badgeData),
      muteHttpExceptions: true
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
      
      const errorMsg = (error.message || error.error_description || `HTTP ${responseCode}`).toLowerCase();
      
      // Phân biệt rõ: foreign key (23503) vs duplicate (23505)
      const isForeignKeyError = error.code === '23503' ||
                               errorMsg.includes('foreign key') ||
                               errorMsg.includes('violates foreign key');
      
      const isDuplicate = !isForeignKeyError && (
                         responseCode === 409 || 
                         (error.code === '23505') || 
                         errorMsg.includes('duplicate') ||
                         errorMsg.includes('already exists') ||
                         errorMsg.includes('unique constraint')
                       );
      
      // Log chi tiết để debug
      if (isForeignKeyError) {
        Logger.log(`🔑 Foreign key error cho record: ${error.details || error.message}`);
      } else if (isDuplicate) {
        Logger.log(`🔄 Duplicate error cho record: ${error.details || error.message}`);
      }
      
      return { 
        success: false, 
        error: error.message || error.error_description || `HTTP ${responseCode}`,
        isDuplicate: isDuplicate,
        isForeignKeyError: isForeignKeyError
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

// ============================================
// CÁC HÀM HỖ TRỢ (giống như script import vehicles)
// ============================================

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (CONFIG_BADGES.SHEET_NAME) {
    const sheet = spreadsheet.getSheetByName(CONFIG_BADGES.SHEET_NAME);
    if (!sheet) {
      throw new Error(`Không tìm thấy sheet: ${CONFIG_BADGES.SHEET_NAME}`);
    }
    return sheet;
  } else {
    return spreadsheet.getActiveSheet();
  }
}

function readSheetData(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG_BADGES.START_ROW) {
    return [];
  }
  
  const headerRange = sheet.getRange(CONFIG_BADGES.HEADER_ROW, 1, 1, sheet.getLastColumn());
  const headers = headerRange.getValues()[0];
  
  const dataRange = sheet.getRange(CONFIG_BADGES.START_ROW, 1, lastRow - CONFIG_BADGES.START_ROW + 1, sheet.getLastColumn());
  const dataValues = dataRange.getValues();
  
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

function columnLetterToIndex(column) {
  let result = 0;
  for (let i = 0; i < column.length; i++) {
    result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result;
}

function updateStatusBatch(sheet, updates, columnIndex) {
  if (updates.length === 0) return;
  
  try {
    updates.sort((a, b) => a.row - b.row);
    const updateMap = {};
    for (let i = 0; i < updates.length; i++) {
      updateMap[updates[i].row] = updates[i];
    }
    
    const rows = updates.map(u => u.row);
    if (rows.length === 0) return;
    
    const firstRow = Math.min(...rows) + CONFIG_BADGES.START_ROW - 1;
    const lastRow = Math.max(...rows) + CONFIG_BADGES.START_ROW - 1;
    const numRows = lastRow - firstRow + 1;
    
    const values = [];
    const backgrounds = [];
    for (let r = 0; r < numRows; r++) {
      const actualRow = firstRow + r;
      const rowIndex = actualRow - CONFIG_BADGES.START_ROW + 1;
      const update = updateMap[rowIndex];
      
      if (update) {
        values.push([update.value || '']);
        backgrounds.push([update.background || '#ffffff']);
      } else {
        values.push(['']);
        backgrounds.push(['#ffffff']);
      }
    }
    
    if (numRows > 0 && values.length > 0) {
      const range = sheet.getRange(firstRow, columnIndex, numRows, 1);
      range.setValues(values);
      range.setBackgrounds(backgrounds);
    }
  } catch (error) {
    Logger.log('Lỗi trong updateStatusBatch: ' + error.toString());
    throw error;
  }
}

function parseDate(dateValue) {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    return formatDate(dateValue);
  }
  
  const str = String(dateValue).trim();
  if (!str) return null;
  
  const datePattern1 = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match1 = str.match(datePattern1);
  if (match1) {
    const day = parseInt(match1[1]);
    const month = parseInt(match1[2]) - 1;
    const year = parseInt(match1[3]);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return formatDate(date);
    }
  }
  
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
  
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return formatDate(date);
  }
  
  return null;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Import Phù Hiệu')
    .addItem('Import lên Supabase (Batch - Tốc độ cao)', 'importVehicleBadges')
    .addSeparator()
    .addItem('Test kết nối Supabase', 'testConnection')
    .addToUi();
}

function testConnection() {
  try {
    const url = `${CONFIG_BADGES.SUPABASE_URL}/rest/v1/vehicle_badges?select=id&limit=1`;
    
    const options = {
      method: 'GET',
      headers: {
        'apikey': CONFIG_BADGES.SUPABASE_KEY,
        'Authorization': `Bearer ${CONFIG_BADGES.SUPABASE_KEY}`
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


