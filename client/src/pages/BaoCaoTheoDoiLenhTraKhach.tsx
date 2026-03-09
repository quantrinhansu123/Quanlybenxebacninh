import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, FileSpreadsheet } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { toast } from "react-toastify";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { dispatchService } from "@/services/dispatch.service";
import { useUIStore } from "@/store/ui.store";
import { DatePickerRange } from "@/components/DatePickerRange";
import { formatVietnamDateTime, parseDatabaseTimeForFilter } from "@/lib/vietnam-time";

interface OrderData {
  plateNumber: string;
  orderCode: string;
  departureStation: string;
  orderType: string;
  plannedDepartureTime: string;
  orderStatus: string;
}

export default function BaoCaoTheoDoiLenhTraKhach() {
  const setTitle = useUIStore((state) => state.setTitle);
  const [data, setData] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setTitle("Báo cáo > Theo dõi lệnh trả khách");
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
        // Create start of day and end of day for comparison
        const fromTime = new Date(dateRange.from).setHours(0, 0, 0, 0);
        const toTime = new Date(dateRange.to).setHours(23, 59, 59, 999);

        filteredRecords = dispatchRecords.filter((record) => {
          // Use passengerDropTime for filtering (since this is lệnh trả khách report)
          const filterDate = record.passengerDropTime;
          if (!filterDate) return false;

          // Parse database time to Vietnam time for comparison
          const recordDate = parseDatabaseTimeForFilter(filterDate);
          if (!recordDate) return false; // Skip invalid dates

          const recordTime = recordDate.getTime();
          return recordTime >= fromTime && recordTime <= toTime;
        });
      }

      // Only show records that have passenger drop-off (lệnh trả khách)
      const returnOrderRecords = filteredRecords.filter(
        (record) => record.passengerDropTime
      );

      // Map to order data
      const result = returnOrderRecords.map((record) => ({
        plateNumber: record.vehiclePlateNumber || "-",
        orderCode: record.transportOrderCode || "-",
        departureStation: record.routeName || "-",
        orderType: record.route?.routeType || "-",
        plannedDepartureTime: record.plannedDepartureTime || "-",
        orderStatus: getStatusLabel(record.currentStatus, record.permitStatus),
      }));

      setData(result);
    } catch (error) {
      console.error("Failed to load order data:", error);
      toast.error("Không thể tải dữ liệu báo cáo");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (currentStatus: string, permitStatus?: string): string => {
    if (permitStatus === "approved") return "Đã duyệt";
    if (permitStatus === "rejected") return "Từ chối";
    if (permitStatus === "pending") return "Chờ duyệt";
    
    switch (currentStatus) {
      case "entered":
        return "Đã vào bến";
      case "passengers_dropped":
        return "Đã trả khách";
      case "permit_issued":
        return "Đã cấp phép";
      case "permit_rejected":
        return "Từ chối cấp phép";
      case "paid":
        return "Đã thanh toán";
      case "departure_ordered":
        return "Đã xuất lệnh";
      case "departed":
        return "Đã xuất bến";
      default:
        return currentStatus;
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> unsort
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        // Reset to unsort
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredData = useMemo(() => {
    let filtered = data.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.plateNumber.toLowerCase().includes(query) ||
          item.orderCode.toLowerCase().includes(query) ||
          item.departureStation.toLowerCase().includes(query) ||
          item.orderType.toLowerCase().includes(query)
        );
      }
      return true;
    });

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortColumn) {
          case "plateNumber":
            aValue = a.plateNumber || "";
            bValue = b.plateNumber || "";
            break;
          case "orderCode":
            aValue = a.orderCode || "";
            bValue = b.orderCode || "";
            break;
          case "departureStation":
            aValue = a.departureStation || "";
            bValue = b.departureStation || "";
            break;
          case "orderType":
            aValue = a.orderType || "";
            bValue = b.orderType || "";
            break;
          case "plannedDepartureTime":
            aValue = a.plannedDepartureTime !== "-" ? new Date(a.plannedDepartureTime).getTime() : 0;
            bValue = b.plannedDepartureTime !== "-" ? new Date(b.plannedDepartureTime).getTime() : 0;
            break;
          case "orderStatus":
            aValue = a.orderStatus || "";
            bValue = b.orderStatus || "";
            break;
          default:
            return 0;
        }

        // Handle string comparison
        if (typeof aValue === "string" && typeof bValue === "string") {
          const comparison = aValue.localeCompare(bValue, "vi", { numeric: true });
          return sortDirection === "asc" ? comparison : -comparison;
        }

        // Handle number comparison
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }

        // Handle mixed types (fallback)
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchQuery, sortColumn, sortDirection]);

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.warning("Không có dữ liệu để xuất Excel");
      return;
    }

    try {
      // Prepare data for Excel
      const excelData = filteredData.map((item, index) => ({
        "STT": index + 1,
        "Biển kiểm soát": item.plateNumber,
        "Mã lệnh": item.orderCode,
        "Bến đi": item.departureStation,
        "Loại lệnh": item.orderType,
        "Giờ XB kế hoạch": item.plannedDepartureTime !== "-"
          ? formatVietnamDateTime(item.plannedDepartureTime, "dd/MM/yyyy HH:mm")
          : "-",
        "Trạng thái lệnh": item.orderStatus,
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Theo dõi lệnh trả khách");

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 15 },  // Biển kiểm soát
        { wch: 15 },  // Mã lệnh
        { wch: 25 },  // Bến đi
        { wch: 15 },  // Loại lệnh
        { wch: 20 },  // Giờ XB kế hoạch
        { wch: 20 },  // Trạng thái lệnh
      ];
      ws['!cols'] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Bao-cao-theo-doi-lenh-tra-khach_${currentDate}.xlsx`;

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
                placeholder="Tìm kiếm biển số, mã lệnh, bến đi..."
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
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="text-center font-semibold">STT</TableHead>
                  <SortableTableHead
                    sortKey="plateNumber"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Biển kiểm soát
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="orderCode"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Mã lệnh
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="departureStation"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Bến đi
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="orderType"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Loại lệnh
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="plannedDepartureTime"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Giờ XB kế hoạch
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="orderStatus"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Trạng thái lệnh
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <TableRow key={`${item.plateNumber}-${item.orderCode}-${index}`}>
                      <TableCell className="text-center">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {item.plateNumber}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.orderCode}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.departureStation}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.orderType}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderTime(item.plannedDepartureTime)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.orderStatus}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

