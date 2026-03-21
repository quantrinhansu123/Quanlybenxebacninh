import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { vehicleService } from "@/services/vehicle.service";
import { routeService } from "@/services/route.service";
import { scheduleService } from "@/services/schedule.service";
import { dispatchService } from "@/services/dispatch.service";
import { driverService } from "@/services/driver.service";
import { operatorService } from "@/services/operator.service";
import { scheduleApi } from "@/features/fleet/schedules";
import { fetchSchedulesFromAppsheetTbJoin } from "@/services/appsheet-fetch-schedules-tb-join";
import { fetchFullAppsheetSchedulesForRoute } from "@/services/appsheet-fetch-schedules-full-route";
import { useUIStore } from "@/store/ui.store";
import { useDispatchStore } from "@/store/dispatch.store";
import { parseDatabaseTimeForEdit } from "@/lib/vietnam-time";
import type {
  Route,
  Schedule,
  Driver,
  DispatchInput,
  DispatchRecord,
  Operator,
  ScheduleDataSource,
} from "@/types";
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
  const [operators, setOperators] = useState<Operator[]>([]);
  const [vehicleOperatorId, setVehicleOperatorId] = useState("");
  const [isLoadingTbJoinSchedules, setIsLoadingTbJoinSchedules] = useState(false);
  const scheduleDataSource = useDispatchStore((s) => s.scheduleDataSource);
  const setScheduleDataSource = useDispatchStore((s) => s.setScheduleDataSource);
  const schedulesCacheRef = useRef<
    Record<string, { items: Schedule[]; source: ScheduleDataSource }>
  >({});
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [transportOrderDisplay] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPermitDialog, setShowPermitDialog] = useState(false);
  const [permitDispatchRecord, setPermitDispatchRecord] = useState<DispatchRecord | null>(null);
  const [hasUserModified, setHasUserModified] = useState(false);  // Prevents vehicleId reset after user clears
  const { currentShift } = useUIStore();

  const scheduleCacheKey = (rid: string, opId: string | undefined, source: ScheduleDataSource) =>
    `${opId ? `${rid}_${opId}` : rid}::${source}`;

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
      void operatorService.getAll(true).then(setOperators).catch(() => setOperators([]));
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
      setVehicleOperatorId("");
    }
  }, [vehicleId]);

  const loadSchedules = useCallback(
    async (rid: string) => {
      const opId = vehicleOperatorId || undefined;
      try {
        const cacheKey = scheduleCacheKey(rid, opId, scheduleDataSource);
        const hit = schedulesCacheRef.current[cacheKey];
        if (hit) {
          setSchedules(hit.items);
          return;
        }

        if (scheduleDataSource === "database") {
          const data = await scheduleService.getAll(rid, opId, true, "Đi");
          const list = Array.isArray(data) ? data : [];
          setSchedules(list);
          schedulesCacheRef.current[cacheKey] = { items: list, source: "database" };
          return;
        }

        const routeCode = routes.find((r) => r.id === rid)?.routeCode?.trim() || "";
        if (!routeCode) {
          setSchedules([]);
          schedulesCacheRef.current[cacheKey] = { items: [], source: "appsheet" };
          return;
        }

        const outcome = await fetchFullAppsheetSchedulesForRoute({
          routeId: rid,
          routeCode,
          operatorId: opId,
          operators,
        });
        setSchedules(outcome.resolvedSchedules);
        schedulesCacheRef.current[cacheKey] = {
          items: outcome.resolvedSchedules,
          source: "appsheet",
        };

        void (async () => {
          try {
            if (outcome.normalizedForSync.length > 0) {
              await scheduleApi.syncFromAppSheet(outcome.normalizedForSync as unknown[]);
            }
            const refreshed = await scheduleService.getAll(rid, opId, true, "Đi").catch(() => []);
            if (Array.isArray(refreshed) && refreshed.length > 0) {
              const dbKey = scheduleCacheKey(rid, opId, "database");
              schedulesCacheRef.current[dbKey] = { items: refreshed, source: "database" };
            }
          } catch {
            /* ignore */
          }
        })();
      } catch (error) {
        console.error("Failed to load schedules:", error);
      }
    },
    [scheduleDataSource, routes, operators, vehicleOperatorId],
  );

  useEffect(() => {
    if (routeId) {
      void loadSchedules(routeId);
    } else {
      setSchedules([]);
    }
  }, [routeId, loadSchedules]);

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
    setScheduleDataSource("database");
    schedulesCacheRef.current = {};
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
      setVehicleOperatorId(vehicle.operatorId?.trim() || "");
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
      setVehicleOperatorId("");
    }
  };

  const handleScheduleDataSourceChange = (next: ScheduleDataSource) => {
    setScheduleDataSource(next);
    setScheduleId("");
  };

  const loadSchedulesFromAppsheetTbJoin = async () => {
    if (!routeId) {
      toast.warning("Chọn tuyến trước");
      return;
    }
    const routeCode = routes.find((r) => r.id === routeId)?.routeCode?.trim() || "";
    if (!routeCode) {
      toast.error("Tuyến không có mã (route_code)");
      return;
    }

    setIsLoadingTbJoinSchedules(true);
    setScheduleDataSource("appsheet");
    try {
      const outcome = await fetchSchedulesFromAppsheetTbJoin({
        routeId,
        routeCode,
        operatorId: vehicleOperatorId || undefined,
        operators,
      });

      if (outcome.tbFilteredRawCount === 0) {
        setSchedules([]);
        setScheduleId("");
        toast.info("Không có nút chạy cố định khớp TB khai thác (Ref_Tuyen → ID_TB) chiều Đi");
        return;
      }

      const opId = vehicleOperatorId || undefined;
      const appKey = scheduleCacheKey(routeId, opId, "appsheet");
      schedulesCacheRef.current[appKey] = {
        items: outcome.resolvedSchedules,
        source: "appsheet",
      };
      setSchedules(outcome.resolvedSchedules);
      setScheduleId("");
      toast.success(
        outcome.resolvedSchedules.length > 0
          ? `Đã tải ${outcome.resolvedSchedules.length} biểu đồ giờ từ AppSheet (theo TB khai thác)`
          : "Đã lọc theo TB nhưng chưa gán được đơn vị — kiểm tra mã ĐV trên AppSheet / thông tin xe",
      );

      void (async () => {
        try {
          if (outcome.normalizedForSync.length > 0) {
            await scheduleApi.syncFromAppSheet(outcome.normalizedForSync as unknown[]);
          }
          const refreshed = await scheduleService
            .getAll(routeId, vehicleOperatorId || undefined, true, "Đi")
            .catch(() => []);
          if (Array.isArray(refreshed) && refreshed.length > 0) {
            const dbKey = scheduleCacheKey(routeId, opId, "database");
            schedulesCacheRef.current[dbKey] = { items: refreshed, source: "database" };
          }
        } catch {
          /* giữ danh sách TB */
        }
      })();
    } catch (e) {
      console.error("[loadSchedulesFromAppsheetTbJoin]", e);
      toast.error("Không tải được lịch từ AppSheet");
    } finally {
      setIsLoadingTbJoinSchedules(false);
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
    loadSchedulesFromAppsheetTbJoin,
    isLoadingTbJoinSchedules,
    scheduleDataSource,
    handleScheduleDataSourceChange,
  };
}
