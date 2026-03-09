import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useUIStore } from "@/store/ui.store"
import { shiftService, type Shift } from "@/services/shift.service"

interface ShiftSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShiftSelectionDialog({ open, onOpenChange }: ShiftSelectionDialogProps) {
  const { currentShift, setCurrentShift } = useUIStore()
  const [selectedShift, setSelectedShift] = useState(currentShift)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadShifts()
      setSelectedShift(currentShift)
    }
  }, [open, currentShift])

  const loadShifts = async () => {
    setIsLoading(true)
    try {
      const data = await shiftService.getAll()
      setShifts(data)
    } catch (error) {
      console.error("Failed to load shifts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatShiftName = (shift: Shift) => {
    return `${shift.name} (${shift.startTime} - ${shift.endTime})`
  }

  const handleSave = () => {
    setCurrentShift(selectedShift)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Chọn ca trực</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="text-center py-4">Đang tải...</div>
          ) : (
            <RadioGroup value={selectedShift} onValueChange={setSelectedShift}>
              {shifts.map((shift) => {
                const displayName = formatShiftName(shift)
                return (
                  <div key={shift.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={displayName} id={shift.id} />
                    <Label htmlFor={shift.id}>{displayName}</Label>
                  </div>
                )
              })}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="<Trống>" id="empty" />
                <Label htmlFor="empty">Không chọn (Trống)</Label>
              </div>
            </RadioGroup>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave}>Lưu thay đổi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
