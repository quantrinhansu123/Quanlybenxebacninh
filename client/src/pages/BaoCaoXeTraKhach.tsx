import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { RefreshCw, Search, FileSpreadsheet, ArrowLeft } from "lucide-react";
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

export default function BaoCaoXeTraKhach() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setTitle = useUIStore((state) => state.setTitle);
  const [records, setRecords] = useState<DispatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Get vehicle plate number and return path from URL params
  const vehiclePlateNumberFilter = searchParams.get("vehiclePlateNumber") || "";
  const returnTo = searchParams.get("returnTo") || "";

  useEffect(() => {
    if (vehiclePlateNumberFilter) {
      setTitle(`Báo cáo xe trả khách của ${vehiclePlateNumberFilter}`);
    } else {
      setTitle("Báo cáo > Xe trả khách");
    }
    loadRecords();
    loadOperators();
  }, [setTitle, vehiclePlateNumberFilter]);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const data = await dispatchService.getAll();
      // Chỉ lấy các xe đã trả khách
      const filtered = data.filter((item) =>
        item.currentStatus === "passengers_dropped"
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
      // Filter by vehicle plate number if provided in URL params
      let matchesVehicle = true;
      if (vehiclePlateNumberFilter) {
        matchesVehicle = item.vehiclePlateNumber?.toLowerCase() === vehiclePlateNumberFilter.toLowerCase();
      }
      
      // Full text search - search in both plate number and route name
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const plateMatch = item.vehiclePlateNumber
          .toLowerCase()
          .includes(query);
        const routeMatch = (item.routeName || "")
          .toLowerCase()
          .includes(query);
        matchesSearch = plateMatch || routeMatch;
      }
      
      // Filter by operator
      let matchesOperator = true;
      if (selectedOperatorId) {
        matchesOperator = item.vehicle?.operatorId === selectedOperatorId;
      }
      
      // Filter by date range (using passengerDropTime)
      let matchesDate = true;
      if (dateRange?.from && dateRange?.to) {
        const filterDate = item.passengerDropTime;
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
        const filterDate = item.passengerDropTime;
        if (filterDate) {
          const itemDate = new Date(filterDate);
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          matchesDate = itemDate >= fromDate;
        } else {
          matchesDate = false;
        }
      }
      
      return matchesVehicle && matchesSearch && matchesOperator && matchesDate;
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
          case "operatorName":
            aValue = a.vehicle?.operator?.name || "";
            bValue = b.vehicle?.operator?.name || "";
            break;
          case "routeName":
            aValue = a.routeName || "";
            bValue = b.routeName || "";
            break;
          case "routeType":
            aValue = a.route?.routeType || "";
            bValue = b.route?.routeType || "";
            break;
          case "passengerDropBy":
            aValue = a.passengerDropBy || "";
            bValue = b.passengerDropBy || "";
            break;
          case "passengerDropTime":
            aValue = a.passengerDropTime ? new Date(a.passengerDropTime).getTime() : 0;
            bValue = b.passengerDropTime ? new Date(b.passengerDropTime).getTime() : 0;
            break;
          case "passengersArrived":
            aValue = a.passengersArrived ?? a.seatCount ?? 0;
            bValue = b.passengersArrived ?? b.seatCount ?? 0;
            break;
          case "permitStatus":
            aValue = a.permitStatus === "approved" ? "Đã ký" : a.permitStatus === "rejected" ? "Từ chối" : "-";
            bValue = b.permitStatus === "approved" ? "Đã ký" : b.permitStatus === "rejected" ? "Từ chối" : "-";
            break;
          case "syncStatus":
            const aMetadata = (a.metadata || {}) as Record<string, unknown>;
            const bMetadata = (b.metadata || {}) as Record<string, unknown>;
            aValue = String(aMetadata.syncStatus || (aMetadata.syncTime ? "Đã đồng bộ" : "Chưa đồng bộ"));
            bValue = String(bMetadata.syncStatus || (bMetadata.syncTime ? "Đã đồng bộ" : "Chưa đồng bộ"));
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
  }, [records, searchQuery, dateRange, selectedOperatorId, sortColumn, sortDirection, vehiclePlateNumberFilter]);

  const renderTime = (value?: string) => (value ? formatVietnamDateTime(value) : "-");

  const totalPassengers = useMemo(() => {
    return filteredRecords.reduce((sum, item) => {
      const value = item.passengersArrived ?? item.seatCount;
      if (typeof value === "number") {
        return sum + value;
      }
      return sum;
    }, 0);
  }, [filteredRecords]);

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      toast.warning("Không có dữ liệu để xuất Excel");
      return;
    }

    try {
      // Prepare data for Excel
      const excelData = filteredRecords.map((item, index) => {
        const itemMetadata = (item.metadata || {}) as Record<string, unknown>;
        return {
          "STT": index + 1,
          "Biển số": item.vehiclePlateNumber || "-",
          "Biển số khi vào": item.vehiclePlateNumber || "-",
          "Mã lệnh trả khách": item.transportOrderCode || item.id.substring(0, 8) || "-",
          "Tên đơn vị": item.vehicle?.operator?.name || "-",
          "Tên luồng tuyến": item.routeName || "-",
          "Loại tuyến": "-",
          "Người xác nhận trả khách": item.passengerDropBy || "-",
          "Thời gian trả khách": item.passengerDropTime ? format(new Date(item.passengerDropTime), "dd/MM/yyyy HH:mm") : "-",
          "Số khách": item.passengersArrived ?? item.seatCount ?? "-",
          "Trạng thái ký lệnh vận chuyển": item.permitStatus === "approved" ? "Đã ký" : item.permitStatus === "rejected" ? "Từ chối" : "-",
          "Trạng thái đồng bộ dữ liệu": String(itemMetadata.syncStatus || (itemMetadata.syncTime ? "Đã đồng bộ" : "Chưa đồng bộ")),
        };
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Báo cáo xe trả khách");

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 15 },  // Biển số
        { wch: 15 },  // Biển số khi vào
        { wch: 18 },  // Mã lệnh trả khách
        { wch: 25 },  // Tên đơn vị
        { wch: 25 },  // Tên luồng tuyến
        { wch: 15 },  // Loại tuyến
        { wch: 25 },  // Người xác nhận trả khách
        { wch: 20 },  // Thời gian trả khách
        { wch: 10 },  // Số khách
        { wch: 25 },  // Trạng thái ký lệnh vận chuyển
        { wch: 20 },  // Trạng thái đồng bộ dữ liệu
      ];
      ws['!cols'] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Bao-cao-xe-tra-khach_${currentDate}.xlsx`;

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
                placeholder="Tìm kiếm biển số xe, luồng tuyến..."
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
                    Biển số
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="vehiclePlateNumber"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Biển số khi vào
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="transportOrderCode"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Mã lệnh trả khách
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="operatorName"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Tên đơn vị
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="routeName"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Tên luồng tuyến
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="routeType"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Loại tuyến
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="passengerDropBy"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Người xác nhận trả khách
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="passengerDropTime"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Thời gian trả khách
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="passengersArrived"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Số khách
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="permitStatus"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Trạng thái ký lệnh vận chuyển
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="syncStatus"
                    currentSortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Trạng thái đồng bộ dữ liệu
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-gray-500">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-gray-500">
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
                          {item.vehiclePlateNumber || "-"}
                        </TableCell>
                        <TableCell>
                          {item.transportOrderCode || item.id.substring(0, 8) || "-"}
                        </TableCell>
                        <TableCell>
                          {item.vehicle?.operator?.name || "-"}
                        </TableCell>
                        <TableCell>{item.routeName || "-"}</TableCell>
                        <TableCell>
                          {item.route?.routeType || "-"}
                        </TableCell>
                        <TableCell>{item.passengerDropBy || "-"}</TableCell>
                        <TableCell>{renderTime(item.passengerDropTime)}</TableCell>
                        <TableCell>
                          {item.passengersArrived ?? item.seatCount ?? "-"}
                        </TableCell>
                        <TableCell>
                          {item.permitStatus === "approved" ? "Đã ký" :
                           item.permitStatus === "rejected" ? "Từ chối" : "-"}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const meta = (item.metadata || {}) as Record<string, unknown>;
                            return String(meta.syncStatus || (meta.syncTime ? "Đã đồng bộ" : "Chưa đồng bộ"));
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell>
                        {`Tổng: ${filteredRecords.length} xe`}
                      </TableCell>
                      <TableCell colSpan={7}></TableCell>
                      <TableCell>
                        {totalPassengers > 0 ? totalPassengers : "-"}
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
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

