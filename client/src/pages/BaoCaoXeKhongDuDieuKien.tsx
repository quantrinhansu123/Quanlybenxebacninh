import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, FileSpreadsheet } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { toast } from "react-toastify";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  StickyTable,
  StickyTableHeader,
  StickyTableBody,
  StickyTableRow,
  StickyTableHead,
  StickyTableCell,
} from "@/components/ui/sticky-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { dispatchService } from "@/services/dispatch.service";
import { useUIStore } from "@/store/ui.store";
import { DatePickerRange } from "@/components/DatePickerRange";
import { formatVietnamDateTime } from "@/lib/vietnam-time";

interface IneligibleVehicleData {
  plateNumber: string;
  operatorName: string;
  routeName: string;
  routeType: string;
  transportOrderCode: string;
  entryTime: string;
  entryBy: string;
  permitTime: string;
  permitShift: string;
  paymentTime: string;
  paymentBy: string;
  departureOrderTime: string;
  departureOrderBy: string;
  departureOrderShift: string;
  plannedDepartureTime: string;
  actualDepartureTime: string;
  exitTime: string;
  exitBy: string;
  drivers: string;
  rejectionReason: string;
  parkingLocation: string;
  notes: string;
  hasImages: string;
  permitStatus: string;
  syncStatus: string;
}

export default function BaoCaoXeKhongDuDieuKien() {
  const setTitle = useUIStore((state) => state.setTitle);
  const [data, setData] = useState<IneligibleVehicleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    setTitle("Báo cáo > Xe không đủ điều kiện");
  }, [setTitle]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load dispatch records
      const dispatchRecords = await dispatchService.getAll();
      
      // Filter by date range if provided
      let filteredRecords = dispatchRecords;
      if (dateRange?.from && dateRange?.to) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        
        filteredRecords = dispatchRecords.filter((record) => {
          if (record.entryTime) {
            const recordDate = new Date(record.entryTime);
            return recordDate >= fromDate && recordDate <= toDate;
          }
          return false;
        });
      }

      // Only show records that are not eligible (permit_rejected)
      const ineligibleRecords = filteredRecords.filter(
        (record) => record.currentStatus === "permit_rejected" || record.permitStatus === "rejected"
      );

      // Map to ineligible vehicle data
      const result = ineligibleRecords.map((record) => {
        const metadata = (record.metadata || {}) as Record<string, unknown>;
        return {
          plateNumber: record.vehiclePlateNumber || "-",
          operatorName: record.vehicle?.operator?.name || "-",
          routeName: record.routeName || "-",
          routeType: record.route?.routeType || "-",
          transportOrderCode: record.transportOrderCode || "-",
          entryTime: record.entryTime || "-",
          entryBy: record.entryBy || "-",
          permitTime: record.boardingPermitTime || "-",
          permitShift: String(metadata.permitShift || "-"),
          paymentTime: record.paymentTime || "-",
          paymentBy: record.paymentBy || "-",
          departureOrderTime: record.departureOrderTime || "-",
          departureOrderBy: record.departureOrderBy || "-",
          departureOrderShift: String(metadata.departureOrderShift || "-"),
          plannedDepartureTime: record.plannedDepartureTime || "-",
          actualDepartureTime: String(metadata.actualDepartureTime || "-"),
          exitTime: record.exitTime || "-",
          exitBy: record.exitBy || "-",
          drivers: record.driverName || "-",
          rejectionReason: record.rejectionReason || "-",
          parkingLocation: String(metadata.parkingLocation || "-"),
          notes: record.notes || "-",
          hasImages: metadata.hasImages ? "Có" : "Không",
          permitStatus: getPermitStatusLabel(record.permitStatus),
          syncStatus: getSyncStatus(record),
        };
      });

      setData(result);
    } catch (error) {
      console.error("Failed to load ineligible vehicle data:", error);
      toast.error("Không thể tải dữ liệu báo cáo");
    } finally {
      setIsLoading(false);
    }
  };

  const getPermitStatusLabel = (permitStatus?: string): string => {
    if (!permitStatus) return "Chưa ký";
    
    switch (permitStatus) {
      case "approved":
        return "Đã ký";
      case "rejected":
        return "Từ chối";
      case "pending":
        return "Chờ ký";
      default:
        return permitStatus;
    }
  };

  const getSyncStatus = (record: any): string => {
    if (record.metadata?.synced === true) {
      return "Đã đồng bộ";
    }
    
    if (record.transportOrderCode && record.permitStatus === "approved") {
      return "Đã đồng bộ";
    }
    
    if (record.updatedAt) {
      const updatedTime = new Date(record.updatedAt).getTime();
      const now = new Date().getTime();
      const diffHours = (now - updatedTime) / (1000 * 60 * 60);
      
      if (diffHours < 1) {
        return "Đang đồng bộ";
      }
    }
    
    return "Chưa đồng bộ";
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.plateNumber.toLowerCase().includes(query) ||
          item.operatorName.toLowerCase().includes(query) ||
          item.routeName.toLowerCase().includes(query) ||
          item.transportOrderCode.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [data, searchQuery]);

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.warning("Không có dữ liệu để xuất Excel");
      return;
    }

    try {
      // Prepare data for Excel
      const excelData = filteredData.map((item, index) => ({
        "STT": index + 1,
        "Biển số": item.plateNumber,
        "Tên đơn vị": item.operatorName,
        "Tên luồng tuyến": item.routeName,
        "Loại tuyến": item.routeType,
        "Mã lệnh vận chuyển": item.transportOrderCode,
        "Thời gian vào bến": item.entryTime !== "-" ? format(new Date(item.entryTime), "dd/MM/yyyy HH:mm") : "-",
        "Người cho vào bến": item.entryBy,
        "Giờ cấp phép lên nốt": item.permitTime !== "-" ? format(new Date(item.permitTime), "dd/MM/yyyy HH:mm") : "-",
        "Ca trực cấp nốt": item.permitShift,
        "Thời gian thanh toán": item.paymentTime !== "-" ? format(new Date(item.paymentTime), "dd/MM/yyyy HH:mm") : "-",
        "Người thanh toán": item.paymentBy,
        "Giờ cấp lệnh xuất bến": item.departureOrderTime !== "-" ? format(new Date(item.departureOrderTime), "dd/MM/yyyy HH:mm") : "-",
        "Người cấp lệnh": item.departureOrderBy,
        "Ca trực cấp lệnh": item.departureOrderShift,
        "Giờ xuất bến KH": item.plannedDepartureTime !== "-" ? format(new Date(item.plannedDepartureTime), "dd/MM/yyyy HH:mm") : "-",
        "Giờ xuất bến khác": item.actualDepartureTime !== "-" ? format(new Date(item.actualDepartureTime), "dd/MM/yyyy HH:mm") : "-",
        "Thời gian ra bến": item.exitTime !== "-" ? format(new Date(item.exitTime), "dd/MM/yyyy HH:mm") : "-",
        "Người cho ra bến": item.exitBy,
        "Danh sách lái xe": item.drivers,
        "Lý do không đủ điều kiện": item.rejectionReason,
        "Vị trí đỗ": item.parkingLocation,
        "Ghi chú": item.notes,
        "Có ảnh vào ra": item.hasImages,
        "Trạng thái ký lệnh vận chuyển": item.permitStatus,
        "Trạng thái đồng bộ dữ liệu": item.syncStatus,
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Xe không đủ điều kiện");

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 15 },  // Biển số
        { wch: 25 },  // Tên đơn vị
        { wch: 25 },  // Tên luồng tuyến
        { wch: 15 },  // Loại tuyến
        { wch: 20 },  // Mã lệnh vận chuyển
        { wch: 20 },  // Thời gian vào bến
        { wch: 20 },  // Người cho vào bến
        { wch: 20 },  // Giờ cấp phép lên nốt
        { wch: 15 },  // Ca trực cấp nốt
        { wch: 20 },  // Thời gian thanh toán
        { wch: 20 },  // Người thanh toán
        { wch: 20 },  // Giờ cấp lệnh xuất bến
        { wch: 20 },  // Người cấp lệnh
        { wch: 15 },  // Ca trực cấp lệnh
        { wch: 20 },  // Giờ xuất bến KH
        { wch: 20 },  // Giờ xuất bến khác
        { wch: 20 },  // Thời gian ra bến
        { wch: 20 },  // Người cho ra bến
        { wch: 20 },  // Danh sách lái xe
        { wch: 30 },  // Lý do không đủ điều kiện
        { wch: 15 },  // Vị trí đỗ
        { wch: 30 },  // Ghi chú
        { wch: 15 },  // Có ảnh vào ra
        { wch: 25 },  // Trạng thái ký lệnh vận chuyển
        { wch: 25 },  // Trạng thái đồng bộ dữ liệu
      ];
      ws['!cols'] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Bao-cao-xe-khong-du-dieu-kien_${currentDate}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Đã xuất Excel thành công: ${filename}`);
    } catch (error) {
      console.error("Failed to export Excel:", error);
      toast.error("Không thể xuất Excel. Vui lòng thử lại sau.");
    }
  };

  const renderTime = (value: string) => {
    if (value === "-" || !value) return "-";
    try {
      return formatVietnamDateTime(value);
    } catch {
      return "-";
    }
  };

  // Sticky column positions (in pixels)
  // Using fixed widths for all columns to calculate sticky positions accurately
  const STICKY_COLUMN_WIDTH = 150;
  const NON_STICKY_COLUMN_WIDTH = 160; // Average width for non-sticky columns
  
  // Calculate positions: 3 sticky columns + 20 non-sticky columns before the last 2 sticky columns
  const stickyPositions = {
    plateNumber: 0,
    operatorName: STICKY_COLUMN_WIDTH,
    routeName: STICKY_COLUMN_WIDTH * 2,
    // Position after 3 sticky columns (450px) + 20 non-sticky columns (3200px)
    permitStatus: STICKY_COLUMN_WIDTH * 3 + (NON_STICKY_COLUMN_WIDTH * 20),
    // Position after permitStatus + its width
    syncStatus: STICKY_COLUMN_WIDTH * 3 + (NON_STICKY_COLUMN_WIDTH * 20) + STICKY_COLUMN_WIDTH,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isLoading || filteredData.length === 0}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Xuất Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Tìm kiếm biển số, đơn vị, tuyến, mã lệnh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DatePickerRange
              range={dateRange}
              onRangeChange={setDateRange}
              placeholder="Chọn khoảng thời gian"
              label=""
              className="w-full space-y-0"
            />
          </div>

          <div className="border rounded-lg overflow-auto">
            <StickyTable style={{ tableLayout: "fixed", width: "max-content" }}>
              <colgroup>
                <col style={{ width: `${STICKY_COLUMN_WIDTH}px`, minWidth: `${STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${STICKY_COLUMN_WIDTH}px`, minWidth: `${STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${STICKY_COLUMN_WIDTH}px`, minWidth: `${STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${STICKY_COLUMN_WIDTH}px`, minWidth: `${STICKY_COLUMN_WIDTH}px` }} />
              </colgroup>
              <StickyTableHeader>
                <StickyTableRow className="bg-gray-100">
                  <StickyTableHead
                    sticky
                    stickyLeft={stickyPositions.plateNumber}
                    className="text-center font-semibold bg-gray-100"
                    style={{ width: "150px", minWidth: "150px", backgroundColor: "#f3f4f6" }}
                  >
                    Biển số
                  </StickyTableHead>
                  <StickyTableHead
                    sticky
                    stickyLeft={stickyPositions.operatorName}
                    className="text-center font-semibold bg-gray-100"
                    style={{ width: "150px", minWidth: "150px", backgroundColor: "#f3f4f6" }}
                  >
                    Tên đơn vị
                  </StickyTableHead>
                  <StickyTableHead
                    sticky
                    stickyLeft={stickyPositions.routeName}
                    className="text-center font-semibold bg-gray-100"
                    style={{ width: "150px", minWidth: "150px", backgroundColor: "#f3f4f6" }}
                  >
                    Tên luồng tuyến
                  </StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Loại tuyến</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Mã lệnh vận chuyển</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Thời gian vào bến</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Người cho vào bến</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Giờ cấp phép lên nốt</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Ca trực cấp nốt</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Thời gian thanh toán</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Người thanh toán</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Giờ cấp lệnh xuất bến</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Người cấp lệnh</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Ca trực cấp lệnh</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Giờ xuất bến KH</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Giờ xuất bến khác</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Thời gian ra bến</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Người cho ra bến</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Danh sách lái xe</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Lý do không đủ điều kiện</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Vị trí đỗ</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Ghi chú</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Có ảnh vào ra</StickyTableHead>
                  <StickyTableHead
                    sticky
                    stickyRight={STICKY_COLUMN_WIDTH}
                    className="text-center font-semibold bg-gray-100"
                    style={{ width: "150px", minWidth: "150px", backgroundColor: "#f3f4f6" }}
                  >
                    Trạng thái ký lệnh vận chuyển
                  </StickyTableHead>
                  <StickyTableHead
                    sticky
                    stickyRight={0}
                    className="text-center font-semibold bg-gray-100"
                    style={{ width: "150px", minWidth: "150px", backgroundColor: "#f3f4f6" }}
                  >
                    Trạng thái đồng bộ dữ liệu
                  </StickyTableHead>
                </StickyTableRow>
              </StickyTableHeader>
              <StickyTableBody>
                {isLoading ? (
                  <StickyTableRow>
                    <StickyTableCell colSpan={25} className="text-center text-gray-500">
                      Đang tải dữ liệu...
                    </StickyTableCell>
                  </StickyTableRow>
                ) : filteredData.length === 0 ? (
                  <StickyTableRow>
                    <StickyTableCell colSpan={25} className="text-center text-gray-500">
                      Không có dữ liệu
                    </StickyTableCell>
                  </StickyTableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <StickyTableRow key={`${item.plateNumber}-${item.entryTime}-${index}`}>
                      <StickyTableCell
                        sticky
                        stickyLeft={stickyPositions.plateNumber}
                        className="text-center font-semibold"
                        style={{ width: "150px", minWidth: "150px", backgroundColor: "#ffffff" }}
                      >
                        {item.plateNumber}
                      </StickyTableCell>
                      <StickyTableCell
                        sticky
                        stickyLeft={stickyPositions.operatorName}
                        className="text-center"
                        style={{ width: "150px", minWidth: "150px", backgroundColor: "#ffffff" }}
                      >
                        {item.operatorName}
                      </StickyTableCell>
                      <StickyTableCell
                        sticky
                        stickyLeft={stickyPositions.routeName}
                        className="text-center"
                        style={{ width: "150px", minWidth: "150px", backgroundColor: "#ffffff" }}
                      >
                        {item.routeName}
                      </StickyTableCell>
                      <StickyTableCell className="text-center">{item.routeType}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.transportOrderCode}</StickyTableCell>
                      <StickyTableCell className="text-center">{renderTime(item.entryTime)}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.entryBy}</StickyTableCell>
                      <StickyTableCell className="text-center">{renderTime(item.permitTime)}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.permitShift}</StickyTableCell>
                      <StickyTableCell className="text-center">{renderTime(item.paymentTime)}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.paymentBy}</StickyTableCell>
                      <StickyTableCell className="text-center">{renderTime(item.departureOrderTime)}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.departureOrderBy}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.departureOrderShift}</StickyTableCell>
                      <StickyTableCell className="text-center">{renderTime(item.plannedDepartureTime)}</StickyTableCell>
                      <StickyTableCell className="text-center">{renderTime(item.actualDepartureTime)}</StickyTableCell>
                      <StickyTableCell className="text-center">{renderTime(item.exitTime)}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.exitBy}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.drivers}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.rejectionReason}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.parkingLocation}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.notes}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.hasImages}</StickyTableCell>
                      <StickyTableCell
                        sticky
                        stickyRight={STICKY_COLUMN_WIDTH}
                        className="text-center"
                        style={{ width: "150px", minWidth: "150px", backgroundColor: "#ffffff" }}
                      >
                        {item.permitStatus}
                      </StickyTableCell>
                      <StickyTableCell
                        sticky
                        stickyRight={0}
                        className="text-center"
                        style={{ width: "150px", minWidth: "150px", backgroundColor: "#ffffff" }}
                      >
                        {item.syncStatus}
                      </StickyTableCell>
                    </StickyTableRow>
                  ))
                )}
              </StickyTableBody>
            </StickyTable>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

