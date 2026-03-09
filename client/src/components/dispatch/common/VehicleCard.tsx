import { memo } from "react";
import { Bus, MapPin, User, Users, FileCheck, RefreshCw, Zap, XCircle, Timer, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatVietnamDateTime } from "@/lib/vietnam-time";
import { columnConfig, type DisplayStatus } from "./column-config";
import { StatusRibbon } from "./StatusRibbon";
import { BusPlusIcon, FileExclamationIcon } from "@/components/dispatch/icons";
import type { DispatchRecord } from "@/types";

interface VehicleCardProps {
  record: DispatchRecord;
  status: DisplayStatus;
  index: number;
  vehicleStatus: 'eligible' | 'ineligible' | 'returned' | 'irregular' | null;
  onClick: () => void;
  actionButtons: React.ReactNode;
}

export const VehicleCard = memo(function VehicleCard({ record, status, index, vehicleStatus, onClick, actionButtons }: VehicleCardProps) {
  const config = columnConfig[status];
  const iconBg = getVehicleIconBg(record, status);

  return (
    <div
      className={cn(
        "group relative rounded-xl cursor-pointer transition-all duration-300",
        "bg-white/90 backdrop-blur-sm border shadow-sm",
        "hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5",
        config.borderColor,
        config.glowColor
      )}
      style={{ animation: `slideUp 0.3s ease-out ${index * 0.03}s backwards` }}
      onClick={onClick}
    >
      {vehicleStatus && <StatusRibbon type={vehicleStatus} />}

      <div className="p-2.5">
        {/* Header - Compact */}
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("p-2 rounded-lg bg-gradient-to-br shadow", iconBg)}>
            {renderVehicleIcon(record, status)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-base leading-tight">{record.vehiclePlateNumber}</h3>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Timer className="h-2.5 w-2.5" />
              <span className="font-mono font-semibold">{formatVietnamDateTime(record.entryTime, "HH:mm")}</span>
            </div>
          </div>
        </div>

        {/* Info - Compact */}
        <div className="space-y-1 mb-2">
          {(record.seatCount || record.passengersArrived) && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium">{record.seatCount || record.passengersArrived} chỗ</span>
              </div>
              {record.boardingPermitTime && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  <FileCheck className="h-2.5 w-2.5" />
                  <span className="font-semibold">{formatVietnamDateTime(record.boardingPermitTime, "HH:mm")}</span>
                </div>
              )}
            </div>
          )}

          {renderElectronicOrderInfo(record, status)}

          {record.driverName && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-medium truncate">{record.driverName}</span>
            </div>
          )}

          {record.routeName && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-medium truncate">{record.routeName}</span>
            </div>
          )}
        </div>

        {/* Actions - Compact */}
        <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100">
          {actionButtons}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className={cn(
        "absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity",
        config.headerGradient
      )} />
    </div>
  );
});

function getVehicleIconBg(record: DispatchRecord, status: DisplayStatus) {
  if (record.metadata?.type === "irregular") return "from-amber-500 to-orange-600";
  if (record.currentStatus === "passengers_dropped") return "from-sky-500 to-blue-600";
  if (record.permitStatus === "rejected" || (status === "paid" && !record.permitStatus)) return "from-rose-500 to-red-600";
  if (record.permitStatus === "approved") return "from-emerald-500 to-teal-600";
  return columnConfig[status].iconBg.replace('bg-gradient-to-br ', '');
}

function renderVehicleIcon(record: DispatchRecord, status: DisplayStatus) {
  const type = record.metadata?.type;
  if (type === "augmented") return <BusPlusIcon className="h-5 w-5 text-white" />;
  if (type === "replacement") return <ArrowRightLeft className="h-5 w-5 text-white" />;
  if (!record.scheduleId && type !== "irregular" && status === "in-station") {
    return <FileExclamationIcon className="h-5 w-5 text-white" />;
  }
  return <Bus className="h-5 w-5 text-white" />;
}

function renderElectronicOrderInfo(record: DispatchRecord, status: DisplayStatus) {
  if (status !== "in-station") return null;

  const metadata = (record.metadata || {}) as Record<string, unknown>;
  const electronicStatus = metadata.electronicOrderStatus as string | undefined;
  const electronicCode = String(metadata.electronicOrderCode || record.transportOrderCode || "");
  const electronicUrl = metadata.electronicOrderUrl as string | undefined;

  if (electronicStatus === "loading") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
        <RefreshCw className="h-2.5 w-2.5 animate-spin" />
        <span>Đang tải lệnh...</span>
      </div>
    );
  }

  if (electronicCode) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
        <Zap className="h-2.5 w-2.5" />
        {electronicUrl ? (
          <a href={electronicUrl} target="_blank" rel="noreferrer"
            className="hover:underline" onClick={(e) => e.stopPropagation()}>
            {electronicCode}
          </a>
        ) : (
          <span>{electronicCode}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
      <XCircle className="h-2.5 w-2.5" />
      <span>Chưa có lệnh</span>
    </div>
  );
}
