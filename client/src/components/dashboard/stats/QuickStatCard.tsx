import { cn } from "@/lib/utils";

interface QuickStatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: "blue" | "emerald" | "amber" | "rose";
}

const colorStyles = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

export function QuickStatCard({ label, value, icon: Icon, color }: QuickStatCardProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-stone-50 border border-stone-100 hover:border-stone-200 transition-colors">
      <div
        className={cn(
          "p-2.5 rounded-xl text-white",
          colorStyles[color]
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-stone-500 font-medium mb-0.5">{label}</p>
        <p className="text-xl font-bold text-stone-800">{value}</p>
      </div>
    </div>
  );
}
