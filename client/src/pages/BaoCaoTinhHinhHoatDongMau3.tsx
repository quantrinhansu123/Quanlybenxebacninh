import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { dispatchService } from "@/services/dispatch.service";
import { useUIStore } from "@/store/ui.store";

interface ReportRowData {
  routeOperator: string;
  theoKeHoach: {
    tongSoXe: number;
    tongSoGhe: number;
    luotXeXuatBen: number;
  };
  thucHien: {
    tongSoXe: number;
    tongSoGhe: number;
    luotXeXuatBen: number;
    luotKhachDiXe: number;
  };
  tyLe: number;
  ghiChu: string;
}

export default function BaoCaoTinhHinhHoatDongMau3() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setTitle = useUIStore((state) => state.setTitle);
  const [isLoading, setIsLoading] = useState(true);
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [data, setData] = useState<ReportRowData[]>([]);
  const [totals, setTotals] = useState<{
    theoKeHoach: ReportRowData["theoKeHoach"];
    thucHien: ReportRowData["thucHien"];
  } | null>(null);

  useEffect(() => {
    setTitle("Báo cáo > Báo cáo tình hình hoạt động (Mẫu 3)");
    
    // Get dates from URL params
    const fromDateParam = searchParams.get("fromDate");
    const toDateParam = searchParams.get("toDate");
    
    if (fromDateParam) {
      const parsedFromDate = new Date(fromDateParam);
      if (!isNaN(parsedFromDate.getTime())) {
        setFromDate(parsedFromDate);
      }
    }
    
    if (toDateParam) {
      const parsedToDate = new Date(toDateParam);
      if (!isNaN(parsedToDate.getTime())) {
        setToDate(parsedToDate);
      }
    }
  }, [setTitle, searchParams]);

  useEffect(() => {
    if (fromDate && toDate) {
      loadData();
    }
  }, [fromDate, toDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get start and end of date range
      const startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);

      // Load all dispatch records
      const dispatchRecords = await dispatchService.getAll();

      // Filter records by date range
      const filteredRecords = dispatchRecords.filter((record) => {
        if (!record.entryTime) return false;
        const recordDate = new Date(record.entryTime);
        return recordDate >= startDate && recordDate <= endDate;
      });

      // Group by route and operator
      const grouped = new Map<string, ReportRowData>();

      filteredRecords.forEach((record) => {
        const routeName = record.routeName || "-";
        const operatorName = record.vehicle?.operator?.name || "-";
        const key = `${routeName}|${operatorName}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            routeOperator: operatorName ? `${routeName} - ${operatorName}` : routeName,
            theoKeHoach: {
              tongSoXe: 0,
              tongSoGhe: 0,
              luotXeXuatBen: 0,
            },
            thucHien: {
              tongSoXe: 0,
              tongSoGhe: 0,
              luotXeXuatBen: 0,
              luotKhachDiXe: 0,
            },
            tyLe: 0,
            ghiChu: "",
          });
        }

        const item = grouped.get(key)!;

        // Calculate THỰC HIỆN (Actual)
        // Tổng số xe - count unique vehicles
        item.thucHien.tongSoXe = 1; // Will be recalculated after grouping

        // Tổng số ghế - seat capacity (from vehicle metadata or default)
        const metadata = (record.metadata || {}) as Record<string, unknown>;
        const seatCount = Number(metadata.seatCount) || record.seatCount || 0;
        item.thucHien.tongSoGhe += seatCount;

        // Lượt xe xuất bến - departure trips
        if (record.exitTime) {
          item.thucHien.luotXeXuatBen += 1;
        }

        // Lượt khách đi xe - passengers departing
        const passengers = record.passengersDeparting || 0;
        item.thucHien.luotKhachDiXe += passengers;
      });

      // Recalculate unique vehicles per route/operator
      const routeOperatorKeys = Array.from(grouped.keys());
      routeOperatorKeys.forEach((key) => {
        const item = grouped.get(key)!;
        const [routeName, operatorName] = key.split("|");
        
        // Count unique vehicles for this route/operator
        const uniqueVehicles = new Set(
          filteredRecords
            .filter((r) => {
              const rRoute = r.routeName || "-";
              const rOperator = r.vehicle?.operator?.name || "-";
              return rRoute === routeName && rOperator === operatorName;
            })
            .map((r) => r.vehicleId)
        );
        
        item.thucHien.tongSoXe = uniqueVehicles.size;
        
        // Calculate Tỷ lệ (%) - percentage of actual vs planned
        // For now, we'll calculate based on actual trips
        if (item.theoKeHoach.luotXeXuatBen > 0) {
          item.tyLe = (item.thucHien.luotXeXuatBen / item.theoKeHoach.luotXeXuatBen) * 100;
        }
      });

      // Convert to array and sort
      const result = Array.from(grouped.values()).sort((a, b) =>
        a.routeOperator.localeCompare(b.routeOperator, "vi")
      );

      setData(result);

      // Calculate totals
      const totalTheoKeHoach = result.reduce(
        (acc, row) => ({
          tongSoXe: acc.tongSoXe + row.theoKeHoach.tongSoXe,
          tongSoGhe: acc.tongSoGhe + row.theoKeHoach.tongSoGhe,
          luotXeXuatBen: acc.luotXeXuatBen + row.theoKeHoach.luotXeXuatBen,
        }),
        { tongSoXe: 0, tongSoGhe: 0, luotXeXuatBen: 0 }
      );

      const totalThucHien = result.reduce(
        (acc, row) => ({
          tongSoXe: acc.tongSoXe + row.thucHien.tongSoXe,
          tongSoGhe: acc.tongSoGhe + row.thucHien.tongSoGhe,
          luotXeXuatBen: acc.luotXeXuatBen + row.thucHien.luotXeXuatBen,
          luotKhachDiXe: acc.luotKhachDiXe + row.thucHien.luotKhachDiXe,
        }),
        { tongSoXe: 0, tongSoGhe: 0, luotXeXuatBen: 0, luotKhachDiXe: 0 }
      );

      setTotals({
        theoKeHoach: totalTheoKeHoach,
        thucHien: totalThucHien,
      });
    } catch (error) {
      console.error("Failed to load report data:", error);
      toast.error("Không thể tải dữ liệu báo cáo");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatNumber = (num: number): string => {
    if (num === 0) return "";
    return num.toLocaleString("vi-VN");
  };

  const formatPercentage = (num: number): string => {
    if (num === 0) return "";
    return `${num.toFixed(1)}%`;
  };

  const dateOnly = format(fromDate, "dd/MM/yyyy");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print controls - hidden when printing */}
      <div className="no-print p-4 bg-gray-50 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            In báo cáo
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="report-content w-full mx-auto bg-white p-[15mm] print:p-[10mm]">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="text-center flex-1">
              <p className="font-semibold text-sm">Công ty CP Bố Hạ</p>
            </div>
            <div className="flex flex-col items-center flex-1">
              <p className="font-semibold text-sm uppercase text-center">
                CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </p>
              <p className="text-sm italic text-center">Độc lập - Tự do - Hạnh phúc</p>
            </div>
          </div>
          <p className="text-right text-sm mb-4">
            Thành phố Hồ Chí Minh, ngày {dateOnly}
          </p>
          <h1 className="text-center font-bold text-lg uppercase mb-6">
            BÁO CÁO TÌNH HÌNH HOẠT ĐỘNG CÁC TUYẾN VẬN TẢI HÀNH KHÁCH
            <br />
            TỪ NGÀY {format(fromDate, "dd/MM/yyyy", { locale: vi }).toUpperCase()} ĐẾN NGÀY{" "}
            {format(toDate, "dd/MM/yyyy", { locale: vi }).toUpperCase()}
          </h1>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs" style={{ minWidth: '100%' }}>
            <colgroup>
              <col className="print-col-tt" />
              <col className="print-col-route" />
              <col className="print-col-data" />
              <col className="print-col-data" />
              <col className="print-col-data" />
              <col className="print-col-data" />
              <col className="print-col-data" />
              <col className="print-col-data" />
              <col className="print-col-data" />
              <col className="print-col-percent" />
              <col className="print-col-note" />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={3} className="border border-black p-2 bg-gray-100 font-semibold w-16">
                  TT
                </th>
                <th rowSpan={3} className="border border-black p-2 bg-gray-100 font-semibold min-w-[250px]">
                  Tuyến/đơn vị vận tải
                </th>
                <th colSpan={3} className="border border-black p-2 bg-gray-100 font-semibold">
                  Theo kế hoạch
                </th>
                <th colSpan={4} className="border border-black p-2 bg-gray-100 font-semibold">
                  Thực hiện
                </th>
                <th rowSpan={3} className="border border-black p-2 bg-gray-100 font-semibold min-w-[80px]">
                  Tỷ lệ (%) số nốt (tải) thực hiện trong tháng
                </th>
                <th rowSpan={3} className="border border-black p-2 bg-gray-100 font-semibold min-w-[180px]">
                  Ghi chú số nốt tài hoạt động trong ngày
                </th>
              </tr>
              <tr>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[70px]">
                  Tổng số xe (xe)
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[70px]">
                  Tổng số ghế (ghế xe)
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[80px]">
                  Lượt xe xuất bến (lượt)
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[70px]">
                  Tổng số xe (xe)
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[70px]">
                  Tổng số ghế (ghế xe)
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[80px]">
                  Lượt xe xuất bến (lượt)
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[80px]">
                  Lượt khách đi xe (khách)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  <td className="border border-black p-2 text-center">
                    {index + 1}
                  </td>
                  <td className="border border-black p-2">{row.routeOperator}</td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.theoKeHoach.tongSoXe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.theoKeHoach.tongSoGhe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.theoKeHoach.luotXeXuatBen)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.thucHien.tongSoXe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.thucHien.tongSoGhe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.thucHien.luotXeXuatBen)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.thucHien.luotKhachDiXe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatPercentage(row.tyLe)}
                  </td>
                  <td className="border border-black p-2">{row.ghiChu}</td>
                </tr>
              ))}
              {/* Total Row */}
              {totals && (
                <tr className="font-semibold bg-gray-50">
                  <td colSpan={2} className="border border-black p-2 text-center">
                    TỔNG CỘNG
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.theoKeHoach.tongSoXe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.theoKeHoach.tongSoGhe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.theoKeHoach.luotXeXuatBen)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.thucHien.tongSoXe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.thucHien.tongSoGhe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.thucHien.luotXeXuatBen)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.thucHien.luotKhachDiXe)}
                  </td>
                  <td className="border border-black p-2 text-right"></td>
                  <td className="border border-black p-2"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-6 space-y-4">
          <div className="text-sm">
            <p>
              <strong>Ghi chú:</strong> Số liệu cuối kỳ là danh sách của tháng sau
            </p>
            <p className="mt-2">
              <strong>Nơi nhận:</strong>
            </p>
            <p>- P.KHĐT;</p>
            <p>- Lưu VT (s).</p>
          </div>
          <div className="flex justify-end items-end mt-8">
            <div className="text-center">
              <p className="font-semibold mb-12">GIÁM ĐỐC</p>
              <p className="text-sm italic">(Ký, ghi rõ họ tên)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          
          /* Hide all elements except report content */
          body * {
            visibility: hidden;
          }
          
          /* Show only report content and its children */
          .report-content,
          .report-content * {
            visibility: visible !important;
          }
          
          /* Hide print controls and other UI elements */
          .no-print,
          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Position report content at top of page */
          .report-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            background: white !important;
            page-break-inside: avoid;
            font-size: 11px !important;
          }
          
          /* Header text sizes */
          .report-content h1 {
            font-size: 14px !important;
            line-height: 1.3 !important;
          }
          
          .report-content p {
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          
          /* Table styles */
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          
          /* Force table to respect colgroup widths */
          colgroup col {
            width: inherit !important;
          }
          
          /* Remove any inline styles that might interfere */
          table[style] {
            min-width: 100% !important;
          }
          
          /* Override all Tailwind classes when printing */
          th[class*="min-w"],
          td[class*="min-w"],
          th[class*="w-"],
          td[class*="w-"] {
            min-width: 0 !important;
            width: auto !important;
          }
          
          /* Use colgroup for column widths when printing */
          col.print-col-tt {
            width: 2.5% !important;
          }
          
          col.print-col-route {
            width: 12% !important;
          }
          
          col.print-col-data {
            width: 7% !important;
          }
          
          col.print-col-percent {
            width: 8% !important;
          }
          
          col.print-col-note {
            width: 8% !important;
          }
          
          /* Column widths - compact when printing */
          th:first-child,
          td:first-child {
            width: 2.5% !important;
            min-width: 0 !important;
            max-width: 2.5% !important;
          }
          
          th:nth-child(2),
          td:nth-child(2) {
            width: 12% !important;
            min-width: 0 !important;
            max-width: 12% !important;
          }
          
          /* Theo kế hoạch columns (3-5) */
          th:nth-child(3),
          td:nth-child(3),
          th:nth-child(4),
          td:nth-child(4),
          th:nth-child(5),
          td:nth-child(5) {
            width: 7% !important;
            min-width: 0 !important;
            max-width: 7% !important;
          }
          
          /* Thực hiện columns (6-9) */
          th:nth-child(6),
          td:nth-child(6),
          th:nth-child(7),
          td:nth-child(7),
          th:nth-child(8),
          td:nth-child(8),
          th:nth-child(9),
          td:nth-child(9) {
            width: 7% !important;
            min-width: 0 !important;
            max-width: 7% !important;
          }
          
          /* Tỷ lệ column (10) */
          th:nth-child(10),
          td:nth-child(10) {
            width: 8% !important;
            min-width: 0 !important;
            max-width: 8% !important;
          }
          
          /* GHI CHÚ column (11) */
          th:nth-child(11),
          td:nth-child(11) {
            width: 8% !important;
            min-width: 0 !important;
            max-width: 8% !important;
          }
          
          th, td {
            white-space: normal !important;
            border: 1px solid black !important;
            padding: 2px 3px !important;
            font-size: 11px !important;
            overflow: visible !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            line-height: 1.2 !important;
          }
          
          /* Ensure proper spacing */
          .report-content > * {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

