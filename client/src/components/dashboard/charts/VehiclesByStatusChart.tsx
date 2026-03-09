import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface VehiclesByStatusChartProps {
  inStation: number;
  departed: number;
  total: number;
  isLoading?: boolean;
}

const COLORS = {
  departed: "#1f2937", // stone-800
  inStation: "#9ca3af", // stone-400
  other: "#e5e7eb", // stone-200
};

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

export function VehiclesByStatusChart({
  inStation,
  departed,
  total,
  isLoading,
}: VehiclesByStatusChartProps) {
  const chartData = useMemo(() => {
    const actualTotal = total || inStation + departed || 1;
    const other = Math.max(0, actualTotal - inStation - departed);

    return [
      {
        name: "Đã xuất bến",
        value: departed || 0,
        percentage: actualTotal > 0 ? Math.round((departed / actualTotal) * 100) : 0,
        color: COLORS.departed,
      },
      {
        name: "Trong bến",
        value: inStation || 0,
        percentage: actualTotal > 0 ? Math.round((inStation / actualTotal) * 100) : 0,
        color: COLORS.inStation,
      },
      {
        name: "Khác",
        value: other,
        percentage: actualTotal > 0 ? Math.round((other / actualTotal) * 100) : 0,
        color: COLORS.other,
      },
    ].filter((d) => d.value > 0);
  }, [inStation, departed, total]);

  // Calculate percentage for center display
  const departedPercentage = useMemo(() => {
    const actualTotal = total || inStation + departed || 1;
    return actualTotal > 0 ? Math.round((departed / actualTotal) * 100) : 0;
  }, [departed, inStation, total]);

  if (isLoading) {
    return (
      <div className="h-[240px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin" />
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

      {/* Center percentage */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-3xl font-bold text-stone-900">{departedPercentage}%</span>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stone-800" />
          <span className="text-xs text-stone-600">Xuất bến</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
          <span className="text-xs text-stone-600">Trong bến</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stone-200" />
          <span className="text-xs text-stone-600">Chờ</span>
        </div>
      </div>
    </div>
  );
}
