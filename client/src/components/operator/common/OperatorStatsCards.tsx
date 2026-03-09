import { Building2, CheckCircle, AlertCircle, Ticket, TrendingUp } from "lucide-react";

interface OperatorStats {
  total: number;
  active: number;
  inactive: number;
  delegated: number;
}

interface OperatorStatsCardsProps {
  stats: OperatorStats;
}

export function OperatorStatsCards({ stats }: OperatorStatsCardsProps) {
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Primary Stat - Hero Card */}
      <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-orange-100 mb-2">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wider">
              Tổng số đơn vị
            </span>
          </div>
          <p className="text-6xl font-bold tracking-tight">
            {stats.total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-4 text-orange-100">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Đang quản lý trong hệ thống</span>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="col-span-12 lg:col-span-7 grid grid-cols-3 gap-4">
        {/* Active */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 transition-colors">
              <CheckCircle className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              {stats.total > 0
                ? Math.round((stats.active / stats.total) * 100)
                : 0}
              %
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {stats.active.toLocaleString()}
          </p>
          <p className="text-sm text-slate-500 mt-1">Đang hoạt động</p>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: `${
                  stats.total > 0 ? (stats.active / stats.total) * 100 : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Inactive */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-rose-100 group-hover:bg-rose-500 transition-colors">
              <AlertCircle className="w-4 h-4 text-rose-600 group-hover:text-white transition-colors" />
            </div>
            <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
              {stats.total > 0
                ? Math.round((stats.inactive / stats.total) * 100)
                : 0}
              %
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {stats.inactive.toLocaleString()}
          </p>
          <p className="text-sm text-slate-500 mt-1">Ngừng hoạt động</p>
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
              style={{
                width: `${
                  stats.total > 0 ? (stats.inactive / stats.total) * 100 : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Ticket Delegated */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-violet-100 group-hover:bg-violet-500 transition-colors">
              <Ticket className="w-4 h-4 text-violet-600 group-hover:text-white transition-colors" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {stats.delegated.toLocaleString()}
          </p>
          <p className="text-sm text-slate-500 mt-1">Ủy thác vé</p>
          <div className="mt-3 flex items-center gap-1">
            {Array.from({ length: Math.min(5, stats.delegated) }).map(
              (_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 border-2 border-white -ml-2 first:ml-0"
                />
              )
            )}
            {stats.delegated > 5 && (
              <span className="text-xs text-slate-500 ml-1">
                +{stats.delegated - 5}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
