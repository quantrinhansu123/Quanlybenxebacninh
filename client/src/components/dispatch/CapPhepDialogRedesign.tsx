import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  FileText, X, Truck, Plus, Camera, Shield, 
  CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp,
  Calendar, Upload, Loader2, ImageIcon, Globe, Construction, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { formatVietnamTime } from "@/utils/timezone";
import { useCapPhepDialog } from "@/hooks/useCapPhepDialog";
import { Button } from "@/components/ui/button";
import { Autocomplete } from "@/components/ui/autocomplete";
import { DatePicker } from "@/components/DatePicker";
import { 
  ServiceChargesSection,
  ZeroAmountWarningDialog,
} from "./sections";
import { KiemTraGiayToDialog } from "./KiemTraGiayToDialog";
import { LyDoKhongDuDieuKienDialog } from "./LyDoKhongDuDieuKienDialog";
import { ThemDichVuDialog } from "./ThemDichVuDialog";
import { ThemTaiXeDialog } from "./ThemTaiXeDialog";
import api from "@/lib/api";
import type { DispatchRecord } from "@/types";

interface CapPhepDialogProps {
  record: DispatchRecord;
  onClose: () => void;
  onSuccess?: () => void;
  open?: boolean;
  readOnly?: boolean;
}

export function CapPhepDialogRedesign({
  record,
  onClose,
  onSuccess,
  open = true,
  readOnly = false,
}: CapPhepDialogProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [notEligibleDialogOpen, setNotEligibleDialogOpen] = useState(false);
  const [addServiceDialogOpen, setAddServiceDialogOpen] = useState(false);
  const [addDriverDialogOpen, setAddDriverDialogOpen] = useState(false);
  const [calendarExpanded, setCalendarExpanded] = useState(true);
  
  // Image upload state
  const [isUploading, setIsUploading] = useState(false);
  const [entryImageUrl, setEntryImageUrl] = useState(record.entryImageUrl || null);
  const [activeImageTab, setActiveImageTab] = useState<"entry" | "vehicle">("entry");

  const hook = useCapPhepDialog(record, onClose, onSuccess);

  // Handle browser back button - close dialog instead of navigating away
  const closedViaBackButtonRef = useRef(false);
  const historyPushedRef = useRef(false);

  // Use ref for callbacks to avoid effect re-runs when parent re-renders
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  useEffect(() => {
    if (!open) {
      historyPushedRef.current = false;
      return;
    }

    // Prevent duplicate pushState (React StrictMode runs effects twice)
    if (historyPushedRef.current) return;

    closedViaBackButtonRef.current = false;
    historyPushedRef.current = true;

    // Push state with current URL - back button will close dialog and stay on same page
    window.history.pushState({ capPhepDialogRedesignOpen: true }, "", window.location.href);

    const handlePopState = () => {
      // User pressed back button - close dialog instead of navigating
      closedViaBackButtonRef.current = true;
      historyPushedRef.current = false;
      setIsAnimating(false);
      setTimeout(() => onCloseRef.current(), 300);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Note: We don't call history.back() here to avoid triggering popstate
    };
  }, [open]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300);
  };

  const handleNotEligibleConfirm = async (
    selectedReasons: string[],
    options: { createOrder: boolean; signAndTransmit: boolean; printDisplay: boolean }
  ) => {
    await hook.handleNotEligibleConfirm(selectedReasons, options);
    setNotEligibleDialogOpen(false);
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const uploadResponse = await api.post<{ url: string }>("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const imageUrl = uploadResponse.data.url;
      await api.patch(`/dispatch/${record.id}/entry-image`, { entryImageUrl: imageUrl });
      setEntryImageUrl(imageUrl);
      toast.success("Đã cập nhật ảnh xe vào bến");
    } catch {
      toast.error("Không thể upload ảnh. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  };

  // Xóa ảnh entry
  const handleRemoveEntryImage = async () => {
    try {
      await api.patch(`/dispatch/${record.id}/entry-image`, { entryImageUrl: null });
      setEntryImageUrl(null);
      toast.success("Đã xóa ảnh xe vào bến");
    } catch {
      toast.error("Không thể xóa ảnh. Vui lòng thử lại.");
    }
  };

  if (!open) return null;

  const overallStatus = hook.getOverallStatus();
  const documents = hook.getDocumentsCheckResults();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Main Dialog - Full Screen */}
      <div
        className={`relative w-full h-full bg-white overflow-hidden transition-all duration-300 ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  {readOnly ? "Xem cấp phép" : "Cấp phép lên nốt"}
                </h1>
                <p className="text-sm text-slate-500">
                  <span className="font-semibold text-slate-700">{record.vehiclePlateNumber}</span>
                  {record.entryTime && (
                    <span className="ml-2">• Vào bến {formatVietnamTime(record.entryTime, "HH:mm dd/MM")}</span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="h-9 px-4 rounded-lg border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </Button>
              {!readOnly && (
                <>
                  <Button
                    onClick={() => setNotEligibleDialogOpen(true)}
                    disabled={hook.isLoading}
                    className="h-9 px-4 rounded-lg bg-rose-500 hover:bg-rose-600 text-white"
                  >
                    Không đủ ĐK
                  </Button>
                  <Button
                    onClick={hook.handleEligible}
                    disabled={hook.isLoading}
                    className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {hook.isLoading ? "Đang xử lý..." : "Đủ điều kiện"}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                onClick={handleClose}
                className="h-9 w-9 p-0 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-80px)]">
          {hook.isInitialLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-slate-500">Đang tải dữ liệu...</p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* 2-Column Layout - 65% : 35% */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* LEFT COLUMN - 2/3 */}
                <div className="lg:col-span-2 space-y-5 order-1">
                  
                  {/* Section 1: Thông tin xe & Tài xế */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Truck className="h-5 w-5 text-blue-600" />
                      <h3 className="text-base font-semibold text-slate-800">Thông tin xe & Tài xế</h3>
                    </div>
                    
                    {/* Row 1: Biển số, Đơn vị VT, Giờ vào */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {/* Biển số đăng ký */}
                      <div>
                        <label className="text-sm font-medium text-slate-500 mb-1.5 block">Biển số ĐK</label>
                        <div className="h-11 px-4 flex items-center bg-white rounded-lg border border-slate-200 text-base font-semibold text-slate-700">
                          {record.vehiclePlateNumber || "---"}
                        </div>
                      </div>
                      
                      {/* Đơn vị vận tải */}
                      <div>
                        <label className="text-sm font-medium text-slate-500 mb-1.5 block">Đơn vị VT</label>
                        <div className="min-h-11 py-2 px-4 flex items-center bg-white rounded-lg border border-slate-200 text-base text-slate-700 break-words" title={hook.operatorNameFromVehicle || ""}>
                          {hook.operatorNameFromVehicle || "---"}
                        </div>
                      </div>
                      
                      {/* Giờ vào bến */}
                      <div>
                        <label className="text-sm font-medium text-slate-500 mb-1.5 block">Giờ vào bến</label>
                        <div className="h-11 px-4 flex items-center bg-white rounded-lg border border-slate-200 text-base text-slate-700">
                          {formatVietnamTime(record.entryTime, "HH:mm dd/MM")}
                        </div>
                      </div>
                    </div>
                    
                    {/* Row 2: Tài xế (full width) */}
                    <div>
                      <label className="text-sm font-medium text-slate-500 mb-1.5 block">Tài xế</label>
                      <div className="h-11 px-4 flex items-center justify-between bg-white rounded-lg border border-slate-200">
                        {hook.drivers.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-white">
                                {hook.drivers[0].fullName.charAt(0)}
                              </span>
                            </div>
                            <span className="text-base text-slate-700">
                              {hook.drivers[0].fullName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-base text-slate-400">Chưa có</span>
                        )}
                        {!readOnly && (
                          <button
                            onClick={() => setAddDriverDialogOpen(true)}
                            className="text-blue-500 hover:text-blue-600 flex-shrink-0 ml-2"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Lệnh vận chuyển (Main Form) */}
                  <div className="bg-white rounded-xl border-2 border-blue-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <h3 className="text-base font-semibold text-slate-800">Lệnh vận chuyển</h3>
                      <span className="text-sm text-rose-500">* Bắt buộc</span>
                    </div>

                    <div className="space-y-5">
                      {/* Row 1: Mã lệnh + Tuyến */}
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label className="text-sm font-medium text-slate-600 mb-2 block">
                            Mã lệnh vận chuyển <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={hook.transportOrderCode}
                            onChange={(e) => hook.setTransportOrderCode(e.target.value)}
                            placeholder="Nhập mã lệnh vận chuyển"
                            readOnly={readOnly}
                            className={`w-full h-11 px-4 rounded-lg border text-base transition-colors ${
                              hook.validationErrors.transportOrderCode 
                                ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" 
                                : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            }`}
                          />
                          {hook.validationErrors.transportOrderCode && (
                            <p className="text-sm text-rose-500 mt-1">{hook.validationErrors.transportOrderCode}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600 mb-2 block">
                            Tuyến vận chuyển <span className="text-rose-500">*</span>
                          </label>
                          <Autocomplete
                            value={hook.routeId}
                            onChange={(value) => hook.setRouteId(value)}
                            options={hook.routes.map((r) => ({
                              value: r.id,
                              label: `${r.routeName}${r.routeCode ? ` (${r.routeCode})` : ""}`,
                            }))}
                            placeholder="Gõ để tìm tuyến..."
                            disabled={readOnly}
                            className={hook.validationErrors.routeId ? "[&_input]:border-rose-400 [&_input]:h-11 [&_input]:text-base" : "[&_input]:h-11 [&_input]:text-base"}
                          />
                        </div>
                      </div>

                      {/* Row 2: Giờ xuất + Ngày xuất */}
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label className="text-sm font-medium text-slate-600 mb-2 block">
                            Giờ xuất bến <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="HH:mm"
                            maxLength={5}
                            value={hook.departureTime}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^\d:]/g, '');
                              hook.setDepartureTime(v);
                            }}
                            readOnly={readOnly}
                            className={`w-full h-11 px-4 rounded-lg border text-base ${
                              hook.validationErrors.departureTime 
                                ? "border-rose-400" 
                                : "border-slate-300 focus:border-blue-500"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600 mb-2 block">
                            Ngày xuất bến <span className="text-rose-500">*</span>
                          </label>
                          <DatePicker
                            date={hook.departureDate ? new Date(hook.departureDate) : null}
                            onDateChange={(date) => hook.setDepartureDate(date ? format(date, "yyyy-MM-dd") : "")}
                            placeholder="Chọn ngày"
                            disabled={readOnly}
                          />
                        </div>
                      </div>

                      {/* Row 3: Số ghế, Số giường */}
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-600 mb-2 block">
                            Số ghế <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={hook.seatCount}
                            onChange={(e) => hook.setSeatCount(e.target.value)}
                            min="1"
                            readOnly={readOnly}
                            className={`w-full h-11 px-4 rounded-lg border text-base text-center font-semibold ${
                              hook.validationErrors.seatCount 
                                ? "border-rose-400" 
                                : "border-slate-300 focus:border-blue-500"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600 mb-2 block">Số giường</label>
                          <input
                            type="number"
                            value={hook.bedCount}
                            onChange={(e) => hook.setBedCount(e.target.value)}
                            min="0"
                            readOnly={readOnly}
                            className="w-full h-11 px-4 rounded-lg border border-slate-300 text-base text-center font-semibold focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600 mb-2 block">Số vé HH</label>
                          <input
                            type="number"
                            value={hook.hhTicketCount}
                            onChange={(e) => hook.setHhTicketCount(e.target.value)}
                            min="0"
                            readOnly={readOnly}
                            className="w-full h-11 px-4 rounded-lg border border-slate-300 text-base text-center font-semibold focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600 mb-2 block">% HH</label>
                          <input
                            type="number"
                            value={hook.hhPercentage}
                            onChange={(e) => hook.setHhPercentage(e.target.value)}
                            min="0"
                            max="100"
                            readOnly={readOnly}
                            className="w-full h-11 px-4 rounded-lg border border-slate-300 text-base text-center font-semibold focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Dịch vụ & Thanh toán */}
                  <ServiceChargesSection
                    readOnly={readOnly}
                    serviceCharges={hook.serviceCharges}
                    totalAmount={hook.totalAmount}
                    serviceDetailsExpanded={hook.serviceDetailsExpanded}
                    setServiceDetailsExpanded={hook.setServiceDetailsExpanded}
                    onAddService={() => setAddServiceDialogOpen(true)}
                    recordId={record.id}
                  />
                </div>

                {/* RIGHT COLUMN - 1/3 */}
                <div className="lg:col-span-1 space-y-5 order-2">
                  
                  {/* Ảnh xe vào bến */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-slate-800 text-base">Ảnh xe</h3>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setActiveImageTab("entry")}
                          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            activeImageTab === "entry"
                              ? "bg-blue-500 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Vào bến
                        </button>
                        <button
                          onClick={() => setActiveImageTab("vehicle")}
                          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            activeImageTab === "vehicle"
                              ? "bg-blue-500 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Đăng ký
                        </button>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="aspect-video rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden relative">
                        {isUploading ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-2" />
                            <p className="text-base text-slate-500">Đang tải...</p>
                          </div>
                        ) : (activeImageTab === "entry" ? entryImageUrl : hook.selectedVehicle?.imageUrl) ? (
                          <img
                            src={activeImageTab === "entry" ? entryImageUrl! : hook.selectedVehicle?.imageUrl!}
                            alt="Ảnh xe"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-slate-300 mb-2" />
                            <p className="text-base text-slate-400">
                              {activeImageTab === "entry" ? "Chưa có ảnh vào bến" : "Chưa có ảnh đăng ký"}
                            </p>
                          </div>
                        )}
                      </div>
                      {activeImageTab === "entry" && !readOnly && (
                        <div className="flex gap-2 mt-4">
                          <label className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-blue-50 text-blue-600 text-base font-medium cursor-pointer hover:bg-blue-100 border border-blue-200 transition-colors">
                            <Upload className="h-5 w-5" />
                            {entryImageUrl ? "Thay đổi ảnh" : "Tải ảnh lên"}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                          {entryImageUrl && (
                            <button
                              onClick={handleRemoveEntryImage}
                              className="h-11 px-4 rounded-lg bg-rose-50 text-rose-600 text-base font-medium hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-2"
                            >
                              <Trash2 className="h-5 w-5" />
                              Xóa
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kiểm tra giấy tờ */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-slate-800 text-base">Kiểm tra giấy tờ</h3>
                      </div>
                      <span className={`text-sm px-3 py-1.5 rounded-full font-bold ${
                        overallStatus.isValid
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}>
                        {overallStatus.validCount}/{overallStatus.totalCount} OK
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-2 gap-3">
                        {documents.map((doc, idx) => {
                          const isOk = doc.status === "valid" || doc.status === "expiring_soon";
                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-2 p-3 rounded-lg border ${
                                isOk 
                                  ? "bg-emerald-50 border-emerald-200" 
                                  : "bg-rose-50 border-rose-200"
                              }`}
                            >
                              {isOk ? (
                                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                              ) : doc.status === "expiring_soon" ? (
                                <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                              )}
                              <span className={`text-sm font-medium truncate ${
                                isOk ? "text-emerald-700" : "text-rose-700"
                              }`}>
                                {doc.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setDocumentDialogOpen(true)}
                        className="w-full mt-4 h-10 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Xem chi tiết & Chỉnh sửa
                      </button>
                    </div>
                  </div>

                  {/* Lịch tháng (Collapsible) */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <button
                      onClick={() => setCalendarExpanded(!calendarExpanded)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-slate-800 text-base">Lịch hoạt động tháng</h3>
                      </div>
                      {calendarExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </button>
                    {calendarExpanded && (
                      <div className="px-5 pb-5">
                        <MiniCalendar 
                          departureDate={hook.departureDate}
                          dailyTripCounts={hook.dailyTripCounts}
                        />
                      </div>
                    )}
                  </div>

                  {/* Kiểm tra GSHT (Đang phát triển) */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden opacity-60">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-slate-400" />
                        <h3 className="font-semibold text-slate-500 text-base">Kiểm tra GSHT</h3>
                      </div>
                      <span className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                        <Construction className="h-4 w-4" />
                        Đang phát triển
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="text-center py-4">
                        <Globe className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">
                          Tính năng kiểm tra Giám sát hành trình sẽ được tích hợp trong phiên bản tiếp theo
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <label className="text-sm font-medium text-slate-600 mb-2 block">Ghi chú</label>
                    <textarea
                      placeholder="Nhập ghi chú (nếu có)..."
                      readOnly={readOnly}
                      className="w-full h-24 px-4 py-3 rounded-lg border border-slate-200 text-base resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialogs */}
        {record.vehicleId && (
          <KiemTraGiayToDialog
            vehicleId={record.vehicleId}
            open={documentDialogOpen}
            onClose={() => setDocumentDialogOpen(false)}
            onSuccess={hook.handleDocumentDialogSuccess}
          />
        )}
        <LyDoKhongDuDieuKienDialog
          open={notEligibleDialogOpen}
          onClose={() => setNotEligibleDialogOpen(false)}
          onConfirm={handleNotEligibleConfirm}
        />
        {record.id && (
          <ThemDichVuDialog
            dispatchRecordId={record.id}
            open={addServiceDialogOpen}
            onClose={() => setAddServiceDialogOpen(false)}
            onSuccess={hook.handleAddServiceSuccess}
          />
        )}
        <ThemTaiXeDialog
          operatorId={hook.selectedOperatorId || undefined}
          open={addDriverDialogOpen}
          onClose={() => setAddDriverDialogOpen(false)}
          onSuccess={hook.handleAddDriverSuccess}
        />
        <ZeroAmountWarningDialog
          open={hook.showZeroAmountConfirm}
          onClose={() => hook.setShowZeroAmountConfirm(false)}
          onConfirm={() => {
            hook.setShowZeroAmountConfirm(false);
            hook.submitPermit();
          }}
        />
      </div>
    </div>,
    document.body
  );
}

// Mini Calendar Component
function MiniCalendar({ 
  departureDate, 
  dailyTripCounts 
}: { 
  departureDate: string; 
  dailyTripCounts: Record<number, number>;
}) {
  const today = new Date();
  const currentDay = today.getDate();
  const selectedDate = departureDate ? new Date(departureDate) : new Date();
  const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const isCurrentMonth = selectedDate.getMonth() === today.getMonth() && selectedDate.getFullYear() === today.getFullYear();

  const getBgColor = (count: number) => {
    if (count === 0) return "bg-slate-100";
    if (count <= 2) return "bg-emerald-200";
    if (count <= 5) return "bg-emerald-400 text-white";
    return "bg-emerald-600 text-white";
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-400">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }, (_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const count = dailyTripCounts[day] || 0;
          const isToday = isCurrentMonth && day === currentDay;
          const isSelected = departureDate && new Date(departureDate).getDate() === day;

          return (
            <div
              key={day}
              className={`
                aspect-square rounded flex items-center justify-center text-xs font-medium
                ${getBgColor(count)}
                ${isToday ? "ring-2 ring-blue-500" : ""}
                ${isSelected ? "ring-2 ring-orange-500" : ""}
              `}
              title={`Ngày ${day}: ${count} xe`}
            >
              {day}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span>Tổng: <strong className="text-emerald-600">{Object.values(dailyTripCounts).reduce((a, b) => a + b, 0)}</strong> chuyến</span>
        <span>Max/ngày: <strong>{Math.max(...Object.values(dailyTripCounts), 0)}</strong></span>
      </div>
    </div>
  );
}
