import { Bus, Building2, MapPin, Calendar, Clock, User, CircleDollarSign, CheckCircle2, ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DispatchRecord } from "@/types";

const statusConfig = {
  paid: {
    label: "Đã thanh toán",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-teal-500"
  },
  departed: {
    label: "Đã xuất bến",
    bg: "bg-violet-100",
    text: "text-violet-700",
    icon: ArrowRight,
    gradient: "from-violet-500 to-purple-500"
  },
  pending: {
    label: "Chờ thanh toán",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: Clock,
    gradient: "from-amber-500 to-orange-500"
  }
};

const routeTypeConfig = {
  'lien-tinh': {
    label: 'Liên tỉnh',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
  },
  'noi-tinh': {
    label: 'Nội tỉnh',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
  },
  'khac': {
    label: 'Khác',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
  },
};

const getRouteType = (routeType?: string): keyof typeof routeTypeConfig => {
  if (!routeType) return 'khac';
  const lower = routeType.toLowerCase();
  if (lower.includes('liên tỉnh') || lower.includes('lien tinh') || lower.includes('intercity')) {
    return 'lien-tinh';
  }
  if (lower.includes('nội tỉnh') || lower.includes('noi tinh')) {
    return 'noi-tinh';
  }
  return 'khac';
};

interface OrderCardProps {
  item: DispatchRecord;
  isSelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
}

export function OrderCard({ item, isSelected, onSelect, onNavigate }: OrderCardProps) {
  const isPaid = !!item.paymentTime || item.currentStatus === 'paid' || item.currentStatus === 'departure_ordered' || item.currentStatus === 'departed';
  const status = isPaid
    ? (item.currentStatus === 'departed' ? statusConfig.departed : statusConfig.paid)
    : statusConfig.pending;
  const StatusIcon = status.icon;
  const routeType = getRouteType(item.route?.routeType);
  const routeConfig = routeTypeConfig[routeType];

  return (
    <div
      className={cn(
        "group relative bg-white rounded-xl border-2 transition-all duration-200",
        "hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5",
        isSelected ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-100"
      )}
    >
      {/* Selection checkbox */}
      {!isPaid && (
        <div className="absolute top-3 left-3 z-10">
          <Checkbox
            checked={isSelected}
            onChange={onSelect}
            className="h-5 w-5"
          />
        </div>
      )}

      {/* Status indicator */}
      <div className={cn(
        "absolute top-0 right-0 px-2.5 py-1 rounded-bl-xl rounded-tr-xl",
        status.bg
      )}>
        <div className="flex items-center gap-1">
          <StatusIcon className={cn("w-3 h-3", status.text)} />
          <span className={cn("text-xs font-semibold", status.text)}>
            {status.label}
          </span>
        </div>
      </div>

      <div
        className="p-4 cursor-pointer"
        onClick={onNavigate}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md"
          )}>
            <Bus className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="font-bold text-gray-900 text-lg">
              {item.vehiclePlateNumber}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {item.transportOrderCode || `#${item.id.slice(-8)}`}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 truncate">
              {item.vehicle?.operator?.name || 'Chưa có đơn vị'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 truncate">
              {item.routeName || 'Chưa có tuyến'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600">
              {format(new Date(item.entryTime), "dd/MM/yyyy")}
            </span>
            <span className="text-gray-300">|</span>
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600">
              {item.plannedDepartureTime
                ? format(new Date(item.plannedDepartureTime), "HH:mm")
                : '--:--'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Route Type Badge */}
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              routeConfig.bg, routeConfig.text
            )}>
              {routeConfig.label}
            </span>
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{item.entryBy || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CircleDollarSign className="w-5 h-5 text-emerald-500" />
            <span className="text-lg font-bold text-emerald-600">
              {(item.paymentAmount || 0).toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>
      </div>

      {/* Hover action hint */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 h-1 rounded-b-xl transition-all duration-200",
        "bg-gradient-to-r opacity-0 group-hover:opacity-100",
        isPaid ? status.gradient : "from-blue-500 to-indigo-500"
      )} />
    </div>
  );
}
