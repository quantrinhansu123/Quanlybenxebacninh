import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { RefreshCw, Search, FileSpreadsheet, ArrowLeft } from "lucide-react";
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

interface VehicleEntryExitData {
  plateNumber: string;
  entryPlateNumber: string;
  operatorName: string;
  routeName: string;
  entryTime: string;
  entryShift: string;
  plannedDepartureTime: string;
  actualDepartureTime: string;
  exitTime: string;
  exitShift: string;
  vehicleStatus: string;
  hasBoardingPermit: string;
  isTemporaryExit: string;
  hasImages: string;
}

export default function BaoCaoXeRaVaoBen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setTitle = useUIStore((state) => state.setTitle);
  const [data, setData] = useState<VehicleEntryExitData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Get vehicle plate number and return path from URL params
  const vehiclePlateNumberFilter = searchParams.get("vehiclePlateNumber") || "";
  const returnTo = searchParams.get("returnTo") || "";

  useEffect(() => {
    if (vehiclePlateNumberFilter) {
      setTitle(`Báo cáo xe ra vào bến của ${vehiclePlateNumberFilter}`);
    } else {
      setTitle("Báo cáo > Xe ra vào bến");
    }
  }, [setTitle, vehiclePlateNumberFilter]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, vehiclePlateNumberFilter]);

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

      // Filter by vehicle plate number if provided in URL params
      let vehicleFilteredRecords = filteredRecords;
      if (vehiclePlateNumberFilter) {
        vehicleFilteredRecords = filteredRecords.filter((record) =>
          record.vehiclePlateNumber?.toLowerCase() === vehiclePlateNumberFilter.toLowerCase()
        );
      }

      // Map to vehicle entry/exit data
      const result = vehicleFilteredRecords.map((record) => {
        const metadata = (record.metadata || {}) as Record<string, unknown>;
        return {
          plateNumber: record.vehiclePlateNumber || "-",
          entryPlateNumber: String(metadata.entryPlateNumber || record.vehiclePlateNumber || "-"),
          operatorName: record.vehicle?.operator?.name || "-",
          routeName: record.routeName || "-",
          entryTime: record.entryTime || "-",
          entryShift: String(metadata.entryShift || "-"),
          plannedDepartureTime: record.plannedDepartureTime || "-",
          actualDepartureTime: String(metadata.actualDepartureTime || "-"),
          exitTime: record.exitTime || "-",
          exitShift: String(metadata.exitShift || "-"),
          vehicleStatus: getVehicleStatus(record),
          hasBoardingPermit: record.boardingPermitTime ? "Có" : "Không",
          isTemporaryExit: metadata.isTemporaryExit ? "Có" : "Không",
          hasImages: metadata.hasImages ? "Có" : "Không",
        };
      });

      setData(result);
    } catch (error) {
      console.error("Failed to load vehicle entry/exit data:", error);
      toast.error("Không thể tải dữ liệu báo cáo");
    } finally {
      setIsLoading(false);
    }
  };

  const getVehicleStatus = (record: any): string => {
    if (record.exitTime) {
      return "Đã ra bến";
    }
    if (record.departureOrderTime) {
      return "Đã xuất lệnh";
    }
    if (record.boardingPermitTime) {
      return "Đã cấp phép";
    }
    if (record.passengerDropTime) {
      return "Đã trả khách";
    }
    if (record.entryTime) {
      return "Đang trong bến";
    }
    return "-";
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.plateNumber.toLowerCase().includes(query) ||
          item.entryPlateNumber.toLowerCase().includes(query) ||
          item.operatorName.toLowerCase().includes(query) ||
          item.routeName.toLowerCase().includes(query)
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
        "Biển số khi vào": item.entryPlateNumber,
        "Tên đơn vị": item.operatorName,
        "Tên luồng tuyến": item.routeName,
        "Thời gian vào bến": item.entryTime !== "-" ? format(new Date(item.entryTime), "dd/MM/yyyy HH:mm") : "-",
        "Ca trực cho vào": item.entryShift,
        "Giờ xuất bến kế hoạch": item.plannedDepartureTime !== "-" ? format(new Date(item.plannedDepartureTime), "dd/MM/yyyy HH:mm") : "-",
        "Giờ xuất bến khác": item.actualDepartureTime !== "-" ? format(new Date(item.actualDepartureTime), "dd/MM/yyyy HH:mm") : "-",
        "Thời gian ra bến": item.exitTime !== "-" ? format(new Date(item.exitTime), "dd/MM/yyyy HH:mm") : "-",
        "Ca trực cho ra": item.exitShift,
        "Trạng thái xe": item.vehicleStatus,
        "Xe lên nốt": item.hasBoardingPermit,
        "Xe tạm ra": item.isTemporaryExit,
        "Có ảnh vào ra": item.hasImages,
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Xe ra vào bến");

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 15 },  // Biển số
        { wch: 15 },  // Biển số khi vào
        { wch: 25 },  // Tên đơn vị
        { wch: 25 },  // Tên luồng tuyến
        { wch: 20 },  // Thời gian vào bến
        { wch: 15 },  // Ca trực cho vào
        { wch: 20 },  // Giờ xuất bến kế hoạch
        { wch: 20 },  // Giờ xuất bến khác
        { wch: 20 },  // Thời gian ra bến
        { wch: 15 },  // Ca trực cho ra
        { wch: 15 },  // Trạng thái xe
        { wch: 12 },  // Xe lên nốt
        { wch: 12 },  // Xe tạm ra
        { wch: 15 },  // Có ảnh vào ra
      ];
      ws['!cols'] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Bao-cao-xe-ra-vao-ben_${currentDate}.xlsx`;

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
  const STICKY_COLUMN_WIDTH = 150;
  const NON_STICKY_COLUMN_WIDTH = 160;
  
  const stickyPositions = {
    plateNumber: 0,
    entryPlateNumber: STICKY_COLUMN_WIDTH,
    operatorName: STICKY_COLUMN_WIDTH * 2,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex gap-2">
            {returnTo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(returnTo)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
            )}
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
                placeholder="Tìm kiếm biển số, đơn vị, tuyến..."
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
                    stickyLeft={stickyPositions.entryPlateNumber}
                    className="text-center font-semibold bg-gray-100"
                    style={{ width: "150px", minWidth: "150px", backgroundColor: "#f3f4f6" }}
                  >
                    Biển số khi vào
                  </StickyTableHead>
                  <StickyTableHead
                    sticky
                    stickyLeft={stickyPositions.operatorName}
                    className="text-center font-semibold bg-gray-100"
                    style={{ width: "150px", minWidth: "150px", backgroundColor: "#f3f4f6" }}
                  >
                    Tên đơn vị
                  </StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Tên luồng tuyến</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Thời gian vào bến</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Ca trực cho vào</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Giờ xuất bến kế hoạch</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Giờ xuất bến khác</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Thời gian ra bến</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Ca trực cho ra</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Trạng thái xe</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Xe lên nốt</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Xe tạm ra</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Có ảnh vào ra</StickyTableHead>
                </StickyTableRow>
              </StickyTableHeader>
              <StickyTableBody>
                {isLoading ? (
                  <StickyTableRow>
                    <StickyTableCell colSpan={14} className="text-center text-gray-500">
                      Đang tải dữ liệu...
                    </StickyTableCell>
                  </StickyTableRow>
                ) : filteredData.length === 0 ? (
                  <StickyTableRow>
                    <StickyTableCell colSpan={14} className="text-center text-gray-500">
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
                        stickyLeft={stickyPositions.entryPlateNumber}
                        className="text-center"
                        style={{ width: "150px", minWidth: "150px", backgroundColor: "#ffffff" }}
                      >
                        {item.entryPlateNumber}
                      </StickyTableCell>
                      <StickyTableCell
                        sticky
                        stickyLeft={stickyPositions.operatorName}
                        className="text-center"
                        style={{ width: "150px", minWidth: "150px", backgroundColor: "#ffffff" }}
                      >
                        {item.operatorName}
                      </StickyTableCell>
                      <StickyTableCell className="text-center">{item.routeName}</StickyTableCell>
                      <StickyTableCell className="text-center">{renderTime(item.entryTime)}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.entryShift}</StickyTableCell>
                      <StickyTableCell className="text-center">{renderTime(item.plannedDepartureTime)}</StickyTableCell>
                      <StickyTableCell className="text-center">{renderTime(item.actualDepartureTime)}</StickyTableCell>
                      <StickyTableCell className="text-center">{renderTime(item.exitTime)}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.exitShift}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.vehicleStatus}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.hasBoardingPermit}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.isTemporaryExit}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.hasImages}</StickyTableCell>
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

