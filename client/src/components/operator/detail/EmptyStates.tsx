import { Truck, Sparkles } from "lucide-react";

export function EmptyVehicles() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <Truck className="w-10 h-10 text-gray-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Chưa có xe nào
      </h3>
      <p className="text-sm text-gray-500 max-w-sm">
        Đơn vị vận tải này chưa có xe được đăng ký trong hệ thống
      </p>
    </div>
  );
}

export function VehiclesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-200" />
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-24 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="h-14 bg-gray-100 rounded-xl" />
            <div className="h-14 bg-gray-100 rounded-xl" />
          </div>
          <div className="h-4 bg-gray-100 rounded w-20" />
        </div>
      ))}
    </div>
  );
}
