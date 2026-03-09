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
import { formatVietnamDateTime } from "@/lib/vietnam-time";

interface VehicleLogData {
  plateNumber: string;
  operatorName: string;
  orderCode: string;
  routeName: string;
  entryTime: string;
  entryBy: string;
  permitStatus: string;
  syncStatus: string;
}

export default function BaoCaoNhatTrinhXe() {
  const setTitle = useUIStore((state) => state.setTitle);
  const [data, setData] = useState<VehicleLogData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setTitle("Báo cáo > Nhật trình xe");
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

      // Map to vehicle log data
      const result = filteredRecords.map((record) => ({
        plateNumber: record.vehiclePlateNumber || "-",
        operatorName: record.vehicle?.operator?.name || "-",
        orderCode: record.transportOrderCode || "-",
        routeName: record.routeName || "-",
        entryTime: record.entryTime || "-",
        entryBy: record.entryBy || "-",
        permitStatus: getPermitStatusLabel(record.permitStatus),
        syncStatus: getSyncStatus(record),
      }));

      setData(result);
    } catch (error) {
      console.error("Failed to load vehicle log data:", error);
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
    // Check if data has been synced based on metadata or other indicators
    // For now, we'll use a simple logic: if the record has been updated recently and has key fields filled
    if (record.metadata?.synced === true) {
      return "Đã đồng bộ";
    }
    
    // If record has transport order code and permit status, consider it synced
    if (record.transportOrderCode && record.permitStatus === "approved") {
      return "Đã đồng bộ";
    }
    
    // If record has been updated recently (within last hour), consider it syncing
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
          item.operatorName.toLowerCase().includes(query) ||
          item.orderCode.toLowerCase().includes(query) ||
          item.routeName.toLowerCase().includes(query)
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
          case "operatorName":
            aValue = a.operatorName || "";
            bValue = b.operatorName || "";
            break;
          case "orderCode":
            aValue = a.orderCode || "";
            bValue = b.orderCode || "";
            break;
          case "routeName":
            aValue = a.routeName || "";
            bValue = b.routeName || "";
            break;
          case "entryTime":
            aValue = a.entryTime !== "-" ? new Date(a.entryTime).getTime() : 0;
            bValue = b.entryTime !== "-" ? new Date(b.entryTime).getTime() : 0;
            break;
          case "entryBy":
            aValue = a.entryBy || "";
            bValue = b.entryBy || "";
            break;
          case "permitStatus":
            aValue = a.permitStatus || "";
            bValue = b.permitStatus || "";
            break;
          case "syncStatus":
            aValue = a.syncStatus || "";
            bValue = b.syncStatus || "";
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
        "Biển số": item.plateNumber,
        "Tên đơn vị": item.operatorName,
        "Mã lệnh xuất bến": item.orderCode,
        "Tên luồng tuyến": item.routeName,
        "Thời gian vào bến": item.entryTime !== "-"
          ? format(new Date(item.entryTime), "dd/MM/yyyy HH:mm")
          : "-",
        "Người cho xe vào bến": item.entryBy,
        "Trạng thái ký lệnh vận chuyển": item.permitStatus,
        "Trạng thái đồng bộ dữ liệu": item.syncStatus,
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Nhật trình xe");

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 15 },  // Biển số
        { wch: 25 },  // Tên đơn vị
        { wch: 20 },  // Mã lệnh xuất bến
        { wch: 25 },  // Tên luồng tuyến
        { wch: 20 },  // Thời gian vào bến
        { wch: 25 },  // Người cho xe vào bến
        { wch: 25 },  // Trạng thái ký lệnh vận chuyển
        { wch: 25 },  // Trạng thái đồng bộ dữ liệu
      ];
      ws['!cols'] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Bao-cao-nhat-trinh-xe_${currentDate}.xlsx`;

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
                placeholder="Tìm kiếm biển số, đơn vị, mã lệnh, tuyến..."
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
                    Biển số
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="operatorName"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Tên đơn vị
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="orderCode"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Mã lệnh xuất bến
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="routeName"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Tên luồng tuyến
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="entryTime"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Thời gian vào bến
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="entryBy"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Người cho xe vào bến
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="permitStatus"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Trạng thái ký lệnh vận chuyển
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="syncStatus"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Trạng thái đồng bộ dữ liệu
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <TableRow key={`${item.plateNumber}-${item.entryTime}-${index}`}>
                      <TableCell className="text-center">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {item.plateNumber}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.operatorName}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.orderCode}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.routeName}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderTime(item.entryTime)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.entryBy}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.permitStatus}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.syncStatus}
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

