import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartDataPoint } from "@/services/dashboard.service";

interface VehicleTrendChartProps {
  data: ChartDataPoint[];
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-stone-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-orange-300">{payload[0].value} xe</p>
      </div>
    );
  }
  return null;
};

export function VehicleTrendChart({ data, isLoading }: VehicleTrendChartProps) {
  // Transform hourly data for chart display
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    return data.map((item) => ({
      name: item.hour,
      value: item.count,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="h-[280px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Show empty state if no data
  if (chartData.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-stone-400">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#f97316"
            strokeWidth={2}
            fill="url(#colorValue)"
            dot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#f97316", strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
