import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { scheduleService } from "@/services/schedule.service";
import { dispatchService } from "@/services/dispatch.service";
import { vehicleService } from "@/services/vehicle.service";
import { type VehicleBadge } from "@/services/vehicle-badge.service";
import { serviceChargeService } from "@/services/service-charge.service";
import { quanlyDataService, type QuanLyVehicle, type QuanLyRoute, type QuanLyOperator, type QuanLyBadge } from "@/services/quanly-data.service";
import { relaxPermitEligibleChecks } from "@/config/dispatch-dev-flags";
import { getApiUrl } from "@/lib/api";
import axios from "axios";
import { useUIStore } from "@/store/ui.store";
import type { Shift } from "@/services/shift.service";
import {
  type DispatchRecord,
  type Route,
  type Schedule,
  type Vehicle,
  type Driver,
  type ServiceCharge,
  type Operator,
  type VehicleDocuments,
} from "@/types";

type DocumentStatus = 'valid' | 'expired' | 'expiring_soon' | 'missing';

interface DocumentCheckResult {
  name: string;
  status: DocumentStatus;
  expiryDate?: string;
  daysRemaining?: number;
}

export function useCapPhepDialog(record: DispatchRecord, onClose: () => void, onSuccess?: () => void) {
  const [permitType, setPermitType] = useState("fixed");
  const [transportOrderCode, setTransportOrderCode] = useState(record.transportOrderCode || "");
  const [replacementVehicleId, setReplacementVehicleId] = useState("");
  const [seatCount, setSeatCount] = useState(() => record.seatCount?.toString() || "");
  const [bedCount, setBedCount] = useState("0");
  const [hhTicketCount, setHhTicketCount] = useState("0");
  const [hhPercentage, setHhPercentage] = useState("0");
  const [routeId, setRouteId] = useState(record.routeId || "");
  const [scheduleId, setScheduleId] = useState(record.scheduleId || "");
  const [departureTime, setDepartureTime] = useState("");
  const [departureDate, setDepartureDate] = useState(
    record.plannedDepartureTime
      ? format(new Date(record.plannedDepartureTime), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
  );

  const [routes, setRoutes] = useState<Route[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [vehicleBadges, setVehicleBadges] = useState<VehicleBadge[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [operatorNameFromVehicle, setOperatorNameFromVehicle] = useState<string>("");
  // Vehicle documents loaded from vehicleService.getById() for document expiry checks
  const [vehicleDocuments, setVehicleDocuments] = useState<VehicleDocuments | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [serviceDetailsExpanded, setServiceDetailsExpanded] = useState(true);
  const [showZeroAmountConfirm, setShowZeroAmountConfirm] = useState(false);
  const [dailyTripCounts, setDailyTripCounts] = useState<Record<number, number>>({});
  const [tripCountsLoaded, setTripCountsLoaded] = useState(false);
  const schedulesCacheRef = useRef<Record<string, Schedule[]>>({});
  const [cachedDispatchRecords, setCachedDispatchRecords] = useState<DispatchRecord[] | null>(null);
  const [scheduleWarning, setScheduleWarning] = useState("");
  const [tripLimitWarning, setTripLimitWarning] = useState("");
  const [tripLimitData, setTripLimitData] = useState<{ maxTrips: number; currentTrips: number } | null>(null);

  const { currentShift } = useUIStore();

  // Prevent multiple initializations
  const isInitializedRef = useRef(false);
  const routeAutoFilledRef = useRef(false);
  const lastSeatVehicleIdRef = useRef<string | null>(null);
  const recordRef = useRef(record);
  recordRef.current = record;

  const loadSchedules = useCallback(
    async (rid: string, opId?: string) => {
      try {
        const cacheKey = opId ? `${rid}_${opId}` : rid;
        const cached = schedulesCacheRef.current[cacheKey];
        if (cached) {
          setSchedules(cached);
          return;
        }
        const dbData = await scheduleService.getAll(rid, opId, true, "Đi");
        const list = Array.isArray(dbData) ? dbData : [];
        setSchedules(list);
        schedulesCacheRef.current[cacheKey] = list;
      } catch (error) {
        console.error("Failed to load schedules:", error);
        setSchedules([]);
      }
    },
    [],
  );

  const calculateTotal = useCallback(() => {
    const total = serviceCharges.reduce((sum, charge) => sum + charge.totalAmount, 0);
    setTotalAmount(total);
  }, [serviceCharges]);

  const getShiftIdFromCurrentShift = useCallback((): string | undefined => {
    if (!currentShift || currentShift === '<Trống>') return undefined;
    const currentShifts = useUIStore.getState().shifts;
    if (currentShifts.length === 0) return undefined;
    const match = currentShift.match(/^(.+?)\s*\(/);
    if (!match) return undefined;
    const shiftName = match[1].trim();
    const foundShift = currentShifts.find((shift: Shift) => shift.name === shiftName);
    return foundShift?.id;
  }, [currentShift]);

  const loadDailyTripCounts = useCallback(async () => {
    try {
      if (!departureDate) {
        setDailyTripCounts({});
        return;
      }

      const monthDate = new Date(departureDate);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      let dispatchRecords = cachedDispatchRecords;
      if (!dispatchRecords) {
        dispatchRecords = await dispatchService.getAll();
        setCachedDispatchRecords(dispatchRecords);
      }

      const counts: Record<number, number> = {};
      const vehiclesByDay: Record<number, Set<string>> = {};

      dispatchRecords.forEach((dispatchRecord) => {
        const recordDate = dispatchRecord.plannedDepartureTime
          ? new Date(dispatchRecord.plannedDepartureTime)
          : dispatchRecord.entryTime
          ? new Date(dispatchRecord.entryTime)
          : null;

        if (recordDate && recordDate >= monthStart && recordDate <= monthEnd) {
          const day = recordDate.getDate();
          if (!vehiclesByDay[day]) vehiclesByDay[day] = new Set();
          if (dispatchRecord.vehicleId) vehiclesByDay[day].add(dispatchRecord.vehicleId);
        }
      });

      Object.keys(vehiclesByDay).forEach((dayStr) => {
        const day = parseInt(dayStr, 10);
        counts[day] = vehiclesByDay[day].size;
      });

      setDailyTripCounts(counts);
    } catch (error) {
      console.error("Failed to load daily trip counts:", error);
      setDailyTripCounts({});
    }
  }, [departureDate, cachedDispatchRecords]);

  // Load vehicle documents (registration, inspection, insurance expiry dates)
  const loadVehicleDocuments = useCallback(async (vehicleId: string) => {
    try {
      const vehicle = await vehicleService.getById(vehicleId);
      setVehicleDocuments(vehicle.documents || null);
    } catch (error) {
      console.error("Failed to load vehicle documents:", error);
    }
  }, []);


  // Helper: Get routes from vehicle badges for auto-fill
  const getBadgeRoutesForVehicle = useCallback((vehiclePlateNumber: string) => {
    if (!vehicleBadges.length || !vehiclePlateNumber || !routes.length) return [];
    const normalizedPlate = normalizePlate(vehiclePlateNumber);

    const matchingBadges = vehicleBadges.filter(badge =>
      badge.license_plate_sheet &&
      normalizePlate(badge.license_plate_sheet) === normalizedPlate &&
      (badge.route_id || badge.route_code)
    );

    if (matchingBadges.length === 0) return [];

    const routeById = new Map<string, { routeId: string; routeCode: string; routeName: string; badgeNumber: string; badgeType: string; expiryDate: string; isExpired: boolean }>();
    for (const badge of matchingBadges) {
      const route =
        (badge.route_id
          ? routes.find((r: Route) => r.id === badge.route_id)
          : undefined) ||
        (badge.route_code
          ? routes.find((r: Route) => r.routeCode === badge.route_code)
          : undefined);
      if (!route) continue;

      const isExpired = badge.expiry_date
        ? new Date(badge.expiry_date) < new Date()
        : false;

      const candidate = {
        routeId: route.id,
        routeCode: badge.route_code || route.routeCode || '',
        routeName: route.routeName || badge.route_name || '',
        badgeNumber: badge.badge_number,
        badgeType: badge.badge_type,
        expiryDate: badge.expiry_date,
        isExpired,
      };

      const existing = routeById.get(route.id);
      if (!existing || (existing.isExpired && !candidate.isExpired)) {
        routeById.set(route.id, candidate);
      }
    }

    return Array.from(routeById.values());
  }, [vehicleBadges, routes]);

  const loadInitialData = useCallback(async () => {
    const record = recordRef.current;
    try {
      // Use unified endpoint - 1 request instead of 4, with frontend caching
      // Add timeout to prevent infinite loading state
      const timeout = (ms: number) => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), ms)
      );

      const dataPromise = Promise.all([
        quanlyDataService.getAll(), // Use fast in-memory cache
        record.routeId ? scheduleService.getAll(record.routeId, undefined, true) : Promise.resolve([]),
        record.id ? serviceChargeService.getAll(record.id) : Promise.resolve([]),
      ]);

      // Race between data fetch and 30 second timeout
      const [quanlyData, schedulesData, chargesData] = await Promise.race([
        dataPromise,
        timeout(30000).then(() => { throw new Error('Timeout'); }),
      ]) as [Awaited<ReturnType<typeof quanlyDataService.getAll>>, Schedule[], ServiceCharge[]];

      // Map routes from quanly-data format to dropdown format
      const routesForDropdown = (quanlyData.routes || []).map((r: QuanLyRoute) => ({
        id: r.id,
        routeName: r.name || `${r.startPoint} - ${r.endPoint}`,
        routeCode: r.code,
        routeType: r.routeType || '',
        distanceKm: r.distance ? parseFloat(r.distance) : undefined,
        destinationId: null,
        destination: { id: null, name: r.endPoint, code: '' },
      }));

      // Map vehicles from quanly-data format
      const vehiclesData = (quanlyData.vehicles || []).map((v: QuanLyVehicle) => ({
        id: v.id,
        plateNumber: v.plateNumber,
        seatCapacity: v.seatCapacity || 0,
        bedCapacity: v.bedCapacity || 0,
        operatorName: v.operatorName,
        vehicleType: v.vehicleType,
        isActive: v.isActive,
        source: v.source,
        operatorId: v.operatorId || null,
        operator: { id: v.operatorId || null, name: v.operatorName, code: '' },
      })) as unknown as Vehicle[];

      // Map operators from quanly-data format
      const operatorsData = (quanlyData.operators || []).map((o: QuanLyOperator) => ({
        id: o.id,
        name: o.name,
        province: o.province,
        phone: o.phone,
        email: o.email,
        address: o.address,
        representativeName: o.representativeName,
        isActive: o.isActive,
      })) as Operator[];

      // Map badges from quanly-data format
      const badgesData = (quanlyData.badges || []).map((b: QuanLyBadge) => ({
        id: b.id,
        badge_number: b.badge_number,
        license_plate_sheet: b.license_plate_sheet,
        badge_type: b.badge_type,
        badge_color: b.badge_color,
        issue_date: b.issue_date,
        expiry_date: b.expiry_date,
        status: b.status,
        vehicle_id: b.id,
        route_id: b.route_id || '',
        route_code: b.route_code || '',
        route_name: b.route_name || '',
      })) as VehicleBadge[];

      setRoutes(routesForDropdown as unknown as Route[]);
      setOperators(operatorsData);
      setVehicles(vehiclesData);
      setVehicleBadges(badgesData);

      if (record.routeId) {
        setRouteId(record.routeId);
        routeAutoFilledRef.current = true;
        setSchedules(schedulesData);
        if (record.scheduleId) setScheduleId(record.scheduleId);
      }

      if (record.id && chargesData) setServiceCharges(chargesData);

      let vehicleFound = false;
      if (record.vehicleId && vehiclesData.length > 0) {
        const vehicle = vehiclesData.find((v: Vehicle) => v.id === record.vehicleId);
        if (vehicle) {
          vehicleFound = true;
          setSelectedVehicle(vehicle);
          if ((!record.seatCount || record.seatCount === 0) && vehicle.seatCapacity) {
            setSeatCount(vehicle.seatCapacity.toString());
          }
          if (
            vehicle.bedCapacity !== undefined &&
            vehicle.bedCapacity !== null &&
            vehicle.bedCapacity > 0
          ) {
            setBedCount(vehicle.bedCapacity.toString());
          }
          if (vehicle.operatorId) {
            setSelectedOperatorId(vehicle.operatorId);
            if (record.driver) setDrivers([record.driver]);
          } else {
            // For legacy vehicles, try to match operator by name
            const opName = vehicle.operatorName || vehicle.operator?.name;
            if (opName && operatorsData.length > 0) {
              const normalizedOpName = opName.trim().toLowerCase();
              const matchedOp = operatorsData.find((op: Operator) => 
                op.name?.trim().toLowerCase() === normalizedOpName ||
                op.id?.includes(normalizedOpName.substring(0, 10))
              );
              if (matchedOp) {
                setSelectedOperatorId(matchedOp.id);
              }
            }
          }
          if (vehicle.operatorName) setOperatorNameFromVehicle(vehicle.operatorName);
          else if (vehicle.operator?.name) setOperatorNameFromVehicle(vehicle.operator.name);
        }
      }

      void vehicleFound; // suppress unused variable warning

      {
        const r = recordRef.current;
        if (r.seatCount && r.seatCount > 0) setSeatCount(r.seatCount.toString());
      }
    } catch (error) {
      console.error("Failed to load initial data:", error);
      toast.error("Không thể tải dữ liệu. Vui lòng thử lại.");
    }
  }, []);

  const normalizePlate = (plate: string): string => plate.replace(/[.\-\s]/g, '').toUpperCase();

  const getMinutesFromTime = (isoString: string | undefined): number | null => {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  };

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Circular time difference (handles midnight wraparound)
  const timeDiffMinutes = (a: number, b: number): number => {
    const diff = Math.abs(a - b);
    return Math.min(diff, 1440 - diff);
  };

  const getMatchingBadge = useCallback((): VehicleBadge | undefined => {
    // Use record.vehiclePlateNumber as primary source (read-only, from database)
    const plateNumber = record.vehiclePlateNumber || selectedVehicle?.plateNumber;
    if (!plateNumber || !vehicleBadges.length) return undefined;
    const normalizedPlate = normalizePlate(plateNumber);
    return vehicleBadges.find(badge =>
      badge.license_plate_sheet && normalizePlate(badge.license_plate_sheet) === normalizedPlate
    );
  }, [record.vehiclePlateNumber, selectedVehicle, vehicleBadges]);

  /** Nhãn hiển thị cạnh biển số: Buýt / Tuyến cố định (theo phù hiệu GTVT). */
  const plateBadgeKindLabel = useMemo((): string | null => {
    const plate = record.vehiclePlateNumber?.trim();
    if (!plate || !vehicleBadges.length) return null;
    const np = normalizePlate(plate);
    const types = new Set<string>();
    for (const b of vehicleBadges) {
      if (!b.license_plate_sheet || normalizePlate(b.license_plate_sheet) !== np) continue;
      const bt = (b.badge_type || "").trim();
      if (bt) types.add(bt);
    }
    if (types.size === 0) return null;
    const list = [...types];
    const isBus = (s: string) => /buýt|buyt|bus/i.test(s.toLowerCase());
    const isFixed = (s: string) =>
      /tuyến cố định|tuyen co dinh|cố định|co dinh/i.test(s.toLowerCase());
    let hasBus = false;
    let hasFixed = false;
    for (const s of list) {
      if (isBus(s)) hasBus = true;
      if (isFixed(s)) hasFixed = true;
    }
    if (hasBus && hasFixed) return "Buýt · Tuyến cố định";
    if (hasBus) return "Buýt";
    if (hasFixed) return "Tuyến cố định";
    return list.join(", ");
  }, [record.vehiclePlateNumber, vehicleBadges]);

  const getDocumentStatus = (expiryDate?: string): { status: DocumentStatus; daysRemaining?: number } => {
    if (!expiryDate) return { status: 'missing' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) return { status: 'expired', daysRemaining };
    if (daysRemaining <= 30) return { status: 'expiring_soon', daysRemaining };
    return { status: 'valid', daysRemaining };
  };

  const getDocumentsCheckResults = useCallback((): DocumentCheckResult[] => {
    const matchingBadge = getMatchingBadge();
    const results: DocumentCheckResult[] = [];

    // Phù hiệu xe - from vehicle badge data
    if (matchingBadge) {
      const { status, daysRemaining } = getDocumentStatus(matchingBadge.expiry_date);
      results.push({ name: 'Phù hiệu xe', status, expiryDate: matchingBadge.expiry_date, daysRemaining });
    } else {
      results.push({ name: 'Phù hiệu xe', status: 'valid', expiryDate: undefined, daysRemaining: 999 });
    }

    // Đăng ký xe - from vehicle documents
    const regExpiry = vehicleDocuments?.registration?.expiryDate;
    const regCheck = getDocumentStatus(regExpiry);
    results.push({ name: 'Đăng ký xe', status: regCheck.status, expiryDate: regExpiry, daysRemaining: regCheck.daysRemaining });

    // Đăng kiểm xe - from vehicle documents
    const inspExpiry = vehicleDocuments?.inspection?.expiryDate;
    const inspCheck = getDocumentStatus(inspExpiry);
    results.push({ name: 'Đăng kiểm xe', status: inspCheck.status, expiryDate: inspExpiry, daysRemaining: inspCheck.daysRemaining });

    // Bảo hiểm xe - from vehicle documents
    const insExpiry = vehicleDocuments?.insurance?.expiryDate;
    const insCheck = getDocumentStatus(insExpiry);
    results.push({ name: 'Bảo hiểm xe', status: insCheck.status, expiryDate: insExpiry, daysRemaining: insCheck.daysRemaining });

    return results;
  }, [getMatchingBadge, vehicleDocuments]);

  const checkAllDocumentsValid = useCallback((): boolean => {
    const results = getDocumentsCheckResults();
    return results.every(r => r.status === 'valid' || r.status === 'expiring_soon');
  }, [getDocumentsCheckResults]);

  const getOverallStatus = useCallback((): { isValid: boolean; validCount: number; totalCount: number } => {
    const results = getDocumentsCheckResults();
    const validCount = results.filter(r => r.status === 'valid' || r.status === 'expiring_soon').length;
    return { isValid: validCount === results.length, validCount, totalCount: results.length };
  }, [getDocumentsCheckResults]);

  const submitPermit = useCallback(async () => {
    setIsLoading(true);
    try {
      const plannedDepartureTime = departureTime
        ? new Date(`${departureDate}T${departureTime}`).toISOString()
        : record.plannedDepartureTime || new Date().toISOString();

      const permitShiftId = getShiftIdFromCurrentShift();

      const parsedSeats = parseInt(seatCount, 10);
      const seatCountForApi =
        Number.isFinite(parsedSeats) && parsedSeats > 0
          ? parsedSeats
          : record.seatCount && record.seatCount > 0
            ? record.seatCount
            : 1;

      await dispatchService.issuePermit(record.id, {
        transportOrderCode: transportOrderCode?.trim() || undefined,
        plannedDepartureTime,
        seatCount: seatCountForApi,
        permitStatus: "approved",
        routeId: routeId || undefined,
        scheduleId: scheduleId || undefined,
        replacementVehicleId: replacementVehicleId || undefined,
        permitShiftId,
      });

      toast.success("Cấp phép lên nốt thành công!");
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      console.error("Failed to issue permit:", error);
      if (axios.isAxiosError(error) && !error.response) {
        toast.error(
          `Không kết nối được API (${getApiUrl()}). Bật backend (vd. npm run dev:server), đúng APP_PORT; hoặc sửa VITE_API_URL cho khớp (mặc định cổng 3000).`,
          { autoClose: 8000 },
        );
        return;
      }
      const axiosError = error as { response?: { data?: { code?: string; error?: string } } };
      const errorData = axiosError.response?.data;
      if (errorData?.code === 'TRIP_LIMIT_EXCEEDED') {
        toast.error(errorData.error || "Đã đạt giới hạn chuyến trong ngày");
        // Refresh trip limit data
        if (routeId && departureDate && record.vehiclePlateNumber) {
          scheduleService.checkTripLimit(routeId, record.vehiclePlateNumber, departureDate)
            .then(result => {
              setTripLimitData({ maxTrips: result.maxTrips, currentTrips: result.currentTrips });
              if (!result.canIssue) {
                setTripLimitWarning(`Xe đã đạt giới hạn ${result.currentTrips}/${result.maxTrips} chuyến trong ngày.`);
              }
            })
            .catch(() => {});
        }
      } else if (errorData?.code === '23505' || errorData?.error?.includes('đã tồn tại') || errorData?.error?.includes('duplicate key')) {
        toast.error(`Mã lệnh vận chuyển "${transportOrderCode}" đã tồn tại. Vui lòng chọn mã khác.`);
      } else {
        toast.error(errorData?.error || "Không thể cấp phép. Vui lòng thử lại sau.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [departureTime, departureDate, record, transportOrderCode, seatCount, routeId, scheduleId, replacementVehicleId, getShiftIdFromCurrentShift, onSuccess, onClose]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const validatePermitFields = useCallback((): { isValid: boolean; errors: string[]; fieldErrors: Record<string, string> } => {
    const errors: string[] = [];
    const fieldErrors: Record<string, string> = {};
    
    if (!transportOrderCode?.trim()) {
      errors.push("Mã lệnh vận chuyển");
      fieldErrors.transportOrderCode = "Vui lòng nhập mã lệnh vận chuyển";
    }
    if (!routeId) {
      errors.push("Tuyến đường");
      fieldErrors.routeId = "Vui lòng chọn tuyến đường";
    }
    if (!departureDate) {
      errors.push("Ngày xuất bến");
      fieldErrors.departureDate = "Vui lòng chọn ngày xuất bến";
    }
    if (!scheduleId && !departureTime) {
      errors.push("Biểu đồ giờ hoặc Giờ xuất bến");
      fieldErrors.departureTime = "Vui lòng chọn biểu đồ giờ hoặc nhập giờ xuất bến";
    }
    if (!seatCount || parseInt(seatCount) <= 0) {
      errors.push("Số ghế (phải lớn hơn 0)");
      fieldErrors.seatCount = "Số ghế phải lớn hơn 0";
    }
    if (scheduleWarning) {
      errors.push("Ngày không hợp lệ theo biểu đồ");
      fieldErrors.scheduleId = scheduleWarning;
    }
    if (tripLimitWarning) {
      errors.push("Đã đạt giới hạn chuyến trong ngày");
      fieldErrors.tripLimit = tripLimitWarning;
    }

    return { isValid: errors.length === 0, errors, fieldErrors };
  }, [transportOrderCode, routeId, departureDate, scheduleId, departureTime, seatCount, scheduleWarning, tripLimitWarning]);

  const handleEligible = useCallback(async () => {
    setHasAttemptedSubmit(true);

    if (!relaxPermitEligibleChecks) {
      // Validate document conditions - block permit if documents are invalid
      if (!checkAllDocumentsValid()) {
        const results = getDocumentsCheckResults();
        const invalidDocs = results
          .filter(r => r.status === 'expired' || r.status === 'missing')
          .map(r => r.name);
        const errorMessage = `Xe không đủ điều kiện. Các giấy tờ sau không hợp lệ:\n• ${invalidDocs.join('\n• ')}\n\nVui lòng nhấn "Không đủ ĐK" để ghi nhận lý do.`;
        toast.error(errorMessage, {
          autoClose: 7000,
          style: { whiteSpace: 'pre-line' }
        });
        return;
      }

      const { isValid, errors, fieldErrors } = validatePermitFields();
      setValidationErrors(fieldErrors);

      if (!isValid) {
        const errorMessage = errors.length === 1
          ? `Vui lòng điền: ${errors[0]}`
          : `Vui lòng điền các trường sau:\n• ${errors.join("\n• ")}`;
        toast.error(errorMessage, {
          autoClose: 5000,
          style: { whiteSpace: 'pre-line' }
        });
        return;
      }

      if (totalAmount === 0) {
        setShowZeroAmountConfirm(true);
        return;
      }
    } else {
      setValidationErrors({});
    }

    await submitPermit();
  }, [validatePermitFields, totalAmount, submitPermit, checkAllDocumentsValid, getDocumentsCheckResults]);

  // Clear validation error when field value changes
  useEffect(() => {
    if (hasAttemptedSubmit) {
      const { fieldErrors } = validatePermitFields();
      setValidationErrors(fieldErrors);
    }
  }, [transportOrderCode, routeId, departureDate, scheduleId, departureTime, seatCount, hasAttemptedSubmit, validatePermitFields]);

  const handleNotEligibleConfirm = useCallback(async (
    selectedReasons: string[],
    _options: { createOrder: boolean; signAndTransmit: boolean; printDisplay: boolean }
  ) => {
    setIsLoading(true);
    try {
      const reasonDescriptions: Record<string, string> = {
        driver_license_insufficient: "Không có hoặc có nhưng không đủ số lượng giấy phép lái xe so với số lái xe ghi trên lệnh vận chuyển",
        driver_license_expired: "Giấy phép lái xe đã hết hạn hoặc sử dụng giấy phép lái xe giả",
        driver_license_class_mismatch: "Hạng giấy phép lái xe không phù hợp với các loại xe được phép điều khiển",
        driver_info_mismatch: "Thông tin của lái xe không đúng với thông tin được ghi trên lệnh vận chuyển",
        driver_alcohol: "Lái xe sử dụng rượu bia",
        driver_drugs: "Lái xe sử dụng chất ma tuý",
      };

      const rejectionReason = selectedReasons.map((id) => reasonDescriptions[id] || id).join("; ");
      const plannedDepartureTime = departureTime && departureDate
        ? new Date(`${departureDate}T${departureTime}`).toISOString()
        : record.plannedDepartureTime || new Date().toISOString();

      const permitShiftId = getShiftIdFromCurrentShift();

      await dispatchService.issuePermit(record.id, {
        transportOrderCode: transportOrderCode || undefined,
        plannedDepartureTime,
        seatCount: parseInt(seatCount) || 0,
        permitStatus: "rejected",
        rejectionReason,
        routeId: routeId || undefined,
        scheduleId: scheduleId || undefined,
        replacementVehicleId: replacementVehicleId || undefined,
        permitShiftId,
      });

      toast.success("Cấp phép thành công!");
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      console.error("Failed to issue permit:", error);
      const axiosError = error as { response?: { data?: { code?: string; error?: string } } };
      const errorData = axiosError.response?.data;
      if (errorData?.code === '23505' || errorData?.error?.includes('đã tồn tại') || errorData?.error?.includes('duplicate key')) {
        toast.error(`Mã lệnh vận chuyển "${transportOrderCode}" đã tồn tại. Vui lòng chọn mã khác.`);
      } else {
        toast.error(errorData?.error || "Không thể cấp phép. Vui lòng thử lại sau.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [departureTime, departureDate, record, transportOrderCode, seatCount, routeId, scheduleId, replacementVehicleId, getShiftIdFromCurrentShift, onSuccess, onClose]);

  const handleDocumentDialogSuccess = useCallback(() => {
    if (record.vehicleId) {
      loadInitialData();
      // Reload vehicle documents so check cards reflect updated expiry dates
      loadVehicleDocuments(record.vehicleId);
    }
  }, [record.vehicleId, loadInitialData, loadVehicleDocuments]);

  const handleAddServiceSuccess = useCallback(() => {
    if (record.id) {
      serviceChargeService.getAll(record.id).then(setServiceCharges);
      loadDailyTripCounts();
    }
  }, [record.id, loadDailyTripCounts]);

  const handleAddDriverSuccess = useCallback((driver: Driver) => {
    if (!drivers.find((d) => d.id === driver.id)) {
      setDrivers([...drivers, driver]);
    }
  }, [drivers]);

  // Effects - Load initial data only once
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const init = async () => {
      setIsInitialLoading(true);
      try {
        await loadInitialData();
        // Load vehicle documents for expiry date checks (registration, inspection, insurance)
        if (record.vehicleId) loadVehicleDocuments(record.vehicleId);
      } finally {
        setIsInitialLoading(false);
      }
    };
    init();
    const { shifts: currentShifts, loadShifts } = useUIStore.getState();
    if (currentShifts.length === 0) loadShifts();
  }, []); // Empty deps - run only once on mount

  useEffect(() => {
    if (routeId) loadSchedules(routeId, selectedOperatorId || undefined);
  }, [routeId, selectedOperatorId, loadSchedules]);

  useEffect(() => {
    if (!scheduleId || !departureDate) {
      setScheduleWarning("");
      return;
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      scheduleId.trim(),
    );
    if (!isUuid) {
      setScheduleWarning("");
      return;
    }
    let cancelled = false;
    scheduleService.validateDay(scheduleId, departureDate)
      .then(result => {
        if (!cancelled) {
          setScheduleWarning(result.valid ? "" : (result.message || "Chuyến xe không được khai thác ngày này"));
        }
      })
      .catch(() => {
        if (!cancelled) setScheduleWarning("");
      });
    return () => { cancelled = true; };
  }, [scheduleId, departureDate]);

  // Trip limit check: when route + date changes
  useEffect(() => {
    if (relaxPermitEligibleChecks) {
      setTripLimitWarning("");
      setTripLimitData(null);
      return;
    }
    if (!routeId || !departureDate || !record.vehiclePlateNumber) {
      setTripLimitWarning("");
      setTripLimitData(null);
      return;
    }

    let cancelled = false;
    scheduleService.checkTripLimit(routeId, record.vehiclePlateNumber, departureDate)
      .then(result => {
        if (cancelled) return;
        setTripLimitData({ maxTrips: result.maxTrips, currentTrips: result.currentTrips });
        if (!result.canIssue) {
          setTripLimitWarning(
            `Xe đã đạt giới hạn ${result.currentTrips}/${result.maxTrips} chuyến trong ngày. Không thể cấp thêm phép.`
          );
        } else {
          setTripLimitWarning("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTripLimitWarning("");
          setTripLimitData(null);
        }
      });
    return () => { cancelled = true; };
  }, [routeId, departureDate, record.vehiclePlateNumber, relaxPermitEligibleChecks]);

  useEffect(() => {
    calculateTotal();
  }, [calculateTotal]);

  useEffect(() => {
    if (departureDate && !tripCountsLoaded) {
      loadDailyTripCounts();
      setTripCountsLoaded(true);
    }
  }, [departureDate, tripCountsLoaded, loadDailyTripCounts]);

  useEffect(() => {
    if (!selectedVehicle) return;
    if (record.seatCount && record.seatCount > 0) {
      setSeatCount(record.seatCount.toString());
      lastSeatVehicleIdRef.current = selectedVehicle.id;
      if (
        selectedVehicle.bedCapacity !== undefined &&
        selectedVehicle.bedCapacity !== null &&
        selectedVehicle.bedCapacity > 0
      ) {
        setBedCount(selectedVehicle.bedCapacity.toString());
      }
      return;
    }
    const vid = selectedVehicle.id;
    const vehicleChanged =
      lastSeatVehicleIdRef.current !== null && lastSeatVehicleIdRef.current !== vid;
    lastSeatVehicleIdRef.current = vid;

    const cap = selectedVehicle.seatCapacity;
    if (cap !== undefined && cap !== null && cap > 0) {
      setSeatCount((prev) => {
        const t = (prev || "").trim();
        if (!vehicleChanged && t !== "") return prev;
        return String(cap);
      });
    }
    if (
      selectedVehicle.bedCapacity !== undefined &&
      selectedVehicle.bedCapacity !== null &&
      selectedVehicle.bedCapacity > 0
    ) {
      setBedCount(selectedVehicle.bedCapacity.toString());
    }
  }, [selectedVehicle, record.seatCount]);

  // Auto-fill routeId: only from active badge routes (no fallback to expired badges or dispatch records)
  useEffect(() => {
    if (routeAutoFilledRef.current) return;
    if (!record.vehiclePlateNumber) return;

    const badgeRoutes = getBadgeRoutesForVehicle(record.vehiclePlateNumber);
    // Only use active (non-expired) badges
    const activeBadgeRoutes = badgeRoutes.filter(r => !r.isExpired);
    if (activeBadgeRoutes.length === 0) return;

    if (activeBadgeRoutes.length === 1) {
      routeAutoFilledRef.current = true;
      setRouteId(activeBadgeRoutes[0].routeId);
      return;
    }

    // 2+ active routes: pick route with closest departureTime to entryTime
    let cancelled = false;
    (async () => {
      const entryMinutes = getMinutesFromTime(record.entryTime);
      if (entryMinutes === null) {
        routeAutoFilledRef.current = true;
        setRouteId(activeBadgeRoutes[0].routeId);
        return;
      }
      let bestRouteId = activeBadgeRoutes[0].routeId;
      let bestDiff = Infinity;

      for (const candidate of activeBadgeRoutes) {
        if (cancelled) return;
        const scheds = await scheduleService.getAll(candidate.routeId, undefined, true, 'Đi');
        if (cancelled) return;
        for (const s of scheds) {
          const schedMinutes = parseTimeToMinutes(s.departureTime);
          const diff = timeDiffMinutes(schedMinutes, entryMinutes);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestRouteId = candidate.routeId;
          }
        }
      }

      if (!cancelled) {
        routeAutoFilledRef.current = true;
        setRouteId(bestRouteId);
      }
    })();
    return () => { cancelled = true; };
  }, [record.vehiclePlateNumber, record.entryTime, vehicleBadges, routes, getBadgeRoutesForVehicle]);

  // Auto-fill scheduleId: pick schedule closest to entryTime
  useEffect(() => {
    if (scheduleId || schedules.length === 0 || !record.entryTime) return;
    if (!routeAutoFilledRef.current) return;

    const entryMinutes = getMinutesFromTime(record.entryTime);
    if (entryMinutes === null) return;

    let closest = schedules[0];
    let minDiff = Infinity;

    for (const s of schedules) {
      const schedMinutes = parseTimeToMinutes(s.departureTime);
      const diff = timeDiffMinutes(schedMinutes, entryMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    }

    setScheduleId(closest.id);
  }, [schedules, record.entryTime, scheduleId]);

  // Autofill departureTime from selected schedule
  useEffect(() => {
    if (!scheduleId) return;
    const selected = schedules.find(s => s.id === scheduleId);
    if (selected?.departureTime) {
      // Trim seconds - display HH:mm only (e.g. "06:15" instead of "06:15:00")
      setDepartureTime(selected.departureTime.slice(0, 5));
    }
  }, [scheduleId, schedules]);

  // Remap scheduleId when schedules list is replaced (match by HH:mm departureTime)
  useEffect(() => {
    if (!scheduleId) return;
    const exists = schedules.some((s) => s.id === scheduleId);
    if (exists) return;
    if (!departureTime) return;
    const dep = departureTime.trim().slice(0, 5).toUpperCase();
    const match = schedules.find(
      (s) => (s.departureTime || "").trim().slice(0, 5).toUpperCase() === dep,
    );
    if (match?.id) setScheduleId(match.id);
  }, [schedules, scheduleId, departureTime]);

  // Validation: block permit when badge route has no valid schedule
  const noValidScheduleWarning = useMemo(() => {
    if (permitType === 'temporary') return '';
    if (!record.vehiclePlateNumber) return '';

    const badgeRoutes = getBadgeRoutesForVehicle(record.vehiclePlateNumber);
    // No badge → don't block (outside badge system)
    if (badgeRoutes.length === 0) return '';

    const activeBadges = badgeRoutes.filter(r => !r.isExpired);
    if (activeBadges.length === 0) {
      return 'Tất cả phù hiệu của xe đã hết hạn';
    }

    // Route selected and has schedules → OK
    if (routeId && schedules.length > 0) return '';

    // Route selected but no schedule
    if (routeId && schedules.length === 0) {
      const route = routes.find(r => r.id === routeId);
      const routeName = route?.routeName || routeId;
      return `Tuyến "${routeName}" không có biểu đồ giờ chiều đi`;
    }

    return '';
  }, [permitType, record.vehiclePlateNumber, getBadgeRoutesForVehicle, routeId, schedules, routes]);

  const eligibleButtonDisabled = useMemo(() => {
    if (relaxPermitEligibleChecks) return isLoading;
    return isLoading || !!noValidScheduleWarning || !!tripLimitWarning;
  }, [isLoading, noValidScheduleWarning, tripLimitWarning]);

  // Compute busy vehicle plates from active dispatch records
  const busyVehiclePlates = useMemo(() => {
    if (!cachedDispatchRecords) return new Set<string>();
    const normalizeplate = (p: string) => p.replace(/[.\-\s]/g, '').toUpperCase();
    const busy = new Set<string>();
    for (const dr of cachedDispatchRecords) {
      // Xe đang bận = chưa xuất bến (departed) và chưa bị hủy (cancelled)
      if (dr.currentStatus !== 'departed' && dr.currentStatus !== 'cancelled' && dr.vehiclePlateNumber) {
        busy.add(normalizeplate(dr.vehiclePlateNumber));
      }
    }
    return busy;
  }, [cachedDispatchRecords]);

  // Vehicles with availability status for replacement vehicle dropdown
  const vehiclesWithStatus = useMemo(() => {
    const normalizeplate = (p: string) => p.replace(/[.\-\s]/g, '').toUpperCase();
    return vehicles.map(v => ({
      ...v,
      isBusy: v.plateNumber ? busyVehiclePlates.has(normalizeplate(v.plateNumber)) : false
    }));
  }, [vehicles, busyVehiclePlates]);

  return {
    // State
    permitType, setPermitType,
    transportOrderCode, setTransportOrderCode,
    replacementVehicleId, setReplacementVehicleId,
    seatCount, setSeatCount,
    bedCount, setBedCount,
    hhTicketCount, setHhTicketCount,
    hhPercentage, setHhPercentage,
    routeId, setRouteId,
    scheduleId, setScheduleId,
    departureTime, setDepartureTime,
    departureDate, setDepartureDate,
    routes, schedules, vehicleBadges, vehicles, vehiclesWithStatus, drivers, serviceCharges,
    selectedVehicle, operators, selectedOperatorId, setSelectedOperatorId,
    operatorNameFromVehicle, totalAmount, isLoading, isInitialLoading,
    serviceDetailsExpanded, setServiceDetailsExpanded,
    showZeroAmountConfirm, setShowZeroAmountConfirm,
    dailyTripCounts,
    validationErrors,
    scheduleWarning,
    noValidScheduleWarning,
    tripLimitWarning,
    tripLimitData,
    // Methods
    submitPermit, handleEligible, handleNotEligibleConfirm,
    handleDocumentDialogSuccess, handleAddServiceSuccess, handleAddDriverSuccess,
    getDocumentsCheckResults, checkAllDocumentsValid, getOverallStatus,
    getBadgeRoutesForVehicle,
    relaxPermitEligibleChecks,
    eligibleButtonDisabled,
    plateBadgeKindLabel,
  };
}
