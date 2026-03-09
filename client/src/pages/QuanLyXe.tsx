import { useState, useEffect, useMemo, useCallback } from "react"
import { toast } from "react-toastify"
import {
  Plus,
  Search,
  Car,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Calendar,
  Building2,
  Users,
  TrendingUp,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ActionMenu } from "@/components/ui/ActionMenu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { vehicleService, VehicleForm, VehicleView } from "@/features/fleet/vehicles"
import { vehicleBadgeService } from "@/features/fleet/vehicle-badges"
import { operatorService } from "@/features/fleet/operators"
import { routeService } from "@/features/fleet/routes"
import { quanlyDataService } from "@/services/quanly-data.service"
import { useAppSheetPolling } from "@/hooks/use-appsheet-polling"
import { normalizeVehicleRows, type NormalizedAppSheetVehicle } from "@/services/appsheet-normalize-vehicles"
import { normalizeBadgeRows, type NormalizedAppSheetBadge } from "@/services/appsheet-normalize-badges"
import { normalizeOperatorRows, type NormalizedAppSheetOperator } from "@/services/appsheet-normalize-operators"
import { normalizeFixedRouteRows } from "@/services/appsheet-normalize-fixed-routes"
import { normalizeBusRouteRows } from "@/services/appsheet-normalize-bus-routes"
import type { Vehicle } from "@/types"
import { useUIStore } from "@/store/ui.store"
import { format, isValid, parseISO } from "date-fns"
import { useDialogHistory } from "@/hooks/useDialogHistory"

// Helper functions
const getVehicleTypeName = (vehicle: Vehicle): string => {
  const v = vehicle as any
  // Only use vehicleCategory (LoaiPhuongTien from AppSheet/metadata)
  // No fallback to vehicle_types.name (misleading "Loại khác" for unmatched vehicles)
  return v.vehicleCategory || ''
}

const getOperatorName = (vehicle: Vehicle): string => {
  const v = vehicle as any
  return vehicle.operator?.name || v.operatorName || ""
}

const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "N/A"
  if (dateString.includes('/')) return dateString
  const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString)
  return isValid(date) ? format(date, "dd/MM/yyyy") : "N/A"
}

// Skeleton Row Component
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-4 py-4"><div className="h-10 w-32 bg-slate-200 rounded-xl" /></td>
    <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
    <td className="px-4 py-4 text-center"><div className="h-8 w-8 bg-slate-200 rounded-lg mx-auto" /></td>
    <td className="px-4 py-4"><div className="h-4 w-40 bg-slate-200 rounded" /></td>
    <td className="px-4 py-4 text-center"><div className="h-4 w-24 bg-slate-200 rounded mx-auto" /></td>
    <td className="px-4 py-4 text-center"><div className="h-6 w-20 bg-slate-200 rounded-full mx-auto" /></td>
    <td className="px-4 py-4"><div className="h-8 w-16 bg-slate-200 rounded mx-auto" /></td>
  </tr>
)

// Quick Filter Chip
const QuickFilter = ({ label, count, active, onClick }: { 
  label: string; count?: number; active?: boolean; onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
      active 
        ? "bg-sky-500 text-white shadow-md shadow-sky-500/25" 
        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`}
  >
    {label}
    {count !== undefined && (
      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
        active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
      }`}>
        {count.toLocaleString()}
      </span>
    )}
  </button>
)

const ITEMS_PER_PAGE = 50

export default function QuanLyXe() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [operatorCount, setOperatorCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterVehicleType, setFilterVehicleType] = useState("")
  const [filterOperator, setFilterOperator] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [quickFilter, setQuickFilter] = useState<"all" | "active" | "inactive">("all")
  // Always filter to only show badge vehicles (Buýt/TCĐ)
  const showOnlyBadgeVehicles = true
  const [isLoading, setIsLoading] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"create" | "edit" | "view">("create")
  const [currentPage, setCurrentPage] = useState(1)
  const [displayMode, setDisplayMode] = useState<"table" | "grid">("table")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const setTitle = useUIStore((state) => state.setTitle)

  // Handle browser back button for dialog
  const { handleDialogOpenChange } = useDialogHistory(dialogOpen, setDialogOpen, "vehicleDialogOpen")

  // AppSheet polling: auto-update vehicles every 10s from GTVT
  const normPlate = (p: string) => (p || '').replace(/[\s.\-]/g, '').toUpperCase()

  const handleAppSheetData = useCallback((data: NormalizedAppSheetVehicle[], _isInitial: boolean) => {
    setVehicles(prev => {
      const plateMap = new Map(prev.map(v => [normPlate(v.plateNumber), v]))
      let changed = false

      for (const av of data) {
        const existing = plateMap.get(av.plateNumber)
        if (existing) {
          // Only update AppSheet-sourced fields, never overwrite user edits
          if (av.seatCapacity && av.seatCapacity !== (existing as any).seatCapacity) {
            (existing as any).seatCapacity = av.seatCapacity
            changed = true
          }
        }
        // Don't add new vehicles from AppSheet - they need operator resolution
      }

      return changed ? [...plateMap.values()] : prev
    })
  }, [])

  const { lastPollAt } = useAppSheetPolling({
    endpointKey: 'vehicles',
    normalize: normalizeVehicleRows,
    onData: handleAppSheetData,
    onSyncToDb: (data) => vehicleService.syncFromAppSheet(data),
    getKey: (v) => v.plateNumber,
    enabled: true,
  })

  // Badge polling: sync PHUHIEUXE to DB + build plate→operatorRef lookup
  const [plateToOperatorRef, setPlateToOperatorRef] = useState<Map<string, string>>(new Map())

  useAppSheetPolling({
    endpointKey: 'badges',
    normalize: normalizeBadgeRows,
    onData: (data: NormalizedAppSheetBadge[]) => {
      // Build plate → operatorRef map for resolution chain
      const map = new Map<string, string>()
      for (const b of data) {
        if (b.plateNumber && b.operatorRef) map.set(b.plateNumber, b.operatorRef)
      }
      setPlateToOperatorRef(map)
    },
    onSyncToDb: (data) => vehicleBadgeService.syncFromAppSheet(data),
    getKey: (b) => b.badgeNumber,
    enabled: true,
  })

  // Operator polling: sync THONGTINDONVIVANTAI to DB + build ref→name lookup
  const [operatorRefMap, setOperatorRefMap] = useState<Map<string, { name: string; province: string }>>(new Map())

  useAppSheetPolling({
    endpointKey: 'operators',
    normalize: normalizeOperatorRows,
    onData: (data: NormalizedAppSheetOperator[]) => {
      // Build firebaseId → {name, province} for resolution chain
      const map = new Map<string, { name: string; province: string }>()
      for (const op of data) {
        if (op.firebaseId) map.set(op.firebaseId, { name: op.name, province: op.province || '' })
      }
      setOperatorRefMap(map)
    },
    onSyncToDb: (data) => operatorService.syncFromAppSheet(data),
    getKey: (op) => op.firebaseId,
    enabled: true,
  })

  // Route polling: sync DANHMUCTUYENCODINH + DANHMUCTUYENBUYT to DB (no UI state needed)
  useAppSheetPolling({
    endpointKey: 'fixedRoutes',
    normalize: normalizeFixedRouteRows,
    onData: () => {},
    onSyncToDb: (data) => routeService.syncFromAppSheet(data),
    getKey: (r) => (r as any).routeCode,
    enabled: true,
  })

  useAppSheetPolling({
    endpointKey: 'busRoutes',
    normalize: normalizeBusRouteRows,
    onData: () => {},
    onSyncToDb: (data) => routeService.syncFromAppSheet(data),
    getKey: (r) => (r as any).firebaseId,
    enabled: true,
  })

  useEffect(() => {
    setTitle("Quản lý xe")
    loadData()
  }, [setTitle])

  const loadData = async (forceRefresh = false) => {
    setIsLoading(true)
    try {
      // Use optimized unified endpoint - single request for all data
      const data = await quanlyDataService.getAll(['vehicles', 'operators', 'badges'], forceRefresh)

      // Convert to expected formats
      const vehicleData: Vehicle[] = (data.vehicles || []).map(v => ({
        id: v.id,
        plateNumber: v.plateNumber,
        seatCapacity: v.seatCapacity,
        operatorName: v.operatorName || '',
        vehicleTypeName: v.vehicleType || '',
        vehicleCategory: v.vehicleCategory || '',
        inspectionExpiryDate: v.inspectionExpiryDate,
        isActive: v.isActive,
        hasBadge: v.hasBadge,
      } as any))

      setVehicles(vehicleData)

      // Count only operators with vehicles that have Buýt/Tuyến cố định badges
      const badges = data.badges || [];
      const vehicles2 = data.vehicles || [];
      const allOperators = data.operators || [];
      const allowedTypes = ["Buýt", "Tuyến cố định"];
      const normPlate = (p: string) => p?.replace(/[\s.\-]/g, "").toUpperCase() || "";
      const badgePlates = new Set(
        badges.filter(b => allowedTypes.includes(b.badge_type)).map(b => normPlate(b.license_plate_sheet)).filter(Boolean)
      );
      const opIds = new Set<string>();
      const opNames = new Set<string>();
      for (const v of vehicles2) {
        if (v.plateNumber && badgePlates.has(normPlate(v.plateNumber))) {
          if (v.operatorId) opIds.add(v.operatorId);
          if (v.operatorName) opNames.add(v.operatorName.trim().toUpperCase());
        }
      }
      const filteredOpCount = allOperators.filter(
        op => opIds.has(op.id) || opNames.has(op.name?.trim().toUpperCase())
      ).length;
      setOperatorCount(filteredOpCount)
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Không thể tải danh sách xe. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  // Resolution chain: plate → badge.operatorRef → operator.name
  // Falls back to backend-provided operatorName if AppSheet data not yet loaded
  const resolveOperatorName = useCallback((vehicle: Vehicle): string => {
    const plate = (vehicle.plateNumber || '').replace(/[\s.\-]/g, '').toUpperCase()
    if (plate && plateToOperatorRef.size > 0 && operatorRefMap.size > 0) {
      const ref = plateToOperatorRef.get(plate)
      if (ref) {
        const op = operatorRefMap.get(ref)
        if (op?.name) return op.name
      }
    }
    return getOperatorName(vehicle)
  }, [plateToOperatorRef, operatorRefMap])

  // Filter base for dropdown options: only badge vehicles when badge filter is on
  const badgeBaseVehicles = useMemo(() =>
    showOnlyBadgeVehicles ? vehicles.filter(v => v.hasBadge) : vehicles,
    [vehicles, showOnlyBadgeVehicles]
  )
  // Get unique vehicle types and operators for filter options
  const vehicleTypes = useMemo(() =>
    Array.from(new Set(badgeBaseVehicles.map(getVehicleTypeName).filter(Boolean))).sort(),
    [badgeBaseVehicles]
  )
  const operatorNames = useMemo(() =>
    Array.from(new Set(badgeBaseVehicles.map(resolveOperatorName).filter(Boolean))).sort(),
    [badgeBaseVehicles, resolveOperatorName]
  )

  // Stats calculations - reuse badge-filtered base
  const stats = useMemo(() => {
    const active = badgeBaseVehicles.filter(v => v.isActive).length
    const inactive = badgeBaseVehicles.length - active
    // Use operatorCount from same data source as Đơn vị vận tải page for consistency
    return { total: badgeBaseVehicles.length, active, inactive, uniqueOperators: operatorCount }
  }, [badgeBaseVehicles, operatorCount])

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle: Vehicle) => {
      const vehicleTypeName = getVehicleTypeName(vehicle)
      const operatorName = resolveOperatorName(vehicle)

      // Badge filter - default ON (only show vehicles with Buýt/TCĐ badges)
      if (showOnlyBadgeVehicles && !vehicle.hasBadge) return false

      // Quick filter
      if (quickFilter === "active" && !vehicle.isActive) return false
      if (quickFilter === "inactive" && vehicle.isActive) return false

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          (vehicle.plateNumber?.toLowerCase() || "").includes(query) ||
          (vehicle.chassisNumber?.toLowerCase() || "").includes(query) ||
          operatorName.toLowerCase().includes(query) ||
          vehicleTypeName.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      if (filterVehicleType && vehicleTypeName !== filterVehicleType) return false
      if (filterOperator && operatorName !== filterOperator) return false
      if (filterStatus) {
        const isActive = filterStatus === "active"
        if (vehicle.isActive !== isActive) return false
      }

      return true
    })
  }, [vehicles, searchQuery, filterVehicleType, filterOperator, filterStatus, quickFilter, showOnlyBadgeVehicles, resolveOperatorName])

  // Pagination
  const totalPages = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE)
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredVehicles.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredVehicles, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterVehicleType, filterOperator, filterStatus, quickFilter])

  const handleCreate = () => {
    setSelectedVehicle(null)
    setViewMode("create")
    setDialogOpen(true)
  }

  const handleEdit = async (vehicle: Vehicle) => {
    try {
      // Fetch full vehicle details for edit mode (list only has summary data)
      const fullVehicle = await vehicleService.getById(vehicle.id)
      setSelectedVehicle(fullVehicle)
      setViewMode("edit")
      setDialogOpen(true)
    } catch (error) {
      console.error("Failed to load vehicle details:", error)
      toast.error("Không thể tải thông tin xe. Vui lòng thử lại.")
    }
  }

  const handleView = async (vehicle: Vehicle) => {
    try {
      // Fetch full vehicle details for view mode
      const fullVehicle = await vehicleService.getById(vehicle.id)
      setSelectedVehicle(fullVehicle)
      setViewMode("view")
      setDialogOpen(true)
    } catch (error) {
      console.error("Failed to load vehicle details:", error)
      toast.error("Không thể tải thông tin xe. Vui lòng thử lại.")
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setFilterVehicleType("")
    setFilterOperator("")
    setFilterStatus("")
    setQuickFilter("all")
  }

  const hasActiveFilters = searchQuery || filterVehicleType || filterOperator || filterStatus

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-sky-50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-xl shadow-sky-500/30">
              <Car className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Quản lý xe
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Quản lý thông tin phương tiện vận tải
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => loadData(true)}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button
              onClick={handleCreate}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-semibold hover:from-sky-600 hover:to-cyan-600 shadow-lg shadow-sky-500/30 transition-all hover:shadow-xl hover:shadow-sky-500/40 hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm xe
            </Button>
          </div>
        </div>

        {/* Hero Stats - Asymmetric Layout */}
        <div className="grid grid-cols-12 gap-4">
          {/* Primary Stat - Hero Card */}
          <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-sky-500 via-sky-600 to-cyan-600 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-sky-100 mb-2">
                <Car className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Tổng số xe</span>
              </div>
              <p className="text-6xl font-bold tracking-tight">{stats.total.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-4 text-sky-100">
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
                  <div className="w-2 h-2 rounded-full bg-emerald-500 group-hover:bg-white animate-pulse" />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.active.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Đang hoạt động</p>
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
                  <div className="w-2 h-2 rounded-full bg-rose-500 group-hover:bg-white" />
                </div>
                <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                  {stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0}%
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.inactive.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Ngừng hoạt động</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.inactive / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Operators */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-amber-100 group-hover:bg-amber-500 transition-colors">
                  <Building2 className="w-4 h-4 text-amber-600 group-hover:text-white transition-colors" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.uniqueOperators.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Đơn vị vận tải</p>
              <div className="mt-3 flex items-center gap-1">
                {Array.from({ length: Math.min(5, stats.uniqueOperators) }).map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white -ml-2 first:ml-0" />
                ))}
                {stats.uniqueOperators > 5 && (
                  <span className="text-xs text-slate-500 ml-1">+{stats.uniqueOperators - 5}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Unified Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-col lg:flex-row lg:items-center gap-2">
          {/* Search Input */}
          <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl">
            <Search className="w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm kiếm biển số, đơn vị vận tải..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Divider */}
          <div className="hidden lg:block w-px h-10 bg-slate-200" />
          
          {/* Quick Filters */}
          <div className="flex items-center gap-2 px-2">
            <QuickFilter 
              label="Tất cả" 
              count={stats.total} 
              active={quickFilter === "all"} 
              onClick={() => setQuickFilter("all")} 
            />
            <QuickFilter 
              label="Hoạt động" 
              count={stats.active} 
              active={quickFilter === "active"} 
              onClick={() => setQuickFilter("active")} 
            />
            <QuickFilter 
              label="Ngừng" 
              count={stats.inactive} 
              active={quickFilter === "inactive"} 
              onClick={() => setQuickFilter("inactive")} 
            />
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-10 bg-slate-200" />

          {/* View Toggle */}
          <div className="flex items-center gap-2 px-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setDisplayMode("table")}
                className={`p-2.5 rounded-lg transition-all ${
                  displayMode === "table" 
                    ? "bg-white text-sky-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDisplayMode("grid")}
                className={`p-2.5 rounded-lg transition-all ${
                  displayMode === "grid" 
                    ? "bg-white text-sky-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            <Button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2.5 rounded-xl border transition-all ${
                showAdvancedFilters || hasActiveFilters
                  ? "bg-sky-50 border-sky-200 text-sky-600"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Nâng cao
            </Button>
          </div>
        </div>

        {/* Advanced Filter Panel */}
        {showAdvancedFilters && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2 block">Loại xe</Label>
                <select
                  value={filterVehicleType}
                  onChange={(e) => setFilterVehicleType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                >
                  <option value="">Tất cả loại xe</option>
                  {vehicleTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2 block">Đơn vị vận tải</Label>
                <select
                  value={filterOperator}
                  onChange={(e) => setFilterOperator(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                >
                  <option value="">Tất cả đơn vị</option>
                  {operatorNames.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-600 mb-2 block">Trạng thái</Label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 transition-all"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Ngừng hoạt động</option>
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                  Xóa bộ lọc
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Results info */}
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Hiển thị <strong className="text-slate-700">{paginatedVehicles.length}</strong> trong tổng số <strong className="text-slate-700">{filteredVehicles.length.toLocaleString()}</strong> xe
            {lastPollAt && (
              <span className="ml-3 text-xs text-slate-400">
                GTVT cập nhật: {format(lastPollAt, "HH:mm:ss")}
              </span>
            )}
          </span>
          {totalPages > 1 && (
            <span>Trang {currentPage} / {totalPages}</span>
          )}
        </div>

        {/* Content - Table View */}
        {displayMode === "table" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-900">
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-[150px]">
                      Biển kiểm soát
                    </th>
                    <th className="px-3 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-[150px]">
                      Loại xe
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider w-[100px]">
                      Số chỗ
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-[280px]">
                      Đơn vị vận tải
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider w-[140px]">
                      Hạn đăng kiểm
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider w-[130px]">
                      Trạng thái
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider w-[100px]">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : paginatedVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="relative mb-4">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-100 to-cyan-100 flex items-center justify-center">
                              <Car className="h-12 w-12 text-sky-500" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-sky-500 flex items-center justify-center">
                              <Plus className="w-4 h-4 text-sky-500" />
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-1">Chưa có xe nào</h3>
                          <p className="text-slate-500 mb-4">Bắt đầu bằng cách thêm xe đầu tiên vào hệ thống</p>
                          {hasActiveFilters ? (
                            <Button onClick={clearFilters} className="text-sky-600 hover:text-sky-700">
                              Xóa bộ lọc
                            </Button>
                          ) : (
                            <Button onClick={handleCreate} className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-6 py-2.5">
                              <Plus className="w-4 h-4 mr-2" />
                              Thêm xe mới
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedVehicles.map((vehicle: any, index) => (
                      <tr 
                        key={vehicle.id} 
                        className="group hover:bg-sky-50/50 transition-colors"
                        style={{ 
                          animation: 'fadeInUp 0.3s ease forwards',
                          animationDelay: `${index * 30}ms`,
                          opacity: 0
                        }}
                      >
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm font-bold bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg whitespace-nowrap">
                            {vehicle.plateNumber}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <span className="text-slate-600 block">{getVehicleTypeName(vehicle) || "N/A"}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm">
                            {vehicle.seatCapacity || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2 min-w-0">
                            <Building2 className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-slate-600 text-sm leading-tight line-clamp-2">
                              {resolveOperatorName(vehicle) || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-slate-600">
                            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-sm whitespace-nowrap">{formatDate(vehicle.inspectionExpiryDate)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                            vehicle.isActive 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              vehicle.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`} />
                            {vehicle.isActive ? "Hoạt động" : "Ngừng"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                            <ActionMenu
                              items={[
                                {
                                  label: "Xem chi tiết",
                                  onClick: () => handleView(vehicle),
                                  variant: "info",
                                },
                                {
                                  label: "Chỉnh sửa",
                                  onClick: () => handleEdit(vehicle),
                                  variant: "warning",
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content - Grid View */}
        {displayMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-200" />
                    <div className="flex-1">
                      <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-100 rounded" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
              ))
            ) : paginatedVehicles.length === 0 ? (
              <div className="col-span-full py-16 text-center">
                <Car className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800">Không tìm thấy xe nào</h3>
              </div>
            ) : (
              paginatedVehicles.map((vehicle: any, index) => (
                <div 
                  key={vehicle.id} 
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-sky-200 transition-all group hover:-translate-y-1"
                  style={{ 
                    animation: 'fadeInUp 0.3s ease forwards',
                    animationDelay: `${index * 50}ms`,
                    opacity: 0
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-100 to-cyan-100 flex items-center justify-center group-hover:from-sky-500 group-hover:to-cyan-500 transition-colors">
                        <Car className="h-6 w-6 text-sky-600 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-mono font-bold text-slate-800">{vehicle.plateNumber}</h3>
                        <p className="text-sm text-slate-500">{getVehicleTypeName(vehicle) || "N/A"}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      vehicle.isActive 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        vehicle.isActive ? "bg-emerald-500" : "bg-slate-400"
                      }`} />
                      {vehicle.isActive ? "Hoạt động" : "Ngừng"}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600 truncate">{resolveOperatorName(vehicle) || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{vehicle.seatCapacity || "N/A"} chỗ</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Đăng kiểm: {formatDate(vehicle.inspectionExpiryDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                    <ActionMenu
                      items={[
                        {
                          label: "Xem chi tiết",
                          onClick: () => handleView(vehicle),
                          variant: "info",
                        },
                        {
                          label: "Chỉnh sửa",
                          onClick: () => handleEdit(vehicle),
                          variant: "warning",
                        },
                      ]}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Hiển thị {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredVehicles.length)} trong tổng số {filteredVehicles.length.toLocaleString()} xe
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => 
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, array) => (
                      <span key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-slate-400">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[40px] h-10 rounded-xl text-sm font-medium transition-all ${
                            currentPage === page
                              ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      </span>
                    ))}
                </div>

                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Vehicle Dialog */}
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto p-6">
            <DialogClose onClose={() => handleDialogOpenChange(false)} />
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/25">
                  <Car className="h-5 w-5 text-white" />
                </div>
                {viewMode === "create" && "Thêm xe mới"}
                {viewMode === "edit" && "Sửa thông tin xe"}
                {viewMode === "view" && "Chi tiết xe"}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {viewMode === "view" && selectedVehicle ? (
                <VehicleView vehicle={selectedVehicle} />
              ) : (
                <VehicleForm
                  vehicle={selectedVehicle}
                  mode={viewMode === "view" ? "create" : viewMode}
                  onClose={() => {
                    setDialogOpen(false)
                    loadData(true) // Force refresh to show new/updated vehicle
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
