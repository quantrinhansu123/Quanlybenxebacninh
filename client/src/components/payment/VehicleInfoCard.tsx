import { Bus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatVietnamTime } from "@/utils/timezone";
import type { DispatchRecord } from "@/types";

interface VehicleInfoCardProps {
  record: DispatchRecord;
}

export function VehicleInfoCard({ record }: VehicleInfoCardProps) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Bus className="w-8 h-8" />
          </div>
          <div>
            <p className="text-white/80 text-sm">Biển kiểm soát</p>
            <p className="text-3xl font-bold">{record.vehiclePlateNumber}</p>
          </div>
        </div>
      </div>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Tuyến vận chuyển</p>
            <p className="font-semibold text-gray-900">{record.routeName || 'Chưa có'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Giờ vào bến</p>
            <p className="font-semibold text-gray-900">
              {formatVietnamTime(record.entryTime, "HH:mm dd/MM/yyyy")}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Giờ xuất bến KH</p>
            <p className="font-semibold text-gray-900">
              {record.plannedDepartureTime
                ? formatVietnamTime(record.plannedDepartureTime, "HH:mm dd/MM/yyyy")
                : 'Chưa có'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Số ghế</p>
            <p className="font-semibold text-gray-900">{record.seatCount || 'N/A'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
