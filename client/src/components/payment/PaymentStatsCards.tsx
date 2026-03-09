import { Clock, CheckCircle, Wallet, TrendingUp } from "lucide-react";
import { Icon3D } from "@/components/ui/Icon3D";

interface PaymentStats {
  total: number;
  pending: number;
  paid: number;
  totalAmount: number;
}

interface PaymentStatsCardsProps {
  stats: PaymentStats;
}

export function PaymentStatsCards({ stats }: PaymentStatsCardsProps) {
  const pendingPercent = stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0;
  const paidPercent = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Hero Card - Tổng đơn hàng */}
      <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-blue-100 mb-2">
            <Icon3D name="receipt" size="sm" className="opacity-90" />
            <span className="text-sm font-medium uppercase tracking-wider">
              Tổng đơn hàng
            </span>
          </div>
          <p className="text-6xl font-bold tracking-tight">
            {stats.total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-4 text-blue-100">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Trong khoảng thời gian</span>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="col-span-12 lg:col-span-7 grid grid-cols-3 gap-4">
        {/* Chờ thanh toán */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-amber-100 group-hover:bg-amber-500 transition-colors">
              <Clock className="w-4 h-4 text-amber-600 group-hover:text-white transition-colors" />
            </div>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              {pendingPercent}%
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {stats.pending.toLocaleString()}
          </p>
          <p className="text-sm text-slate-500 mt-1">Chờ thanh toán</p>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${pendingPercent}%` }}
            />
          </div>
        </div>

        {/* Đã thanh toán */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 transition-colors">
              <CheckCircle className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              {paidPercent}%
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {stats.paid.toLocaleString()}
          </p>
          <p className="text-sm text-slate-500 mt-1">Đã thanh toán</p>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </div>

        {/* Tổng doanh thu */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-violet-100 group-hover:bg-violet-500 transition-colors">
              <Wallet className="w-4 h-4 text-violet-600 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {(stats.totalAmount / 1000000).toFixed(1)}M
          </p>
          <p className="text-sm text-slate-500 mt-1">Tổng doanh thu</p>
          <p className="mt-2 text-xs text-violet-600 font-medium">
            {stats.totalAmount.toLocaleString('vi-VN')}đ
          </p>
        </div>
      </div>
    </div>
  );
}
