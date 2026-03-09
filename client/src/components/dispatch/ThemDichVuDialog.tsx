import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { serviceService } from "@/services/service.service";
import { serviceChargeService } from "@/services/service-charge.service";
import type { Service } from "@/types";

// Utility functions for number formatting
const formatCurrency = (value: number): string => {
  return value.toLocaleString("vi-VN");
};

const parseCurrency = (value: string): number => {
  return parseInt(value.replace(/[^\d]/g, "")) || 0;
};

interface ThemDichVuDialogProps {
  dispatchRecordId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Skip history pushState when dialog is nested inside another dialog */
  skipHistoryManagement?: boolean;
}

export function ThemDichVuDialog({
  dispatchRecordId,
  open,
  onClose,
  onSuccess,
  skipHistoryManagement = false,
}: ThemDichVuDialogProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [unitPriceDisplay, setUnitPriceDisplay] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Handle browser back button - close dialog instead of navigating away
  const closedViaBackButtonRef = useRef(false);
  const historyPushedRef = useRef(false);

  // Use ref for callbacks to avoid effect re-runs when parent re-renders
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      loadServices();
      setQuantity(1);
      setUnitPrice(0);
      setUnitPriceDisplay("");
      setSelectedServiceTypeId("");
    }
  }, [open]);

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
    window.history.pushState({ themDichVuDialogOpen: true }, "", window.location.href);

    const handlePopState = () => {
      // User pressed back button - close dialog instead of navigating
      closedViaBackButtonRef.current = true;
      historyPushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Note: We don't call history.back() here to avoid triggering popstate
      // The extra history entry will be cleaned up naturally on next navigation
    };
  }, [open, skipHistoryManagement]);

  const loadServices = async () => {
    try {
      const data = await serviceService.getAll(true); // Only active services
      setServices(data);
    } catch (error) {
      console.error("Failed to load services:", error);
      toast.error("Không thể tải danh sách dịch vụ");
    }
  };

  const handleServiceTypeChange = (serviceId: string) => {
    setSelectedServiceTypeId(serviceId);
    // Service doesn't have basePrice, so keep current price or set to 0
    // User can manually enter the price
    if (unitPrice === 0) {
      setUnitPrice(0);
      setUnitPriceDisplay("");
    }
  };

  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numericValue = parseCurrency(inputValue);
    setUnitPrice(numericValue);
    setUnitPriceDisplay(formatCurrency(numericValue));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceTypeId) {
      toast.warning("Vui lòng chọn loại dịch vụ");
      return;
    }

    setIsLoading(true);
    try {
      await serviceChargeService.create({
        dispatchRecordId,
        serviceTypeId: selectedServiceTypeId,
        quantity,
        unitPrice,
        totalAmount: quantity * unitPrice,
      });
      toast.success("Thêm dịch vụ thành công");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to add service:", error);
      toast.error("Không thể thêm dịch vụ");
    } finally {
      setIsLoading(false);
    }
  };

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
        className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold mb-4">Thêm dịch vụ</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="serviceType">Loại dịch vụ</Label>
            <Select
              id="serviceType"
              value={selectedServiceTypeId}
              onChange={(e) => handleServiceTypeChange(e.target.value)}
              required
              className="mt-1"
            >
              <option value="">Chọn dịch vụ</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.code})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">Số lượng</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="unitPrice">Đơn giá (VNĐ)</Label>
            <Input
              id="unitPrice"
              type="text"
              value={unitPriceDisplay}
              onChange={handleUnitPriceChange}
              placeholder="0"
              className="mt-1"
              required
            />
          </div>

          <div className="pt-2 border-t flex justify-between items-center">
            <span className="font-semibold">Thành tiền:</span>
            <span className="font-bold text-lg text-blue-600">
              {formatCurrency(quantity * unitPrice)} VNĐ
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : "Thêm"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
