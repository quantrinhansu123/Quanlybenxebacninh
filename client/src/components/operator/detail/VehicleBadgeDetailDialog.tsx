import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Truck, Users, Bed, Calendar, Hash, MapPin, Palette, Settings } from "lucide-react";
import type { Vehicle } from "@/types";

// Extended vehicle with badge fields from useOperatorDetail
interface BadgeVehicle extends Vehicle {
  badgeNumber?: string;
  badgeType?: string;
  badgeExpiryDate?: string;
}

interface VehicleBadgeDetailDialogProps {
  vehicle: BadgeVehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleBadgeDetailDialog({
  vehicle,
  open,
  onOpenChange,
}: VehicleBadgeDetailDialogProps) {
  if (!vehicle) return null;

  const isActive = vehicle.isActive;
  const hasSeats = vehicle.seatCapacity && vehicle.seatCapacity > 0;
  const hasBeds = vehicle.bedCapacity && vehicle.bedCapacity > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl">{vehicle.plateNumber}</span>
              <Badge
                variant={isActive ? "default" : "secondary"}
                className={`ml-2 text-xs ${isActive ? "bg-emerald-500" : ""}`}
              >
                {isActive ? "Hoạt động" : "Ngừng"}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Badge info */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <h4 className="text-sm font-semibold text-amber-800 mb-2">Phù hiệu</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <InfoRow icon={Hash} label="Số PH" value={vehicle.badgeNumber} />
              <InfoRow icon={Settings} label="Loại" value={vehicle.badgeType} />
              <InfoRow
                icon={Calendar}
                label="Hết hạn"
                value={vehicle.badgeExpiryDate ? formatDate(vehicle.badgeExpiryDate) : undefined}
              />
            </div>
          </div>

          {/* Vehicle specs */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Thông số xe</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <InfoRow icon={Users} label="Số ghế" value={hasSeats ? String(vehicle.seatCapacity) : "—"} />
              <InfoRow icon={Bed} label="Giường" value={hasBeds ? String(vehicle.bedCapacity) : "—"} />
              <InfoRow icon={Truck} label="Loại xe" value={vehicle.vehicleType?.name} />
              <InfoRow icon={MapPin} label="Tỉnh/TP" value={vehicle.province} />
              <InfoRow icon={Palette} label="Màu sắc" value={vehicle.color} />
            </div>
          </div>

          {/* Notes */}
          {vehicle.notes && (
            <p className="text-xs text-gray-500 italic">{vehicle.notes}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-gray-800 truncate">{value || "—"}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN");
  } catch {
    return dateStr;
  }
}
