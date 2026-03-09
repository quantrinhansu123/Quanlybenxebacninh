import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { dispatchService } from "@/services/dispatch.service";
import { useUIStore } from "@/store/ui.store";

interface RevenueRowData {
  routeName: string;
  vehicle: string;
  // Quantity - Load capacity
  loadCapacitySeats: number;
  loadCapacityBeds: number;
  // Quantity - Passengers
  passengersSeats: number;
  passengersBeds: number;
  // Unit Price - Vehicle entry/exit service
  unitPriceEntryExitSeats: number;
  unitPriceEntryExitBeds: number;
  // Unit Price - Ticket sales service
  unitPriceTicketSeats: number;
  unitPriceTicketBeds: number;
  // Amount (with VAT)
  amountEntryExit: number; // Column 12: = 4 * 8 + 5 * 9
  amountTicketSales: number; // Column 13: = 4 * 10 + 5 * 11
  amountHalfDayParking: number; // Column 14
  amountFullDayParking: number; // Column 15
  // Total (with VAT)
  totalWithVAT: number; // Column 16: = 12 + 13 + 14 + 15
  // Revenue (without VAT)
  revenueWithoutVAT: number; // Column 17: = 16 / 1.1
  // VAT Tax
  vatTax: number; // Column 18: = 17 * 10%
}

export default function BangKeDoanhThu() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setTitle = useUIStore((state) => state.setTitle);
  const [isLoading, setIsLoading] = useState(true);
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [data, setData] = useState<RevenueRowData[]>([]);
  const [totals, setTotals] = useState<RevenueRowData | null>(null);

  useEffect(() => {
    setTitle("Báo cáo > Bảng kê doanh thu");
    
    // Get date from URL params
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
      // Get start and end of the report date
      const startDate = new Date(reportDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(reportDate);
      endDate.setHours(23, 59, 59, 999);

      // Load all dispatch records for the date
      const dispatchRecords = await dispatchService.getAll();

      // Filter records by date range
      const filteredRecords = dispatchRecords.filter((record) => {
        if (!record.entryTime) return false;
        const recordDate = new Date(record.entryTime);
        return recordDate >= startDate && recordDate <= endDate;
      });

      // Group by route and vehicle
      const grouped = new Map<string, RevenueRowData>();

      filteredRecords.forEach((record) => {
        const routeName = record.routeName || "-";
        const vehiclePlate = record.vehiclePlateNumber || "-";
        const key = `${routeName}|${vehiclePlate}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            routeName,
            vehicle: vehiclePlate,
            loadCapacitySeats: 0,
            loadCapacityBeds: 0,
            passengersSeats: 0,
            passengersBeds: 0,
            unitPriceEntryExitSeats: 0,
            unitPriceEntryExitBeds: 0,
            unitPriceTicketSeats: 0,
            unitPriceTicketBeds: 0,
            amountEntryExit: 0,
            amountTicketSales: 0,
            amountHalfDayParking: 0,
            amountFullDayParking: 0,
            totalWithVAT: 0,
            revenueWithoutVAT: 0,
            vatTax: 0,
          });
        }

        const item = grouped.get(key)!;

        // Get vehicle type from metadata or vehicle info
        const metadata = (record.metadata || {}) as Record<string, unknown>;
        const seatCount = Number(metadata.seatCount) || record.seatCount || 0;
        const vehicleType = String(metadata.vehicleType || "seat"); // "seat" or "bed"

        // Set load capacity based on vehicle type
        if (vehicleType === "bed") {
          item.loadCapacityBeds = seatCount;
        } else {
          item.loadCapacitySeats = seatCount;
        }

        // Set passengers based on departing passengers
        const passengers = record.passengersDeparting || 0;
        if (vehicleType === "bed") {
          item.passengersBeds += passengers;
        } else {
          item.passengersSeats += passengers;
        }

        // Unit prices (these would typically come from pricing configuration)
        // For now, using default values - in production, fetch from service charges
        item.unitPriceEntryExitSeats = item.unitPriceEntryExitSeats || 50000; // Default price
        item.unitPriceEntryExitBeds = item.unitPriceEntryExitBeds || 70000;
        item.unitPriceTicketSeats = item.unitPriceTicketSeats || 10000;
        item.unitPriceTicketBeds = item.unitPriceTicketBeds || 15000;

        // Calculate amounts
        // Column 12: Amount Entry/Exit = Load Seats * Unit Price Entry/Exit Seats + Load Beds * Unit Price Entry/Exit Beds
        item.amountEntryExit =
          item.loadCapacitySeats * item.unitPriceEntryExitSeats +
          item.loadCapacityBeds * item.unitPriceEntryExitBeds;

        // Column 13: Amount Ticket Sales = Load Seats * Unit Price Ticket Seats + Load Beds * Unit Price Ticket Beds
        item.amountTicketSales =
          item.loadCapacitySeats * item.unitPriceTicketSeats +
          item.loadCapacityBeds * item.unitPriceTicketBeds;

        // Parking fees (if applicable) - would need additional data
        // For now, defaulting to 0
        item.amountHalfDayParking = 0;
        item.amountFullDayParking = 0;

        // Column 16: Total (with VAT) = 12 + 13 + 14 + 15
        item.totalWithVAT =
          item.amountEntryExit +
          item.amountTicketSales +
          item.amountHalfDayParking +
          item.amountFullDayParking;

        // Column 17: Revenue (without VAT) = 16 / 1.1
        item.revenueWithoutVAT = item.totalWithVAT / 1.1;

        // Column 18: VAT Tax = 17 * 10%
        item.vatTax = item.revenueWithoutVAT * 0.1;
      });

      // Convert to array and sort
      const result = Array.from(grouped.values()).sort((a, b) => {
        const routeCompare = a.routeName.localeCompare(b.routeName, "vi");
        if (routeCompare !== 0) return routeCompare;
        return a.vehicle.localeCompare(b.vehicle, "vi");
      });

      setData(result);

      // Calculate totals
      const total = result.reduce(
        (acc, row) => ({
          routeName: "",
          vehicle: "",
          loadCapacitySeats: acc.loadCapacitySeats + row.loadCapacitySeats,
          loadCapacityBeds: acc.loadCapacityBeds + row.loadCapacityBeds,
          passengersSeats: acc.passengersSeats + row.passengersSeats,
          passengersBeds: acc.passengersBeds + row.passengersBeds,
          unitPriceEntryExitSeats: 0,
          unitPriceEntryExitBeds: 0,
          unitPriceTicketSeats: 0,
          unitPriceTicketBeds: 0,
          amountEntryExit: acc.amountEntryExit + row.amountEntryExit,
          amountTicketSales: acc.amountTicketSales + row.amountTicketSales,
          amountHalfDayParking: acc.amountHalfDayParking + row.amountHalfDayParking,
          amountFullDayParking: acc.amountFullDayParking + row.amountFullDayParking,
          totalWithVAT: acc.totalWithVAT + row.totalWithVAT,
          revenueWithoutVAT: acc.revenueWithoutVAT + row.revenueWithoutVAT,
          vatTax: acc.vatTax + row.vatTax,
        }),
        {
          routeName: "",
          vehicle: "",
          loadCapacitySeats: 0,
          loadCapacityBeds: 0,
          passengersSeats: 0,
          passengersBeds: 0,
          unitPriceEntryExitSeats: 0,
          unitPriceEntryExitBeds: 0,
          unitPriceTicketSeats: 0,
          unitPriceTicketBeds: 0,
          amountEntryExit: 0,
          amountTicketSales: 0,
          amountHalfDayParking: 0,
          amountFullDayParking: 0,
          totalWithVAT: 0,
          revenueWithoutVAT: 0,
          vatTax: 0,
        }
      );

      setTotals(total);
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
    return Math.round(num).toLocaleString("vi-VN");
  };

  const formatCurrency = (num: number): string => {
    if (num === 0) return "";
    return Math.round(num).toLocaleString("vi-VN");
  };

  const dateStr = format(reportDate, "dd/MM/yyyy");
  const dateRangeStr = `(Từ 00:00:00 ngày ${dateStr} đến 23:59:59 ngày ${dateStr})`;

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
          <div className="text-center mb-2">
            <p className="font-semibold text-sm">Công ty CP</p>
            <p className="font-semibold text-sm">Bố Hạ</p>
          </div>
          <h1 className="text-center font-bold text-base uppercase mb-2">
            BẢNG KÊ DOANH THU XE KHÁCH NGÀY {format(reportDate, "dd").toUpperCase()} THÁNG{" "}
            {format(reportDate, "MM").toUpperCase()} NĂM {format(reportDate, "yyyy").toUpperCase()}
          </h1>
          <p className="text-center text-sm mb-6">{dateRangeStr}</p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-sm" style={{ minWidth: "100%" }}>
            <thead>
              <tr>
                <th rowSpan={3} className="border border-black p-1 bg-gray-100 font-semibold">
                  STT
                </th>
                <th rowSpan={3} className="border border-black p-1 bg-gray-100 font-semibold">
                  Tên tuyến
                </th>
                <th rowSpan={3} className="border border-black p-1 bg-gray-100 font-semibold">
                  Xe
                </th>
                <th colSpan={4} className="border border-black p-1 bg-gray-100 font-semibold">
                  Số lượng
                </th>
                <th colSpan={4} className="border border-black p-1 bg-gray-100 font-semibold">
                  Đơn giá
                </th>
                <th colSpan={4} className="border border-black p-1 bg-gray-100 font-semibold">
                  Thành tiền (có VAT)
                </th>
                <th rowSpan={3} className="border border-black p-1 bg-gray-100 font-semibold">
                  Tổng cộng (có VAT)
                </th>
                <th rowSpan={3} className="border border-black p-1 bg-gray-100 font-semibold">
                  Doanh thu (chưa có VAT)
                </th>
                <th rowSpan={3} className="border border-black p-1 bg-gray-100 font-semibold">
                  Thuế GTGT
                </th>
              </tr>
              <tr>
                <th colSpan={2} className="border border-black p-1 bg-gray-100 font-semibold">
                  Tải trọng
                </th>
                <th colSpan={2} className="border border-black p-1 bg-gray-100 font-semibold">
                  Hành khách
                </th>
                <th colSpan={2} className="border border-black p-1 bg-gray-100 font-semibold">
                  DV xe ra vào bến
                </th>
                <th colSpan={2} className="border border-black p-1 bg-gray-100 font-semibold">
                  DV bán vé
                </th>
                <th rowSpan={2} className="border border-black p-1 bg-gray-100 font-semibold">
                  DV xe ra vào bến
                </th>
                <th rowSpan={2} className="border border-black p-1 bg-gray-100 font-semibold">
                  DV bán vé
                </th>
                <th rowSpan={2} className="border border-black p-1 bg-gray-100 font-semibold">
                  Lưu đậu 1/2 ngày
                </th>
                <th rowSpan={2} className="border border-black p-1 bg-gray-100 font-semibold">
                  Lưu đậu ngày
                </th>
              </tr>
              <tr>
                <th className="border border-black p-1 bg-gray-100 font-semibold">Ghế</th>
                <th className="border border-black p-1 bg-gray-100 font-semibold">Giường</th>
                <th className="border border-black p-1 bg-gray-100 font-semibold">Ghế</th>
                <th className="border border-black p-1 bg-gray-100 font-semibold">Giường</th>
                <th className="border border-black p-1 bg-gray-100 font-semibold">Ghế</th>
                <th className="border border-black p-1 bg-gray-100 font-semibold">Giường</th>
                <th className="border border-black p-1 bg-gray-100 font-semibold">Ghế</th>
                <th className="border border-black p-1 bg-gray-100 font-semibold">Giường</th>
              </tr>
              <tr>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">1</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">2</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">3</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">4</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">5</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">6</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">7</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">8</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">9</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">10</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">11</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">12=4*8+5*9</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">13=4*10+5*11</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">14</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">15</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">16=12+13+14+15</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">17=16/1,1</th>
                <th className="border border-black p-1 text-center bg-gray-50 italic text-xs">18=17*10%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  <td className="border border-black p-1 text-center">{index + 1}</td>
                  <td className="border border-black p-1">{row.routeName}</td>
                  <td className="border border-black p-1">{row.vehicle}</td>
                  <td className="border border-black p-1 text-right">
                    {formatNumber(row.loadCapacitySeats)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatNumber(row.loadCapacityBeds)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatNumber(row.passengersSeats)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatNumber(row.passengersBeds)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(row.unitPriceEntryExitSeats)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(row.unitPriceEntryExitBeds)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(row.unitPriceTicketSeats)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(row.unitPriceTicketBeds)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(row.amountEntryExit)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(row.amountTicketSales)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(row.amountHalfDayParking)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(row.amountFullDayParking)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(row.totalWithVAT)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(row.revenueWithoutVAT)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(row.vatTax)}
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              {totals && (
                <tr className="font-semibold bg-gray-50">
                  <td colSpan={2} className="border border-black p-1 text-center">
                    TỔNG CỘNG
                  </td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-right">
                    {formatNumber(totals.loadCapacitySeats)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatNumber(totals.loadCapacityBeds)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatNumber(totals.passengersSeats)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatNumber(totals.passengersBeds)}
                  </td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(totals.amountEntryExit)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(totals.amountTicketSales)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(totals.amountHalfDayParking)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(totals.amountFullDayParking)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(totals.totalWithVAT)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(totals.revenueWithoutVAT)}
                  </td>
                  <td className="border border-black p-1 text-right">
                    {formatCurrency(totals.vatTax)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer - Signatures */}
        <div className="mt-8 flex justify-around items-end">
          <div className="text-center">
            <p className="font-semibold mb-12">BẢO VỆ</p>
            <p className="text-xs italic">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="text-center">
            <p className="font-semibold mb-12">ĐIỀU HÀNH</p>
            <p className="text-xs italic">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="text-center">
            <p className="font-semibold mb-12">THU NGÂN</p>
            <p className="text-xs italic">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="text-center">
            <p className="font-semibold mb-12">GIÁM ĐỐC</p>
            <p className="text-xs italic">(Ký, ghi rõ họ tên)</p>
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
          
          body * {
            visibility: hidden;
          }
          
          .report-content,
          .report-content * {
            visibility: visible !important;
          }
          
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          
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
            font-size: 10px !important;
          }
          
          .report-content h1 {
            font-size: 12px !important;
            line-height: 1.3 !important;
          }
          
          .report-content p {
            font-size: 10px !important;
            line-height: 1.3 !important;
          }
          
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 9px !important;
          }
          
          th, td {
            white-space: normal !important;
            border: 1px solid black !important;
            padding: 2px 3px !important;
            font-size: 9px !important;
            overflow: visible !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            line-height: 1.2 !important;
          }
          
          .report-content > * {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

