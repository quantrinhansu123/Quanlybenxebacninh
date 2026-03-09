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
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { dispatchService } from "@/services/dispatch.service";
import { operatorService } from "@/services/operator.service";
import type { DispatchRecord, DispatchStatus, Operator } from "@/types";
import { useUIStore } from "@/store/ui.store";
import { formatVietnamDateTime } from "@/lib/vietnam-time";
import { DatePickerRange } from "@/components/DatePickerRange";

const statusLabelMap: Record<DispatchStatus, string> = {
  entered: "Đã vào bến",
  passengers_dropped: "Đã trả khách",
  permit_issued: "Đã cấp phép",
  permit_rejected: "Từ chối phép",
  paid: "Đã thanh toán",
  departure_ordered: "Đã cấp lệnh",
  departed: "Đã xuất bến",
  cancelled: "Đã hủy",
};

export default function XeKhongDuDieuKien() {
  const setTitle = useUIStore((state) => state.setTitle);
  const [records, setRecords] = useState<DispatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");

  useEffect(() => {
    setTitle("Truyền tải > Xe không đủ điều kiện");
    loadRecords();
    loadOperators();
  }, [setTitle]);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const data = await dispatchService.getAll();
      
      // Filter to only show TODAY's records
      // This allows multiple trips per vehicle in a single day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayRecords = data.filter(record => {
        const entryTime = new Date(record.entryTime);
        return entryTime >= today && entryTime < tomorrow;
      });
      
      // Chỉ lấy các xe bị từ chối phép (không đủ điều kiện)
      const filtered = todayRecords.filter((item) =>
        item.currentStatus === "permit_rejected"
      );
      setRecords(filtered);
    } catch (error) {
      console.error("Failed to load dispatch records:", error);
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

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
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
      
      // Filter by date range (using entryTime)
      let matchesDate = true;
      if (dateRange?.from && dateRange?.to) {
        const filterDate = item.entryTime;
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
        const filterDate = item.entryTime;
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
  }, [records, searchQuery, dateRange, selectedOperatorId]);

  const renderTime = (value?: string) => (value ? formatVietnamDateTime(value) : "-");

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      toast.warning("Không có dữ liệu để xuất Excel");
      return;
    }

    try {
      // Prepare data for Excel
      const excelData = filteredRecords.map((item, index) => {
        const itemMetadata = (item.metadata || {}) as Record<string, unknown>;
        const syncTimeStr = itemMetadata.syncTime as string | undefined;
        return {
          "STT": index + 1,
          "Biển số xe": item.vehiclePlateNumber || "-",
          "Tên luồng tuyến": item.routeName || "-",
          "Thời gian vào bến": item.entryTime ? format(new Date(item.entryTime), "dd/MM/yyyy HH:mm") : "-",
          "Giờ XB kế hoạch": item.plannedDepartureTime ? format(new Date(item.plannedDepartureTime), "dd/MM/yyyy HH:mm") : "-",
          "Giờ cấp phép lên nốt": item.boardingPermitTime ? format(new Date(item.boardingPermitTime), "dd/MM/yyyy HH:mm") : "-",
          "Người cấp lệnh": item.departureOrderBy || item.boardingPermitBy || "-",
          "Số khách": item.passengersDeparting ?? item.passengersArrived ?? item.seatCount ?? "-",
          "Thời gian ra bến": item.exitTime ? format(new Date(item.exitTime), "dd/MM/yyyy HH:mm") : "-",
          "Thời gian đồng bộ": syncTimeStr ? format(new Date(syncTimeStr), "dd/MM/yyyy HH:mm") : "-",
          "Người đồng bộ dữ liệu": String(itemMetadata.syncBy || "-"),
          "Thông tin đồng bộ dữ liệu": String(itemMetadata.syncInfo || "-"),
          "Trạng thái": statusLabelMap[item.currentStatus] || item.currentStatus || "-",
        };
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Xe không đủ điều kiện");

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 15 },  // Biển số xe
        { wch: 25 },  // Tên luồng tuyến
        { wch: 20 },  // Thời gian vào bến
        { wch: 20 },  // Giờ XB kế hoạch
        { wch: 20 },  // Giờ cấp phép lên nốt
        { wch: 20 },  // Người cấp lệnh
        { wch: 10 },  // Số khách
        { wch: 20 },  // Thời gian ra bến
        { wch: 20 },  // Thời gian đồng bộ
        { wch: 20 },  // Người đồng bộ dữ liệu
        { wch: 25 },  // Thông tin đồng bộ dữ liệu
        { wch: 15 },  // Trạng thái
      ];
      ws['!cols'] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Xe-khong-du-dieu-kien_${currentDate}.xlsx`;

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
                  <TableHead>Biển số xe</TableHead>
                  <TableHead>Tên luồng tuyến</TableHead>
                  <TableHead>Thời gian vào bến</TableHead>
                  <TableHead>Giờ XB kế hoạch</TableHead>
                  <TableHead>Giờ cấp phép lên nốt</TableHead>
                  <TableHead>Người cấp lệnh</TableHead>
                  <TableHead>Số khách</TableHead>
                  <TableHead>Thời gian ra bến</TableHead>
                  <TableHead>Thời gian đồng bộ</TableHead>
                  <TableHead>Người đồng bộ dữ liệu</TableHead>
                  <TableHead>Thông tin đồng bộ dữ liệu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-gray-500">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-gray-500">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredRecords.map((item) => {
                      const meta = (item.metadata || {}) as Record<string, unknown>;
                      const syncTimeStr = meta.syncTime as string | undefined;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-semibold">
                            {item.vehiclePlateNumber || "-"}
                          </TableCell>
                          <TableCell>{item.routeName || "-"}</TableCell>
                          <TableCell>{renderTime(item.entryTime)}</TableCell>
                          <TableCell>{renderTime(item.plannedDepartureTime)}</TableCell>
                          <TableCell>{renderTime(item.boardingPermitTime)}</TableCell>
                          <TableCell>
                            {item.departureOrderBy || item.boardingPermitBy || "-"}
                          </TableCell>
                          <TableCell>
                            {item.passengersDeparting ??
                              item.passengersArrived ??
                              item.seatCount ??
                              "-"}
                          </TableCell>
                          <TableCell>{renderTime(item.exitTime)}</TableCell>
                          <TableCell>{renderTime(syncTimeStr)}</TableCell>
                          <TableCell>{String(meta.syncBy || "-")}</TableCell>
                          <TableCell>{String(meta.syncInfo || "-")}</TableCell>
                          <TableCell>
                            {statusLabelMap[item.currentStatus] || item.currentStatus || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell colSpan={12}>{`Tổng: ${filteredRecords.length} xe`}</TableCell>
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

