import { useState, useEffect, useMemo } from "react"
import { toast } from "react-toastify"
import { Search, RefreshCw, ChevronLeft, ChevronRight, MapPin, FileText, Route, TrendingUp, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { ActionMenu } from "@/components/ui/ActionMenu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { routeService, LegacyRoute } from "@/services/route.service"
// Manual sync imports disabled — auto sync via SharedWorker
// import { gtvtSyncService } from "@/services/gtvt-sync.service"
// import { isAxiosError } from "axios"
// import type { GtvtContractStatus, GtvtLastSyncResponse, GtvtSyncSummaryResponse } from "@/types/gtvt-sync.types"
import { useUIStore } from "@/store/ui.store"
import { useDialogHistory } from "@/hooks/useDialogHistory"
// import { useAuthStore } from "@/features/auth/store/authStore"
import { useAppSheetPolling } from "@/hooks/use-appsheet-polling"
import { normalizeFixedRouteRows, type NormalizedAppSheetFixedRoute } from "@/services/appsheet-normalize-fixed-routes"
import { normalizeBusRouteRows, type NormalizedAppSheetBusRoute } from "@/services/appsheet-normalize-bus-routes"
import { routeService as routeFeatService } from "@/features/fleet/routes"

export default function QuanLyTuyen() {
  const [routes, setRoutes] = useState<LegacyRoute[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDepartureProvince, setFilterDepartureProvince] = useState("")
  const [filterArrivalProvince, setFilterArrivalProvince] = useState("")
  const [filterRouteType, setFilterRouteType] = useState("")
  const [filterOperationStatus, setFilterOperationStatus] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<LegacyRoute | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  // Manual sync disabled — auto sync via SharedWorker
  // const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  // const [isSyncing, setIsSyncing] = useState(false)
  // const [syncDryRun, setSyncDryRun] = useState(false)
  // const [syncResult, setSyncResult] = useState<GtvtSyncSummaryResponse | null>(null)
  // const [lastSync, setLastSync] = useState<GtvtLastSyncResponse | null>(null)
  // const [contractStatus, setContractStatus] = useState<GtvtContractStatus | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  const setTitle = useUIStore((state) => state.setTitle)
  // const currentUser = useAuthStore((state) => state.user)
  // const isAdmin = currentUser?.role === "admin"

  // AppSheet realtime polling state
  const [appSheetFixedRoutes, setAppSheetFixedRoutes] = useState<NormalizedAppSheetFixedRoute[]>([])
  const [appSheetBusRoutes, setAppSheetBusRoutes] = useState<NormalizedAppSheetBusRoute[]>([])

  useAppSheetPolling({
    endpointKey: 'fixedRoutes',
    normalize: normalizeFixedRouteRows,
    onData: (data: NormalizedAppSheetFixedRoute[]) => setAppSheetFixedRoutes(data),
    onSyncToDb: (data) => routeFeatService.syncFromAppSheet(data),
    enabled: true,
  })

  useAppSheetPolling({
    endpointKey: 'busRoutes',
    normalize: (rows) => normalizeBusRouteRows(rows),
    onData: (data: NormalizedAppSheetBusRoute[]) => setAppSheetBusRoutes(data),
    onSyncToDb: (data) => routeFeatService.syncFromAppSheet(data),
    enabled: true,
  })

  // Handle browser back button for dialog
  const { handleDialogOpenChange } = useDialogHistory(dialogOpen, setDialogOpen, "routeDialogOpen")
  // const { handleDialogOpenChange: handleSyncDialogOpenChange } = useDialogHistory(syncDialogOpen, setSyncDialogOpen, "gtvtSyncDialogOpen")

  useEffect(() => {
    setTitle("Quản lý tuyến xe")
    loadRoutes()
  }, [setTitle])

  const loadRoutes = async (forceRefresh = false) => {
    setIsLoading(true)
    try {
      const data = await routeService.getLegacy(forceRefresh)
      setRoutes(data)
    } catch (error) {
      console.error("Failed to load routes:", error)
      toast.error("Không thể tải danh sách tuyến. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  // Manual sync functions disabled — auto sync via SharedWorker
  /*
  const loadLastSync = useCallback(async () => {
    if (!isAdmin) return
    try {
      const data = await gtvtSyncService.getLastSync()
      setLastSync(data)
    } catch (error) {
      console.error("Failed to load GTVT last sync:", error)
    }
  }, [isAdmin])

  const handleOpenSyncDialog = async () => {
    setSyncDryRun(false)
    setSyncResult(null)
    setContractStatus(null)
    handleSyncDialogOpenChange(true)
    await loadLastSync()
    try {
      const status = await gtvtSyncService.getContractStatus()
      setContractStatus(status)
    } catch {
      setContractStatus(null)
    }
  }

  const handleRunSync = async () => {
    if (!syncDryRun && !window.confirm("Bạn có chắc muốn đồng bộ thật? Dữ liệu sẽ được ghi đè.")) {
      return
    }

    setIsSyncing(true)
    try {
      const result = await gtvtSyncService.syncRoutesSchedules(syncDryRun)
      setSyncResult(result)

      if (result.errors.length > 0) {
        toast.warning(`Đồng bộ hoàn tất với ${result.errors.length} lỗi`)
      } else if (syncDryRun) {
        toast.success("Dry-run hoàn tất")
      } else {
        toast.success("Đồng bộ dữ liệu thành công")
      }

      if (!syncDryRun) {
        await loadRoutes(true)
        await loadLastSync()
      }
    } catch (error: unknown) {
      console.error("Failed to sync GTVT data:", error)
      let message = "Không thể đồng bộ dữ liệu từ Sở GTVT"
      if (isAxiosError(error)) {
        const apiError = error.response?.data?.error
        if (typeof apiError === "string" && apiError.trim()) {
          message = apiError
        }
      }
      toast.error(message)
    } finally {
      setIsSyncing(false)
    }
  }
  */

  /*
  useEffect(() => {
    if (isAdmin) {
      void loadLastSync()
    }
  }, [isAdmin, loadLastSync])
  */

  // Merge AppSheet realtime data into route list (AppSheet primary, backend fallback)
  const mergedRoutes = useMemo((): LegacyRoute[] => {
    if (appSheetFixedRoutes.length === 0 && appSheetBusRoutes.length === 0) return routes

    const backendMap = new Map<string, LegacyRoute>()
    for (const r of routes) {
      const key = r.routeCode.trim().toUpperCase()
      backendMap.set(key, r)
    }

    const fixedConverted: LegacyRoute[] = appSheetFixedRoutes.map(r => {
      const backend = backendMap.get(r.routeCode.trim().toUpperCase())
      return {
        id: backend?.id || r.routeCode,
        routeCode: r.routeCode,
        routeCodeOld: r.routeCodeOld || backend?.routeCodeOld || '',
        routeCodeFixed: backend?.routeCodeFixed || '',
        routeClass: backend?.routeClass || '',
        routeType: r.routeType || backend?.routeType || '',
        routePath: r.itinerary || backend?.routePath || '',
        departureStation: r.departureStation || backend?.departureStation || '',
        departureStationRef: r.departureStationRef || backend?.departureStationRef || '',
        departureProvince: r.departureProvince || backend?.departureProvince || '',
        departureProvinceOld: backend?.departureProvinceOld || '',
        arrivalStation: r.arrivalStation || backend?.arrivalStation || '',
        arrivalStationRef: r.arrivalStationRef || backend?.arrivalStationRef || '',
        arrivalProvince: r.arrivalProvince || backend?.arrivalProvince || '',
        arrivalProvinceOld: backend?.arrivalProvinceOld || '',
        distanceKm: r.distanceKm ?? backend?.distanceKm ?? 0,
        minIntervalMinutes: r.minIntervalMinutes ?? backend?.minIntervalMinutes ?? 0,
        totalTripsMonth: r.totalTripsPerMonth ?? backend?.totalTripsMonth ?? 0,
        tripsInOperation: r.tripsOperated ?? backend?.tripsInOperation ?? 0,
        remainingCapacity: r.remainingCapacity ?? backend?.remainingCapacity ?? 0,
        operationStatus: r.operationStatus || backend?.operationStatus || '',
        calendarType: backend?.calendarType || '',
        decisionNumber: r.decisionNumber || backend?.decisionNumber || '',
        decisionDate: r.decisionDate || backend?.decisionDate || '',
        issuingAuthority: backend?.issuingAuthority || '',
        notes: backend?.notes || '',
        filePath: backend?.filePath || '',
        _source: 'appsheet',
      }
    })

    const busConverted: LegacyRoute[] = appSheetBusRoutes.map(r => {
      const backend = backendMap.get(r.routeCode.trim().toUpperCase())
      return {
        id: backend?.id || r.firebaseId,
        routeCode: r.routeCode,
        routeCodeOld: backend?.routeCodeOld || '',
        routeCodeFixed: backend?.routeCodeFixed || '',
        routeClass: backend?.routeClass || '',
        routeType: r.routeType || 'Xe buýt',
        routePath: r.itinerary || backend?.routePath || '',
        departureStation: r.departureStation || backend?.departureStation || '',
        departureStationRef: r.departureStationRef || backend?.departureStationRef || '',
        departureProvince: r.departureProvince || backend?.departureProvince || '',
        departureProvinceOld: backend?.departureProvinceOld || '',
        arrivalStation: r.arrivalStation || backend?.arrivalStation || '',
        arrivalStationRef: r.arrivalStationRef || backend?.arrivalStationRef || '',
        arrivalProvince: r.arrivalProvince || backend?.arrivalProvince || '',
        arrivalProvinceOld: backend?.arrivalProvinceOld || '',
        distanceKm: r.distanceKm ?? backend?.distanceKm ?? 0,
        minIntervalMinutes: backend?.minIntervalMinutes ?? 0,
        totalTripsMonth: backend?.totalTripsMonth ?? 0,
        tripsInOperation: backend?.tripsInOperation ?? 0,
        remainingCapacity: backend?.remainingCapacity ?? 0,
        operationStatus: r.operationStatus || backend?.operationStatus || '',
        calendarType: backend?.calendarType || '',
        decisionNumber: backend?.decisionNumber || '',
        decisionDate: backend?.decisionDate || '',
        issuingAuthority: backend?.issuingAuthority || '',
        notes: backend?.notes || '',
        filePath: backend?.filePath || '',
        _source: 'appsheet',
      }
    })

    // Start with backend routes, then override with AppSheet data
    const mergedMap = new Map<string, LegacyRoute>()
    for (const r of routes) {
      mergedMap.set(r.routeCode.trim().toUpperCase(), r)
    }
    for (const r of [...fixedConverted, ...busConverted]) {
      mergedMap.set(r.routeCode.trim().toUpperCase(), r)
    }
    return [...mergedMap.values()]
  }, [routes, appSheetFixedRoutes, appSheetBusRoutes])

  // Show loading only if backend hasn't loaded AND AppSheet hasn't loaded yet
  const effectiveLoading = isLoading && appSheetFixedRoutes.length === 0

  // Get unique values for filters (from merged data)
  const departureProvinces = Array.from(new Set(mergedRoutes.map((r) => r.departureProvince).filter(Boolean))).sort()
  const arrivalProvinces = Array.from(new Set(mergedRoutes.map((r) => r.arrivalProvince).filter(Boolean))).sort()
  const routeTypes = Array.from(new Set(mergedRoutes.map((r) => r.routeType).filter(Boolean))).sort()
  const operationStatuses = Array.from(new Set(mergedRoutes.map((r) => r.operationStatus).filter(Boolean))).sort()

  const filteredRoutes = mergedRoutes.filter((route) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        route.routeCode.toLowerCase().includes(query) ||
        route.departureStation.toLowerCase().includes(query) ||
        route.arrivalStation.toLowerCase().includes(query) ||
        route.departureProvince.toLowerCase().includes(query) ||
        route.arrivalProvince.toLowerCase().includes(query) ||
        route.routePath.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Province filters
    if (filterDepartureProvince && route.departureProvince !== filterDepartureProvince) {
      return false
    }
    if (filterArrivalProvince && route.arrivalProvince !== filterArrivalProvince) {
      return false
    }

    // Route type filter
    if (filterRouteType && route.routeType !== filterRouteType) {
      return false
    }

    // Operation status filter
    if (filterOperationStatus && route.operationStatus !== filterOperationStatus) {
      return false
    }

    return true
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRoutes = filteredRoutes.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterDepartureProvince, filterArrivalProvince, filterRouteType, filterOperationStatus])

  const handleView = (route: LegacyRoute) => {
    setSelectedRoute(route)
    setDialogOpen(true)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setFilterDepartureProvince("")
    setFilterArrivalProvince("")
    setFilterRouteType("")
    setFilterOperationStatus("")
  }

  // Strip BUS- prefix for display (data keeps prefix for merge key matching)
  const displayRouteCode = (code: string) => code.replace(/^BUS-/i, '')

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A"
    // Handle format "2025-04-14 00:00:00" or "dd/mm/yyyy"
    if (dateStr.includes("-")) {
      const parts = dateStr.split(" ")[0].split("-")
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`
      }
    }
    return dateStr
  }

  // formatDateTime removed — was only used by sync dialog

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes("mới") || s.includes("hoạt động")) return "bg-emerald-100 text-emerald-700"
    if (s.includes("ngừng") || s.includes("đóng")) return "bg-rose-100 text-rose-700"
    return "bg-gray-100 text-gray-700"
  }

  // Stats calculations (from merged data)
  const stats = useMemo(() => {
    const inactive = mergedRoutes.filter(r => {
      const s = (r.operationStatus || '').toLowerCase()
      return s.includes("ngừng") || s.includes("đóng") || s.includes("hết hiệu lực")
    }).length
    const active = mergedRoutes.length - inactive
    const uniqueProvinces = new Set([...mergedRoutes.map(r => r.departureProvince), ...mergedRoutes.map(r => r.arrivalProvince)].filter(Boolean)).size
    return { total: mergedRoutes.length, active, inactive, uniqueProvinces }
  }, [mergedRoutes])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-xl shadow-indigo-500/30">
              <Route className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Quản lý tuyến xe
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Danh mục tuyến cố định
                {(appSheetFixedRoutes.length > 0 || appSheetBusRoutes.length > 0) && (
                  <span className="text-xs text-muted-foreground ml-2">(AppSheet realtime)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync button hidden — auto sync via SharedWorker replaces manual sync */}
            <Button onClick={() => loadRoutes(true)} disabled={isLoading} variant="outline" className="px-4 py-2.5 rounded-xl">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-12 gap-4">
          {/* Primary Stat - Hero Card */}
          <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-indigo-100 mb-2">
                <Route className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Tổng số tuyến</span>
              </div>
              <p className="text-6xl font-bold tracking-tight">{stats.total.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-4 text-indigo-100">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Đang quản lý trong hệ thống</span>
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="col-span-12 lg:col-span-7 grid grid-cols-3 gap-4">
            {/* Active */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 transition-colors">
                  <CheckCircle className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.active.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Đang khai thác</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Inactive */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-rose-100 group-hover:bg-rose-500 transition-colors">
                  <XCircle className="w-4 h-4 text-rose-600 group-hover:text-white transition-colors" />
                </div>
                <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                  {stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0}%
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.inactive.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Ngừng khai thác</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.inactive / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Provinces */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-amber-100 group-hover:bg-amber-500 transition-colors">
                  <MapPin className="w-4 h-4 text-amber-600 group-hover:text-white transition-colors" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.uniqueProvinces.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Tỉnh/Thành phố</p>
              <div className="mt-3 flex items-center gap-1">
                {Array.from({ length: Math.min(5, stats.uniqueProvinces) }).map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white -ml-2 first:ml-0" />
                ))}
                {stats.uniqueProvinces > 5 && (
                  <span className="text-xs text-slate-500 ml-1">+{stats.uniqueProvinces - 5}</span>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo mã tuyến, bến đi, bến đến, tỉnh, hành trình..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterDepartureProvince" className="text-sm font-medium">
                  Tỉnh đi
                </Label>
                <Select
                  id="filterDepartureProvince"
                  value={filterDepartureProvince}
                  onChange={(e) => setFilterDepartureProvince(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  {departureProvinces.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterArrivalProvince" className="text-sm font-medium">
                  Tỉnh đến
                </Label>
                <Select
                  id="filterArrivalProvince"
                  value={filterArrivalProvince}
                  onChange={(e) => setFilterArrivalProvince(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  {arrivalProvinces.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterRouteType" className="text-sm font-medium">
                  Loại tuyến
                </Label>
                <Select
                  id="filterRouteType"
                  value={filterRouteType}
                  onChange={(e) => setFilterRouteType(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  {routeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterOperationStatus" className="text-sm font-medium">
                  Tình trạng
                </Label>
                <Select
                  id="filterOperationStatus"
                  value={filterOperationStatus}
                  onChange={(e) => setFilterOperationStatus(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  {operationStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {(searchQuery || filterDepartureProvince || filterArrivalProvince || filterRouteType || filterOperationStatus) && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-gray-500">
                  Hiển thị {filteredRoutes.length.toLocaleString()} / {mergedRoutes.length.toLocaleString()} tuyến
                </p>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left w-[120px] text-xs whitespace-nowrap">Mã tuyến</TableHead>
              <TableHead className="text-left text-xs whitespace-nowrap">Bến đi</TableHead>
              <TableHead className="text-left text-xs whitespace-nowrap">Tỉnh đi</TableHead>
              <TableHead className="text-left text-xs whitespace-nowrap">Bến đến</TableHead>
              <TableHead className="text-left text-xs whitespace-nowrap">Tỉnh đến</TableHead>
              <TableHead className="text-left w-[100px] text-xs whitespace-nowrap">Loại tuyến</TableHead>
              <TableHead className="text-center w-[80px] text-xs whitespace-nowrap">Cự ly (km)</TableHead>
              <TableHead className="text-center w-[100px] text-xs whitespace-nowrap">Chuyến/tháng</TableHead>
              <TableHead className="text-left w-[120px] text-xs whitespace-nowrap">Tình trạng</TableHead>
              <TableHead className="text-center w-[80px] text-xs whitespace-nowrap">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {effectiveLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : paginatedRoutes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              paginatedRoutes.map((route) => (
                <TableRow key={route.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-xs text-left font-semibold whitespace-nowrap">{displayRouteCode(route.routeCode)}</TableCell>
                  <TableCell className="text-left text-xs whitespace-nowrap">{route.departureStation || "N/A"}</TableCell>
                  <TableCell className="text-left text-xs text-gray-600 whitespace-nowrap">{route.departureProvince || "N/A"}</TableCell>
                  <TableCell className="text-left text-xs whitespace-nowrap">{route.arrivalStation || "N/A"}</TableCell>
                  <TableCell className="text-left text-xs text-gray-600 whitespace-nowrap">{route.arrivalProvince || "N/A"}</TableCell>
                  <TableCell className="text-left text-xs whitespace-nowrap">{route.routeType || "N/A"}</TableCell>
                  <TableCell className="text-center text-xs whitespace-nowrap">{route.distanceKm || "N/A"}</TableCell>
                  <TableCell className="text-center text-xs whitespace-nowrap">{route.totalTripsMonth || "N/A"}</TableCell>
                  <TableCell className="text-left">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(route.operationStatus)}`}>
                      {route.operationStatus || "N/A"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <ActionMenu
                        items={[
                          {
                            label: "Xem chi tiết",
                            onClick: () => handleView(route),
                            variant: "info",
                          },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-500">
              Hiển thị {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRoutes.length)} trong tổng số {filteredRoutes.length.toLocaleString()} tuyến
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Sync Dialog removed — auto sync via SharedWorker. Restore from git if needed. */}

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Chi tiết tuyến xe</DialogTitle>
          </DialogHeader>
          {selectedRoute && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-blue-50 p-4 rounded-lg">
                  <p className="text-base text-blue-600 font-medium">Mã tuyến</p>
                  <p className="text-2xl font-bold text-blue-900">{displayRouteCode(selectedRoute.routeCode)}</p>
                  {selectedRoute.routeCodeOld && selectedRoute.routeCodeOld !== selectedRoute.routeCode && (
                    <p className="text-base text-blue-500">Mã cũ: {selectedRoute.routeCodeOld}</p>
                  )}
                </div>
              </div>

              {/* Route Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-base text-gray-500">Bến đi</p>
                      <p className="text-lg font-medium">{selectedRoute.departureStation}</p>
                      <p className="text-base text-gray-600">{selectedRoute.departureProvince}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-base text-gray-500">Bến đến</p>
                      <p className="text-lg font-medium">{selectedRoute.arrivalStation}</p>
                      <p className="text-base text-gray-600">{selectedRoute.arrivalProvince}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Route Path */}
              {selectedRoute.routePath && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-base text-gray-500 mb-1">Hành trình chạy xe</p>
                  <p className="text-base">{selectedRoute.routePath}</p>
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-base text-gray-500">Cự ly</p>
                  <p className="text-xl font-bold">{selectedRoute.distanceKm} km</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-base text-gray-500">Chuyến/tháng</p>
                  <p className="text-xl font-bold">{selectedRoute.totalTripsMonth}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-base text-gray-500">Đang khai thác</p>
                  <p className="text-xl font-bold">{selectedRoute.tripsInOperation}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-base text-gray-500">Giãn cách (phút)</p>
                  <p className="text-xl font-bold">{selectedRoute.minIntervalMinutes}</p>
                </div>
              </div>

              {/* Status & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-base text-gray-500">Loại tuyến</p>
                  <p className="text-lg font-medium">{selectedRoute.routeType || "N/A"}</p>
                </div>
                <div>
                  <p className="text-base text-gray-500">Tình trạng khai thác</p>
                  <span className={`inline-flex px-2 py-1 text-base font-medium rounded-full ${getStatusColor(selectedRoute.operationStatus)}`}>
                    {selectedRoute.operationStatus || "N/A"}
                  </span>
                </div>
              </div>

              {/* Decision Info */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <p className="text-lg font-medium">Thông tin quyết định</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-base">
                  <div>
                    <p className="text-gray-500">Số quyết định</p>
                    <p>{selectedRoute.decisionNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ngày ban hành</p>
                    <p>{formatDate(selectedRoute.decisionDate)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Đơn vị ban hành</p>
                    <p>{selectedRoute.issuingAuthority || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedRoute.notes && (
                <div className="border-t pt-4">
                  <p className="text-base text-gray-500 mb-1">Ghi chú</p>
                  <p className="text-base">{selectedRoute.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
