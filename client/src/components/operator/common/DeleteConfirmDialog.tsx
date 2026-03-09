import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  open: boolean;
  operatorName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  open,
  operatorName,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-rose-100">
            <AlertCircle className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Xác nhận xóa đơn vị
            </h3>
            <p className="text-sm text-slate-500">
              Thao tác này không thể hoàn tác
            </p>
          </div>
        </div>
        <p className="text-slate-600 mb-6">
          Bạn có chắc chắn muốn xóa đơn vị{" "}
          <strong className="text-slate-800">{operatorName}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
          >
            Hủy
          </Button>
          <Button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white hover:from-rose-600 hover:to-red-600 shadow-lg shadow-rose-500/25 transition-all"
          >
            Xóa đơn vị
          </Button>
        </div>
      </div>
    </div>
  );
}
