import { useState, useMemo } from "react"
import { format, differenceInDays } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
  FileText,
  Shield,
  FileCheck,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Badge,
  Award,
  Car,
  MapPin,
  Users,
  Package,
  History,
  BedDouble,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DocumentHistoryDialog } from "@/components/dispatch/DocumentHistoryDialog"
import type { Vehicle, DocumentInfo } from "../types"

// Helper functions
const getVehicleTypeName = (vehicle: Vehicle): string => {
  return vehicle.vehicleType?.name || vehicle.vehicleTypeId || ""
}

const getOperatorName = (vehicle: Vehicle): string => {
  return vehicle.operator?.name || vehicle.operatorName || ""
}

// Helper function to calculate days until expiry
const getDaysUntilExpiry = (expiryDate: string): number | null => {
  if (!expiryDate) return null
  try {
    const expiry = new Date(expiryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expiry.setHours(0, 0, 0, 0)
    return differenceInDays(expiry, today)
  } catch {
    return null
  }
}

// Helper function to get expiry status
const getExpiryStatus = (expiryDate: string | undefined): {
  status: "valid" | "expiring" | "expired" | "missing"
  label: string
  color: string
  icon: JSX.Element
} => {
  if (!expiryDate) {
    return {
      status: "missing",
      label: "Chưa có",
      color: "text-gray-500",
      icon: <XCircle className="h-4 w-4" />,
    }
  }

  const days = getDaysUntilExpiry(expiryDate)
  if (days === null) {
    return {
      status: "missing",
      label: "Không hợp lệ",
      color: "text-gray-500",
      icon: <XCircle className="h-4 w-4" />,
    }
  }

  if (days < 0) {
    return {
      status: "expired",
      label: "Đã hết hạn",
      color: "text-red-600",
      icon: <XCircle className="h-4 w-4" />,
    }
  }

  if (days <= 30) {
    return {
      status: "expiring",
      label: `Còn ${days} ngày`,
      color: "text-orange-600",
      icon: <AlertTriangle className="h-4 w-4" />,
    }
  }

  return {
    status: "valid",
    label: `Còn ${days} ngày`,
    color: "text-green-600",
    icon: <CheckCircle2 className="h-4 w-4" />,
  }
}

interface VehicleViewProps {
  vehicle: Vehicle
}

// Document type configuration
const DOCUMENT_TYPES = [
  {
    key: "registration" as const,
    title: "Đăng ký xe",
    icon: FileText,
    description: "Giấy đăng ký xe",
  },
  {
    key: "operation_permit" as const,
    title: "Phù hiệu",
    icon: Award,
    description: "Giấy phép hoạt động vận tải",
  },
  {
    key: "inspection" as const,
    title: "Đăng kiểm",
    icon: FileCheck,
    description: "Giấy chứng nhận kiểm định",
  },
  {
    key: "insurance" as const,
    title: "Bảo hiểm",
    icon: Shield,
    description: "Bảo hiểm xe",
  },
  {
    key: "emblem" as const,
    title: "Biển hiệu",
    icon: Badge,
    description: "Biển hiệu xe",
  },
]

export function VehicleView({ vehicle }: VehicleViewProps) {
  const [activeTab, setActiveTab] = useState("info")
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)

  // Calculate document statistics
  const documentStats = useMemo(() => {
    const docs = vehicle.documents || {}
    let validCount = 0
    let expiredCount = 0
    let expiringCount = 0
    let missingCount = 0

    DOCUMENT_TYPES.forEach(({ key }) => {
      const doc = docs[key]
      if (!doc) {
        missingCount++
        return
      }

      const status = getExpiryStatus(doc.expiryDate)
      if (status.status === "expired") expiredCount++
      else if (status.status === "expiring") expiringCount++
      else if (status.status === "valid") validCount++
      else missingCount++
    })

    return { validCount, expiredCount, expiringCount, missingCount, total: DOCUMENT_TYPES.length }
  }, [vehicle.documents])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="info">Thông tin cơ bản</TabsTrigger>
        <TabsTrigger value="documents">
          Giấy tờ
          {documentStats.expiredCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
              {documentStats.expiredCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="history">Lịch sử hoạt động</TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Car className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Biển số</Label>
                  <p className="text-lg font-semibold text-gray-900">{vehicle.plateNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Loại xe</Label>
                  <p className="text-lg font-semibold text-gray-900">
                    {getVehicleTypeName(vehicle) || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Số ghế</Label>
                  <p className="text-lg font-semibold text-gray-900">
                    {vehicle.seatCapacity || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <BedDouble className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Số giường</Label>
                  <p className="text-lg font-semibold text-gray-900">
                    {vehicle.bedCapacity || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Nhà xe</Label>
                  <p className="text-lg font-semibold text-gray-900">
                    {getOperatorName(vehicle) || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Tỉnh/Thành phố</Label>
                  <p className="text-lg font-semibold text-gray-900">
                    {vehicle.province || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(vehicle.chassisNumber || vehicle.engineNumber) && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-500">Thông tin kỹ thuật</Label>
                  {vehicle.chassisNumber && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Số khung:</span> {vehicle.chassisNumber}
                    </p>
                  )}
                  {vehicle.engineNumber && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Số máy:</span> {vehicle.engineNumber}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      <TabsContent value="documents" className="space-y-6 mt-6">
        {/* Document Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Tổng quan giấy tờ
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <History className="h-4 w-4" />
                    Lịch sử thay đổi
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  {documentStats.validCount}/{documentStats.total} giấy tờ còn hiệu lực
                </p>
              </div>
              <div className="flex items-center gap-4">
                {documentStats.validCount > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {documentStats.validCount}
                    </div>
                    <div className="text-xs text-gray-600">Hợp lệ</div>
                  </div>
                )}
                {documentStats.expiringCount > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {documentStats.expiringCount}
                    </div>
                    <div className="text-xs text-gray-600">Sắp hết hạn</div>
                  </div>
                )}
                {documentStats.expiredCount > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {documentStats.expiredCount}
                    </div>
                    <div className="text-xs text-gray-600">Hết hạn</div>
                  </div>
                )}
                {documentStats.missingCount > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {documentStats.missingCount}
                    </div>
                    <div className="text-xs text-gray-600">Thiếu</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOCUMENT_TYPES.map(({ key, title, icon: Icon, description }) => {
            const doc = vehicle.documents?.[key]
            return (
              <DocumentCard
                key={key}
                title={title}
                description={description}
                icon={Icon}
                doc={doc}
              />
            )
          })}
        </div>
      </TabsContent>

      <TabsContent value="history" className="mt-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 text-center py-8">
              Lịch sử hoạt động sẽ được hiển thị ở đây
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Document History Dialog */}
      <DocumentHistoryDialog
        vehicleId={vehicle.id}
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
      />
    </Tabs>
  )
}

function DocumentCard({
  title,
  description,
  icon: Icon,
  doc,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  doc?: DocumentInfo
}) {
  const expiryStatus = getExpiryStatus(doc?.expiryDate)
  const daysUntilExpiry = doc?.expiryDate ? getDaysUntilExpiry(doc.expiryDate) : null

  return (
    <Card
      className={`transition-all hover:shadow-lg ${
        expiryStatus.status === "expired"
          ? "border-red-300 bg-red-50/50"
          : expiryStatus.status === "expiring"
          ? "border-orange-300 bg-orange-50/50"
          : expiryStatus.status === "valid"
          ? "border-green-300 bg-green-50/50"
          : "border-gray-200 bg-gray-50/50"
      }`}
    >
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  expiryStatus.status === "expired"
                    ? "bg-red-100"
                    : expiryStatus.status === "expiring"
                    ? "bg-orange-100"
                    : expiryStatus.status === "valid"
                    ? "bg-green-100"
                    : "bg-gray-100"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    expiryStatus.status === "expired"
                      ? "text-red-600"
                      : expiryStatus.status === "expiring"
                      ? "text-orange-600"
                      : expiryStatus.status === "valid"
                      ? "text-green-600"
                      : "text-gray-600"
                  }`}
                />
              </div>
              <div>
                <p className="font-semibold text-base text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </div>
            <div className={`flex items-center gap-1 ${expiryStatus.color}`}>
              {expiryStatus.icon}
              <span className="text-sm font-medium">{expiryStatus.label}</span>
            </div>
          </div>

          {/* Document Info */}
          {doc ? (
            <div className="space-y-2 pt-2 border-t border-gray-200">
              {doc.number && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 font-medium">Số:</span>
                  <span className="text-gray-900">{doc.number}</span>
                </div>
              )}

              {doc.issueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500 font-medium">Ngày cấp:</span>
                  <span className="text-gray-900">
                    {format(new Date(doc.issueDate), "dd/MM/yyyy")}
                  </span>
                </div>
              )}

              {doc.expiryDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500 font-medium">Hết hạn:</span>
                  <span className="text-gray-900">
                    {format(new Date(doc.expiryDate), "dd/MM/yyyy")}
                  </span>
                  {daysUntilExpiry !== null && daysUntilExpiry >= 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      daysUntilExpiry <= 30
                        ? "bg-orange-100 text-orange-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {daysUntilExpiry === 0
                        ? "Hôm nay"
                        : daysUntilExpiry === 1
                        ? "Còn 1 ngày"
                        : `Còn ${daysUntilExpiry} ngày`}
                    </span>
                  )}
                </div>
              )}

              {doc.issuingAuthority && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500 font-medium">Cơ quan cấp:</span>
                  <span className="text-gray-900">{doc.issuingAuthority}</span>
                </div>
              )}

              {doc.notes && (
                <div className="text-sm pt-1">
                  <span className="text-gray-500 font-medium">Ghi chú: </span>
                  <span className="text-gray-700">{doc.notes}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-500 italic">Chưa có thông tin</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
