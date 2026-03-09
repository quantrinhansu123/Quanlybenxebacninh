import { Operator } from "@/types"
import { Check, X } from "lucide-react"

interface OperatorViewProps {
  operator: Operator
}

export function OperatorView({ operator }: OperatorViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Thông tin chung</h3>
          
          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Tên đơn vị:</span>
            <span className="col-span-2">{operator.name}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Mã đơn vị:</span>
            <span className="col-span-2">{operator.code}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Mã số thuế:</span>
            <span className="col-span-2">{operator.taxCode || "N/A"}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Ủy thác bán vé:</span>
            <span className="col-span-2 flex items-center">
              {operator.isTicketDelegated ? (
                <span className="flex items-center text-green-600"><Check className="h-4 w-4 mr-1" /> Có</span>
              ) : (
                <span className="flex items-center text-gray-500"><X className="h-4 w-4 mr-1" /> Không</span>
              )}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Trạng thái:</span>
            <span className="col-span-2">
              {operator.isActive ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Hoạt động
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Ngừng hoạt động
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Liên hệ & Địa chỉ</h3>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Số điện thoại:</span>
            <span className="col-span-2">{operator.phone || "N/A"}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Email:</span>
            <span className="col-span-2">{operator.email || "N/A"}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Địa chỉ:</span>
            <span className="col-span-2">
              {[operator.address, operator.district, operator.province].filter(Boolean).join(", ") || "N/A"}
            </span>
          </div>
        </div>

        {/* Representative Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Người đại diện</h3>
          
          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Họ tên:</span>
            <span className="col-span-2">{operator.representativeName || "N/A"}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <span className="font-medium text-gray-500">Chức vụ:</span>
            <span className="col-span-2">{operator.representativePosition || "N/A"}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
