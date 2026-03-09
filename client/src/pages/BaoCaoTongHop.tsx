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
import { dispatchService } from "@/services/dispatch.service";
import { useUIStore } from "@/store/ui.store";
import { DatePickerRange } from "@/components/DatePickerRange";
import { parseDatabaseTimeForFilter, formatVietnamDateTime } from "@/lib/vietnam-time";

interface RouteSummaryData {
  date: string; // Ngày
  routeCode: string;
  routeName: string;
  quantity: number; // Số lượng chuyến
  revenue: number; // Doanh thu
  paymentMethods: string[]; // Hình thức thu
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Tiền mặt",
  bank_transfer: "Chuyển khoản",
  card: "Thẻ",
};

export default function BaoCaoTongHop() {
  const setTitle = useUIStore((state) => state.setTitle);
  const [data, setData] = useState<RouteSummaryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    setTitle("Báo cáo > Báo cáo tổng hợp");
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

      // Only count records that have been paid and departed
      const paidRecords = filteredRecords.filter(
        (record) => record.paymentAmount && record.paymentAmount > 0 && record.currentStatus === "departed"
      );

      // Group by route
      const grouped = new Map<string, RouteSummaryData>();

      paidRecords.forEach((record) => {
        // Get date from entryTime
        const recordDate = parseDatabaseTimeForFilter(record.entryTime);
        const dateStr = recordDate ? formatVietnamDateTime(record.entryTime, "dd/MM/yyyy") : "-";

        const routeId = record.routeId;
        const key = `${dateStr}-${routeId}`;
        const routeCode = record.route?.routeCode || "-";
        const routeName = record.routeName || "-";

        if (!grouped.has(key)) {
          grouped.set(key, {
            date: dateStr,
            routeCode,
            routeName,
            quantity: 0,
            revenue: 0,
            paymentMethods: [],
          });
        }
        
        const item = grouped.get(key)!;
        
        // Count trips
        item.quantity += 1;
        
        // Sum revenue
        if (record.paymentAmount) {
          item.revenue += record.paymentAmount;
        }
        
        // Collect payment methods
        if (record.paymentMethod && !item.paymentMethods.includes(record.paymentMethod)) {
          item.paymentMethods.push(record.paymentMethod);
        }
      });
      
      // Convert to array and sort by route code
      const result = Array.from(grouped.values()).sort((a, b) => 
        a.routeCode.localeCompare(b.routeCode)
      );
      
      setData(result);
    } catch (error) {
      console.error("Failed to load summary data:", error);
      toast.error("Không thể tải dữ liệu báo cáo");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.date.toLowerCase().includes(query) ||
          item.routeCode.toLowerCase().includes(query) ||
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
        "Ngày": item.date,
        "Mã tuyến": item.routeCode,
        "Tên tuyến": item.routeName,
        "Số lượng": item.quantity,
        "Doanh thu": item.revenue,
        "Hình thức thu": item.paymentMethods
          .map((method) => paymentMethodLabels[method] || method)
          .join(", ") || "-",
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Báo cáo tổng hợp");

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 12 },  // Ngày
        { wch: 15 },  // Mã tuyến
        { wch: 30 },  // Tên tuyến
        { wch: 12 },  // Số lượng
        { wch: 15 },  // Doanh thu
        { wch: 20 },  // Hình thức thu
      ];
      ws['!cols'] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Bao-cao-tong-hop_${currentDate}.xlsx`;

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
        quantity: acc.quantity + item.quantity,
        revenue: acc.revenue + item.revenue,
      }),
      {
        quantity: 0,
        revenue: 0,
      }
    );
  }, [filteredData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
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
                placeholder="Tìm kiếm mã tuyến, tên tuyến..."
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
                  <TableHead className="text-center font-semibold">Ngày</TableHead>
                  <TableHead className="text-center font-semibold">Mã tuyến</TableHead>
                  <TableHead className="text-center font-semibold">Tên tuyến</TableHead>
                  <TableHead className="text-center font-semibold">Số lượng</TableHead>
                  <TableHead className="text-center font-semibold">Doanh thu</TableHead>
                  <TableHead className="text-center font-semibold">Hình thức thu</TableHead>
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
                  <>
                    {filteredData.map((item, index) => (
                      <TableRow key={`${item.date}-${item.routeCode}-${index}`}>
                        <TableCell className="text-center">
                          {index + 1}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {item.date}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {item.routeCode}
                        </TableCell>
                        <TableCell className="text-center">{item.routeName}</TableCell>
                        <TableCell className="text-center">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {formatCurrency(item.revenue)}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.paymentMethods.length > 0
                            ? item.paymentMethods
                                .map((method) => paymentMethodLabels[method] || method)
                                .join(", ")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell colSpan={4} className="text-center">
                        Tổng cộng:
                      </TableCell>
                      <TableCell className="text-center">
                        {totals.quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatCurrency(totals.revenue)}
                      </TableCell>
                      <TableCell className="text-center"></TableCell>
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

