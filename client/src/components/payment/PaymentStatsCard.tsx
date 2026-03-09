import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
  trend?: { value: number; label: string };
}

export function PaymentStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  trend
}: PaymentStatsCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-5",
      "bg-gradient-to-br", gradient,
      "text-white shadow-lg"
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-20">
        <Icon className="w-full h-full" />
      </div>
      <div className="relative">
        <p className="text-sm font-medium text-white/80">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-sm text-white/70 mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>{trend.value}% {trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
