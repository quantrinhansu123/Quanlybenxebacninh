import type { ScheduleDataSource } from "@/types";
import { cn } from "@/lib/utils";

export function ScheduleSourceToggle({
  value,
  onChange,
  disabled,
  className,
}: {
  value: ScheduleDataSource;
  onChange: (v: ScheduleDataSource) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 gap-0.5",
        className,
      )}
      role="group"
      aria-label="Nguồn dữ liệu biểu đồ giờ"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("database")}
        title="Lấy từ PostgreSQL (API)"
        className={cn(
          "px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors",
          value === "database"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900",
          disabled && "opacity-50 pointer-events-none",
        )}
      >
        DB
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("appsheet")}
        title="Lấy trực tiếp từ GTVT AppSheet"
        className={cn(
          "px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors",
          value === "appsheet"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900",
          disabled && "opacity-50 pointer-events-none",
        )}
      >
        AppSheet
      </button>
    </div>
  );
}
