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
import { useUIStore } from "@/store/ui.store";
import { DatePickerRange } from "@/components/DatePickerRange";
import { parseDatabaseTimeForFilter, formatVietnamDateTime } from "@/lib/vietnam-time";

interface RouteSummaryData {
  date: string; // Ngày
  routeName: string;
  routeType: string;
  plateNumber: string;
  seatCount: number;
  plannedTrips: number;
  actualTrips: number;
  tripRatio: number;
  plannedPassengers: number;
  actualPassengers: number;
  passengerRatio: number;
}

export default function BaoCaoTongHopTuyen() {
  const setTitle = useUIStore((state) => state.setTitle);
  const [data, setData] = useState<RouteSummaryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedRouteType, setSelectedRouteType] = useState<string>("");

  useEffect(() => {
    setTitle("Báo cáo > Báo cáo tổng hợp tuyến");
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
        const fromTime = new Date(dateRange.from).setHours(0, 0, 0, 0);
        const toTime = new Date(dateRange.to).setHours(23, 59, 59, 999);

        filteredRecords = dispatchRecords.filter((record) => {
          const recordDate = parseDatabaseTimeForFilter(record.entryTime);
          if (!recordDate) return false;
          const recordTime = recordDate.getTime();
          return recordTime >= fromTime && recordTime <= toTime;
        });
      }

      // Group by date, route and vehicle
      const grouped = new Map<string, RouteSummaryData>();

      filteredRecords.forEach((record) => {
        // Get date from entryTime
        const recordDate = parseDatabaseTimeForFilter(record.entryTime);
        const dateStr = recordDate ? formatVietnamDateTime(record.entryTime, "dd/MM/yyyy") : "-";

        const key = `${dateStr}-${record.routeId}-${record.vehicleId}`;
        const routeName = record.routeName || "-";
        const routeType = record.route?.routeType || "-";
        const plateNumber = record.vehiclePlateNumber || "-";
        const seatCount = record.vehicle?.seatCapacity || record.seatCount || 0;

        if (!grouped.has(key)) {
          grouped.set(key, {
            date: dateStr,
            routeName,
            routeType,
            plateNumber,
            seatCount,
            plannedTrips: 0,
            actualTrips: 0,
            tripRatio: 0,
            plannedPassengers: 0,
            actualPassengers: 0,
            passengerRatio: 0,
          });
        }
        
        const item = grouped.get(key)!;
        
        // Count actual trips (departed records)
        if (record.currentStatus === "departed") {
          item.actualTrips += 1;
          item.actualPassengers += record.passengersDeparting || 0;
        }
        
        // For planned trips, we'll use a simple calculation
        // In a real scenario, this would come from schedules
        item.plannedTrips = Math.max(item.plannedTrips, item.actualTrips);
        item.plannedPassengers = Math.max(
          item.plannedPassengers,
          item.plannedTrips * seatCount
        );
      });
      
      // Calculate ratios
      const result = Array.from(grouped.values()).map((item) => ({
        ...item,
        tripRatio: item.plannedTrips > 0 
          ? Math.round((item.actualTrips / item.plannedTrips) * 100) 
          : 0,
        passengerRatio: item.plannedPassengers > 0
          ? Math.round((item.actualPassengers / item.plannedPassengers) * 100)
          : 0,
      }));
      
      setData(result);
    } catch (error) {
      console.error("Failed to load route summary data:", error);
      toast.error("Không thể tải dữ liệu báo cáo");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search filter
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        matchesSearch =
          item.date.toLowerCase().includes(query) ||
          item.routeName.toLowerCase().includes(query) ||
          item.plateNumber.toLowerCase().includes(query) ||
          item.routeType.toLowerCase().includes(query);
      }
      
      // Route type filter
      let matchesRouteType = true;
      if (selectedRouteType) {
        matchesRouteType = item.routeType === selectedRouteType;
      }
      
      return matchesSearch && matchesRouteType;
    });
  }, [data, searchQuery, selectedRouteType]);

  const routeTypes = useMemo(() => {
    const types = new Set<string>();
    data.forEach((item) => {
      if (item.routeType && item.routeType !== "-") {
        types.add(item.routeType);
      }
    });
    return Array.from(types).sort();
  }, [data]);

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.warning("Không có dữ liệu để xuất Excel");
      return;
    }

    try {
      // Prepare data for Excel
      const excelData = filteredData.map((item, index) => ({
        "STT": index + 1,
        "Ngày": item.date,
        "Tên tuyến": item.routeName,
        "Loại tuyến": item.routeType,
        "Biển số": item.plateNumber,
        "Số ghế": item.seatCount,
        "Số chuyến - Kế hoạch": item.plannedTrips,
        "Số chuyến - Thực hiện": item.actualTrips,
        "Số chuyến - Tỷ lệ (%)": item.tripRatio,
        "Lượt khách - Kế hoạch": item.plannedPassengers,
        "Lượt khách - Thực hiện": item.actualPassengers,
        "Lượt khách - Tỷ lệ (%)": item.passengerRatio,
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Báo cáo tổng hợp tuyến");

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 12 },  // Ngày
        { wch: 25 },  // Tên tuyến
        { wch: 15 },  // Loại tuyến
        { wch: 15 },  // Biển số
        { wch: 10 },  // Số ghế
        { wch: 18 },  // Số chuyến - Kế hoạch
        { wch: 18 },  // Số chuyến - Thực hiện
        { wch: 15 },  // Số chuyến - Tỷ lệ
        { wch: 20 },  // Lượt khách - Kế hoạch
        { wch: 20 },  // Lượt khách - Thực hiện
        { wch: 18 },  // Lượt khách - Tỷ lệ
      ];
      ws['!cols'] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Bao-cao-tong-hop-tuyen_${currentDate}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Đã xuất Excel thành công: ${filename}`);
    } catch (error) {
      console.error("Failed to export Excel:", error);
      toast.error("Không thể xuất Excel. Vui lòng thử lại sau.");
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, item) => ({
        plannedTrips: acc.plannedTrips + item.plannedTrips,
        actualTrips: acc.actualTrips + item.actualTrips,
        plannedPassengers: acc.plannedPassengers + item.plannedPassengers,
        actualPassengers: acc.actualPassengers + item.actualPassengers,
      }),
      {
        plannedTrips: 0,
        actualTrips: 0,
        plannedPassengers: 0,
        actualPassengers: 0,
      }
    );
  }, [filteredData]);

  const totalTripRatio = totals.plannedTrips > 0
    ? Math.round((totals.actualTrips / totals.plannedTrips) * 100)
    : 0;
  const totalPassengerRatio = totals.plannedPassengers > 0
    ? Math.round((totals.actualPassengers / totals.plannedPassengers) * 100)
    : 0;

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Tìm kiếm tên tuyến, biển số..."
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
                id="routeType"
                value={selectedRouteType}
                onChange={(e) => setSelectedRouteType(e.target.value)}
              >
                <option value="">Tất cả loại tuyến</option>
                {routeTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                {/* Main header row with merged cells */}
                <TableRow className="bg-gray-100">
                  <TableHead
                    rowSpan={2}
                    className="border-r border-gray-300 align-middle text-center font-semibold"
                  >
                    STT
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="border-r border-gray-300 align-middle text-center font-semibold"
                  >
                    Ngày
                  </TableHead>
                  <TableHead
                    colSpan={4}
                    className="border-r border-gray-300 text-center font-semibold"
                  >
                    Xe khai thác
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="border-r border-gray-300 text-center font-semibold"
                  >
                    Số chuyến trên tháng
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-center font-semibold"
                  >
                    Lượt khách xuất bến
                  </TableHead>
                </TableRow>
                {/* Sub-header row */}
                <TableRow className="bg-gray-50">
                  <TableHead className="border-r border-gray-300 text-center font-medium">
                    Tên tuyến
                  </TableHead>
                  <TableHead className="border-r border-gray-300 text-center font-medium">
                    Loại tuyến
                  </TableHead>
                  <TableHead className="border-r border-gray-300 text-center font-medium">
                    Biển số
                  </TableHead>
                  <TableHead className="border-r border-gray-300 text-center font-medium">
                    Số ghế
                  </TableHead>
                  <TableHead className="border-r border-gray-300 text-center font-medium">
                    Kế hoạch
                  </TableHead>
                  <TableHead className="border-r border-gray-300 text-center font-medium">
                    Thực hiện
                  </TableHead>
                  <TableHead className="border-r border-gray-300 text-center font-medium">
                    Tỷ lệ (%)
                  </TableHead>
                  <TableHead className="border-r border-gray-300 text-center font-medium">
                    Kế hoạch
                  </TableHead>
                  <TableHead className="border-r border-gray-300 text-center font-medium">
                    Thực hiện
                  </TableHead>
                  <TableHead className="text-center font-medium">
                    Tỷ lệ (%)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-gray-500">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-gray-500">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredData.map((item, index) => (
                      <TableRow key={`${item.date}-${item.plateNumber}-${item.routeName}-${index}`}>
                        <TableCell className="text-center border-r border-gray-200">
                          {index + 1}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200 font-medium">
                          {item.date}
                        </TableCell>
                        <TableCell className="border-r border-gray-200">
                          {item.routeName}
                        </TableCell>
                        <TableCell className="border-r border-gray-200">
                          {item.routeType}
                        </TableCell>
                        <TableCell className="border-r border-gray-200 font-semibold">
                          {item.plateNumber}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {item.seatCount}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {item.plannedTrips}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {item.actualTrips}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {item.tripRatio}%
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {item.plannedPassengers.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {item.actualPassengers.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.passengerRatio}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell colSpan={2} className="text-center border-r border-gray-200">
                        Tổng
                      </TableCell>
                      <TableCell colSpan={3} className="border-r border-gray-200">
                        {filteredData.length} dòng
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200">
                        {filteredData.reduce((sum, item) => sum + item.seatCount, 0)}
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200">
                        {totals.plannedTrips}
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200">
                        {totals.actualTrips}
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200">
                        {totalTripRatio}%
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200">
                        {totals.plannedPassengers.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200">
                        {totals.actualPassengers.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {totalPassengerRatio}%
                      </TableCell>
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

