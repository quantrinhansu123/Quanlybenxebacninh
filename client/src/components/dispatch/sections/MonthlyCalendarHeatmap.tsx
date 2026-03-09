import { Label } from "@/components/ui/label";

interface MonthlyCalendarHeatmapProps {
  departureDate: string;
  dailyTripCounts: Record<number, number>;
}

export function MonthlyCalendarHeatmap({ departureDate, dailyTripCounts }: MonthlyCalendarHeatmapProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold text-gray-800">
          Lịch hoạt động tháng {departureDate ? new Date(departureDate).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }) : ''}
        </Label>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-gray-100 border border-gray-200"></span>
            0
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-200"></span>
            1-2
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-400"></span>
            3-5
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-600"></span>
            6+
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-4 border border-gray-200/60 shadow-sm">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {(() => {
            const today = new Date();
            const currentDay = today.getDate();
            const selectedDate = departureDate ? new Date(departureDate) : new Date();
            const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            const startDay = firstDayOfMonth.getDay();
            const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
            const isCurrentMonth = selectedDate.getMonth() === today.getMonth() && selectedDate.getFullYear() === today.getFullYear();

            const emptyCells = Array.from({ length: startDay }, (_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ));

            const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const count = dailyTripCounts[day] || 0;
              const isToday = isCurrentMonth && day === currentDay;
              const isSelected = departureDate && new Date(departureDate).getDate() === day;

              const getBgColor = (c: number) => {
                if (c === 0) return 'bg-gray-100 border-gray-200';
                if (c <= 2) return 'bg-emerald-200 border-emerald-300';
                if (c <= 5) return 'bg-emerald-400 border-emerald-500 text-white';
                return 'bg-emerald-600 border-emerald-700 text-white';
              };

              return (
                <div
                  key={day}
                  className={`
                    relative aspect-square rounded-md border flex flex-col items-center justify-center
                    transition-all duration-200 cursor-default group
                    ${getBgColor(count)}
                    ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                    ${isSelected ? 'ring-2 ring-amber-500 ring-offset-1' : ''}
                    hover:scale-110 hover:shadow-md hover:z-10
                  `}
                  title={`Ngày ${day}: ${count} xe`}
                >
                  <span className={`text-sm font-semibold ${count > 2 ? '' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  {count > 0 && (
                    <span className={`text-xs font-bold ${count > 2 ? '' : 'text-emerald-700'}`}>
                      {count}
                    </span>
                  )}
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-lg">
                    {count} chuyến
                  </div>
                </div>
              );
            });

            return [...emptyCells, ...dayCells];
          })()}
        </div>

        {/* Summary footer */}
        <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="font-medium">Tổng tháng:</span>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold">
              {Object.values(dailyTripCounts).reduce((a, b) => a + b, 0)} chuyến
            </span>
          </div>
          <div className="text-gray-500">
            Ngày cao nhất: <span className="font-semibold text-gray-700">{Math.max(...Object.values(dailyTripCounts), 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
