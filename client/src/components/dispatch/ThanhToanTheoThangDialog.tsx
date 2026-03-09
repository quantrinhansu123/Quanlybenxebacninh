import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { dispatchService } from "@/services/dispatch.service"
import { LyDoKhongDuDieuKienDialog } from "./LyDoKhongDuDieuKienDialog"
import type { DispatchRecord } from "@/types"
import { format } from "date-fns"
import { useUIStore } from "@/store/ui.store"
import type { Shift } from "@/services/shift.service"

interface ThanhToanTheoThangDialogProps {
  record: DispatchRecord
  onClose: () => void
  onSuccess?: () => void
}

export function ThanhToanTheoThangDialog({
  record,
  onClose,
  onSuccess
}: ThanhToanTheoThangDialogProps) {
  const [departureOrderCode, setDepartureOrderCode] = useState(record.transportOrderCode || "")
  const [departureDate, setDepartureDate] = useState(
    record.plannedDepartureTime
      ? format(new Date(record.plannedDepartureTime), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
  )
  const [departureTime, setDepartureTime] = useState(
    record.plannedDepartureTime
      ? format(new Date(record.plannedDepartureTime), "HH:mm")
      : ""
  )
  const [isLoading, setIsLoading] = useState(false)
  const [notEligibleDialogOpen, setNotEligibleDialogOpen] = useState(false)
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

  const handleEligible = async () => {
    if (!departureOrderCode) {
      toast.warning("Vui lòng nhập lệnh xuất bến")
      return
    }

    if (!departureDate || !departureTime) {
      toast.warning("Vui lòng nhập giờ xuất bến")
      return
    }

    setIsLoading(true)
    try {
      // Combine date and time for planned departure time
      const plannedDepartureTime = new Date(`${departureDate}T${departureTime}`).toISOString()

      const permitShiftId = getShiftIdFromCurrentShift()
      const paymentShiftId = getShiftIdFromCurrentShift()

      // Issue permit first (this will move the vehicle to permit_issued status)
      await dispatchService.issuePermit(record.id, {
        transportOrderCode: departureOrderCode,
        plannedDepartureTime,
        seatCount: record.seatCount || 0,
        permitStatus: 'approved',
        permitShiftId,
      })

      // Then process payment (for monthly payment, amount is 0 or already paid)
      await dispatchService.processPayment(record.id, {
        paymentAmount: 0, // Monthly payment vehicles already paid
        paymentMethod: 'cash',
        paymentShiftId,
      })

      toast.success("Thanh toán và cấp phép thành công!")
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error: any) {
      console.error("Failed to process monthly payment:", error)
      if (error.response?.data?.code === '23505' || error.message?.includes('duplicate key') || error.response?.data?.message?.includes('duplicate key')) {
        toast.error(`Mã lệnh xuất bến ${departureOrderCode} đã tồn tại. Vui lòng nhập mã khác.`)
      } else {
        toast.error("Không thể xử lý thanh toán. Vui lòng thử lại sau.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotEligible = () => {
    if (!departureOrderCode) {
      toast.warning("Vui lòng nhập lệnh xuất bến")
      return
    }
    setNotEligibleDialogOpen(true)
  }

  const handleNotEligibleConfirm = async (
    selectedReasons: string[]
  ) => {
    if (!departureOrderCode || !departureDate || !departureTime) {
      toast.warning("Vui lòng điền đầy đủ các trường bắt buộc")
      setNotEligibleDialogOpen(false)
      return
    }

    setIsLoading(true)
    try {
      const reasonDescriptions: Record<string, string> = {
        driver_license_insufficient: "Không có hoặc có nhưng không đủ số lượng giấy phép lái xe so với số lái xe ghi trên lệnh vận chuyển",
        driver_license_expired: "Giấy phép lái xe đã hết hạn hoặc sử dụng giấy phép lái xe giả",
        driver_license_class_mismatch: "Hạng giấy phép lái xe không phù hợp với các loại xe được phép điều khiển",
        driver_info_mismatch: "Thông tin của lái xe không đúng với thông tin được ghi trên lệnh vận chuyển",
        driver_alcohol: "Lái xe sử dụng rượu bia",
        driver_drugs: "Lái xe sử dụng chất ma tuý"
      }

      const rejectionReason = selectedReasons
        .map(id => reasonDescriptions[id] || id)
        .join('; ')

      const plannedDepartureTime = new Date(`${departureDate}T${departureTime}`).toISOString()
      const permitShiftId = getShiftIdFromCurrentShift()
      const paymentShiftId = getShiftIdFromCurrentShift()

      // Issue permit with rejected status
      await dispatchService.issuePermit(record.id, {
        transportOrderCode: departureOrderCode,
        plannedDepartureTime,
        seatCount: record.seatCount || 0,
        permitStatus: 'rejected',
        rejectionReason: rejectionReason,
        permitShiftId,
      })

      // Process payment
      await dispatchService.processPayment(record.id, {
        paymentAmount: 0,
        paymentMethod: 'cash',
        paymentShiftId,
      })

      toast.success("Đã xử lý thanh toán theo tháng!")
      if (onSuccess) {
        onSuccess()
      }
      setNotEligibleDialogOpen(false)
      onClose()
    } catch (error: any) {
      console.error("Failed to process monthly payment:", error)
      if (error.response?.data?.code === '23505' || error.message?.includes('duplicate key') || error.response?.data?.message?.includes('duplicate key')) {
        toast.error(`Mã lệnh xuất bến ${departureOrderCode} đã tồn tại. Vui lòng nhập mã khác.`)
      } else {
        toast.error("Không thể xử lý thanh toán. Vui lòng thử lại sau.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex justify-end gap-2 pb-4 border-b">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          HỦY
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleNotEligible}
          disabled={isLoading}
        >
          KHÔNG ĐỦ ĐIỀU KIỆN
        </Button>
        <Button
          type="button"
          onClick={handleEligible}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          ĐỦ ĐIỀU KIỆN
        </Button>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
          <Label className="text-sm font-medium text-gray-600">Biển số xe</Label>
          <p className="text-lg font-semibold text-gray-900 mt-1">{record.vehiclePlateNumber}</p>
        </div>

        <div>
          <Label htmlFor="departureOrderCode">
            Lệnh xuất bến <span className="text-red-500">(*)</span>
          </Label>
          <Input
            id="departureOrderCode"
            value={departureOrderCode}
            onChange={(e) => setDepartureOrderCode(e.target.value)}
            className="mt-1"
            required
            placeholder="Nhập mã lệnh xuất bến"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="departureDate">
              Ngày xuất bến <span className="text-red-500">(*)</span>
            </Label>
            <div className="relative mt-1">
              <Input
                id="departureDate"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                required
                className="pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <Label htmlFor="departureTime">
              Giờ xuất bến <span className="text-red-500">(*)</span>
            </Label>
            <div className="relative mt-1">
              <Input
                id="departureTime"
                type="text"
                inputMode="numeric"
                placeholder="HH:mm"
                maxLength={5}
                value={departureTime}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d:]/g, '');
                  setDepartureTime(v);
                }}
                required
                className="pr-10"
              />
              <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Lưu ý:</strong> Xe này đã thanh toán theo tháng. Vui lòng nhập lệnh xuất bến và giờ xuất bến để hoàn tất quy trình.
          </p>
        </div>
      </div>

      {/* Not Eligible Reason Dialog */}
      <LyDoKhongDuDieuKienDialog
        open={notEligibleDialogOpen}
        onClose={() => setNotEligibleDialogOpen(false)}
        onConfirm={handleNotEligibleConfirm}
      />
    </div>
  )
}


