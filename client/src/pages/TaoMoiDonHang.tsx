import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { 
  Plus, 
  Trash2, 
  Check, 
  X,
  RefreshCw,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DateTimePicker } from "@/components/DatePicker"
import { dispatchService } from "@/services/dispatch.service"
import { serviceChargeService } from "@/services/service-charge.service"
import { vehicleService } from "@/services/vehicle.service"
import { operatorService } from "@/services/operator.service"
import { routeService } from "@/services/route.service"
import { driverService } from "@/services/driver.service"
import type { ServiceType, ServiceChargeInput, Operator, Vehicle, Route, Driver } from "@/types"
import { useUIStore } from "@/store/ui.store"

interface ServiceItem {
  id: string
  serviceTypeId: string
  serviceName: string
  unitPrice: number
  quantity: number
  discountAmount: number
  discountPercent: number
  taxPercent: number
  amountBeforeDiscount: number
  totalAmount: number
}

export default function TaoMoiDonHang() {
  const navigate = useNavigate()
  const setTitle = useUIStore((state) => state.setTitle)
  
  // Form state
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date())
  const [operatorId, setOperatorId] = useState("")
  const [vehicleId, setVehicleId] = useState("")
  const [routeId, setRouteId] = useState("")
  const [orderType, setOrderType] = useState("thanh-toan-chuyen")
  const [status, setStatus] = useState("da-xac-nhan")
  const [invoiceSymbol, setInvoiceSymbol] = useState("QLBX")
  
  // Service list state
  const [services, setServices] = useState<ServiceItem[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [isAddingService, setIsAddingService] = useState(false)
  const [newService, setNewService] = useState({
    serviceTypeId: "",
    serviceName: "",
    quantity: 1,
    unitPrice: 0,
    discountAmount: 0,
    discountPercent: 0,
    taxPercent: 0,
  })
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const serviceDropdownRef = useRef<HTMLDivElement>(null)
  const serviceInputRef = useRef<HTMLInputElement>(null)
  
  // Dropdown data
  const [operators, setOperators] = useState<Operator[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])
  
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    setTitle("Quản lý đơn hàng > Tạo mới")
    loadInitialData()
  }, [setTitle])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        if (serviceInputRef.current && !serviceInputRef.current.contains(event.target as Node)) {
          setShowServiceDropdown(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const updateDropdownPosition = () => {
      if (showServiceDropdown && serviceInputRef.current) {
        const rect = serviceInputRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
        })
      }
    }

    if (showServiceDropdown) {
      updateDropdownPosition()
      window.addEventListener('scroll', updateDropdownPosition, true)
      window.addEventListener('resize', updateDropdownPosition)
    }

    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true)
      window.removeEventListener('resize', updateDropdownPosition)
    }
  }, [showServiceDropdown])

  useEffect(() => {
    // Filter vehicles by operator
    if (operatorId) {
      const filtered = vehicles.filter(v => v.operatorId === operatorId)
      setFilteredVehicles(filtered)
      // Reset vehicle selection if current vehicle doesn't belong to selected operator
      if (vehicleId && !filtered.find(v => v.id === vehicleId)) {
        setVehicleId("")
      }
      // Load drivers for selected operator
      loadDrivers(operatorId)
    } else {
      setFilteredVehicles(vehicles)
      setDrivers([])
    }
  }, [operatorId, vehicles, vehicleId])

  const loadDrivers = async (opId: string) => {
    try {
      const driversData = await driverService.getAll(opId, true)
      setDrivers(driversData)
    } catch (error) {
      console.error("Failed to load drivers:", error)
      setDrivers([])
    }
  }

  const loadInitialData = async () => {
    try {
      const [operatorsData, vehiclesData, routesData, serviceTypesData] = await Promise.all([
        operatorService.getAll(true),
        vehicleService.getAll(undefined, true),
        routeService.getAll(undefined, undefined, true),
        serviceChargeService.getServiceTypes(true)
      ])
      setOperators(operatorsData)
      setVehicles(vehiclesData)
      setFilteredVehicles(vehiclesData)
      setRoutes(routesData)
      setServiceTypes(serviceTypesData)
    } catch (error) {
      console.error("Failed to load initial data:", error)
      toast.error("Không thể tải dữ liệu. Vui lòng thử lại sau.")
    }
  }

  const handleServiceTypeChange = (serviceTypeId: string) => {
    const selectedType = serviceTypes.find(st => st.id === serviceTypeId)
    if (selectedType) {
      setNewService({
        ...newService,
        serviceTypeId,
        serviceName: selectedType.name,
        unitPrice: selectedType.basePrice,
      })
      setShowServiceDropdown(false)
    }
  }

  const calculateServiceAmounts = (service: typeof newService) => {
    const amountBeforeDiscount = service.quantity * service.unitPrice
    const discountAmount = service.discountAmount || (amountBeforeDiscount * service.discountPercent / 100)
    const subtotal = amountBeforeDiscount - discountAmount
    const taxAmount = subtotal * service.taxPercent / 100
    const totalAmount = subtotal + taxAmount
    
    return {
      amountBeforeDiscount,
      discountAmount,
      totalAmount,
    }
  }

  const handleAddService = () => {
    if (!newService.serviceTypeId || !newService.unitPrice) {
      toast.warning("Vui lòng chọn dịch vụ và nhập đơn giá")
      return
    }

    if (newService.quantity <= 0) {
      toast.warning("Số lượng phải lớn hơn 0")
      return
    }

    const { amountBeforeDiscount, discountAmount, totalAmount } = calculateServiceAmounts(newService)
    
    const serviceItem: ServiceItem = {
      id: `temp-${Date.now()}-${Math.random()}`,
      serviceTypeId: newService.serviceTypeId,
      serviceName: newService.serviceName,
      unitPrice: newService.unitPrice,
      quantity: newService.quantity,
      discountAmount,
      discountPercent: newService.discountPercent,
      taxPercent: newService.taxPercent,
      amountBeforeDiscount,
      totalAmount,
    }

    setServices([...services, serviceItem])
    setNewService({
      serviceTypeId: "",
      serviceName: "",
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      discountPercent: 0,
      taxPercent: 0,
    })
    setIsAddingService(false)
  }

  const handleCancelAddService = () => {
    setIsAddingService(false)
    setNewService({
      serviceTypeId: "",
      serviceName: "",
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      discountPercent: 0,
      taxPercent: 0,
    })
  }

  const handleDeleteService = (id: string) => {
    setServices(services.filter(s => s.id !== id))
  }

  const calculateTotals = () => {
    const subtotal = services.reduce((sum, s) => sum + s.totalAmount, 0)
    const totalDiscount = services.reduce((sum, s) => sum + s.discountAmount, 0)
    const totalTax = services.reduce((sum, s) => {
      const subtotalItem = s.amountBeforeDiscount - s.discountAmount
      return sum + (subtotalItem * s.taxPercent / 100)
    }, 0)
    const total = subtotal
    
    return { subtotal, discount: totalDiscount, tax: totalTax, total }
  }

  const handleCreateOrder = async () => {
    // Validation
    if (!operatorId) {
      toast.warning("Vui lòng chọn đơn vị vận tải")
      return
    }

    if (!vehicleId) {
      toast.warning("Vui lòng chọn phương tiện")
      return
    }

    if (!routeId) {
      toast.warning("Vui lòng chọn tuyến vận chuyển")
      return
    }

    if (services.length === 0) {
      toast.warning("Vui lòng thêm ít nhất một dịch vụ")
      return
    }

    // Get vehicle to find driver
    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (!vehicle) {
      toast.error("Không tìm thấy thông tin phương tiện")
      return
    }

    // Get driver - use first active driver if available
    if (drivers.length === 0) {
      toast.warning("Không tìm thấy lái xe cho đơn vị vận tải này. Vui lòng thêm lái xe trước.")
      return
    }

    const selectedDriverId = drivers[0].id

    setIsCreating(true)
    try {
      // Create dispatch record first
      const dispatchInput = {
        vehicleId,
        driverId: selectedDriverId,
        routeId,
        entryTime: effectiveDate.toISOString(),
        notes: `Đơn hàng ${orderType} - ${invoiceSymbol}`,
      }

      // Include metadata in notes for now (since backend doesn't support metadata in create)
      // The operatorId is already linked through vehicle, but we store it in notes for reference
      const notesWithMetadata = `Đơn hàng ${orderType} - ${invoiceSymbol} | OperatorId: ${operatorId}`
      
      const dispatchRecord = await dispatchService.create({
        ...dispatchInput,
        notes: notesWithMetadata,
      })
      
      // Create service charges for each service
      for (const service of services) {
        const serviceChargeInput: ServiceChargeInput = {
          dispatchRecordId: dispatchRecord.id,
          serviceTypeId: service.serviceTypeId,
          quantity: service.quantity,
          unitPrice: service.unitPrice,
          totalAmount: service.totalAmount,
        }
        await serviceChargeService.create(serviceChargeInput)
      }

      toast.success("Tạo đơn hàng thành công!")
      navigate(`/thanh-toan/${dispatchRecord.id}`)
      
    } catch (error) {
      console.error("Failed to create order:", error)
      toast.error("Không thể tạo đơn hàng. Vui lòng thử lại sau.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    if (window.confirm("Bạn có chắc chắn muốn hủy? Tất cả thông tin sẽ bị mất.")) {
      navigate("/thanh-toan")
    }
  }

  const { subtotal, discount, tax, total } = calculateTotals()

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-600">
        Quản lý đơn hàng &gt; Tạo mới
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Left Column - Service Information */}
        <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Thông tin dịch vụ</h2>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsAddingService(true)}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    title="Cài đặt"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={loadInitialData}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    title="Làm mới"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardContent className="p-0 pt-0 flex-1 overflow-auto relative">
              <div className="border-t">
                <h3 className="p-4 font-medium text-gray-700">Danh sách dịch vụ</h3>
                <div className="relative">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-12">STT</TableHead>
                      <TableHead className="text-center">Dịch vụ</TableHead>
                      <TableHead className="text-center">Đơn giá (đ)</TableHead>
                      <TableHead className="text-center">Số lượng</TableHead>
                      <TableHead className="text-center">Tiền trước chiết khấu (đ)</TableHead>
                      <TableHead className="text-center">Thành tiền (đ)</TableHead>
                      <TableHead className="text-center w-20">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isAddingService && (
                      <TableRow className="bg-blue-50">
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="relative">
                          <div className="relative">
                            <Input
                              ref={serviceInputRef}
                              value={newService.serviceName}
                              onChange={(e) => {
                                setNewService({ ...newService, serviceName: e.target.value })
                                setShowServiceDropdown(true)
                              }}
                              onFocus={() => setShowServiceDropdown(true)}
                              placeholder="Tên dịch vụ"
                              className="h-8"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={newService.unitPrice}
                            onChange={(e) => setNewService({ ...newService, unitPrice: parseFloat(e.target.value) || 0 })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={newService.quantity}
                            onChange={(e) => setNewService({ ...newService, quantity: parseInt(e.target.value) || 1 })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {calculateServiceAmounts(newService).amountBeforeDiscount.toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {calculateServiceAmounts(newService).totalAmount.toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleAddService}
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCancelAddService}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {services.length === 0 && !isAddingService ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Không có dữ liệu!
                        </TableCell>
                      </TableRow>
                    ) : (
                      services.map((service, index) => (
                        <TableRow key={service.id}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell className="font-medium">{service.serviceName}</TableCell>
                          <TableCell className="text-center">{service.unitPrice.toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="text-center">{service.quantity}</TableCell>
                          <TableCell className="text-center">{service.amountBeforeDiscount.toLocaleString('vi-VN')}</TableCell>
                          <TableCell className="text-center font-medium">{service.totalAmount.toLocaleString('vi-VN')}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteService(service.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {services.length > 0 && (
                      <TableRow className="bg-gray-50 font-semibold">
                        <TableCell colSpan={4} className="text-right">
                          Tổng tiền:
                        </TableCell>
                        <TableCell className="text-center">{subtotal.toLocaleString('vi-VN')}</TableCell>
                        <TableCell className="text-center">{total.toLocaleString('vi-VN')}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancel Button */}
          <Button variant="destructive" onClick={handleCancel} className="w-full">
            HỦY
          </Button>
        </div>

        {/* Right Column - General Information */}
        <div className="space-y-4 overflow-y-auto">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Thông tin chung</h2>

              {/* Effective Date */}
              <div>
                <Label htmlFor="effectiveDate">Ngày áp dụng:</Label>
                <div className="mt-1">
                  <DateTimePicker 
                    date={effectiveDate} 
                    onDateChange={(d) => d && setEffectiveDate(d)} 
                  />
                </div>
              </div>

              {/* Transport Unit */}
              <div>
                <Label htmlFor="operator">Đơn vị vận tải:</Label>
                <Select
                  id="operator"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="mt-1"
                >
                  <option value="">Lựa chọn...</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Vehicle */}
              <div>
                <Label htmlFor="vehicle">Phương tiện:</Label>
                <Select
                  id="vehicle"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="mt-1"
                  disabled={!operatorId}
                >
                  <option value="">Lựa chọn...</option>
                  {filteredVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plateNumber}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Shipping Route */}
              <div>
                <Label htmlFor="route">Tuyến vận chuyển:</Label>
                <Select
                  id="route"
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  className="mt-1"
                >
                  <option value="">Lựa chọn...</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.routeName}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Order Type */}
              <div>
                <Label htmlFor="orderType">Loại đơn hàng:</Label>
                <Select
                  id="orderType"
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="mt-1"
                >
                  <option value="thanh-toan-chuyen">Thanh toán chuyến</option>
                  <option value="thanh-toan-dinh-ky">Thanh toán định kỳ</option>
                  <option value="thanh-toan-truy-thu">Thanh toán truy thu</option>
                  <option value="khac">Khác</option>
                  <option value="thanh-toan-khong-du-dieu-kien">Thanh toán không đủ điều kiện</option>
                  <option value="thanh-toan-chuyen-tang-cuong">Thanh toán chuyến (Tăng cường)</option>
                  <option value="thanh-toan-vang-lai">Thanh toán vãng lai</option>
                </Select>
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">Trạng thái:</Label>
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1"
                >
                  <option value="da-xac-nhan">Đã xác nhận</option>
                  <option value="chua-xac-nhan">Chưa xác nhận</option>
                  <option value="dang-xu-ly">Đang xử lý</option>
                </Select>
              </div>

              {/* Invoice Symbol */}
              <div>
                <Label htmlFor="invoiceSymbol">Ký hiệu hóa đơn:</Label>
                <Select
                  id="invoiceSymbol"
                  value={invoiceSymbol}
                  onChange={(e) => setInvoiceSymbol(e.target.value)}
                  className="mt-1"
                >
                  <option value="QLBX">QLBX</option>
                  <option value="KHAC">KHAC</option>
                </Select>
              </div>

              {/* Payment Summary */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tổng tiền:</span>
                  <span className="font-medium">{subtotal.toLocaleString('vi-VN')} đồng</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Chiết khấu:</span>
                  <span className="font-medium">{discount.toLocaleString('vi-VN')} đồng</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tiền thuế GTGT:</span>
                  <span className="font-medium">{tax.toLocaleString('vi-VN')} đồng</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold text-lg">
                  <span>Thực thu:</span>
                  <span className="text-blue-600">{total.toLocaleString('vi-VN')} đồng</span>
                </div>
              </div>

              {/* Create Order Button */}
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleCreateOrder}
                disabled={isCreating}
              >
                {isCreating ? "Đang tạo..." : "TẠO ĐƠN HÀNG"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Service Dropdown Portal */}
      {showServiceDropdown && serviceInputRef.current && createPortal(
        <div
          ref={serviceDropdownRef}
          className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {serviceTypes.filter(t => 
            t.name.toLowerCase().includes(newService.serviceName.toLowerCase())
          ).length > 0 ? (
            serviceTypes.filter(t => 
              t.name.toLowerCase().includes(newService.serviceName.toLowerCase())
            ).map((type) => (
              <div
                key={type.id}
                onClick={() => handleServiceTypeChange(type.id)}
                className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm"
              >
                {type.name}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500 text-sm">
              Không tìm thấy kết quả
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

