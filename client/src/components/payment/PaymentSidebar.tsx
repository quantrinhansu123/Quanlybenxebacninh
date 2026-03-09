import { Banknote, User, Building2, Printer, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-toastify";
import type { DispatchRecord } from "@/types";

interface PaymentSidebarProps {
  record: DispatchRecord;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  symbol: string;
  setSymbol: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  printOneCopy: boolean;
  setPrintOneCopy: (value: boolean) => void;
  printTwoCopies: boolean;
  setPrintTwoCopies: (value: boolean) => void;
  isProcessing: boolean;
  onPayment: () => void;
}

export function PaymentSidebar({
  record,
  total,
  subtotal,
  discount,
  tax,
  symbol,
  setSymbol,
  note,
  setNote,
  printOneCopy,
  setPrintOneCopy,
  printTwoCopies,
  setPrintTwoCopies,
  isProcessing,
  onPayment,
}: PaymentSidebarProps) {
  return (
    <Card className="border-0 shadow-lg sticky top-6">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <p className="text-white/80 text-sm">Thực thu</p>
            <p className="text-3xl font-bold">{total.toLocaleString('vi-VN')}đ</p>
          </div>
        </div>
      </div>
      <CardContent className="p-6 space-y-6">
        {/* Symbol */}
        <div>
          <Label className="text-sm text-gray-500">Ký hiệu</Label>
          <Select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="mt-1">
            <option value="QLBX">QLBX</option>
            <option value="KHAC">KHAC</option>
          </Select>
        </div>

        {/* Note */}
        <div>
          <Label className="text-sm text-gray-500">Ghi chú</Label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full min-h-[80px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nhập ghi chú..."
          />
        </div>

        {/* Customer Info */}
        <div className="space-y-3 pt-4 border-t">
          <p className="text-sm font-semibold text-gray-700">Thông tin khách hàng</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Người mua:</span>
              <span className="font-medium">{record.driverName || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Đơn vị:</span>
              <span className="font-medium truncate">{record.vehicle?.operator?.name || '-'}</span>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tổng tiền:</span>
            <span className="font-medium">{subtotal.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Chiết khấu:</span>
            <span className="font-medium">{discount.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Thuế GTGT:</span>
            <span className="font-medium">{tax.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>

        {/* Print Options */}
        <div className="space-y-2 pt-4 border-t">
          <p className="text-sm font-semibold text-gray-700">Tùy chọn in</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={printOneCopy}
                onChange={(e) => {
                  setPrintOneCopy(e.target.checked);
                  if (e.target.checked) setPrintTwoCopies(false);
                }}
              />
              <span className="text-sm">In 1 liên</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={printTwoCopies}
                onChange={(e) => {
                  setPrintTwoCopies(e.target.checked);
                  if (e.target.checked) setPrintOneCopy(false);
                }}
              />
              <span className="text-sm">In 2 liên</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => toast.info("Chức năng đang phát triển")}
          >
            <Printer className="w-4 h-4" />
            Xem trước bản in
          </Button>
          <Button
            className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 h-12 text-lg"
            onClick={onPayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Thanh toán
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
