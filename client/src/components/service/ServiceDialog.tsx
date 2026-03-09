import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
// Tạm thời comment - dùng cho right column
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table"
import { StatusBadge } from "@/components/layout/StatusBadge"
import { serviceService } from "@/services/service.service"
import { serviceFormulaService } from "@/services/service-formula.service"
import type { Service, ServiceInput, ServiceFormula } from "@/types"

const serviceSchema = z.object({
  code: z.string().min(1, "Mã dịch vụ là bắt buộc"),
  name: z.string().min(1, "Tên dịch vụ là bắt buộc"),
  unit: z.string().min(1, "Đơn vị tính là bắt buộc"),
  taxPercentage: z.union([
    z.number().min(0).max(100),
    z.string(),
  ]).refine(
    (val) => {
      if (typeof val === "number") return val >= 0 && val <= 100;
      if (typeof val === "string") {
        return val === "KCT" || val === "KKKNT" || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100);
      }
      return false;
    },
    { message: "Phần trăm thuế không hợp lệ" }
  ),
  materialType: z.string().min(1, "Loại vật tư/hàng hóa là bắt buộc"),
  useQuantityFormula: z.boolean().default(false),
  usePriceFormula: z.boolean().default(false),
  displayOrder: z.number().min(0, "Thứ tự hiển thị phải >= 0"),
  isDefault: z.boolean().default(false),
  autoCalculateQuantity: z.boolean().default(false),
  isActive: z.boolean().default(true),
  quantityFormulaExpression: z.string().optional(),
  priceFormulaExpression: z.string().optional(),
  formulaDescription: z.string().optional(),
})

type ServiceFormData = z.infer<typeof serviceSchema>

const MATERIAL_TYPES = ["Khác", "Hoa hồng bán vé", "Đỗ chờ", "Phí dịch vụ", "Phạt ra muộn", "Truy thu"]

const UNITS = ["Giường", "Chuyến", "Cái", "Ghế", "Người", "Khách", "Vé", "Xe"]

const TAX_PERCENTAGES = [
  { value: "20", label: "20%" },
  { value: "10", label: "10%" },
  { value: "8", label: "8%" },
  { value: "5", label: "5%" },
  { value: "0", label: "0%" },
  { value: "KCT", label: "KCT" },
  { value: "KKKNT", label: "KKKNT" },
]

// Biểu thức sẽ được load từ database

interface ServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  viewMode: "create" | "edit" | "view"
  selectedService: Service | null
  onSuccess: () => void
}

export function ServiceDialog({
  open,
  onOpenChange,
  viewMode,
  selectedService,
  onSuccess,
}: ServiceDialogProps) {
  const [quantityFormulas, setQuantityFormulas] = useState<ServiceFormula[]>([])
  const [priceFormulas, setPriceFormulas] = useState<ServiceFormula[]>([])
  const [isLoadingFormulas, setIsLoadingFormulas] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      useQuantityFormula: false,
      usePriceFormula: false,
      displayOrder: 0,
      isDefault: false,
      autoCalculateQuantity: false,
      isActive: true,
      taxPercentage: 0,
      quantityFormulaExpression: "",
      priceFormulaExpression: "",
      formulaDescription: "",
    },
  })

  // Tạm thời comment - dùng cho right column
  // const handleCheckFormula = () => {
  //   // TODO: Implement formula checking logic
  //   toast.info("Chức năng kiểm tra công thức đang được phát triển")
  // }

  // Load formulas from database
  useEffect(() => {
    if (open) {
      const loadFormulas = async () => {
        setIsLoadingFormulas(true)
        try {
          const [quantityData, priceData] = await Promise.all([
            serviceFormulaService.getAll('quantity', true), // Chỉ lấy active
            serviceFormulaService.getAll('price', true), // Chỉ lấy active
          ])
          setQuantityFormulas(quantityData)
          setPriceFormulas(priceData)
        } catch (error) {
          console.error("Failed to load formulas:", error)
          toast.error("Không thể tải danh sách biểu thức. Vui lòng thử lại sau.")
        } finally {
          setIsLoadingFormulas(false)
        }
      }
      loadFormulas()
    }
  }, [open])

  useEffect(() => {
    if (selectedService && (viewMode === "edit" || viewMode === "view")) {
      reset({
        code: selectedService.code,
        name: selectedService.name,
        unit: selectedService.unit,
        taxPercentage: selectedService.taxPercentage,
        materialType: selectedService.materialType,
        useQuantityFormula: selectedService.useQuantityFormula,
        usePriceFormula: selectedService.usePriceFormula,
        displayOrder: selectedService.displayOrder,
        isDefault: selectedService.isDefault,
        autoCalculateQuantity: selectedService.autoCalculateQuantity,
        isActive: selectedService.isActive,
        quantityFormulaExpression: selectedService.quantityFormulaExpression || "",
        priceFormulaExpression: selectedService.priceFormulaExpression || "",
        formulaDescription: "",
      })
    } else {
      reset({
        code: "",
        name: "",
        unit: "",
        taxPercentage: 0,
        materialType: "",
        useQuantityFormula: false,
        usePriceFormula: false,
        displayOrder: 0,
        isDefault: false,
        autoCalculateQuantity: false,
        isActive: true,
        quantityFormulaExpression: "",
        priceFormulaExpression: "",
        formulaDescription: "",
      })
    }
  }, [selectedService, viewMode, reset])

  const onSubmit = async (data: ServiceFormData) => {
    try {
      // Convert taxPercentage to number if it's a numeric string, otherwise keep as string
      const taxPercentage = typeof data.taxPercentage === "string" && !isNaN(Number(data.taxPercentage))
        ? Number(data.taxPercentage)
        : data.taxPercentage

      const serviceData: ServiceInput & { 
        isActive?: boolean
        quantityFormulaExpression?: string
        priceFormulaExpression?: string
      } = {
        code: data.code,
        name: data.name,
        unit: data.unit,
        taxPercentage: taxPercentage as any,
        materialType: data.materialType,
        useQuantityFormula: data.useQuantityFormula,
        usePriceFormula: data.usePriceFormula,
        displayOrder: data.displayOrder,
        isDefault: data.isDefault,
        autoCalculateQuantity: data.autoCalculateQuantity,
        // Gửi biểu thức nếu có chọn (không phải empty string)
        quantityFormulaExpression: data.quantityFormulaExpression && data.quantityFormulaExpression.trim() !== "" 
          ? data.quantityFormulaExpression 
          : undefined,
        priceFormulaExpression: data.priceFormulaExpression && data.priceFormulaExpression.trim() !== "" 
          ? data.priceFormulaExpression 
          : undefined,
      }

      if (viewMode === "create") {
        await serviceService.create({ ...serviceData, isActive: data.isActive } as any)
        toast.success("Thêm dịch vụ thành công")
      } else if (viewMode === "edit" && selectedService) {
        await serviceService.update(selectedService.id, { ...serviceData, isActive: data.isActive } as any)
        toast.success("Cập nhật dịch vụ thành công")
      }
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      console.error("Failed to save service:", error)
      toast.error(
        error.response?.data?.message ||
          `Không thể ${viewMode === "create" ? "thêm" : "cập nhật"} dịch vụ. Vui lòng thử lại.`
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[1400px] max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">
            {viewMode === "create" && "Thêm dịch vụ mới"}
            {viewMode === "edit" && "Sửa thông tin dịch vụ"}
            {viewMode === "view" && "Chi tiết dịch vụ"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Left Column - Thông tin chính */}
            <div className="space-y-4">
              {/* Header với checkboxes */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                    Thông tin chính
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        {...register("isDefault")}
                        disabled={viewMode === "view"}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="isDefault" className="cursor-pointer text-sm">
                        Mặc định chọn
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="autoCalculateQuantity"
                        {...register("autoCalculateQuantity")}
                        disabled={viewMode === "view"}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="autoCalculateQuantity" className="cursor-pointer text-sm">
                        Tự động tính số lượng
                      </Label>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">
                      Tên dịch vụ <span className="text-red-500">(*)</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Tên dịch vụ"
                      {...register("name")}
                      disabled={viewMode === "view"}
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="code">
                      Mã dịch vụ <span className="text-red-500">(*)</span>
                    </Label>
                    <Input
                      id="code"
                      placeholder="Mã dịch vụ"
                      {...register("code")}
                      disabled={viewMode === "view"}
                      className={errors.code ? "border-red-500" : ""}
                    />
                    {errors.code && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.code.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="displayOrder">
                      Thứ tự hiển thị <span className="text-red-500">(*)</span>
                    </Label>
                    <Input
                      id="displayOrder"
                      type="number"
                      min="0"
                      placeholder="0"
                      {...register("displayOrder", { valueAsNumber: true })}
                      disabled={viewMode === "view"}
                      className={errors.displayOrder ? "border-red-500" : ""}
                    />
                    {errors.displayOrder && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.displayOrder.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="materialType">
                      Loại vật tư/hàng hóa <span className="text-red-500">(*)</span>
                    </Label>
                    <Select
                      id="materialType"
                      {...register("materialType")}
                      disabled={viewMode === "view"}
                      className={errors.materialType ? "border-red-500" : ""}
                    >
                      <option value="">Chọn loại</option>
                      {MATERIAL_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                    {errors.materialType && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.materialType.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="unit">
                      Đơn vị tính <span className="text-red-500">(*)</span>
                    </Label>
                    <Select
                      id="unit"
                      {...register("unit")}
                      disabled={viewMode === "view"}
                      className={errors.unit ? "border-red-500" : ""}
                    >
                      <option value="">Chọn đơn vị</option>
                      {UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </Select>
                    {errors.unit && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.unit.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="taxPercentage">
                      Phần trăm thuế <span className="text-red-500">(*)</span>
                    </Label>
                    <Select
                      id="taxPercentage"
                      {...register("taxPercentage")}
                      disabled={viewMode === "view"}
                      className={errors.taxPercentage ? "border-red-500" : ""}
                    >
                      <option value="">Chọn phần trăm thuế</option>
                      {TAX_PERCENTAGES.map((tax) => (
                        <option key={tax.value} value={tax.value}>
                          {tax.label}
                        </option>
                      ))}
                    </Select>
                    {errors.taxPercentage && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.taxPercentage.message}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="quantityFormulaExpression">
                      Biểu thức tính số lượng <span className="text-red-500">(*)</span>
                    </Label>
                    <Select
                      id="quantityFormulaExpression"
                      {...register("quantityFormulaExpression")}
                      disabled={viewMode === "view" || isLoadingFormulas}
                    >
                      <option value="">Chọn biểu thức</option>
                      {quantityFormulas.map((formula) => (
                        <option key={formula.id} value={formula.id}>
                          {formula.name}
                        </option>
                      ))}
                    </Select>
                    {isLoadingFormulas && (
                      <p className="text-sm text-gray-500 mt-1">Đang tải danh sách biểu thức...</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="priceFormulaExpression">
                      Biểu thức tính đơn giá <span className="text-red-500">(*)</span>
                    </Label>
                    <Select
                      id="priceFormulaExpression"
                      {...register("priceFormulaExpression")}
                      disabled={viewMode === "view" || isLoadingFormulas}
                    >
                      <option value="">Chọn biểu thức</option>
                      {priceFormulas.map((formula) => (
                        <option key={formula.id} value={formula.id}>
                          {formula.name}
                        </option>
                      ))}
                    </Select>
                    {isLoadingFormulas && (
                      <p className="text-sm text-gray-500 mt-1">Đang tải danh sách biểu thức...</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="formulaDescription">
                      Mô tả biểu thức
                    </Label>
                    <textarea
                      id="formulaDescription"
                      {...register("formulaDescription")}
                      disabled={viewMode === "view"}
                      rows={4}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Nhập mô tả biểu thức..."
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Kiểm tra công thức và Kết quả */}
            {/* Tạm thời ẩn right column */}
            {/* <div className="space-y-4">
              {/* Kiểm tra công thức */}
              {/* <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 border-b pb-2">
                  Kiểm tra công thức
                </h3>
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">Tham số</TableHead>
                          <TableHead className="text-center">Giá trị</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formulaParameters.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-8 text-gray-500 text-sm">
                              Không có dữ liệu
                            </TableCell>
                          </TableRow>
                        ) : (
                          formulaParameters.map((param, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-center">{param.name}</TableCell>
                              <TableCell className="text-center">{param.value}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handleCheckFormula}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      KIỂM TRA
                    </Button>
                  </div>
                </div>
              </div>

              {/* Kết quả */}
              {/* <div className="space-y-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 border-b pb-2">
                  Kết quả
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center w-16">STT</TableHead>
                        <TableHead className="text-center">Tên biểu thức</TableHead>
                        <TableHead className="text-center">Kết quả</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formulaResults.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-gray-500 text-sm">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      ) : (
                        formulaResults.map((result) => (
                          <TableRow key={result.stt}>
                            <TableCell className="text-center">{result.stt}</TableCell>
                            <TableCell className="text-center">{result.name}</TableCell>
                            <TableCell className="text-center">{result.result}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Status (for view mode) */}
              {/* {viewMode === "view" && selectedService && (
                <div>
                  <Label>Trạng thái</Label>
                  <div className="mt-2">
                    <StatusBadge
                      status={selectedService.isActive ? "active" : "inactive"}
                    />
                  </div>
                </div>
              )}
            </div> */}
            
            {/* Status (for view mode) - Moved here temporarily */}
            {viewMode === "view" && selectedService && (
              <div>
                <Label>Trạng thái</Label>
                <div className="mt-2">
                  <StatusBadge
                    status={selectedService.isActive ? "active" : "inactive"}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2 pt-4 border-t mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              {viewMode === "view" ? "Đóng" : "Hủy"}
            </Button>
            {viewMode !== "view" && (
              <Button type="submit" className="w-full sm:w-auto">
                {viewMode === "create" ? "Thêm" : "Cập nhật"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

