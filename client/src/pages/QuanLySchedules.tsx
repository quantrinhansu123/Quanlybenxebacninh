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
  Eye,
  Database,
  FileText,
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
import { RouteScheduleViewTabs } from "@/components/RouteScheduleViewTabs"
import { NoticePdfInlineView, type NoticePdfSelection } from "@/components/notice/NoticePdfInlineView"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { Schedule } from "@/types"
import { scheduleService } from "@/services/schedule.service"
import { routeService } from "@/services/route.service"
import { gtvtSyncService } from "@/services/gtvt-sync.service"
import { useAuthStore } from "@/features/auth/store/authStore"
import {
  getScheduleNoticeFileUrl,
  getScheduleNoticeId,
} from "@/utils/schedule-notice-doc"

type DirectionFilter = "all" | "Đi" | "Về"
type FrequencyType = "daily" | "weekly" | "specific_days"
/** all | row-yes/no: lọc dòng; route-yes/no: lọc theo tuyến có ít nhất 1 file TB */
type VanBanFilter = "all" | "row-yes" | "row-no" | "route-yes" | "route-no"

function scheduleHasVanBan(s: Schedule): boolean {
  return Boolean(getScheduleNoticeFileUrl(s))
}

function getScheduleRouteKey(s: Schedule): string {
  return String(s.routeId || s.route?.routeCode || "").trim()
}

const ITEMS_PER_PAGE = 50

type RouteOption = { id: string; code: string; name: string }
type OperatorOption = { id: string; name: string; code?: string }

type RouteViewData = {
  id?: string
  routeCode?: string
  routeName?: string
  departureStation?: string
  departureProvince?: string
  arrivalStation?: string
  arrivalProvince?: string
  itinerary?: string
  routePath?: string
  routeType?: string
  operationStatus?: string
}

function mapRouteApiToViewData(route: Record<string, unknown>): RouteViewData {
  return {
    id: String(route.id || ""),
    routeCode: String(route.routeCode || ""),
    routeName: String(route.routeName || route.routeCode || ""),
    departureStation: (route.departureStation as string) || undefined,
    departureProvince: (route.departureProvince as string) || undefined,
    arrivalStation: (route.arrivalStation as string) || undefined,
    arrivalProvince: (route.arrivalProvince as string) || undefined,
    itinerary: (route.itinerary as string) || undefined,
    routePath: (route.routePath as string) || undefined,
    routeType: (route.routeType as string) || undefined,
    operationStatus: (route.operationStatus as string) || undefined,
  }
}

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
  const [routeViewOpen, setRouteViewOpen] = useState(false)
  const [routeViewLoading, setRouteViewLoading] = useState(false)
  const [routeViewData, setRouteViewData] = useState<RouteViewData | null>(null)
  const [routeViewSchedules, setRouteViewSchedules] = useState<Schedule[]>([])
  const [routeViewSchedulesLoading, setRouteViewSchedulesLoading] = useState(false)
  const [routeViewTab, setRouteViewTab] = useState<"info" | "schedules" | "documents" | "operation-notices">("info")
  const [tablePdfSelection, setTablePdfSelection] = useState<NoticePdfSelection>(null)
  const [isSyncingRouteView, setIsSyncingRouteView] = useState(false)
  const [isSyncingFromAppSheet, setIsSyncingFromAppSheet] = useState(false)
  const [isImportingFromAppSheet, setIsImportingFromAppSheet] = useState(false)

  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = currentUser?.role === "admin"

  const [searchQuery, setSearchQuery] = useState("")
  const [filterRouteId, setFilterRouteId] = useState<string>("")
  const [filterOperatorId, setFilterOperatorId] = useState<string>("")
  const [direction, setDirection] = useState<DirectionFilter>("all")
  const [filterVanBan, setFilterVanBan] = useState<VanBanFilter>("all")

  const [isLoading, setIsLoading] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)

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
  }, [searchQuery, filterRouteId, filterOperatorId, direction, filterVanBan])

  const loadSchedules = async (forceRefresh = false) => {
    setIsLoading(true)
    setSchedules([])
    try {
      const routeId = filterRouteId || undefined
      const operatorId = filterOperatorId || undefined
      const dir = direction === "all" ? undefined : direction
      const hasDocument =
        filterVanBan === "row-yes" ? true : filterVanBan === "row-no" ? false : undefined
      const data = await scheduleService.getAll(routeId, operatorId, undefined, dir, hasDocument)
      setSchedules(data)
      if (data.length > 0 && !form.routeId && data[0].routeId) {
        setForm((p) => ({ ...p, routeId: data[0].routeId }))
      }
    } catch (e) {
      setSchedules([])
      toast.error("Không thể tải schedules từ database")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSchedules(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRouteId, filterOperatorId, direction, filterVanBan])

  const routeKeysWithVanBan = useMemo(() => {
    const keys = new Set<string>()
    for (const s of schedules) {
      if (!scheduleHasVanBan(s)) continue
      const key = getScheduleRouteKey(s)
      if (key) keys.add(key)
    }
    return keys
  }, [schedules])

  const routes = useMemo<RouteOption[]>(() => {
    const byId = new Map<string, RouteOption>()
    for (const schedule of schedules) {
      const id = String(schedule.routeId || "").trim()
      const route = schedule.route
      if (!id || !route) continue
      const code = String(route.routeCode || "").trim()
      const name = String(route.routeName || code).trim()
      if (!code) continue
      if (!byId.has(id)) {
        byId.set(id, { id, code, name })
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.code.localeCompare(b.code, "vi"))
  }, [schedules])

  const operators = useMemo<OperatorOption[]>(() => {
    const byId = new Map<string, OperatorOption>()
    for (const schedule of schedules) {
      const id = String(schedule.operatorId || "").trim()
      const operator = schedule.operator
      if (!id || !operator?.name) continue
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name: String(operator.name).trim(),
          code: String(operator.code || "").trim() || undefined,
        })
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "vi"))
  }, [schedules])

  const filteredSchedules = useMemo(() => {
    let list = schedules

    if (filterVanBan === "route-yes") {
      list = list.filter((s) => {
        const key = getScheduleRouteKey(s)
        return key && routeKeysWithVanBan.has(key)
      })
    } else if (filterVanBan === "route-no") {
      list = list.filter((s) => {
        const key = getScheduleRouteKey(s)
        return key && !routeKeysWithVanBan.has(key)
      })
    }

    const q = searchQuery.trim().toLowerCase()
    if (!q) return list

    return list.filter((s) => {
      const routeName = s.route?.routeName || ""
      const routeCode = s.route?.routeCode || ""
      const opName = s.operator?.name || ""
      return (
        (s.scheduleCode || "").toLowerCase().includes(q) ||
        (s.notificationNumber || "").toLowerCase().includes(q) ||
        routeName.toLowerCase().includes(q) ||
        routeCode.toLowerCase().includes(q) ||
        opName.toLowerCase().includes(q) ||
        s.departureTime.toLowerCase().includes(q) ||
        (s.direction || "").toLowerCase().includes(q)
      )
    })
  }, [schedules, searchQuery, filterVanBan, routeKeysWithVanBan])

  const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / ITEMS_PER_PAGE))

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

  const displayRouteCode = (code: string) => code.replace(/^BUS-/i, "")

  const noticeDocsForRouteView = useMemo(() => {
    const routeCode = String(routeViewData?.routeCode || "").trim()
    const byId = new Map<string, { id: string; routeRef: string; number?: string; displayText?: string; fileUrl?: string }>()

    for (const s of routeViewSchedules) {
      const fileUrl = getScheduleNoticeFileUrl(s)
      const noticeId = getScheduleNoticeId(s)
      const noticeMeta = (s as { metadata?: { notice_meta?: { number?: string; routeRef?: string; displayText?: string } } })
        .metadata?.notice_meta
      if (!noticeId && !fileUrl) continue

      const key = noticeId || fileUrl
      if (byId.has(key)) continue

      const number =
        String(s.notificationNumber || noticeMeta?.number || "").trim() || undefined
      const routeRefRaw =
        String(noticeMeta?.routeRef || s.route?.routeCode || routeCode || "").trim()

      byId.set(key, {
        id: noticeId || key,
        routeRef: routeRefRaw || (routeCode ? displayRouteCode(routeCode) : "—"),
        number,
        displayText: String(noticeMeta?.displayText || "").trim() || (number ? `Số TB ${number}` : undefined),
        fileUrl: fileUrl || undefined,
      })
    }

    return Array.from(byId.values())
  }, [routeViewSchedules, routeViewData?.routeCode])

  const operationNoticesFromSchedules = useMemo(() => {
    const routeCode = String(routeViewData?.routeCode || "").trim()
    if (!routeCode) return []
    const codeUpper = routeCode.toUpperCase()
    const codeNoBus = codeUpper.replace(/^BUS-/, "")
    const byId = new Map<string, Record<string, unknown>>()

    for (const s of routeViewSchedules as any[]) {
      const notice = s?.metadata?.notice
      const noticeMeta = s?.metadata?.notice_meta
      if (!notice && !noticeMeta?.id) continue

      const routeRef = String(notice?.Ref_Tuyen || noticeMeta?.routeRef || "").trim()
      const routeRefUpper = routeRef.toUpperCase()
      const matchesRoute = !routeRef || routeRefUpper === codeUpper || routeRefUpper === codeNoBus
      if (!matchesRoute) continue

      const id = String(notice?.ID_TB || noticeMeta?.id || "").trim()
      const key = id || String(noticeMeta?.number || noticeMeta?.displayText || "").trim()
      if (!key || byId.has(key)) continue

      const fileUrl = getScheduleNoticeFileUrl(s as Schedule)

      if (notice && typeof notice === "object") {
        const row = { ...(notice as Record<string, unknown>) }
        if (fileUrl && !row.File) row.File = fileUrl
        byId.set(key, row)
      } else {
        byId.set(key, {
          ID_TB: getScheduleNoticeId(s as Schedule) || noticeMeta?.id || null,
          Ref_Tuyen: noticeMeta?.routeRef || null,
          SoThongBao: s.notificationNumber || noticeMeta?.number || null,
          ThongBaoHienThi: noticeMeta?.displayText || null,
          File: fileUrl || noticeMeta?.fileUrl || null,
        })
      }
    }

    return Array.from(byId.entries()).map(([id, row]) => ({ id, row }))
  }, [routeViewSchedules, routeViewData?.routeCode])

  const reloadRouteViewSchedules = async (routeId: string, routeCode?: string) => {
    try {
      const scheds = await scheduleService.getAll(routeId, undefined, undefined, undefined)
      setRouteViewSchedules(scheds)
      const routeDetail = await routeService.getById(routeId).catch(() => null)
      if (routeDetail) {
        setRouteViewData(mapRouteApiToViewData(routeDetail as unknown as Record<string, unknown>))
      } else {
        const route = scheds[0]?.route
        if (route) {
          setRouteViewData({
            id: routeId,
            routeCode: route.routeCode,
            routeName: route.routeName,
          })
        } else if (routeCode) {
          setRouteViewData({ id: routeId, routeCode, routeName: routeCode })
        }
      }
    } catch (e) {
      setRouteViewSchedules([])
      throw e
    }
  }

  const syncRouteViewFromAppSheet = async () => {
    if (!routeViewData?.routeCode || !routeViewData?.id) return
    if (!isAdmin) {
      toast.error("Chỉ admin mới đồng bộ được")
      return
    }
    if (!window.confirm(`Đồng bộ Ref thông báo khai thác (AppSheet) cho tuyến ${displayRouteCode(routeViewData.routeCode)}?`)) return

    setIsSyncingRouteView(true)
    try {
      const result = await gtvtSyncService.syncRoutesSchedules(false, routeViewData.routeCode)
      if (result.errors?.length) {
        const first = result.errors[0]
        const msg = typeof first === "string" ? first : first?.message
        toast.warning(msg || "Đồng bộ xong nhưng có lỗi")
      } else {
        toast.success("Đã đồng bộ dữ liệu tuyến")
      }
      await reloadRouteViewSchedules(routeViewData.id, routeViewData.routeCode)
    } catch (e) {
      console.error(e)
      toast.error("Không thể đồng bộ dữ liệu tuyến")
    } finally {
      setIsSyncingRouteView(false)
    }
  }

  const handleSyncFromAppSheet = async () => {
    if (!isAdmin) {
      toast.error("Chỉ admin mới đồng bộ được")
      return
    }
    if (!window.confirm("Đồng bộ Ref thông báo khai thác từ AppSheet → Supabase? (chỉ cột ref_thongbao_khaithac)")) return
    setIsSyncingFromAppSheet(true)
    try {
      const result = await gtvtSyncService.syncRoutesSchedules(false)
      if (result.errors?.length) {
        const first = result.errors[0]
        const msg = typeof first === "string" ? first : first?.message
        toast.warning(msg || "Đồng bộ xong nhưng có lỗi")
      } else {
        toast.success("Đã đồng bộ AppSheet → Supabase")
      }
      await loadSchedules(true)
    } catch (e) {
      console.error(e)
      toast.error("Không thể đồng bộ AppSheet → Supabase")
    } finally {
      setIsSyncingFromAppSheet(false)
    }
  }

  const handleImportFromAppSheet = async () => {
    if (!isAdmin) {
      toast.error("Chỉ admin mới import được")
      return
    }
    if (
      !window.confirm(
        "Import schedules từ BieuDoChayXeChiTiet? firebase_id = ID_NutChay. Dòng thiếu tuyến/đơn vị/giờ sẽ bỏ qua.",
      )
    ) {
      return
    }
    setIsImportingFromAppSheet(true)
    try {
      const result = await gtvtSyncService.importSchedulesFromAppSheet(false)
      const errors = (result as { errors?: Array<string | { message?: string }> }).errors
      if (errors?.length) {
        const first = errors[0]
        const msg = typeof first === "string" ? first : first?.message
        toast.warning(msg || "Import xong nhưng có lỗi")
      } else {
        const upserted = (result as { schedules?: { upserted?: number; skipped?: number } }).schedules?.upserted ?? 0
        const skipped = (result as { schedules?: { skipped?: number } }).schedules?.skipped ?? 0
        toast.success(`Đã import ${upserted} schedules (bỏ qua ${skipped})`)
      }
      await loadSchedules(true)
    } catch (e) {
      console.error(e)
      toast.error("Không thể import schedules từ AppSheet")
    } finally {
      setIsImportingFromAppSheet(false)
    }
  }

  const handleViewRoute = async (schedule: Schedule) => {
    const routeId = String(schedule.routeId || schedule.route?.id || "").trim()
    const routeCode = String(schedule.route?.routeCode || "").trim()

    if (!routeId && !routeCode) {
      toast.error("Schedule chưa có tuyến (thiếu thông báo khai thác hoặc routes)")
      return
    }

    setRouteViewOpen(true)
    setRouteViewTab("info")
    setRouteViewLoading(true)
    setRouteViewSchedulesLoading(true)
    setRouteViewSchedules([])
    setRouteViewData(
      routeCode
        ? { id: routeId || undefined, routeCode, routeName: schedule.route?.routeName || routeCode }
        : null,
    )

    try {
      if (routeId) {
        const [routeDetail, scheds] = await Promise.all([
          routeService.getById(routeId).catch(() => null),
          scheduleService.getAll(routeId, undefined, undefined, undefined),
        ])
        setRouteViewSchedules(scheds)
        if (routeDetail) {
          setRouteViewData(mapRouteApiToViewData(routeDetail as unknown as Record<string, unknown>))
        } else if (schedule.route) {
          setRouteViewData({
            id: routeId,
            routeCode: schedule.route.routeCode,
            routeName: schedule.route.routeName,
          })
        }
      } else {
        const all = await scheduleService.getAll(undefined, undefined, undefined, undefined)
        const codeUpper = routeCode.toUpperCase()
        const codeNoBus = codeUpper.replace(/^BUS-/, "")
        const scheds = all.filter((s) => {
          const c = String(s.route?.routeCode || "").trim().toUpperCase()
          return c === codeUpper || c === codeNoBus || c.replace(/^BUS-/, "") === codeNoBus
        })
        setRouteViewSchedules(scheds)
        setRouteViewData({
          routeCode,
          routeName: schedule.route?.routeName || routeCode,
        })
      }
    } catch (e) {
      console.error(e)
      setRouteViewSchedules([])
      setRouteViewData(null)
      toast.error("Không thể tải chi tiết tuyến từ database")
      setRouteViewOpen(false)
    } finally {
      setRouteViewLoading(false)
      setRouteViewSchedulesLoading(false)
    }
  }

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
                Dữ liệu hiển thị chỉ lấy từ bảng schedules trên Supabase ({schedules.length.toLocaleString()} bản ghi)
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
              onClick={handleSyncFromAppSheet}
              disabled={!isAdmin || isSyncingFromAppSheet}
              title={!isAdmin ? "Chỉ admin mới dùng được" : "Chỉ cập nhật ref_thongbao_khaithac"}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingFromAppSheet ? "animate-spin" : ""}`} />
              Đồng bộ AppSheet
            </Button>
            <Button
              onClick={handleImportFromAppSheet}
              disabled={!isAdmin || isImportingFromAppSheet}
              title={!isAdmin ? "Chỉ admin mới dùng được" : "Import BieuDoChayXeChiTiet → schedules (firebase_id = ID_NutChay)"}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <Database className={`h-4 w-4 mr-2 ${isImportingFromAppSheet ? "animate-pulse" : ""}`} />
              Thêm data AppSheet
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
            <div className="w-64">
              <Label className="text-xs text-slate-500 mb-1 block">Văn bản</Label>
              <Select value={filterVanBan} onChange={(e) => setFilterVanBan(e.target.value as VanBanFilter)}>
                <option value="all">Tất cả</option>
                <option value="row-yes">Dòng có file</option>
                <option value="row-no">Dòng không có file</option>
                <option value="route-yes">Tuyến có văn bản</option>
                <option value="route-no">Tuyến không có văn bản</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">ID_NutChay</TableHead>
                <TableHead className="whitespace-nowrap">SoThongBao</TableHead>
                <TableHead className="whitespace-nowrap">Văn bản</TableHead>
                <TableHead>Tuyến</TableHead>
                <TableHead>Đơn vị</TableHead>
                <TableHead className="text-center">Giờ</TableHead>
                <TableHead className="text-center">Direction</TableHead>
                <TableHead className="text-center">Ngày trong tuần</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-center">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={10}>
                      <div className="animate-pulse h-8 bg-slate-100 rounded w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-16 text-slate-500">
                    Không có schedules
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs text-slate-700 max-w-[140px] truncate" title={s.scheduleCode || undefined}>
                      {s.scheduleCode || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700 max-w-[160px] truncate" title={s.notificationNumber || undefined}>
                      {s.notificationNumber || "—"}
                    </TableCell>
                    <TableCell className="max-w-[140px]">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs rounded-lg w-fit"
                        disabled={!scheduleHasVanBan(s)}
                        title={scheduleHasVanBan(s) ? "Xem PDF trong view" : "Chưa có file"}
                        onClick={() => {
                          const url = getScheduleNoticeFileUrl(s)
                          if (!url) return
                          const label = s.notificationNumber?.trim() || s.scheduleCode || "Văn bản"
                          setTablePdfSelection({ url, title: `Số TB ${label}` })
                        }}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1 shrink-0" />
                        Mở file
                      </Button>
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
                    <TableCell className="text-center text-sm text-slate-700">
                      {formatDaysOfWeek((s as any).daysOfWeek) || "—"}
                    </TableCell>
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
                            label: "Xem tuyến",
                            onClick: () => handleViewRoute(s),
                            variant: "info",
                          },
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

        {/* Create Dialog — mount only when open to avoid portal teardown races */}
        {createOpen && (
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
        )}

        {/* Route View Dialog */}
        <Dialog
          open={routeViewOpen}
          onOpenChange={(open) => {
            setRouteViewOpen(open)
            if (!open) {
              requestAnimationFrame(() => {
                setRouteViewData(null)
                setRouteViewSchedules([])
                setRouteViewLoading(false)
                setRouteViewSchedulesLoading(false)
                setRouteViewTab("info")
              })
            }
          }}
        >
          <DialogContent className="w-[98vw] max-w-7xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Chi tiết tuyến</DialogTitle>
            </DialogHeader>

            {routeViewLoading ? (
              <div className="p-4 text-sm text-slate-600">Đang tải...</div>
            ) : !routeViewData ? (
              <div className="p-4 text-sm text-slate-600">Không có dữ liệu tuyến</div>
            ) : (
              <RouteScheduleViewTabs
                routeViewTab={routeViewTab}
                onRouteViewTabChange={setRouteViewTab}
                routeViewData={routeViewData}
                routeViewSchedules={routeViewSchedules}
                routeViewSchedulesLoading={routeViewSchedulesLoading}
                noticeDocsForRouteView={noticeDocsForRouteView}
                operationNoticesFromSchedules={operationNoticesFromSchedules}
                isAdmin={isAdmin}
                isSyncingRouteView={isSyncingRouteView}
                onSyncRouteViewFromAppSheet={syncRouteViewFromAppSheet}
                formatDaysOfWeek={formatDaysOfWeek}
                displayRouteCode={displayRouteCode}
              />
            )}
          </DialogContent>
        </Dialog>

        {tablePdfSelection ? (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onMouseDown={() => setTablePdfSelection(null)}
          >
            <div className="w-full max-w-5xl" onMouseDown={(e) => e.stopPropagation()}>
              <NoticePdfInlineView
                selection={tablePdfSelection}
                onClose={() => setTablePdfSelection(null)}
                maxPageWidth={900}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

