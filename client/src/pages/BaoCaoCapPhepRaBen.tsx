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

interface PermitData {
  plateNumber: string;
  operatorName: string;
  routeName: string;
  entryTime: string;
  permitTime: string;
  permitBy: string;
  exitTime: string;
}

export default function BaoCaoCapPhepRaBen() {
  const setTitle = useUIStore((state: any) => state.setTitle);
  const [data, setData] = useState<PermitData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setTitle("Báo cáo > Cấp phép ra bến");
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
          // Filter by permit time if available, otherwise by entry time
          const filterDate = record.boardingPermitTime || record.entryTime;
          if (filterDate) {
            const recordDate = new Date(filterDate);
            return recordDate >= fromDate && recordDate <= toDate;
          }
          return false;
        });
      }

      // Only show records that have been issued a permit (approved)
      const permitRecords = filteredRecords.filter(
        (record) => record.boardingPermitTime && record.permitStatus === "approved"
      );

      // Map to permit data
      const result = permitRecords.map((record) => ({
        plateNumber: record.vehiclePlateNumber || "-",
        operatorName: record.vehicle?.operator?.name || "-",
        routeName: record.routeName || "-",
        entryTime: record.entryTime || "-",
        permitTime: record.boardingPermitTime || "-",
        permitBy: record.boardingPermitBy || "-",
        exitTime: record.exitTime || "-",
      }));

      setData(result);
    } catch (error) {
      console.error("Failed to load permit data:", error);
      toast.error("Không thể tải dữ liệu báo cáo");
    } finally {
      setIsLoading(false);
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
    let filtered = data.filter((item: any) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.plateNumber.toLowerCase().includes(query) ||
          item.operatorName.toLowerCase().includes(query) ||
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
          case "routeName":
            aValue = a.routeName || "";
            bValue = b.routeName || "";
            break;
          case "entryTime":
            aValue = a.entryTime !== "-" ? new Date(a.entryTime).getTime() : 0;
            bValue = b.entryTime !== "-" ? new Date(b.entryTime).getTime() : 0;
            break;
          case "permitTime":
            aValue = a.permitTime !== "-" ? new Date(a.permitTime).getTime() : 0;
            bValue = b.permitTime !== "-" ? new Date(b.permitTime).getTime() : 0;
            break;
          case "permitBy":
            aValue = a.permitBy || "";
            bValue = b.permitBy || "";
            break;
          case "exitTime":
            aValue = a.exitTime !== "-" ? new Date(a.exitTime).getTime() : 0;
            bValue = b.exitTime !== "-" ? new Date(b.exitTime).getTime() : 0;
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
      const excelData = filteredData.map((item: any, index: number) => ({
        "STT": index + 1,
        "Biển số": item.plateNumber,
        "Tên đơn vị": item.operatorName,
        "Tên luồng tuyến": item.routeName,
        "Thời gian vào bến": item.entryTime !== "-" 
          ? format(new Date(item.entryTime), "dd/MM/yyyy HH:mm") 
          : "-",
        "Thời gian cấp phép ra bến": item.permitTime !== "-"
          ? format(new Date(item.permitTime), "dd/MM/yyyy HH:mm")
          : "-",
        "Người cấp phép ra bến": item.permitBy,
        "Thời gian ra bến": item.exitTime !== "-"
          ? format(new Date(item.exitTime), "dd/MM/yyyy HH:mm")
          : "-",
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cấp phép ra bến");

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 15 },  // Biển số
        { wch: 25 },  // Tên đơn vị
        { wch: 25 },  // Tên luồng tuyến
        { wch: 20 },  // Thời gian vào bến
        { wch: 25 },  // Thời gian cấp phép ra bến
        { wch: 25 },  // Người cấp phép ra bến
        { wch: 20 },  // Thời gian ra bến
      ];
      ws['!cols'] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Bao-cao-cap-phep-ra-ben_${currentDate}.xlsx`;

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
                placeholder="Tìm kiếm biển số, đơn vị, tuyến..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
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
                    sortKey="permitTime"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Thời gian cấp phép ra bến
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="permitBy"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Người cấp phép ra bến
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="exitTime"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Thời gian ra bến
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item: any, index: number) => (
                    <TableRow key={`${item.plateNumber}-${item.permitTime}-${index}`}>
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
                        {item.routeName}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderTime(item.entryTime)}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderTime(item.permitTime)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.permitBy}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderTime(item.exitTime)}
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

