import { useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import {
  Plus,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Autocomplete } from "@/components/ui/autocomplete"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ActionMenu } from "@/components/ui/ActionMenu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { Schedule } from "@/types"
import { scheduleService } from "@/services/schedule.service"
import { quanlyDataService } from "@/services/quanly-data.service"

type DirectionFilter = "all" | "Đi" | "Về"
type FrequencyType = "daily" | "weekly" | "specific_days"

const ITEMS_PER_PAGE = 50

type RouteOption = { id: string; code: string; name: string }
type OperatorOption = { id: string; name: string; code?: string }

const daysOfWeekOptions: Array<{ value: number; label: string }> = [
  { value: 2, label: "T2" },
  { value: 3, label: "T3" },
  { value: 4, label: "T4" },
  { value: 5, label: "T5" },
  { value: 6, label: "T6" },
  { value: 7, label: "T7" },
  { value: 1, label: "CN" },
]

function parseNumberList(input: string): number[] {
  const parts = input
    .split(/[,\s]+/g)
    .map((p) => p.trim())
    .filter(Boolean)
  const nums = parts.map((p) => Number(p)).filter((n) => Number.isFinite(n))
  return Array.from(new Set(nums))
}

export default function QuanLySchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [routes, setRoutes] = useState<RouteOption[]>([])
  const [operators, setOperators] = useState<OperatorOption[]>([])

  const [searchQuery, setSearchQuery] = useState("")
  const [filterRouteId, setFilterRouteId] = useState<string>("")
  const [filterOperatorId, setFilterOperatorId] = useState<string>("")
  const [direction, setDirection] = useState<DirectionFilter>("Đi")

  const [isLoading, setIsLoading] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(schedules.length / ITEMS_PER_PAGE))

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState<{
    scheduleCode: string
    routeId: string
    operatorId: string
    departureTime: string // HH:mm
    direction: "Đi" | "Về"
    frequencyType: FrequencyType
    daysOfWeek: number[]
    daysOfMonthText: string // comma separated
    effectiveFrom: string // YYYY-MM-DD
    effectiveTo: string
    calendarType: "solar" | "lunar"
    notificationNumber: string
    tripStatus: string
  }>({
    scheduleCode: "",
    routeId: "",
    operatorId: "",
    departureTime: "06:00",
    direction: "Đi",
    frequencyType: "daily",
    daysOfWeek: [2, 3, 4, 5, 6],
    daysOfMonthText: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
    calendarType: "solar",
    notificationNumber: "",
    tripStatus: "Hoạt động",
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterRouteId, filterOperatorId, direction])

  useEffect(() => {
    let cancelled = false
    async function init() {
      setIsLoading(true)
      try {
        const data = await quanlyDataService.getAll(["routes", "operators"], true)
        if (cancelled) return
        setRoutes(
          (data.routes || [])
            .map((r) => ({
              id: String((r as any).id || "").trim(),
              code: String((r as any).code || (r as any).routeCode || "").trim(),
              name: String((r as any).name || (r as any).routeName || "").trim(),
            }))
            .filter((r) => r.id && r.code),
        )
        setOperators(
          (data.operators || [])
            .map((o) => ({
              id: String((o as any).id || "").trim(),
              name: String((o as any).name || "").trim(),
              code: String((o as any).code || "").trim() || undefined,
            }))
            .filter((o) => o.id && o.name),
        )
      } catch (e) {
        toast.error("Không thể tải routes/operators")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [])

  const loadSchedules = async (forceRefresh = false) => {
    setIsLoading(true)
    try {
      const routeId = filterRouteId || undefined
      const operatorId = filterOperatorId || undefined
      const dir = direction === "all" ? undefined : direction
      const data = await scheduleService.getAll(routeId, operatorId, true, dir)
      setSchedules(data)
      // If creating and form has empty selects, prefill
      if (data.length > 0 && !form.routeId && routes.length > 0) {
        const firstRoute = routes.find((r) => r.id === data[0].routeId)
        if (firstRoute) setForm((p) => ({ ...p, routeId: firstRoute.id }))
      }
    } catch (e) {
      toast.error("Không thể tải schedules")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSchedules(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRouteId, filterOperatorId, direction])

  const filteredSchedules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return schedules

    return schedules.filter((s) => {
      const routeName = s.route?.routeName || ""
      const routeCode = s.route?.routeCode || ""
      const opName = s.operator?.name || ""
      return (
        (s.scheduleCode || "").toLowerCase().includes(q) ||
        routeName.toLowerCase().includes(q) ||
        routeCode.toLowerCase().includes(q) ||
        opName.toLowerCase().includes(q) ||
        s.departureTime.toLowerCase().includes(q) ||
        (s.direction || "").toLowerCase().includes(q)
      )
    })
  }, [schedules, searchQuery])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredSchedules.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredSchedules, currentPage])

  const onSubmitCreate = async () => {
    if (!form.routeId) {
      toast.error("Thiếu routeId")
      return
    }
    if (!form.operatorId) {
      toast.error("Thiếu operatorId")
      return
    }
    if (!form.departureTime) {
      toast.error("Thiếu departureTime (HH:mm)")
      return
    }
    if (!form.effectiveFrom) {
      toast.error("Thiếu effectiveFrom")
      return
    }

    const daysOfMonth = form.daysOfMonthText ? parseNumberList(form.daysOfMonthText) : []

    const payload = {
      scheduleCode: form.scheduleCode || undefined,
      routeId: form.routeId,
      operatorId: form.operatorId,
      departureTime: form.departureTime,
      frequencyType: form.frequencyType,
      daysOfWeek: form.frequencyType === "weekly" ? form.daysOfWeek : undefined,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || undefined,
      direction: form.direction,
      daysOfMonth: form.frequencyType === "specific_days" ? daysOfMonth : undefined,
      calendarType: form.calendarType,
      notificationNumber: form.notificationNumber || undefined,
      tripStatus: form.tripStatus || undefined,
    }

    try {
      setIsSubmitting(true)
      await scheduleService.create(payload as any)
      toast.success("Tạo schedule thành công")
      setCreateOpen(false)
      await loadSchedules(true)
    } catch (e) {
      toast.error("Tạo schedule thất bại")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDirectionToggle = (v: DirectionFilter) => setDirection(v)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-orange-50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-xl shadow-orange-500/30">
              <Clock className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Quản lý schedules</h1>
              <p className="text-slate-500 text-sm mt-1">
                Quản lý biểu đồ giờ / lịch chạy (Buýt/Tuyến cố định)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => loadSchedules(true)}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm schedule
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo scheduleCode, tuyến, đơn vị, giờ..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 px-2 flex-wrap">
            <div className="w-56">
              <Label className="text-xs text-slate-500 mb-1 block">Direction</Label>
              <Select value={direction} onChange={(e) => handleDirectionToggle(e.target.value as DirectionFilter)}>
                <option value="all">Tất cả</option>
                <option value="Đi">Đi</option>
                <option value="Về">Về</option>
              </Select>
            </div>
            <div className="w-56">
              <Label className="text-xs text-slate-500 mb-1 block">Route</Label>
              <Select value={filterRouteId} onChange={(e) => setFilterRouteId(e.target.value)}>
                <option value="">Tất cả</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-56">
              <Label className="text-xs text-slate-500 mb-1 block">Operator</Label>
              <Select value={filterOperatorId} onChange={(e) => setFilterOperatorId(e.target.value)}>
                <option value="">Tất cả</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}{o.code ? ` (${o.code})` : ""}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Schedule</TableHead>
                <TableHead>Tuyến</TableHead>
                <TableHead>Đơn vị</TableHead>
                <TableHead className="text-center">Giờ</TableHead>
                <TableHead className="text-center">Direction</TableHead>
                <TableHead className="text-center">Frequency</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <div className="animate-pulse h-8 bg-slate-100 rounded w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-slate-500">
                    Không có schedules
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono">
                      <div className="flex flex-col">
                        <span className="font-semibold">{s.scheduleCode}</span>
                        <span className="text-xs text-slate-500">{s.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.route?.routeCode ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{s.route.routeCode}</span>
                          <span className="text-xs text-slate-500">{s.route.routeName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {s.operator?.name ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{s.operator.name}</span>
                          <span className="text-xs text-slate-500">{s.operator.code}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{s.departureTime}</TableCell>
                    <TableCell className="text-center">{s.direction || "—"}</TableCell>
                    <TableCell className="text-center">{s.frequencyType}</TableCell>
                    <TableCell className="text-center">
                      {s.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          Ngừng
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <ActionMenu
                        items={[
                          {
                            label: "Chỉnh sửa (TODO)",
                            onClick: () => toast.info("Chưa hỗ trợ chỉnh sửa schedule"),
                            variant: "warning",
                          },
                          {
                            label: "Xóa (TODO)",
                            onClick: () => toast.info("Chưa hỗ trợ xóa schedule"),
                            variant: "danger",
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredSchedules.length > ITEMS_PER_PAGE && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Hiển thị{" "}
                {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredSchedules.length)}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredSchedules.length)} /{" "}
                {filteredSchedules.length.toLocaleString()} schedules
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600 tabular-nums">
                  {currentPage}/{totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-[920px]">
            <DialogHeader>
              <DialogTitle>Thêm schedule</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Route</Label>
                <Autocomplete
                  value={form.routeId}
                  onChange={(value) => setForm((p) => ({ ...p, routeId: value }))}
                  options={routes.map((r) => ({
                    value: r.id,
                    label: `${r.code} - ${r.name}`,
                  }))}
                  placeholder="Gõ để tìm tuyến..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Operator</Label>
                <Select value={form.operatorId} onChange={(e) => setForm((p) => ({ ...p, operatorId: e.target.value }))}>
                  <option value="">Chọn đơn vị</option>
                  {operators.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}{o.code ? ` (${o.code})` : ""}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Departure Time</Label>
                <Input
                  type="time"
                  value={form.departureTime}
                  onChange={(e) => setForm((p) => ({ ...p, departureTime: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Direction</Label>
                <Select value={form.direction} onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value as any }))}>
                  <option value="Đi">Đi</option>
                  <option value="Về">Về</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Frequency Type</Label>
                <Select
                  value={form.frequencyType}
                  onChange={(e) => setForm((p) => ({ ...p, frequencyType: e.target.value as FrequencyType }))}
                >
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                  <option value="specific_days">specific_days</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Schedule code (optional)</Label>
                <Input value={form.scheduleCode} onChange={(e) => setForm((p) => ({ ...p, scheduleCode: e.target.value }))} />
              </div>

              {form.frequencyType === "weekly" && (
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Days of week</Label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeekOptions.map((d) => {
                      const checked = form.daysOfWeek.includes(d.value)
                      return (
                        <Button
                          key={d.value}
                          type="button"
                          variant={checked ? "default" : "outline"}
                          className="h-9 px-3"
                          onClick={() => {
                            setForm((p) => {
                              const set = new Set(p.daysOfWeek)
                              if (set.has(d.value)) set.delete(d.value)
                              else set.add(d.value)
                              return { ...p, daysOfWeek: Array.from(set).sort((a, b) => a - b) }
                            })
                          }}
                        >
                          {d.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}

              {form.frequencyType === "specific_days" && (
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-medium">Days of month (comma-separated, 1-31)</Label>
                  <Input
                    placeholder="VD: 1,15,30"
                    value={form.daysOfMonthText}
                    onChange={(e) => setForm((p) => ({ ...p, daysOfMonthText: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium">Effective from</Label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Effective to (optional)</Label>
                <Input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) => setForm((p) => ({ ...p, effectiveTo: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Calendar type</Label>
                <Select value={form.calendarType} onChange={(e) => setForm((p) => ({ ...p, calendarType: e.target.value as any }))}>
                  <option value="solar">solar</option>
                  <option value="lunar">lunar</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Notification number (optional)</Label>
                <Input
                  value={form.notificationNumber}
                  onChange={(e) => setForm((p) => ({ ...p, notificationNumber: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Trip status (optional)</Label>
                <Input value={form.tripStatus} onChange={(e) => setForm((p) => ({ ...p, tripStatus: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="button" onClick={onSubmitCreate} disabled={isSubmitting}>
                {isSubmitting ? "Đang tạo..." : "Tạo schedule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

