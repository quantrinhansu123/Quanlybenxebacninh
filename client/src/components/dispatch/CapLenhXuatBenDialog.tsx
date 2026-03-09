import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import {
  Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { dispatchService } from "@/services/dispatch.service"
import type { DispatchRecord } from "@/types"
import { formatVietnamDateTime } from "@/lib/vietnam-time"
import { useUIStore } from "@/store/ui.store"
import type { Shift } from "@/services/shift.service"

interface CapLenhXuatBenDialogProps {
  record: DispatchRecord
  onClose: () => void
  onSuccess?: () => void
}

export function CapLenhXuatBenDialog({
  record,
  onClose,
  onSuccess
}: CapLenhXuatBenDialogProps) {
  const [passengersDeparting, setPassengersDeparting] = useState("8")
  const [isLoading, setIsLoading] = useState(false)
  const [signAndTransmit, setSignAndTransmit] = useState(true)
  const [printRepresentation, setPrintRepresentation] = useState(false)
  const { currentShift } = useUIStore()

  // Helper function to get shift ID from currentShift string
  const getShiftIdFromCurrentShift = (): string | undefined => {
    if (!currentShift || currentShift === '<Trống>') {
      return undefined
    }

    const currentShifts = useUIStore.getState().shifts
    if (currentShifts.length === 0) {
      return undefined
    }

    const match = currentShift.match(/^(.+?)\s*\(/)
    if (!match) {
      return undefined
    }

    const shiftName = match[1].trim()
    const foundShift = currentShifts.find((shift: Shift) => shift.name === shiftName)
    return foundShift?.id
  }

  useEffect(() => {
    // Load shifts if not already loaded
    const { shifts: currentShifts, loadShifts } = useUIStore.getState()
    if (currentShifts.length === 0) {
      loadShifts()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!passengersDeparting || parseInt(passengersDeparting) <= 0) {
      toast.warning("Vui lòng nhập số khách xuất bến hợp lệ")
      return
    }

    setIsLoading(true)
    try {
      const departureOrderShiftId = getShiftIdFromCurrentShift()
      await dispatchService.issueDepartureOrder(record.id, parseInt(passengersDeparting), departureOrderShiftId)
      toast.success("Cấp lệnh xuất bến thành công!")
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error) {
      console.error("Failed to issue departure order:", error)
      toast.error("Không thể cấp lệnh xuất bến. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Số khách xuất bến với nút tăng/giảm */}
      <div>
        <Label htmlFor="passengersDeparting" className="text-sm font-medium text-gray-700 mb-2 block">
          Số khách xuất bến
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="passengersDeparting"
            type="number"
            value={passengersDeparting}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassengersDeparting(e.target.value)}
            required
            className="flex-1 text-center"
            min="0"
          />
        </div>
      </div>

      {/* Layout 2 cột: Preview bên trái, Thông tin bên phải */}
      <div className="grid grid-cols-2 gap-4 min-h-[300px]">
        {/* Bên trái: Preview/Document */}
        <div className="border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Không có bản thể hiện</p>
          </div>
        </div>

        {/* Bên phải: Thông tin */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <h3 className="font-semibold text-gray-900 mb-3">Thông tin xe</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Biển số xe:</span>
              <span className="ml-2 font-medium">{record.vehiclePlateNumber}</span>
            </div>
            {record.routeName && (
              <div>
                <span className="text-gray-600">Tuyến:</span>
                <span className="ml-2 font-medium">{record.routeName}</span>
              </div>
            )}
            {record.driverName && (
              <div>
                <span className="text-gray-600">Tài xế:</span>
                <span className="ml-2 font-medium">{record.driverName}</span>
              </div>
            )}
            {record.seatCount && (
              <div>
                <span className="text-gray-600">Số ghế đã cấp:</span>
                <span className="ml-2 font-medium">{record.seatCount}</span>
              </div>
            )}
            {record.plannedDepartureTime && (
              <div>
                <span className="text-gray-600">Giờ xuất bến kế hoạch:</span>
                <span className="ml-2 font-medium">
                  {formatVietnamDateTime(record.plannedDepartureTime)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Link xem QR code */}
      <div>
        <button
          type="button"
          onClick={() => {
            // TODO: Implement QR code list view
            toast.info("Chức năng xem chi tiết danh sách mã QR đang được phát triển")
          }}
          className="text-red-600 hover:text-red-700 text-sm underline"
        >
          Xem chi tiết danh sách mã QR
        </button>
      </div>

      {/* Checkboxes */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="signAndTransmit"
            checked={signAndTransmit}
            onChange={(e) => setSignAndTransmit(e.target.checked)}
          />
          <Label htmlFor="signAndTransmit" className="cursor-pointer text-sm">
            Ký lệnh và truyền tải
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="printRepresentation"
            checked={printRepresentation}
            onChange={(e) => setPrintRepresentation(e.target.checked)}
          />
          <Label htmlFor="printRepresentation" className="cursor-pointer text-sm">
            In bản thể hiện
          </Label>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          HỦY
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? "Đang xử lý..." : "XÁC NHẬN"}
        </Button>
      </div>
    </form>
  )
}
