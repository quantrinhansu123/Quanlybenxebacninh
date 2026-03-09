import { useState, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Driver } from "@/types"
import { formatDateOnly } from "@/lib/date-utils"

// Parse address string to extract components
const parseAddress = (addressValue?: string) => {
  if (!addressValue) {
    return {
      addressDetail: "",
      ward: "",
      district: "",
      province: "",
    }
  }

  const addressParts = addressValue.split(",").map(s => s.trim()).filter(Boolean)
  
  let addressDetail = ""
  let ward = ""
  let district = ""
  let province = ""
  
  if (addressParts.length > 0) {
    // Province is always the last part
    province = addressParts[addressParts.length - 1] || ""

    if (addressParts.length === 4) {
      // V1 format with specific address: "123 Đường ABC, Phường XYZ, Quận Cầu Giấy, Hà Nội"
      addressDetail = addressParts[0] || ""
      ward = addressParts[1] || ""
      district = addressParts[2] || ""
    } else if (addressParts.length === 3) {
      // V1 format without specific address: "Phường XYZ, Quận Cầu Giấy, Hà Nội"
      ward = addressParts[0] || ""
      district = addressParts[1] || ""
    } else if (addressParts.length === 2) {
      // V2 format: "Phường XYZ, Hà Nội"
      ward = addressParts[0] || ""
    } else if (addressParts.length === 1) {
      // Only province
      // province already set above
    } else if (addressParts.length > 4) {
      // More than 4 parts - treat first N-3 as address detail
      console.warn(`Unexpected address format: ${addressValue} (${addressParts.length} parts)`)
      addressDetail = addressParts.slice(0, -3).join(", ")
      ward = addressParts[addressParts.length - 3] || ""
      district = addressParts[addressParts.length - 2] || ""
    }
  }
  
  return {
    addressDetail,
    ward,
    district,
    province,
  }
}

export function DriverView({ driver }: { driver: Driver }) {
  const [useApiV2, setUseApiV2] = useState(false)
  
  // Parse address
  const addressParts = useMemo(() => {
    return parseAddress(driver.address)
  }, [driver.address])

  return (
    <div className="space-y-6">
      {/* Header with title */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Thông tin lái xe</h3>
      </div>

      {/* Main 2 column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Sub-columns for ID and License info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Column 1a - ID Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Số CMND/CCCD</Label>
                <p className="text-base font-medium text-gray-900">{driver.idNumber}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Họ tên</Label>
                <p className="text-base font-medium text-gray-900">{driver.fullName}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Số điện thoại</Label>
                <p className="text-base font-medium text-gray-900">{driver.phone || "N/A"}</p>
              </div>
            </div>

            {/* Column 1b - License Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Số GPLX</Label>
                <p className="text-base font-medium text-gray-900">{driver.licenseNumber}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Hạng GPLX</Label>
                <p className="text-base font-medium text-gray-900">{driver.licenseClass}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Hạn hiệu lực GPLX</Label>
                <p className="text-base font-medium text-gray-900">
                  {formatDateOnly(driver.licenseExpiryDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Địa chỉ */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 border-b pb-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                Thông tin địa chỉ
              </h3>
              {/* Checkbox chọn API version (chỉ để hiển thị, không ảnh hưởng dữ liệu) */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useApiV2"
                  checked={useApiV2}
                  onChange={(e) => setUseApiV2(e.target.checked)}
                  className="h-4 w-4"
                  disabled
                />
                <Label htmlFor="useApiV2" className="cursor-default text-xs sm:text-sm text-gray-500">
                  Sử dụng dữ liệu sau sáp nhập.
                </Label>
              </div>
            </div>

            {useApiV2 ? (
              // V2: 2 cột (Tỉnh và Phường/Xã)
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Tỉnh/Thành phố
                  </Label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {addressParts.province || "N/A"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Phường/Xã
                  </Label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {addressParts.ward || "N/A"}
                  </p>
                </div>
              </div>
            ) : (
              // V1: 3 cột (Tỉnh, Quận/Huyện, Phường/Xã)
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Tỉnh/Thành phố
                  </Label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {addressParts.province || "N/A"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Quận/Huyện/Thị xã
                  </Label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {addressParts.district || "N/A"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Phường/Xã</Label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {addressParts.ward || "N/A"}
                  </p>
                </div>
              </div>
            )}

            {/* Địa chỉ cụ thể */}
            <div>
              <Label className="text-sm font-medium text-gray-600">Địa chỉ cụ thể</Label>
              <p className="text-base font-medium text-gray-900 mt-1">
                {addressParts.addressDetail || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Column 2a - Operator info */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-600">Doanh nghiệp vận tải</Label>
            <div className="border rounded-md p-4 bg-gray-50 min-h-[200px] max-h-[400px] overflow-y-auto">
              {(() => {
                // Use operators array if available, otherwise fallback to single operator
                const operatorsList = driver.operators && driver.operators.length > 0
                  ? driver.operators
                  : driver.operator
                    ? [{ ...driver.operator, isPrimary: true }]
                    : []

                if (operatorsList.length === 0) {
                  return <p className="text-sm text-gray-500">N/A</p>
                }

                return (
                  <div className="space-y-3">
                    {operatorsList.map((operator, index) => (
                      <div 
                        key={operator.id || index}
                        className="p-3 bg-white rounded border border-gray-200"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-base font-medium text-gray-900">
                              {operator.name}
                            </p>
                            {operator.code && (
                              <p className="text-sm text-gray-600 mt-1">
                                Mã: {operator.code}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t text-xs text-gray-500">
                      Tổng: {operatorsList.length} doanh nghiệp
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Column 2b - Image Display */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-600">Ảnh lái xe</Label>
            {driver.imageUrl ? (
              <div className="border rounded-md p-2 bg-gray-50">
                <img 
                  src={driver.imageUrl} 
                  alt="Driver" 
                  className="w-full aspect-[3/4] object-cover rounded"
                />
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-md p-4 text-center aspect-[3/4] flex flex-col items-center justify-center bg-gray-50">
                <p className="text-sm text-gray-500">Không có ảnh</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
