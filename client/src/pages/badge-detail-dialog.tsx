import {
  Award,
  Car,
  Tag,
  Palette,
  CheckCircle,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Route,
  AlertTriangle,
  StickyNote,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/layout/StatusBadge"
import { type VehicleBadge } from "@/services/vehicle-badge.service"

// Helper function to format date
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "N/A"
  // Handle DD/MM/YYYY format
  if (dateString.includes("/")) {
    return dateString
  }
  // Try to parse ISO date
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "N/A"
    return date.toLocaleDateString("vi-VN")
  } catch {
    return dateString
  }
}

// Helper function to get status badge variant based on Vietnamese status text
const getStatusVariant = (status: string): "active" | "inactive" | "maintenance" => {
  if (!status) return "inactive"
  const statusLower = status.toLowerCase()
  // "Còn hiệu lực", "Cấp mới" etc. are active
  if (statusLower.includes("hiệu lực") || statusLower.includes("cấp mới") || statusLower.includes("cap moi")) {
    return "active"
  }
  // "Hết hạn" is expired/inactive
  if (statusLower.includes("hết") || statusLower.includes("het")) {
    return "inactive"
  }
  return "active"
}

interface BadgeDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  badge: VehicleBadge | null
}

export default function BadgeDetailDialog({ open, onOpenChange, badge }: BadgeDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[95vh] overflow-y-auto p-0">
        <DialogClose onClose={() => onOpenChange(false)} />
        {badge && (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b bg-muted/30">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Chi tiết phù hiệu xe</DialogTitle>
              </DialogHeader>
            </div>

            {/* Content - 2 Column Grid */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                {/* Số phù hiệu */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 font-medium">Số phù hiệu</p>
                    <p className="text-base font-semibold truncate">{badge.badge_number || "N/A"}</p>
                  </div>
                </div>

                {/* Biển số xe */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Car className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 font-medium">Biển số xe</p>
                    <p className="text-base font-semibold truncate">{badge.license_plate_sheet || "N/A"}</p>
                  </div>
                </div>

                {/* Loại phù hiệu */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Tag className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 font-medium">Loại phù hiệu</p>
                    <p className="text-base font-semibold">{badge.badge_type || "N/A"}</p>
                  </div>
                </div>

                {/* Màu phù hiệu */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Palette className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 font-medium">Màu phù hiệu</p>
                    <p className="text-base font-semibold">{badge.badge_color || "N/A"}</p>
                  </div>
                </div>

                {/* Trạng thái */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 font-medium">Trạng thái</p>
                    <div className="mt-1">
                      <StatusBadge
                        status={getStatusVariant(badge.status)}
                        label={badge.status || "N/A"}
                      />
                    </div>
                  </div>
                </div>

                {/* Mã tuyến - Tên tuyến */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 font-medium">Mã tuyến - Tên tuyến</p>
                    <p className="text-base font-semibold">
                      {badge.route_code && badge.route_name
                        ? `${badge.route_code} - ${badge.route_name}`
                        : badge.route_code || badge.route_name || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Hành trình */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Route className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 font-medium">Hành trình</p>
                    <p className="text-base font-semibold">{badge.itinerary || "N/A"}</p>
                  </div>
                </div>

                {/* Ngày cấp */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 font-medium">Ngày cấp</p>
                    <p className="text-base font-semibold">{formatDate(badge.issue_date)}</p>
                  </div>
                </div>

                {/* Ngày hết hạn */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 font-medium">Ngày hết hạn</p>
                    <p className="text-base font-semibold">{formatDate(badge.expiry_date)}</p>
                  </div>
                </div>

                {/* Loại cấp */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 font-medium">Loại cấp</p>
                    <p className="text-base font-semibold">{badge.issue_type || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Conditional fields - Full width */}
              <div className="mt-5 space-y-4">
                {badge.previous_badge_number && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                      <Award className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 font-medium">Số phù hiệu cũ</p>
                      <p className="text-base font-semibold">{badge.previous_badge_number}</p>
                    </div>
                  </div>
                )}

                {badge.renewal_due_date && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 font-medium">Hạn gia hạn</p>
                      <p className="text-base font-semibold">{formatDate(badge.renewal_due_date)}</p>
                    </div>
                  </div>
                )}

                {badge.renewal_reason && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <StickyNote className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 font-medium">Lý do gia hạn</p>
                      <p className="text-base font-semibold">{badge.renewal_reason}</p>
                    </div>
                  </div>
                )}

                {/* Thu hồi section */}
                {(badge.revocation_date || badge.revocation_decision || badge.revocation_reason) && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30 p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Thông tin thu hồi</span>
                    </div>
                    {badge.revocation_date && (
                      <div className="pl-7">
                        <p className="text-sm text-slate-500 font-medium">Ngày thu hồi</p>
                        <p className="text-base font-semibold">{formatDate(badge.revocation_date)}</p>
                      </div>
                    )}
                    {badge.revocation_decision && (
                      <div className="pl-7">
                        <p className="text-sm text-slate-500 font-medium">Quyết định</p>
                        <p className="text-base font-semibold">{badge.revocation_decision}</p>
                      </div>
                    )}
                    {badge.revocation_reason && (
                      <div className="pl-7">
                        <p className="text-sm text-slate-500 font-medium">Lý do</p>
                        <p className="text-base font-semibold">{badge.revocation_reason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Ghi chú */}
                {badge.notes && (
                  <div className="flex items-start gap-3 py-2">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                      <StickyNote className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 font-medium">Ghi chú</p>
                      <p className="text-base leading-relaxed">{badge.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
