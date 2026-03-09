import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyStat } from "@/services/dashboard.service";

interface MonthlyBreakdownChartProps {
  data: MonthlyStat[];
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-stone-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
        <p className="font-medium mb-1">Tháng {label}</p>
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

export function MonthlyBreakdownChart({ data, isLoading }: MonthlyBreakdownChartProps) {
  // Transform data for chart
  const chartData = data.map((item) => ({
    name: item.monthName,
    departed: item.departed,
    waiting: item.waiting,
    other: item.other,
  }));

  if (isLoading) {
    return (
      <div className="h-[240px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-emerald-500 rounded-full animate-spin" />
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
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="departed"
            name="Xuất bến"
            stackId="a"
            fill="#22c55e"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="waiting"
            name="Chờ"
            stackId="a"
            fill="#f59e0b"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="other"
            name="Khác"
            stackId="a"
            fill="#d1d5db"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
