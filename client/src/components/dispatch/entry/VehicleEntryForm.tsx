import { RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Autocomplete } from "@/components/ui/autocomplete";
import { DateTimePicker } from "@/components/DatePicker";
import type { Route, Schedule } from "@/types";

interface VehicleEntryFormProps {
  vehicleOptions: Array<{ id: string; plateNumber: string }>;
  vehicleId: string;
  /** Display fallback for edit mode when vehicleId is legacy format */
  editRecordPlateNumber?: string;
  entryDateTime: Date | undefined;
  confirmPassengerDrop: boolean;
  routeId: string;
  scheduleId: string;
  passengersArrived: string;
  transportOrderCode: string;
  routes: Route[];
  schedules: Schedule[];
  onVehicleSelect: (id: string) => void;
  onEntryDateTimeChange: (date: Date | undefined) => void;
  onConfirmPassengerDropChange: (checked: boolean) => void;
  onRouteChange: (routeId: string) => void;
  onScheduleChange: (scheduleId: string) => void;
  onPassengersArrivedChange: (value: string) => void;
  onTransportOrderCodeChange: (value: string) => void;
  onRefreshTransportOrder: () => void;
}

export function VehicleEntryForm({
  vehicleOptions,
  vehicleId,
  editRecordPlateNumber,
  entryDateTime,
  confirmPassengerDrop,
  routeId,
  scheduleId,
  passengersArrived,
  transportOrderCode,
  routes,
  schedules,
  onVehicleSelect,
  onEntryDateTimeChange,
  onConfirmPassengerDropChange,
  onRouteChange,
  onScheduleChange,
  onPassengersArrivedChange,
  onTransportOrderCodeChange,
  onRefreshTransportOrder,
}: VehicleEntryFormProps) {
  return (
    <div className="space-y-8">
      {/* Thông tin xe vào bến */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b">
          Thông tin xe vào bến
        </h3>

        <div>
          <Label htmlFor="vehicle" className="text-sm font-medium mb-2 block">
            Biển kiểm soát <span className="text-red-500">(*)</span>
          </Label>
          <Autocomplete
            value={vehicleId}
            displayValue={editRecordPlateNumber}
            onChange={onVehicleSelect}
            options={vehicleOptions.map((v) => ({
              value: v.id,
              label: v.plateNumber,
            }))}
            placeholder="Nhập biển kiểm soát để tìm kiếm..."
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="entryTime" className="text-sm font-medium mb-2 block">
            Thời gian vào <span className="text-red-500">(*)</span>
          </Label>
          <div className="relative mt-1">
            <DateTimePicker
              date={entryDateTime || null}
              onDateChange={onEntryDateTimeChange}
            />
          </div>
        </div>
      </div>

      {/* Thông tin xe trả khách */}
      <div className="space-y-5 pt-6 border-t">
        <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b">
          Thông tin xe trả khách
        </h3>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="confirmPassengerDrop"
            checked={confirmPassengerDrop}
            onChange={(e) => onConfirmPassengerDropChange(e.target.checked)}
          />
          <Label htmlFor="confirmPassengerDrop" className="cursor-pointer">
            Xác nhận trả khách
          </Label>
        </div>

        {confirmPassengerDrop && (
          <>
            <div>
              <Label htmlFor="route" className="text-sm font-medium mb-2 block">
                Tuyến vận chuyển <span className="text-red-500">(*)</span>
              </Label>
              <Select
                id="route"
                value={routeId}
                onChange={(e) => onRouteChange(e.target.value)}
                className="mt-1 h-11"
                required
              >
                <option value="">Chọn tuyến vận chuyển</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.routeName} ({r.routeCode})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="schedule" className="text-sm font-medium mb-2 block">
                Biểu đồ giờ
              </Label>
              <Select
                id="schedule"
                value={scheduleId}
                onChange={(e) => onScheduleChange(e.target.value)}
                className="mt-1 h-11"
              >
                <option value="">Chọn biểu đồ giờ</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.scheduleCode} - {s.departureTime}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="passengersArrived" className="text-sm font-medium mb-2 block">
                Số khách đến bến <span className="text-red-500">(*)</span>
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="passengersArrived"
                  type="number"
                  value={passengersArrived}
                  onChange={(e) => onPassengersArrivedChange(e.target.value)}
                  className="flex-1 h-11"
                  min="0"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="transportOrderCode" className="text-sm font-medium mb-2 block">
                Lệnh vận chuyển <span className="text-red-500">(*)</span>
              </Label>
              <div className="relative mt-1">
                <Input
                  id="transportOrderCode"
                  value={transportOrderCode}
                  onChange={(e) => onTransportOrderCodeChange(e.target.value)}
                  className="pr-10 h-11"
                  placeholder="Nhập mã lệnh vận chuyển"
                  required
                />
                <button
                  type="button"
                  onClick={onRefreshTransportOrder}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Làm mới"
                >
                  <RefreshCw className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
