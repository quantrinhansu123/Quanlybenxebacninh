import { useState, useMemo, useEffect } from "react";
import { toast } from "react-toastify";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/DatePicker";
import { dispatchService } from "@/services/dispatch.service";
import type { DispatchRecord } from "@/types";
import { formatVietnamDateTime } from "@/lib/vietnam-time";
import { useUIStore } from "@/store/ui.store";
import { useQueryCache } from "@/lib/query-cache";
import type { Shift } from "@/services/shift.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ChoNhieuXeRaBenDialogProps {
  records: DispatchRecord[];
  onClose: () => void;
  onSuccess?: () => void;
  open?: boolean;
}

export function ChoNhieuXeRaBenDialog({
  records,
  onClose,
  onSuccess,
  open = true,
}: ChoNhieuXeRaBenDialogProps) {
  const [exitTime, setExitTime] = useState<Date | undefined>(new Date());
  const [passengerCount, setPassengerCount] = useState(0);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const { currentShift } = useUIStore();

  // Helper function to get shift ID from currentShift string
  const getShiftIdFromCurrentShift = (): string | undefined => {
    if (!currentShift || currentShift === '<Trống>') {
      return undefined;
    }

    const currentShifts = useUIStore.getState().shifts;
    if (currentShifts.length === 0) {
      return undefined;
    }

    const match = currentShift.match(/^(.+?)\s*\(/);
    if (!match) {
      return undefined;
    }

    const shiftName = match[1].trim();
    const foundShift = currentShifts.find((shift: Shift) => shift.name === shiftName);
    return foundShift?.id;
  };

  useEffect(() => {
    // Load shifts if not already loaded
    const { shifts: currentShifts, loadShifts } = useUIStore.getState();
    if (currentShifts.length === 0) {
      loadShifts();
    }
  }, []);
  
  // Filter states for each column
  const [filters, setFilters] = useState({
    plateNumber: "",
    plateNumberOnEntry: "",
    entryTime: "",
    route: "",
    orderCode: "",
    plannedExitTime: "",
    driver: "",
  });

  // Filter records based on search criteria
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const plateNumber = record.vehiclePlateNumber?.toLowerCase() || "";
      const plateNumberOnEntry = record.vehiclePlateNumber?.toLowerCase() || "";
      const entryTimeStr = record.entryTime ? formatVietnamDateTime(record.entryTime) : "";
      const route = record.routeName?.toLowerCase() || "";
      const orderCode = record.transportOrderCode?.toLowerCase() || "";
      const plannedExitTime = record.plannedDepartureTime ? formatVietnamDateTime(record.plannedDepartureTime) : "";
      const driver = record.driverName?.toLowerCase() || "";

      return (
        plateNumber.includes(filters.plateNumber.toLowerCase()) &&
        plateNumberOnEntry.includes(filters.plateNumberOnEntry.toLowerCase()) &&
        entryTimeStr.toLowerCase().includes(filters.entryTime.toLowerCase()) &&
        route.includes(filters.route.toLowerCase()) &&
        orderCode.includes(filters.orderCode.toLowerCase()) &&
        plannedExitTime.toLowerCase().includes(filters.plannedExitTime.toLowerCase()) &&
        driver.includes(filters.driver.toLowerCase())
      );
    });
  }, [records, filters]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(new Set(filteredRecords.map((r) => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleSelectRecord = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleSubmit = async () => {
    if (!exitTime) {
      toast.error("Vui lòng chọn thời gian ra bến");
      return;
    }

    if (selectedRecords.size === 0) {
      toast.error("Vui lòng chọn ít nhất một xe");
      return;
    }

    setIsLoading(true);
    try {
      console.log('[MultiExit] Processing:', selectedRecords.size);
      const exitShiftId = getShiftIdFromCurrentShift();
      const promises = Array.from(selectedRecords).map((recordId) => {
        console.log('[MultiExit] Exit for:', recordId);
        return dispatchService.recordExit(
          recordId,
          exitTime.toISOString(),
          passengerCount,
          exitShiftId
        );
      });

      const results = await Promise.all(promises);
      console.log('[MultiExit] Results:', results);

      toast.success(`Cho ${selectedRecords.size} xe ra bến thành công!`);

      // Invalidate dispatch cache so XeXuatBen page gets fresh data
      useQueryCache.getState().invalidate('dispatch');

      if (onSuccess) {
        console.log('[MultiExit] Calling onSuccess');
        await Promise.resolve(onSuccess());
      }
      onClose();
    } catch (error) {
      console.error('[MultiExit] Failed:', error);
      toast.error(`Không thể cho xe ra bến: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  const allSelected = filteredRecords.length > 0 && selectedRecords.size === filteredRecords.length;
  const someSelected = selectedRecords.size > 0 && selectedRecords.size < filteredRecords.length;

  return (
    <div className="space-y-6">
      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="exitTime" className="text-sm font-medium text-gray-700 mb-1 block">
            Thời gian ra bến (*)
          </Label>
          <DateTimePicker
            date={exitTime || null}
            onDateChange={setExitTime}
          />
        </div>

        <div>
          <Label htmlFor="passengerCount" className="text-sm font-medium text-gray-700 mb-1 block">
            Số khách xuất bến
          </Label>
          <div className="flex items-center gap-2">      
            <Input
              id="passengerCount"
              type="number"
              value={passengerCount}
              onChange={(e) => setPassengerCount(parseInt(e.target.value) || 0)}
              className="flex-1 text-center"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someSelected;
                      }
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4"
                  />
                </TableHead>
                <TableHead className="min-w-[120px]">Biến số xe</TableHead>
                <TableHead className="min-w-[120px]">Biến số khi vào</TableHead>
                <TableHead className="min-w-[150px]">Thời gian vào bến</TableHead>
                <TableHead className="min-w-[150px]">Tuyến vận chuyển</TableHead>
                <TableHead className="min-w-[120px]">Mã lệnh</TableHead>
                <TableHead className="min-w-[150px]">Giờ xuất bến kế hoạch</TableHead>
                <TableHead className="min-w-[120px]">Lái xe</TableHead>
              </TableRow>
              {/* Filter Row */}
              <TableRow className="bg-gray-50">
                <TableHead></TableHead>
                <TableHead>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm..."
                      value={filters.plateNumber}
                      onChange={(e) => setFilters({ ...filters, plateNumber: e.target.value })}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm..."
                      value={filters.plateNumberOnEntry}
                      onChange={(e) => setFilters({ ...filters, plateNumberOnEntry: e.target.value })}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm..."
                      value={filters.entryTime}
                      onChange={(e) => setFilters({ ...filters, entryTime: e.target.value })}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm..."
                      value={filters.route}
                      onChange={(e) => setFilters({ ...filters, route: e.target.value })}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm..."
                      value={filters.orderCode}
                      onChange={(e) => setFilters({ ...filters, orderCode: e.target.value })}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm..."
                      value={filters.plannedExitTime}
                      onChange={(e) => setFilters({ ...filters, plannedExitTime: e.target.value })}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm..."
                      value={filters.driver}
                      onChange={(e) => setFilters({ ...filters, driver: e.target.value })}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    Không có dữ liệu!
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedRecords.has(record.id)}
                        onChange={(e) => handleSelectRecord(record.id, e.target.checked)}
                        className="w-4 h-4"
                      />
                    </TableCell>
                    <TableCell>{record.vehiclePlateNumber || "-"}</TableCell>
                    <TableCell>{record.vehiclePlateNumber || "-"}</TableCell>
                    <TableCell>
                      {record.entryTime ? formatVietnamDateTime(record.entryTime) : "-"}
                    </TableCell>
                    <TableCell>{record.routeName || "-"}</TableCell>
                    <TableCell>{record.transportOrderCode || "-"}</TableCell>
                    <TableCell>
                      {record.plannedDepartureTime ? formatVietnamDateTime(record.plannedDepartureTime) : "-"}
                    </TableCell>
                    <TableCell>{record.driverName || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          HỦY
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || selectedRecords.size === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading
            ? "Đang xử lý..."
            : `XÁC NHẬN CHO ${selectedRecords.size > 0 ? selectedRecords.size : ""} XE ĐÃ CHỌN RA BẾN`}
        </Button>
      </div>
    </div>
  );
}

