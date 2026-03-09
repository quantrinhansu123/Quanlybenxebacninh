import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Download } from "lucide-react";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/DatePicker";
import { useUIStore } from "@/store/ui.store";
import { format } from "date-fns";

export default function LapBaoCao() {
  const navigate = useNavigate();
  const setTitle = useUIStore((state) => state.setTitle);
  const [fromDate, setFromDate] = useState<Date | null>(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [toDate, setToDate] = useState<Date | null>(() => {
    const date = new Date();
    date.setHours(23, 59, 59);
    return date;
  });
  const [hideInactive, setHideInactive] = useState(true);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  useEffect(() => {
    setTitle("Báo cáo > Lập báo cáo");
  }, [setTitle]);

  const handleGenerateReport = async (reportType: string) => {
    if (!fromDate || !toDate) {
      toast.error("Vui lòng chọn đầy đủ từ ngày và đến ngày");
      return;
    }

    if (fromDate > toDate) {
      toast.error("Từ ngày không được lớn hơn đến ngày");
      return;
    }

    setIsGenerating(reportType);
    try {
      // Navigate to report page based on type
      if (reportType === "bao-cao-tinh-hinh-hoat-dong-mau-1") {
        // For single day reports, use fromDate
        const reportDate = format(fromDate, "yyyy-MM-dd");
        navigate(`/bao-cao/tinh-hinh-hoat-dong-mau-1?date=${reportDate}`);
        return;
      }
      
      if (reportType === "bao-cao-tinh-hinh-hoat-dong-mau-3") {
        // For date range reports
        const fromDateStr = format(fromDate, "yyyy-MM-dd");
        const toDateStr = format(toDate, "yyyy-MM-dd");
        navigate(`/bao-cao/tinh-hinh-hoat-dong-mau-3?fromDate=${fromDateStr}&toDate=${toDateStr}`);
        return;
      }
      
      if (reportType === "bang-ke-doanh-thu") {
        // For single day revenue statement, use fromDate
        const reportDate = format(fromDate, "yyyy-MM-dd");
        navigate(`/bao-cao/bang-ke-doanh-thu?date=${reportDate}`);
        return;
      }
      
      if (reportType === "bang-ke-doanh-thu-02-rut-gon") {
        // For single day revenue statement (simplified version), use fromDate
        const reportDate = format(fromDate, "yyyy-MM-dd");
        navigate(`/bao-cao/bang-ke-doanh-thu-02-rut-gon?date=${reportDate}`);
        return;
      }
      
      // TODO: Implement other report types
      // For now, simulate API call for other types
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      toast.success(`Đã tạo báo cáo ${reportType} thành công`);
      
      // In a real implementation, you would:
      // 1. Call the API with fromDate, toDate, hideInactive
      // 2. Download the generated file
      // Example:
      // const response = await reportService.generateReport({
      //   type: reportType,
      //   fromDate: fromDate.toISOString(),
      //   toDate: toDate.toISOString(),
      //   hideInactive
      // });
      // const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      // const url = window.URL.createObjectURL(blob);
      // const link = document.createElement('a');
      // link.href = url;
      // link.download = `${reportType}_${format(fromDate, 'dd-MM-yyyy')}_${format(toDate, 'dd-MM-yyyy')}.xlsx`;
      // link.click();
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Không thể tạo báo cáo. Vui lòng thử lại sau.");
    } finally {
      setIsGenerating(null);
    }
  };

  const reportTypes = [
    {
      id: "bao-cao-tinh-hinh-hoat-dong-mau-1",
      title: "BÁO CÁO TÌNH HÌNH HOẠT ĐỘNG (MẪU 1)",
      description: "Báo cáo tổng hợp tình hình hoạt động theo mẫu 1",
    },
    {
      id: "bao-cao-tinh-hinh-hoat-dong-mau-3",
      title: "BÁO CÁO TÌNH HÌNH HOẠT ĐỘNG (MẪU 3)",
      description: "Báo cáo tổng hợp tình hình hoạt động theo mẫu 3",
    },
    {
      id: "bang-ke-doanh-thu",
      title: "BẢNG KÊ DOANH THU",
      description: "Bảng kê chi tiết doanh thu",
    },
    {
      id: "bang-ke-doanh-thu-02-rut-gon",
      title: "BẢNG KÊ DOANH THU 02 (RÚT GỌN)",
      description: "Bảng kê doanh thu rút gọn",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Lập báo cáo</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="from-date">
                  Từ ngày <span className="text-red-500">(*)</span>
                </Label>
                <DateTimePicker
                  date={fromDate}
                  onDateChange={(date) => setFromDate(date || null)}
                  placeholder="Chọn ngày và giờ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-date">
                  Đến ngày <span className="text-red-500">(*)</span>
                </Label>
                <DateTimePicker
                  date={toDate}
                  onDateChange={(date) => setToDate(date || null)}
                  placeholder="Chọn ngày và giờ"
                />
              </div>
              <div className="flex items-center space-x-2 pb-2">
                <Checkbox
                  id="hide-inactive"
                  checked={hideInactive}
                  onChange={(e) => setHideInactive(e.target.checked)}
                />
                <Label
                  htmlFor="hide-inactive"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Ẩn thông tin không hoạt động
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((report) => (
          <Card
            key={report.id}
            className="hover:shadow-lg transition-shadow duration-200"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                      {report.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {report.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGenerateReport(report.id)}
                  disabled={isGenerating === report.id}
                  className="ml-4 flex-shrink-0"
                >
                  {isGenerating === report.id ? (
                    <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  ) : (
                    <Download className="h-5 w-5 text-gray-600" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

