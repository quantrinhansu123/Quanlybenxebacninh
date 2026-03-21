import { useState, useRef } from "react";
import { toast } from "react-toastify";
import { Truck, AlertTriangle, CheckCircle, FileText, CloudDownload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { formatVietnamTime } from "@/utils/timezone";
import { Select } from "@/components/ui/select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { GlassCard, SectionHeader, FormField, StyledInput, StyledSelect } from "@/components/shared/styled-components";
import { operationNoticeService } from "@/services/operation-notice.service";
import { prefetchPdf } from "@/lib/pdf-cache";
import { OperationNoticePdfViewer } from "../OperationNoticePdfViewer";
import { ScheduleSourceToggle } from "../ScheduleSourceToggle";
import type { DispatchRecord, Schedule, Vehicle, Operator, OperationNotice, Route, ScheduleDataSource } from "@/types";

interface VehicleInfoSectionProps {
  record: DispatchRecord;
  readOnly: boolean;
  permitType: string;
  setPermitType: (value: string) => void;
  selectedVehicle: Vehicle | null;
  vehiclesWithStatus: (Vehicle & { isBusy: boolean })[];
  replacementVehicleId: string;
  setReplacementVehicleId: (value: string) => void;
  operatorNameFromVehicle: string;
  selectedOperatorId: string;
  setSelectedOperatorId: (value: string) => void;
  operators: Operator[];
  scheduleId: string;
  setScheduleId: (value: string) => void;
  routeId: string;
  routes: Route[];
  schedules: Schedule[];
  departureTime: string;
  scheduleWarning?: string;
  onLoadSchedulesFromAppsheetTbJoin?: () => void | Promise<void>;
  isLoadingTbJoinSchedules?: boolean;
  scheduleDataSource?: ScheduleDataSource;
  onScheduleDataSourceChange?: (v: ScheduleDataSource) => void;
}

export function VehicleInfoSection({
  record,
  readOnly,
  permitType,
  setPermitType,
  selectedVehicle,
  vehiclesWithStatus,
  replacementVehicleId,
  setReplacementVehicleId,
  operatorNameFromVehicle,
  selectedOperatorId,
  setSelectedOperatorId,
  operators,
  scheduleId,
  setScheduleId,
  routeId,
  routes,
  schedules,
  departureTime,
  scheduleWarning,
  onLoadSchedulesFromAppsheetTbJoin,
  isLoadingTbJoinSchedules = false,
  scheduleDataSource = "database",
  onScheduleDataSourceChange,
}: VehicleInfoSectionProps) {
  const [noticePdfOpen, setNoticePdfOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<OperationNotice | null>(null);
  const [noticeLoading, setNoticeLoading] = useState(false);
  // Cache prefetched notice to avoid re-fetching on click
  const prefetchedNotice = useRef<{ key: string; notice: OperationNotice } | null>(null);

  // Display only original route code (e.g. 203) instead of prefixed schedule code (e.g. BDG-BUS-203-D-1600)
  const getDisplayScheduleCode = (schedule: Schedule): string => {
    const routeCodeFromSchedule = schedule.route?.routeCode?.trim() || "";
    if (routeCodeFromSchedule) return routeCodeFromSchedule;

    const routeCodeFromRouteList =
      routes.find((r) => r.id === schedule.routeId)?.routeCode?.trim() || "";
    if (routeCodeFromRouteList) return routeCodeFromRouteList;

    const raw = (schedule.scheduleCode || "").trim();
    const match = raw.match(/^(?:[A-Z]+-)?BUS-(.+?)-(?:D|V)-\d{4}(?:-\d+)?$/i);
    if (match?.[1]) return match[1];
    return raw;
  };

  const resolveRouteCodeForNotice = (selectedSchedule: Schedule): string | undefined => {
    const fromFormRoute = routes.find((r) => r.id === routeId)?.routeCode?.trim();
    if (fromFormRoute) return fromFormRoute;
    const fromSched = selectedSchedule.route?.routeCode?.trim();
    if (fromSched) return fromSched;
    return routes.find((r) => r.id === selectedSchedule.routeId)?.routeCode?.trim();
  };

  /** Lịch AppSheet: file PDF lấy từ THONGBAO_KHAITHAC (cột link file / File) sau ghép Ref_ThongBaoKhaiThac → ID_TB + Ref_Tuyen. */
  const buildAppsheetTbNotice = (selectedSchedule: Schedule, noticeNumber: string): OperationNotice => {
    const url = selectedSchedule.notificationFileUrl!.trim();
    const routeCode = resolveRouteCodeForNotice(selectedSchedule);
    return {
      id: "appsheet-tb",
      routeCode: selectedSchedule.tbRefTuyen?.trim() || routeCode || "",
      noticeNumber,
      fileUrl: url,
    };
  };

  /** Prefetch API + PDF blob on hover (fire-and-forget) */
  const handlePrefetchNotice = (selectedSchedule: Schedule) => {
    const noticeNumber = selectedSchedule.notificationNumber?.trim();
    if (!noticeNumber) return;

    if (scheduleDataSource === "appsheet" && selectedSchedule.notificationFileUrl?.trim()) {
      const url = selectedSchedule.notificationFileUrl.trim();
      const key = `appsheet-file:${url}`;
      if (prefetchedNotice.current?.key === key) return;
      const notice = buildAppsheetTbNotice(selectedSchedule, noticeNumber);
      prefetchedNotice.current = { key, notice };
      prefetchPdf(url);
      return;
    }

    const routeCode = resolveRouteCodeForNotice(selectedSchedule);
    if (!routeCode) return;
    const key = `${routeCode}:${noticeNumber}`;
    if (prefetchedNotice.current?.key === key) return;
    void operationNoticeService.resolveForSchedule(routeCode, noticeNumber).then((notice) => {
      if (notice?.fileUrl) {
        prefetchedNotice.current = { key, notice };
        prefetchPdf(notice.fileUrl);
      }
    }).catch(() => { });
  };

  const handleViewNoticePdf = async (selectedSchedule: Schedule) => {
    const noticeNumber = selectedSchedule.notificationNumber?.trim();
    if (!noticeNumber) return;

    if (scheduleDataSource === "appsheet" && selectedSchedule.notificationFileUrl?.trim()) {
      const url = selectedSchedule.notificationFileUrl.trim();
      const key = `appsheet-file:${url}`;
      setNoticePdfOpen(true);
      if (prefetchedNotice.current?.key === key && prefetchedNotice.current.notice) {
        setSelectedNotice(prefetchedNotice.current.notice);
        return;
      }
      const notice = buildAppsheetTbNotice(selectedSchedule, noticeNumber);
      prefetchedNotice.current = { key, notice };
      setSelectedNotice(notice);
      return;
    }

    const routeCode = resolveRouteCodeForNotice(selectedSchedule);
    if (!routeCode) {
      toast.warn("Chưa xác định được mã tuyến để tra thông báo khai thác.");
      return;
    }

    setNoticePdfOpen(true);

    const key = `${routeCode}:${noticeNumber}`;
    if (prefetchedNotice.current?.key === key && prefetchedNotice.current.notice) {
      setSelectedNotice(prefetchedNotice.current.notice);
      return;
    }

    setNoticeLoading(true);
    try {
      const notice = await operationNoticeService.resolveForSchedule(routeCode, noticeNumber);
      if (notice) {
        prefetchedNotice.current = { key, notice };
        setSelectedNotice(notice);
      } else {
        setNoticePdfOpen(false);
        toast.info("Không tìm thấy thông báo trong CSDL (so khớp mã tuyến + số TB).");
      }
    } catch (err) {
      console.error("Failed to fetch operation notice:", err);
      setNoticePdfOpen(false);
      toast.error("Không tải được thông báo khai thác.");
    } finally {
      setNoticeLoading(false);
    }
  };

  return (
    <GlassCard>
      <SectionHeader
        icon={Truck}
        title="Thông tin xe"
        badge={
          <Select
            value={permitType}
            onChange={(e) => setPermitType(e.target.value)}
            className="ml-auto w-28 text-xs py-1.5 px-3 rounded-lg bg-gray-100 border-gray-200 text-gray-700"
            disabled={readOnly}
          >
            <option value="fixed">Cố định</option>
            <option value="temporary">Tạm thời</option>
          </Select>
        }
      />
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Biển số vào bến">
            <StyledInput
              value={record.vehiclePlateNumber || "---"}
              readOnly
              className="bg-gray-100 cursor-not-allowed font-medium"
            />
            <span className="text-xs text-gray-500 mt-1 block">
              Để sửa biển số, vui lòng edit Entry
            </span>
          </FormField>
          <FormField label="Xe đi thay">
            <Autocomplete
              value={replacementVehicleId}
              onChange={(value) => setReplacementVehicleId(value)}
              options={vehiclesWithStatus
                .filter(v => v.plateNumber && v.id !== selectedVehicle?.id)
                .map(v => ({
                  value: v.id,
                  label: `${v.plateNumber} ${v.isBusy ? '(Đang bận)' : '(Sẵn sàng)'}`
                }))}
              placeholder="Chọn hoặc nhập biển số xe thay thế"
              disabled={readOnly}
              className="bg-gray-50 border-gray-200 rounded-xl"
            />
            {replacementVehicleId && (() => {
              const selectedReplacement = vehiclesWithStatus.find(v => v.id === replacementVehicleId);
              if (selectedReplacement?.isBusy) {
                return (
                  <div className="flex items-center gap-1.5 mt-2 text-amber-600 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Xe đang bận (có dispatch chưa hoàn thành)</span>
                  </div>
                );
              }
              if (selectedReplacement) {
                return (
                  <div className="flex items-center gap-1.5 mt-2 text-emerald-600 text-xs">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Xe sẵn sàng</span>
                  </div>
                );
              }
              return null;
            })()}
          </FormField>
        </div>

        <div>
          <FormField label="Đơn vị vận tải">
            {selectedOperatorId ? (() => {
              const op = operators.find((o) => o.id === selectedOperatorId);
              return (
                <div className="w-full min-h-9 px-3 py-2 rounded-lg bg-gray-100 border border-gray-300 text-sm text-gray-900 break-words">
                  {op ? `${op.name}${op.code ? ` (${op.code})` : ''}` : operatorNameFromVehicle || selectedOperatorId}
                </div>
              );
            })() : operatorNameFromVehicle ? (
              <div className="w-full min-h-9 px-3 py-2 rounded-lg bg-gray-100 border border-gray-300 text-sm text-gray-900 break-words">
                {operatorNameFromVehicle}
              </div>
            ) : (
              <StyledSelect
                value=""
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                disabled={readOnly}
              >
                <option value="">-- Chọn đơn vị --</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name} {op.code ? `(${op.code})` : ''}
                  </option>
                ))}
              </StyledSelect>
            )}
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Giờ vào bến">
            <StyledInput
              value={formatVietnamTime(record.entryTime, "HH:mm dd/MM/yyyy")}
              readOnly
              className="bg-gray-100"
            />
          </FormField>
          <FormField label="Biểu đồ giờ" required={!departureTime}>
            <div className="flex flex-col gap-2">
              {onScheduleDataSourceChange && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">Nguồn:</span>
                  <ScheduleSourceToggle
                    value={scheduleDataSource}
                    onChange={onScheduleDataSourceChange}
                    disabled={!routeId || readOnly}
                  />
                </div>
              )}
              <StyledSelect
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
                disabled={!routeId || readOnly}
              >
                <option value="">
                  {!routeId ? "Chọn tuyến trước" : schedules.length === 0 ? "Không có biểu đồ" : "Chọn giờ"}
                </option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {format(new Date(`2000-01-01T${s.departureTime}`), "HH:mm")}
                  </option>
                ))}
              </StyledSelect>
              {onLoadSchedulesFromAppsheetTbJoin && !readOnly && (
                <button
                  type="button"
                  onClick={() => void onLoadSchedulesFromAppsheetTbJoin()}
                  disabled={!routeId || isLoadingTbJoinSchedules}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isLoadingTbJoinSchedules ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : (
                    <CloudDownload className="h-3.5 w-3.5 shrink-0" />
                  )}
                  Lấy từ AppSheet (TB khai thác → ID_TB → giờ, chiều Đi)
                </button>
              )}
            </div>
            {scheduleId && (() => {
              const selected = schedules.find(s => s.id === scheduleId);
              if (!selected) return null;
              return (
                <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                  <div className="text-xs">
                    <span className="font-medium text-gray-700">Mã biểu đồ:</span>{" "}
                    <span className="text-gray-600">{getDisplayScheduleCode(selected)}</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-gray-700">Ngày hoạt động:</span>{" "}
                    <span className="text-gray-600">
                      {selected.frequencyType === 'daily'
                        ? "Hàng ngày"
                        : selected.frequencyType === 'weekly'
                          ? (selected.daysOfWeek?.length
                            ? selected.daysOfWeek.map((d: number) =>
                              ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][d] || `Ngày ${d}`
                            ).join(', ')
                            : "Hàng ngày")
                          : (selected.daysOfMonth?.length
                            ? `Ngày ${selected.daysOfMonth.join(", ")}`
                            : "Hàng ngày")}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-gray-700">Loại lịch:</span>{" "}
                    <span className="text-gray-600">
                      {selected.calendarType === "lunar" ? "Âm lịch" : "Dương lịch"}
                    </span>
                  </div>
                  {selected.notificationNumber && (
                    <div className="text-xs flex items-center gap-1.5">
                      <span className="font-medium text-gray-700">Số thông báo:</span>{" "}
                      <span className="text-gray-600">{selected.notificationNumber}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleViewNoticePdf(selected);
                        }}
                        onMouseEnter={() => handlePrefetchNotice(selected)}
                        className="p-0.5 hover:bg-blue-100 rounded transition-colors shrink-0"
                        title="Xem thông báo khai thác (PDF)"
                        disabled={noticeLoading}
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-500 hover:text-blue-700" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
            {scheduleWarning && (
              <div className="flex items-center gap-1.5 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span className="text-xs text-red-600 font-medium">{scheduleWarning}</span>
              </div>
            )}
          </FormField>
        </div>
      </div>
      <OperationNoticePdfViewer
        notice={selectedNotice}
        open={noticePdfOpen}
        onClose={() => { setNoticePdfOpen(false); setSelectedNotice(null); }}
      />
    </GlassCard>
  );
}
