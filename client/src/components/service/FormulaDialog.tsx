import { useEffect } from "react"
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
import { StatusBadge } from "@/components/layout/StatusBadge"
import { serviceFormulaService } from "@/services/service-formula.service"
import type { ServiceFormula, ServiceFormulaInput } from "@/types"

const formulaSchema = z.object({
  code: z.string().min(1, "Mã biểu thức là bắt buộc"),
  name: z.string().min(1, "Tên biểu thức là bắt buộc"),
  description: z.string().optional(),
  formulaType: z.enum(['quantity', 'price'], {
    errorMap: () => ({ message: "Loại biểu thức phải là 'quantity' hoặc 'price'" }),
  }),
  formulaExpression: z.string().optional(),
  isActive: z.boolean().default(true),
})

type FormulaFormData = z.infer<typeof formulaSchema>

interface FormulaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  viewMode: "create" | "edit" | "view"
  selectedFormula: ServiceFormula | null
  onSuccess: () => void
  defaultFormulaType?: 'quantity' | 'price'
}

export function FormulaDialog({
  open,
  onOpenChange,
  viewMode,
  selectedFormula,
  onSuccess,
  defaultFormulaType,
}: FormulaDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormulaFormData>({
    resolver: zodResolver(formulaSchema),
    defaultValues: {
      isActive: true,
      formulaType: defaultFormulaType || 'quantity',
    },
  })

  useEffect(() => {
    if (selectedFormula && (viewMode === "edit" || viewMode === "view")) {
      reset({
        code: selectedFormula.code,
        name: selectedFormula.name,
        description: selectedFormula.description || "",
        formulaType: selectedFormula.formulaType,
        formulaExpression: selectedFormula.formulaExpression || "",
        isActive: selectedFormula.isActive,
      })
    } else {
      reset({
        code: "",
        name: "",
        description: "",
        formulaType: defaultFormulaType || 'quantity',
        formulaExpression: "",
        isActive: true,
      })
    }
  }, [selectedFormula, viewMode, reset, defaultFormulaType])

  const onSubmit = async (data: FormulaFormData) => {
    try {
      const formulaData: ServiceFormulaInput = {
        code: data.code,
        name: data.name,
        description: data.description,
        formulaType: data.formulaType,
        formulaExpression: data.formulaExpression,
        isActive: data.isActive,
      }

      if (viewMode === "create") {
        await serviceFormulaService.create(formulaData)
        toast.success("Thêm biểu thức thành công")
      } else if (viewMode === "edit" && selectedFormula) {
        await serviceFormulaService.update(selectedFormula.id, formulaData)
        toast.success("Cập nhật biểu thức thành công")
      }
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      console.error("Failed to save formula:", error)
      toast.error(
        error.response?.data?.error ||
        error.response?.data?.message ||
          `Không thể ${viewMode === "create" ? "thêm" : "cập nhật"} biểu thức. Vui lòng thử lại.`
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[800px] max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">
            {viewMode === "create" && "Thêm biểu thức mới"}
            {viewMode === "edit" && "Sửa thông tin biểu thức"}
            {viewMode === "view" && "Chi tiết biểu thức"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">
                Mã biểu thức <span className="text-red-500">(*)</span>
              </Label>
              <Input
                id="code"
                placeholder="Mã biểu thức"
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
              <Label htmlFor="formulaType">
                Loại biểu thức <span className="text-red-500">(*)</span>
              </Label>
              <Select
                id="formulaType"
                {...register("formulaType")}
                disabled={viewMode === "view" || viewMode === "edit"}
                className={errors.formulaType ? "border-red-500" : ""}
              >
                <option value="quantity">Tính số lượng</option>
                <option value="price">Tính đơn giá</option>
              </Select>
              {errors.formulaType && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.formulaType.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="name">
                Tên biểu thức <span className="text-red-500">(*)</span>
              </Label>
              <Input
                id="name"
                placeholder="Tên biểu thức"
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

            <div className="sm:col-span-2">
              <Label htmlFor="description">Ghi chú</Label>
              <textarea
                id="description"
                {...register("description")}
                disabled={viewMode === "view"}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Nhập ghi chú..."
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="formulaExpression">Biểu thức công thức</Label>
              <div className="mt-1 space-y-2">
                {/* Formula Builder */}
                {viewMode !== "view" && (
                  <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      {/* Available Fields */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Trường dữ liệu</label>
                        <select 
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                          onChange={(e) => {
                            if (e.target.value) {
                              const textarea = document.getElementById('formulaExpression') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = textarea.value;
                                const newText = text.substring(0, start) + e.target.value + text.substring(end);
                                textarea.value = newText;
                                textarea.focus();
                                textarea.setSelectionRange(start + e.target.value.length, start + e.target.value.length);
                                // Trigger change event
                                const event = new Event('input', { bubbles: true });
                                textarea.dispatchEvent(event);
                              }
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Chọn trường</option>
                          <option value="seatCount">seatCount (Số ghế)</option>
                          <option value="bedCount">bedCount (Số giường)</option>
                          <option value="distance">distance (Khoảng cách)</option>
                          <option value="basePrice">basePrice (Giá cơ bản)</option>
                          <option value="fuelPrice">fuelPrice (Giá xăng)</option>
                          <option value="routeType">routeType (Loại tuyến)</option>
                          <option value="vehicleType">vehicleType (Loại xe)</option>
                          <option value="dayOfWeek">dayOfWeek (Thứ trong tuần)</option>
                          <option value="isHoliday">isHoliday (Ngày lễ)</option>
                        </select>
                      </div>

                      {/* Operators */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Phép tính</label>
                        <select 
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                          onChange={(e) => {
                            if (e.target.value) {
                              const textarea = document.getElementById('formulaExpression') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = textarea.value;
                                const newText = text.substring(0, start) + ' ' + e.target.value + ' ' + text.substring(end);
                                textarea.value = newText;
                                textarea.focus();
                                textarea.setSelectionRange(start + e.target.value.length + 2, start + e.target.value.length + 2);
                                // Trigger change event
                                const event = new Event('input', { bubbles: true });
                                textarea.dispatchEvent(event);
                              }
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Chọn phép tính</option>
                          <option value="+">+ (Cộng)</option>
                          <option value="-">- (Trừ)</option>
                          <option value="*">* (Nhân)</option>
                          <option value="/"># (Chia)</option>
                          <option value="%">% (Chia lấy dư)</option>
                          <option value="**">** (Lũy thừa)</option>
                        </select>
                      </div>

                      {/* Functions */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Hàm</label>
                        <select 
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                          onChange={(e) => {
                            if (e.target.value) {
                              const textarea = document.getElementById('formulaExpression') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = textarea.value;
                                const newText = text.substring(0, start) + e.target.value + text.substring(end);
                                textarea.value = newText;
                                textarea.focus();
                                const newPos = start + e.target.value.length - 1; // Position cursor inside parentheses
                                textarea.setSelectionRange(newPos, newPos);
                                // Trigger change event
                                const event = new Event('input', { bubbles: true });
                                textarea.dispatchEvent(event);
                              }
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Chọn hàm</option>
                          <option value="Math.max()">Math.max() (Giá trị lớn nhất)</option>
                          <option value="Math.min()">Math.min() (Giá trị nhỏ nhất)</option>
                          <option value="Math.round()">Math.round() (Làm tròn)</option>
                          <option value="Math.ceil()">Math.ceil() (Làm tròn lên)</option>
                          <option value="Math.floor()">Math.floor() (Làm tròn xuống)</option>
                          <option value="Math.abs()">Math.abs() (Giá trị tuyệt đối)</option>
                          <option value="parseFloat()">parseFloat() (Chuyển số thực)</option>
                          <option value="parseInt()">parseInt() (Chuyển số nguyên)</option>
                        </select>
                      </div>

                      {/* Conditions */}
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Điều kiện</label>
                        <select 
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                          onChange={(e) => {
                            if (e.target.value) {
                              const textarea = document.getElementById('formulaExpression') as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = textarea.value;
                                const newText = text.substring(0, start) + e.target.value + text.substring(end);
                                textarea.value = newText;
                                textarea.focus();
                                // Trigger change event
                                const event = new Event('input', { bubbles: true });
                                textarea.dispatchEvent(event);
                              }
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Chọn điều kiện</option>
                          <option value=" > ">&gt; (Lớn hơn)</option>
                          <option value=" < ">&lt; (Nhỏ hơn)</option>
                          <option value=" >= ">&gt;= (Lớn hơn hoặc bằng)</option>
                          <option value=" <= ">&lt;= (Nhỏ hơn hoặc bằng)</option>
                          <option value=" == "> == (Bằng)</option>
                          <option value=" != "> != (Khác)</option>
                          <option value=" && "> && (Và)</option>
                          <option value=" || "> || (Hoặc)</option>
                          <option value="condition ? value1 : value2">condition ? value1 : value2 (If-else)</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick Insert Buttons */}
                    <div className="flex flex-wrap gap-1">
                      {['(', ')', '[', ']', '{', '}', ',', ';'].map((char) => (
                        <button
                          key={char}
                          type="button"
                          className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
                          onClick={() => {
                            const textarea = document.getElementById('formulaExpression') as HTMLTextAreaElement;
                            if (textarea) {
                              const start = textarea.selectionStart;
                              const end = textarea.selectionEnd;
                              const text = textarea.value;
                              const newText = text.substring(0, start) + char + text.substring(end);
                              textarea.value = newText;
                              textarea.focus();
                              textarea.setSelectionRange(start + 1, start + 1);
                              // Trigger change event
                              const event = new Event('input', { bubbles: true });
                              textarea.dispatchEvent(event);
                            }
                          }}
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formula Expression Textarea */}
                <textarea
                  id="formulaExpression"
                  {...register("formulaExpression")}
                  disabled={viewMode === "view"}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                  placeholder="Nhập biểu thức công thức hoặc sử dụng các dropdown bên trên để xây dựng..."
                />

                {/* Formula Examples */}
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  <strong>Ví dụ:</strong>
                  <div className="mt-1 space-y-1">
                    <div>• Tính số lượng: <code className="bg-white px-1 rounded">seatCount &gt; 30 ? seatCount * 1.2 : seatCount</code></div>
                    <div>• Tính đơn giá: <code className="bg-white px-1 rounded">basePrice + (distance * 0.5) + (isHoliday ? 50000 : 0)</code></div>
                    <div>• Sử dụng hàm: <code className="bg-white px-1 rounded">Math.max(basePrice, 100000) * (seatCount / 45)</code></div>
                  </div>
                </div>
              </div>
            </div>

            {viewMode !== "view" && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register("isActive")}
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Kích hoạt
                </Label>
              </div>
            )}
          </div>

          {viewMode === "view" && selectedFormula && (
            <div>
              <Label>Trạng thái</Label>
              <div className="mt-2">
                <StatusBadge
                  status={selectedFormula.isActive ? "active" : "inactive"}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2 pt-4 border-t">
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

