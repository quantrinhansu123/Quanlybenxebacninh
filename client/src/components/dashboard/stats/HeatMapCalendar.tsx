import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { ChartDataPoint } from "@/services/dashboard.service";

interface HeatMapCalendarProps {
  data: ChartDataPoint[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function HeatMapCalendar({ data, selectedDate, onSelectDate }: HeatMapCalendarProps) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const dataByDate = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => {
      const dateKey = format(today, "yyyy-MM-dd");
      map.set(dateKey, (map.get(dateKey) || 0) + d.count);
    });
    return map;
  }, [data]);

  const getHeatLevel = (count: number): string => {
    if (count === 0) return "bg-stone-100";
    if (count <= 5) return "bg-emerald-200";
    if (count <= 15) return "bg-emerald-400";
    if (count <= 30) return "bg-emerald-500";
    return "bg-emerald-600";
  };

  const weekDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const firstDayOfWeek = monthStart.getDay();

  return (
    <div className="space-y-4">
      {/* Week Headers */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-stone-400 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for alignment */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const count = dataByDate.get(dateKey) || 0;
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const hasActivity = count > 0;

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(day)}
              className={cn(
                "aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative",
                "hover:ring-2 hover:ring-emerald-400 hover:ring-offset-1",
                hasActivity ? getHeatLevel(count) : "bg-stone-50",
                isSelected && "ring-2 ring-amber-400 ring-offset-2",
                isTodayDate && "ring-2 ring-emerald-500 ring-offset-1"
              )}
              title={`${format(day, "dd/MM")}: ${count} chuyến`}
            >
              <span
                className={cn(
                  "font-medium",
                  hasActivity && count > 2 ? "text-white" : "text-stone-600"
                )}
              >
                {format(day, "d")}
              </span>
              {hasActivity && (
                <span className="text-[10px] font-bold text-white drop-shadow-sm">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
        <span className="text-xs text-stone-400">Ít</span>
        <div className="flex items-center gap-1">
          {[
            "bg-stone-100",
            "bg-emerald-200",
            "bg-emerald-400",
            "bg-emerald-500",
            "bg-emerald-600",
          ].map((bg, i) => (
            <div key={i} className={cn("w-4 h-4 rounded", bg)} />
          ))}
        </div>
        <span className="text-xs text-stone-400">Nhiều</span>
      </div>
    </div>
  );
}
