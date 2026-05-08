import { useState, useEffect, useMemo } from "react"
import { toast } from "react-toastify"
import { Search, RefreshCw, ChevronLeft, ChevronRight, MapPin, FileText, Route, TrendingUp, CheckCircle, XCircle, Database, ArrowDownToLine } from "lucide-react"
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
import { scheduleService } from "@/services/schedule.service"
import type { Schedule } from "@/types"
import { gtvtSyncService } from "@/services/gtvt-sync.service"
// Manual sync imports disabled — auto sync via SharedWorker
// import { gtvtSyncService } from "@/services/gtvt-sync.service"
// import { isAxiosError } from "axios"
// import type { GtvtContractStatus, GtvtLastSyncResponse, GtvtSyncSummaryResponse } from "@/types/gtvt-sync.types"
import { useUIStore } from "@/store/ui.store"
import { useDialogHistory } from "@/hooks/useDialogHistory"
import { useAuthStore } from "@/features/auth/store/authStore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  const [routeSchedules, setRouteSchedules] = useState<Schedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [isSyncingSchedules, setIsSyncingSchedules] = useState(false)
  const [isComparing, setIsComparing] = useState(false)
  const [isSyncingFromAppSheet, setIsSyncingFromAppSheet] = useState(false)
  const [compareDialogOpen, setCompareDialogOpen] = useState(false)
  const [compareTab, setCompareTab] = useState<"routes" | "schedules" | "operators">("routes")
  const [compareData, setCompareData] = useState<Awaited<ReturnType<typeof gtvtSyncService.compare>> | null>(null)
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
  const currentUser = useAuthStore((state) => state.user)
  const isAdmin = currentUser?.role === 'admin'

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

  const handleCompare = async () => {
    setIsComparing(true)
    try {
      const diff = await gtvtSyncService.compare(500)
      setCompareData(diff)
      setCompareDialogOpen(true)
    } catch (e) {
      console.error(e)
      toast.error("Không thể so sánh AppSheet ↔ Supabase")
    } finally {
      setIsComparing(false)
    }
  }

  const handleSyncFromAppSheet = async () => {
    if (!window.confirm("Đồng bộ AppSheet → Supabase? Dữ liệu tuyến + biểu đồ giờ sẽ upsert.")) return
    setIsSyncingFromAppSheet(true)
    try {
      const result = await gtvtSyncService.syncRoutesSchedules(false)
      if (result.errors?.length) {
        toast.warning(`Đồng bộ xong nhưng có lỗi: ${result.errors[0]}`)
      } else {
        toast.success("Đồng bộ AppSheet → Supabase thành công")
      }
      await loadRoutes(true)
    } catch (e) {
      console.error(e)
      toast.error("Không thể đồng bộ AppSheet → Supabase")
    } finally {
      setIsSyncingFromAppSheet(false)
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
  const mergedRoutes = routes

  // Show loading only if backend hasn't loaded yet
  const effectiveLoading = isLoading

  // Get unique values for filters (from merged data)
  const departureProvinces = Array.from(new Set(mergedRoutes.map((r) => r.departureProvince).filter(Boolean))).sort()
  const arrivalProvinces = Array.from(new Set(mergedRoutes.map((r) => r.arrivalProvince).filter(Boolean))).sort()
  const routeTypes = Array.from(new Set(mergedRoutes.map((r) => r.routeType).filter(Boolean))).sort()
  const operationStatuses = Array.from(new Set(mergedRoutes.map((r) => r.operationStatus).filter(Boolean))).sort()

  const filteredRoutes = mergedRoutes.filter((route) => {
    // Station filter: chỉ tuyến có bến đi (điểm đầu) trùng bến user — không lọc theo điểm đến
    if (currentUser?.benPhuTrachName) {
      const userStation = currentUser.benPhuTrachName.trim().toLowerCase()
      const dep = (route.departureStation || '').trim().toLowerCase()
      if (dep !== userStation) return false
    }

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

  useEffect(() => {
    if (!dialogOpen || !selectedRoute?.id) return
    let cancelled = false
    setSchedulesLoading(true)
    setRouteSchedules([])
    scheduleService
      .getAll(selectedRoute.id, undefined, true)
      .then((data) => {
        if (!cancelled) setRouteSchedules(data)
      })
      .catch((e) => {
        console.error("Failed to load schedules for route:", e)
        if (!cancelled) toast.error("Không thể tải biểu đồ giờ của tuyến")
      })
      .finally(() => {
        if (!cancelled) setSchedulesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [dialogOpen, selectedRoute?.id])

  const syncSchedulesForSelectedRoute = async () => {
    if (!selectedRoute) return
    if (!isAdmin) {
      toast.error("Chỉ admin mới đồng bộ được")
      return
    }
    if (!window.confirm(`Đồng bộ biểu đồ giờ cho tuyến ${displayRouteCode(selectedRoute.routeCode)}?`)) return
    setIsSyncingSchedules(true)
    try {
      const result = await gtvtSyncService.syncRoutesSchedules(false, selectedRoute.routeCode)
      if (result.errors?.length) {
        toast.warning(result.errors[0]?.message || "Đồng bộ xong nhưng có lỗi")
      } else {
        toast.success("Đã đồng bộ biểu đồ giờ")
      }
      // Reload schedules list from DB
      const data = await scheduleService.getAll(selectedRoute.id, undefined, true)
      setRouteSchedules(data)
    } catch (e) {
      console.error(e)
      toast.error("Không thể đồng bộ biểu đồ giờ")
    } finally {
      setIsSyncingSchedules(false)
    }
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

  const noticeDocsForSelectedRoute = useMemo(() => {
    const routeCode = (selectedRoute?.routeCode || '').trim()
    if (!routeCode) return []
    const codeUpper = routeCode.toUpperCase()
    const codeNoBus = codeUpper.replace(/^BUS-/, '')

    const byId = new Map<string, { id: string; routeRef: string; number?: string; displayText?: string; fileUrl?: string }>()

    for (const s of routeSchedules as any[]) {
      const meta = s?.metadata
      const noticeMeta = meta?.notice_meta
      const noticeId = String(noticeMeta?.id || '').trim()
      const fileUrl = String(noticeMeta?.fileUrl || '').trim()
      const routeRefRaw = String(noticeMeta?.routeRef || '').trim()
      if (!noticeId && !fileUrl) continue

      const routeRefUpper = routeRefRaw.toUpperCase()
      const matchesRoute =
        (routeRefUpper && (routeRefUpper === codeUpper || routeRefUpper === codeNoBus)) ||
        (!routeRefUpper && codeUpper) // fallback: if routeRef not present yet, still allow (rare older records)

      if (!matchesRoute) continue

      const key = noticeId || fileUrl
      if (byId.has(key)) continue

      byId.set(key, {
        id: noticeId || key,
        routeRef: routeRefRaw || displayRouteCode(codeUpper),
        number: String(noticeMeta?.number || '').trim() || undefined,
        displayText: String(noticeMeta?.displayText || '').trim() || undefined,
        fileUrl: fileUrl || undefined,
      })
    }

    return Array.from(byId.values())
  }, [routeSchedules, selectedRoute?.routeCode])

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

  const formatDaysOfWeek = (days: any): string => {
    const arr = Array.isArray(days) ? days : []
    if (arr.length === 0) return ""
    const map: Record<number, string> = { 1: "CN", 2: "T2", 3: "T3", 4: "T4", 5: "T5", 6: "T6", 7: "T7" }
    const labels = arr
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n))
      .map((n) => map[n] || String(n))
    return Array.from(new Set(labels)).join(", ")
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
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync button hidden — auto sync via SharedWorker replaces manual sync */}
            <Button onClick={() => loadRoutes(true)} disabled={isLoading} variant="outline" className="px-4 py-2.5 rounded-xl">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>

            <>
              <Button
                onClick={handleCompare}
                disabled={!isAdmin || isComparing || isLoading}
                variant="outline"
                className="px-4 py-2.5 rounded-xl"
                title={!isAdmin ? "Chỉ admin mới dùng được" : undefined}
              >
                <Database className={`mr-2 h-4 w-4 ${isComparing ? "animate-spin" : ""}`} />
                So sánh AppSheet
              </Button>
              <Button
                onClick={handleSyncFromAppSheet}
                disabled={!isAdmin || isSyncingFromAppSheet || isLoading}
                className="px-4 py-2.5 rounded-xl"
                title={!isAdmin ? "Chỉ admin mới dùng được" : undefined}
              >
                <ArrowDownToLine className={`mr-2 h-4 w-4 ${isSyncingFromAppSheet ? "animate-spin" : ""}`} />
                Đồng bộ AppSheet
              </Button>
            </>
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
        <DialogContent className="w-[98vw] max-w-7xl max-h-[92vh] overflow-y-auto">
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
                  <div className="mt-1 text-sm text-blue-700 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <span className="text-blue-600">Mã DB:</span>{" "}
                      <span className="font-semibold">{selectedRoute.routeCode || "N/A"}</span>
                    </span>
                    <span>
                      <span className="text-blue-600">Route ID:</span>{" "}
                      <span className="font-semibold">{selectedRoute.id || "N/A"}</span>
                    </span>
                  </div>
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
                      {selectedRoute.departureStationRef ? (
                        <p className="text-sm text-gray-500">
                          Ref bến đi: <span className="font-medium">{selectedRoute.departureStationRef}</span>
                        </p>
                      ) : null}
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
                      {selectedRoute.arrivalStationRef ? (
                        <p className="text-sm text-gray-500">
                          Ref bến đến: <span className="font-medium">{selectedRoute.arrivalStationRef}</span>
                        </p>
                      ) : null}
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

              {/* Extra fields (full/trace) */}
              <div className="bg-white border rounded-lg p-4">
                <p className="text-lg font-medium mb-3">Thông tin đầy đủ</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-base">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">Nguồn dữ liệu</span>
                    <span className="font-medium">{selectedRoute._source || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">Công suất còn lại</span>
                    <span className="font-medium">{String(selectedRoute.remainingCapacity ?? "N/A")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">Mã tuyến cố định</span>
                    <span className="font-medium">{selectedRoute.routeCodeFixed || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">Phân hạng</span>
                    <span className="font-medium">{selectedRoute.routeClass || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* All columns (raw) */}
              <details className="bg-white border rounded-lg p-4">
                <summary className="cursor-pointer select-none text-lg font-medium">
                  Tất cả cột (raw)
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    (click để mở/đóng)
                  </span>
                </summary>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {Object.entries(selectedRoute as any).map(([k, v]) => {
                    const value =
                      v === null || v === undefined
                        ? "—"
                        : typeof v === "object"
                          ? JSON.stringify(v)
                          : String(v)
                    return (
                      <div key={k} className="flex items-start gap-3">
                        <div className="w-48 shrink-0 text-gray-500 font-medium break-words">
                          {k}
                        </div>
                        <div className="flex-1 text-gray-900 break-words">
                          {value}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">JSON đầy đủ</div>
                  <pre className="text-xs bg-gray-50 border rounded-lg p-3 overflow-auto max-h-[360px] whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedRoute, null, 2)}
                  </pre>
                </div>
              </details>

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

              {/* Schedules (Biểu đồ giờ + văn bản) */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <p className="text-lg font-medium">Biểu đồ giờ & văn bản</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={syncSchedulesForSelectedRoute}
                    disabled={!isAdmin || isSyncingSchedules || schedulesLoading}
                    title={!isAdmin ? "Chỉ admin mới dùng được" : undefined}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingSchedules ? "animate-spin" : ""}`} />
                    Đồng bộ biểu đồ giờ
                  </Button>
                </div>

                {schedulesLoading ? (
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                    Đang tải biểu đồ giờ...
                  </div>
                ) : routeSchedules.length === 0 ? (
                  <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-700">
                    Tuyến này chưa có dữ liệu biểu đồ giờ (schedules).
                  </div>
                ) : (
                  <>
                    <div className="bg-white border rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Văn bản / thông tin giờ chạy</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Tổng lịch</span>
                          <span className="font-semibold">{routeSchedules.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Giờ sớm nhất</span>
                          <span className="font-semibold">
                            {routeSchedules.map((s: any) => s.departureTime).filter(Boolean).sort()[0] || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Giờ muộn nhất</span>
                          <span className="font-semibold">
                            {routeSchedules.map((s: any) => s.departureTime).filter(Boolean).sort().slice(-1)[0] || "N/A"}
                          </span>
                        </div>
                        <div className="pt-2 text-gray-600">
                          Danh sách dưới đây lấy từ DB `schedules` (đồng bộ từ AppSheet `BieuDoChayXeChiTiet` + `THONGBAO_KHAITHAC`).
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-gray-700">
                          File THONGBAO_KHAITHAC (theo <span className="font-semibold">Ref_Tuyen</span>)
                        </p>
                        <span className="text-sm text-gray-500">({noticeDocsForSelectedRoute.length})</span>
                      </div>

                      {noticeDocsForSelectedRoute.length === 0 ? (
                        <div className="mt-2 text-sm text-gray-500">
                          Chưa có file văn bản cho tuyến này. (Cần đồng bộ để lấy `THONGBAO_KHAITHAC.File` theo `Ref_Tuyen`.)
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {noticeDocsForSelectedRoute.slice(0, 12).map((d) => (
                            <div key={d.id} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 break-words">
                                    {d.number ? `Số TB ${d.number}` : "Văn bản"}
                                  </div>
                                  <div className="text-sm text-gray-600 break-words">
                                    <span className="text-gray-500">Mã tuyến:</span> {d.routeRef || "---"}
                                  </div>
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs rounded-lg shrink-0"
                                  disabled={!String(d.fileUrl || "").trim()}
                                  title={!String(d.fileUrl || "").trim() ? "Không có file" : "Mở file THONGBAO_KHAITHAC"}
                                  onClick={() => {
                                    const href = String(d.fileUrl || "").trim()
                                    if (href) window.open(href, "_blank", "noopener,noreferrer")
                                  }}
                                >
                                  Mở file
                                </Button>
                              </div>

                              {d.displayText ? (
                                <div className="mt-2 text-sm text-gray-700 break-words">
                                  {d.displayText}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-base font-semibold text-gray-800 mb-3">Danh sách giờ chạy</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {routeSchedules.slice(0, 60).map((s: any) => (
                          <div
                            key={s.id}
                            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-xl font-bold tracking-tight text-gray-900">
                                {s.departureTime || "N/A"}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs rounded-lg"
                                disabled={!String(s?.metadata?.notice_meta?.fileUrl || "").trim()}
                                title={!String(s?.metadata?.notice_meta?.fileUrl || "").trim() ? "Không có file văn bản" : "Mở văn bản THONGBAO_KHAITHAC"}
                                onClick={() => {
                                  const href = String(s?.metadata?.notice_meta?.fileUrl || "").trim()
                                  if (href) window.open(href, "_blank", "noopener,noreferrer")
                                }}
                              >
                                Xem văn bản
                              </Button>
                            </div>

                            <div
                              className="mt-2 text-sm text-gray-700 font-medium line-clamp-3"
                              title={s?.metadata?.notice_meta?.displayText || ""}
                            >
                              {s?.metadata?.notice_meta?.displayText ? String(s.metadata.notice_meta.displayText) : ""}
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-800">
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">Số TB</span>
                                <span className="font-semibold break-words" title={String(s?.metadata?.schedule_meta?.SoThongBao || s?.notificationNumber || "")}>
                                  {String(s?.metadata?.schedule_meta?.SoThongBao || s?.notificationNumber || "---")}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">Ref TBKT</span>
                                <span
                                  className="font-semibold break-words"
                                  title={String(
                                    s?.metadata?.schedule_meta?.Ref_ThongBaoKhaiThac ||
                                      s?.metadata?.schedule_meta?.ref_thongbao_khaithac ||
                                      "",
                                  )}
                                >
                                  {String(
                                    s?.metadata?.schedule_meta?.Ref_ThongBaoKhaiThac ||
                                      s?.metadata?.schedule_meta?.ref_thongbao_khaithac ||
                                      "---",
                                  )}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">Mã tuyến</span>
                                <span
                                  className="font-semibold break-words"
                                  title={String(s?.metadata?.notice_meta?.routeRef || selectedRoute?.routeCode || "")}
                                >
                                  {String(s?.metadata?.notice_meta?.routeRef || selectedRoute?.routeCode || "---")}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">Chiều</span>
                                <span className="font-semibold break-words" title={String(s?.metadata?.schedule_meta?.Chieu || s?.direction || "")}>
                                  {String(s?.metadata?.schedule_meta?.Chieu || s?.direction || "---")}
                                </span>
                              </div>

                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">Giờ xuất bến</span>
                                <span className="font-semibold break-words" title={String(s?.metadata?.schedule_meta?.GioXuatBen || s?.departureTime || "")}>
                                  {String(s?.metadata?.schedule_meta?.GioXuatBen || s?.departureTime || "---")}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">Ngày trong tuần</span>
                                <span
                                  className="font-semibold break-words"
                                  title={formatDaysOfWeek((s as any)?.daysOfWeek)}
                                >
                                  {formatDaysOfWeek((s as any)?.daysOfWeek) || "---"}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">Ngày HĐ</span>
                                <span
                                  className="font-semibold break-words"
                                  title={String(
                                    s?.metadata?.schedule_meta?.NgayHoatDong ||
                                      s?.metadata?.schedule_meta?.NgayHoatDongGoc ||
                                      formatDaysOfWeek((s as any)?.daysOfWeek) ||
                                      s?.effectiveFrom ||
                                      "",
                                  )}
                                >
                                  {String(
                                    s?.metadata?.schedule_meta?.NgayHoatDong ||
                                      s?.metadata?.schedule_meta?.NgayHoatDongGoc ||
                                      formatDaysOfWeek((s as any)?.daysOfWeek) ||
                                      s?.effectiveFrom ||
                                      "---",
                                  )}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">Loại ngày</span>
                                <span className="font-semibold break-words" title={String(s?.metadata?.schedule_meta?.LoaiNgay || s?.calendarType || "")}>
                                  {String(s?.metadata?.schedule_meta?.LoaiNgay || s?.calendarType || "---")}
                                </span>
                              </div>

                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">TT chuyến</span>
                                <span className="font-semibold break-words" title={String(s?.metadata?.schedule_meta?.TrangThaiChuyen || s?.tripStatus || "")}>
                                  {String(s?.metadata?.schedule_meta?.TrangThaiChuyen || s?.tripStatus || "---")}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">TT tổng</span>
                                <span className="font-semibold break-words" title={String(s?.metadata?.schedule_meta?.TrangThaiTongHop || "")}>
                                  {String(s?.metadata?.schedule_meta?.TrangThaiTongHop || "---")}
                                </span>
                              </div>

                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">Chuyến/tháng</span>
                                <span className="font-semibold break-words" title={String(s?.metadata?.schedule_meta?.SoChuyen_Thang_CT || "")}>
                                  {String(s?.metadata?.schedule_meta?.SoChuyen_Thang_CT || "---")}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">Ngày ngừng</span>
                                <span className="font-semibold break-words" title={String(s?.metadata?.schedule_meta?.NgayBiNgung || s?.effectiveTo || "")}>
                                  {String(s?.metadata?.schedule_meta?.NgayBiNgung || s?.effectiveTo || "---")}
                                </span>
                              </div>

                              <div className="col-span-2 flex items-baseline gap-2">
                                <span className="text-gray-500 whitespace-nowrap">Ngày gốc</span>
                                <span className="font-semibold break-words" title={String(s?.metadata?.schedule_meta?.NgayHoatDongGoc || "")}>
                                  {String(s?.metadata?.schedule_meta?.NgayHoatDongGoc || "---")}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {routeSchedules.length > 60 && (
                        <p className="text-xs text-gray-500 mt-2">
                          …và {routeSchedules.length - 60} giờ khác (xem đầy đủ ở trang Quản lý biểu đồ giờ).
                        </p>
                      )}
                    </div>
                  </>
                )}
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

      {/* Compare Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">So sánh AppSheet ↔ Supabase</DialogTitle>
          </DialogHeader>

          {!compareData ? (
            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
              Chưa có dữ liệu so sánh.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white border rounded-lg p-3">
                  <div className="text-xs text-gray-500">Tuyến</div>
                  <div className="text-sm font-semibold">
                    AppSheet {compareData.routes.appsheet} • DB {compareData.routes.supabase}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    AppSheet-only: {compareData.routes.onlyInAppSheet.count} • DB-only: {compareData.routes.onlyInSupabase.count}
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <div className="text-xs text-gray-500">Biểu đồ giờ</div>
                  <div className="text-sm font-semibold">
                    AppSheet {compareData.schedules.appsheet} • DB {compareData.schedules.supabase}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    AppSheet-only: {compareData.schedules.onlyInAppSheet.count} • DB-only: {compareData.schedules.onlyInSupabase.count}
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <div className="text-xs text-gray-500">Nhà xe (Ref_DonVi)</div>
                  <div className="text-sm font-semibold">
                    Tổng trong thông báo: {compareData.operatorRefs.totalInNotices}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Thiếu trong DB: {compareData.operatorRefs.missingInSupabase.count}
                  </div>
                </div>
              </div>

              <Tabs value={compareTab} onValueChange={(v) => setCompareTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="routes">Tuyến</TabsTrigger>
                  <TabsTrigger value="schedules">Biểu đồ giờ</TabsTrigger>
                  <TabsTrigger value="operators">Nhà xe thiếu</TabsTrigger>
                </TabsList>

                <TabsContent value="routes">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold">Chỉ có ở AppSheet</div>
                        <div className="text-xs text-gray-500">
                          Hiển thị {Math.min(compareData.limit, compareData.routes.onlyInAppSheet.count)} / {compareData.routes.onlyInAppSheet.count}
                        </div>
                      </div>
                      <div className="max-h-[340px] overflow-auto text-sm font-mono space-y-1">
                        {compareData.routes.onlyInAppSheet.items.map((x) => (
                          <div key={x} className="px-2 py-1 bg-gray-50 rounded">{x}</div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold">Chỉ có ở DB</div>
                        <div className="text-xs text-gray-500">
                          Hiển thị {Math.min(compareData.limit, compareData.routes.onlyInSupabase.count)} / {compareData.routes.onlyInSupabase.count}
                        </div>
                      </div>
                      <div className="max-h-[340px] overflow-auto text-sm font-mono space-y-1">
                        {compareData.routes.onlyInSupabase.items.map((x) => (
                          <div key={x} className="px-2 py-1 bg-gray-50 rounded">{x}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="schedules">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold">Chỉ có ở AppSheet</div>
                        <div className="text-xs text-gray-500">
                          Hiển thị {Math.min(compareData.limit, compareData.schedules.onlyInAppSheet.count)} / {compareData.schedules.onlyInAppSheet.count}
                        </div>
                      </div>
                      <div className="max-h-[340px] overflow-auto text-sm font-mono space-y-1">
                        {compareData.schedules.onlyInAppSheet.items.map((x) => (
                          <div key={x} className="px-2 py-1 bg-gray-50 rounded">{x}</div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold">Chỉ có ở DB</div>
                        <div className="text-xs text-gray-500">
                          Hiển thị {Math.min(compareData.limit, compareData.schedules.onlyInSupabase.count)} / {compareData.schedules.onlyInSupabase.count}
                        </div>
                      </div>
                      <div className="max-h-[340px] overflow-auto text-sm font-mono space-y-1">
                        {compareData.schedules.onlyInSupabase.items.map((x) => (
                          <div key={x} className="px-2 py-1 bg-gray-50 rounded">{x}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Key so sánh schedules là <span className="font-mono">ROUTECODE|HH:MM</span>.
                  </div>
                </TabsContent>

                <TabsContent value="operators">
                  <div className="bg-white border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold">Ref_DonVi thiếu trong DB</div>
                      <div className="text-xs text-gray-500">
                        Hiển thị {Math.min(compareData.limit, compareData.operatorRefs.missingInSupabase.count)} / {compareData.operatorRefs.missingInSupabase.count}
                      </div>
                    </div>
                    <div className="max-h-[420px] overflow-auto text-sm font-mono space-y-1">
                      {compareData.operatorRefs.missingInSupabase.items.map((x) => (
                        <div key={x} className="px-2 py-1 bg-amber-50 rounded">{x}</div>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Nếu danh sách này &gt; 0 thì khi sync schedules sẽ có record bị <b>skip</b> do không resolve được operator.
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
