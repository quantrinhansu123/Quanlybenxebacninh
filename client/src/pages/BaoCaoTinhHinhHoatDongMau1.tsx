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
  thucHien: {
    luotXe: number;
    taiTrong: number;
    lePhi: number;
    hoaHong: number;
    luuDau: number;
    doanhThu: number;
  };
  truyThu: {
    luotXe: number;
    taiTrong: number;
    lePhi: number;
    hoaHong: number;
    doanhThu: number;
  };
  veBanThucTe: number;
  ghiChu: string;
}

export default function BaoCaoTinhHinhHoatDongMau1() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setTitle = useUIStore((state) => state.setTitle);
  const [isLoading, setIsLoading] = useState(true);
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [data, setData] = useState<ReportRowData[]>([]);
  const [totals, setTotals] = useState<{
    thucHien: ReportRowData["thucHien"];
    truyThu: ReportRowData["truyThu"];
    veBanThucTe: number;
  } | null>(null);

  useEffect(() => {
    setTitle("Báo cáo > Báo cáo tình hình hoạt động (Mẫu 1)");
    
    // Get date from URL params or use today
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        setReportDate(parsedDate);
      }
    }
  }, [setTitle, searchParams]);

  useEffect(() => {
    if (reportDate) {
      loadData();
    }
  }, [reportDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get start and end of the selected date
      const startDate = new Date(reportDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(reportDate);
      endDate.setHours(23, 59, 59, 999);

      // Load all dispatch records
      const dispatchRecords = await dispatchService.getAll();

      // Filter records by date
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
            thucHien: {
              luotXe: 0,
              taiTrong: 0,
              lePhi: 0,
              hoaHong: 0,
              luuDau: 0,
              doanhThu: 0,
            },
            truyThu: {
              luotXe: 0,
              taiTrong: 0,
              lePhi: 0,
              hoaHong: 0,
              doanhThu: 0,
            },
            veBanThucTe: 0,
            ghiChu: "",
          });
        }

        const item = grouped.get(key)!;

        // Extract metadata and fees
        const metadata = (record.metadata || {}) as Record<string, unknown>;
        const fees = (metadata.fees || {}) as Record<string, unknown>;
        const paymentAmount = record.paymentAmount || 0;

        // Calculate THỰC HIỆN (Performed)
        // Lượt xe - vehicle trips
        item.thucHien.luotXe += 1;

        // Tải trọng - load capacity (from vehicle or metadata)
        const loadCapacity = Number(metadata.loadCapacity) || 0;
        item.thucHien.taiTrong += loadCapacity;

        // Lệ phí - fees (ra vào bến, lưu bến, etc.)
        const lePhi = Number(fees.raVaoBen) || Number(fees.luuBen) || 0;
        item.thucHien.lePhi += lePhi;

        // Hoa hồng - commission
        const hoaHong = Number(fees.hoaHongVe) || 0;
        item.thucHien.hoaHong += hoaHong;

        // Lưu đậu - parking/waiting fee
        const luuDau = Number(fees.luuBen) || Number(fees.dauDem) || 0;
        item.thucHien.luuDau += luuDau;

        // Doanh thu - revenue
        item.thucHien.doanhThu += paymentAmount;

        // Calculate TRUY THU (Collected/Retroactive)
        // Truy thu chuyến - retroactive charge per trip
        const truyThuChuyen = Number(fees.truyThuChuyen) || 0;
        if (truyThuChuyen > 0) {
          item.truyThu.luotXe += 1;
          item.truyThu.lePhi += truyThuChuyen;
          item.truyThu.doanhThu += truyThuChuyen;
        }

        // Truy thu tháng - retroactive monthly charge
        const truyThuThang = Number(fees.truyThuThang) || 0;
        if (truyThuThang > 0) {
          item.truyThu.lePhi += truyThuThang;
          item.truyThu.hoaHong += Number(fees.hhTruyThuThang) || 0;
          item.truyThu.doanhThu += truyThuThang;
        }

        // VÉ BÁN THỰC TẾ - actual tickets sold
        const ticketsSold = record.passengersDeparting || 0;
        item.veBanThucTe += ticketsSold;
      });

      // Convert to array and sort
      const result = Array.from(grouped.values()).sort((a, b) =>
        a.routeOperator.localeCompare(b.routeOperator, "vi")
      );

      setData(result);

      // Calculate totals
      const totalThucHien = result.reduce(
        (acc, row) => ({
          luotXe: acc.luotXe + row.thucHien.luotXe,
          taiTrong: acc.taiTrong + row.thucHien.taiTrong,
          lePhi: acc.lePhi + row.thucHien.lePhi,
          hoaHong: acc.hoaHong + row.thucHien.hoaHong,
          luuDau: acc.luuDau + row.thucHien.luuDau,
          doanhThu: acc.doanhThu + row.thucHien.doanhThu,
        }),
        { luotXe: 0, taiTrong: 0, lePhi: 0, hoaHong: 0, luuDau: 0, doanhThu: 0 }
      );

      const totalTruyThu = result.reduce(
        (acc, row) => ({
          luotXe: acc.luotXe + row.truyThu.luotXe,
          taiTrong: acc.taiTrong + row.truyThu.taiTrong,
          lePhi: acc.lePhi + row.truyThu.lePhi,
          hoaHong: acc.hoaHong + row.truyThu.hoaHong,
          doanhThu: acc.doanhThu + row.truyThu.doanhThu,
        }),
        { luotXe: 0, taiTrong: 0, lePhi: 0, hoaHong: 0, doanhThu: 0 }
      );

      const totalVeBanThucTe = result.reduce(
        (acc, row) => acc + row.veBanThucTe,
        0
      );

      setTotals({
        thucHien: totalThucHien,
        truyThu: totalTruyThu,
        veBanThucTe: totalVeBanThucTe,
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

  const dateOnly = format(reportDate, "dd/MM/yyyy");

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
            NGÀY {format(reportDate, "dd 'THÁNG' MM 'NĂM' yyyy", {
              locale: vi,
            }).toUpperCase()}
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
              <col className="print-col-data" />
              <col className="print-col-data" />
              <col className="print-col-data" />
              <col className="print-col-data" />
              <col className="print-col-ticket" />
              <col className="print-col-note" />
            </colgroup>
            <thead>
              <tr>
                <th
                  rowSpan={3}
                  className="border border-black p-2 bg-gray-100 font-semibold w-16"
                >
                  TT
                </th>
                <th
                  rowSpan={3}
                  className="border border-black p-2 bg-gray-100 font-semibold min-w-[250px]"
                >
                  Tuyến/đơn vị vận tải
                </th>
                <th
                  colSpan={6}
                  className="border border-black p-2 bg-gray-100 font-semibold"
                >
                  THỰC HIỆN
                </th>
                <th
                  colSpan={5}
                  className="border border-black p-2 bg-gray-100 font-semibold"
                >
                  TRUY THU
                </th>
                <th
                  rowSpan={3}
                  className="border border-black p-2 bg-gray-100 font-semibold min-w-[80px]"
                >
                  VÉ BÁN THỰC TẾ
                </th>
                <th
                  rowSpan={3}
                  className="border border-black p-2 bg-gray-100 font-semibold min-w-[180px]"
                >
                  GHI CHÚ
                </th>
              </tr>
              <tr>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[70px]">
                  Lượt xe
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[70px]">
                  Tải trọng
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[80px]">
                  Lệ phí
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[80px]">
                  Hoa hồng
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[80px]">
                  Lưu đậu
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[90px]">
                  Doanh thu
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[70px]">
                  Lượt xe
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[70px]">
                  Tải trọng
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[80px]">
                  Lệ phí
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[80px]">
                  Hoa hồng
                </th>
                <th className="border border-black p-1 bg-gray-100 font-semibold min-w-[90px]">
                  Doanh thu
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
                    {formatNumber(row.thucHien.luotXe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.thucHien.taiTrong)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.thucHien.lePhi)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.thucHien.hoaHong)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.thucHien.luuDau)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.thucHien.doanhThu)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.truyThu.luotXe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.truyThu.taiTrong)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.truyThu.lePhi)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.truyThu.hoaHong)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.truyThu.doanhThu)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(row.veBanThucTe)}
                  </td>
                  <td className="border border-black p-2">{row.ghiChu}</td>
                </tr>
              ))}
              {/* Total Row */}
              {totals && (
                <tr className="font-semibold bg-gray-50">
                  <td
                    colSpan={2}
                    className="border border-black p-2 text-center"
                  >
                    TỔNG CỘNG
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.thucHien.luotXe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.thucHien.taiTrong)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.thucHien.lePhi)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.thucHien.hoaHong)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.thucHien.luuDau)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.thucHien.doanhThu)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.truyThu.luotXe)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.truyThu.taiTrong)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.truyThu.lePhi)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.truyThu.hoaHong)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.truyThu.doanhThu)}
                  </td>
                  <td className="border border-black p-2 text-right">
                    {formatNumber(totals.veBanThucTe)}
                  </td>
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
              <strong>Ghi chú:</strong> Lượt xe: {totals?.thucHien.luotXe || 0}
              , lượt khách: {totals?.veBanThucTe || 0}, Lưu đậu:{" "}
              {formatNumber(totals?.thucHien.luuDau || 0)}, doanh thu:{" "}
              {formatNumber(totals?.thucHien.doanhThu || 0)}
            </p>
          </div>
          <div className="flex justify-between items-end mt-8">
            <div className="text-center">
              <p className="font-semibold mb-12">TỔ THU NGÂN</p>
              <p className="text-sm italic">(Ký, ghi rõ họ tên)</p>
            </div>
            <div className="text-center">
              <p className="font-semibold mb-12">TỔ BÁN VÉ</p>
              <p className="text-sm italic">(Ký, ghi rõ họ tên)</p>
            </div>
            <div className="text-center">
              <p className="font-semibold mb-12">ĐỘI ĐIỀU HÀNH</p>
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
            width: 8% !important;
          }
          
          col.print-col-data {
            width: 6% !important;
          }
          
          col.print-col-ticket {
            width: 3% !important;
          }
          
          col.print-col-note {
            width: 3% !important;
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
            width: 8% !important;
            min-width: 0 !important;
            max-width: 8% !important;
          }
          
          /* THỰC HIỆN columns (3-8) */
          th:nth-child(3),
          td:nth-child(3),
          th:nth-child(4),
          td:nth-child(4),
          th:nth-child(5),
          td:nth-child(5),
          th:nth-child(6),
          td:nth-child(6),
          th:nth-child(7),
          td:nth-child(7),
          th:nth-child(8),
          td:nth-child(8) {
            width: 6% !important;
            min-width: 0 !important;
            max-width: 6% !important;
          }
          
          /* TRUY THU columns (9-13) */
          th:nth-child(9),
          td:nth-child(9),
          th:nth-child(10),
          td:nth-child(10),
          th:nth-child(11),
          td:nth-child(11),
          th:nth-child(12),
          td:nth-child(12),
          th:nth-child(13),
          td:nth-child(13) {
            width: 6% !important;
            min-width: 0 !important;
            max-width: 6% !important;
          }
          
          /* VÉ BÁN THỰC TẾ column (14) */
          th:nth-child(14),
          td:nth-child(14) {
            width: 3% !important;
            min-width: 0 !important;
            max-width: 3% !important;
          }
          
          /* GHI CHÚ column (15) */
          th:nth-child(15),
          td:nth-child(15) {
            width: 3% !important;
            min-width: 0 !important;
            max-width: 3% !important;
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
          
          /* Allow text wrapping for all columns */
          th:nth-child(2),
          td:nth-child(2) {
            white-space: normal !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
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

