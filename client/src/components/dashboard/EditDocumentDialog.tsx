import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { toast } from "react-toastify"
import { Calendar, Save, X } from "lucide-react"
import { iconStyles } from "@/lib/icon-theme"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/DatePicker"
import type { Warning } from "@/services/dashboard.service"

const documentSchema = z.object({
  documentNumber: z.string().min(1, "Số giấy tờ là bắt buộc"),
  issueDate: z.string().min(1, "Ngày cấp là bắt buộc"),
  expiryDate: z.string().min(1, "Ngày hết hạn là bắt buộc"),
  issuingAuthority: z.string().optional(),
  notes: z.string().optional(),
})

type DocumentFormData = z.infer<typeof documentSchema>

interface EditDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warning: Warning | null
  onSave: (data: DocumentFormData) => Promise<void>
}

export function EditDocumentDialog({
  open,
  onOpenChange,
  warning,
  onSave,
}: EditDocumentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
  })

  const watchedIssueDate = watch("issueDate")
  const watchedExpiryDate = watch("expiryDate")

  useEffect(() => {
    if (warning && open) {
      // Load existing document data (this would come from an API call)
      reset({
        documentNumber: "", // Would be loaded from API
        issueDate: format(new Date(), "yyyy-MM-dd"),
        expiryDate: format(new Date(warning.expiryDate), "yyyy-MM-dd"),
        issuingAuthority: "",
        notes: "",
      })
    }
  }, [warning, open, reset])

  const onSubmit = async (data: DocumentFormData) => {
    if (!warning) return

    setIsLoading(true)
    try {
      await onSave(data)
      toast.success("Cập nhật giấy tờ thành công")
      onOpenChange(false)
    } catch (error: any) {
      console.error("Failed to update document:", error)
      toast.error("Không thể cập nhật giấy tờ. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!warning) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className={iconStyles.infoIcon} />
            Cập nhật giấy tờ - {warning.document}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Warning Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Loại:</span>
                <span className="ml-2">{warning.type === "vehicle" ? "Xe" : "Lái xe"}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Thông tin:</span>
                <span className="ml-2">{warning.plateNumber || warning.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Giấy tờ:</span>
                <span className="ml-2">{warning.document}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Hết hạn cũ:</span>
                <span className="ml-2 text-red-600 font-medium">
                  {format(new Date(warning.expiryDate), "dd/MM/yyyy")}
                </span>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentNumber">
                Số giấy tờ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="documentNumber"
                placeholder="Nhập số giấy tờ"
                {...register("documentNumber")}
                className={errors.documentNumber ? "border-red-500" : ""}
              />
              {errors.documentNumber && (
                <p className="text-sm text-red-500">{errors.documentNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="issuingAuthority">Cơ quan cấp</Label>
              <Input
                id="issuingAuthority"
                placeholder="Nhập cơ quan cấp"
                {...register("issuingAuthority")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issueDate">
                Ngày cấp <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                date={watchedIssueDate ? new Date(watchedIssueDate) : null}
                onDateChange={(date: Date | undefined) => {
                  if (date) {
                    setValue("issueDate", format(date, "yyyy-MM-dd"))
                  }
                }}
                placeholder="Chọn ngày cấp"
              />
              {errors.issueDate && (
                <p className="text-sm text-red-500">{errors.issueDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryDate">
                Ngày hết hạn <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                date={watchedExpiryDate ? new Date(watchedExpiryDate) : null}
                onDateChange={(date: Date | undefined) => {
                  if (date) {
                    setValue("expiryDate", format(date, "yyyy-MM-dd"))
                  }
                }}
                placeholder="Chọn ngày hết hạn"
              />
              {errors.expiryDate && (
                <p className="text-sm text-red-500">{errors.expiryDate.message}</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="notes">Ghi chú</Label>
              <textarea
                id="notes"
                {...register("notes")}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Nhập ghi chú (tùy chọn)"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              <X className={iconStyles.deleteButton} />
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className={iconStyles.successIcon} />
              {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}