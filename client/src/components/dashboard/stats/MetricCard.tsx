import { memo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { LiveBeacon } from "./LiveBeacon";

export interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  variant: "blue" | "emerald" | "amber" | "rose";
  subtitle?: string;
  isLoading?: boolean;
  isPulsing?: boolean;
}

export const metricVariants = {
  blue: {
    bg: "bg-blue-500",
    light: "bg-blue-50",
    border: "border-stone-200",
    text: "text-stone-800",
    iconBg: "bg-blue-500",
    accent: "text-blue-600",
  },
  emerald: {
    bg: "bg-emerald-500",
    light: "bg-emerald-50",
    border: "border-stone-200",
    text: "text-stone-800",
    iconBg: "bg-emerald-500",
    accent: "text-emerald-600",
  },
  amber: {
    bg: "bg-amber-500",
    light: "bg-amber-50",
    border: "border-stone-200",
    text: "text-stone-800",
    iconBg: "bg-amber-500",
    accent: "text-amber-600",
  },
  rose: {
    bg: "bg-rose-500",
    light: "bg-rose-50",
    border: "border-stone-200",
    text: "text-stone-800",
    iconBg: "bg-rose-500",
    accent: "text-rose-600",
  },
};

export const MetricCard = memo(function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  variant,
  subtitle,
  isLoading,
  isPulsing,
}: MetricCardProps) {
  const styles = metricVariants[variant];
  const animatedValue = useAnimatedCounter(isLoading ? 0 : value, 1200);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-md",
        isPulsing && "animate-pulse-subtle"
      )}
    >
      {/* Card Content */}
      <div
        className={cn(
          "relative p-5 bg-white border rounded-2xl",
          "shadow-sm transition-shadow",
          styles.border
        )}
      >
        {/* Header: Icon + Badge */}
        <div className="flex items-center justify-between mb-3">
          <div
            className={cn(
              "p-2.5 rounded-xl",
              styles.iconBg
            )}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          {isPulsing && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100">
              <LiveBeacon size="small" />
              <span className="text-xs font-semibold text-rose-600">
                Cần xử lý
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-stone-500 mb-1">{title}</p>

        {/* Value */}
        <p
          className={cn(
            "text-3xl font-bold tracking-tight leading-tight",
            styles.text
          )}
        >
          {animatedValue.toLocaleString("vi-VN")}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-stone-400 mt-1">{subtitle}</p>
        )}

        {/* Trend - compact */}
        {trend && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-stone-100">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold",
                trend.isPositive
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600"
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-stone-400">vs hôm qua</span>
          </div>
        )}

        {/* Hover Accent Line */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
            styles.bg
          )}
        />
      </div>
    </div>
  );
});
