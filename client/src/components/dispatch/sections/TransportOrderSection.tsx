import { useState } from "react";
import { FileText, Hash, MapPin, Clock, Info } from "lucide-react";
import { format } from "date-fns";
import { Autocomplete } from "@/components/ui/autocomplete";
import { DatePicker } from "@/components/DatePicker";
import { GlassCard, SectionHeader, FormField, StyledInput } from "@/components/shared/styled-components";
import { RouteDetailDialog } from "../RouteDetailDialog";
import type { Route } from "@/types";

interface TransportOrderSectionProps {
  readOnly: boolean;
  transportOrderCode: string;
  setTransportOrderCode: (value: string) => void;
  seatCount: string;
  setSeatCount: (value: string) => void;
  bedCount: string;
  setBedCount: (value: string) => void;
  hhTicketCount: string;
  setHhTicketCount: (value: string) => void;
  hhPercentage: string;
  setHhPercentage: (value: string) => void;
  routeId: string;
  setRouteId: (value: string) => void;
  routes: Route[];
  departureTime: string;
  setDepartureTime: (value: string) => void;
  departureDate: string;
  setDepartureDate: (value: string) => void;
  scheduleId: string;
  validationErrors?: Record<string, string>;
}

export function TransportOrderSection({
  readOnly,
  transportOrderCode,
  setTransportOrderCode,
  seatCount,
  setSeatCount,
  bedCount,
  setBedCount,
  hhTicketCount,
  setHhTicketCount,
  hhPercentage,
  setHhPercentage,
  routeId,
  setRouteId,
  routes,
  departureTime,
  setDepartureTime,
  departureDate,
  setDepartureDate,
  scheduleId,
  validationErrors = {},
}: TransportOrderSectionProps) {
  const [routeDetailOpen, setRouteDetailOpen] = useState(false);

  return (
    <GlassCard>
      <SectionHeader icon={FileText} title="Lệnh vận chuyển" />
      <div className="p-6 space-y-5">
        {/* Transport Order Code - Prominent input */}
        <FormField label="Mã lệnh vận chuyển" required error={validationErrors.transportOrderCode}>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Hash className="h-5 w-5" />
            </div>
            <StyledInput
              value={transportOrderCode}
              onChange={(e) => setTransportOrderCode(e.target.value)}
              placeholder="Nhập mã lệnh vận chuyển"
              autoComplete="off"
              readOnly={readOnly}
              className={`pl-12 ${validationErrors.transportOrderCode ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/30" : ""}`}
            />
          </div>
        </FormField>

        {/* Capacity Grid */}
        <div className="grid grid-cols-4 gap-4">
          <FormField label="Số ghế" required error={validationErrors.seatCount}>
            <StyledInput
              type="number"
              value={seatCount}
              onChange={(e) => setSeatCount(e.target.value)}
              min="1"
              readOnly={readOnly}
              className={`text-center ${validationErrors.seatCount ? "!border-rose-400 focus:border-rose-500 focus:ring-rose-500/30" : ""}`}
            />
          </FormField>
          <FormField label="Số giường">
            <StyledInput
              type="number"
              value={bedCount}
              onChange={(e) => setBedCount(e.target.value)}
              min="0"
              readOnly={readOnly}
              className="text-center"
            />
          </FormField>
          <FormField label="Số vé HH">
            <StyledInput
              type="number"
              value={hhTicketCount}
              onChange={(e) => setHhTicketCount(e.target.value)}
              min="0"
              readOnly={readOnly}
              className="text-center"
            />
          </FormField>
          <FormField label="% HH">
            <StyledInput
              type="number"
              value={hhPercentage}
              onChange={(e) => setHhPercentage(e.target.value)}
              min="0"
              max="100"
              readOnly={readOnly}
              className="text-center"
            />
          </FormField>
        </div>

        {/* Route Selection */}
        <FormField label="Tuyến vận chuyển" required error={validationErrors.routeId}>
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none">
                <MapPin className="h-5 w-5" />
              </div>
              <Autocomplete
                value={routeId}
                onChange={(value) => setRouteId(value)}
                options={routes.map((r) => ({
                  value: r.id,
                  label: `${r.routeName} (${r.routeCode})${r.distanceKm ? ` - ${r.distanceKm} Km` : ""}`,
                }))}
                placeholder="Gõ để tìm tuyến..."
                disabled={readOnly}
                className={`w-full [&_input]:pl-12 ${validationErrors.routeId ? "[&_input]:border-rose-400" : ""}`}
              />
            </div>
            {routeId && (
              <button
                type="button"
                onClick={() => setRouteDetailOpen(true)}
                className="shrink-0 p-2 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Xem thông tin tuyến"
                aria-label="Xem thông tin tuyến"
              >
                <Info className="h-5 w-5" />
              </button>
            )}
          </div>
        </FormField>

        {/* Time & Date - Side by side with icons */}
        <div className="grid grid-cols-2 gap-5">
          <FormField label="Giờ xuất bến khác" required={!scheduleId} error={validationErrors.departureTime}>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Clock className="h-5 w-5" />
              </div>
              <StyledInput
                type="text"
                inputMode="numeric"
                placeholder="HH:mm"
                maxLength={5}
                value={departureTime}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d:]/g, '');
                  setDepartureTime(v);
                }}
                readOnly={readOnly}
                className={`pl-12 font-bold ${validationErrors.departureTime ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/30" : ""}`}
              />
            </div>
          </FormField>
          <FormField label="Ngày xuất bến" required error={validationErrors.departureDate}>
            <div className={`relative ${validationErrors.departureDate ? "[&_button]:border-rose-400" : ""}`}>
              <DatePicker
                date={departureDate ? new Date(departureDate) : null}
                onDateChange={(date) => setDepartureDate(date ? format(date, "yyyy-MM-dd") : "")}
                placeholder="Chọn ngày"
                disabled={readOnly}
              />
            </div>
          </FormField>
        </div>
      </div>

      <RouteDetailDialog
        routeId={routeId}
        open={routeDetailOpen}
        onClose={() => setRouteDetailOpen(false)}
      />
    </GlassCard>
  );
}
