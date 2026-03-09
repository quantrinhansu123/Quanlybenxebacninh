import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CapPhepDialog } from "./CapPhepDialog";
import { FormHeader, VehicleEntryForm, TransportOrderPreview } from "./entry";
import { useChoXeVaoBenForm } from "@/hooks/useChoXeVaoBenForm";
import type { DispatchRecord } from "@/types";

interface ChoXeVaoBenDialogProps {
  vehicleOptions: Array<{ id: string; plateNumber: string }>;
  onClose: () => void;
  onSuccess?: () => void;
  open?: boolean;
  editRecord?: DispatchRecord | null;
}

export function ChoXeVaoBenDialog({
  vehicleOptions,
  onClose,
  onSuccess,
  open = true,
  editRecord = null,
}: ChoXeVaoBenDialogProps) {
  const {
    isEditMode,
    vehicleId,
    entryDateTime,
    setEntryDateTime,
    performPermitAfterEntry,
    setPerformPermitAfterEntry,
    confirmPassengerDrop,
    scheduleId,
    setScheduleId,
    passengersArrived,
    setPassengersArrived,
    routeId,
    setRouteId,
    transportOrderCode,
    setTransportOrderCode,
    signAndTransmit,
    setSignAndTransmit,
    printDisplay,
    setPrintDisplay,
    routes,
    schedules,
    transportOrderDisplay,
    isLoading,
    isAnimating,
    showPermitDialog,
    permitDispatchRecord,
    handleVehicleSelect,
    handleRefreshTransportOrder,
    handleConfirmPassengerDropChange,
    handleSubmit,
    handleClose,
    handlePermitDialogClose,
  } = useChoXeVaoBenForm({ open, editRecord, onSuccess, onClose });

  // Handle browser back button - close dialog instead of navigating away
  const closedViaBackButtonRef = useRef(false);
  const historyPushedRef = useRef(false);

  // Use ref for handleClose to avoid effect re-runs
  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  useEffect(() => {
    if (!open) {
      historyPushedRef.current = false;
      return;
    }
    // Don't add history state if permit dialog is showing (let it handle back button)
    if (showPermitDialog) return;

    // Prevent duplicate pushState (React StrictMode runs effects twice)
    if (historyPushedRef.current) return;

    closedViaBackButtonRef.current = false;
    historyPushedRef.current = true;

    // Push state with current URL - back button will close dialog and stay on same page
    window.history.pushState({ choXeVaoBenDialogOpen: true }, "", window.location.href);

    const handlePopState = () => {
      closedViaBackButtonRef.current = true;
      historyPushedRef.current = false;
      handleCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Note: We don't call history.back() here to avoid triggering popstate
      // The extra history entry will be cleaned up naturally on next navigation
    };
  }, [open, showPermitDialog]); // Only depend on open and showPermitDialog

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={handleClose}
    >
      <div
        className={`bg-white w-full h-full overflow-y-auto overflow-x-hidden transition-all duration-300 ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-[1920px] mx-auto p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormHeader
              isEditMode={isEditMode}
              isLoading={isLoading}
              performPermitAfterEntry={performPermitAfterEntry}
              onPerformPermitChange={setPerformPermitAfterEntry}
              onClose={handleClose}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <VehicleEntryForm
                vehicleOptions={vehicleOptions}
                vehicleId={vehicleId}
                editRecordPlateNumber={editRecord?.vehiclePlateNumber}
                entryDateTime={entryDateTime}
                confirmPassengerDrop={confirmPassengerDrop}
                routeId={routeId}
                scheduleId={scheduleId}
                passengersArrived={passengersArrived}
                transportOrderCode={transportOrderCode}
                routes={routes}
                schedules={schedules}
                onVehicleSelect={handleVehicleSelect}
                onEntryDateTimeChange={setEntryDateTime}
                onConfirmPassengerDropChange={handleConfirmPassengerDropChange}
                onRouteChange={setRouteId}
                onScheduleChange={setScheduleId}
                onPassengersArrivedChange={setPassengersArrived}
                onTransportOrderCodeChange={setTransportOrderCode}
                onRefreshTransportOrder={handleRefreshTransportOrder}
              />

              <TransportOrderPreview
                signAndTransmit={signAndTransmit}
                printDisplay={printDisplay}
                transportOrderDisplay={transportOrderDisplay}
                onSignAndTransmitChange={setSignAndTransmit}
                onPrintDisplayChange={setPrintDisplay}
              />
            </div>
          </form>
        </div>
      </div>

      {showPermitDialog && permitDispatchRecord && (
        <CapPhepDialog
          record={permitDispatchRecord}
          open={showPermitDialog}
          onClose={handlePermitDialogClose}
          onSuccess={handlePermitDialogClose}
          skipHistoryManagement
        />
      )}
    </div>,
    document.body
  );
}
