import { useState, useEffect, useMemo } from "react"
import { toast } from "react-toastify"
import { Plus, Search, Wrench, TrendingUp, CheckCircle, XCircle, Package } from "lucide-react"
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
import { StatusBadge } from "@/components/layout/StatusBadge"
import { ServiceDialog } from "@/components/service/ServiceDialog"
import { ActionMenu } from "@/components/ui/ActionMenu"
import { serviceService } from "@/services/service.service"
import type { Service } from "@/types"
import { useUIStore } from "@/store/ui.store"
import { useDialogHistory } from "@/hooks/useDialogHistory"

export default function QuanLyDichVu() {
  const [services, setServices] = useState<Service[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"create" | "edit" | "view">("create")
  const setTitle = useUIStore((state) => state.setTitle)

  // Handle browser back button for dialog
  const { handleDialogOpenChange } = useDialogHistory(dialogOpen, setDialogOpen, "serviceDialogOpen")

  useEffect(() => {
    setTitle("Quản lý dịch vụ")
    loadServices()
  }, [setTitle])

  const loadServices = async () => {
    setIsLoading(true)
    try {
      const data = await serviceService.getAll()
      setServices(data)
    } catch (error) {
      console.error("Failed to load services:", error)
      toast.error("Không thể tải danh sách dịch vụ. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredServices = services.filter((service) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        service.code.toLowerCase().includes(query) ||
        service.name.toLowerCase().includes(query) ||
        service.unit.toLowerCase().includes(query) ||
        service.materialType.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }

    // Status filter
    if (filterStatus) {
      const isActive = filterStatus === "active"
      if (service.isActive !== isActive) return false
    }

    return true
  })

  // Stats calculations
  const stats = useMemo(() => {
    const active = services.filter(s => s.isActive).length
    const inactive = services.length - active
    const withFormula = services.filter(s => s.useQuantityFormula || s.usePriceFormula).length
    return { total: services.length, active, inactive, withFormula }
  }, [services])

  const handleCreate = () => {
    setSelectedService(null)
    setViewMode("create")
    setDialogOpen(true)
  }

  const handleEdit = async (service: Service) => {
    try {
      // Load đầy đủ thông tin dịch vụ bao gồm biểu thức đã chọn
      const fullService = await serviceService.getById(service.id)
      setSelectedService(fullService)
      setViewMode("edit")
      setDialogOpen(true)
    } catch (error) {
      console.error("Failed to load service details:", error)
      toast.error("Không thể tải thông tin dịch vụ. Vui lòng thử lại sau.")
    }
  }

  const handleView = async (service: Service) => {
    try {
      // Load đầy đủ thông tin dịch vụ bao gồm biểu thức đã chọn
      const fullService = await serviceService.getById(service.id)
      setSelectedService(fullService)
      setViewMode("view")
      setDialogOpen(true)
    } catch (error) {
      console.error("Failed to load service details:", error)
      toast.error("Không thể tải thông tin dịch vụ. Vui lòng thử lại sau.")
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này?")) {
      try {
        await serviceService.delete(id)
        toast.success("Xóa dịch vụ thành công")
        loadServices()
      } catch (error: any) {
        console.error("Failed to delete service:", error)
        toast.error(error.response?.data?.error || "Không thể xóa dịch vụ. Vui lòng thử lại sau.")
      }
    }
  }

  const handleToggleStatus = async (service: Service) => {
    try {
      await serviceService.update(service.id, { isActive: !service.isActive } as any)
      toast.success(`Đã ${service.isActive ? "vô hiệu hóa" : "kích hoạt"} dịch vụ`)
      loadServices()
    } catch (error) {
      console.error("Failed to toggle service status:", error)
      toast.error("Không thể thay đổi trạng thái dịch vụ")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-xl shadow-emerald-500/30">
              <Wrench className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Quản lý dịch vụ
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Quản lý thông tin dịch vụ
              </p>
            </div>
          </div>

          <Button onClick={handleCreate} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30">
            <Plus className="mr-2 h-4 w-4" />
            Thêm dịch vụ
          </Button>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-12 gap-4">
          {/* Primary Stat - Hero Card */}
          <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-emerald-100 mb-2">
                <Wrench className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Tổng dịch vụ</span>
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
                  <CheckCircle className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
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
                  <XCircle className="w-4 h-4 text-rose-600 group-hover:text-white transition-colors" />
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

            {/* With Formula */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-100 group-hover:bg-blue-500 transition-colors">
                  <Package className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  {stats.total > 0 ? Math.round((stats.withFormula / stats.total) * 100) : 0}%
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.withFormula.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Có công thức</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.withFormula / stats.total) * 100 : 0}%` }}
                />
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
                placeholder="Tìm kiếm theo mã dịch vụ, tên dịch vụ, đơn vị tính..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterStatus" className="text-sm font-medium">
                  Lọc theo trạng thái
                </Label>
                <Select
                  id="filterStatus"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Ngừng hoạt động</option>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center sticky left-0 bg-white z-10">Tên dịch vụ</TableHead>
                <TableHead className="text-center">Đơn vị tính</TableHead>
                <TableHead className="text-center">Phần trăm thuế</TableHead>
                <TableHead className="text-center">Loại vật tư/hàng hóa</TableHead>
                <TableHead className="text-center">Sử dụng công thức tính số lượng</TableHead>
                <TableHead className="text-center">Sử dụng công thức tính đơn giá</TableHead>
                <TableHead className="text-center">Mặc định chọn</TableHead>
                <TableHead className="text-center">Tự động tính số lượng</TableHead>
                <TableHead className="text-center sticky right-0 bg-white z-10">Trạng thái</TableHead>
                <TableHead className="text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium text-center sticky left-0 bg-white z-10">
                      {service.name}
                    </TableCell>
                    <TableCell className="text-center">{service.unit}</TableCell>
                    <TableCell className="text-center">{service.taxPercentage}%</TableCell>
                    <TableCell className="text-center">{service.materialType}</TableCell>
                    <TableCell className="text-center">
                      {service.useQuantityFormula ? "✓" : "✗"}
                    </TableCell>
                    <TableCell className="text-center">
                      {service.usePriceFormula ? "✓" : "✗"}
                    </TableCell>
                    <TableCell className="text-center">
                      {service.isDefault ? "✓" : "✗"}
                    </TableCell>
                    <TableCell className="text-center">
                      {service.autoCalculateQuantity ? "✓" : "✗"}
                    </TableCell>
                    <TableCell className="text-center sticky right-0 bg-white z-10">
                      <StatusBadge
                        status={service.isActive ? "active" : "inactive"}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <ActionMenu
                          items={[
                            {
                              label: "Xem",
                              onClick: () => handleView(service),
                              variant: "info",
                            },
                            {
                              label: "Sửa",
                              onClick: () => handleEdit(service),
                              variant: "warning",
                            },
                            {
                              label: service.isActive ? "Vô hiệu hóa" : "Kích hoạt",
                              onClick: () => handleToggleStatus(service),
                              variant: service.isActive ? "warning" : "info",
                            },
                            {
                              label: "Xóa",
                              onClick: () => handleDelete(service.id),
                              variant: "danger",
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
        </div>
      </Card>

      {/* Dialog */}
      <ServiceDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        viewMode={viewMode}
        selectedService={selectedService}
        onSuccess={loadServices}
      />
      </div>
    </div>
  )
}

