import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Download, Filter, Calendar, BarChart3 } from "lucide-react";
import { toast } from "react-toastify";
import { format, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
import { vi } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { dispatchService } from "@/services/dispatch.service";
import { routeService } from "@/services/route.service";
import { operatorService } from "@/services/operator.service";
import { useUIStore } from "@/store/ui.store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MonthPicker } from "@/components/ui/month-picker";
import { ChevronDownIcon } from "lucide-react";
import {
  StickyTable,
  StickyTableHeader,
  StickyTableBody,
  StickyTableRow,
  StickyTableHead,
  StickyTableCell,
} from "@/components/ui/sticky-table";

interface AttendanceData {
  plateNumber: string;
  operatorName: string;
  routeName: string;
  routeType: string;
  registeredTrips: number; // Số chuyến đăng ký tháng
  dailyTrips: Record<number, number>; // Số chuyến theo từng ngày
  totalActual: number; // Tổng thực hiện
}

export default function BaoCaoChamCongDangTai() {
  const setTitle = useUIStore((state: any) => state.setTitle);
  const [data, setData] = useState<AttendanceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedRouteType, setSelectedRouteType] = useState<string>("");
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [routeTypes, setRouteTypes] = useState<string[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  useEffect(() => {
    setTitle("Báo cáo > Chấm công đăng tài");
    loadOperators();
    loadRoutes();
  }, [setTitle]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const loadOperators = async () => {
    try {
      const data = await operatorService.getAll(true);
      setOperators(data);
    } catch (error) {
      console.error("Failed to load operators:", error);
    }
  };

  const loadRoutes = async () => {
    try {
      const data = await routeService.getAll();
      setRoutes(data);
      
      // Extract unique route types
      const types = new Set<string>();
      data.forEach((route) => {
        if (route.routeType) {
          types.add(route.routeType);
        }
      });
      setRouteTypes(Array.from(types).sort());
    } catch (error) {
      console.error("Failed to load routes:", error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load dispatch records
      const dispatchRecords = await dispatchService.getAll();
      
      // Filter by selected month
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      
      const filteredRecords = dispatchRecords.filter((record) => {
        const recordDate = new Date(record.entryTime);
        return recordDate >= monthStart && recordDate <= monthEnd;
      });

      // Group by vehicle and route
      const grouped = new Map<string, AttendanceData>();
      
      filteredRecords.forEach((record) => {
        const key = `${record.vehicleId}-${record.routeId}`;
        const plateNumber = record.vehiclePlateNumber || "-";
        const operatorName = record.vehicle?.operator?.name || "-";
        const routeName = record.routeName || "-";
        const routeType = record.route?.routeType || "-";
        
        if (!grouped.has(key)) {
          grouped.set(key, {
            plateNumber,
            operatorName,
            routeName,
            routeType,
            registeredTrips: 0,
            dailyTrips: {},
            totalActual: 0,
          });
        }
        
        const item = grouped.get(key)!;
        
        // Count trips by day
        const recordDate = new Date(record.entryTime);
        const day = recordDate.getDate();
        
        if (!item.dailyTrips[day]) {
          item.dailyTrips[day] = 0;
        }
        item.dailyTrips[day] += 1;
        item.totalActual += 1;
        
        // For registered trips, we'll use a simple calculation
        // In a real scenario, this would come from schedules
        item.registeredTrips = Math.max(item.registeredTrips, item.totalActual);
      });
      
      // Convert to array and sort
      const result = Array.from(grouped.values()).sort((a, b) => 
        a.plateNumber.localeCompare(b.plateNumber)
      );
      
      setData(result);
    } catch (error) {
      console.error("Failed to load attendance data:", error);
      toast.error("Không thể tải dữ liệu báo cáo");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item: AttendanceData) => {
      // Search filter
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        matchesSearch = 
          item.plateNumber.toLowerCase().includes(query) ||
          item.operatorName.toLowerCase().includes(query) ||
          item.routeName.toLowerCase().includes(query);
      }
      
      // Route type filter
      let matchesRouteType = true;
      if (selectedRouteType) {
        matchesRouteType = item.routeType === selectedRouteType;
      }
      
      // Operator filter
      let matchesOperator = true;
      if (selectedOperatorId) {
        const operator = operators.find((op: any) => op.id === selectedOperatorId);
        matchesOperator = item.operatorName === (operator?.name || "");
      }
      
      // Route filter
      let matchesRoute = true;
      if (selectedRouteId) {
        const route = routes.find((r: any) => r.id === selectedRouteId);
        matchesRoute = item.routeName === (route?.routeName || "");
      }
      
      return matchesSearch && matchesRouteType && matchesOperator && matchesRoute;
    });
  }, [data, searchQuery, selectedRouteType, selectedOperatorId, selectedRouteId, operators, routes]);

  // Get days in selected month
  const daysInMonth = useMemo(() => {
    return getDaysInMonth(selectedMonth);
  }, [selectedMonth]);

  const monthDays = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.warning("Không có dữ liệu để xuất Excel");
      return;
    }

    try {
      // Prepare data for Excel
      const excelData: any[] = [];
      
      filteredData.forEach((item: AttendanceData, index: number) => {
        const row: any = {
          "STT": index + 1,
          "Biển số": item.plateNumber,
          "Tên đơn vị": item.operatorName,
          "Tên tuyến": item.routeName,
          "Loại tuyến": item.routeType,
        };
        
        // Add daily trips
        monthDays.forEach((day) => {
          row[`Ngày ${day.toString().padStart(2, "0")}`] = item.dailyTrips[day] || 0;
        });
        
        row["Số chuyến đăng ký tháng"] = item.registeredTrips;
        row["Tổng thực hiện"] = item.totalActual;
        
        excelData.push(row);
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Chấm công đăng tài");

      // Generate filename with current month
      const monthStr = format(selectedMonth, "MM-yyyy");
      const filename = `Bao-cao-cham-cong-dang-tai_${monthStr}.xlsx`;

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
        registeredTrips: acc.registeredTrips + item.registeredTrips,
        totalActual: acc.totalActual + item.totalActual,
        dailyTotals: monthDays.reduce((dailyAcc, day) => {
          dailyAcc[day] = (dailyAcc[day] || 0) + (item.dailyTrips[day] || 0);
          return dailyAcc;
        }, {} as Record<number, number>),
      }),
      {
        registeredTrips: 0,
        totalActual: 0,
        dailyTotals: {} as Record<number, number>,
      }
    );
  }, [filteredData, monthDays]);

  const formatMonthDisplay = (date: Date) => {
    return format(date, "MM/yyyy", { locale: vi });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ lọc và tìm kiếm
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isLoading || filteredData.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Xuất Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month-picker" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Tháng báo cáo <span className="text-red-500">*</span>
              </Label>
              <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="month-picker"
                    className="w-full justify-between font-normal"
                  >
                    {formatMonthDisplay(selectedMonth)}
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[200]" align="start">
                  <MonthPicker
                    selectedMonth={selectedMonth}
                    onMonthSelect={(date) => {
                      setSelectedMonth(date);
                      setMonthPickerOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Tìm kiếm</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Biển số, đơn vị, tuyến..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="routeType">Loại tuyến</Label>
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
            
            <div className="space-y-2">
              <Label htmlFor="operator">Doanh nghiệp</Label>
              <Select
                id="operator"
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
              >
                <option value="">Tất cả doanh nghiệp</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name}
                  </option>
                ))}
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="route">Tuyến vận chuyển</Label>
              <Select
                id="route"
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
              >
                <option value="">Tất cả tuyến</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.routeName}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchQuery || selectedRouteType || selectedOperatorId || selectedRouteId) && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Bộ lọc đang áp dụng:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Tìm kiếm: {searchQuery}
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedRouteType && (
                <Badge variant="secondary" className="gap-1">
                  Loại tuyến: {selectedRouteType}
                  <button
                    onClick={() => setSelectedRouteType("")}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedOperatorId && (
                <Badge variant="secondary" className="gap-1">
                  Doanh nghiệp: {operators.find(op => op.id === selectedOperatorId)?.name}
                  <button
                    onClick={() => setSelectedOperatorId("")}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedRouteId && (
                <Badge variant="secondary" className="gap-1">
                  Tuyến: {routes.find(r => r.id === selectedRouteId)?.routeName}
                  <button
                    onClick={() => setSelectedRouteId("")}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedRouteType("");
                  setSelectedOperatorId("");
                  setSelectedRouteId("");
                }}
                className="h-6 px-2 text-xs"
              >
                Xóa tất cả
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Bảng chấm công chi tiết
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Hiển thị {filteredData.length} xe</span>
              {filteredData.length !== data.length && (
                <span>/ {data.length} tổng</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Legend */}
          <div className="px-6 py-3 bg-gray-50 border-b">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <span className="font-medium text-gray-700">Chú thích số chuyến:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span className="text-green-700">≥ 3 chuyến (Cao)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-green-700">2 chuyến (Trung bình)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span className="text-blue-700">1 chuyến (Thấp)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-50 border border-gray-300 rounded"></div>
                <span className="text-gray-600">0 chuyến (Không hoạt động)</span>
              </div>
            </div>
          </div>
          
          <div className="overflow-hidden">
            <StickyTable className="min-w-full" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col className="w-[60px]" />
                  <col className="w-[150px]" />
                  {monthDays.map((_, idx) => (
                    <col key={idx} className="w-[50px]" />
                  ))}
                  <col className="w-[150px]" />
                  <col className="w-[120px]" />
                </colgroup>
              <StickyTableHeader>
                {/* Main header row */}
                <StickyTableRow className="bg-gray-100">
                  <StickyTableHead
                    rowSpan={2}
                    className="text-center font-semibold border-r border-gray-300 align-middle bg-gray-100"
                    sticky
                    stickyLeft={0}
                    style={{ 
                      width: "60px", 
                      minWidth: "60px", 
                      maxWidth: "60px",
                      backgroundColor: "#f3f4f6"
                    }}
                  >
                    STT
                  </StickyTableHead>
                  <StickyTableHead
                    rowSpan={2}
                    className="text-center font-semibold border-r border-gray-300 align-middle bg-gray-100"
                    sticky
                    stickyLeft={60}
                    style={{ 
                      width: "150px", 
                      minWidth: "150px", 
                      maxWidth: "150px",
                      backgroundColor: "#f3f4f6"
                    }}
                  >
                    Biển kiểm soát
                  </StickyTableHead>
                  <StickyTableHead
                    colSpan={daysInMonth}
                    className="text-center font-semibold border-r border-gray-300 bg-gray-100"
                  >
                    Tháng {format(selectedMonth, "MM", { locale: vi })}
                  </StickyTableHead>
                  <StickyTableHead
                    rowSpan={2}
                    className="text-center font-semibold border-r border-gray-300 align-middle bg-gray-100"
                    sticky
                    stickyRight={120}
                    style={{ 
                      width: "150px", 
                      minWidth: "150px", 
                      maxWidth: "150px",
                      backgroundColor: "#f3f4f6"
                    }}
                  >
                    Số chuyến đăng ký tháng =
                  </StickyTableHead>
                  <StickyTableHead
                    rowSpan={2}
                    className="text-center font-semibold align-middle bg-gray-100"
                    sticky
                    stickyRight={0}
                    style={{ 
                      width: "120px", 
                      minWidth: "120px", 
                      maxWidth: "120px",
                      backgroundColor: "#f3f4f6"
                    }}
                  >
                    Tổng thực hiện =
                  </StickyTableHead>
                </StickyTableRow>
                {/* Sub-header row */}
                <StickyTableRow className="bg-gray-50">
                  {monthDays.map((day) => (
                    <StickyTableHead
                      key={day}
                      className="text-center font-medium border-r border-gray-200"
                      style={{ width: "50px", minWidth: "50px" }}
                    >
                      {day.toString().padStart(2, "0")}
                    </StickyTableHead>
                  ))}
                </StickyTableRow>
              </StickyTableHeader>
              <StickyTableBody>
                  {isLoading ? (
                    <StickyTableRow>
                      <StickyTableCell
                        colSpan={2 + daysInMonth + 2}
                        className="text-center text-gray-500 py-4"
                      >
                        Đang tải dữ liệu...
                      </StickyTableCell>
                    </StickyTableRow>
                  ) : filteredData.length === 0 ? (
                    <StickyTableRow>
                      <StickyTableCell
                        colSpan={2 + daysInMonth + 2}
                        className="text-center text-gray-500 py-4"
                      >
                        Không có dữ liệu
                      </StickyTableCell>
                    </StickyTableRow>
                  ) : (
                    <>
                      {filteredData.map((item, index) => {
                        const completionRate = item.registeredTrips > 0 
                          ? (item.totalActual / item.registeredTrips) * 100 
                          : 0;
                        const isLowPerformance = completionRate < 80;
                        const isHighPerformance = completionRate >= 100;
                        
                        return (
                          <StickyTableRow 
                            key={`${item.plateNumber}-${item.routeName}-${index}`}
                            className={`hover:bg-gray-50 ${
                              isLowPerformance ? 'bg-red-50' : 
                              isHighPerformance ? 'bg-green-50' : ''
                            }`}
                          >
                            <StickyTableCell 
                              className="text-center border-r border-gray-200 py-2"
                              sticky
                              stickyLeft={0}
                              style={{ 
                                width: "60px", 
                                minWidth: "60px", 
                                maxWidth: "60px"
                              }}
                            >
                              {index + 1}
                            </StickyTableCell>
                            <StickyTableCell 
                              className="border-r border-gray-200 py-2 px-3"
                              sticky
                              stickyLeft={60}
                              style={{ 
                                width: "150px", 
                                minWidth: "150px", 
                                maxWidth: "150px"
                              }}
                            >
                              <div className="space-y-1">
                                <div className="font-semibold text-center">{item.plateNumber}</div>
                                <div className="text-xs text-gray-600 text-center truncate" title={item.operatorName}>
                                  {item.operatorName}
                                </div>
                                <div className="text-xs text-blue-600 text-center truncate" title={item.routeName}>
                                  {item.routeName}
                                </div>
                              </div>
                            </StickyTableCell>
                            {monthDays.map((day) => {
                              const tripCount = item.dailyTrips[day] || 0;
                              let cellClass = "text-center border-r border-gray-200 py-2 transition-colors";
                              
                              if (tripCount === 0) {
                                cellClass += " text-gray-400 bg-gray-50";
                              } else if (tripCount >= 3) {
                                cellClass += " font-bold text-white bg-green-600 hover:bg-green-700";
                              } else if (tripCount >= 2) {
                                cellClass += " font-semibold text-green-800 bg-green-100 hover:bg-green-200";
                              } else {
                                cellClass += " font-medium text-blue-800 bg-blue-100 hover:bg-blue-200";
                              }
                              
                              return (
                                <StickyTableCell
                                  key={day}
                                  className={cellClass}
                                  style={{ width: "50px", minWidth: "50px" }}
                                  title={tripCount > 0 ? `${tripCount} chuyến ngày ${day}` : `Không có chuyến ngày ${day}`}
                                >
                                  {tripCount > 0 ? tripCount : "-"}
                                </StickyTableCell>
                              );
                            })}
                            <StickyTableCell 
                              className="text-center border-r border-gray-200 py-2 font-medium"
                              sticky
                              stickyRight={120}
                              style={{ 
                                width: "150px", 
                                minWidth: "150px", 
                                maxWidth: "150px"
                              }}
                            >
                              {item.registeredTrips.toLocaleString()}
                            </StickyTableCell>
                            <StickyTableCell 
                              className={`text-center py-2 font-medium ${
                                isLowPerformance ? 'text-red-600' :
                                isHighPerformance ? 'text-green-600' : 'text-gray-900'
                              }`}
                              sticky
                              stickyRight={0}
                              style={{ 
                                width: "120px", 
                                minWidth: "120px", 
                                maxWidth: "120px"
                              }}
                            >
                              <div className="space-y-1">
                                <div>{item.totalActual.toLocaleString()}</div>
                                <div className="text-xs">
                                  ({Math.round(completionRate)}%)
                                </div>
                              </div>
                            </StickyTableCell>
                          </StickyTableRow>
                        );
                      })}
                      {/* Total row */}
                      <StickyTableRow className="bg-gray-50 font-semibold border-b">
                        <StickyTableCell 
                          colSpan={2} 
                          className="text-center border-r border-gray-200 bg-gray-50 py-2"
                          sticky
                          stickyLeft={0}
                        >
                          Tổng cộng:
                        </StickyTableCell>
                        {monthDays.map((day) => (
                          <StickyTableCell
                            key={day}
                            className="text-center border-r border-gray-200 py-2"
                            style={{ width: "50px", minWidth: "50px" }}
                          >
                            {totals.dailyTotals[day] || 0}
                          </StickyTableCell>
                        ))}
                        <StickyTableCell 
                          className="text-center border-r border-gray-200 bg-gray-50 py-2"
                          sticky
                          stickyRight={120}
                          style={{ 
                            width: "150px", 
                            minWidth: "150px", 
                            maxWidth: "150px"
                          }}
                        >
                          {totals.registeredTrips}
                        </StickyTableCell>
                        <StickyTableCell 
                          className="text-center bg-gray-50 py-2"
                          sticky
                          stickyRight={0}
                          style={{ 
                            width: "120px", 
                            minWidth: "120px", 
                            maxWidth: "120px"
                          }}
                        >
                          {totals.totalActual}
                        </StickyTableCell>
                      </StickyTableRow>
                    </>
                  )}
              </StickyTableBody>
            </StickyTable>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

