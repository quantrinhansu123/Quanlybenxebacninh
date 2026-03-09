import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentWarningsTable } from "@/components/dashboard/DocumentWarningsTable";
import { EditDocumentDialog } from "@/components/dashboard/EditDocumentDialog";
import { VehicleHistoryTable } from "@/components/dashboard/VehicleHistoryTable";
import {
  TrendStatCard,
} from "@/components/dashboard/stats";
import { format } from "date-fns";
import { dashboardService } from "@/services/dashboard.service";
import type { DashboardStats, ChartDataPoint, RecentActivity, Warning, WeeklyStat, MonthlyStat, RouteBreakdown } from "@/services/dashboard.service";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";
import { useCachedQuery, CACHE_TTL } from "@/lib/query-cache";

// Chart components (to be implemented in Phase 2-4)
import { VehicleTrendChart } from "@/components/dashboard/charts/VehicleTrendChart";
import { WeeklyProgressChart } from "@/components/dashboard/charts/WeeklyProgressChart";
import { VehiclesByStatusChart } from "@/components/dashboard/charts/VehiclesByStatusChart";
import { VehiclesByRouteChart } from "@/components/dashboard/charts/VehiclesByRouteChart";
import { MonthlyBreakdownChart } from "@/components/dashboard/charts/MonthlyBreakdownChart";

// Dashboard data type for caching
interface DashboardData {
  stats: DashboardStats;
  chartData: ChartDataPoint[];
  recentActivity: RecentActivity[];
  warnings: Warning[];
  weeklyStats: WeeklyStat[];
  monthlyStats: MonthlyStat[];
  routeBreakdown: RouteBreakdown[];
}

const defaultStats: DashboardStats = {
  totalVehiclesToday: 0,
  vehiclesInStation: 0,
  vehiclesDepartedToday: 0,
  revenueToday: 0,
  invalidVehicles: 0,
};

export default function Dashboard() {
  // Use cached query for dashboard data - persists across navigation
  const { data: cachedData, isLoading: isCacheLoading, refetch } = useCachedQuery<DashboardData>(
    'dashboard-all',
    () => dashboardService.getDashboardData(),
    { ttl: CACHE_TTL.SHORT, staleTime: 30000 } // 30s stale time matches polling
  );

  // Extract data from cache with defaults
  const stats = cachedData?.stats || defaultStats;
  const chartData = cachedData?.chartData || [];
  const recentActivity = cachedData?.recentActivity || [];
  const warnings = cachedData?.warnings || [];
  const weeklyStats = cachedData?.weeklyStats || [];
  const monthlyStats = cachedData?.monthlyStats || [];
  const routeBreakdown = cachedData?.routeBreakdown || [];

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editDocumentOpen, setEditDocumentOpen] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);
  const [vehicleHistoryOpen, setVehicleHistoryOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const setTitle = useUIStore((state) => state.setTitle);

  const isLoading = isCacheLoading && !cachedData;

  useEffect(() => {
    setTitle("Tổng quan");
    // Set up polling every 30 seconds (background refresh)
    const interval = setInterval(() => {
      refetch().then(() => setLastUpdated(new Date()));
    }, 30000);
    return () => clearInterval(interval);
  }, [setTitle, refetch]);

  // Update lastUpdated when data loads
  useEffect(() => {
    if (cachedData) {
      setLastUpdated(new Date());
    }
  }, [cachedData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleEditDocument = (warning: Warning) => {
    setSelectedWarning(warning);
    setEditDocumentOpen(true);
  };

  const handleViewHistory = (warning: Warning) => {
    setSelectedWarning(warning);
    setVehicleHistoryOpen(true);
  };

  const handleSaveDocument = async (data: {
    documentNumber: string
    issueDate: string
    expiryDate: string
    issuingAuthority?: string
    notes?: string
  }) => {
    if (!selectedWarning || !selectedWarning.plateNumber) {
      throw new Error('Không có thông tin xe được chọn')
    }

    // Call API to update document
    await dashboardService.updateVehicleDocument(
      selectedWarning.plateNumber,
      selectedWarning.document,
      {
        documentNumber: data.documentNumber,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        issuingAuthority: data.issuingAuthority,
        notes: data.notes,
      }
    )

    // Refresh dashboard data
    await handleRefresh()
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm text-stone-500 mb-1">Tổng quan</p>
            <h1 className="text-3xl lg:text-4xl font-semibold text-stone-900 tracking-tight">
              Dữ liệu
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200">
              <Clock className="w-4 h-4 text-stone-400" />
              <span className="text-sm text-stone-500">Cập nhật:</span>
              <span className="text-sm font-mono font-semibold text-stone-800">
                {format(lastUpdated, "HH:mm:ss")}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-10 px-4 rounded-xl border-stone-200 bg-white hover:bg-stone-50"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4", (isLoading || isRefreshing) && "animate-spin")} />
              <span className="hidden sm:inline">Làm mới</span>
            </Button>
          </div>
        </div>

        {/* Overview Tab */}
        <div className="flex items-center gap-1 border-b border-stone-200 pb-2">
          <button className="px-4 py-2 text-sm font-medium text-stone-900 border-b-2 border-stone-900">
            Tổng quan
          </button>
        </div>

        {/* 6 Stat Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <TrendStatCard
            category="Tổng xe"
            categoryColor="orange"
            value={stats.totalVehiclesToday}
            subtitle="Toàn bộ hoạt động"
            trend={{
              direction: "up",
              value: "",
              description: "Hôm nay",
            }}
            isLoading={isLoading}
          />
          <TrendStatCard
            category="Đã xuất bến"
            categoryColor="green"
            value={stats.vehiclesDepartedToday}
            subtitle="Đã rời bến"
            trend={{
              direction: "up",
              value: "",
              description: "Hôm nay",
            }}
            isLoading={isLoading}
          />
          <TrendStatCard
            category="Trong bến"
            categoryColor="blue"
            value={stats.vehiclesInStation}
            subtitle="Đang chờ xuất bến"
            trend={{
              direction: "attention",
              value: "",
              description: "Cần theo dõi",
            }}
            isLoading={isLoading}
          />
          <TrendStatCard
            category="Doanh thu"
            categoryColor="amber"
            value={stats.revenueToday}
            subtitle="VNĐ trong ngày"
            trend={{
              direction: "up",
              value: "",
              description: "Hôm nay",
            }}
            isLoading={isLoading}
            isCurrency
          />
          <TrendStatCard
            category="Hoạt động"
            categoryColor="purple"
            value={recentActivity.length}
            subtitle="Cập nhật mới"
            trend={{
              direction: "up",
              value: "",
              description: "Đang hoạt động",
            }}
            isLoading={isLoading}
          />
          <TrendStatCard
            category="Cảnh báo"
            categoryColor="rose"
            value={warnings.length}
            subtitle="Giấy tờ hết hạn"
            trend={{
              direction: warnings.length > 0 ? "attention" : "up",
              value: warnings.length > 0 ? `${warnings.length}` : "",
              description: warnings.length > 0 ? "cần xử lý" : "Ổn định",
            }}
            isLoading={isLoading}
          />
        </div>

        {/* Charts Row 1: Trend + Weekly Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vehicle Trend Chart - 2/3 width */}
          <Card className="lg:col-span-2 border border-stone-200 bg-white rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-stone-900">
                Xu hướng hoạt động xe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleTrendChart data={chartData} isLoading={isLoading} />
            </CardContent>
          </Card>

          {/* Weekly Progress Chart - 1/3 width */}
          <Card className="border border-stone-200 bg-white rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-stone-900">
                Tiến độ tuần
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyProgressChart data={weeklyStats} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Status + Route + Monthly Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Vehicles by Status - Donut */}
          <Card className="border border-stone-200 bg-white rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-stone-900">
                Xe theo trạng thái
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehiclesByStatusChart
                inStation={stats.vehiclesInStation}
                departed={stats.vehiclesDepartedToday}
                total={stats.totalVehiclesToday}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Vehicles by Route - Donut */}
          <Card className="border border-stone-200 bg-white rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-stone-900">
                Xe theo tuyến
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehiclesByRouteChart
                data={routeBreakdown}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Monthly Breakdown - Stacked Bar */}
          <Card className="border border-stone-200 bg-white rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-stone-900">
                  Thống kê theo tháng
                </CardTitle>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-stone-500">Xuất bến</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-stone-500">Chờ</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-stone-300" />
                    <span className="text-stone-500">Khác</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MonthlyBreakdownChart data={monthlyStats} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>

        {/* Warnings Table */}
        <DocumentWarningsTable
          warnings={warnings}
          isLoading={isLoading}
          onEditDocument={handleEditDocument}
          onViewHistory={handleViewHistory}
        />
      </div>

      {/* Dialogs */}
      <EditDocumentDialog
        open={editDocumentOpen}
        onOpenChange={setEditDocumentOpen}
        warning={selectedWarning}
        onSave={handleSaveDocument}
      />

      <VehicleHistoryTable
        open={vehicleHistoryOpen}
        onOpenChange={setVehicleHistoryOpen}
      />
    </div>
  );
}
