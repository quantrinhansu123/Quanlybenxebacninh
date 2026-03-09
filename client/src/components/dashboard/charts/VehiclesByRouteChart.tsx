import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { RouteBreakdown } from "@/services/dashboard.service";

interface VehiclesByRouteChartProps {
  data: RouteBreakdown[];
  isLoading?: boolean;
}

const COLORS = [
  "#f97316", // orange-500
  "#a855f7", // purple-500
  "#22c55e", // green-500
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#eab308", // yellow-500
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-stone-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        <p className="font-medium">{payload[0].name}</p>
        <p>{payload[0].value} xe ({payload[0].payload.percentage}%)</p>
      </div>
    );
  }
  return null;
};

export function VehiclesByRouteChart({ data, isLoading }: VehiclesByRouteChartProps) {
  // Transform data for chart
  const chartData = data.map((item, index) => ({
    name: item.routeName,
    value: item.count,
    percentage: item.percentage,
    color: COLORS[index % COLORS.length],
  }));

  const totalVehicles = chartData.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return (
      <div className="h-[240px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Show empty state if no data
  if (chartData.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center text-stone-400">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <div className="h-[240px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center total */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <span className="text-2xl font-bold text-stone-900">{totalVehicles}</span>
          <p className="text-xs text-stone-500">Tổng xe</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2">
        {chartData.slice(0, 4).map((item, index) => (
          <div key={index} className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-stone-600 truncate max-w-[80px]">
              {item.name.length > 12 ? item.name.substring(0, 12) + "..." : item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
