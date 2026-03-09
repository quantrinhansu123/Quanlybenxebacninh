import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface ZeroAmountWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isProcessing: boolean;
}

export function ZeroAmountWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  isProcessing
}: ZeroAmountWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Cảnh báo thanh toán
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-700">
            Tổng tiền thanh toán là <span className="font-bold text-red-600">0 đồng</span>.
          </p>
          <p className="text-gray-500 mt-2">
            Bạn có chắc chắn muốn tiếp tục?
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-gradient-to-r from-emerald-500 to-teal-500"
          >
            {isProcessing ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
