import { useState, useEffect, useMemo } from "react"
import { toast } from "react-toastify"
import {
  Plus,
  Search,
  Users,
  UserCheck,
  UserX,
  Phone,
  CreditCard,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ActionMenu } from "@/components/ui/ActionMenu"
import { driverService } from "@/services/driver.service"
import type { Driver } from "@/types"
import { useUIStore } from "@/store/ui.store"
import { DriverDialog } from "@/components/driver/DriverDialog"
import { formatDateOnly } from "@/lib/date-utils"
import { useDialogHistory } from "@/hooks/useDialogHistory"

// Avatar color based on name hash
const getAvatarColor = (name: string) => {
  const colors = [
    'from-sky-400 to-sky-600',
    'from-emerald-400 to-emerald-600', 
    'from-amber-400 to-amber-600',
    'from-rose-400 to-rose-600',
    'from-violet-400 to-violet-600',
    'from-cyan-400 to-cyan-600',
    'from-pink-400 to-pink-600',
    'from-indigo-400 to-indigo-600',
  ]
  const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Skeleton Row Component
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-200" />
        <div>
          <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-20 bg-slate-100 rounded" />
        </div>
      </div>
    </td>
    <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
    <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
    <td className="px-6 py-4 text-center"><div className="h-4 w-24 bg-slate-200 rounded mx-auto" /></td>
    <td className="px-6 py-4 text-center"><div className="h-6 w-20 bg-slate-200 rounded-full mx-auto" /></td>
    <td className="px-6 py-4"><div className="h-8 w-24 bg-slate-200 rounded mx-auto" /></td>
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
        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25" 
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

export default function QuanLyLaiXe() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [quickFilter, setQuickFilter] = useState<"all" | "active" | "inactive">("all")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"create" | "edit" | "view">("create")
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [displayMode, setDisplayMode] = useState<"table" | "grid">("table")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null)
  const setTitle = useUIStore((state) => state.setTitle)

  // Handle browser back button for dialog
  const { handleDialogOpenChange } = useDialogHistory(dialogOpen, setDialogOpen, "driverDialogOpen")

  useEffect(() => {
    setTitle("Quản lý lái xe")
    loadDrivers()
  }, [setTitle])

  const loadDrivers = async () => {
    setIsLoading(true)
    try {
      const data = await driverService.getAll()
      setDrivers(data)
    } catch (error) {
      console.error("Failed to load drivers:", error)
      toast.error("Không thể tải danh sách lái xe. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  // Stats
  const stats = useMemo(() => {
    const active = drivers.filter(d => d.isActive).length
    const inactive = drivers.length - active
    const withLicense = drivers.filter(d => d.licenseNumber).length
    return { total: drivers.length, active, inactive, withLicense }
  }, [drivers])

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      // Quick filter
      if (quickFilter === "active" && !driver.isActive) return false
      if (quickFilter === "inactive" && driver.isActive) return false

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          driver.fullName.toLowerCase().includes(query) ||
          (driver.phone || '').toLowerCase().includes(query) ||
          (driver.licenseNumber || '').toLowerCase().includes(query)
        if (!matchesSearch) return false
      }
      if (filterStatus) {
        const isActive = filterStatus === "active"
        if (driver.isActive !== isActive) return false
      }
      return true
    })
  }, [drivers, searchQuery, filterStatus, quickFilter])

  // Pagination
  const totalPages = Math.ceil(filteredDrivers.length / ITEMS_PER_PAGE)
  const paginatedDrivers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredDrivers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredDrivers, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, quickFilter])

  const handleCreate = () => {
    setSelectedDriver(null)
    setViewMode("create")
    setDialogOpen(true)
  }

  const handleEdit = (driver: Driver) => {
    setSelectedDriver(driver)
    setViewMode("edit")
    setDialogOpen(true)
  }

  const handleView = (driver: Driver) => {
    setSelectedDriver(driver)
    setViewMode("view")
    setDialogOpen(true)
  }

  const handleViewImage = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl)
    setImageDialogOpen(true)
  }

  const handleDelete = (driver: Driver) => {
    setDriverToDelete(driver)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!driverToDelete) return
    try {
      await driverService.delete(driverToDelete.id)
      toast.success("Xóa lái xe thành công")
      setDeleteDialogOpen(false)
      setDriverToDelete(null)
      loadDrivers()
    } catch (error) {
      console.error("Failed to delete driver:", error)
      toast.error("Không thể xóa lái xe. Vui lòng thử lại.")
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setFilterStatus("")
    setQuickFilter("all")
  }

  const hasActiveFilters = searchQuery || filterStatus

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-xl shadow-emerald-500/30">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Quản lý lái xe
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Quản lý thông tin tài xế vận tải
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={loadDrivers}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button
              onClick={handleCreate}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm lái xe
            </Button>
          </div>
        </div>

        {/* Hero Stats - Asymmetric Layout */}
        <div className="grid grid-cols-12 gap-4">
          {/* Primary Stat - Hero Card */}
          <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-600 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-emerald-100 mb-2">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Tổng số lái xe</span>
              </div>
              <p className="text-6xl font-bold tracking-tight">{stats.total.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-4 text-emerald-100">
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
                  <UserCheck className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
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
                  <UserX className="w-4 h-4 text-rose-600 group-hover:text-white transition-colors" />
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

            {/* With License */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-amber-100 group-hover:bg-amber-500 transition-colors">
                  <CreditCard className="w-4 h-4 text-amber-600 group-hover:text-white transition-colors" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.withLicense.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Có bằng lái</p>
              <div className="mt-3 flex items-center gap-1">
                {Array.from({ length: Math.min(5, stats.withLicense) }).map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white -ml-2 first:ml-0" />
                ))}
                {stats.withLicense > 5 && (
                  <span className="text-xs text-slate-500 ml-1">+{stats.withLicense - 5}</span>
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
              placeholder="Tìm kiếm tên, số điện thoại, bằng lái..."
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
                    ? "bg-white text-emerald-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDisplayMode("grid")}
                className={`p-2.5 rounded-lg transition-all ${
                  displayMode === "grid" 
                    ? "bg-white text-emerald-600 shadow-sm" 
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
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
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
                <Label className="text-sm font-medium text-slate-600 mb-2 block">Trạng thái</Label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
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
            Hiển thị <strong className="text-slate-700">{paginatedDrivers.length}</strong> trong tổng số <strong className="text-slate-700">{filteredDrivers.length.toLocaleString()}</strong> lái xe
          </span>
          {totalPages > 1 && (
            <span>Trang {currentPage} / {totalPages}</span>
          )}
        </div>

        {/* Content - Table View */}
        {displayMode === "table" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-900">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Lái xe
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Số điện thoại
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Số bằng lái
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                      Hạn bằng lái
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : paginatedDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center">
                          <div className="relative mb-4">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center">
                              <Users className="h-12 w-12 text-emerald-500" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center">
                              <Plus className="w-4 h-4 text-emerald-500" />
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-1">Chưa có lái xe nào</h3>
                          <p className="text-slate-500 mb-4">Bắt đầu bằng cách thêm lái xe đầu tiên</p>
                          {hasActiveFilters ? (
                            <Button onClick={clearFilters} className="text-emerald-600 hover:text-emerald-700">
                              Xóa bộ lọc
                            </Button>
                          ) : (
                            <Button onClick={handleCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6 py-2.5">
                              <Plus className="w-4 h-4 mr-2" />
                              Thêm lái xe
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDrivers.map((driver, index) => (
                      <tr 
                        key={driver.id} 
                        className="group hover:bg-emerald-50/50 transition-colors"
                        style={{ 
                          animation: 'fadeInUp 0.3s ease forwards',
                          animationDelay: `${index * 30}ms`,
                          opacity: 0
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {driver.imageUrl ? (
                              <img 
                                src={driver.imageUrl} 
                                alt={driver.fullName}
                                className="w-10 h-10 rounded-xl object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => handleViewImage(driver.imageUrl!)}
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(driver.fullName)} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                                {driver.fullName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-800">{driver.fullName}</p>
                              <p className="text-xs text-slate-500">Hạng {driver.licenseClass || "B2"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600">{driver.phone || "N/A"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg">
                            {driver.licenseNumber || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-slate-600">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="text-sm">{formatDateOnly(driver.licenseExpiryDate)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            driver.isActive 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              driver.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`} />
                            {driver.isActive ? "Hoạt động" : "Ngừng"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                            <ActionMenu
                              items={[
                                {
                                  label: "Xem chi tiết",
                                  onClick: () => handleView(driver),
                                  variant: "info",
                                },
                                {
                                  label: "Chỉnh sửa",
                                  onClick: () => handleEdit(driver),
                                  variant: "warning",
                                },
                                {
                                  label: "Xóa",
                                  onClick: () => handleDelete(driver),
                                  variant: "danger",
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
                    <div className="w-14 h-14 rounded-xl bg-slate-200" />
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
            ) : paginatedDrivers.length === 0 ? (
              <div className="col-span-full py-16 text-center">
                <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800">Không tìm thấy lái xe nào</h3>
              </div>
            ) : (
              paginatedDrivers.map((driver, index) => (
                <div 
                  key={driver.id} 
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-emerald-200 transition-all group hover:-translate-y-1"
                  style={{ 
                    animation: 'fadeInUp 0.3s ease forwards',
                    animationDelay: `${index * 50}ms`,
                    opacity: 0
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {driver.imageUrl ? (
                        <img 
                          src={driver.imageUrl} 
                          alt={driver.fullName}
                          className="w-14 h-14 rounded-xl object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => handleViewImage(driver.imageUrl!)}
                        />
                      ) : (
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAvatarColor(driver.fullName)} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                          {driver.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-800">{driver.fullName}</h3>
                        <p className="text-sm text-slate-500">Hạng {driver.licenseClass || "B2"}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      driver.isActive 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        driver.isActive ? "bg-emerald-500" : "bg-slate-400"
                      }`} />
                      {driver.isActive ? "Hoạt động" : "Ngừng"}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{driver.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600 font-mono">{driver.licenseNumber || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Hạn: {formatDateOnly(driver.licenseExpiryDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                    <ActionMenu
                      items={[
                        {
                          label: "Xem chi tiết",
                          onClick: () => handleView(driver),
                          variant: "info",
                        },
                        {
                          label: "Chỉnh sửa",
                          onClick: () => handleEdit(driver),
                          variant: "warning",
                        },
                        {
                          label: "Xóa",
                          onClick: () => handleDelete(driver),
                          variant: "danger",
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
                Hiển thị {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredDrivers.length)} trong tổng số {filteredDrivers.length.toLocaleString()} lái xe
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
                              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
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

        {/* Driver Dialog */}
        <DriverDialog
          open={dialogOpen}
          onOpenChange={handleDialogOpenChange}
          mode={viewMode}
          driver={selectedDriver}
          onSuccess={loadDrivers}
        />

        {/* Image Preview Dialog */}
        {imageDialogOpen && selectedImageUrl && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setImageDialogOpen(false)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <button
                onClick={() => setImageDialogOpen(false)}
                className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={selectedImageUrl}
                alt="Preview"
                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteDialogOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-rose-100">
                  <AlertCircle className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Xác nhận xóa lái xe</h3>
                  <p className="text-sm text-slate-500">Thao tác này không thể hoàn tác</p>
                </div>
              </div>
              <p className="text-slate-600 mb-6">
                Bạn có chắc chắn muốn xóa lái xe <strong className="text-slate-800">{driverToDelete?.fullName}</strong>?
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => {
                    setDeleteDialogOpen(false)
                    setDriverToDelete(null)
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Hủy
                </Button>
                <Button
                  onClick={confirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white hover:from-rose-600 hover:to-red-600 shadow-lg shadow-rose-500/25 transition-all"
                >
                  Xóa lái xe
                </Button>
              </div>
            </div>
          </div>
        )}
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
