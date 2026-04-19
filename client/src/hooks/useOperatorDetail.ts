import { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { vehicleService } from "@/services/vehicle.service";
import { vehicleBadgeService, type VehicleBadge } from "@/services/vehicle-badge.service";
import { invoiceService } from "@/services/invoice.service";
import { dispatchService } from "@/services/dispatch.service";
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

export function useOperatorDetail(
  operator: OperatorWithSource | null,
  open: boolean,
  _dataSource?: "filtered" | "appsheet",
) {
  const [activeTab, setActiveTab] = useState("vehicles");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [badges, setBadges] = useState<VehicleBadge[]>([]);
  const [allDispatchRecords, setAllDispatchRecords] = useState<DispatchRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paidDispatchRecords, setPaidDispatchRecords] = useState<DispatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && operator) {
      loadData();
    }
  }, [open, operator]);

  const loadData = async () => {
    if (!operator) return;

    setIsLoading(true);
    setError(null);
    try {
      let vehiclesData: Vehicle[] = [];
      let badgesData: VehicleBadge[] = [];

      const normalizePlateStr = (p: string) => p?.replace(/[\s.\-]/g, '').toUpperCase() || '';

      // Database mode only
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

      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);

      const vehiclePlates = new Set(
        vehiclesData.map((v: Vehicle) =>
          v.plateNumber?.replace(/[.\-\s]/g, "").toUpperCase(),
        ).filter(Boolean),
      );

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

  // vehiclesSource is always Database now (AppSheet removed)
  const vehiclesSource = "Database";

  // No-op stub — AppSheet vehicle enrichment removed
  const enrichVehicleRefs = async (_vehicleRefs: string[]) => { /* no-op */ };

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
