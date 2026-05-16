import { useState, useCallback } from "react"
import { RefreshCw, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NoticePdfInlineView, type NoticePdfSelection } from "@/components/notice/NoticePdfInlineView"
import type { Schedule } from "@/types"
import { getScheduleNoticeFileUrl } from "@/utils/schedule-notice-doc"
import { buildThongBaoFileUrlFromPath } from "@/utils/operation-notice-file-url"

type RouteViewTab = "info" | "schedules" | "documents" | "operation-notices"

type NoticeDoc = {
  id: string
  routeRef: string
  number?: string
  displayText?: string
  fileUrl?: string
}

type OperationNoticeRow = {
  id: string
  row: Record<string, unknown>
}

type RouteViewData = {
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

type RouteScheduleViewTabsProps = {
  routeViewTab: RouteViewTab
  onRouteViewTabChange: (tab: RouteViewTab) => void
  routeViewData: RouteViewData
  routeViewSchedules: Schedule[]
  routeViewSchedulesLoading: boolean
  noticeDocsForRouteView: NoticeDoc[]
  operationNoticesFromSchedules: OperationNoticeRow[]
  isAdmin: boolean
  isSyncingRouteView: boolean
  onSyncRouteViewFromAppSheet: () => void
  formatDaysOfWeek: (days: unknown) => string
  displayRouteCode: (code: string) => string
}

const DAY_LABELS: Record<number, string> = {
  1: "CN",
  2: "T2",
  3: "T3",
  4: "T4",
  5: "T5",
  6: "T6",
  7: "T7",
}

function formatDisplayTime(value?: string | null): string {
  const raw = String(value || "").trim()
  if (!raw) return "—"
  const match = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return raw
  return `${match[1].padStart(2, "0")}:${match[2]}`
}

function getDayLabels(days: unknown): string[] {
  const arr = Array.isArray(days) ? days : []
  const labels = arr
    .map((day) => Number(day))
    .filter((day) => Number.isFinite(day))
    .map((day) => DAY_LABELS[day] || String(day))
  return Array.from(new Set(labels))
}

function WeekdayChips({ days }: { days: unknown }) {
  const labels = getDayLabels(days)
  if (labels.length === 0) return <span className="text-sm font-medium text-slate-400">—</span>

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function ScheduleMetaItem({
  label,
  value,
  title,
  className,
}: {
  label: string
  value: string
  title?: string
  className?: string
}) {
  return (
    <div className={className}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900 break-words" title={title || value}>
        {value || "—"}
      </div>
    </div>
  )
}

function resolveNoticeFileUrlFromRow(row: Record<string, unknown>): string {
  const fileUrl = String(row.File || row.fileUrl || "").trim()
  if (fileUrl) return fileUrl
  return buildThongBaoFileUrlFromPath(String(row.filePath || row.file_path || "").trim()) || ""
}

function NoticeOpenFileButton({
  fileUrl,
  title,
  onOpen,
  className,
}: {
  fileUrl: string
  title: string
  onOpen: (url: string, label: string) => void
  className?: string
}) {
  const href = String(fileUrl || "").trim()
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className ?? "h-8 px-3 text-xs rounded-lg shrink-0"}
      disabled={!href}
      title={href ? "Xem PDF trong view" : "Chưa có file"}
      onClick={() => {
        if (href) onOpen(href, title)
      }}
    >
      <FileText className="mr-1.5 h-3.5 w-3.5" />
      Mở file
    </Button>
  )
}

function getScheduleOperatingDays(schedule: Schedule, formatDaysOfWeek: (days: unknown) => string): string {
  const daysOfMonth = Array.isArray((schedule as any)?.daysOfMonth) ? (schedule as any).daysOfMonth : []
  if (daysOfMonth.length > 0) {
    return daysOfMonth.map((day: number) => String(day)).join(", ")
  }

  const metadata = (schedule as any)?.metadata?.schedule_meta
  const raw =
    metadata?.NgayHoatDong ||
    metadata?.NgayHoatDongGoc ||
    metadata?.BieuDoHienThi ||
    formatDaysOfWeek((schedule as any)?.daysOfWeek) ||
    (schedule as any)?.effectiveFrom ||
    ""
  return String(raw || "").trim()
}

export function RouteScheduleViewTabs({
  routeViewTab,
  onRouteViewTabChange,
  routeViewData,
  routeViewSchedules,
  routeViewSchedulesLoading,
  noticeDocsForRouteView,
  operationNoticesFromSchedules,
  isAdmin,
  isSyncingRouteView,
  onSyncRouteViewFromAppSheet,
  formatDaysOfWeek,
  displayRouteCode,
}: RouteScheduleViewTabsProps) {
  const [pdfSelection, setPdfSelection] = useState<NoticePdfSelection>(null)

  const openNoticePdfInView = useCallback((url: string, title: string) => {
    const href = String(url || "").trim()
    if (!href) return
    setPdfSelection({ url: href, title })
  }, [])

  return (
    <Tabs
      value={routeViewTab}
      onValueChange={(v) => onRouteViewTabChange(v as RouteViewTab)}
      className="space-y-4"
    >
      <TabsList className="w-full justify-start">
        <TabsTrigger value="info">Chi tiết</TabsTrigger>
        <TabsTrigger value="schedules">
          Biểu đồ giờ{routeViewSchedules.length ? ` (${routeViewSchedules.length})` : ""}
        </TabsTrigger>
        <TabsTrigger value="documents">
          Văn bản{noticeDocsForRouteView.length ? ` (${noticeDocsForRouteView.length})` : ""}
        </TabsTrigger>
        <TabsTrigger value="operation-notices">
          Thông báo khai thác
          {operationNoticesFromSchedules.length ? ` (${operationNoticesFromSchedules.length})` : ""}
        </TabsTrigger>
      </TabsList>

      {pdfSelection ? (
        <NoticePdfInlineView selection={pdfSelection} onClose={() => setPdfSelection(null)} maxPageWidth={880} />
      ) : null}

      <TabsContent value="info" className="space-y-4">
        <div className="bg-slate-50 border rounded-xl p-4">
          <div className="text-sm text-slate-500">Mã tuyến</div>
          <div className="text-2xl font-bold text-slate-900">
            {displayRouteCode(routeViewData.routeCode || "—")}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Mã DB: <span className="font-semibold">{routeViewData.routeCode || "—"}</span>
          </div>
          <div className="text-sm text-slate-600 mt-1">{routeViewData.routeName || ""}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm text-slate-500">Bến đi</div>
            <div className="text-lg font-semibold text-slate-900">{routeViewData.departureStation || "—"}</div>
            <div className="text-sm text-slate-600">{routeViewData.departureProvince || ""}</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm text-slate-500">Bến đến</div>
            <div className="text-lg font-semibold text-slate-900">{routeViewData.arrivalStation || "—"}</div>
            <div className="text-sm text-slate-600">{routeViewData.arrivalProvince || ""}</div>
          </div>
        </div>

        {routeViewData.itinerary || routeViewData.routePath ? (
          <div className="bg-white border rounded-xl p-4">
            <div className="text-sm text-slate-500 mb-1">Hành trình</div>
            <div className="text-sm text-slate-800 whitespace-pre-wrap break-words">
              {routeViewData.itinerary || routeViewData.routePath}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white border rounded-xl p-4">
            <div className="text-slate-500">Loại tuyến</div>
            <div className="font-semibold text-slate-900">{routeViewData.routeType || "—"}</div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <div className="text-slate-500">Tình trạng khai thác</div>
            <div className="font-semibold text-slate-900">{routeViewData.operationStatus || "—"}</div>
          </div>
        </div>

        {noticeDocsForRouteView.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800">Văn bản thông báo</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {noticeDocsForRouteView.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {d.number ? `Số TB ${d.number}` : "Văn bản"}
                    </div>
                    {d.displayText ? (
                      <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{d.displayText}</p>
                    ) : null}
                  </div>
                  <NoticeOpenFileButton
                    fileUrl={String(d.fileUrl || "")}
                    title={d.number ? `Số TB ${d.number}` : "Văn bản"}
                    onOpen={openNoticePdfInView}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="schedules" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            <p className="text-lg font-medium text-slate-800">Biểu đồ giờ</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onSyncRouteViewFromAppSheet}
            disabled={!isAdmin || isSyncingRouteView || routeViewSchedulesLoading}
            title={!isAdmin ? "Chỉ admin mới dùng được" : undefined}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingRouteView ? "animate-spin" : ""}`} />
            Đồng bộ biểu đồ giờ
          </Button>
        </div>

        {routeViewSchedulesLoading ? (
          <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">Đang tải biểu đồ giờ...</div>
        ) : routeViewSchedules.length === 0 ? (
          <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-700">
            Tuyến này chưa có dữ liệu biểu đồ giờ.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {routeViewSchedules.slice(0, 60).map((s) => {
              const noticeFileUrl = getScheduleNoticeFileUrl(s)
              const scheduleMeta = (s as any)?.metadata?.schedule_meta
              const noticeMeta = (s as any)?.metadata?.notice_meta
              const noticeRecord = (s as any)?.metadata?.notice
              const noticeText = String(
                noticeMeta?.displayText || noticeRecord?.ThongBaoHienThi || "",
              ).trim()
              const direction = String(scheduleMeta?.Chieu || s.direction || "—").trim() || "—"
              const monthDays = Array.isArray((s as any)?.daysOfMonth) ? (s as any).daysOfMonth : []
              const operatingDays = getScheduleOperatingDays(s, formatDaysOfWeek)
              const weekdayLabel = formatDaysOfWeek((s as any)?.daysOfWeek)
              const showOperatingDaysAsChips =
                monthDays.length === 0 && (!operatingDays || operatingDays === weekdayLabel)

              return (
                <div
                  key={s.id}
                  className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                        {formatDisplayTime(s.departureTime)}
                      </div>
                      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        {direction}
                      </span>
                    </div>
                    <NoticeOpenFileButton
                      fileUrl={noticeFileUrl}
                      title={`Giờ ${formatDisplayTime(s.departureTime)} — ${direction}`}
                      onOpen={openNoticePdfInView}
                      className="h-8 shrink-0 px-3 text-xs"
                    />
                  </div>

                  {noticeText ? (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600" title={noticeText}>
                      {noticeText}
                    </p>
                  ) : null}

                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <ScheduleMetaItem
                        label="Số TB"
                        value={String(
                          scheduleMeta?.SoThongBao ||
                            noticeMeta?.number ||
                            noticeRecord?.SoThongBao ||
                            (s as any)?.notificationNumber ||
                            "",
                        )}
                      />
                      <ScheduleMetaItem
                        label="Ref TBKT"
                        value={String(
                          (s as any)?.refThongBaoKhaiThac ||
                            noticeMeta?.id ||
                            noticeRecord?.ID_TB ||
                            scheduleMeta?.Ref_ThongBaoKhaiThac ||
                            scheduleMeta?.ref_thongbao_khaithac ||
                            "",
                        )}
                      />
                      <ScheduleMetaItem
                        label="Mã tuyến"
                        value={String(noticeMeta?.routeRef || routeViewData?.routeCode || "")}
                      />
                      <ScheduleMetaItem
                        label="Loại ngày"
                        value={String(scheduleMeta?.LoaiNgay || (s as any)?.calendarType || "")}
                      />
                      <ScheduleMetaItem
                        label="TT chuyến"
                        value={String(scheduleMeta?.TrangThaiChuyen || (s as any)?.tripStatus || "")}
                        className="col-span-2"
                      />
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-500">Ngày trong tuần</div>
                      <div className="mt-1.5">
                        <WeekdayChips days={(s as any)?.daysOfWeek} />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-500">Ngày HĐ</div>
                      <div className="mt-1.5">
                        {monthDays.length > 0 ? (
                          <div className="text-sm font-semibold text-slate-900 break-words">
                            {monthDays.join(", ")}
                          </div>
                        ) : showOperatingDaysAsChips ? (
                          <WeekdayChips days={(s as any)?.daysOfWeek} />
                        ) : (
                          <div className="text-sm font-semibold text-slate-900 break-words">{operatingDays}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="documents" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-lg font-medium text-slate-800">Văn bản thông báo khai thác</p>
            <p className="text-sm text-slate-500">
              Metadata lịch chạy trong bảng <span className="font-semibold">schedules</span>.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onSyncRouteViewFromAppSheet}
            disabled={!isAdmin || isSyncingRouteView || routeViewSchedulesLoading}
            title={!isAdmin ? "Chỉ admin mới dùng được" : "Đồng bộ ref schedules từ AppSheet"}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingRouteView ? "animate-spin" : ""}`} />
            Đồng bộ biểu đồ
          </Button>
        </div>

        {routeViewSchedulesLoading ? (
          <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">Đang tải văn bản...</div>
        ) : noticeDocsForRouteView.length === 0 ? (
          <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-700">Chưa có văn bản cho tuyến này.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {noticeDocsForRouteView.map((d) => (
              <div key={d.id} className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 break-words">
                      {d.number ? `Số TB ${d.number}` : "Văn bản"}
                    </div>
                    <div className="text-sm text-slate-600 break-words">
                      <span className="text-slate-500">Mã tuyến:</span> {d.routeRef || "—"}
                    </div>
                  </div>
                  <NoticeOpenFileButton
                    fileUrl={String(d.fileUrl || "")}
                    title={d.number ? `Số TB ${d.number}` : "Văn bản"}
                    onOpen={openNoticePdfInView}
                  />
                </div>
                {d.displayText ? (
                  <div className="mt-3 text-sm text-slate-700 break-words whitespace-pre-wrap">{d.displayText}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="operation-notices" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-lg font-medium text-slate-800">Thông báo khai thác</p>
            <p className="text-sm text-slate-500">
              Metadata lịch chạy trong bảng <span className="font-semibold">schedules</span>.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onSyncRouteViewFromAppSheet}
            disabled={!isAdmin || isSyncingRouteView || routeViewSchedulesLoading}
            title={!isAdmin ? "Chỉ admin mới dùng được" : undefined}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isSyncingRouteView || routeViewSchedulesLoading ? "animate-spin" : ""}`}
            />
            Đồng bộ thông báo
          </Button>
        </div>

        {routeViewSchedulesLoading ? (
          <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">Đang tải thông báo khai thác...</div>
        ) : operationNoticesFromSchedules.length === 0 ? (
          <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-700">
            Chưa có thông báo khai thác cho tuyến này.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {operationNoticesFromSchedules.map((item) => {
              const noticeFileUrl = resolveNoticeFileUrlFromRow(item.row)
              const noticeTitle = String(item.row.SoThongBao || item.row.ID_TB || item.id)
              return (
              <div key={item.id} className="rounded-lg border border-slate-200 p-4 bg-white">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="text-sm font-semibold text-slate-900 break-words min-w-0">
                    {noticeTitle}
                  </div>
                  <NoticeOpenFileButton
                    fileUrl={noticeFileUrl}
                    title={noticeTitle}
                    onOpen={openNoticePdfInView}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {Object.entries(item.row).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2">
                      <span className="text-slate-500 shrink-0">{key}</span>
                      <span className="font-medium break-words">
                        {value === null || value === undefined || value === "" ? "—" : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )})}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
