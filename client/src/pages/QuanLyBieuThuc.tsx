import { useState, useEffect, useMemo } from "react"
import { toast } from "react-toastify"
import { Plus, Search, RefreshCw, ChevronDown, ChevronUp, Calculator, DollarSign, TrendingUp, CheckCircle, XCircle } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/layout/StatusBadge"
import { ActionMenu } from "@/components/ui/ActionMenu"
import { serviceFormulaService } from "@/services/service-formula.service"
import type { ServiceFormula } from "@/types"
import { useUIStore } from "@/store/ui.store"
import { FormulaDialog } from "@/components/service/FormulaDialog"
import { useDialogHistory } from "@/hooks/useDialogHistory"

export default function QuanLyBieuThuc() {
  const [formulas, setFormulas] = useState<ServiceFormula[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFormula, setSelectedFormula] = useState<ServiceFormula | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"create" | "edit" | "view">("create")
  const [expandedSections, setExpandedSections] = useState<Set<'quantity' | 'price'>>(new Set(['quantity', 'price']))
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [createFormulaType, setCreateFormulaType] = useState<'quantity' | 'price'>('quantity')
  const setTitle = useUIStore((state) => state.setTitle)

  // Handle browser back button for dialog
  const { handleDialogOpenChange } = useDialogHistory(dialogOpen, setDialogOpen, "formulaDialogOpen")

  useEffect(() => {
    setTitle("Quản lý biểu thức")
    loadFormulas()
  }, [setTitle])

  const loadFormulas = async () => {
    setIsLoading(true)
    try {
      const data = await serviceFormulaService.getAll()
      setFormulas(data)
    } catch (error) {
      console.error("Failed to load formulas:", error)
      toast.error("Không thể tải danh sách biểu thức. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSection = (type: 'quantity' | 'price') => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }

  const filteredFormulas = (type: 'quantity' | 'price') => {
    return formulas.filter((formula) => {
      if (formula.formulaType !== type) return false

      // Fulltext search - search across all fields
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchableText = [
          formula.code,
          formula.name,
          formula.description || '',
          formula.usedByServices || '',
        ].join(' ').toLowerCase()
        
        if (!searchableText.includes(query)) {
          return false
        }
      }

      // Status filter
      if (filterStatus) {
        const isActive = filterStatus === "active"
        if (formula.isActive !== isActive) return false
      }

      return true
    })
  }

  const handleCreate = (type: 'quantity' | 'price') => {
    setSelectedFormula(null)
    setCreateFormulaType(type)
    setViewMode("create")
    setDialogOpen(true)
  }

  const handleEdit = (formula: ServiceFormula) => {
    setSelectedFormula(formula)
    setViewMode("edit")
    setDialogOpen(true)
  }

  const handleView = (formula: ServiceFormula) => {
    setSelectedFormula(formula)
    setViewMode("view")
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa biểu thức này?")) {
      try {
        await serviceFormulaService.delete(id)
        toast.success("Xóa biểu thức thành công")
        loadFormulas()
      } catch (error: any) {
        console.error("Failed to delete formula:", error)
        toast.error(error.response?.data?.error || "Không thể xóa biểu thức. Vui lòng thử lại sau.")
      }
    }
  }

  const quantityFormulas = filteredFormulas('quantity')
  const priceFormulas = filteredFormulas('price')

  // Statistics
  const stats = useMemo(() => ({
    total: formulas.length,
    quantity: quantityFormulas.length,
    price: priceFormulas.length,
    active: formulas.filter(f => f.isActive).length,
    inactive: formulas.filter(f => !f.isActive).length,
  }), [formulas, quantityFormulas.length, priceFormulas.length])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
            <Calculator className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
              Quản lý biểu thức
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Quản lý biểu thức tính số lượng và tính đơn giá
            </p>
          </div>
        </div>

        <Button onClick={loadFormulas} disabled={isLoading} variant="outline" className="px-4 py-2.5 rounded-xl">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-12 gap-4">
        {/* Primary Stat - Hero Card */}
        <div className="col-span-12 lg:col-span-4 bg-gradient-to-br from-violet-500 via-violet-600 to-purple-600 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 text-violet-100 mb-2">
              <Calculator className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-wider">Tổng biểu thức</span>
            </div>
            <p className="text-6xl font-bold tracking-tight">{stats.total.toLocaleString()}</p>
            <div className="flex items-center gap-2 mt-4 text-violet-100">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Đang quản lý trong hệ thống</span>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Quantity */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-100 group-hover:bg-blue-500 transition-colors">
                <Calculator className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                {stats.total > 0 ? Math.round((stats.quantity / stats.total) * 100) : 0}%
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.quantity.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">Tính số lượng</p>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.quantity / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Price */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-green-100 group-hover:bg-green-500 transition-colors">
                <DollarSign className="w-4 h-4 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {stats.total > 0 ? Math.round((stats.price / stats.total) * 100) : 0}%
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.price.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">Tính đơn giá</p>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.price / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

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
            <p className="text-sm text-slate-500 mt-1">Đang áp dụng</p>
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
            <p className="text-sm text-slate-500 mt-1">Ngừng áp dụng</p>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.inactive / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tìm kiếm</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo mã, tên, ghi chú, dịch vụ..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lọc theo trạng thái</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="active">Đang áp dụng</option>
                  <option value="inactive">Ngừng áp dụng</option>
                </select>
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
                <TableHead className="w-10"></TableHead>
                <TableHead>Mã biểu thức</TableHead>
                <TableHead>Tên biểu thức</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead>Đang được sử dụng bởi dịch vụ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Đang tải...
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Tính số lượng Section */}
                  <TableRow className="bg-blue-50">
                    <TableCell colSpan={7} className="p-0">
                      <div className="w-full flex items-center justify-between p-4 hover:bg-blue-100">
                        <div 
                          className="flex items-center gap-2 cursor-pointer flex-1"
                          onClick={() => toggleSection('quantity')}
                        >
                          {expandedSections.has('quantity') ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                          <span className="font-semibold text-gray-900">Tính số lượng</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCreate('quantity')}
                          className="h-7"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Thêm
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedSections.has('quantity') && (
                    <>
                      {quantityFormulas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      ) : (
                        quantityFormulas.map((formula) => (
                          <TableRow key={formula.id} className="hover:bg-gray-50">
                            <TableCell>
                              <Checkbox />
                            </TableCell>
                            <TableCell className="font-medium">{formula.code}</TableCell>
                            <TableCell>{formula.name}</TableCell>
                            <TableCell>{formula.description || "-"}</TableCell>
                            <TableCell>
                              {formula.usedByServices || "-"}
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                status={formula.isActive ? "active" : "inactive"}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center">
                                <ActionMenu
                                  items={[
                                    {
                                      label: "Xem",
                                      onClick: () => handleView(formula),
                                      variant: "info",
                                    },
                                    {
                                      label: "Sửa",
                                      onClick: () => handleEdit(formula),
                                      variant: "warning",
                                    },
                                    {
                                      label: "Xóa",
                                      onClick: () => handleDelete(formula.id),
                                      variant: "danger",
                                    },
                                  ]}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </>
                  )}

                  {/* Tính đơn giá Section */}
                  <TableRow className="bg-green-50">
                    <TableCell colSpan={7} className="p-0">
                      <div className="w-full flex items-center justify-between p-4 hover:bg-green-100">
                        <div 
                          className="flex items-center gap-2 cursor-pointer flex-1"
                          onClick={() => toggleSection('price')}
                        >
                          {expandedSections.has('price') ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                          <span className="font-semibold text-gray-900">Tính đơn giá</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCreate('price')}
                          className="h-7"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Thêm
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedSections.has('price') && (
                    <>
                      {priceFormulas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      ) : (
                        priceFormulas.map((formula) => (
                          <TableRow key={formula.id} className="hover:bg-gray-50">
                            <TableCell>
                              <Checkbox />
                            </TableCell>
                            <TableCell className="font-medium">{formula.code}</TableCell>
                            <TableCell>{formula.name}</TableCell>
                            <TableCell>{formula.description || "-"}</TableCell>
                            <TableCell>
                              {formula.usedByServices || "-"}
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                status={formula.isActive ? "active" : "inactive"}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center">
                                <ActionMenu
                                  items={[
                                    {
                                      label: "Xem",
                                      onClick: () => handleView(formula),
                                      variant: "info",
                                    },
                                    {
                                      label: "Sửa",
                                      onClick: () => handleEdit(formula),
                                      variant: "warning",
                                    },
                                    {
                                      label: "Xóa",
                                      onClick: () => handleDelete(formula.id),
                                      variant: "danger",
                                    },
                                  ]}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog */}
      <FormulaDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        viewMode={viewMode}
        selectedFormula={selectedFormula}
        onSuccess={loadFormulas}
        defaultFormulaType={viewMode === "create" ? createFormulaType : undefined}
      />
    </div>
  )
}

