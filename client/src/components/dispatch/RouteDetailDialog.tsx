import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { routeService } from "@/services/route.service";

interface RouteDetail {
  id: string;
  routeCode: string;
  departureProvince: string | null;
  departureStation: string | null;
  arrivalProvince: string | null;
  arrivalStation: string | null;
  distanceKm: number | null;
  itinerary: string | null;
  routeType: string | null;
  totalTripsPerMonth: number | null;
  tripsOperated: number | null;
  remainingCapacity: number | null;
  minIntervalMinutes: number | null;
  decisionNumber: string | null;
  decisionDate: string | null;
  issuingAuthority: string | null;
  operationStatus: string | null;
}

interface RouteDetailDialogProps {
  routeId: string | null;
  open: boolean;
  onClose: () => void;
}

function formatStation(station: string | null, province: string | null): string {
  if (!station && !province) return "---";
  if (station && province) return `${station} (${province})`;
  return station || province || "---";
}

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "---";
  return String(value);
}

const ROUTE_FIELDS: { label: string; key: string }[] = [
  { label: "Mã tuyến", key: "routeCode" },
  { label: "Bến đi", key: "_departure" },
  { label: "Bến đến", key: "_arrival" },
  { label: "Cự ly (Km)", key: "distanceKm" },
  { label: "Loại tuyến", key: "routeType" },
  { label: "Hành trình", key: "itinerary" },
  { label: "Tổng chuyến/tháng", key: "totalTripsPerMonth" },
  { label: "Đã khai thác", key: "tripsOperated" },
  { label: "Lưu lượng còn", key: "remainingCapacity" },
  { label: "Giãn cách tối thiểu (phút)", key: "minIntervalMinutes" },
  { label: "Tình trạng", key: "operationStatus" },
  { label: "Số QĐ", key: "decisionNumber" },
  { label: "Ngày ban hành", key: "decisionDate" },
  { label: "Đơn vị ban hành", key: "issuingAuthority" },
];

function getFieldValue(route: RouteDetail, key: string): string {
  if (key === "_departure") return formatStation(route.departureStation, route.departureProvince);
  if (key === "_arrival") return formatStation(route.arrivalStation, route.arrivalProvince);
  return displayValue(route[key as keyof RouteDetail]);
}

export function RouteDetailDialog({ routeId, open, onClose }: RouteDetailDialogProps) {
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !routeId) return;

    let cancelled = false;
    setRoute(null);
    setLoading(true);
    setError(null);
    routeService
      .getById(routeId)
      .then((data) => {
        if (!cancelled) setRoute(data as unknown as RouteDetail);
      })
      .catch(() => {
        if (!cancelled) setError("Không thể tải thông tin tuyến");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, routeId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-lg">
        <DialogClose onClose={onClose} />
        <DialogHeader>
          <DialogTitle>Thông tin tuyến</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        )}

        {error && <p className="text-center text-rose-500 py-4">{error}</p>}

        {!loading && !error && route && (
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {ROUTE_FIELDS.map(({ label, key }) => (
              <div key={key} className="contents">
                <span className="text-gray-500 whitespace-nowrap">{label}:</span>
                <span className="font-medium text-gray-900">{getFieldValue(route, key)}</span>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
