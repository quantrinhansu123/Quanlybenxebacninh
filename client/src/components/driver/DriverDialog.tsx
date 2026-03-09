import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Driver } from "@/types"
import { DriverForm } from "./DriverForm"
import { DriverView } from "./DriverView"

interface DriverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit" | "view"
  driver: Driver | null
  onSuccess: () => void
}

export function DriverDialog({
  open,
  onOpenChange,
  mode,
  driver,
  onSuccess,
}: DriverDialogProps) {
  const handleClose = () => {
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1400px] max-h-[95vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {mode === "create" && "Thêm lái xe mới"}
            {mode === "edit" && "Sửa thông tin lái xe"}
            {mode === "view" && "Chi tiết lái xe"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {mode === "view" && driver ? (
            <DriverView driver={driver} />
          ) : (
            <DriverForm
              driver={driver}
              mode={mode === "view" ? "create" : mode}
              onClose={handleClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
