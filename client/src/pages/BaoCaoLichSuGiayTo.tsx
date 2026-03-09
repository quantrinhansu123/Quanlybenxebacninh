import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { toast } from "react-toastify"
import * as XLSX from "xlsx"
import {
  RefreshCw,
  Search,
  FileSpreadsheet,
  History,
  User,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DatePickerRange } from "@/components/DatePickerRange"
import { useUIStore } from "@/store/ui.store"
import { vehicleService } from "@/services/vehicle.service"
import { iconStyles } from "@/lib/icon-theme"
import { type DateRange } from "react-day-picker"

interface AuditLogEntry {
  id: string
  userId: string
  userName: string
  action: string
  recordId: string
  oldValues: any
  newValues: any
  createdAt: string
  vehiclePlateNumber?: string
}

const ITEMS_PER_PAGE = 20

const getDocumentTypeLabel = (docType: string): string => {
  const labels: Record<string, string> = {
    registration: "Đăng ký xe",
    inspection: "Đăng kiểm",
    insurance: "Bảo hiểm",
    operation_permit: "Phù hiệu",
    emblem: "Biển hiệu",
  }
  return labels[docType] || docType
}

const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    CREATE_DOCUMENT: "Tạo mới giấy tờ",
    UPDATE_DOCUMENT: "Cập nhật giấy tờ",
    UPDATE_DOCUMENT_EXPIRY: "Cập nhật hạn giấy tờ",
  }
  return labels[action] || action
}

const getActionBadgeVariant = (action: string) => {
  if (action.includes("CREATE")) return "success"
  if (action.includes("UPDATE")) return "default"
  return "secondary"
}

export default function BaoCaoLichSuGiayTo() {
  const setTitle = useUIStore((state) => state.setTitle)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterAction, setFilterAction] = useState("")
  const [filterDocType, setFilterDocType] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setTitle("Báo cáo > Lịch sử thay đổi giấy tờ")
    loadAllAuditLogs()
  }, [setTitle])

  const loadAllAuditLogs = async () => {
    setIsLoading(true)
    try {
      // Use optimized API endpoint that fetches all logs in one request
      const allLogs = await vehicleService.getAllDocumentAuditLogs()
      setLogs(allLogs)
    } catch (error) {
      console.error("Failed to load audit logs:", error)
      toast.error("Không thể tải lịch sử thay đổi giấy tờ")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchableText = [
          log.vehiclePlateNumber || "",
          log.userName || "",
          getDocumentTypeLabel(log.newValues?.document_type || ""),
          getActionLabel(log.action),
        ].join(" ").toLowerCase()
        
        if (!searchableText.includes(query)) return false
      }
      
      // Action filter
      if (filterAction && log.action !== filterAction) return false
      
      // Document type filter
      if (filterDocType && log.newValues?.document_type !== filterDocType) return false
      
      // Date range filter
      if (dateRange?.from) {
        const logDate = new Date(log.createdAt)
        const fromDate = new Date(dateRange.from)
        fromDate.setHours(0, 0, 0, 0)
        
        if (logDate < fromDate) return false
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to)
          toDate.setHours(23, 59, 59, 999)
          if (logDate > toDate) return false
        }
      }
      
      return true
    })
  }, [logs, searchQuery, filterAction, filterDocType, dateRange])

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentLogs = filteredLogs.slice(startIndex, endIndex)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterAction, filterDocType, dateRange])

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      toast.warning("Không có dữ liệu để xuất Excel")
      return
    }

    try {
      const excelData = filteredLogs.map((log, index) => ({
        STT: index + 1,
        "Thời gian": format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss"),
        "Biển số xe": log.vehiclePlateNumber || "-",
        "Loại giấy tờ": getDocumentTypeLabel(log.newValues?.document_type || ""),
        "Hành động": getActionLabel(log.action),
        "Người thực hiện": log.userName,
        "Số giấy tờ cũ": log.oldValues?.document_number || "-",
        "Số giấy tờ mới": log.newValues?.document_number || "-",
        "Ngày cấp cũ": log.oldValues?.issue_date 
          ? format(new Date(log.oldValues.issue_date), "dd/MM/yyyy") 
          : "-",
        "Ngày cấp mới": log.newValues?.issue_date 
          ? format(new Date(log.newValues.issue_date), "dd/MM/yyyy") 
          : "-",
        "Hết hạn cũ": log.oldValues?.expiry_date 
          ? format(new Date(log.oldValues.expiry_date), "dd/MM/yyyy") 
          : "-",
        "Hết hạn mới": log.newValues?.expiry_date 
          ? format(new Date(log.newValues.expiry_date), "dd/MM/yyyy") 
          : "-",
      }))

      const ws = XLSX.utils.json_to_sheet(excelData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Lịch sử giấy tờ")

      const filename = `Lich-su-thay-doi-giay-to_${format(new Date(), "dd-MM-yyyy")}.xlsx`
      XLSX.writeFile(wb, filename)
      
      toast.success(`Đã xuất Excel: ${filename}`)
    } catch (error) {
      console.error("Failed to export Excel:", error)
      toast.error("Không thể xuất Excel")
    }
  }

  // Statistics
  const stats = useMemo(() => {
    return {
      total: filteredLogs.length,
      creates: filteredLogs.filter(l => l.action.includes("CREATE")).length,
      updates: filteredLogs.filter(l => l.action.includes("UPDATE")).length,
      uniqueVehicles: new Set(filteredLogs.map(l => l.vehiclePlateNumber)).size,
    }
  }, [filteredLogs])

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Tổng thay đổi</p>
                <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
              </div>
              <History className={`h-8 w-8 ${iconStyles.infoIcon}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Tạo mới</p>
                <p className="text-2xl font-bold text-green-800">{stats.creates}</p>
              </div>
              <FileText className={`h-8 w-8 ${iconStyles.successIcon}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Cập nhật</p>
                <p className="text-2xl font-bold text-orange-800">{stats.updates}</p>
              </div>
              <Calendar className={`h-8 w-8 ${iconStyles.warningIcon}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Số xe</p>
                <p className="text-2xl font-bold text-purple-800">{stats.uniqueVehicles}</p>
              </div>
              <span className="text-3xl">🚌</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <History className={iconStyles.historyButton} />
            Lịch sử thay đổi giấy tờ xe
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isLoading || filteredLogs.length === 0}
              className="gap-2"
            >
              <FileSpreadsheet className={iconStyles.infoIcon} />
              Xuất Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllAuditLogs}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`${iconStyles.infoIcon} ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${iconStyles.navigationIcon}`} />
              <Input
                placeholder="Tìm biển số, người thực hiện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="">Tất cả hành động</option>
              <option value="CREATE_DOCUMENT">Tạo mới giấy tờ</option>
              <option value="UPDATE_DOCUMENT">Cập nhật giấy tờ</option>
              <option value="UPDATE_DOCUMENT_EXPIRY">Cập nhật hạn giấy tờ</option>
            </Select>
            
            <Select
              value={filterDocType}
              onChange={(e) => setFilterDocType(e.target.value)}
            >
              <option value="">Tất cả loại giấy tờ</option>
              <option value="registration">Đăng ký xe</option>
              <option value="inspection">Đăng kiểm</option>
              <option value="insurance">Bảo hiểm</option>
              <option value="operation_permit">Phù hiệu</option>
              <option value="emblem">Biển hiệu</option>
            </Select>
            
            <DatePickerRange
              range={dateRange}
              onRangeChange={setDateRange}
              placeholder="Chọn khoảng thời gian"
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12">STT</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Biển số xe</TableHead>
                  <TableHead>Loại giấy tờ</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Số giấy tờ</TableHead>
                  <TableHead>Ngày cấp</TableHead>
                  <TableHead>Hết hạn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex justify-center items-center gap-2">
                        <RefreshCw className={`${iconStyles.infoIcon} animate-spin`} />
                        Đang tải dữ liệu...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : currentLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                      <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Không có dữ liệu lịch sử</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentLogs.map((log, index) => {
                    const isUpdate = log.oldValues && log.newValues
                    const values = log.newValues || log.oldValues || {}
                    
                    return (
                      <TableRow key={log.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {startIndex + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className={`h-4 w-4 ${iconStyles.navigationIcon}`} />
                            <div>
                              <div className="font-medium">
                                {format(new Date(log.createdAt), "dd/MM/yyyy")}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(log.createdAt), "HH:mm:ss")}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-blue-600">
                            {log.vehiclePlateNumber || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getDocumentTypeLabel(values.document_type || "")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action) as any}>
                            {getActionLabel(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className={`h-4 w-4 ${iconStyles.navigationIcon}`} />
                            <span>{log.userName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isUpdate ? (
                            <div className="space-y-1">
                              {log.oldValues?.document_number && (
                                <div className="text-gray-500 line-through text-xs">
                                  {log.oldValues.document_number}
                                </div>
                              )}
                              {log.newValues?.document_number && (
                                <div className="text-green-700 font-medium">
                                  {log.newValues.document_number}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>{values.document_number || "-"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isUpdate ? (
                            <div className="space-y-1">
                              {log.oldValues?.issue_date && (
                                <div className="text-gray-500 line-through text-xs">
                                  {format(new Date(log.oldValues.issue_date), "dd/MM/yyyy")}
                                </div>
                              )}
                              {log.newValues?.issue_date && (
                                <div className="text-green-700 font-medium">
                                  {format(new Date(log.newValues.issue_date), "dd/MM/yyyy")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>
                              {values.issue_date 
                                ? format(new Date(values.issue_date), "dd/MM/yyyy")
                                : "-"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isUpdate ? (
                            <div className="space-y-1">
                              {log.oldValues?.expiry_date && (
                                <div className="text-gray-500 line-through text-xs">
                                  {format(new Date(log.oldValues.expiry_date), "dd/MM/yyyy")}
                                </div>
                              )}
                              {log.newValues?.expiry_date && (
                                <div className="text-green-700 font-medium">
                                  {format(new Date(log.newValues.expiry_date), "dd/MM/yyyy")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>
                              {values.expiry_date 
                                ? format(new Date(values.expiry_date), "dd/MM/yyyy")
                                : "-"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-gray-600">
                Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} của {filteredLogs.length} bản ghi
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
                    if (page < 1 || page > totalPages) return null
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
        </CardContent>
      </Card>
    </div>
  )
}