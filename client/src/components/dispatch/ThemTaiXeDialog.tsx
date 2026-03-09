import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { X, Search, User, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { driverService } from "@/services/driver.service";
import type { Driver, DriverInput } from "@/types";

interface ThemTaiXeDialogProps {
  operatorId?: string;  // Optional - load all drivers if not provided
  open: boolean;
  onClose: () => void;
  onSuccess: (driver: Driver) => void;
  /** Skip history pushState when dialog is nested inside another dialog */
  skipHistoryManagement?: boolean;
}

export function ThemTaiXeDialog({
  operatorId,
  open,
  onClose,
  onSuccess,
  skipHistoryManagement = false,
}: ThemTaiXeDialogProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Toggle between "select" mode and "create" mode
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  // Create form fields
  const [newDriver, setNewDriver] = useState({
    fullName: "",
    idNumber: "",
    phone: "",
    licenseNumber: "",
    licenseClass: "",
    licenseExpiryDate: "",
  });

  // Handle browser back button - close dialog instead of navigating away
  const closedViaBackButtonRef = useRef(false);
  const historyPushedRef = useRef(false);

  // Use ref for callbacks to avoid effect re-runs when parent re-renders
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      loadDrivers();
      setShowCreateForm(false);
      resetCreateForm();
    }
  }, [open, operatorId]);

  useEffect(() => {
    if (!open) {
      historyPushedRef.current = false;
      return;
    }
    // Skip history management when nested inside another dialog
    if (skipHistoryManagement) return;

    // Prevent duplicate pushState (React StrictMode runs effects twice)
    if (historyPushedRef.current) return;

    closedViaBackButtonRef.current = false;
    historyPushedRef.current = true;

    // Push state with current URL - back button will close dialog and stay on same page
    window.history.pushState({ themTaiXeDialogOpen: true }, "", window.location.href);

    const handlePopState = () => {
      // User pressed back button - close dialog instead of navigating
      closedViaBackButtonRef.current = true;
      historyPushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [open, skipHistoryManagement]);

  const resetCreateForm = () => {
    setNewDriver({
      fullName: "",
      idNumber: "",
      phone: "",
      licenseNumber: "",
      licenseClass: "",
      licenseExpiryDate: "",
    });
  };

  const loadDrivers = async () => {
    setIsLoading(true);
    try {
      // Load drivers for specific operator, or all drivers if no operatorId
      const data = await driverService.getAll(operatorId || undefined, true);
      setDrivers(data);
    } catch (error) {
      console.error("Failed to load drivers:", error);
      toast.error("Không thể tải danh sách tài xế");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (driver: Driver) => {
    onSuccess(driver);
    onClose();
  };

  const handleCreateDriver = async () => {
    // Validation
    if (!newDriver.fullName.trim()) {
      toast.error("Vui lòng nhập họ và tên");
      return;
    }
    if (!newDriver.licenseNumber.trim()) {
      toast.error("Vui lòng nhập số GPLX");
      return;
    }
    if (!newDriver.licenseClass.trim()) {
      toast.error("Vui lòng nhập hạng GPLX");
      return;
    }

    setIsCreating(true);
    try {
      const input: DriverInput = {
        operatorIds: operatorId ? [operatorId] : [],
        fullName: newDriver.fullName.trim(),
        idNumber: newDriver.idNumber.trim() || "",
        phone: newDriver.phone.trim() || undefined,
        licenseNumber: newDriver.licenseNumber.trim(),
        licenseClass: newDriver.licenseClass.trim(),
        licenseExpiryDate: newDriver.licenseExpiryDate || new Date().toISOString().split("T")[0],
      };

      const created = await driverService.create(input);
      toast.success("Thêm tài xế thành công");
      // Auto-select the newly created driver
      onSuccess(created);
      onClose();
    } catch (error) {
      console.error("Failed to create driver:", error);
      toast.error("Không thể thêm tài xế. Vui lòng thử lại.");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredDrivers = drivers.filter(
    (d) =>
      d.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone?.includes(searchTerm)
  );

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        {showCreateForm ? (
          <>
            {/* Create Driver Form */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold">Thêm tài xế mới</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Họ và tên (*)</Label>
                  <Input
                    value={newDriver.fullName}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Nhập họ và tên..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">CMND/CCCD</Label>
                  <Input
                    value={newDriver.idNumber}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, idNumber: e.target.value }))}
                    placeholder="Số CMND/CCCD..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Số điện thoại</Label>
                  <Input
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Số điện thoại..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Số GPLX (*)</Label>
                  <Input
                    value={newDriver.licenseNumber}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, licenseNumber: e.target.value }))}
                    placeholder="Số giấy phép lái xe..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Hạng GPLX (*)</Label>
                  <Input
                    value={newDriver.licenseClass}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, licenseClass: e.target.value }))}
                    placeholder="VD: B2, C, D, E..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Ngày hết hạn GPLX</Label>
                  <Input
                    type="date"
                    value={newDriver.licenseExpiryDate}
                    onChange={(e) => setNewDriver(prev => ({ ...prev, licenseExpiryDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreateDriver} disabled={isCreating}>
                {isCreating ? "Đang lưu..." : "Lưu và chọn"}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Select Driver Mode */}
            <div className="flex items-center justify-between mb-4 pr-8">
              <h2 className="text-xl font-bold">Chọn tài xế</h2>
              <Button
                size="sm"
                onClick={() => setShowCreateForm(true)}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Thêm mới
              </Button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tên, số GPLX, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex-1 overflow-y-auto border rounded-md">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 font-medium sticky top-0">
                  <tr>
                    <th className="px-4 py-3 w-16">Ảnh</th>
                    <th className="px-4 py-3">Họ và tên</th>
                    <th className="px-4 py-3">Số GPLX</th>
                    <th className="px-4 py-3">Hạng</th>
                    <th className="px-4 py-3">SĐT</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        Đang tải...
                      </td>
                    </tr>
                  ) : filteredDrivers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        <div className="space-y-2">
                          <p>Không tìm thấy tài xế nào</p>
                          <button
                            onClick={() => setShowCreateForm(true)}
                            className="text-blue-600 font-medium hover:text-blue-700"
                          >
                            + Thêm tài xế mới
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {driver.imageUrl ? (
                            <img
                              src={driver.imageUrl}
                              alt={driver.fullName}
                              className="w-10 h-10 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">{driver.fullName}</td>
                        <td className="px-4 py-3">{driver.licenseNumber}</td>
                        <td className="px-4 py-3">{driver.licenseClass}</td>
                        <td className="px-4 py-3">{driver.phone || "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleSelect(driver)}
                            className="h-8"
                          >
                            Chọn
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
