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
import { vehicleService } from "@/services/vehicle.service";
import { useUIStore } from "@/store/ui.store";
import { DatePickerRange } from "@/components/DatePickerRange";
import { formatVietnamDateTime } from "@/lib/vietnam-time";

interface ReplacementVehicleData {
  plateNumber: string;
  replacementPlateNumber: string;
  operatorName: string;
  routeName: string;
  replacementCount: number;
  replacementDate: string;
}

export default function BaoCaoXeDiThay() {
  const setTitle = useUIStore((state) => state.setTitle);
  const [data, setData] = useState<ReplacementVehicleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setTitle("Báo cáo > Xe đi thay");
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
      
      // Load all vehicles to get plate numbers
      const vehicles = await vehicleService.getAll();
      const vehicleMap = new Map(vehicles.map(v => [v.id, v.plateNumber]));
      
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

      // Group by vehicle and find replacement vehicles from metadata
      const replacementMap = new Map<string, {
        plateNumber: string;
        operatorName: string;
        routeName: string;
        replacements: Array<{ replacementPlate: string; date: string }>;
      }>();

      filteredRecords.forEach((record) => {
        const plateNumber = record.vehiclePlateNumber || "-";
        const operatorName = record.vehicle?.operator?.name || "-";
        const routeName = record.routeName || "-";

        // Check if record has replacement vehicle info in metadata
        const metadata = (record.metadata || {}) as Record<string, unknown>;
        const replacementVehicleId = metadata.replacementVehicleId as string | undefined;
        const replacementDate = record.entryTime || record.createdAt || "";
        
        if (replacementVehicleId) {
          const replacementPlate = vehicleMap.get(replacementVehicleId) || "-";
          
          if (!replacementMap.has(plateNumber)) {
            replacementMap.set(plateNumber, {
              plateNumber,
              operatorName,
              routeName,
              replacements: [],
            });
          }
          
          const vehicleData = replacementMap.get(plateNumber)!;
          vehicleData.replacements.push({
            replacementPlate,
            date: replacementDate,
          });
        }
      });

      // Convert to report data format
      const result: ReplacementVehicleData[] = [];
      
      replacementMap.forEach((vehicleData) => {
        // Group replacements by replacement vehicle
        const replacementCountMap = new Map<string, number>();
        const replacementDateMap = new Map<string, string>();
        
        vehicleData.replacements.forEach((rep) => {
          const count = replacementCountMap.get(rep.replacementPlate) || 0;
          replacementCountMap.set(rep.replacementPlate, count + 1);
          
          // Keep the most recent date
          const existingDate = replacementDateMap.get(rep.replacementPlate);
          if (!existingDate || new Date(rep.date) > new Date(existingDate)) {
            replacementDateMap.set(rep.replacementPlate, rep.date);
          }
        });
        
        // Create entries for each replacement vehicle
        replacementCountMap.forEach((count, replacementPlate) => {
          result.push({
            plateNumber: vehicleData.plateNumber,
            replacementPlateNumber: replacementPlate,
            operatorName: vehicleData.operatorName,
            routeName: vehicleData.routeName,
            replacementCount: count,
            replacementDate: replacementDateMap.get(replacementPlate) || "",
          });
        });
      });

      // If no replacement data found, show empty or try alternative approach
      // For now, we'll show empty if no data
      setData(result);
    } catch (error) {
      console.error("Failed to load replacement vehicle data:", error);
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
    let filtered = data.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.plateNumber.toLowerCase().includes(query) ||
          item.replacementPlateNumber.toLowerCase().includes(query) ||
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
          case "replacementPlateNumber":
            aValue = a.replacementPlateNumber || "";
            bValue = b.replacementPlateNumber || "";
            break;
          case "operatorName":
            aValue = a.operatorName || "";
            bValue = b.operatorName || "";
            break;
          case "routeName":
            aValue = a.routeName || "";
            bValue = b.routeName || "";
            break;
          case "replacementCount":
            aValue = a.replacementCount || 0;
            bValue = b.replacementCount || 0;
            break;
          case "replacementDate":
            aValue = a.replacementDate !== "" ? new Date(a.replacementDate).getTime() : 0;
            bValue = b.replacementDate !== "" ? new Date(b.replacementDate).getTime() : 0;
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
        "Biển số xe đi thay": item.replacementPlateNumber,
        "Tên đơn vị": item.operatorName,
        "Tên luồng tuyến": item.routeName,
        "Số lần đi thay": item.replacementCount,
        "Ngày đi thay": item.replacementDate !== ""
          ? format(new Date(item.replacementDate), "dd/MM/yyyy HH:mm")
          : "-",
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Xe đi thay");

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 15 },  // Biển số
        { wch: 20 },  // Biển số xe đi thay
        { wch: 25 },  // Tên đơn vị
        { wch: 25 },  // Tên luồng tuyến
        { wch: 15 },  // Số lần đi thay
        { wch: 20 },  // Ngày đi thay
      ];
      ws['!cols'] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Bao-cao-xe-di-thay_${currentDate}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Đã xuất Excel thành công: ${filename}`);
    } catch (error) {
      console.error("Failed to export Excel:", error);
      toast.error("Không thể xuất Excel. Vui lòng thử lại sau.");
    }
  };

  const renderDate = (value: string) => {
    if (value === "" || !value) return "-";
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
                    sortKey="replacementPlateNumber"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Biển số xe đi thay
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
                    sortKey="replacementCount"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Số lần đi thay
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="replacementDate"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center font-semibold"
                  >
                    Ngày đi thay
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
                    <TableRow key={`${item.plateNumber}-${item.replacementPlateNumber}-${index}`}>
                      <TableCell className="text-center">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {item.plateNumber}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-blue-600">
                        {item.replacementPlateNumber}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.operatorName}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.routeName}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.replacementCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderDate(item.replacementDate)}
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

