import { memo } from "react";
import { Truck, Users, Fuel, MapPin } from "lucide-react";
import type { Vehicle } from "@/types";

interface VehicleCardProps {
  vehicle: Vehicle;
  index: number;
  onClick?: (vehicle: Vehicle) => void;
}

export const VehicleCard = memo(function VehicleCard({ vehicle, index, onClick }: VehicleCardProps) {
  const isActive = vehicle.isActive;
  const hasSeats = vehicle.seatCapacity && vehicle.seatCapacity > 0;
  const hasBeds = vehicle.bedCapacity && vehicle.bedCapacity > 0;

  return (
    <div
      className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 cursor-pointer"
      onClick={() => onClick?.(vehicle)}
      style={{
        animationDelay: `${index * 0.05}s`,
        animation: "slideUp 0.4s ease-out backwards",
      }}
    >
      {/* Status ribbon */}
      <div className="absolute top-3 right-3 z-10">
        <span
          className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
          ${
            isActive
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
              : "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
          }
        `}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? "bg-white animate-pulse" : "bg-gray-300"
            }`}
          />
          {isActive ? "Hoạt động" : "Ngừng"}
        </span>
      </div>

      {/* Card content */}
      <div className="p-5">
        {/* Plate number - Hero element */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
              {vehicle.plateNumber}
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              {(vehicle as any).vehicleCategory || vehicle.vehicleType?.name || "N/A"}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
            <Users className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Số ghế</p>
              <p className="text-sm font-bold text-gray-900">
                {hasSeats ? vehicle.seatCapacity : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100">
            <Fuel className="w-4 h-4 text-violet-600" />
            <div>
              <p className="text-xs text-gray-500">Giường</p>
              <p className="text-sm font-bold text-gray-900">
                {hasBeds ? vehicle.bedCapacity : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span>{vehicle.province || "Chưa xác định"}</span>
        </div>
      </div>

      {/* Hover gradient border effect */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)",
        }}
      />
    </div>
  );
});
