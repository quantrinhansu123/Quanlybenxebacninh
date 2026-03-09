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

interface RevenueDetailData {
  date: string; // Ngày
  operatorName: string;
  routeName: string;
  routeCode: string;
  vehicleCount: number; // Lượt xe
  // Chi tiết thu
  raVaoBen: number;
  hoaHongVe: number;
  dauDem: number;
  veSinhTaxi: number;
  luuBen: number;
  veSinhXeHD: number;
  truyThuChuyen: number;
  truyThuThang: number;
  hhTruyThuThang: number;
  noCu: number;
  phuThu: number;
  doanhThu: number; // Tổng doanh thu
}

export default function BaoCaoDoanhThuBenBanVe() {
  const setTitle = useUIStore((state) => state.setTitle);
  const [data, setData] = useState<RevenueDetailData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    setTitle("Báo cáo > Doanh thu bến bán vé");
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

      // Only count records that have been paid
      const paidRecords = filteredRecords.filter(
        (record) => record.paymentAmount && record.paymentAmount > 0
      );

      // Group by operator and route
      const grouped = new Map<string, RevenueDetailData>();
      
      paidRecords.forEach((record) => {
        // Get date from entryTime
        const recordDate = parseDatabaseTimeForFilter(record.entryTime);
        const dateStr = recordDate ? formatVietnamDateTime(record.entryTime, "dd/MM/yyyy") : "-";

        const key = `${dateStr}-${record.vehicle?.operatorId || 'unknown'}-${record.routeId}`;
        const operatorName = record.vehicle?.operator?.name || "-";
        const routeName = record.routeName || "-";
        const routeCode = record.route?.routeCode || "-";

        if (!grouped.has(key)) {
          grouped.set(key, {
            date: dateStr,
            operatorName,
            routeName,
            routeCode,
            vehicleCount: 0,
            raVaoBen: 0,
            hoaHongVe: 0,
            dauDem: 0,
            veSinhTaxi: 0,
            luuBen: 0,
            veSinhXeHD: 0,
            truyThuChuyen: 0,
            truyThuThang: 0,
            hhTruyThuThang: 0,
            noCu: 0,
            phuThu: 0,
            doanhThu: 0,
          });
        }
        
        const item = grouped.get(key)!;
        
        // Count vehicles
        item.vehicleCount += 1;

        // Extract fee details from metadata or use payment amount as base
        const metadata = (record.metadata || {}) as Record<string, unknown>;
        const fees = (metadata.fees || {}) as Record<string, unknown>;

        // Ra vào bến - base fee for entry/exit
        item.raVaoBen += Number(fees.raVaoBen) || 0;

        // Hoa hồng vé - commission from ticket sales
        item.hoaHongVe += Number(fees.hoaHongVe) || 0;

        // Đậu dêm - overnight parking fee
        item.dauDem += Number(fees.dauDem) || 0;

        // Vệ sinh taxi - taxi cleaning fee
        item.veSinhTaxi += Number(fees.veSinhTaxi) || 0;

        // Lưu bến - station storage fee
        item.luuBen += Number(fees.luuBen) || 0;

        // Vệ sinh xe HD - HD vehicle cleaning fee
        item.veSinhXeHD += Number(fees.veSinhXeHD) || 0;

        // Truy thu chuyến - retroactive charge per trip
        item.truyThuChuyen += Number(fees.truyThuChuyen) || 0;

        // Truy thu tháng - retroactive monthly charge
        item.truyThuThang += Number(fees.truyThuThang) || 0;

        // HH Truy thu tháng - commission on retroactive monthly charge
        item.hhTruyThuThang += Number(fees.hhTruyThuThang) || 0;

        // Nợ cũ - old debt
        item.noCu += Number(fees.noCu) || 0;

        // Phụ thu - additional charges
        item.phuThu += Number(fees.phuThu) || 0;

        // If no detailed fees in metadata, use payment amount as raVaoBen
        if (!metadata.fees && record.paymentAmount) {
          item.raVaoBen += record.paymentAmount;
        }
        
        // Calculate total revenue
        item.doanhThu = 
          item.raVaoBen +
          item.hoaHongVe +
          item.dauDem +
          item.veSinhTaxi +
          item.luuBen +
          item.veSinhXeHD +
          item.truyThuChuyen +
          item.truyThuThang +
          item.hhTruyThuThang +
          item.noCu +
          item.phuThu;
      });
      
      // Convert to array and sort by operator name and route code
      const result = Array.from(grouped.values()).sort((a, b) => {
        const operatorCompare = a.operatorName.localeCompare(b.operatorName);
        if (operatorCompare !== 0) return operatorCompare;
        return a.routeCode.localeCompare(b.routeCode);
      });
      
      setData(result);
    } catch (error) {
      console.error("Failed to load revenue detail data:", error);
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
          item.operatorName.toLowerCase().includes(query) ||
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
        "Doanh nghiệp": item.operatorName,
        "Tên tuyến": item.routeName,
        "Mã tuyến": item.routeCode,
        "Lượt xe": item.vehicleCount,
        "Ra vào bến": item.raVaoBen,
        "Hoa hồng vé": item.hoaHongVe,
        "Đậu dêm": item.dauDem,
        "Vệ sinh taxi": item.veSinhTaxi,
        "Lưu bến": item.luuBen,
        "Vệ sinh xe HD": item.veSinhXeHD,
        "Truy thu chuyến": item.truyThuChuyen,
        "Truy thu tháng": item.truyThuThang,
        "HH Truy thu tháng": item.hhTruyThuThang,
        "Nợ cũ": item.noCu,
        "Phụ thu": item.phuThu,
        "Doanh thu": item.doanhThu,
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Doanh thu bến bán vé");

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 12 },  // Ngày
        { wch: 25 },  // Doanh nghiệp
        { wch: 25 },  // Tên tuyến
        { wch: 15 },  // Mã tuyến
        { wch: 12 },  // Lượt xe
        { wch: 15 },  // Ra vào bến
        { wch: 15 },  // Hoa hồng vé
        { wch: 12 },  // Đậu dêm
        { wch: 15 },  // Vệ sinh taxi
        { wch: 12 },  // Lưu bến
        { wch: 15 },  // Vệ sinh xe HD
        { wch: 15 },  // Truy thu chuyến
        { wch: 15 },  // Truy thu tháng
        { wch: 18 },  // HH Truy thu tháng
        { wch: 12 },  // Nợ cũ
        { wch: 12 },  // Phụ thu
        { wch: 15 },  // Doanh thu
      ];
      ws['!cols'] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Bao-cao-doanh-thu-ben-ban-ve_${currentDate}.xlsx`;

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
        vehicleCount: acc.vehicleCount + item.vehicleCount,
        raVaoBen: acc.raVaoBen + item.raVaoBen,
        hoaHongVe: acc.hoaHongVe + item.hoaHongVe,
        dauDem: acc.dauDem + item.dauDem,
        veSinhTaxi: acc.veSinhTaxi + item.veSinhTaxi,
        luuBen: acc.luuBen + item.luuBen,
        veSinhXeHD: acc.veSinhXeHD + item.veSinhXeHD,
        truyThuChuyen: acc.truyThuChuyen + item.truyThuChuyen,
        truyThuThang: acc.truyThuThang + item.truyThuThang,
        hhTruyThuThang: acc.hhTruyThuThang + item.hhTruyThuThang,
        noCu: acc.noCu + item.noCu,
        phuThu: acc.phuThu + item.phuThu,
        doanhThu: acc.doanhThu + item.doanhThu,
      }),
      {
        vehicleCount: 0,
        raVaoBen: 0,
        hoaHongVe: 0,
        dauDem: 0,
        veSinhTaxi: 0,
        luuBen: 0,
        veSinhXeHD: 0,
        truyThuChuyen: 0,
        truyThuThang: 0,
        hhTruyThuThang: 0,
        noCu: 0,
        phuThu: 0,
        doanhThu: 0,
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
                placeholder="Tìm kiếm doanh nghiệp, mã tuyến, tên tuyến..."
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
                {/* Main header row */}
                <TableRow className="bg-gray-100">
                  <TableHead
                    rowSpan={2}
                    className="text-center font-semibold border-r border-gray-300 align-middle"
                  >
                    STT
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="text-center font-semibold border-r border-gray-300 align-middle"
                  >
                    Ngày
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="text-center font-semibold border-r border-gray-300 align-middle"
                  >
                    Doanh nghiệp
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="text-center font-semibold border-r border-gray-300 align-middle"
                  >
                    Tên tuyến
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="text-center font-semibold border-r border-gray-300 align-middle"
                  >
                    Mã tuyến
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="text-center font-semibold border-r border-gray-300 align-middle"
                  >
                    Lượt xe
                  </TableHead>
                  <TableHead
                    colSpan={12}
                    className="text-center font-semibold"
                  >
                    Chi tiết thu
                  </TableHead>
                </TableRow>
                {/* Sub-header row */}
                <TableRow className="bg-gray-50">
                  <TableHead className="text-center font-medium border-r border-gray-200">
                    Ra vào bến
                  </TableHead>
                  <TableHead className="text-center font-medium border-r border-gray-200">
                    Hoa hồng vé
                  </TableHead>
                  <TableHead className="text-center font-medium border-r border-gray-200">
                    Đậu dêm
                  </TableHead>
                  <TableHead className="text-center font-medium border-r border-gray-200">
                    Vệ sinh taxi
                  </TableHead>
                  <TableHead className="text-center font-medium border-r border-gray-200">
                    Lưu bến
                  </TableHead>
                  <TableHead className="text-center font-medium border-r border-gray-200">
                    Vệ sinh xe HD
                  </TableHead>
                  <TableHead className="text-center font-medium border-r border-gray-200">
                    Truy thu chuyến
                  </TableHead>
                  <TableHead className="text-center font-medium border-r border-gray-200">
                    Truy thu tháng
                  </TableHead>
                  <TableHead className="text-center font-medium border-r border-gray-200">
                    HH Truy thu tháng
                  </TableHead>
                  <TableHead className="text-center font-medium border-r border-gray-200">
                    Nợ cũ
                  </TableHead>
                  <TableHead className="text-center font-medium border-r border-gray-200">
                    Phụ thu
                  </TableHead>
                  <TableHead className="text-center font-medium">
                    Doanh thu
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={18} className="text-center text-gray-500">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={18} className="text-center text-gray-500">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredData.map((item, index) => (
                      <TableRow key={`${item.date}-${item.operatorName}-${item.routeCode}-${index}`}>
                        <TableCell className="text-center border-r border-gray-200">
                          {index + 1}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200 font-medium">
                          {item.date}
                        </TableCell>
                        <TableCell className="border-r border-gray-200">
                          {item.operatorName}
                        </TableCell>
                        <TableCell className="border-r border-gray-200">
                          {item.routeName}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200 font-semibold">
                          {item.routeCode}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {item.vehicleCount}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {formatCurrency(item.raVaoBen)}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {formatCurrency(item.hoaHongVe)}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {formatCurrency(item.dauDem)}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {formatCurrency(item.veSinhTaxi)}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {formatCurrency(item.luuBen)}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {formatCurrency(item.veSinhXeHD)}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {formatCurrency(item.truyThuChuyen)}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {formatCurrency(item.truyThuThang)}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {formatCurrency(item.hhTruyThuThang)}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {formatCurrency(item.noCu)}
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          {formatCurrency(item.phuThu)}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {formatCurrency(item.doanhThu)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="bg-gradient-to-r from-blue-100 to-blue-50 font-bold text-blue-900 border-t-2 border-blue-300 sticky bottom-0">
                      <TableCell colSpan={5} className="text-center border-r border-blue-300 bg-blue-200 shadow-sm">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-lg"></span>
                          <span className="text-base font-bold">TỔNG CỘNG</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r border-blue-300 bg-blue-100 font-bold text-blue-800">
                        <div className="py-1">
                          <div className="text-lg font-bold">{totals.vehicleCount}</div>
                          <div className="text-xs text-blue-600">lượt xe</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r border-blue-300 bg-blue-100 font-bold text-blue-800">
                        <div className="py-1">
                          <div className="text-sm font-bold">{formatCurrency(totals.raVaoBen)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r border-blue-300 bg-blue-100 font-bold text-blue-800">
                        <div className="py-1">
                          <div className="text-sm font-bold">{formatCurrency(totals.hoaHongVe)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r border-blue-300 bg-blue-100 font-bold text-blue-800">
                        <div className="py-1">
                          <div className="text-sm font-bold">{formatCurrency(totals.dauDem)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r border-blue-300 bg-blue-100 font-bold text-blue-800">
                        <div className="py-1">
                          <div className="text-sm font-bold">{formatCurrency(totals.veSinhTaxi)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r border-blue-300 bg-blue-100 font-bold text-blue-800">
                        <div className="py-1">
                          <div className="text-sm font-bold">{formatCurrency(totals.luuBen)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r border-blue-300 bg-blue-100 font-bold text-blue-800">
                        <div className="py-1">
                          <div className="text-sm font-bold">{formatCurrency(totals.veSinhXeHD)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r border-blue-300 bg-blue-100 font-bold text-blue-800">
                        <div className="py-1">
                          <div className="text-sm font-bold">{formatCurrency(totals.truyThuChuyen)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r border-blue-300 bg-blue-100 font-bold text-blue-800">
                        <div className="py-1">
                          <div className="text-sm font-bold">{formatCurrency(totals.truyThuThang)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r border-blue-300 bg-blue-100 font-bold text-blue-800">
                        <div className="py-1">
                          <div className="text-sm font-bold">{formatCurrency(totals.hhTruyThuThang)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r border-blue-300 bg-blue-100 font-bold text-blue-800">
                        <div className="py-1">
                          <div className="text-sm font-bold">{formatCurrency(totals.noCu)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-r border-blue-300 bg-blue-100 font-bold text-blue-800">
                        <div className="py-1">
                          <div className="text-sm font-bold">{formatCurrency(totals.phuThu)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center bg-gradient-to-r from-green-200 to-green-100 border-2 border-green-400 shadow-lg">
                        <div className="py-2 px-1">
                          <div className="text-lg font-bold text-green-800">{formatCurrency(totals.doanhThu)}</div>
                          <div className="text-xs text-green-600 font-medium">VNĐ</div>
                        </div>
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

