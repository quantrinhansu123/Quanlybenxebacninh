import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Operator } from "@/types"
import { OperatorForm } from "./OperatorForm"
import { OperatorView } from "./OperatorView"

interface OperatorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit" | "view"
  operator: Operator | null
  onSuccess: () => void
}

export function OperatorDialog({
  open,
  onOpenChange,
  mode,
  operator,
  onSuccess,
}: OperatorDialogProps) {
  const handleClose = () => {
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] max-w-[1400px] max-h-[95vh] overflow-y-auto p-6"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {mode === "create" && "Thêm đơn vị vận tải mới"}
            {mode === "edit" && "Sửa thông tin đơn vị vận tải"}
            {mode === "view" && "Chi tiết đơn vị vận tải"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {mode === "view" && operator ? (
            <OperatorView operator={operator} />
          ) : (
            <OperatorForm
              operator={operator}
              mode={mode === "view" ? "create" : mode}
              onClose={handleClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
