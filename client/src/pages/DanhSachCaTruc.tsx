import { useState, useEffect, useMemo } from "react"
import { toast } from "react-toastify"
import { Plus, Search, Clock, FileSpreadsheet, TrendingUp, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import * as XLSX from "xlsx"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ActionMenu } from "@/components/ui/ActionMenu"
import { shiftService, type Shift } from "@/services/shift.service"
import { useUIStore } from "@/store/ui.store"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useDialogHistory } from "@/hooks/useDialogHistory"

const shiftSchema = z.object({
  name: z.string().min(1, "Tên ca trực là bắt buộc"),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Giờ bắt đầu không hợp lệ (HH:mm)"),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Giờ kết thúc không hợp lệ (HH:mm)"),
})

type ShiftFormData = z.infer<typeof shiftSchema>

export default function DanhSachCaTruc() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"create" | "edit">("create")
  const setTitle = useUIStore((state) => state.setTitle)

  // Handle browser back button for dialog
  const { handleDialogOpenChange } = useDialogHistory(dialogOpen, setDialogOpen, "shiftDialogOpen")

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
  })

  useEffect(() => {
    setTitle("Quản lý thông tin > Danh sách ca trực")
    loadShifts()
  }, [setTitle])

  const loadShifts = async () => {
    setIsLoading(true)
    try {
      const data = await shiftService.getAll()
      setShifts(data)
    } catch (error) {
      console.error("Failed to load shifts:", error)
      toast.error("Không thể tải danh sách ca trực. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredShifts = shifts.filter((shift) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        shift.name.toLowerCase().includes(query) ||
        shift.startTime.toLowerCase().includes(query) ||
        shift.endTime.toLowerCase().includes(query)
      )
    }
    return true
  })

  // Statistics
  const stats = useMemo(() => ({
    total: shifts.length,
    filtered: filteredShifts.length,
  }), [shifts.length, filteredShifts.length])

  const handleCreate = () => {
    setSelectedShift(null)
    setViewMode("create")
    reset({
      name: "",
      startTime: "",
      endTime: "",
    })
    setDialogOpen(true)
  }

  const handleEdit = (shift: Shift) => {
    setSelectedShift(shift)
    setViewMode("edit")
    reset({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa ca trực này?")) {
      try {
        await shiftService.delete(id)
        toast.success("Xóa ca trực thành công")
        loadShifts()
      } catch (error) {
        console.error("Failed to delete shift:", error)
        toast.error("Không thể xóa ca trực. Có thể ca trực này đang được sử dụng.")
      }
    }
  }

  const onSubmit = async (data: ShiftFormData) => {
    try {
      if (viewMode === "create") {
        await shiftService.create(data)
        toast.success("Tạo ca trực thành công")
      } else if (selectedShift) {
        await shiftService.update(selectedShift.id, data)
        toast.success("Cập nhật ca trực thành công")
      }
      setDialogOpen(false)
      loadShifts()
    } catch (error) {
      console.error("Failed to save shift:", error)
      toast.error(`Không thể ${viewMode === "create" ? "tạo" : "cập nhật"} ca trực. Vui lòng thử lại sau.`)
    }
  }

  const handleExportExcel = () => {
    if (filteredShifts.length === 0) {
      toast.warning("Không có dữ liệu để xuất Excel")
      return
    }

    try {
      // Prepare data for Excel
      const excelData = filteredShifts.map((item, index) => ({
        "STT": index + 1,
        "Tên ca trực": item.name,
        "Giờ bắt đầu ca": item.startTime,
        "Giờ kết thúc ca": item.endTime,
      }))

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Danh sách ca trực")

      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 20 },  // Tên ca trực
        { wch: 18 },  // Giờ bắt đầu ca
        { wch: 18 },  // Giờ kết thúc ca
      ]
      ws['!cols'] = colWidths

      // Generate filename with current date
      const currentDate = format(new Date(), "dd-MM-yyyy")
      const filename = `Danh-sach-ca-truc_${currentDate}.xlsx`

      // Write file
      XLSX.writeFile(wb, filename)
      
      toast.success(`Đã xuất Excel thành công: ${filename}`)
    } catch (error) {
      console.error("Failed to export Excel:", error)
      toast.error("Không thể xuất Excel. Vui lòng thử lại sau.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/30">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
              Danh sách ca trực
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Quản lý thời gian ca làm việc
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={loadShifts} disabled={isLoading} variant="outline" className="px-4 py-2.5 rounded-xl">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={isLoading || filteredShifts.length === 0}
            className="px-4 py-2.5 rounded-xl"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Xuất Excel
          </Button>
          <Button onClick={handleCreate} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold hover:from-sky-600 hover:to-blue-700 shadow-lg shadow-sky-500/30">
            <Plus className="mr-2 h-4 w-4" />
            Thêm ca trực
          </Button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-12 gap-4">
        {/* Primary Stat - Hero Card */}
        <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-sky-500 via-sky-600 to-blue-600 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sky-100 mb-2">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-wider">Tổng ca trực</span>
            </div>
            <p className="text-6xl font-bold tracking-tight">{stats.total.toLocaleString()}</p>
            <div className="flex items-center gap-2 mt-4 text-sky-100">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Đang quản lý trong hệ thống</span>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="col-span-12 lg:col-span-7 grid grid-cols-2 gap-4">
          {/* Filtered Results */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-amber-100 group-hover:bg-amber-500 transition-colors">
                <Search className="w-4 h-4 text-amber-600 group-hover:text-white transition-colors" />
              </div>
              {searchQuery && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  Đang lọc
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.filtered.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">Kết quả hiển thị</p>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.total > 0 ? (stats.filtered / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Placeholder Info Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 transition-colors">
                <Clock className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stats.total.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-1">Ca đang hoạt động</p>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Tìm kiếm theo tên ca trực, giờ bắt đầu, giờ kết thúc..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Tên ca trực</TableHead>
              <TableHead className="text-center">Giờ bắt đầu ca</TableHead>
              <TableHead className="text-center">Giờ kết thúc ca</TableHead>
              <TableHead className="text-center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredShifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              filteredShifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium text-center">
                    <div className="flex items-center justify-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      {shift.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{shift.startTime}</TableCell>
                  <TableCell className="text-center">{shift.endTime}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <ActionMenu
                        items={[
                          {
                            label: "Sửa",
                            onClick: () => handleEdit(shift),
                            variant: "warning",
                          },
                          {
                            label: "Xóa",
                            onClick: () => handleDelete(shift.id),
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
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {viewMode === "create" ? "Thêm ca trực mới" : "Chỉnh sửa ca trực"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Tên ca trực <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ví dụ: Ca 1, Ca 2, Hành chính..."
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">
                  Giờ bắt đầu ca <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  {...register("startTime")}
                />
                {errors.startTime && (
                  <p className="text-sm text-red-500">{errors.startTime.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">
                  Giờ kết thúc ca <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  {...register("endTime")}
                />
                {errors.endTime && (
                  <p className="text-sm text-red-500">{errors.endTime.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit">
                {viewMode === "create" ? "Tạo mới" : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

