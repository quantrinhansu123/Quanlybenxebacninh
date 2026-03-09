import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FileText, X, XCircle, CheckCircle, Calendar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useCapPhepDialog } from "@/hooks/useCapPhepDialog";
import {
  VehicleInfoSection,
  DriverSection,
  MonthlyCalendarHeatmap,
  TransportOrderSection,
  ServiceChargesSection,
  DocumentCheckCards,
  VehicleImageSection,
  GsgtCheckSection,
  NotesSection,
  ZeroAmountWarningDialog,
} from "./sections";
import { KiemTraGiayToDialog } from "./KiemTraGiayToDialog";
import { LyDoKhongDuDieuKienDialog } from "./LyDoKhongDuDieuKienDialog";
import { ThemDichVuDialog } from "./ThemDichVuDialog";
import { ThemTaiXeDialog } from "./ThemTaiXeDialog";
import type { DispatchRecord } from "@/types";

interface CapPhepDialogProps {
  record: DispatchRecord;
  onClose: () => void;
  onSuccess?: () => void;
  open?: boolean;
  readOnly?: boolean;
  /** Skip history pushState when dialog is nested inside another dialog */
  skipHistoryManagement?: boolean;
}

export function CapPhepDialog({
  record,
  onClose,
  onSuccess,
  open = true,
  readOnly = false,
  skipHistoryManagement = false,
}: CapPhepDialogProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [notEligibleDialogOpen, setNotEligibleDialogOpen] = useState(false);
  const [addServiceDialogOpen, setAddServiceDialogOpen] = useState(false);
  const [addDriverDialogOpen, setAddDriverDialogOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const hook = useCapPhepDialog(record, onClose, onSuccess);

  useEffect(() => {
    if (open) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  // Handle browser back button - prevent navigation, just close dialog
  // Use a ref to track if dialog was closed via back button
  const closedViaBackButtonRef = useRef(false);
  const historyPushedRef = useRef(false);

  // Use ref for callbacks to avoid effect re-runs when parent re-renders
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      historyPushedRef.current = false;
      return;
    }
    // Skip history management when nested inside another dialog
    if (skipHistoryManagement) return;

    // Prevent duplicate pushState (React StrictMode runs effects twice)
    if (historyPushedRef.current) return;

    closedViaBackButtonRef.current = false;
    historyPushedRef.current = true;

    // Push state with current URL - back button will close dialog and stay on same page
    window.history.pushState({ capPhepDialogOpen: true }, "", window.location.href);

    const handlePopState = () => {
      // User pressed back button - close dialog instead of navigating
      closedViaBackButtonRef.current = true;
      historyPushedRef.current = false;
      setIsAnimating(false);
      setTimeout(() => onCloseRef.current(), 300);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Note: We don't call history.back() here to avoid triggering popstate
      // The extra history entry will be cleaned up naturally on next navigation
    };
  }, [open, skipHistoryManagement]); // Only depend on open and skipHistoryManagement

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300);
  };

  const handleNotEligibleConfirm = async (
    selectedReasons: string[],
    options: { createOrder: boolean; signAndTransmit: boolean; printDisplay: boolean }
  ) => {
    await hook.handleNotEligibleConfirm(selectedReasons, options);
    setNotEligibleDialogOpen(false);
  };

  if (!open) return null;

  const overallStatus = hook.getOverallStatus();

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Clean background */}
      <div className="absolute inset-0 bg-gray-50" />

      {/* STICKY HEADER */}
      <div
        className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm"
      >
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Title & Info */}
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-blue-600">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {readOnly ? "Xem Cấp phép" : "Cấp phép lên nốt"}
                </h1>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold text-blue-600">{record.vehiclePlateNumber || "---"}</span>
                  {record.entryTime && (
                    <span className="text-gray-500">
                      Vào bến: {format(new Date(record.entryTime), "HH:mm dd/MM")}
                    </span>
                  )}
                  {/* Pre-flight status inline */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                    overallStatus.isValid
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {overallStatus.isValid ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {overallStatus.validCount}/{overallStatus.totalCount} ĐK
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                disabled={hook.isLoading}
                className="h-9 px-4 rounded-lg border border-gray-300 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4 inline mr-1" />
                {readOnly ? "Đóng" : "Hủy"}
              </button>
              {!readOnly && (
                <>
                  <button
                    onClick={() => setNotEligibleDialogOpen(true)}
                    disabled={hook.isLoading}
                    className="h-9 px-4 rounded-lg bg-rose-500 text-white font-medium text-sm hover:bg-rose-600 transition-colors"
                  >
                    <XCircle className="h-4 w-4 inline mr-1" />
                    Không đủ ĐK
                  </button>
                  <button
                    onClick={hook.handleEligible}
                    disabled={hook.isLoading || !!hook.noValidScheduleWarning || !!hook.tripLimitWarning}
                    className="h-10 px-6 rounded-lg bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    Đủ điều kiện
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {hook.noValidScheduleWarning && (
          <div className="max-w-[1800px] mx-auto px-4 lg:px-6 pb-3">
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-sm text-amber-700 font-medium">{hook.noValidScheduleWarning}</span>
            </div>
          </div>
        )}
        {hook.tripLimitWarning && (
          <div className="max-w-[1800px] mx-auto px-4 lg:px-6 pb-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <span className="text-sm text-red-700 font-medium">{hook.tripLimitWarning}</span>
            </div>
          </div>
        )}
        {hook.tripLimitData && !hook.tripLimitWarning && (
          <div className="max-w-[1800px] mx-auto px-4 lg:px-6 pb-3">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <span className="text-xs text-blue-700">
                Chuyến đã cấp: {hook.tripLimitData.currentTrips}/{hook.tripLimitData.maxTrips}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT - Scrollable */}
      <div
        className={`flex-1 overflow-y-auto transition-all duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-4">
          {/* Loading state */}
          {hook.isInitialLoading && (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="text-center">
                <div className="relative w-12 h-12 mx-auto mb-3">
                  <div className="absolute inset-0 rounded-full border-3 border-gray-200" />
                  <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-blue-500 animate-spin" />
                </div>
                <p className="text-gray-500 text-sm">Đang tải...</p>
              </div>
            </div>
          )}

          {!hook.isInitialLoading && (
            <div className="grid grid-cols-12 gap-4">
              {/* COLUMN 1: Vehicle, Driver, Documents (4 cols) */}
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <VehicleInfoSection
                  record={record}
                  readOnly={readOnly}
                  permitType={hook.permitType}
                  setPermitType={hook.setPermitType}
                  selectedVehicle={hook.selectedVehicle}
                  vehiclesWithStatus={hook.vehiclesWithStatus}
                  replacementVehicleId={hook.replacementVehicleId}
                  setReplacementVehicleId={hook.setReplacementVehicleId}
                  operatorNameFromVehicle={hook.operatorNameFromVehicle}
                  selectedOperatorId={hook.selectedOperatorId}
                  setSelectedOperatorId={hook.setSelectedOperatorId}
                  operators={hook.operators}
                  scheduleId={hook.scheduleId}
                  setScheduleId={hook.setScheduleId}
                  routeId={hook.routeId}
                  routes={hook.routes}
                  schedules={hook.schedules}
                  departureTime={hook.departureTime}
                  scheduleWarning={hook.scheduleWarning}
                />
                <DriverSection
                  drivers={hook.drivers}
                  readOnly={readOnly}
                  onAddDriver={() => setAddDriverDialogOpen(true)}
                />
                <DocumentCheckCards
                  documents={hook.getDocumentsCheckResults()}
                  isValid={overallStatus.isValid}
                  validCount={overallStatus.validCount}
                  totalCount={overallStatus.totalCount}
                  onEdit={() => setDocumentDialogOpen(true)}
                />
              </div>

              {/* COLUMN 2: Transport Order & Services (4 cols) */}
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <TransportOrderSection
                  readOnly={readOnly}
                  transportOrderCode={hook.transportOrderCode}
                  setTransportOrderCode={hook.setTransportOrderCode}
                  seatCount={hook.seatCount}
                  setSeatCount={hook.setSeatCount}
                  bedCount={hook.bedCount}
                  setBedCount={hook.setBedCount}
                  hhTicketCount={hook.hhTicketCount}
                  setHhTicketCount={hook.setHhTicketCount}
                  hhPercentage={hook.hhPercentage}
                  setHhPercentage={hook.setHhPercentage}
                  routeId={hook.routeId}
                  setRouteId={hook.setRouteId}
                  routes={hook.routes}
                  departureTime={hook.departureTime}
                  setDepartureTime={hook.setDepartureTime}
                  departureDate={hook.departureDate}
                  setDepartureDate={hook.setDepartureDate}
                  scheduleId={hook.scheduleId}
                  validationErrors={hook.validationErrors}
                />
                <ServiceChargesSection
                  readOnly={readOnly}
                  serviceCharges={hook.serviceCharges}
                  totalAmount={hook.totalAmount}
                  serviceDetailsExpanded={hook.serviceDetailsExpanded}
                  setServiceDetailsExpanded={hook.setServiceDetailsExpanded}
                  onAddService={() => setAddServiceDialogOpen(true)}
                  recordId={record.id}
                />
                <GsgtCheckSection />
              </div>

              {/* COLUMN 3: Images, Notes, Calendar (4 cols) */}
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <VehicleImageSection
                  vehicleImageUrl={hook.selectedVehicle?.imageUrl}
                  entryImageUrl={record.entryImageUrl}
                  dispatchId={record.id}
                />
                <NotesSection />
                {/* Calendar Toggle */}
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Lịch hoạt động tháng
                  </span>
                  <span className="text-xs text-gray-400">{showCalendar ? "Ẩn" : "Hiện"}</span>
                </button>
                {showCalendar && (
                  <MonthlyCalendarHeatmap
                    departureDate={hook.departureDate}
                    dailyTripCounts={hook.dailyTripCounts}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {record.vehicleId && (
        <KiemTraGiayToDialog
          vehicleId={record.vehicleId}
          open={documentDialogOpen}
          onClose={() => setDocumentDialogOpen(false)}
          onSuccess={hook.handleDocumentDialogSuccess}
        />
      )}
      <LyDoKhongDuDieuKienDialog
        open={notEligibleDialogOpen}
        onClose={() => setNotEligibleDialogOpen(false)}
        onConfirm={handleNotEligibleConfirm}
      />
      {record.id && (
        <ThemDichVuDialog
          dispatchRecordId={record.id}
          open={addServiceDialogOpen}
          onClose={() => setAddServiceDialogOpen(false)}
          onSuccess={hook.handleAddServiceSuccess}
        />
      )}
      <ThemTaiXeDialog
        operatorId={hook.selectedOperatorId || undefined}
        open={addDriverDialogOpen}
        onClose={() => setAddDriverDialogOpen(false)}
        onSuccess={hook.handleAddDriverSuccess}
      />
      <ZeroAmountWarningDialog
        open={hook.showZeroAmountConfirm}
        onClose={() => hook.setShowZeroAmountConfirm(false)}
        onConfirm={() => {
          hook.setShowZeroAmountConfirm(false);
          hook.submitPermit();
        }}
      />
    </div>,
    document.body
  );
}
