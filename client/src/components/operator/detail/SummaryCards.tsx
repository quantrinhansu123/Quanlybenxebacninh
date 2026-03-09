import { memo } from "react";
import { Car, TrendingUp, DollarSign, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SummaryCardsProps {
  vehicleCount: number;
  totalDebt: number;
  totalPaid: number;
  invoiceCount: number;
  formatCurrency: (amount: number) => string;
}

export const SummaryCards = memo(function SummaryCards({
  vehicleCount,
  totalDebt,
  totalPaid,
  invoiceCount,
  formatCurrency,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Car className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng số xe</p>
              <p className="text-2xl font-bold text-gray-900">{vehicleCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng công nợ</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalDebt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Đã thanh toán</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tổng hóa đơn</p>
              <p className="text-2xl font-bold text-gray-900">{invoiceCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
