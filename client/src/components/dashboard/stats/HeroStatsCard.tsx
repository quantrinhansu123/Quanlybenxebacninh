import { Bus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { LiveBeacon } from "./LiveBeacon";

interface HeroStatsCardProps {
  total: number;
  inStation: number;
  departed: number;
  label: string;
  isLoading: boolean;
  onViewDetails: () => void;
}

export function HeroStatsCard({
  total,
  inStation,
  departed,
  label,
  isLoading,
  onViewDetails,
}: HeroStatsCardProps) {
  const animatedTotal = useAnimatedCounter(isLoading ? 0 : total, 2000);
  const animatedInStation = useAnimatedCounter(isLoading ? 0 : inStation, 2000);
  const animatedDeparted = useAnimatedCounter(isLoading ? 0 : departed, 2000);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-stone-800 p-6 shadow-xl shadow-stone-800/20">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Subtle Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-300 uppercase tracking-wide">{label}</h2>
              <div className="flex items-center gap-2 mt-1">
                <LiveBeacon size="small" />
                <span className="text-sm text-emerald-400 font-medium">
                  Đang hoạt động
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-5xl font-bold text-white tracking-tight">
              {animatedTotal}
            </p>
            <p className="text-sm text-stone-400 mt-1">lượt xe</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between pt-5 border-t border-stone-700">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <div>
                <p className="text-stone-400 text-xs font-medium">Trong bến</p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {animatedInStation}
                </p>
              </div>
            </div>
            <div className="h-10 w-px bg-stone-700" />
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div>
                <p className="text-stone-400 text-xs font-medium">Đã xuất bến</p>
                <p className="text-2xl font-bold text-emerald-400 mt-0.5">
                  {animatedDeparted}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            className="text-stone-300 hover:text-white hover:bg-stone-700 gap-1.5 text-sm rounded-xl px-4"
            onClick={onViewDetails}
          >
            Xem chi tiết
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
