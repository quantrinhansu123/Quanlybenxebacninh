import { useState, useEffect } from "react"
import { format } from "date-fns"
import { History, User, Calendar, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { iconStyles } from "@/lib/icon-theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { vehicleService } from "@/services/vehicle.service"

interface VehicleHistoryEntry {
  id: string
  vehiclePlateNumber: string
  changeType: 'document_update' | 'vehicle_info' | 'status_change'
  fieldChanged: string
  oldValue: string
  newValue: string
  changedBy: string
  changedAt: string
  notes?: string
}

interface VehicleHistoryTableProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ITEMS_PER_PAGE = 10

// Map document type to Vietnamese display name
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  registration: "Đăng ký",
  inspection: "Đăng kiểm",
  insurance: "Bảo hiểm",
  operation_permit: "Giấy phép kinh doanh",
  emblem: "Phù hiệu",
}

// Transform API audit log to VehicleHistoryEntry
function transformAuditLogToEntry(log: any): VehicleHistoryEntry {
  const oldValues = log.oldValues || {}
  const newValues = log.newValues || {}

  // Determine what field changed based on old/new values
  let fieldChanged = "Giấy tờ"
  let oldValue = ""
  let newValue = ""
  let notes = ""

  // Check for document type in values
  const docType = newValues.documentType || oldValues.documentType
  if (docType && DOCUMENT_TYPE_LABELS[docType]) {
    fieldChanged = DOCUMENT_TYPE_LABELS[docType]
  }

  // Prioritize expiry date changes
  if (oldValues.expiryDate || newValues.expiryDate) {
    oldValue = oldValues.expiryDate ? format(new Date(oldValues.expiryDate), "dd/MM/yyyy") : "-"
    newValue = newValues.expiryDate ? format(new Date(newValues.expiryDate), "dd/MM/yyyy") : "-"
  } else if (oldValues.issueDate || newValues.issueDate) {
    fieldChanged += " (Ngày cấp)"
    oldValue = oldValues.issueDate ? format(new Date(oldValues.issueDate), "dd/MM/yyyy") : "-"
    newValue = newValues.issueDate ? format(new Date(newValues.issueDate), "dd/MM/yyyy") : "-"
  } else if (oldValues.documentNumber || newValues.documentNumber) {
    fieldChanged += " (Số giấy tờ)"
    oldValue = oldValues.documentNumber || "-"
    newValue = newValues.documentNumber || "-"
  }

  // Notes from values
  notes = newValues.notes || oldValues.notes || ""

  return {
    id: log.id,
    vehiclePlateNumber: log.vehiclePlateNumber || "-",
    changeType: "document_update",
    fieldChanged,
    oldValue,
    newValue,
    changedBy: log.userName || "Không xác định",
    changedAt: log.createdAt,
    notes,
  }
}

export function VehicleHistoryTable({ open, onOpenChange }: VehicleHistoryTableProps) {
  const [historyData, setHistoryData] = useState<VehicleHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("")

  useEffect(() => {
    if (open) {
      loadHistoryData()
    }
  }, [open])

  const loadHistoryData = async () => {
    setIsLoading(true)
    try {
      // Fetch real data from API
      const logs = await vehicleService.getAllDocumentAuditLogs()
      const entries = logs.map(transformAuditLogToEntry)
      setHistoryData(entries)
    } catch (error) {
      console.error("Failed to load history data:", error)
      setHistoryData([])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredData = historyData.filter(entry => {
    const matchesSearch = !searchQuery || 
      entry.vehiclePlateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.fieldChanged.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.changedBy.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = !filterType || entry.changeType === filterType

    return matchesSearch && matchesFilter
  })

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentData = filteredData.slice(startIndex, endIndex)

  const getChangeTypeLabel = (type: string) => {
    const labels = {
      document_update: "Cập nhật giấy tờ",
      vehicle_info: "Thông tin xe", 
      status_change: "Thay đổi trạng thái"
    }
    return labels[type as keyof typeof labels] || type
  }

  const getChangeTypeBadge = (type: string) => {
    const variants = {
      document_update: "default",
      vehicle_info: "secondary",
      status_change: "outline"
    }
    return (
      <Badge variant={variants[type as keyof typeof variants] as any}>
        {getChangeTypeLabel(type)}
      </Badge>
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className={iconStyles.historyButton} />
              Lịch sử chỉnh sửa thông số xe
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${iconStyles.navigationIcon}`} />
              <Input
                placeholder="Tìm kiếm biển số, trường thay đổi, người thực hiện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-48"
            >
              <option value="">Tất cả loại thay đổi</option>
              <option value="document_update">Cập nhật giấy tờ</option>
              <option value="vehicle_info">Thông tin xe</option>
              <option value="status_change">Thay đổi trạng thái</option>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-300 animate-pulse" />
              <p>Đang tải lịch sử...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Không có lịch sử thay đổi</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Biển số</TableHead>
                      <TableHead>Loại thay đổi</TableHead>
                      <TableHead>Trường</TableHead>
                      <TableHead>Giá trị cũ</TableHead>
                      <TableHead>Giá trị mới</TableHead>
                      <TableHead>Người thực hiện</TableHead>
                      <TableHead>Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className={iconStyles.navigationIcon} />
                            <div>
                              <div className="font-medium">
                                {format(new Date(entry.changedAt), "dd/MM/yyyy")}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(entry.changedAt), "HH:mm")}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{entry.vehiclePlateNumber}</span>
                        </TableCell>
                        <TableCell>
                          {getChangeTypeBadge(entry.changeType)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{entry.fieldChanged}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-600 line-through">
                            {entry.oldValue}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-green-600 font-medium">
                            {entry.newValue}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className={iconStyles.navigationIcon} />
                            <span>{entry.changedBy}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {entry.notes || "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-gray-600">
                    Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredData.length)} của {filteredData.length} bản ghi
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className={iconStyles.navigationIcon} />
                      Trước
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page = i + 1
                        if (totalPages > 5) {
                          if (currentPage > 3) {
                            page = currentPage - 2 + i
                          }
                          if (currentPage > totalPages - 2) {
                            page = totalPages - 4 + i
                          }
                        }
                        return (
                          <Button
                            key={page}
                            size="sm"
                            variant={currentPage === page ? "default" : "outline"}
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="gap-1"
                    >
                      Sau
                      <ChevronRight className={iconStyles.navigationIcon} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}