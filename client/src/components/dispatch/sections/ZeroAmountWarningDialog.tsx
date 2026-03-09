import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ZeroAmountWarningDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ZeroAmountWarningDialog({ open, onClose, onConfirm }: ZeroAmountWarningDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Xác nhận</h3>
        </div>
        <p className="text-gray-600 mb-6">
          <span className="text-gray-800 font-medium">Tổng đơn hàng 0 đồng.</span>
          <br />Bạn có muốn tiếp tục?
        </p>
        <div className="flex justify-end gap-3">
          <Button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200 transition-all"
          >
            Hủy
          </Button>
          <Button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all flex items-center gap-2"
          >
            Tiếp tục
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
