import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Autocomplete } from "@/components/ui/autocomplete"
import { routeService, type LegacyRoute } from "@/services/route.service"
import { scheduleService } from "@/services/schedule.service"
import { dispatchService } from "@/services/dispatch.service"
import { vehicleService } from "@/services/vehicle.service"
import type { DispatchRecord, Schedule, Vehicle } from "@/types"
import { formatVietnamTime } from "@/utils/timezone"

interface XeTraKhachDialogProps {
  record: DispatchRecord
  onClose: () => void
  onSuccess?: () => void
}

export function XeTraKhachDialog({ 
  record, 
  onClose,
  onSuccess 
}: XeTraKhachDialogProps) {
  const [scheduleId, setScheduleId] = useState(record.scheduleId || "")
  const [passengersArrived, setPassengersArrived] = useState(
    record.passengersArrived?.toString() || "1"
  )
  const [routeId, setRouteId] = useState(record.routeId || "")
  const [signAndTransmit, setSignAndTransmit] = useState(true)
  const [printDisplay, setPrintDisplay] = useState(false)
  
  const [routes, setRoutes] = useState<LegacyRoute[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [transportOrderDisplay] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState("")

  useEffect(() => {
    loadRoutes()
    if (record.vehicleId) {
      loadVehicleDetails(record.vehicleId)
    }
  }, [])

  useEffect(() => {
    if (routeId) {
      loadSchedules(routeId)
    } else {
      setSchedules([])
    }
  }, [routeId])

  const loadRoutes = async () => {
    try {
      // Use legacy routes from Google Sheets sync (877 routes)
      const data = await routeService.getLegacy()
      setRoutes(data)
      // Set initial route if record has one
      if (record.routeId) {
        setRouteId(record.routeId)
      }
    } catch (error) {
      console.error("Failed to load routes:", error)
    }
  }

  const loadVehicleDetails = async (vehicleId: string) => {
    try {
      const vehicle = await vehicleService.getById(vehicleId)
      setSelectedVehicle(vehicle)
    } catch (error) {
      console.error("Failed to load vehicle details:", error)
    }
  }

  const loadSchedules = async (routeId: string) => {
    try {
      const data = await scheduleService.getAll(routeId, undefined, true)
      setSchedules(data)
      // Set initial schedule if record has one
      if (record.scheduleId && data.some(s => s.id === record.scheduleId)) {
        setScheduleId(record.scheduleId)
      }
    } catch (error) {
      console.error("Failed to load schedules:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!routeId || !passengersArrived) {
      toast.warning("Vui lòng điền đầy đủ các trường bắt buộc")
      return
    }

    setIsLoading(true)
    try {
      await dispatchService.recordPassengerDrop(
        record.id,
        parseInt(passengersArrived)
      )

      // Update route if changed
      if (routeId !== record.routeId) {
        // You might need to add an API endpoint to update route
        // For now, we'll just record the passenger drop
      }

      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error) {
      console.error("Failed to record passenger drop:", error)
      toast.error("Không thể xác nhận trả khách. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSchedules = schedules.filter((schedule) => {
    if (!scheduleSearchQuery) return true
    const query = scheduleSearchQuery.toLowerCase()
    return (
      schedule.scheduleCode.toLowerCase().includes(query) ||
      (schedule.route?.routeName || '').toLowerCase().includes(query)
    )
  })

  const getVehicleDisplayText = () => {
    if (!selectedVehicle) return record.vehiclePlateNumber
    const operatorName = selectedVehicle.operator?.name || ''
    return `${record.vehiclePlateNumber}${operatorName ? ` (${operatorName})` : ''}`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Form */}
        <div className="space-y-6">
          {/* Thông tin xe vào bến */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Thông tin xe vào bến
            </h3>
            
            <div>
              <Label htmlFor="vehicle">Biển kiểm soát</Label>
              <Input
                id="vehicle"
                value={getVehicleDisplayText()}
                className="mt-1 bg-gray-50"
                readOnly
              />
            </div>

            <div>
              <Label htmlFor="entryTime">Thời gian vào</Label>
              <Input
                id="entryTime"
                value={formatVietnamTime(record.entryTime, "HH:mm dd/MM/yyyy")}
                className="mt-1 bg-gray-50"
                readOnly
              />
            </div>
          </div>

          {/* Thông tin xe trả khách */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold text-gray-900">
              Thông tin xe trả khách
            </h3>

            {/* Nhật trình - hiện tại ẩn vì chưa có data từ Google Sheets */}
            {schedules.length > 0 && (
              <div>
                <Label htmlFor="schedule">Chọn nhật trình</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="schedule"
                    placeholder="Tìm kiếm"
                    value={scheduleSearchQuery}
                    onChange={(e) => setScheduleSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {scheduleSearchQuery && (
                  <div className="mt-1 border border-gray-200 rounded-md bg-white shadow-lg max-h-48 overflow-y-auto">
                    {filteredSchedules.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">Không tìm thấy nhật trình</div>
                    ) : (
                      filteredSchedules.map((schedule) => (
                        <button
                          key={schedule.id}
                          type="button"
                          onClick={() => {
                            setScheduleId(schedule.id)
                            setScheduleSearchQuery("")
                          }}
                          className="w-full text-left p-2 hover:bg-gray-100 text-sm"
                        >
                          {schedule.scheduleCode} - {schedule.route?.routeName || ''}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {scheduleId && (
                  <div className="mt-2 text-sm text-gray-600">
                    Đã chọn: {schedules.find(s => s.id === scheduleId)?.scheduleCode || scheduleId}
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="passengersArrived">
                Số khách đến bến <span className="text-red-500">(*)</span>
              </Label>
              <Input
                id="passengersArrived"
                type="number"
                value={passengersArrived}
                onChange={(e) => setPassengersArrived(e.target.value)}
                className="mt-1"
                min="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="route">
                Tuyến vận chuyển <span className="text-red-500">(*)</span>
              </Label>
              <Autocomplete
                value={routeId}
                onChange={(value) => setRouteId(value)}
                options={routes.map((r) => ({
                  value: r.id,
                  label: `${r.routePath} (${r.routeCode})`,
                }))}
                placeholder="Tìm tuyến vận chuyển..."
                className="mt-1"
              />
              {routeId && (
                <div className="mt-1 text-sm text-gray-600">
                  Đã chọn: {routes.find(r => r.id === routeId)?.routePath || routeId}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Transportation Order Display */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Bản thể hiện lệnh vận chuyển
          </h3>
          <div className="border border-gray-200 rounded-lg bg-gray-50 min-h-[400px] flex items-center justify-center relative">
            {transportOrderDisplay ? (
              <div className="p-4 text-sm text-gray-700">
                {transportOrderDisplay}
              </div>
            ) : (
              <p className="text-gray-400">Không có bản thể hiện</p>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Checkboxes */}
      <div className="flex items-center space-x-6 pt-4 border-t">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="signAndTransmit"
            checked={signAndTransmit}
            onChange={(e) => setSignAndTransmit(e.target.checked)}
          />
          <Label htmlFor="signAndTransmit" className="cursor-pointer">
            Ký lệnh và truyền tải
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="printDisplay"
            checked={printDisplay}
            onChange={(e) => setPrintDisplay(e.target.checked)}
          />
          <Label htmlFor="printDisplay" className="cursor-pointer">
            In bản thể hiện
          </Label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          disabled={isLoading}
        >
          HỦY
        </Button>
        <Button 
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Đang xử lý..." : "XÁC NHẬN"}
        </Button>
      </div>
    </form>
  )
}

