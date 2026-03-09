import { useState, useEffect } from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { vehicleService } from "@/services/vehicle.service"
import { History, Clock, User, FileText } from "lucide-react"
import { formatVietnamDateTime } from "@/lib/vietnam-time"

interface DocumentHistoryDialogProps {
  vehicleId: string
  open: boolean
  onClose: () => void
}

interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  recordId: string
  oldValues: any
  newValues: any
  createdAt: string
}

const getDocumentTypeLabel = (docType: string): string => {
  const labels: Record<string, string> = {
    registration: 'Đăng ký xe',
    inspection: 'Đăng kiểm',
    insurance: 'Bảo hiểm',
    operation_permit: 'Phù hiệu',
    emblem: 'Biển hiệu',
  }
  return labels[docType] || docType
}

const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    CREATE_DOCUMENT: 'Tạo mới giấy tờ',
    UPDATE_DOCUMENT: 'Cập nhật giấy tờ',
    UPDATE_DOCUMENT_EXPIRY: 'Cập nhật hạn giấy tờ',
  }
  return labels[action] || action
}

export function DocumentHistoryDialog({
  vehicleId,
  open,
  onClose,
}: DocumentHistoryDialogProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && vehicleId) {
      loadAuditLogs()
    }
  }, [open, vehicleId])

  const loadAuditLogs = async () => {
    setIsLoading(true)
    try {
      const data = await vehicleService.getDocumentAuditLogs(vehicleId)
      setLogs(data)
    } catch (error) {
      console.error("Failed to load audit logs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Lịch sử thay đổi giấy tờ xe
          </DialogTitle>
        </DialogHeader>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Đang tải...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có lịch sử thay đổi
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loại giấy tờ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người thực hiện
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số giấy tờ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày cấp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hết hạn
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Biển số
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => {
                    const values = log.newValues || log.oldValues || {};
                    const isUpdate = log.oldValues && log.newValues;
                    
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {formatVietnamDateTime(log.createdAt, "dd/MM/yyyy HH:mm")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">
                              {values.document_type
                                ? getDocumentTypeLabel(values.document_type)
                                : 'Giấy tờ'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            log.action === 'CREATE_DOCUMENT' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="font-medium">{log.userName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {isUpdate ? (
                            <div className="space-y-1">
                              {log.oldValues?.document_number && (
                                <div className="text-gray-500 line-through">
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
                            <span className="font-medium">
                              {values.document_number || '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {isUpdate ? (
                            <div className="space-y-1">
                              {log.oldValues?.issue_date && (
                                <div className="text-gray-500 line-through">
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
                            <span className="font-medium">
                              {values.issue_date 
                                ? format(new Date(values.issue_date), "dd/MM/yyyy")
                                : '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {isUpdate ? (
                            <div className="space-y-1">
                              {log.oldValues?.expiry_date && (
                                <div className="text-gray-500 line-through">
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
                            <span className="font-medium">
                              {values.expiry_date 
                                ? format(new Date(values.expiry_date), "dd/MM/yyyy")
                                : '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {isUpdate ? (
                            <div className="space-y-1">
                              {log.oldValues?.vehicle_plate && (
                                <div className="text-gray-500 line-through">
                                  {log.oldValues.vehicle_plate}
                                </div>
                              )}
                              {log.newValues?.vehicle_plate && (
                                <div className="text-green-700 font-medium">
                                  {log.newValues.vehicle_plate}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="font-medium">
                              {values.vehicle_plate || '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

