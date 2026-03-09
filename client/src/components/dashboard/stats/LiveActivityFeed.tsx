import { Bus, CheckCircle, Banknote, ArrowRight, Target, Radio, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecentActivity } from "@/services/dashboard.service";
import { LiveBeacon } from "./LiveBeacon";
import { formatVietnamTime } from "@/utils/timezone";

interface LiveActivityFeedProps {
  activities: RecentActivity[];
  isLoading: boolean;
}

export function LiveActivityFeed({ activities, isLoading }: LiveActivityFeedProps) {
  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      { color: string; bg: string; icon: React.ElementType; label: string }
    > = {
      entered: {
        color: "text-blue-600",
        bg: "bg-blue-50",
        icon: ArrowRight,
        label: "Vào bến",
      },
      passengers_dropped: {
        color: "text-purple-600",
        bg: "bg-purple-50",
        icon: Target,
        label: "Trả khách",
      },
      permit_issued: {
        color: "text-amber-600",
        bg: "bg-amber-50",
        icon: CheckCircle,
        label: "Cấp nốt",
      },
      paid: {
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        icon: Banknote,
        label: "Thanh toán",
      },
      departure_ordered: {
        color: "text-cyan-600",
        bg: "bg-cyan-50",
        icon: Radio,
        label: "Lệnh xuất",
      },
      departed: {
        color: "text-stone-600",
        bg: "bg-stone-100",
        icon: Bus,
        label: "Xuất bến",
      },
    };
    return (
      configs[status] || {
        color: "text-stone-600",
        bg: "bg-stone-100",
        icon: Bus,
        label: status,
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse flex items-center gap-4 p-4 rounded-xl bg-stone-50"
          >
            <div className="w-12 h-12 rounded-xl bg-stone-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-stone-200 rounded w-1/3" />
              <div className="h-3 bg-stone-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-stone-100 flex items-center justify-center">
            <Bus className="w-10 h-10 text-stone-300" />
          </div>
          {/* Floating dots animation */}
          <div
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-emerald-200 animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-amber-200 animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="absolute top-1/2 -right-4 w-2 h-2 rounded-full bg-blue-200 animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <p className="text-stone-600 font-medium mt-4">Chưa có hoạt động nào</p>
        <p className="text-stone-400 text-sm">Các xe mới sẽ hiển thị tại đây</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
      {activities.map((activity, index) => {
        const config = getStatusConfig(activity.status);
        const StatusIcon = config.icon;

        return (
          <div
            key={activity.id}
            className={cn(
              "group flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
              "hover:bg-stone-50 border border-transparent hover:border-stone-200",
              "cursor-pointer",
              index === 0 &&
                "bg-emerald-50/50 border-emerald-100"
            )}
            style={{
              animation: `slideInRight 0.4s ease-out ${index * 0.1}s backwards`,
            }}
          >
            {/* Status Icon */}
            <div
              className={cn(
                "relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                config.bg
              )}
            >
              <StatusIcon className={cn("w-6 h-6", config.color)} />
              {index === 0 && (
                <span className="absolute -top-1 -right-1">
                  <LiveBeacon size="small" />
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-stone-800">
                  {activity.vehiclePlateNumber}
                </p>
                {index === 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase">
                    Mới
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <MapPin className="w-3 h-3 text-stone-400" />
                <p className="text-sm text-stone-500 truncate">
                  {activity.route || "Không có tuyến"}
                </p>
              </div>
            </div>

            {/* Time & Status */}
            <div className="flex-shrink-0 text-right">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold",
                  config.bg,
                  config.color
                )}
              >
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </span>
              <p className="text-xs text-stone-400 mt-1 font-mono">
                {formatVietnamTime(activity.entryTime)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
