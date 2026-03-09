import { useState } from "react"
import { toast } from "react-toastify"
import { Search, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface RejectionReason {
  id: string
  description: string
  category: string
  categoryName: string
}

interface LyDoKhongDuDieuKienDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (selectedReasons: string[], options: {
    createOrder: boolean
    signAndTransmit: boolean
    printDisplay: boolean
  }) => void
}

const rejectionReasons: RejectionReason[] = [
  {
    id: "driver_license_insufficient",
    description: "Không có hoặc có nhưng không đủ số lượng giấy phép lái xe so với số lái xe ghi trên lệnh vận chuyển",
    category: "driver",
    categoryName: "Các điều kiện không được phép xuất bến liên quan đến lái xe"
  },
  {
    id: "driver_license_expired",
    description: "Giấy phép lái xe đã hết hạn hoặc sử dụng giấy phép lái xe giả",
    category: "driver",
    categoryName: "Các điều kiện không được phép xuất bến liên quan đến lái xe"
  },
  {
    id: "driver_license_class_mismatch",
    description: "Hạng giấy phép lái xe không phù hợp với các loại xe được phép điều khiển",
    category: "driver",
    categoryName: "Các điều kiện không được phép xuất bến liên quan đến lái xe"
  },
  {
    id: "driver_info_mismatch",
    description: "Thông tin của lái xe không đúng với thông tin được ghi trên lệnh vận chuyển",
    category: "driver",
    categoryName: "Các điều kiện không được phép xuất bến liên quan đến lái xe"
  },
  {
    id: "driver_alcohol",
    description: "Lái xe sử dụng rượu bia",
    category: "driver",
    categoryName: "Các điều kiện không được phép xuất bến liên quan đến lái xe"
  },
  {
    id: "driver_drugs",
    description: "Lái xe sử dụng chất ma tuý",
    category: "driver",
    categoryName: "Các điều kiện không được phép xuất bến liên quan đến lái xe"
  }
]

export function LyDoKhongDuDieuKienDialog({
  open,
  onClose,
  onConfirm
}: LyDoKhongDuDieuKienDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["driver"]))
  const [createOrder, setCreateOrder] = useState(true)
  const [signAndTransmit, setSignAndTransmit] = useState(true)
  const [printDisplay, setPrintDisplay] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredReasons = rejectionReasons.filter(reason =>
    reason.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reason.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedReasons = filteredReasons.reduce((acc, reason) => {
    if (!acc[reason.category]) {
      acc[reason.category] = {
        categoryName: reason.categoryName,
        reasons: []
      }
    }
    acc[reason.category].reasons.push(reason)
    return acc
  }, {} as Record<string, { categoryName: string; reasons: RejectionReason[] }>)

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const toggleReason = (reasonId: string) => {
    setSelectedReasons(prev => {
      if (prev.includes(reasonId)) {
        return prev.filter(id => id !== reasonId)
      } else {
        return [...prev, reasonId]
      }
    })
  }

  const handleConfirm = () => {
    if (selectedReasons.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một lý do")
      return
    }
    onConfirm(selectedReasons, {
      createOrder,
      signAndTransmit,
      printDisplay
    })
  }

  const allReasonsList = Object.values(groupedReasons).flatMap(group => group.reasons)
  const totalPages = Math.ceil(allReasonsList.length / itemsPerPage)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chọn lý do xe không đủ điều kiện xuất bến</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Tìm kiếm..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Reasons List */}
          <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
            {searchQuery ? (
              // Show flat list when searching
              <div className="p-4 space-y-2">
                {filteredReasons.map((reason) => (
                  <div key={reason.id} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded">
                    <Checkbox
                      id={reason.id}
                      checked={selectedReasons.includes(reason.id)}
                      onChange={() => toggleReason(reason.id)}
                      className="mt-1"
                    />
                    <Label htmlFor={reason.id} className="flex-1 cursor-pointer text-sm">
                      {reason.description}
                    </Label>
                  </div>
                ))}
                {filteredReasons.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Không tìm thấy kết quả
                  </div>
                )}
              </div>
            ) : (
              // Show grouped list when not searching
              <div className="p-4 space-y-4">
                {Object.entries(groupedReasons).map(([category, group]) => (
                  <div key={category}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          Phân loại: {group.categoryName}
                        </span>
                      </div>
                      {expandedCategories.has(category) ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    {expandedCategories.has(category) && (
                      <div className="ml-4 space-y-2 mt-2">
                        {group.reasons.map((reason) => (
                          <div key={reason.id} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded">
                            <Checkbox
                              id={reason.id}
                              checked={selectedReasons.includes(reason.id)}
                              onChange={() => toggleReason(reason.id)}
                              className="mt-1"
                            />
                            <Label htmlFor={reason.id} className="flex-1 cursor-pointer text-sm">
                              {reason.description}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination (only show when searching) */}
          {searchQuery && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    currentPage === page
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}

          {/* Options */}
          <div className="flex items-center gap-6 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createOrder"
                checked={createOrder}
                onChange={(e) => setCreateOrder(e.target.checked)}
              />
              <Label htmlFor="createOrder" className="cursor-pointer text-sm">
                Tạo đơn hàng
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="signAndTransmit"
                checked={signAndTransmit}
                onChange={(e) => setSignAndTransmit(e.target.checked)}
              />
              <Label htmlFor="signAndTransmit" className="cursor-pointer text-sm">
                Ký lệnh và truyền tải
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="printDisplay"
                checked={printDisplay}
                onChange={(e) => setPrintDisplay(e.target.checked)}
              />
              <Label htmlFor="printDisplay" className="cursor-pointer text-sm">
                In bản thể hiện
              </Label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            HỦY
          </Button>
          <Button type="button" onClick={handleConfirm}>
            XÁC NHẬN
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

