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
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { dispatchService } from "@/services/dispatch.service";
import { operatorService } from "@/services/operator.service";
import type { DispatchRecord, Operator } from "@/types";
import { useUIStore } from "@/store/ui.store";
import { formatVietnamDateTime } from "@/lib/vietnam-time";
import { DatePickerRange } from "@/components/DatePickerRange";

export default function BaoCaoTheoDoiLenhXuatBen() {
  const setTitle = useUIStore((state) => state.setTitle);
  const [records, setRecords] = useState<DispatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setTitle("Báo cáo > Theo dõi lệnh xuất bến");
    loadRecords();
    loadOperators();
  }, [setTitle]);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const data = await dispatchService.getAll();
      // Lấy tất cả các lệnh có mã lệnh (transportOrderCode) hoặc đã có giờ XB kế hoạch
      const filtered = data.filter(
        (item) => item.transportOrderCode || item.plannedDepartureTime
      );
      setRecords(filtered);
    } catch (error) {
      console.error("Failed to load dispatch records:", error);
      toast.error("Không thể tải dữ liệu báo cáo");
    } finally {
      setIsLoading(false);
    }
  };

  const loadOperators = async () => {
    try {
      const data = await operatorService.getAll(true);
      setOperators(data);
    } catch (error) {
      console.error("Failed to load operators:", error);
    }
  };

  const getStatusLabel = (status?: string) => {
    const statusMap: Record<string, string> = {
      entered: "Đã vào bến",
      passengers_dropped: "Đã trả khách",
      permit_issued: "Đã cấp phép",
      permit_rejected: "Từ chối cấp phép",
      paid: "Đã thanh toán",
      departure_ordered: "Đã xuất lệnh",
      departed: "Đã xuất bến",
    };
    return statusMap[status || ""] || status || "-";
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

  const filteredRecords = useMemo(() => {
    let filtered = records.filter((item) => {
      // Full text search - search in plate number, order code, and route name
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const plateMatch = item.vehiclePlateNumber
          .toLowerCase()
          .includes(query);
        const orderCodeMatch = (item.transportOrderCode || "")
          .toLowerCase()
          .includes(query);
        const routeMatch = (item.routeName || "")
          .toLowerCase()
          .includes(query);
        matchesSearch = plateMatch || orderCodeMatch || routeMatch;
      }

      // Filter by operator
      let matchesOperator = true;
      if (selectedOperatorId) {
        matchesOperator = item.vehicle?.operatorId === selectedOperatorId;
      }

      // Filter by date range (using plannedDepartureTime)
      let matchesDate = true;
      if (dateRange?.from && dateRange?.to) {
        const filterDate = item.plannedDepartureTime;
        if (filterDate) {
          const itemDate = new Date(filterDate);
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          matchesDate = itemDate >= fromDate && itemDate <= toDate;
        } else {
          matchesDate = false;
        }
      } else if (dateRange?.from) {
        const filterDate = item.plannedDepartureTime;
        if (filterDate) {
          const itemDate = new Date(filterDate);
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          matchesDate = itemDate >= fromDate;
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesOperator && matchesDate;
    });

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortColumn) {
          case "vehiclePlateNumber":
            aValue = a.vehiclePlateNumber || "";
            bValue = b.vehiclePlateNumber || "";
            break;
          case "transportOrderCode":
            aValue = a.transportOrderCode || a.id.substring(0, 8) || "";
            bValue = b.transportOrderCode || b.id.substring(0, 8) || "";
            break;
          case "destination":
            aValue = a.route?.destination?.name || "";
            bValue = b.route?.destination?.name || "";
            break;
          case "routeType":
            aValue = a.route?.routeType || "";
            bValue = b.route?.routeType || "";
            break;
          case "plannedDepartureTime":
            aValue = a.plannedDepartureTime ? new Date(a.plannedDepartureTime).getTime() : 0;
            bValue = b.plannedDepartureTime ? new Date(b.plannedDepartureTime).getTime() : 0;
            break;
          case "passengerDropTime":
            aValue = a.passengerDropTime ? new Date(a.passengerDropTime).getTime() : 0;
            bValue = b.passengerDropTime ? new Date(b.passengerDropTime).getTime() : 0;
            break;
          case "currentStatus":
            aValue = getStatusLabel(a.currentStatus);
            bValue = getStatusLabel(b.currentStatus);
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
  }, [records, searchQuery, dateRange, selectedOperatorId, sortColumn, sortDirection]);

  const renderTime = (value?: string) =>
    value ? formatVietnamDateTime(value) : "-";

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      toast.warning("Không có dữ liệu để xuất Excel");
      return;
    }

    try {
      // Prepare data for Excel
      const excelData = filteredRecords.map((item, index) => ({
        "STT": index + 1,
        "Biển kiểm soát": item.vehiclePlateNumber || "-",
        "Mã lệnh": item.transportOrderCode || item.id.substring(0, 8) || "-",
        "Bến đến": item.route?.destination?.name || "-",
        "Loại lệnh": item.route?.routeType || "-",
        "Giờ XB kế hoạch": item.plannedDepartureTime
          ? format(new Date(item.plannedDepartureTime), "dd/MM/yyyy HH:mm")
          : "-",
        "Giờ xác nhận trả khách": item.passengerDropTime
          ? format(new Date(item.passengerDropTime), "dd/MM/yyyy HH:mm")
          : "-",
        "Trạng thái lệnh": getStatusLabel(item.currentStatus),
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Theo dõi lệnh xuất bến");

      // Set column widths
      const colWidths = [
        { wch: 5 }, // STT
        { wch: 15 }, // Biển kiểm soát
        { wch: 18 }, // Mã lệnh
        { wch: 25 }, // Bến đến
        { wch: 15 }, // Loại lệnh
        { wch: 20 }, // Giờ XB kế hoạch
        { wch: 25 }, // Giờ xác nhận trả khách
        { wch: 20 }, // Trạng thái lệnh
      ];
      ws["!cols"] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Theo-doi-lenh-xuat-ben_${currentDate}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      toast.success(`Đã xuất Excel thành công: ${filename}`);
    } catch (error) {
      console.error("Failed to export Excel:", error);
      toast.error("Không thể xuất Excel. Vui lòng thử lại sau.");
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
              disabled={isLoading || filteredRecords.length === 0}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Xuất Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRecords}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Tìm kiếm biển số, mã lệnh, tuyến..."
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
            <div className="space-y-0">
              <Select
                id="operator"
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
              >
                <option value="">Chọn doanh nghiệp vận tải</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    sortKey="vehiclePlateNumber"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Biển kiểm soát
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="transportOrderCode"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Mã lệnh
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="destination"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Bến đến
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="routeType"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Loại lệnh
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="plannedDepartureTime"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Giờ XB kế hoạch
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="passengerDropTime"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Giờ xác nhận trả khách
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="currentStatus"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
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
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredRecords.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-semibold">
                          {item.vehiclePlateNumber || "-"}
                        </TableCell>
                        <TableCell>
                          {item.transportOrderCode ||
                            item.id.substring(0, 8) ||
                            "-"}
                        </TableCell>
                        <TableCell>
                          {item.route?.destination?.name || "-"}
                        </TableCell>
                        <TableCell>{item.route?.routeType || "-"}</TableCell>
                        <TableCell>
                          {renderTime(item.plannedDepartureTime)}
                        </TableCell>
                        <TableCell>
                          {renderTime(item.passengerDropTime)}
                        </TableCell>
                        <TableCell>
                          {getStatusLabel(item.currentStatus)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell>
                        {`Tổng: ${filteredRecords.length} lệnh`}
                      </TableCell>
                      <TableCell colSpan={6}></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

