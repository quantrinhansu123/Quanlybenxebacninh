import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { Plus, Edit, Trash2, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { StatusBadge } from "@/components/layout/StatusBadge"
import { scheduleService } from "@/services/schedule.service"
import { operatorService } from "@/services/operator.service"
import type { Route, Schedule, ScheduleInput, Operator } from "@/types"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"

interface RouteViewProps {
  route: Route
}

export function RouteView({ route }: RouteViewProps) {
  const [activeTab, setActiveTab] = useState("info")
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [scheduleViewMode, setScheduleViewMode] = useState<"create" | "edit">("create")
  const [operators, setOperators] = useState<Operator[]>([])

  useEffect(() => {
    if (activeTab === "schedules" && route.id) {
      loadSchedules()
      loadOperators()
    }
  }, [activeTab, route.id])

  const loadSchedules = async () => {
    setLoadingSchedules(true)
    try {
      const data = await scheduleService.getAll(route.id, undefined, undefined)
      setSchedules(data)
    } catch (error) {
      console.error("Failed to load schedules:", error)
      toast.error("Không thể tải danh sách biểu đồ giờ")
    } finally {
      setLoadingSchedules(false)
    }
  }

  const loadOperators = async () => {
    try {
      const data = await operatorService.getAll(true)
      setOperators(data)
    } catch (error) {
      console.error("Failed to load operators:", error)
    }
  }

  const handleCreateSchedule = () => {
    setSelectedSchedule(null)
    setScheduleViewMode("create")
    setScheduleDialogOpen(true)
  }

  const handleEditSchedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setScheduleViewMode("edit")
    setScheduleDialogOpen(true)
  }

  const handleDeleteSchedule = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa biểu đồ giờ này?")) {
      try {
        await scheduleService.delete(id)
        toast.success("Xóa biểu đồ giờ thành công")
        loadSchedules()
      } catch (error: any) {
        console.error("Failed to delete schedule:", error)
        toast.error(error.response?.data?.error || "Không thể xóa biểu đồ giờ")
      }
    }
  }

  const handleToggleScheduleStatus = async (schedule: Schedule) => {
    try {
      await scheduleService.update(schedule.id, { isActive: !schedule.isActive } as any)
      toast.success(`Đã ${schedule.isActive ? "vô hiệu hóa" : "kích hoạt"} biểu đồ giờ`)
      loadSchedules()
    } catch (error) {
      console.error("Failed to toggle schedule status:", error)
      toast.error("Không thể thay đổi trạng thái biểu đồ giờ")
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="info">Thông tin cơ bản</TabsTrigger>
        <TabsTrigger value="stops">Điểm dừng</TabsTrigger>
        <TabsTrigger value="schedules">Biểu đồ giờ</TabsTrigger>
        <TabsTrigger value="stats">Thống kê</TabsTrigger>
      </TabsList>
      <TabsContent value="info" className="space-y-6 mt-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-base font-semibold">Mã tuyến</Label>
            <p className="text-lg font-medium text-gray-900">{route.routeCode}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">Tên tuyến</Label>
            <p className="text-lg font-medium text-gray-900">{route.routeName}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">Điểm đi</Label>
            <p className="text-lg font-medium text-gray-900">
              {route.origin?.name || "N/A"} ({route.origin?.code || "N/A"})
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">Điểm đến</Label>
            <p className="text-lg font-medium text-gray-900">
              {route.destination?.name || "N/A"} ({route.destination?.code || "N/A"})
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">Khoảng cách</Label>
            <p className="text-lg font-medium text-gray-900">
              {route.distanceKm ? `${route.distanceKm} km` : "N/A"}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">Thời gian ước tính</Label>
            <p className="text-lg font-medium text-gray-900">
              {route.estimatedDurationMinutes
                ? `${route.estimatedDurationMinutes} phút`
                : "N/A"}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">Trạng thái</Label>
            <StatusBadge status={route.isActive ? "active" : "inactive"} />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="stops" className="space-y-4 mt-6">
        {route.stops && route.stops.length > 0 ? (
          <div className="space-y-3">
            {route.stops.map((stop) => (
              <Card key={stop.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold">
                        {stop.stopOrder}
                      </div>
                      <div>
                        <p className="font-medium">
                          {stop.location?.name || "Điểm dừng"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {stop.location?.code || ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      {stop.distanceFromOriginKm && (
                        <p>Khoảng cách: {stop.distanceFromOriginKm} km</p>
                      )}
                      {stop.estimatedMinutesFromOrigin && (
                        <p>Thời gian: {stop.estimatedMinutesFromOrigin} phút</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            Không có điểm dừng
          </p>
        )}
      </TabsContent>
      <TabsContent value="schedules" className="space-y-4 mt-6">
        <div className="flex justify-between items-center mb-4">
          <Label className="text-base font-semibold">Danh sách biểu đồ giờ</Label>
          <Button onClick={handleCreateSchedule} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Thêm biểu đồ giờ
          </Button>
        </div>
        {loadingSchedules ? (
          <p className="text-center py-8">Đang tải...</p>
        ) : schedules.length > 0 ? (
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{schedule.scheduleCode}</p>
                        <StatusBadge
                          status={schedule.isActive ? "active" : "inactive"}
                        />
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Giờ xuất bến: {format(new Date(`2000-01-01T${schedule.departureTime}`), "HH:mm")}
                        </p>
                        <p className="text-sm text-gray-600">
                          Nhà xe: {schedule.operator?.name || "N/A"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Tần suất: {
                            schedule.frequencyType === "daily" ? "Hàng ngày" :
                            schedule.frequencyType === "weekly" ? "Hàng tuần" :
                            schedule.frequencyType === "specific_days" ? `Thứ ${schedule.daysOfWeek?.join(", ")}` :
                            "N/A"
                          }
                        </p>
                        <p className="text-sm text-gray-600">
                          Hiệu lực từ: {format(new Date(schedule.effectiveFrom), "dd/MM/yyyy")}
                          {schedule.effectiveTo && ` đến ${format(new Date(schedule.effectiveTo), "dd/MM/yyyy")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditSchedule(schedule)}
                        aria-label="Sửa"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleScheduleStatus(schedule)}
                        aria-label={schedule.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                        title={schedule.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                      >
                        {schedule.isActive ? (
                          <X className="h-4 w-4 text-orange-600" />
                        ) : (
                          <Plus className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        aria-label="Xóa"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            Không có biểu đồ giờ. Nhấn "Thêm biểu đồ giờ" để tạo mới.
          </p>
        )}
      </TabsContent>
      <TabsContent value="stats" className="mt-6">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Số điểm dừng</p>
              <p className="text-2xl font-bold">{route.stops?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Số biểu đồ giờ</p>
              <p className="text-2xl font-bold">{schedules.length}</p>
            </CardContent>
          </Card>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Thống kê chi tiết sẽ được cập nhật sau
        </p>
      </TabsContent>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[95vh] overflow-y-auto p-6">
          <DialogClose onClose={() => setScheduleDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {scheduleViewMode === "create" && "Thêm biểu đồ giờ mới"}
              {scheduleViewMode === "edit" && "Sửa biểu đồ giờ"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <ScheduleForm
              schedule={selectedSchedule}
              routeId={route.id}
              operators={operators}
              mode={scheduleViewMode}
              onClose={() => {
                setScheduleDialogOpen(false)
                loadSchedules()
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}

function ScheduleForm({
  schedule,
  routeId,
  operators,
  mode,
  onClose,
}: {
  schedule: Schedule | null
  routeId: string
  operators: Operator[]
  mode: "create" | "edit"
  onClose: () => void
}) {
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  const scheduleSchema = z.object({
    scheduleCode: z.string().optional(), // Optional - will be auto-generated by backend
    operatorId: z.string().uuid("Vui lòng chọn nhà xe"),
    departureTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Định dạng giờ không hợp lệ (HH:MM)"),
    frequencyType: z.enum(['daily', 'weekly', 'specific_days']),
    daysOfWeek: z.array(z.number().int().min(1).max(7)).optional(),
    effectiveFrom: z.string().min(1, "Ngày hiệu lực từ là bắt buộc"),
    effectiveTo: z.string().optional(),
  }).refine((data) => {
    if (data.frequencyType === 'specific_days') {
      return data.daysOfWeek && data.daysOfWeek.length > 0
    }
    return true
  }, {
    message: "Vui lòng chọn ít nhất một ngày trong tuần",
    path: ["daysOfWeek"],
  })

  type ScheduleFormData = z.infer<typeof scheduleSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: schedule
      ? {
          scheduleCode: schedule.scheduleCode,
          operatorId: schedule.operatorId,
          departureTime: schedule.departureTime,
          frequencyType: schedule.frequencyType,
          daysOfWeek: schedule.daysOfWeek || [],
          effectiveFrom: schedule.effectiveFrom ? new Date(schedule.effectiveFrom).toISOString().split("T")[0] : "",
          effectiveTo: schedule.effectiveTo ? new Date(schedule.effectiveTo).toISOString().split("T")[0] : "",
        }
      : {
          frequencyType: 'daily',
          effectiveFrom: new Date().toISOString().split("T")[0],
        },
  })

  useEffect(() => {
    if (schedule) {
      setSelectedDays(schedule.daysOfWeek || [])
    }
  }, [schedule])

  const currentFrequencyType = watch("frequencyType")

  useEffect(() => {
    if (currentFrequencyType !== 'specific_days') {
      setSelectedDays([])
      setValue("daysOfWeek", [])
    }
  }, [currentFrequencyType, setValue])

  const toggleDay = (day: number) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day].sort()
    setSelectedDays(newDays)
    setValue("daysOfWeek", newDays)
  }

  const dayLabels: Record<number, string> = {
    1: "Thứ 2",
    2: "Thứ 3",
    3: "Thứ 4",
    4: "Thứ 5",
    5: "Thứ 6",
    6: "Thứ 7",
    7: "Chủ nhật",
  }

  const onSubmit = async (data: ScheduleFormData) => {
    try {
      const scheduleData: ScheduleInput = {
        scheduleCode: data.scheduleCode || undefined, // Will be auto-generated if not provided
        routeId: routeId,
        operatorId: data.operatorId,
        departureTime: data.departureTime,
        frequencyType: data.frequencyType,
        daysOfWeek: data.frequencyType === 'specific_days' ? data.daysOfWeek : undefined,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo || undefined,
      }

      if (mode === "create") {
        await scheduleService.create(scheduleData)
        toast.success("Thêm biểu đồ giờ thành công")
      } else if (schedule) {
        await scheduleService.update(schedule.id, scheduleData)
        toast.success("Cập nhật biểu đồ giờ thành công")
      }
      onClose()
    } catch (error: any) {
      console.error("Failed to save schedule:", error)
      toast.error(
        error.response?.data?.error || "Không thể lưu biểu đồ giờ. Vui lòng thử lại sau."
      )
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {mode === "edit" && schedule?.scheduleCode && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Label className="text-sm font-semibold text-blue-900">Mã biểu đồ giờ</Label>
          <p className="text-lg font-mono text-blue-700 mt-1">{schedule.scheduleCode}</p>
          <p className="text-xs text-blue-600 mt-1">Mã được tạo tự động bởi hệ thống</p>
        </div>
      )}
      {mode === "create" && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Lưu ý:</span> Mã biểu đồ giờ sẽ được tạo tự động sau khi lưu.
            Định dạng: BDG-{'{'}Mã tuyến{'}'}-{'{'}Mã nhà xe{'}'}-{'{'}Giờ xuất bến{'}'}
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="operatorId" className="text-base font-semibold">
            Nhà xe *
          </Label>
          <Select
            id="operatorId"
            className="h-11"
            {...register("operatorId")}
          >
            <option value="">Chọn nhà xe</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>
                {op.name} ({op.code})
              </option>
            ))}
          </Select>
          {errors.operatorId && (
            <p className="text-sm text-red-600 mt-1">{errors.operatorId.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="departureTime" className="text-base font-semibold">
            Giờ xuất bến (HH:MM) *
          </Label>
          <Input
            id="departureTime"
            type="time"
            lang="en-GB"
            className="h-11"
            {...register("departureTime")}
          />
          {errors.departureTime && (
            <p className="text-sm text-red-600 mt-1">{errors.departureTime.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="frequencyType" className="text-base font-semibold">
            Tần suất *
          </Label>
          <Select
            id="frequencyType"
            className="h-11"
            {...register("frequencyType")}
          >
            <option value="daily">Hàng ngày</option>
            <option value="weekly">Hàng tuần</option>
            <option value="specific_days">Ngày cụ thể trong tuần</option>
          </Select>
          {errors.frequencyType && (
            <p className="text-sm text-red-600 mt-1">{errors.frequencyType.message}</p>
          )}
        </div>
        {currentFrequencyType === 'specific_days' && (
          <div className="space-y-2 col-span-2">
            <Label className="text-base font-semibold">Chọn ngày trong tuần *</Label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <Button
                  key={day}
                  type="button"
                  variant={selectedDays.includes(day) ? "default" : "outline"}
                  onClick={() => toggleDay(day)}
                  className="min-w-[100px]"
                >
                  {dayLabels[day]}
                </Button>
              ))}
            </div>
            {errors.daysOfWeek && (
              <p className="text-sm text-red-600 mt-1">{errors.daysOfWeek.message}</p>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="effectiveFrom" className="text-base font-semibold">
            Hiệu lực từ *
          </Label>
          <Input
            id="effectiveFrom"
            type="date"
            className="h-11"
            {...register("effectiveFrom")}
          />
          {errors.effectiveFrom && (
            <p className="text-sm text-red-600 mt-1">{errors.effectiveFrom.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="effectiveTo" className="text-base font-semibold">
            Hiệu lực đến
          </Label>
          <Input
            id="effectiveTo"
            type="date"
            className="h-11"
            {...register("effectiveTo")}
          />
          {errors.effectiveTo && (
            <p className="text-sm text-red-600 mt-1">{errors.effectiveTo.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose} className="min-w-[100px]">
          Hủy
        </Button>
        <Button type="submit" className="min-w-[100px]">
          Lưu
        </Button>
      </div>
    </form>
  )
}

