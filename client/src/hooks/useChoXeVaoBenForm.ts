import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { vehicleService } from "@/services/vehicle.service";
import { routeService } from "@/services/route.service";
import { scheduleService } from "@/services/schedule.service";
import { dispatchService } from "@/services/dispatch.service";
import { driverService } from "@/services/driver.service";
import { useUIStore } from "@/store/ui.store";
import { parseDatabaseTimeForEdit } from "@/lib/vietnam-time";
import type { Route, Schedule, Driver, DispatchInput, DispatchRecord } from "@/types";
import type { Shift } from "@/services/shift.service";

interface UseChoXeVaoBenFormProps {
  open: boolean;
  editRecord: DispatchRecord | null;
  onSuccess?: () => void;
  onClose: () => void;
}

export function useChoXeVaoBenForm({
  open,
  editRecord,
  onSuccess,
  onClose,
}: UseChoXeVaoBenFormProps) {
  const isEditMode = !!editRecord;
  const [vehicleId, setVehicleId] = useState("");
  const [entryDateTime, setEntryDateTime] = useState<Date | undefined>(new Date());
  const [performPermitAfterEntry, setPerformPermitAfterEntry] = useState(false);
  const [confirmPassengerDrop, setConfirmPassengerDrop] = useState(false);
  const [scheduleId, setScheduleId] = useState("");
  const [passengersArrived, setPassengersArrived] = useState("");
  const [routeId, setRouteId] = useState("");
  const [transportOrderCode, setTransportOrderCode] = useState("");
  const [signAndTransmit, setSignAndTransmit] = useState(true);
  const [printDisplay, setPrintDisplay] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [transportOrderDisplay] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPermitDialog, setShowPermitDialog] = useState(false);
  const [permitDispatchRecord, setPermitDispatchRecord] = useState<DispatchRecord | null>(null);
  const [hasUserModified, setHasUserModified] = useState(false);  // Prevents vehicleId reset after user clears
  const { currentShift } = useUIStore();

  const getShiftIdFromCurrentShift = (): string | undefined => {
    if (!currentShift || currentShift === "<Trống>") {
      return undefined;
    }
    const currentShifts = useUIStore.getState().shifts;
    if (currentShifts.length === 0) {
      return undefined;
    }
    const match = currentShift.match(/^(.+?)\s*\(/);
    if (!match) {
      return undefined;
    }
    const shiftName = match[1].trim();
    const foundShift = currentShifts.find((shift: Shift) => shift.name === shiftName);
    return foundShift?.id;
  };

  useEffect(() => {
    if (open) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
      if (!isEditMode) {
        resetForm();
      }
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open, isEditMode]);

  useEffect(() => {
    loadRoutes();
    const { shifts: currentShifts, loadShifts } = useUIStore.getState();
    if (currentShifts.length === 0) {
      loadShifts();
    }
  }, []);

  useEffect(() => {
    if (vehicleId) {
      loadVehicleDetails(vehicleId);
    } else {
      setSelectedDriver(null);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (routeId) {
      loadSchedules(routeId);
    } else {
      setSchedules([]);
    }
  }, [routeId]);

  // Auto-generate transport order code when vehicle is selected
  useEffect(() => {
    if (vehicleId && !transportOrderCode && hasUserModified) {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      setTransportOrderCode(`LVC-${dateStr}-${randomSuffix}`);
    }
  }, [vehicleId]);

  useEffect(() => {
    // Only initialize from editRecord if user hasn't modified the vehicle selection
    if (isEditMode && editRecord && !hasUserModified) {
      // Set vehicleId - editRecord.vehicleId may not match current vehicle options
      // Keep the original vehicleId for now, Autocomplete will show plateNumber from label
      setVehicleId(editRecord.vehicleId);
      setRouteId(editRecord.routeId || "");
      if (editRecord.entryTime) {
        // Use parseDatabaseTimeForEdit to handle "fake UTC" timezone correctly
        setEntryDateTime(parseDatabaseTimeForEdit(editRecord.entryTime));
      }
      if (editRecord.driverId) {
        driverService
          .getById(editRecord.driverId)
          .then((driver) => setSelectedDriver(driver))
          .catch(console.error);
      }
    }
  }, [isEditMode, editRecord, hasUserModified]);

  const resetForm = () => {
    setHasUserModified(false);  // Reset flag to allow re-initialization from editRecord
    setVehicleId("");
    setRouteId("");
    setScheduleId("");
    setEntryDateTime(new Date());
    setPassengersArrived("");
    setTransportOrderCode("");
    setConfirmPassengerDrop(false);
    setPerformPermitAfterEntry(false);
    setSelectedDriver(null);
  };

  const loadRoutes = async () => {
    try {
      const data = await routeService.getAll(undefined, undefined, true);
      setRoutes(data);
    } catch (error) {
      console.error("Failed to load routes:", error);
    }
  };

  const loadVehicleDetails = async (id: string) => {
    const isLegacyOrBadge = id.startsWith("legacy_") || id.startsWith("badge_");
    try {
      const vehicle = await vehicleService.getById(id);
      if (vehicle.operatorId) {
        try {
          const drivers = await driverService.getAll(vehicle.operatorId, true);
          if (drivers.length > 0) {
            setSelectedDriver(drivers[0]);
          } else {
            console.warn("No active drivers found for this operator");
            setSelectedDriver(null);
          }
        } catch (error) {
          console.error("Failed to load driver:", error);
          setSelectedDriver(null);
        }
      } else {
        console.warn("Vehicle does not have an operator");
        setSelectedDriver(null);
      }
    } catch (error) {
      console.error("Failed to load vehicle details:", error);
      if (isLegacyOrBadge) {
        console.warn("Không tìm thấy thông tin lái xe cho xe này - cho phép tiếp tục");
      }
      setSelectedDriver(null);
    }
  };

  const loadSchedules = async (routeId: string) => {
    try {
      const data = await scheduleService.getAll(routeId, undefined, true);
      setSchedules(data);
    } catch (error) {
      console.error("Failed to load schedules:", error);
    }
  };

  const handleVehicleSelect = (id: string) => {
    setHasUserModified(true);  // Mark as user-modified to prevent reset from editRecord
    setVehicleId(id);
  };

  const handleRefreshTransportOrder = async () => {
    if (!vehicleId || !routeId) {
      toast.warning("Vui lòng chọn xe và tuyến trước");
      return;
    }

    try {
      // Generate code format: LVC-YYYYMMDD-XXXX
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `LVC-${dateStr}-${randomSuffix}`;

      setTransportOrderCode(code);
      toast.success("Đã tạo mã lệnh vận chuyển");
    } catch (error) {
      console.error("Failed to generate code:", error);
      toast.error("Không thể tạo mã lệnh vận chuyển");
    }
  };

  const handleConfirmPassengerDropChange = (checked: boolean) => {
    setConfirmPassengerDrop(checked);
    if (!checked) {
      setScheduleId("");
      setPassengersArrived("");
      setRouteId("");
      setTransportOrderCode("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!vehicleId) {
      toast.warning("Vui lòng chọn biển kiểm soát");
      return;
    }
    if (!entryDateTime) {
      toast.warning("Vui lòng nhập thời gian vào");
      return;
    }
    if (!selectedDriver) {
      console.warn("Không tìm thấy thông tin lái xe cho xe này - cho phép tiếp tục");
    }
    if (confirmPassengerDrop) {
      if (!routeId) {
        toast.warning("Vui lòng chọn tuyến vận chuyển khi xác nhận trả khách");
        return;
      }
      if (!passengersArrived || passengersArrived.trim() === "") {
        toast.warning("Vui lòng nhập số khách đến bến");
        return;
      }
      if (!transportOrderCode || transportOrderCode.trim() === "") {
        toast.warning("Vui lòng chọn lệnh vận chuyển");
        return;
      }
    }

    const entryTimeISO = entryDateTime.toISOString();
    setIsLoading(true);

    try {
      const entryShiftId = getShiftIdFromCurrentShift();

      if (isEditMode && editRecord) {
        await dispatchService.update(editRecord.id, {
          vehicleId,
          driverId: selectedDriver?.id || undefined,
          routeId: routeId || undefined,
          entryTime: entryTimeISO,
        });
        toast.success("Cập nhật thông tin thành công!");
        onSuccess?.();
        onClose();
        return;
      }

      const dispatchData: DispatchInput = {
        vehicleId,
        driverId: selectedDriver?.id || undefined,
        routeId: routeId || undefined,
        scheduleId: confirmPassengerDrop ? scheduleId || undefined : undefined,
        entryTime: entryTimeISO,
        entryShiftId,
        transportOrderCode: transportOrderCode || undefined,
      };

      const result = await dispatchService.create(dispatchData);
      let updatedRecord = result;

      if (confirmPassengerDrop && passengersArrived) {
        updatedRecord = await dispatchService.recordPassengerDrop(
          result.id,
          parseInt(passengersArrived),
          routeId || undefined
        );
      }

      toast.success("Cho xe vào bến thành công!");

      if (performPermitAfterEntry) {
        try {
          const fullRecord = await dispatchService.getById(updatedRecord.id);

          // Auto-generate transport order code if not already set
          if (!transportOrderCode) {
            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const autoCode = `LVC-${dateStr}-${fullRecord.id.slice(-4).toUpperCase()}`;
            setTransportOrderCode(autoCode);
          }

          setPermitDispatchRecord(fullRecord);
          setShowPermitDialog(true);
        } catch (error) {
          console.error("Failed to load dispatch record for permit:", error);
          toast.error("Không thể tải dữ liệu để cấp phép. Vui lòng thử lại sau.");
          onSuccess?.();
          onClose();
        }
      } else {
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} dispatch record:`, error);
      const axiosError = error as { response?: { data?: { error?: string } } };
      const serverMessage = axiosError.response?.data?.error;
      if (serverMessage) {
        toast.error(serverMessage);
      } else {
        toast.error(
          isEditMode
            ? "Không thể cập nhật bản ghi điều độ. Vui lòng thử lại sau."
            : "Không thể tạo bản ghi điều độ. Vui lòng thử lại sau."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (showPermitDialog) {
      return;
    }
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handlePermitDialogClose = () => {
    setShowPermitDialog(false);
    setPermitDispatchRecord(null);
    onSuccess?.();
    onClose();
  };

  return {
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
  };
}
