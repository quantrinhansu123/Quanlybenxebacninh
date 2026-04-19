import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  useRef,
  type TransitionEvent,
} from "react"
import { createPortal } from "react-dom"
import {
  Award,
  Car,
  Tag,
  Palette,
  CheckCircle,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Route,
  AlertTriangle,
  StickyNote,
  Building2,
  CalendarRange,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/layout/StatusBadge"
import { type VehicleBadge } from "@/services/vehicle-badge.service"
import { isOpenableDocumentUrl, normalizePdfHref } from "@/utils/pdf-href"

// Local type for schedule diagram rows (previously from AppSheet, now empty)
type NormalizedAppSheetSchedule = {
  firebaseId: string
  routeCode?: string
  tbRefTuyen?: string
  routeFirebaseId?: string
  departureTime?: string
  direction?: string
  frequencyType?: "daily" | "weekly" | "specific"
  daysOfWeek: number[]
  daysOfMonth: number[]
  calendarType?: string
  effectiveFrom?: string
  notificationNumber?: string
  notificationFileUrl?: string
  tripStatus?: string
}
import { Button } from "@/components/ui/button"
import { InlinePdfViewer } from "@/components/pdf/InlinePdfViewer"

// Helper function to format date
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "N/A"
  if (dateString.includes("/")) {
    return dateString
  }
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "N/A"
    return date.toLocaleDateString("vi-VN")
  } catch {
    return dateString
  }
}

const getStatusVariant = (status: string): "active" | "inactive" | "maintenance" => {
  if (!status) return "inactive"
  const statusLower = status.toLowerCase()
  if (statusLower.includes("hiệu lực") || statusLower.includes("cấp mới") || statusLower.includes("cap moi")) {
    return "active"
  }
  if (statusLower.includes("hết") || statusLower.includes("het")) {
    return "inactive"
  }
  return "active"
}

type BadgeRouteMeta = VehicleBadge & {
  route_ref?: string
  tuyen_bus_code?: string
  metadata?: { route_ref?: string }
}

/** Không dùng route_id dạng UUID (FK routes) để khớp Ref_Tuyen / MaSoTuyen trên AppSheet */
const ROUTE_ID_IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Mã/ref tuyến cố định để khớp lịch (BieuDo…): route_code, route_ref (AppSheet),
 * metadata.route_ref, và route_id khi đó là ref (không phải UUID DB).
 */
function collectFixedRouteKeys(badge: VehicleBadge): string[] {
  const b = badge as BadgeRouteMeta
  const fromMeta = b.metadata?.route_ref?.trim()
  const rid = badge.route_id?.trim() || ""
  const ridKey = rid && !ROUTE_ID_IS_UUID.test(rid) ? rid : ""

  const keys = [badge.route_code, b.route_ref, fromMeta, ridKey]
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().toUpperCase())
  return [...new Set(keys)]
}

function scheduleMatchesFixedBadge(badge: VehicleBadge, s: NormalizedAppSheetSchedule): boolean {
  const keys = collectFixedRouteKeys(badge)
  if (keys.length === 0) return false
  const candidates = [s.routeCode, s.tbRefTuyen, s.routeFirebaseId]
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().toUpperCase())
  return candidates.some((c) => keys.includes(c))
}

function scheduleMatchesBusBadge(badge: VehicleBadge, s: NormalizedAppSheetSchedule): boolean {
  const id = ((badge as BadgeRouteMeta).tuyen_bus_code || "").trim()
  if (!id) return false
  const u = id.toUpperCase()
  const rf = (s.routeFirebaseId || "").trim().toUpperCase()
  const rc = (s.routeCode || "").trim().toUpperCase()
  return u === rf || u === rc
}

function canMatchScheduleDiagram(badge: VehicleBadge): boolean {
  const b = badge as BadgeRouteMeta
  if (badge.badge_type === "Buýt") return !!b.tuyen_bus_code?.trim()
  return collectFixedRouteKeys(badge).length > 0
}

const WD_VI = ["", "T2", "T3", "T4", "T5", "T6", "T7", "CN"]

function formatDaysOfWeek(days: number[]): string {
  if (!days.length) return "—"
  return days.map((d) => WD_VI[d] || String(d)).join(", ")
}

function formatFrequency(ft: NormalizedAppSheetSchedule["frequencyType"]): string {
  if (ft === "daily") return "Hàng ngày"
  if (ft === "weekly") return "Theo tuần"
  return "Theo ngày cụ thể"
}

function formatCalendar(ct: string): string {
  const n = (ct || "").toLowerCase()
  return n === "lunar" ? "Âm lịch" : "Dương lịch"
}

interface BadgeDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  badge: VehicleBadge | null
  operatorName?: string
}

export default function BadgeDetailDialog({
  open,
  onOpenChange,
  badge,
  operatorName = "",
}: BadgeDetailDialogProps) {
  const [tab, setTab] = useState<"info" | "diagram">("info")
  const [fixedSchedules] = useState<NormalizedAppSheetSchedule[]>([])
  const [busSchedules] = useState<NormalizedAppSheetSchedule[]>([])

  const fixedPolling = false
  const fixedScheduleError = null
  const busPolling = false
  const busScheduleError = null

  useEffect(() => {
    setTab("info")
  }, [badge?.id, open])

  const diagramRows = useMemo(() => {
    if (!badge) return []
    const src = badge.badge_type === "Buýt" ? busSchedules : fixedSchedules
    const filtered =
      badge.badge_type === "Buýt"
        ? src.filter((s) => scheduleMatchesBusBadge(badge, s))
        : src.filter((s) => scheduleMatchesFixedBadge(badge, s))
    return [...filtered].sort((a, b) => {
      const ta = a.departureTime || ""
      const tb = b.departureTime || ""
      if (ta !== tb) return ta.localeCompare(tb)
      return (a.direction || "").localeCompare(b.direction || "")
    })
  }, [badge, fixedSchedules, busSchedules])

  const scheduleError = fixedScheduleError || busScheduleError
  const schedulePollLoading =
    badge?.badge_type === "Buýt"
      ? busSchedules.length === 0 && busPolling
      : fixedSchedules.length === 0 && fixedPolling

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      overlayClassName="p-0 flex items-stretch justify-stretch"
      className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none min-h-0 flex-col"
    >
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-background p-0 shadow-xl sm:p-0">
        <DialogClose onClose={() => onOpenChange(false)} />
        {badge && (
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "info" | "diagram")}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="shrink-0 border-b bg-muted/30 px-6 pb-4 pt-6">
              <DialogHeader className="mb-0 space-y-3">
                <DialogTitle className="text-xl font-bold">Chi tiết phù hiệu xe</DialogTitle>
                <TabsList className="w-full justify-start h-9">
                  <TabsTrigger value="info" className="text-xs sm:text-sm">
                    Thông tin xe
                  </TabsTrigger>
                  <TabsTrigger value="diagram" className="gap-1.5 text-xs sm:text-sm">
                    <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                    Biểu đồ
                  </TabsTrigger>
                </TabsList>
              </DialogHeader>
            </div>

              <TabsContent value="info" className="mt-0 px-0">
                <div className="px-6 py-5">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 font-medium">Số phù hiệu</p>
                        <p className="text-base font-semibold truncate">{badge.badge_number || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Car className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 font-medium">Biển số</p>
                        <p className="text-base font-semibold truncate">{badge.license_plate_sheet || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-sky-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 font-medium">Tên đơn vị</p>
                        <p className="text-base font-semibold truncate">{operatorName.trim() || "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Tag className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 font-medium">Loại phù hiệu</p>
                        <p className="text-base font-semibold">{badge.badge_type || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Palette className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 font-medium">Màu phù hiệu</p>
                        <p className="text-base font-semibold">{badge.badge_color || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 font-medium">Trạng thái</p>
                        <div className="mt-1">
                          <StatusBadge
                            status={getStatusVariant(badge.status)}
                            label={badge.status || "N/A"}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 font-medium">Mã tuyến - Tên tuyến</p>
                        <p className="text-base font-semibold">
                          {badge.route_code && badge.route_name
                            ? `${badge.route_code} - ${badge.route_name}`
                            : badge.route_code || badge.route_name || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Route className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 font-medium">Hành trình</p>
                        <p className="text-base font-semibold">{badge.itinerary || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 font-medium">Ngày cấp</p>
                        <p className="text-base font-semibold">{formatDate(badge.issue_date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 font-medium">Ngày hết hạn</p>
                        <p className="text-base font-semibold">{formatDate(badge.expiry_date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 font-medium">Loại cấp</p>
                        <p className="text-base font-semibold">{badge.issue_type || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {badge.previous_badge_number && (
                      <div className="flex items-center gap-3 py-2">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                          <Award className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-500 font-medium">Số phù hiệu cũ</p>
                          <p className="text-base font-semibold">{badge.previous_badge_number}</p>
                        </div>
                      </div>
                    )}

                    {badge.renewal_due_date && (
                      <div className="flex items-center gap-3 py-2">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-500 font-medium">Hạn gia hạn</p>
                          <p className="text-base font-semibold">{formatDate(badge.renewal_due_date)}</p>
                        </div>
                      </div>
                    )}

                    {badge.renewal_reason && (
                      <div className="flex items-center gap-3 py-2">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <StickyNote className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-500 font-medium">Lý do gia hạn</p>
                          <p className="text-base font-semibold">{badge.renewal_reason}</p>
                        </div>
                      </div>
                    )}

                    {(badge.revocation_date || badge.revocation_decision || badge.revocation_reason) && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30 p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <span className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                            Thông tin thu hồi
                          </span>
                        </div>
                        {badge.revocation_date && (
                          <div className="pl-7">
                            <p className="text-sm text-slate-500 font-medium">Ngày thu hồi</p>
                            <p className="text-base font-semibold">{formatDate(badge.revocation_date)}</p>
                          </div>
                        )}
                        {badge.revocation_decision && (
                          <div className="pl-7">
                            <p className="text-sm text-slate-500 font-medium">Quyết định</p>
                            <p className="text-base font-semibold">{badge.revocation_decision}</p>
                          </div>
                        )}
                        {badge.revocation_reason && (
                          <div className="pl-7">
                            <p className="text-sm text-slate-500 font-medium">Lý do</p>
                            <p className="text-base font-semibold">{badge.revocation_reason}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {badge.notes && (
                      <div className="flex items-start gap-3 py-2">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                          <StickyNote className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-500 font-medium">Ghi chú</p>
                          <p className="text-base leading-relaxed">{badge.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="diagram" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-4">
                <BadgeDiagramTabContent
                  badge={badge}
                  rows={diagramRows}
                  schedulePollLoading={schedulePollLoading}
                  scheduleError={scheduleError}
                />
              </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

function BadgeDiagramTabContent({
  badge,
  rows,
  schedulePollLoading,
  scheduleError,
}: {
  badge: VehicleBadge
  rows: NormalizedAppSheetSchedule[]
  schedulePollLoading: boolean
  scheduleError: string | null
}) {
  const sourceLabel =
    badge.badge_type === "Buýt"
      ? "GIOCHAY_BUYT (+ BIEUDOCHAY_BUYT), AppSheet"
      : "BieuDoChayXeChiTiet (+ THONGBAO_KHAITHAC), AppSheet"

  if (!canMatchScheduleDiagram(badge)) {
    return (
      <p className="text-sm text-muted-foreground">
        Phù hiệu chưa có mã tuyến
        {badge.badge_type === "Buýt" ? " (tuyến buýt)" : " (mã / ref tuyến cố định)"} để lọc biểu đồ chạy.
      </p>
    )
  }

  if (scheduleError) {
    return (
      <p className="text-sm text-destructive">
        Không tải được lịch AppSheet: {scheduleError}
      </p>
    )
  }

  const showLoading = rows.length === 0 && schedulePollLoading

  const [pdfPanel, setPdfPanel] = useState<{
    url: string
    noticeNumber: string
    scheduleKey: string
  } | null>(null)
  const [pdfPanelVisible, setPdfPanelVisible] = useState(false)
  const pdfPanelClosingRef = useRef(false)
  const [pdfPageMaxWidth, setPdfPageMaxWidth] = useState(960)

  useEffect(() => {
    if (!pdfPanel) return
    const update = () => {
      setPdfPageMaxWidth(Math.max(320, Math.floor(window.innerWidth * 0.75 - 40)))
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [pdfPanel])

  useLayoutEffect(() => {
    if (!pdfPanel) {
      setPdfPanelVisible(false)
      return
    }
    setPdfPanelVisible(false)
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPdfPanelVisible(true))
    })
    return () => cancelAnimationFrame(id)
  }, [pdfPanel])

  const openPdfPanel = useCallback(
    (schedule: NormalizedAppSheetSchedule, href: string) => {
      pdfPanelClosingRef.current = false
      setPdfPanel({
        url: href,
        noticeNumber: schedule.notificationNumber?.trim() || "—",
        scheduleKey: schedule.firebaseId,
      })
    },
    [],
  )

  const closePdfPanel = useCallback(() => {
    pdfPanelClosingRef.current = true
    setPdfPanelVisible(false)
  }, [])

  const onPdfPanelTransitionEnd = useCallback((e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "transform") return
    if (!pdfPanelClosingRef.current) return
    pdfPanelClosingRef.current = false
    setPdfPanel(null)
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="shrink-0 text-xs text-muted-foreground">
        Nguồn: {sourceLabel}. PDF mở panel ~75% chiều ngang màn hình, trượt từ phải.
      </p>
      <div className="min-h-0 flex-1 overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-center whitespace-nowrap">Giờ XB</TableHead>
              <TableHead className="text-center whitespace-nowrap">Chiều</TableHead>
              <TableHead className="text-center whitespace-nowrap">Tần suất</TableHead>
              <TableHead className="text-center whitespace-nowrap">Thứ</TableHead>
              <TableHead className="text-center whitespace-nowrap">Ngày T</TableHead>
              <TableHead className="text-center whitespace-nowrap">Lịch</TableHead>
              <TableHead className="text-center whitespace-nowrap">Hiệu lực</TableHead>
              <TableHead className="text-center whitespace-nowrap">Số TB</TableHead>
              <TableHead className="text-center whitespace-nowrap">TT</TableHead>
              <TableHead className="text-center whitespace-nowrap min-w-[88px]">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-sm">
                  Đang tải dữ liệu AppSheet…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-sm">
                  Không có nút chạy khớp mã tuyến hiện tại.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => {
                const pdfUrl = s.notificationFileUrl?.trim()
                const href = pdfUrl && isOpenableDocumentUrl(pdfUrl) ? normalizePdfHref(pdfUrl) : ""
                const isPdfOpen = pdfPanel?.scheduleKey === s.firebaseId && pdfPanelVisible
                return (
                <TableRow key={s.firebaseId}>
                  <TableCell className="text-center font-medium tabular-nums">{s.departureTime}</TableCell>
                  <TableCell className="text-center">{s.direction}</TableCell>
                  <TableCell className="text-center text-xs">{formatFrequency(s.frequencyType)}</TableCell>
                  <TableCell className="text-center text-xs max-w-[100px]">
                    {formatDaysOfWeek(s.daysOfWeek)}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {s.daysOfMonth.length ? s.daysOfMonth.join(", ") : "—"}
                  </TableCell>
                  <TableCell className="text-center text-xs">{formatCalendar(s.calendarType ?? "")}</TableCell>
                  <TableCell className="text-center text-xs whitespace-nowrap">
                    {formatDate(s.effectiveFrom)}
                  </TableCell>
                  <TableCell className="text-center text-xs max-w-[120px] truncate" title={s.notificationNumber || ""}>
                    {s.notificationNumber || "—"}
                  </TableCell>
                  <TableCell className="text-center text-xs">{s.tripStatus || "—"}</TableCell>
                  <TableCell className="text-center p-1 align-middle">
                    {href ? (
                      <button
                        type="button"
                        onClick={() => openPdfPanel(s, href)}
                        className={`inline-flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-primary transition-colors hover:bg-primary/10 hover:text-primary ${
                          isPdfOpen ? "bg-primary/15 ring-1 ring-primary/30" : ""
                        }`}
                        title="Mở PDF — thanh bên phải màn hình"
                      >
                        <FileText className="h-4 w-4 shrink-0 opacity-90" />
                        <span className="max-w-[5.5rem] text-[11px] font-medium leading-tight">
                          Xem PDF
                        </span>
                      </button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pdfPanel != null &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Đóng xem PDF"
              className={`fixed inset-0 z-[125] bg-black/40 transition-opacity duration-300 ${
                pdfPanelVisible ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              onClick={closePdfPanel}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Xem PDF thông báo"
              className={`fixed inset-y-0 right-0 z-[130] flex w-[75vw] min-w-0 flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out ${
                pdfPanelVisible ? "translate-x-0" : "translate-x-full"
              }`}
              onTransitionEnd={onPdfPanelTransitionEnd}
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5">
                <span className="min-w-0 truncate text-sm font-medium">
                  PDF — Số TB: {pdfPanel.noticeNumber}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={closePdfPanel}
                  aria-label="Đóng"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-2">
                <InlinePdfViewer url={pdfPanel.url} maxPageWidth={pdfPageMaxWidth} />
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  )
}
