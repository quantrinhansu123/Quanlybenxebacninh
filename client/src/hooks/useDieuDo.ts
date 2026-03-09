import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatchStore } from "@/store/dispatch.store";
import { dispatchService } from "@/services/dispatch.service";
import { quanlyDataService } from "@/services/quanly-data.service";
import { useUIStore } from "@/store/ui.store";
import type { DispatchRecord, DispatchStatus, Vehicle } from "@/types";
import type { DisplayStatus } from "@/components/dispatch/common";

export type DialogType =
  | "entry"
  | "edit"
  | "return"
  | "permit"
  | "payment"
  | "depart"
  | "departure-order"
  | "monthly-payment"
  | "depart-multiple";

export function useDieuDo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { records, setRecords } = useDispatchStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DispatchRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>("entry");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const setTitle = useUIStore((state) => state.setTitle);

  // Restore dialog state from URL params
  // FIX: Require BOTH dispatchId AND action to prevent fallback to "permit"
  useEffect(() => {
    const dispatchId = searchParams.get("dispatch");
    const action = searchParams.get("action") as DialogType | null;
    const readonly = searchParams.get("readonly") === "true";

    // Only open dialog if BOTH dispatchId and action are present
    // This prevents race condition when closing dialog (params being cleared)
    if (dispatchId && action && records.length > 0) {
      const record = records.find((r) => r.id === dispatchId);
      if (record) {
        setSelectedRecord(record);
        setDialogType(action);
        setIsReadOnly(readonly);
        setDialogOpen(true);
      }
    }
  }, [searchParams, records]);

  useEffect(() => {
    setTitle("Điều độ xe");
    loadVehicles();
    loadRecords(true); // Initial load with loading state
    const interval = setInterval(() => loadRecords(false), 30000); // Polling without loading state
    return () => clearInterval(interval);
  }, [setTitle]);

  const loadVehicles = async () => {
    try {
      // Use cached quanlyDataService (5 min FE cache + 30 min BE cache)
      const data = await quanlyDataService.getVehicles();

      // Map to Vehicle type (only need id + plateNumber + hasBadge for vehicleOptions)
      const vehicles: Vehicle[] = data.map((v) => ({
        id: v.id,
        plateNumber: v.plateNumber,
        seatCapacity: v.seatCapacity,
        operatorId: '',
        operatorName: v.operatorName,
        isActive: v.isActive,
        hasBadge: v.hasBadge,
        hasValidBadge: v.hasValidBadge,
      }));
      setVehicles(vehicles);
    } catch (error) {
      console.error("[useDieuDo] Failed to load vehicles:", error);
    }
  };

  const loadRecords = async (showLoading = true) => {
    // Only show loading state on initial load, not on polling refresh (stale-while-revalidate)
    if (showLoading) setIsLoading(true);
    try {
      const data = await dispatchService.getAll();
      // Filter out cancelled records
      const activeRecords = data.filter(r => r.currentStatus !== 'cancelled');
      setRecords(activeRecords);
    } catch (error) {
      console.error("Failed to load records:", error);
      toast.error("Không thể tải danh sách điều độ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (record: DispatchRecord) => {
    console.log("[handleDelete] Called for record:", record.id, record.vehiclePlateNumber);
    if (!window.confirm(`Xóa xe ${record.vehiclePlateNumber} khỏi danh sách?`)) {
      console.log("[handleDelete] User cancelled");
      return;
    }
    try {
      console.log("[handleDelete] Calling API delete for:", record.id);
      await dispatchService.delete(record.id);
      console.log("[handleDelete] Delete successful");
      toast.success("Đã xóa xe khỏi danh sách");
      await loadRecords();
    } catch (error: unknown) {
      console.error("[handleDelete] Error:", error);
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Không thể xóa");
    }
  };

  const updateUrlParams = useCallback((record: DispatchRecord | null, type: DialogType, readonly = false) => {
    if (record) {
      const params = new URLSearchParams();
      params.set("dispatch", record.id);
      params.set("action", type);
      if (readonly) params.set("readonly", "true");
      // Push to history stack so Back button closes dialog instead of navigating away
    setSearchParams(params);
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [setSearchParams]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const handleEdit = (record: DispatchRecord) => {
    setSelectedRecord(record);
    setDialogType("edit");
    setIsReadOnly(false);
    setDialogOpen(true);
    updateUrlParams(record, "edit");
    // Ensure vehicles are loaded for dropdown
    if (vehicles.length === 0) {
      loadVehicles();
    }
  };

  const handleAction = (record: DispatchRecord, type: DialogType) => {
    setSelectedRecord(record);
    setDialogType(type);
    setDialogOpen(true);
    setIsReadOnly(false);
    updateUrlParams(record, type);
  };

  const handleOpenPermitReadOnly = (record: DispatchRecord) => {
    setSelectedRecord(record);
    setDialogType("permit");
    setIsReadOnly(true);
    setDialogOpen(true);
    updateUrlParams(record, "permit", true);
  };

  const handleRecordExit = async (record: DispatchRecord) => {
    if (window.confirm("Cho xe ra bến?")) {
      try {
        await dispatchService.recordExit(record.id);
        toast.success("Cho xe ra bến thành công!");
        loadRecords();
      } catch {
        toast.error("Không thể cho xe ra bến");
      }
    }
  };

  const getDisplayStatus = useCallback((currentStatus: DispatchStatus): DisplayStatus => {
    const statusMap: Record<DispatchStatus, DisplayStatus> = {
      entered: "in-station",
      passengers_dropped: "in-station",
      permit_issued: "permit-issued",
      permit_rejected: "in-station",
      paid: "paid",
      departure_ordered: "departed",
      departed: "departed",
      cancelled: "departed", // Cancelled records shown as departed (but filtered out in loadRecords)
    };
    return statusMap[currentStatus] || "in-station";
  }, []);

  const getRecordsByStatus = useCallback((status: DisplayStatus) => {
    return records
      .filter((record) => {
        if (record.currentStatus === "departed") return false;
        const displayStatus = getDisplayStatus(record.currentStatus);
        if (status === "in-station") return displayStatus === "in-station";
        if (status === "permit-issued") return displayStatus === "permit-issued";
        if (status === "paid") return displayStatus === "paid";
        if (status === "departed") return record.currentStatus === "departure_ordered";
        return false;
      })
      .filter((record) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          record.vehiclePlateNumber.toLowerCase().includes(query) ||
          (record.routeName || "").toLowerCase().includes(query) ||
          record.driverName.toLowerCase().includes(query)
        );
      });
  }, [records, searchQuery, getDisplayStatus]);

  const stats = useMemo(() => ({
    "in-station": getRecordsByStatus("in-station").length,
    "permit-issued": getRecordsByStatus("permit-issued").length,
    paid: getRecordsByStatus("paid").length,
    departed: getRecordsByStatus("departed").length,
  }), [getRecordsByStatus]);

  const totalActive = stats["in-station"] + stats["permit-issued"] + stats.paid + stats.departed;

  // Track active vehicles by PLATE NUMBER (not ID) to handle legacy/badge ID inconsistency
  const activePlateNumbers = useMemo(() => {
    const plates = new Set<string>();
    for (const record of records) {
      if (record.currentStatus !== "departed" && record.currentStatus !== "departure_ordered") {
        // Normalize plate number for comparison
        const plate = record.vehiclePlateNumber?.replace(/[.\-\s]/g, '').toUpperCase();
        if (plate) {
          plates.add(plate);
        }
      }
    }
    return plates;
  }, [records]);

  const vehicleOptions = useMemo(() => {
    const options = vehicles
      .filter((v) => {
        // Only show vehicles with valid badges (Buýt / Tuyến cố định)
        // Entry mode: require at least 1 non-expired badge
        if (dialogType === "entry") {
          if (!v.hasValidBadge) return false;
          return true;
        }
        // Other modes: keep using hasBadge (backward compat)
        if (!v.hasBadge) return false;

        const normalizedPlate = v.plateNumber?.replace(/[.\-\s]/g, '').toUpperCase();
        const isEditingThisVehicle = dialogType === "edit" &&
          selectedRecord?.vehiclePlateNumber?.replace(/[.\-\s]/g, '').toUpperCase() === normalizedPlate;
        return !activePlateNumbers.has(normalizedPlate) || isEditingThisVehicle;
      })
      .map((v) => ({ id: v.id, plateNumber: v.plateNumber }));

    // When editing, ensure the current vehicle is in options with CORRECT ID
    // Match by ID (not plate) to ensure Autocomplete finds the option
    if (dialogType === "edit" && selectedRecord?.vehicleId && selectedRecord?.vehiclePlateNumber) {
      const existsInOptions = options.some(
        (o) => o.id === selectedRecord.vehicleId  // Match by ID for legacy/badge vehicles
      );
      if (!existsInOptions) {
        options.unshift({
          id: selectedRecord.vehicleId,
          plateNumber: selectedRecord.vehiclePlateNumber,
        });
      }
    }
    
    return options;
  }, [vehicles, activePlateNumbers, dialogType, selectedRecord]);

  const isMonthlyPaymentVehicle = useCallback((record: DispatchRecord): boolean => {
    if (record.metadata?.paymentType === "monthly") return true;
    const displayStatus = getDisplayStatus(record.currentStatus);
    if (record.transportOrderCode && displayStatus === "in-station") return true;
    return false;
  }, [getDisplayStatus]);

  const getVehicleStatus = useCallback((record: DispatchRecord, status: DisplayStatus): 'eligible' | 'ineligible' | 'returned' | 'irregular' | null => {
    if (record.metadata?.type === "irregular") return 'irregular';
    if (record.currentStatus === "passengers_dropped") return 'returned';
    if (record.permitStatus === "rejected" || (status === "paid" && !record.permitStatus)) return 'ineligible';
    if (record.permitStatus === "approved") return 'eligible';
    return null;
  }, []);

  return {
    records,
    searchQuery,
    setSearchQuery,
    isLoading,
    vehicles,
    selectedRecord,
    setSelectedRecord,
    dialogOpen,
    setDialogOpen,
    closeDialog,
    dialogType,
    setDialogType,
    isReadOnly,
    setIsReadOnly,
    vehicleOptions,
    stats,
    totalActive,
    loadRecords,
    handleDelete,
    handleEdit,
    handleAction,
    handleOpenPermitReadOnly,
    handleRecordExit,
    getDisplayStatus,
    getRecordsByStatus,
    isMonthlyPaymentVehicle,
    getVehicleStatus,
  };
}
