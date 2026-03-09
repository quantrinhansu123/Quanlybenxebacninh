import { CreditCard, ChevronRight, Plus, Wallet } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard, SectionHeader } from "@/components/shared/styled-components";
import type { ServiceCharge } from "@/types";

interface ServiceChargesSectionProps {
  readOnly: boolean;
  serviceCharges: ServiceCharge[];
  totalAmount: number;
  serviceDetailsExpanded: boolean;
  setServiceDetailsExpanded: (value: boolean) => void;
  onAddService: () => void;
  recordId?: string;
}

export function ServiceChargesSection({
  readOnly,
  serviceCharges,
  totalAmount,
  serviceDetailsExpanded,
  setServiceDetailsExpanded,
  onAddService,
  recordId,
}: ServiceChargesSectionProps) {
  return (
    <GlassCard>
      <SectionHeader
        icon={CreditCard}
        title="Giá dịch vụ"
        action={
          <button
            type="button"
            onClick={onAddService}
            disabled={!recordId || readOnly}
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
            Thêm dịch vụ
          </button>
        }
      />
      <div className="divide-y divide-gray-100">
        {/* Service list header */}
        <div
          className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setServiceDetailsExpanded(!serviceDetailsExpanded)}
        >
          <div className="flex items-center gap-4">
            <Checkbox
              checked={true}
              onChange={() => {}}
              onClick={(e) => e.stopPropagation()}
              disabled={readOnly}
            />
            <ChevronRight
              className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                serviceDetailsExpanded ? "rotate-90" : ""
              }`}
            />
            <span className="text-base font-medium text-gray-800">Dịch vụ chuyến đi</span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            {totalAmount.toLocaleString("vi-VN")} ₫
          </span>
        </div>

        {/* Service details */}
        {serviceDetailsExpanded && (
          <div className="bg-gradient-to-b from-gray-50 to-white">
            {serviceCharges.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="p-4 rounded-2xl bg-gray-100 w-fit mx-auto mb-4">
                  <Wallet className="h-12 w-12 text-gray-400" />
                </div>
                <p className="text-gray-500 font-semibold text-lg mb-1">Chưa có dịch vụ</p>
                <p className="text-gray-400 text-sm">Nhấn "Thêm dịch vụ" để bắt đầu</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {serviceCharges.map((charge) => (
                  <div key={charge.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <span className="text-base font-medium text-gray-700">
                      {charge.serviceType?.name || "Dịch vụ"}
                    </span>
                    <span className="text-base text-gray-900 font-semibold">
                      {charge.totalAmount.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Total - Much more prominent */}
        <div className="relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500" />
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '20px 20px'
            }} />
          </div>
          
          <div className="relative flex items-center justify-between px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <span className="text-lg font-bold text-white">TỔNG TIỀN</span>
            </div>
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {totalAmount.toLocaleString("vi-VN")} ₫
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
