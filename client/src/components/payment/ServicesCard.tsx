import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Plus, FileText, Receipt, CreditCard, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { ServiceCharge, ServiceType, DispatchRecord, ServiceChargeInput } from "@/types";
import { serviceChargeService } from "@/services/service-charge.service";
import { toast } from "react-toastify";

interface ServicesCardProps {
  record: DispatchRecord;
  serviceCharges: ServiceCharge[];
  serviceTypes: ServiceType[];
  onChargesUpdate: (charges: ServiceCharge[]) => void;
}

export function ServicesCard({ record, serviceCharges, serviceTypes, onChargesUpdate }: ServicesCardProps) {
  const orderId = record.transportOrderCode || `ORDER-${record.id.slice(0, 8)}`;
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set([orderId]));
  const [isAddingService, setIsAddingService] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [newService, setNewService] = useState({
    serviceTypeId: "",
    serviceName: "",
    quantity: 1,
    unitPrice: 0,
  });
  const serviceDropdownRef = useRef<HTMLDivElement>(null);

  const isExpanded = expandedOrders.has(orderId);
  const subtotal = serviceCharges.reduce((sum, charge) => sum + charge.totalAmount, 0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setShowServiceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOrder = () => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) newSet.delete(orderId);
      else newSet.add(orderId);
      return newSet;
    });
  };

  const handleAddServiceClick = () => {
    setIsAddingService(true);
    setExpandedOrders(prev => new Set(prev).add(orderId));
  };

  const handleServiceTypeChange = (serviceTypeId: string) => {
    const selectedType = serviceTypes.find(st => st.id === serviceTypeId);
    setNewService({
      ...newService,
      serviceTypeId,
      serviceName: selectedType?.name || "",
      unitPrice: selectedType?.basePrice || 0,
    });
  };

  const handleSaveService = async () => {
    if (!newService.serviceTypeId || !newService.unitPrice) {
      toast.warning("Vui lòng điền đầy đủ thông tin dịch vụ");
      return;
    }
    if (newService.quantity <= 0) {
      toast.warning("Số lượng phải lớn hơn 0");
      return;
    }

    try {
      const totalAmount = newService.quantity * newService.unitPrice;
      const input: ServiceChargeInput = {
        dispatchRecordId: record.id,
        serviceTypeId: newService.serviceTypeId,
        quantity: newService.quantity,
        unitPrice: newService.unitPrice,
        totalAmount,
      };

      await serviceChargeService.create(input);
      const chargesData = await serviceChargeService.getAll(record.id);
      onChargesUpdate(chargesData);
      setNewService({ serviceTypeId: "", serviceName: "", quantity: 1, unitPrice: 0 });
      setIsAddingService(false);
      toast.success("Thêm dịch vụ thành công!");
    } catch (error) {
      console.error("Failed to add service:", error);
      toast.error("Không thể thêm dịch vụ");
    }
  };

  const handleCancelService = () => {
    setIsAddingService(false);
    setNewService({ serviceTypeId: "", serviceName: "", quantity: 1, unitPrice: 0 });
  };

  const handleDeleteService = async (chargeId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này?")) return;

    try {
      await serviceChargeService.delete(chargeId);
      const chargesData = await serviceChargeService.getAll(record.id);
      onChargesUpdate(chargesData);
      toast.success("Xóa dịch vụ thành công!");
    } catch (error) {
      console.error("Failed to delete service:", error);
      toast.error("Không thể xóa dịch vụ");
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Danh sách dịch vụ
        </CardTitle>
        <Button onClick={handleAddServiceClick} size="sm" className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600">
          <Plus className="w-4 h-4" />
          Thêm dịch vụ
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {/* Order Header */}
        <button
          onClick={toggleOrder}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors border-y"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Mã đơn: {orderId}</p>
              <p className="text-sm text-gray-500">{format(new Date(record.entryTime), "dd/MM/yyyy")}</p>
            </div>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {/* Services List */}
        {isExpanded && (
          <div className="divide-y">
            {/* Add Service Row */}
            {isAddingService && (
              <div className="p-4 bg-blue-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 relative" ref={serviceDropdownRef}>
                    <Label className="text-xs text-gray-500 mb-1 block">Dịch vụ</Label>
                    <Input
                      value={newService.serviceName}
                      onChange={(e) => {
                        setNewService({ ...newService, serviceName: e.target.value });
                        setShowServiceDropdown(true);
                      }}
                      onFocus={() => setShowServiceDropdown(true)}
                      placeholder="Nhập tên dịch vụ..."
                    />
                    {showServiceDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                        {serviceTypes.filter(t =>
                          t.name.toLowerCase().includes(newService.serviceName.toLowerCase())
                        ).map((type) => (
                          <div
                            key={type.id}
                            onClick={() => {
                              handleServiceTypeChange(type.id);
                              setShowServiceDropdown(false);
                            }}
                            className="px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-sm"
                          >
                            {type.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Đơn giá</Label>
                    <Input
                      type="number"
                      value={newService.unitPrice}
                      onChange={(e) => setNewService({ ...newService, unitPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Số lượng</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newService.quantity}
                      onChange={(e) => setNewService({ ...newService, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm">
                    Thành tiền: <span className="font-bold text-blue-600">
                      {(newService.quantity * newService.unitPrice).toLocaleString('vi-VN')}đ
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCancelService}>
                      <X className="w-4 h-4 mr-1" /> Hủy
                    </Button>
                    <Button size="sm" onClick={handleSaveService}>
                      <Check className="w-4 h-4 mr-1" /> Lưu
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {serviceCharges.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">Chưa có dịch vụ nào</p>
                <p className="text-sm text-gray-400 mt-1">Nhấn "Thêm dịch vụ" để bắt đầu</p>
              </div>
            ) : (
              serviceCharges.map((charge) => (
                <div key={charge.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{charge.serviceType?.name || "Dịch vụ"}</p>
                      <p className="text-sm text-gray-500">
                        {charge.quantity} x {charge.unitPrice.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-gray-900">{charge.totalAmount.toLocaleString('vi-VN')}đ</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteService(charge.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}

            {/* Total */}
            {serviceCharges.length > 0 && (
              <div className="p-4 bg-gray-50 flex items-center justify-between">
                <p className="font-semibold text-gray-700">Tổng cộng</p>
                <p className="text-xl font-bold text-emerald-600">{subtotal.toLocaleString('vi-VN')}đ</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
