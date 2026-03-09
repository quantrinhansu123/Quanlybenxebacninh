import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, FileSpreadsheet } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { toast } from "react-toastify";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  StickyTable,
  StickyTableHeader,
  StickyTableBody,
  StickyTableRow,
  StickyTableHead,
  StickyTableCell,
} from "@/components/ui/sticky-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui.store";
import { DatePickerRange } from "@/components/DatePickerRange";
import { formatVietnamDateTime } from "@/lib/vietnam-time";
import { invoiceService } from "@/services/invoice.service";
import { dispatchService } from "@/services/dispatch.service";

interface InvoiceData {
  transactionCode: string;
  plateNumber: string;
  taxPercentage: number;
  invoiceNumber: string;
  orderCode: string;
  vehicleType: string;
  transportUnit: string;
  transportRoute: string;
  goodsServiceName: string;
  valueWithoutTax: number;
  discount: number;
  vatAmount: number;
  paymentMethod: string;
  transactionTime: string;
  payer: string;
  shift: string;
  paymentType: string;
  valueWithTax: number;
}

export default function BangKeHoaDon() {
  const setTitle = useUIStore((state) => state.setTitle);
  const [data, setData] = useState<InvoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    setTitle("Báo cáo > Bảng kê hóa đơn");
  }, [setTitle]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Prepare date range for API
      let startDate: string | undefined;
      let endDate: string | undefined;
      
      if (dateRange?.from && dateRange?.to) {
        startDate = format(dateRange.from, "yyyy-MM-dd");
        endDate = format(dateRange.to, "yyyy-MM-dd");
      }

      // Fetch invoices and dispatch records in parallel
      const [invoices, dispatchRecords] = await Promise.all([
        invoiceService.getAll(undefined, undefined, startDate, endDate),
        dispatchService.getAll(),
      ]);

      // Create a map of dispatch records by ID for quick lookup
      const dispatchMap = new Map(
        dispatchRecords.map((record) => [record.id, record])
      );

      // Map invoices to InvoiceData format
      const result: InvoiceData[] = invoices
        .filter((invoice) => invoice.dispatchRecordId) // Only invoices with dispatch records
        .map((invoice) => {
          const dispatch = invoice.dispatchRecordId
            ? dispatchMap.get(invoice.dispatchRecordId)
            : null;

          // Calculate tax percentage
          const taxPercentage =
            invoice.subtotal > 0
              ? Math.round((invoice.taxAmount / invoice.subtotal) * 100)
              : 10;

          // Get shift from metadata or default
          const metadata = (dispatch?.metadata || {}) as Record<string, unknown>;
          const shift = String(metadata.shift || metadata.paymentShift || "-");

          // Map payment method
          const paymentMethodMap: Record<string, string> = {
            cash: "Tiền mặt",
            bank_transfer: "Chuyển khoản",
            card: "Thẻ",
          };

          return {
            transactionCode: invoice.id.substring(0, 8).toUpperCase(),
            plateNumber: dispatch?.vehiclePlateNumber || "-",
            taxPercentage,
            invoiceNumber: invoice.invoiceNumber,
            orderCode: dispatch?.transportOrderCode || "-",
            vehicleType:
              dispatch?.vehicle?.vehicleType?.name ||
              dispatch?.route?.routeType ||
              "-",
            transportUnit: invoice.operator?.name || "-",
            transportRoute: dispatch?.routeName || "-",
            goodsServiceName: "Dịch vụ vận chuyển",
            valueWithoutTax: invoice.subtotal,
            discount: 0, // TODO: Get discount from invoice if available
            vatAmount: invoice.taxAmount,
            paymentMethod:
              dispatch?.paymentMethod
                ? paymentMethodMap[dispatch.paymentMethod] || dispatch.paymentMethod
                : "-",
            transactionTime: invoice.issueDate || invoice.createdAt || "-",
            payer: dispatch?.paymentBy || "-",
            shift,
            paymentType: "Thanh toán trực tiếp", // TODO: Get from invoice or dispatch
            valueWithTax: invoice.totalAmount,
          };
        });

      setData(result);
    } catch (error) {
      console.error("Failed to load invoice data:", error);
      toast.error("Không thể tải dữ liệu. Vui lòng thử lại sau.");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase();
    return data.filter((item) =>
      item.transactionCode.toLowerCase().includes(query) ||
      item.plateNumber.toLowerCase().includes(query) ||
      item.invoiceNumber.toLowerCase().includes(query) ||
      item.orderCode.toLowerCase().includes(query) ||
      item.transportUnit.toLowerCase().includes(query) ||
      item.transportRoute.toLowerCase().includes(query) ||
      item.payer.toLowerCase().includes(query)
    );
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
        "Mã giao dịch": item.transactionCode,
        "Biển kiểm soát": item.plateNumber,
        "Phần trăm thuế": `${item.taxPercentage}%`,
        "Số hóa đơn": item.invoiceNumber,
        "Mã đơn hàng": item.orderCode,
        "Loại xe": item.vehicleType,
        "Đơn vị vận tải": item.transportUnit,
        "Tuyến vận chuyển": item.transportRoute,
        "Tên hàng hóa, dịch vụ": item.goodsServiceName,
        "Giá trị DV chưa có thuế GTGT (đ)": item.valueWithoutTax,
        "Chiết khấu": item.discount,
        "Thuế GTGT (đ)": item.vatAmount,
        "Hình thức thanh toán": item.paymentMethod,
        "Thời gian giao dịch": item.transactionTime !== "-" ? format(new Date(item.transactionTime), "dd/MM/yyyy HH:mm") : "-",
        "Người thanh toán": item.payer,
        "Ca trực": item.shift,
        "Loại thanh toán": item.paymentType,
        "Giá trị thanh toán đã có thuế GTGT (đ)": item.valueWithTax,
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bảng kê hóa đơn");

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 15 },  // Mã giao dịch
        { wch: 15 },  // Biển kiểm soát
        { wch: 12 },  // Phần trăm thuế
        { wch: 15 },  // Số hóa đơn
        { wch: 15 },  // Mã đơn hàng
        { wch: 15 },  // Loại xe
        { wch: 25 },  // Đơn vị vận tải
        { wch: 25 },  // Tuyến vận chuyển
        { wch: 30 },  // Tên hàng hóa, dịch vụ
        { wch: 20 },  // Giá trị DV chưa có thuế GTGT (đ)
        { wch: 15 },  // Chiết khấu
        { wch: 15 },  // Thuế GTGT (đ)
        { wch: 20 },  // Hình thức thanh toán
        { wch: 20 },  // Thời gian giao dịch
        { wch: 20 },  // Người thanh toán
        { wch: 12 },  // Ca trực
        { wch: 20 },  // Loại thanh toán
        { wch: 25 },  // Giá trị thanh toán đã có thuế GTGT (đ)
      ];
      ws['!cols'] = colWidths;

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy");
      const filename = `Bang-ke-hoa-don_${currentDate}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Đã xuất Excel thành công: ${filename}`);
    } catch (error) {
      console.error("Failed to export Excel:", error);
      toast.error("Không thể xuất Excel. Vui lòng thử lại sau.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount);
  };

  const renderTime = (value: string) => {
    if (value === "-" || !value) return "-";
    try {
      return formatVietnamDateTime(value);
    } catch {
      return "-";
    }
  };

  // Sticky column positions (in pixels)
  const STICKY_COLUMN_WIDTH = 150;
  const NON_STICKY_COLUMN_WIDTH = 160; // Average width for non-sticky columns
  
  // Calculate positions: 2 sticky columns on left + 15 non-sticky columns + 1 sticky column on right
  const stickyPositions = {
    transactionCode: 0,
    plateNumber: STICKY_COLUMN_WIDTH,
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
                placeholder="Tìm kiếm mã giao dịch, biển số, hóa đơn, đơn hàng..."
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
            <StickyTable style={{ tableLayout: "fixed", width: "max-content" }}>
              <colgroup>
                <col style={{ width: `${STICKY_COLUMN_WIDTH}px`, minWidth: `${STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${STICKY_COLUMN_WIDTH}px`, minWidth: `${STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${NON_STICKY_COLUMN_WIDTH}px` }} />
                <col style={{ width: `${STICKY_COLUMN_WIDTH}px`, minWidth: `${STICKY_COLUMN_WIDTH}px` }} />
              </colgroup>
              <StickyTableHeader>
                <StickyTableRow className="bg-gray-100">
                  <StickyTableHead
                    sticky
                    stickyLeft={stickyPositions.transactionCode}
                    className="text-center font-semibold bg-gray-100"
                    style={{ width: "150px", minWidth: "150px", backgroundColor: "#f3f4f6" }}
                  >
                    Mã giao dịch
                  </StickyTableHead>
                  <StickyTableHead
                    sticky
                    stickyLeft={stickyPositions.plateNumber}
                    className="text-center font-semibold bg-gray-100"
                    style={{ width: "150px", minWidth: "150px", backgroundColor: "#f3f4f6" }}
                  >
                    Biển kiểm soát
                  </StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Phần trăm thuế</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Số hóa đơn</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Mã đơn hàng</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Loại xe</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Đơn vị vận tải</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Tuyến vận chuyển</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Tên hàng hóa, dịch vụ</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Giá trị DV chưa có thuế GTGT (đ)</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Chiết khấu</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Thuế GTGT (đ)</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Hình thức thanh toán</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Thời gian giao dịch</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Người thanh toán</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Ca trực</StickyTableHead>
                  <StickyTableHead className="text-center font-semibold">Loại thanh toán</StickyTableHead>
                  <StickyTableHead
                    sticky
                    stickyRight={0}
                    className="text-center font-semibold bg-gray-100"
                    style={{ width: "150px", minWidth: "150px", backgroundColor: "#f3f4f6" }}
                  >
                    Giá trị thanh toán đã có thuế GTGT (đ)
                  </StickyTableHead>
                </StickyTableRow>
              </StickyTableHeader>
              <StickyTableBody>
                {isLoading ? (
                  <StickyTableRow>
                    <StickyTableCell colSpan={18} className="text-center text-gray-500">
                      Đang tải dữ liệu...
                    </StickyTableCell>
                  </StickyTableRow>
                ) : filteredData.length === 0 ? (
                  <StickyTableRow>
                    <StickyTableCell colSpan={18} className="text-center text-gray-500">
                      Không có dữ liệu
                    </StickyTableCell>
                  </StickyTableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <StickyTableRow key={`${item.transactionCode}-${index}`}>
                      <StickyTableCell
                        sticky
                        stickyLeft={stickyPositions.transactionCode}
                        className="text-center font-semibold"
                        style={{ width: "150px", minWidth: "150px", backgroundColor: "#ffffff" }}
                      >
                        {item.transactionCode}
                      </StickyTableCell>
                      <StickyTableCell
                        sticky
                        stickyLeft={stickyPositions.plateNumber}
                        className="text-center"
                        style={{ width: "150px", minWidth: "150px", backgroundColor: "#ffffff" }}
                      >
                        {item.plateNumber}
                      </StickyTableCell>
                      <StickyTableCell className="text-center">{item.taxPercentage}%</StickyTableCell>
                      <StickyTableCell className="text-center">{item.invoiceNumber}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.orderCode}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.vehicleType}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.transportUnit}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.transportRoute}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.goodsServiceName}</StickyTableCell>
                      <StickyTableCell className="text-right">{formatCurrency(item.valueWithoutTax)}</StickyTableCell>
                      <StickyTableCell className="text-right">{formatCurrency(item.discount)}</StickyTableCell>
                      <StickyTableCell className="text-right">{formatCurrency(item.vatAmount)}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.paymentMethod}</StickyTableCell>
                      <StickyTableCell className="text-center">{renderTime(item.transactionTime)}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.payer}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.shift}</StickyTableCell>
                      <StickyTableCell className="text-center">{item.paymentType}</StickyTableCell>
                      <StickyTableCell
                        sticky
                        stickyRight={0}
                        className="text-right font-semibold"
                        style={{ width: "150px", minWidth: "150px", backgroundColor: "#ffffff" }}
                      >
                        {formatCurrency(item.valueWithTax)}
                      </StickyTableCell>
                    </StickyTableRow>
                  ))
                )}
              </StickyTableBody>
            </StickyTable>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


