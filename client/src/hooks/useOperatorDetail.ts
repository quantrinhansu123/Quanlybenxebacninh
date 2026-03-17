import { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { vehicleService } from "@/services/vehicle.service";
import { vehicleBadgeService, type VehicleBadge } from "@/services/vehicle-badge.service";
import { invoiceService } from "@/services/invoice.service";
import { dispatchService } from "@/services/dispatch.service";
import { appsheetClient } from "@/services/appsheet-client.service";
import { normalizeBadgeRows } from "@/services/appsheet-normalize-badges";
import { buildIdXeToPlateMap } from "@/services/appsheet-normalize-vehicles";
import { normPlate } from "@/utils/plate-utils";
import type { Vehicle, Invoice, DispatchRecord, Operator } from "@/types";

// Extended Operator type with source field
type OperatorWithSource = Operator & {
  source?: "database" | "legacy" | "google_sheets";
};
import { format, parseISO, isValid } from "date-fns";

export interface PaymentHistoryItem {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  paymentDate: string | null;
  totalAmount: number;
  source: "invoice" | "dispatch";
  vehiclePlateNumber?: string;
  routeName?: string;
}

// Extended Vehicle type for badge vehicles
interface BadgeVehicle {
  id: string;
  plateNumber: string;
  vehicleType: { id: string | null; name: string };
  seatCapacity: number;
  bedCapacity: number;
  manufactureYear: number | null;
  color: string;
  chassisNumber: string;
  engineNumber: string;
  operatorId: string | null;
  operator: { id: string | null; name: string; code: string };
  operatorName: string;
  isActive: boolean;
  notes: string;
  source: string;
  badgeNumber: string;
  badgeType: string;
  badgeExpiryDate: string;
  documents: Record<string, never>;
  province: string;
}

// Fast-path cache for AppSheet operator detail (avoid refetch on reopen)
const APPSHEET_OPERATOR_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const appsheetOperatorCache = new Map<
  string,
  { ts: number; vehicles: Vehicle[]; badges: VehicleBadge[] }
>();

export function useOperatorDetail(
  operator: OperatorWithSource | null,
  open: boolean,
  dataSource?: "filtered" | "appsheet",
) {
  const [activeTab, setActiveTab] = useState("vehicles");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [badges, setBadges] = useState<VehicleBadge[]>([]);
  const [allDispatchRecords, setAllDispatchRecords] = useState<DispatchRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paidDispatchRecords, setPaidDispatchRecords] = useState<DispatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enrichReqIdRef = useState({ id: 0 })[0];
  const appsheetOperatorIdRef = useState<{ id: string }>({ id: "" })[0];
  const appsheetBadgesRef = useState<{ badges: VehicleBadge[] }>({ badges: [] })[0];

  const enrichVehicleRefs = async (vehicleRefs: string[]) => {
    const operatorId = appsheetOperatorIdRef.id;
    if (!operatorId) return;
    const refs = Array.from(new Set(vehicleRefs.map((r) => (r || "").trim()).filter(Boolean)));
    if (refs.length === 0) return;

    const myReqId = ++enrichReqIdRef.id;

    // Mark as enriching so UI can show "Đang tải…"
    setVehicles((prev) =>
      prev.map((v) => {
        const vref = (v as any)?.metadata?.vehicleRef as string | undefined;
        if (!vref || !refs.includes(vref)) return v;
        return {
          ...v,
          metadata: { ...(v as any).metadata, enriching: true },
        } as any;
      }),
    );

    const vehicleRows: Record<string, unknown>[] = [];
    // Strategy A (fastest): "Read input rows" (works only if IDXe is key column)
    {
      const CHUNK = 200;
      for (let i = 0; i < refs.length; i += CHUNK) {
        const chunk = refs.slice(i, i + CHUNK);
        const rows = chunk.map((id) => ({ IDXe: id }));
        const res = await appsheetClient.findByName("vehicles", { rows }).catch(() => []);
        vehicleRows.push(...res);
      }
    }

    // Strategy B (fallback): Selector IN([IDXe], {"a","b",...}) when key != IDXe
    if (vehicleRows.length === 0) {
      const esc = (s: string) => s.replace(/"/g, '\\"').trim();
      const toListLiteral = (ids: string[]) =>
        `{${ids.map((id) => `"${esc(id)}"`).join(",")}}`;

      const CHUNK = 100; // keep selector length reasonable
      for (let i = 0; i < refs.length; i += CHUNK) {
        const chunk = refs.slice(i, i + CHUNK);
        const selector = `Filter(Xe, IN([IDXe], ${toListLiteral(chunk)}))`;
        const res = await appsheetClient.findByName("vehicles", { selector }).catch(() => []);
        vehicleRows.push(...res);
      }
    }

    const str = (val: unknown): string => {
      if (typeof val === "string") return val.trim();
      if (typeof val === "number" && Number.isFinite(val)) return String(val);
      return "";
    };
    const int = (val: unknown): number | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      if (typeof val === "number" && Number.isFinite(val)) return Math.floor(val);
      if (typeof val === "string") {
        const cleaned = val.replace(/[,]/g, ".").replace(/[^\d.]/g, "");
        const n = Number(cleaned);
        return Number.isFinite(n) ? Math.floor(n) : undefined;
      }
      const n = Number(val);
      return Number.isFinite(n) ? Math.floor(n) : undefined;
    };
    const pickFirst = (row: Record<string, unknown>, keys: string[]): unknown => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
      }
      return undefined;
    };

    const idXeToPlate = buildIdXeToPlateMap(vehicleRows);
    const idXeToSpecs = new Map<string, any>();
    for (const row of vehicleRows) {
      const idXe = str(row["IDXe"]);
      if (!idXe) continue;
      const seatRaw = pickFirst(row, [
        "SoCho",
        "SoChoNgoi",
        "SoChoNgoiThietKe",
        "SoChoThietKe",
        "ChoNgoi",
        "SoChoNgoi_ThietKe",
        "SoChoNgoiThucTe",
        "SoChoThucTe",
      ]);
      const bedRaw = pickFirst(row, ["SoGiuong", "Giuong", "SoGiuongNam", "SoChoNam", "ChoNam"]);
      idXeToSpecs.set(idXe, {
        seatCapacity: int(seatRaw),
        seatText: str(seatRaw) || undefined,
        bedCapacity: int(bedRaw),
        bedText: str(bedRaw) || undefined,
        vehicleCategory: str(pickFirst(row, ["LoaiPhuongTien", "LoaiXe", "LoaiPT"])) || undefined,
        color: str(pickFirst(row, ["MauSon", "MauXe", "MauSac"])) || undefined,
        province: str(pickFirst(row, ["TinhDangKyHoatDong", "TinhThanh", "Tinh", "TinhTP"])) || undefined,
      });
    }

    if (enrichReqIdRef.id !== myReqId) return;

    setVehicles((prev) => {
      const next = prev.map((v) => {
        const vref = (v as any)?.metadata?.vehicleRef as string | undefined;
        if (!vref) return v;
        const specs = idXeToSpecs.get(vref);
        if (!specs) {
          // clear enriching flag if no match
          const meta = (v as any).metadata || {};
          if (meta.enriching) return { ...v, metadata: { ...meta, enriching: false } } as any;
          return v;
        }
        const plate = idXeToPlate.get(vref) || v.plateNumber;
        const merged: any = {
          ...v,
          plateNumber: plate.startsWith("IDXe:") ? (idXeToPlate.get(vref) || plate) : plate,
          vehicleCategory: specs.vehicleCategory || (v as any).vehicleCategory,
          seatCapacity: specs.seatCapacity ?? v.seatCapacity,
          bedCapacity: specs.bedCapacity ?? v.bedCapacity,
          color: specs.color ?? v.color,
          province: specs.province ?? v.province,
          metadata: {
            ...(v as any).metadata,
            enriching: false,
            ...(specs.seatText ? { seatText: specs.seatText } : {}),
            ...(specs.bedText ? { bedText: specs.bedText } : {}),
          },
        };
        return merged as Vehicle;
      });
      appsheetOperatorCache.set(operatorId.toLowerCase(), {
        ts: Date.now(),
        vehicles: next,
        badges: appsheetBadgesRef.badges,
      });
      return next;
    });
  };

  useEffect(() => {
    if (open && operator) {
      loadData();
    }
  }, [open, operator, dataSource]);

  const loadData = async () => {
    if (!operator) return;

    setIsLoading(true);
    setError(null);
    try {
      let vehiclesData: Vehicle[] = [];
      let badgesData: VehicleBadge[] = [];

      const normalizePlateStr = (p: string) => p?.replace(/[\s.\-]/g, '').toUpperCase() || '';

      // Xe trực thuộc luôn lấy từ AppSheet khi có IDDoanhNghiep (operator.code hoặc operator.id)
      const operatorId = (operator.code || operator.id || '').trim();
      const useAppSheet = !!operatorId;
      if (useAppSheet) {
        appsheetOperatorIdRef.id = operatorId;
        // Cache hit: instant render
        const cached = appsheetOperatorCache.get(operatorId.toLowerCase());
        if (cached && (Date.now() - cached.ts) < APPSHEET_OPERATOR_CACHE_TTL_MS) {
          setVehicles(cached.vehicles);
          setBadges(cached.badges);
          vehiclesData = cached.vehicles;
          badgesData = cached.badges;
        }

        // AppSheet optimized:
        // 1) Find PHUHIEUXE rows for this operator (server-side selector)
        // 2) FAST render from PHUHIEUXE.BienSo (no Xe join yet)
        // 3) Enrich in background: fetch Xe by IDXe (BienSoXe) to fill SoCho/… (non-blocking)
        const esc = (s: string) => s.replace(/"/g, '\\"').trim();
        // TrangThai thực tế thường là "Hiệu lực"; một số view gọi là "Hoạt động"
        // Lấy cả 2 để tránh rỗng dữ liệu.
        const badgeSelector = `Filter(PHUHIEUXE, And(Lower([Ref_DonViCapPhuHieu]) = "${esc(operatorId).toLowerCase()}", Or([TrangThai] = "Hoạt động", [TrangThai] = "Hiệu lực")))`;
        const badgeRows = await appsheetClient.findByName("badges", { selector: badgeSelector }).catch(() => []);

        const normalizedBadges = normalizeBadgeRows(badgeRows);

        // Rule 1: Ref_DonViCapPhuHieu (operatorRef) = IDDoanhNghiep (operator.id)
        const operatorBadges = normalizedBadges.filter(
          (b) => b.operatorRef?.toLowerCase() === operatorId.toLowerCase(),
        );

        // Dedup by badge_number
        const seenBadge = new Set<string>();
        const uniqueBadges = operatorBadges.filter((b) => {
          if (!b.badgeNumber || seenBadge.has(b.badgeNumber)) return false;
          seenBadge.add(b.badgeNumber);
          return true;
        });

        // Convert to VehicleBadge format for setBadges (fast path: plate from PHUHIEUXE.BienSo)
        badgesData = uniqueBadges.map((b) => ({
          id: b.badgeNumber,
          badge_number: b.badgeNumber,
          badge_type: b.badgeType || "",
          license_plate_sheet: b.plateNumber,
          issuing_authority_ref: b.operatorRef || "",
          expiry_date: b.expiryDate || "",
          status: b.status || "Hiệu lực",
        })) as VehicleBadge[];
        setBadges(badgesData);
        appsheetBadgesRef.badges = badgesData;

        // Rule 2: Lấy xe nhanh từ PHUHIEUXE (dedup theo plate nếu có; fallback theo IDXe)
        const seenKeys = new Set<string>();
        const validVehicleBadges = uniqueBadges.filter((b) => {
          const key = (b.plateNumber || b.vehicleRef || "").trim().toUpperCase();
          if (!key || seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        });

        vehiclesData = validVehicleBadges.map((b) => {
          const plate = b.plateNumber || (b.vehicleRef ? `IDXe:${b.vehicleRef}` : "");
          return {
            id: b.badgeNumber,
            plateNumber: plate,
            vehicleType: { id: null, name: b.badgeType || "" },
            seatCapacity: 0,
            bedCapacity: 0,
            manufactureYear: null,
            color: "",
            chassisNumber: "",
            engineNumber: "",
            operatorId: operator.id,
            operator: { id: operator.id, name: operator.name || "", code: "" },
            operatorName: operator.name || "",
            isActive: (b.status || "Hiệu lực") !== "Thu hồi",
            notes: `Phù hiệu: ${b.badgeNumber}`,
            source: "badge",
            badgeNumber: b.badgeNumber,
            badgeType: b.badgeType,
            badgeExpiryDate: b.expiryDate || "",
            documents: {},
            metadata: {
              ...(b.vehicleRef ? { vehicleRef: b.vehicleRef } : {}),
            } as any,
            province: "",
          } as BadgeVehicle;
        }) as unknown as Vehicle[];

        // Update state immediately (fast render) + cache
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
        appsheetOperatorCache.set(operatorId.toLowerCase(), { ts: Date.now(), vehicles: vehiclesData, badges: badgesData });
      } else {
        // Database mode
        const allBadges = await vehicleBadgeService.getAll();
        const allowedBadgeTypes = ["Buýt", "Tuyến cố định"];
        const relevantBadges = allBadges.filter((b) => allowedBadgeTypes.includes(b.badge_type));
        const operatorCode = operator.code || "";
        badgesData = relevantBadges.filter((badge) => {
          if (!operatorCode) return false;
          return badge.issuing_authority_ref?.toLowerCase() === operatorCode.toLowerCase();
        });

        const seen = new Set<string>();
        badgesData = badgesData.filter((badge) => {
          const key = badge.badge_number;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setBadges(badgesData);

        const validBadges = badgesData.filter((b) => b.status === "Hiệu lực");
        const seenPlates = new Set<string>();
        const validVehicleBadges = validBadges.filter((badge) => {
          const plate = normalizePlateStr(badge.license_plate_sheet);
          if (!plate || seenPlates.has(plate)) return false;
          seenPlates.add(plate);
          return true;
        });

        let operatorVehicles: Vehicle[] = [];
        if (!operator.id.startsWith("legacy_")) {
          operatorVehicles = await vehicleService.getAll(operator.id, undefined, false);
        }
        const vehicleByPlate = new Map(
          operatorVehicles.map((v) => [normalizePlateStr(v.plateNumber), v]),
        );

        vehiclesData = validVehicleBadges.map((badge) => {
          const dbVehicle = vehicleByPlate.get(normalizePlateStr(badge.license_plate_sheet));
          return {
            id: badge.id,
            plateNumber: badge.license_plate_sheet,
            vehicleType: dbVehicle?.vehicleType || { id: null, name: badge.badge_type || "" },
            seatCapacity: dbVehicle?.seatCapacity || 0,
            bedCapacity: dbVehicle?.bedCapacity || 0,
            manufactureYear: dbVehicle?.manufactureYear || null,
            color: dbVehicle?.color || "",
            chassisNumber: dbVehicle?.chassisNumber || "",
            engineNumber: dbVehicle?.engineNumber || "",
            operatorId: operator.id,
            operator: { id: operator.id, name: operator.name || "", code: "" },
            operatorName: operator.name || "",
            isActive: badge.status !== "Thu hồi",
            notes: `Phù hiệu: ${badge.badge_number}`,
            source: "badge",
            badgeNumber: badge.badge_number,
            badgeType: badge.badge_type,
            badgeExpiryDate: badge.expiry_date,
            documents: {},
            province: dbVehicle?.province || "",
          } as BadgeVehicle;
        }) as unknown as Vehicle[];
      }

      // AppSheet path already setVehicles early for fast render; keep DB path behavior
      if (!useAppSheet) {
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      }

      const vehiclePlates = new Set(
        vehiclesData.map((v: Vehicle) =>
          v.plateNumber?.replace(/[.\-\s]/g, "").toUpperCase(),
        ).filter(Boolean),
      );

      // operator_id trong invoices là UUID; operator từ AppSheet có id=firebaseId (8 hex) → bỏ qua API
      const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const [allDispatch, invoicesData] = await Promise.all([
        dispatchService.getAll(),
        isUuid(operator.id) ? invoiceService.getAll(operator.id).catch(() => []) : Promise.resolve([]),
      ]);

      const operatorDispatch = allDispatch.filter((record: DispatchRecord) => {
        const recordPlate = record.vehiclePlateNumber?.replace(/[.\-\s]/g, "").toUpperCase();
        return recordPlate && vehiclePlates.has(recordPlate);
      });

      setAllDispatchRecords(operatorDispatch);

      const paidRecords = operatorDispatch.filter(
        (record: DispatchRecord) =>
          record.paymentTime && record.paymentAmount && record.paymentAmount > 0,
      );
      setPaidDispatchRecords(paidRecords);

      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
    } catch (err: unknown) {
      console.error("Failed to load operator details:", err);
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Không thể tải thông tin chi tiết";
      setError(errorMessage);
      toast.error(errorMessage);
      setVehicles([]);
      setInvoices([]);
      setPaidDispatchRecords([]);
      setAllDispatchRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Unpaid dispatch records (công nợ từ dispatch - chưa thanh toán)
  const unpaidDispatchRecords = useMemo(
    () => allDispatchRecords.filter(
      (record) => !record.paymentTime && record.currentStatus !== 'cancelled'
    ),
    [allDispatchRecords]
  );

  // Legacy: unpaid invoices
  const unpaidInvoices = useMemo(
    () =>
      invoices.filter(
        (inv) => inv.paymentStatus === "pending" || inv.paymentStatus === "overdue"
      ),
    [invoices]
  );

  // Total debt from both dispatch records and invoices
  const totalDebt = useMemo(() => {
    // Sum service charges from unpaid dispatch records
    const dispatchDebt = unpaidDispatchRecords.reduce((sum, record) => {
      // Use metadata.totalServiceCharges if available, otherwise 0
      const metadata = record.metadata as { totalServiceCharges?: number } | undefined;
      return sum + (metadata?.totalServiceCharges || 0);
    }, 0);
    const invoiceDebt = unpaidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    return dispatchDebt + invoiceDebt;
  }, [unpaidDispatchRecords, unpaidInvoices]);

  const paidInvoices = useMemo(
    () => invoices.filter((inv) => inv.paymentStatus === "paid"),
    [invoices]
  );

  const allPaymentHistory = useMemo(() => {
    const paymentHistoryFromDispatch: PaymentHistoryItem[] = paidDispatchRecords
      .filter((record) => record.paymentTime && record.paymentAmount)
      .map((record) => ({
        id: record.id,
        invoiceNumber:
          record.invoiceNumber || `ĐH-${record.id.substring(0, 8).toUpperCase()}`,
        issueDate: record.entryTime,
        paymentDate: record.paymentTime || null,
        totalAmount: record.paymentAmount || 0,
        source: "dispatch" as const,
        vehiclePlateNumber: record.vehiclePlateNumber,
        routeName: record.routeName,
      }));

    const combined: PaymentHistoryItem[] = [
      ...paidInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        paymentDate: inv.paymentDate || inv.issueDate,
        totalAmount: inv.totalAmount,
        source: "invoice" as const,
      })),
      ...paymentHistoryFromDispatch,
    ].sort((a, b) => {
      const dateA = a.paymentDate ? parseISO(a.paymentDate).getTime() : 0;
      const dateB = b.paymentDate ? parseISO(b.paymentDate).getTime() : 0;
      return dateB - dateA;
    });

    return combined;
  }, [paidInvoices, paidDispatchRecords]);

  const totalPaid = useMemo(
    () => allPaymentHistory.reduce((sum, item) => sum + item.totalAmount, 0),
    [allPaymentHistory]
  );

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return "N/A";
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, "dd/MM/yyyy") : "N/A";
    } catch {
      return "N/A";
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const resetTab = () => setActiveTab("vehicles");

  // Nguồn xe: AppSheet khi có operator.code hoặc operator.id (IDDoanhNghiep), còn lại Database
  const vehiclesSource = operator && (operator.code || operator.id) ? "AppSheet" : "Database";

  return {
    activeTab,
    setActiveTab,
    vehicles,
    vehiclesSource,
    badges,
    invoices,
    allDispatchRecords,
    paidDispatchRecords,
    unpaidDispatchRecords,
    isLoading,
    error,
    loadData,
    unpaidInvoices,
    totalDebt,
    paidInvoices,
    allPaymentHistory,
    totalPaid,
    formatDate,
    formatCurrency,
    resetTab,
    enrichVehicleRefs,
  };
}
