import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyStat } from "@/services/dashboard.service";

interface WeeklyProgressChartProps {
  data: WeeklyStat[];
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-stone-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value} xe
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function WeeklyProgressChart({ data, isLoading }: WeeklyProgressChartProps) {
  // Transform data for chart
  const chartData = data.map((item) => ({
    name: item.dayName,
    departed: item.departed,
    inStation: item.inStation,
    total: item.total,
  }));

  if (isLoading) {
    return (
      <div className="h-[280px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-emerald-500 rounded-full animate-spin" />
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
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="departed"
            name="Xuất bến"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#22c55e" }}
          />
          <Line
            type="monotone"
            dataKey="inStation"
            name="Trong bến"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#f97316" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
