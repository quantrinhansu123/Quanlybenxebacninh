import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatchStore } from "@/store/dispatch.store";
import { dispatchService } from "@/services/dispatch.service";
import { quanlyDataService } from "@/services/quanly-data.service";
import { useUIStore } from "@/store/ui.store";
import type { DispatchRecord, DispatchStatus, Vehicle } from "@/types";
import type { DisplayStatus } from "@/components/dispatch/common";
import { useAuthStore } from "@/store/auth.store";

/** Phù hiệu xe buýt — route_code thường không khớp routeLocMap (tuyến cố định), nên không được loại khi lọc theo bến. */
function isBusBadgeType(badgeType: string | undefined): boolean {
  const t = (badgeType || "").toLowerCase();
  return t.includes("buýt") || t.includes("buyt") || t.includes("bus") || t.includes("xe buýt");
}

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

const PAGE_SIZE = 100;

export function useDieuDo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { records, setRecords } = useDispatchStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DispatchRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>("entry");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const setTitle = useUIStore((state) => state.setTitle);
  const currentUser = useAuthStore((state) => state.user);

  const [routesMap, setRoutesMap] = useState<Map<string, { start: string, end: string }>>(new Map());

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
  }, [setTitle, currentUser?.benPhuTrachName]);

  const loadVehicles = async () => {
    try {
      // Fetch vehicles, badges and routes to pre-filter vehicles based on user location
      const data = await quanlyDataService.getAll();

      const routeLocMap = new Map<string, { start: string, end: string }>();
      const routeIdMap = new Map<string, { start: string, end: string }>();
      if (data.routes) {
        for (const r of data.routes) {
          routeLocMap.set(r.code, {
            start: (r.startPoint || '').trim().toLowerCase(),
            end: (r.endPoint || '').trim().toLowerCase()
          });
          routeIdMap.set(r.id, {
            start: (r.startPoint || '').trim().toLowerCase(),
            end: (r.endPoint || '').trim().toLowerCase()
          });
        }
      }
      setRoutesMap(routeIdMap);

      const validPlates = new Set<string>();
      const userLoc = currentUser?.benPhuTrachName?.trim().toLowerCase();

      if (data.badges) {
        for (const b of data.badges) {
          const plate = b.license_plate_sheet?.trim().toUpperCase();
          if (!plate) continue;

          if (userLoc) {
            const rData = routeLocMap.get(b.route_code) || { start: "", end: "" };
            const matchesBen =
              rData.start === userLoc || rData.end === userLoc;
            // Buýt: route_code / điểm đầu-cuối trong API quanly-data không bám theo cùng logic tuyến cố định → vẫn đưa vào DS biển số.
            if (matchesBen || isBusBadgeType(b.badge_type)) {
              validPlates.add(plate);
            }
          } else {
            validPlates.add(plate);
          }
        }
      }

      // Map to Vehicle type (only need id + plateNumber + hasBadge for vehicleOptions)
      const vehicles: Vehicle[] = (data.vehicles || [])
        .filter(v => {
          if (userLoc) {
            return validPlates.has(v.plateNumber?.trim().toUpperCase());
          }
          return true;
        })
        .map((v) => ({
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
      const data = await dispatchService.getAll(
        undefined, undefined, undefined, undefined, undefined,
        PAGE_SIZE,
        0
      );
      // Filter out cancelled records
      const activeRecords = data.filter(r => r.currentStatus !== 'cancelled');
      setRecords(activeRecords);
      setOffset(0);
      setHasMore(data.length >= PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load records:", error);
      toast.error("Không thể tải danh sách điều độ");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setIsLoading(true);
    try {
      const data = await dispatchService.getAll(
        undefined, undefined, undefined, undefined, undefined,
        PAGE_SIZE,
        nextOffset
      );
      // Filter out cancelled records
      const activeRecords = data.filter(r => r.currentStatus !== 'cancelled');
      setRecords([...records, ...activeRecords]);
      setOffset(nextOffset);
      setHasMore(data.length >= PAGE_SIZE);
    } catch (error) {
      console.error("Failed to load more records:", error);
      toast.error("Không thể tải thêm danh sách");
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

  const getShiftIdFromCurrentShift = (): string | undefined => {
    const { currentShift, shifts } = useUIStore.getState();
    if (!currentShift || currentShift === '<Trống>') return undefined;
    if (shifts.length === 0) return undefined;
    const match = currentShift.match(/^(.+?)\s*\(/);
    const shiftName = match ? match[1].trim() : undefined;
    if (!shiftName) return undefined;
    return shifts.find(s => s.name === shiftName)?.id;
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

  const handleRevert = async (record: DispatchRecord) => {
    if (window.confirm(`Chuyển xe ${record.vehiclePlateNumber} về trạng thái trước?`)) {
      try {
        await dispatchService.revertStatus(record.id);
        toast.success("Đã chuyển về trạng thái trước");
        loadRecords();
      } catch (error: any) {
        toast.error(error.response?.data?.error || "Không thể chuyển về trạng thái trước");
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
    const userLoc = currentUser?.benPhuTrachName?.trim().toLowerCase();

    return records
      .filter((record) => {
        if (userLoc) {
          let departure = (record.departureStation || "").trim().toLowerCase();
          let arrival = (record.arrivalStation || "").trim().toLowerCase();
          
          if (!departure && !arrival && record.routeId) {
            const routeData = routesMap.get(record.routeId);
            if (routeData) {
              departure = routeData.start;
              arrival = routeData.end;
            }
          }

          const matchesLoc = departure === userLoc || arrival === userLoc;
          const enteredByUser = record.entryBy === currentUser?.id || record.entryBy === currentUser?.fullName || record.entryBy === currentUser?.username;
          
          if (!matchesLoc && !enteredByUser) {
            return false;
          }
        }

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
  }, [records, searchQuery, getDisplayStatus, currentUser?.benPhuTrachName, currentUser?.id, currentUser?.fullName, currentUser?.username, routesMap]);

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
        // Buýt / TCD từ quanly-data: hasValidBadge = có ngày hết hạn và chưa hết hạn.
        // Một số phù hiệu buýt thiếu expiry trên DB → chỉ hasBadge; vẫn cho vào danh sách vào bến.
        if (dialogType === "entry") {
          if (!v.hasValidBadge && !v.hasBadge) return false;
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
    loadMore,
    hasMore,
    handleDelete,
    handleEdit,
    handleAction,
    handleOpenPermitReadOnly,
    handleRecordExit,
    handleRevert,
    getDisplayStatus,
    getRecordsByStatus,
    isMonthlyPaymentVehicle,
    getVehicleStatus,
  };
}
