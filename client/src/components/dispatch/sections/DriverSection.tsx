import { Users, Plus, Phone, CreditCard } from "lucide-react";
import { GlassCard, SectionHeader, EmptyState } from "@/components/shared/styled-components";
import type { Driver } from "@/types";

interface DriverSectionProps {
  drivers: Driver[];
  readOnly: boolean;
  onAddDriver: () => void;
}

export function DriverSection({ drivers, readOnly, onAddDriver }: DriverSectionProps) {
  return (
    <GlassCard>
      <SectionHeader
        icon={Users}
        title="Lái xe"
        action={
          <button
            type="button"
            onClick={onAddDriver}
            disabled={readOnly}
            className="
              inline-flex items-center gap-2 h-11 px-5 rounded-xl
              bg-gradient-to-r from-blue-600 to-blue-500 text-white
              font-semibold text-sm
              shadow-lg shadow-blue-500/25
              hover:shadow-xl hover:shadow-blue-500/30 hover:from-blue-700 hover:to-blue-600
              active:scale-[0.98]
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <Plus className="h-5 w-5" />
            Thêm lái xe
          </button>
        }
      />
      <div className="p-6">
        {drivers.length === 0 ? (
          <EmptyState 
            icon={Users} 
            message="Chưa có lái xe" 
            action={
              <button
                onClick={onAddDriver}
                disabled={readOnly}
                className="text-blue-600 font-semibold text-sm hover:text-blue-700 transition-colors"
              >
                + Thêm lái xe đầu tiên
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="
                  flex items-center justify-between p-5 rounded-2xl 
                  bg-gradient-to-r from-gray-50 to-white
                  border-2 border-gray-100
                  hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10
                  transition-all duration-300
                "
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <span className="text-xl font-bold text-white">
                      {driver.fullName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{driver.fullName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-500 font-medium">{driver.phone || "Chưa có SĐT"}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-bold text-sm">{driver.licenseClass}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
