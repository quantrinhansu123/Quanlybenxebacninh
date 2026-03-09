import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { X, CheckCircle, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DatePicker } from "@/components/DatePicker"
import { vehicleService } from "@/services/vehicle.service"
import { vehicleBadgeService } from "@/services/vehicle-badge.service"
import type { AllBadgesResponse } from "@/services/vehicle-badge.service"
import { DocumentHistoryDialog } from "./DocumentHistoryDialog"
import type { Vehicle, VehicleDocuments } from "@/types"
import { format } from "date-fns"

interface KiemTraGiayToDialogProps {
  vehicleId: string
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function KiemTraGiayToDialog({
  vehicleId,
  open,
  onClose,
  onSuccess
}: KiemTraGiayToDialogProps) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [documents, setDocuments] = useState<VehicleDocuments>({})
  const [isLoading, setIsLoading] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  // Multiple badges state
  const [allBadges, setAllBadges] = useState<AllBadgesResponse['badges']>([])
  // Track modified badge expiry dates: badgeId -> newExpiryDate
  const [modifiedBadgeExpiries, setModifiedBadgeExpiries] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (open && vehicleId) {
      setModifiedBadgeExpiries(new Map())
      loadVehicle()
    }
  }, [open, vehicleId])

  const loadVehicle = async () => {
    try {
      const data = await vehicleService.getById(vehicleId)
      setVehicle(data)
      const docs: VehicleDocuments = { ...(data.documents || {}) }

      // Fetch ALL badges for this plate number
      if (data.plateNumber) {
        try {
          const result = await vehicleBadgeService.getAllByPlateNumber(data.plateNumber)
          setAllBadges(result.badges)

          // Use first valid badge for operation_permit (backward compat with cap phep dialog)
          const firstValidBadge = result.badges.find(b => !b.is_expired)
          if (firstValidBadge?.expiry_date) {
            docs.operation_permit = {
              ...(docs.operation_permit || { number: '', issueDate: '', isValid: false }),
              expiryDate: firstValidBadge.expiry_date,
              isValid: checkDocumentValidity(firstValidBadge.expiry_date),
            }
          }
        } catch {
          setAllBadges([])
        }
      }

      setDocuments(docs)
    } catch (error) {
      console.error("Failed to load vehicle:", error)
    }
  }

  const handleSave = async () => {
    if (!vehicle) return

    // Validate required docs (badges validated separately)
    const requiredDocs = ['registration', 'inspection', 'insurance'] as const
    for (const docType of requiredDocs) {
      const doc = documents[docType]
      if (!doc || !doc.expiryDate) {
        toast.warning(`Vui lòng nhập ngày hết hạn cho ${getDocumentLabel(docType)}`)
        return
      }
    }

    setIsLoading(true)
    try {
      // Update modified badge expiry dates in vehicle_badges table
      for (const [badgeId, newExpiry] of modifiedBadgeExpiries.entries()) {
        try {
          await vehicleBadgeService.update(badgeId, { expiry_date: newExpiry })
        } catch (error) {
          console.error(`Failed to update badge ${badgeId} expiry:`, error)
          toast.error(`Không thể cập nhật hạn phù hiệu. Vui lòng thử lại.`)
          setIsLoading(false)
          return
        }
      }

      // Update vehicle documents (registration, inspection, insurance)
      const documentsToUpdate: VehicleDocuments = {}
      for (const docType of requiredDocs) {
        const doc = documents[docType]
        if (doc && doc.expiryDate) {
          const existingDoc = vehicle.documents?.[docType]
          const number = existingDoc?.number || `AUTO-${docType}-${vehicle.plateNumber}`
          const issueDate = existingDoc?.issueDate || new Date().toISOString().split('T')[0]
          const expiryDate = doc.expiryDate

          if (existingDoc) {
            documentsToUpdate[docType] = {
              number,
              issueDate,
              expiryDate,
              isValid: checkDocumentValidity(expiryDate),
              ...(existingDoc.issuingAuthority && { issuingAuthority: existingDoc.issuingAuthority }),
              ...(existingDoc.documentUrl && { documentUrl: existingDoc.documentUrl }),
              ...(existingDoc.notes && { notes: existingDoc.notes }),
            }
          } else {
            documentsToUpdate[docType] = {
              number,
              issueDate,
              expiryDate,
              isValid: checkDocumentValidity(expiryDate),
            }
          }
        }
      }

      await vehicleService.update(vehicle.id, { documents: documentsToUpdate })

      toast.success("Cập nhật hiệu lực giấy tờ thành công!")
      await loadVehicle()
      if (onSuccess) onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Failed to update documents:", error)
      let errorMessage = "Không thể cập nhật hiệu lực giấy tờ. Vui lòng thử lại sau."
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error?.response?.data?.errors) {
        const errors = error.response.data.errors
        errorMessage = Array.isArray(errors)
          ? errors.map((e: any) => e.message || e).join('\n')
          : JSON.stringify(errors)
      } else if (error?.message) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getDocumentLabel = (docType: keyof VehicleDocuments): string => {
    const labels: Record<string, string> = {
      registration: 'Đăng ký xe',
      operation_permit: 'Phù hiệu',
      inspection: 'Đăng kiểm',
      insurance: 'Bảo hiểm'
    }
    return labels[docType] || docType
  }

  const updateDocumentDate = (docType: keyof VehicleDocuments, date: Date | undefined) => {
    const value = date ? format(date, "yyyy-MM-dd") : ""
    setDocuments(prev => {
      const updated = { ...prev }
      if (!updated[docType]) {
        const existingDoc = vehicle?.documents?.[docType]
        updated[docType] = {
          number: existingDoc?.number || '',
          issueDate: existingDoc?.issueDate || new Date().toISOString().split('T')[0],
          expiryDate: value,
          isValid: checkDocumentValidity(value)
        }
      } else {
        updated[docType] = {
          ...updated[docType]!,
          expiryDate: value,
          isValid: checkDocumentValidity(value)
        }
      }
      return updated
    })
  }

  const checkDocumentValidity = (expiryDate: string): boolean => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return expiry >= today
  }

  const getDocumentStatus = (expiryDate?: string): { isValid: boolean; icon: JSX.Element } => {
    if (!expiryDate) {
      return {
        isValid: false,
        icon: <X className="h-5 w-5 text-red-500" />
      }
    }
    const isValid = checkDocumentValidity(expiryDate)
    return {
      isValid,
      icon: isValid
        ? <CheckCircle className="h-5 w-5 text-green-500" />
        : <X className="h-5 w-5 text-red-500" />
    }
  }

  const registrationExpiry = documents.registration?.expiryDate || ''
  const inspectionExpiry = documents.inspection?.expiryDate || ''
  const insuranceExpiry = documents.insurance?.expiryDate || ''

  const registrationStatus = getDocumentStatus(registrationExpiry)
  const inspectionStatus = getDocumentStatus(inspectionExpiry)
  const insuranceStatus = getDocumentStatus(insuranceExpiry)

  return (
    <Dialog open={open} onOpenChange={onClose} className="w-full flex justify-center">
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-8">
            <DialogTitle>Sửa hiệu lực giấy tờ</DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHistoryDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              Lịch sử
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Đăng ký xe */}
          <div>
            <Label htmlFor="registrationExpiry">
              Đăng ký xe <span className="text-red-500">(*)</span>
            </Label>
            <div className="relative mt-1 flex items-center gap-2">
              <div className="flex-1">
                <DatePicker
                  date={registrationExpiry ? new Date(registrationExpiry) : null}
                  onDateChange={(date) => updateDocumentDate('registration', date)}
                  placeholder="Chọn ngày hết hạn"
                />
              </div>
              <div>
                {registrationStatus.icon}
              </div>
            </div>
          </div>

          {/* Phù hiệu xe — multiple badges */}
          {allBadges.length > 0 ? (
            <div>
              <Label className="text-sm font-semibold">
                Phù hiệu xe ({allBadges.filter(b => !b.is_expired).length} còn hạn / {allBadges.length} tổng)
              </Label>
              <div className="space-y-3 mt-2">
                {allBadges.map((badge) => {
                  // Use modified expiry if edited, otherwise original
                  const currentExpiry = modifiedBadgeExpiries.get(badge.id) ?? badge.expiry_date ?? ''
                  const status = getDocumentStatus(currentExpiry)
                  return (
                    <div key={badge.id}>
                      <Label className="text-xs">
                        {badge.badge_type} - {badge.route_name || badge.route_code || badge.badge_number}
                        {badge.is_expired && (
                          <span className="ml-2 text-red-500 font-medium">(Hết hạn)</span>
                        )}
                      </Label>
                      <div className="relative mt-1 flex items-center gap-2">
                        <div className="flex-1">
                          <DatePicker
                            date={currentExpiry ? new Date(currentExpiry) : null}
                            onDateChange={(date) => {
                              if (badge.is_expired) return
                              const value = date ? format(date, "yyyy-MM-dd") : ""
                              setModifiedBadgeExpiries(prev => {
                                const next = new Map(prev)
                                next.set(badge.id, value)
                                return next
                              })
                            }}
                            placeholder="Chọn ngày hết hạn"
                            disabled={badge.is_expired}
                          />
                        </div>
                        <div>{status.icon}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Fallback: no badges found — show legacy single permit field */
            <div>
              <Label htmlFor="permitExpiry">
                Hạn phù hiệu <span className="text-red-500">(*)</span>
              </Label>
              <div className="relative mt-1 flex items-center gap-2">
                <div className="flex-1">
                  <DatePicker
                    date={documents.operation_permit?.expiryDate ? new Date(documents.operation_permit.expiryDate) : null}
                    onDateChange={(date) => updateDocumentDate('operation_permit', date)}
                    placeholder="Chọn ngày hết hạn"
                  />
                </div>
                <div>
                  {getDocumentStatus(documents.operation_permit?.expiryDate).icon}
                </div>
              </div>
            </div>
          )}

          {/* Hạn đăng kiểm */}
          <div>
            <Label htmlFor="inspectionExpiry">
              Hạn đăng kiểm <span className="text-red-500">(*)</span>
            </Label>
            <div className="relative mt-1 flex items-center gap-2">
              <div className="flex-1">
                <DatePicker
                  date={inspectionExpiry ? new Date(inspectionExpiry) : null}
                  onDateChange={(date) => updateDocumentDate('inspection', date)}
                  placeholder="Chọn ngày hết hạn"
                />
              </div>
              <div>
                {inspectionStatus.icon}
              </div>
            </div>
          </div>

          {/* Hạn bảo hiểm */}
          <div>
            <Label htmlFor="insuranceExpiry">
              Hạn bảo hiểm <span className="text-red-500">(*)</span>
            </Label>
            <div className="relative mt-1 flex items-center gap-2">
              <div className="flex-1">
                <DatePicker
                  date={insuranceExpiry ? new Date(insuranceExpiry) : null}
                  onDateChange={(date) => updateDocumentDate('insurance', date)}
                  placeholder="Chọn ngày hết hạn"
                />
              </div>
              <div>
                {insuranceStatus.icon}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            HỦY
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? "Đang lưu..." : "LƯU"}
          </Button>
        </div>
      </DialogContent>

      {/* Document History Dialog */}
      <DocumentHistoryDialog
        vehicleId={vehicleId}
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
      />
    </Dialog>
  )
}
