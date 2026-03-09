import { useState, useEffect, useRef, useMemo } from "react"
import { toast } from "react-toastify"
import { Search, Download, Plus, Upload, FileSpreadsheet, Award, TrendingUp, CheckCircle, XCircle, Clock } from "lucide-react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/layout/StatusBadge"
import { ActionMenu } from "@/components/ui/ActionMenu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { vehicleBadgeService, type VehicleBadge, type CreateVehicleBadgeInput } from "@/services/vehicle-badge.service"
import { quanlyDataService } from "@/services/quanly-data.service"
import { useUIStore } from "@/store/ui.store"
import { useDialogHistory } from "@/hooks/useDialogHistory"
import { DatePicker } from "@/components/DatePicker"
import BadgeDetailDialog from "./badge-detail-dialog"
import { useAppSheetPolling } from "@/hooks/use-appsheet-polling"
import { normalizeBadgeRows, type NormalizedAppSheetBadge } from "@/services/appsheet-normalize-badges"
import { vehicleBadgeService as vehicleBadgeFeatService } from "@/features/fleet/vehicle-badges"

// Helper function to convert Date to ISO string (YYYY-MM-DD)
const formatDateToISO = (date: Date | null): string => {
  if (!date) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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

// Helper function to get status badge variant
const getStatusVariant = (status: string): "active" | "inactive" | "maintenance" => {
  if (!status) return "inactive"
  const s = status.toLowerCase()
  // English enum from DB
  if (s === "active") return "active"
  if (s === "expired") return "inactive"
  if (s === "revoked") return "maintenance"
  // Vietnamese text (legacy/display values)
  if (s.includes("hiệu lực") || s.includes("cấp mới") || s.includes("cap moi")) return "active"
  if (s.includes("hết") || s.includes("het")) return "inactive"
  if (s.includes("thu hồi") || s.includes("thu hoi")) return "maintenance"
  return "inactive"
}

export default function QuanLyPhuHieuXe() {
  const [badges, setBadges] = useState<VehicleBadge[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterBadgeType, setFilterBadgeType] = useState("")
  const [filterBadgeColor, setFilterBadgeColor] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState<VehicleBadge | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [badgeToDelete, setBadgeToDelete] = useState<VehicleBadge | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importData, setImportData] = useState<CreateVehicleBadgeInput[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state with Date objects for date fields
  const [formData, setFormData] = useState<Omit<CreateVehicleBadgeInput, 'issue_date' | 'expiry_date'> & {
    issue_date: Date | null
    expiry_date: Date | null
  }>({
    badge_number: "",
    license_plate_sheet: "",
    badge_type: "",
    badge_color: "",
    issue_date: null,
    expiry_date: null,
    status: "Còn hiệu lực",
    file_code: "",
    issue_type: "Cấp mới",
    bus_route_ref: "",
    vehicle_type: "",
    notes: "",
  })

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  const setTitle = useUIStore((state) => state.setTitle)

  // AppSheet realtime polling for badges
  const [appSheetBadges, setAppSheetBadges] = useState<NormalizedAppSheetBadge[]>([])

  useAppSheetPolling({
    endpointKey: 'badges',
    normalize: normalizeBadgeRows,
    onData: (data: NormalizedAppSheetBadge[]) => setAppSheetBadges(data),
    onSyncToDb: (data) => vehicleBadgeFeatService.syncFromAppSheet(data),
    getKey: (b) => b.badgeNumber,
    enabled: true,
  })

  // Backend enrichment data (itinerary from routes JOIN - not available in AppSheet)
  const [enrichmentMap, setEnrichmentMap] = useState<Map<string, { itinerary: string }>>(new Map())

  useEffect(() => {
    async function fetchEnrichment() {
      try {
        const data = await quanlyDataService.getBadges()
        const map = new Map<string, { itinerary: string }>()
        for (const b of data) {
          if (b.itinerary) {
            map.set(b.badge_number, { itinerary: b.itinerary })
          }
        }
        setEnrichmentMap(map)
      } catch (error) {
        console.error("Failed to load badge enrichment:", error)
      }
    }
    fetchEnrichment()
  }, [])

  // Handle browser back button for dialogs
  const { handleDialogOpenChange: handleViewDialogChange } = useDialogHistory(
    viewDialogOpen,
    setViewDialogOpen,
    "viewBadgeDialogOpen"
  )
  const { handleDialogOpenChange: handleFormDialogChange } = useDialogHistory(
    formDialogOpen,
    setFormDialogOpen,
    "formBadgeDialogOpen"
  )
  const { handleDialogOpenChange: handleDeleteDialogChange } = useDialogHistory(
    deleteDialogOpen,
    setDeleteDialogOpen,
    "deleteBadgeDialogOpen"
  )
  const { handleDialogOpenChange: handleImportDialogChange } = useDialogHistory(
    importDialogOpen,
    setImportDialogOpen,
    "importBadgeDialogOpen"
  )

  useEffect(() => {
    setTitle("Quản lý phù hiệu xe")
    loadBadges()
  }, [setTitle])

  const loadBadges = async (forceRefresh = false) => {
    setIsLoading(true)
    try {
      // Use optimized unified endpoint for faster loading
      const data = await quanlyDataService.getBadges(forceRefresh)
      // Convert to VehicleBadge format
      const badgeData: VehicleBadge[] = data.map(b => ({
        ...b,
        vehicle_id: b.license_plate_sheet,
        operational_status: 'trong_ben' as const,
        // Add missing optional fields with defaults
        bus_route_ref: '',
        business_license_ref: '',
        created_at: '',
        created_by: '',
        email_notification_sent: false,
        notes: '',
        notification_ref: '',
        previous_badge_number: '',
        renewal_due_date: '',
        renewal_reason: '',
        renewal_reminder_shown: false,
        replacement_vehicle_id: '',
        revocation_date: '',
        revocation_decision: '',
        revocation_reason: '',
        warn_duplicate_plate: false,
        // Keep itinerary from backend data
        itinerary: b.itinerary || '',
      } as VehicleBadge))
      setBadges(badgeData)
    } catch (error) {
      console.error("Failed to load vehicle badges:", error)
      toast.error("Không thể tải danh sách phù hiệu xe. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  // Get unique values for filters - only from allowed badge types
  const allowedTypesForFilters = ["Buýt", "Tuyến cố định"]

  // Merge AppSheet data (primary) with backend enrichment (itinerary)
  const mergedBadges = useMemo((): VehicleBadge[] => {
    if (appSheetBadges.length === 0) return badges // fallback to backend-only

    return appSheetBadges.map(b => ({
      id: b.badgeNumber,
      badge_number: b.badgeNumber,
      license_plate_sheet: b.plateNumber || '',
      badge_type: b.badgeType || '',
      badge_color: b.badgeColor || '',
      issue_date: b.issueDate || '',
      expiry_date: b.expiryDate || '',
      status: b.status || 'active',
      file_code: b.fileNumber || '',
      issue_type: b.issueType || '',
      vehicle_id: b.plateNumber || '',
      operational_status: 'trong_ben' as const,
      bus_route_ref: b.busRouteRef || '',
      business_license_ref: '',
      created_at: '',
      created_by: '',
      email_notification_sent: false,
      notes: b.notes || '',
      notification_ref: '',
      previous_badge_number: b.oldBadgeNumber || '',
      renewal_due_date: '',
      renewal_reason: b.renewalReason || '',
      renewal_reminder_shown: false,
      replacement_vehicle_id: '',
      revocation_date: b.revokeDate || '',
      revocation_decision: b.revokeDecision || '',
      revocation_reason: b.revokeReason || '',
      warn_duplicate_plate: false,
      issuing_authority_ref: b.operatorRef || '',
      // Backend enrichment
      itinerary: enrichmentMap.get(b.badgeNumber)?.itinerary || '',
      // Route fields from AppSheet
      route_id: '',
      route_code: b.routeCode || '',
      route_name: b.routeName || '',
      vehicle_type: '',
      metadata: {},
    } as VehicleBadge))
  }, [appSheetBadges, badges, enrichmentMap])

  // Show loading until EITHER AppSheet data OR backend data loads
  const effectiveLoading = isLoading && appSheetBadges.length === 0

  const filteredByTypeOnly = mergedBadges.filter(b => allowedTypesForFilters.includes(b.badge_type || ""))
  const badgeStatuses = Array.from(new Set(filteredByTypeOnly.map((b) => b.status).filter(Boolean))).sort()
  const badgeTypes = allowedTypesForFilters // Only show allowed types in dropdown
  const badgeColors = Array.from(new Set(filteredByTypeOnly.map((b) => b.badge_color).filter(Boolean))).sort()

  // Only show "Buýt" and "Tuyến cố định" badge types
  const allowedBadgeTypes = ["Buýt", "Tuyến cố định"]
  
  const filteredBadges = mergedBadges.filter((badge) => {
    // Filter by allowed badge types (Buýt and Tuyến cố định only)
    if (!allowedBadgeTypes.includes(badge.badge_type || "")) {
      return false
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        badge.badge_number.toLowerCase().includes(query) ||
        badge.license_plate_sheet.toLowerCase().includes(query) ||
        badge.file_code.toLowerCase().includes(query) ||
        (badge.vehicle_id && badge.vehicle_id.toLowerCase().includes(query))
      if (!matchesSearch) return false
    }

    // Status filter (based on status: active/expired/revoked)
    if (filterStatus && badge.status !== filterStatus) {
      return false
    }

    // Badge type filter
    if (filterBadgeType && badge.badge_type !== filterBadgeType) {
      return false
    }

    // Badge color filter
    if (filterBadgeColor && badge.badge_color !== filterBadgeColor) {
      return false
    }

    return true
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredBadges.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBadges = filteredBadges.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, filterBadgeType, filterBadgeColor])

  // Stats calculations
  const stats = useMemo(() => {
    const active = filteredBadges.filter(b => getStatusVariant(b.status) === "active").length
    const expired = filteredBadges.filter(b => getStatusVariant(b.status) === "inactive").length
    const revoked = filteredBadges.filter(b => getStatusVariant(b.status) === "maintenance").length
    return { total: filteredBadges.length, active, expired, revoked }
  }, [filteredBadges])

  const handleView = (badge: VehicleBadge) => {
    setSelectedBadge(badge)
    setViewDialogOpen(true)
  }

  const handleCreate = () => {
    setFormMode("create")
    setFormData({
      badge_number: "",
      license_plate_sheet: "",
      badge_type: "",
      badge_color: "",
      issue_date: null,
      expiry_date: null,
      status: "Còn hiệu lực",
      file_code: "",
      issue_type: "Cấp mới",
      bus_route_ref: "",
      vehicle_type: "",
      notes: "",
    })
    setFormDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!badgeToDelete) return

    try {
      await vehicleBadgeService.delete(badgeToDelete.id)
      toast.success("Xóa phù hiệu thành công")
      loadBadges(true)
      setDeleteDialogOpen(false)
      setBadgeToDelete(null)
    } catch (error) {
      console.error("Failed to delete badge:", error)
      toast.error("Không thể xóa phù hiệu. Vui lòng thử lại sau.")
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.badge_number || !formData.license_plate_sheet) {
      toast.error("Vui lòng nhập số phù hiệu và biển số xe")
      return
    }

    // Validate date logic: issue_date must be before expiry_date
    if (formData.issue_date && formData.expiry_date) {
      if (formData.issue_date >= formData.expiry_date) {
        toast.error("Ngày cấp phải nhỏ hơn ngày hết hạn")
        return
      }
      const yearDiff = formData.expiry_date.getFullYear() - formData.issue_date.getFullYear()
      if (yearDiff > 10) {
        toast.error("Thời hạn phù hiệu không được vượt quá 10 năm")
        return
      }
    }

    setIsSubmitting(true)
    try {
      // Convert Date objects to ISO strings for API
      const submitData: CreateVehicleBadgeInput = {
        ...formData,
        issue_date: formatDateToISO(formData.issue_date),
        expiry_date: formatDateToISO(formData.expiry_date),
      }

      if (formMode === "create") {
        await vehicleBadgeService.create(submitData)
        toast.success("Thêm phù hiệu mới thành công")
      } else {
        if (!selectedBadge) return
        await vehicleBadgeService.update(selectedBadge.id, submitData)
        toast.success("Cập nhật phù hiệu thành công")
      }
      setFormDialogOpen(false)
      loadBadges(true)
    } catch (error: any) {
      console.error("Failed to save badge:", error)
      const errorMessage = error.response?.data?.error || "Không thể lưu phù hiệu. Vui lòng thử lại sau."
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        if (jsonData.length < 2) {
          toast.error("File Excel không có dữ liệu")
          return
        }

        // Get headers from first row
        const headers = jsonData[0].map((h) => h?.toString().toLowerCase().trim() || "")
        
        // Map Vietnamese headers to field names
        const headerMap: Record<string, string> = {
          "số phù hiệu": "badge_number",
          "so phu hieu": "badge_number",
          "biển số xe": "license_plate_sheet",
          "bien so xe": "license_plate_sheet",
          "biển số": "license_plate_sheet",
          "bien so": "license_plate_sheet",
          "loại phù hiệu": "badge_type",
          "loai phu hieu": "badge_type",
          "màu phù hiệu": "badge_color",
          "mau phu hieu": "badge_color",
          "màu": "badge_color",
          "mau": "badge_color",
          "ngày cấp": "issue_date",
          "ngay cap": "issue_date",
          "ngày hết hạn": "expiry_date",
          "ngay het han": "expiry_date",
          "trạng thái": "status",
          "trang thai": "status",
          "mã hồ sơ": "file_code",
          "ma ho so": "file_code",
          "loại cấp": "issue_type",
          "loai cap": "issue_type",
          "tuyến đường": "bus_route_ref",
          "tuyen duong": "bus_route_ref",
          "loại xe": "vehicle_type",
          "loai xe": "vehicle_type",
          "ghi chú": "notes",
          "ghi chu": "notes",
        }

        // Find column indices
        const columnMap: Record<string, number> = {}
        headers.forEach((header, index) => {
          const fieldName = headerMap[header]
          if (fieldName) {
            columnMap[fieldName] = index
          }
        })

        // Check required columns
        if (columnMap["badge_number"] === undefined || columnMap["license_plate_sheet"] === undefined) {
          toast.error("File Excel phải có cột 'Số phù hiệu' và 'Biển số xe'")
          return
        }

        // Parse data rows
        const parsedData: CreateVehicleBadgeInput[] = []
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const badgeNumber = row[columnMap["badge_number"]]?.toString().trim()
          const plateNumber = row[columnMap["license_plate_sheet"]]?.toString().trim()

          if (!badgeNumber || !plateNumber) continue

          parsedData.push({
            badge_number: badgeNumber,
            license_plate_sheet: plateNumber,
            badge_type: columnMap["badge_type"] !== undefined ? row[columnMap["badge_type"]]?.toString().trim() || "" : "",
            badge_color: columnMap["badge_color"] !== undefined ? row[columnMap["badge_color"]]?.toString().trim() || "" : "",
            issue_date: columnMap["issue_date"] !== undefined ? row[columnMap["issue_date"]]?.toString().trim() || "" : "",
            expiry_date: columnMap["expiry_date"] !== undefined ? row[columnMap["expiry_date"]]?.toString().trim() || "" : "",
            status: columnMap["status"] !== undefined ? row[columnMap["status"]]?.toString().trim() || "Còn hiệu lực" : "Còn hiệu lực",
            file_code: columnMap["file_code"] !== undefined ? row[columnMap["file_code"]]?.toString().trim() || "" : "",
            issue_type: columnMap["issue_type"] !== undefined ? row[columnMap["issue_type"]]?.toString().trim() || "Cấp mới" : "Cấp mới",
            bus_route_ref: columnMap["bus_route_ref"] !== undefined ? row[columnMap["bus_route_ref"]]?.toString().trim() || "" : "",
            vehicle_type: columnMap["vehicle_type"] !== undefined ? row[columnMap["vehicle_type"]]?.toString().trim() || "" : "",
            notes: columnMap["notes"] !== undefined ? row[columnMap["notes"]]?.toString().trim() || "" : "",
          })
        }

        if (parsedData.length === 0) {
          toast.error("Không tìm thấy dữ liệu hợp lệ trong file")
          return
        }

        setImportData(parsedData)
        setImportDialogOpen(true)
      } catch (error) {
        console.error("Failed to parse Excel file:", error)
        toast.error("Không thể đọc file Excel. Vui lòng kiểm tra định dạng file.")
      }
    }
    reader.readAsBinaryString(file)
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleImportConfirm = async () => {
    if (importData.length === 0) return

    setIsImporting(true)
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const badge of importData) {
      try {
        await vehicleBadgeService.create(badge)
        successCount++
      } catch (error: any) {
        errorCount++
        const errorMsg = error.response?.data?.error || "Lỗi không xác định"
        errors.push(`${badge.badge_number}: ${errorMsg}`)
      }
    }

    setIsImporting(false)
    setImportDialogOpen(false)
    setImportData([])

    if (successCount > 0) {
      toast.success(`Đã import thành công ${successCount} phù hiệu`)
      loadBadges(true)
    }
    if (errorCount > 0) {
      toast.error(`Có ${errorCount} phù hiệu không thể import`)
      console.error("Import errors:", errors)
    }
  }

  const downloadTemplate = () => {
    const templateData = [
      ["Số phù hiệu", "Biển số xe", "Loại phù hiệu", "Màu phù hiệu", "Ngày cấp", "Ngày hết hạn", "Trạng thái", "Mã hồ sơ", "Loại cấp", "Tuyến đường", "Loại xe", "Ghi chú"],
      ["PH001", "51B-12345", "Xe khách cố định", "Xanh", "01/01/2024", "01/01/2029", "Còn hiệu lực", "HS001", "Cấp mới", "Sài Gòn - Nha Trang", "Xe khách 45 chỗ", "Ghi chú mẫu"],
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template")
    
    // Set column widths
    ws["!cols"] = [
      { wch: 15 }, // Số phù hiệu
      { wch: 15 }, // Biển số xe
      { wch: 18 }, // Loại phù hiệu
      { wch: 15 }, // Màu phù hiệu
      { wch: 12 }, // Ngày cấp
      { wch: 15 }, // Ngày hết hạn
      { wch: 15 }, // Trạng thái
      { wch: 12 }, // Mã hồ sơ
      { wch: 12 }, // Loại cấp
      { wch: 25 }, // Tuyến đường
      { wch: 20 }, // Loại xe
      { wch: 20 }, // Ghi chú
    ]
    
    XLSX.writeFile(wb, "template-phu-hieu-xe.xlsx")
    toast.success("Đã tải template Excel")
  }

  const handleExport = () => {
    // Convert data to CSV
    const headers = [
      "Số phù hiệu",
      "Biển số xe",
      "Loại phù hiệu",
      "Màu phù hiệu",
      "Ngày cấp",
      "Ngày hết hạn",
      "Trạng thái",
      "Mã hồ sơ",
      "Loại cấp",
      "Ghi chú",
    ]

    const rows = filteredBadges.map((badge) => [
      badge.badge_number,
      badge.license_plate_sheet,
      badge.badge_type,
      badge.badge_color,
      badge.issue_date,
      badge.expiry_date,
      badge.status || "",
      badge.file_code,
      badge.issue_type,
      badge.notes || "",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    // Create blob and download
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `phu-hieu-xe-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Xuất dữ liệu thành công")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-violet-50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-xl shadow-violet-500/30">
              <Award className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Quản lý phù hiệu xe
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Danh sách phù hiệu xe buýt và tuyến cố định
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCreate} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-violet-500/30">
              <Plus className="mr-2 h-4 w-4" />
              Thêm phù hiệu
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl">
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
            <Button variant="outline" onClick={downloadTemplate} className="rounded-xl">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Tải Template
            </Button>
            <Button variant="outline" onClick={handleExport} className="rounded-xl">
              <Download className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xlsx,.xls"
              className="hidden"
            />
          </div>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-12 gap-4">
          {/* Primary Stat - Hero Card */}
          <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-violet-500 via-violet-600 to-purple-600 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-violet-100 mb-2">
                <Award className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Tổng phù hiệu</span>
              </div>
              <p className="text-6xl font-bold tracking-tight">{stats.total.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-4 text-violet-100">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Đang quản lý trong hệ thống</span>
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="col-span-12 lg:col-span-7 grid grid-cols-3 gap-4">
            {/* Active */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 transition-colors">
                  <CheckCircle className="w-4 h-4 text-emerald-600 group-hover:text-white transition-colors" />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.active.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Còn hiệu lực</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Expired */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-rose-100 group-hover:bg-rose-500 transition-colors">
                  <Clock className="w-4 h-4 text-rose-600 group-hover:text-white transition-colors" />
                </div>
                <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                  {stats.total > 0 ? Math.round((stats.expired / stats.total) * 100) : 0}%
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.expired.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Hết hạn</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.expired / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Revoked */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-amber-100 group-hover:bg-amber-500 transition-colors">
                  <XCircle className="w-4 h-4 text-amber-600 group-hover:text-white transition-colors" />
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  {stats.total > 0 ? Math.round((stats.revoked / stats.total) * 100) : 0}%
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.revoked.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Thu hồi</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.revoked / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo số phù hiệu, biển số, mã hồ sơ..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterStatus" className="text-sm font-medium">
                  Lọc theo trạng thái
                </Label>
                <Select
                  id="filterStatus"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  {badgeStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterBadgeType" className="text-sm font-medium">
                  Lọc theo loại phù hiệu
                </Label>
                <Select
                  id="filterBadgeType"
                  value={filterBadgeType}
                  onChange={(e) => setFilterBadgeType(e.target.value)}
                >
                  <option value="">Tất cả loại</option>
                  {badgeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterBadgeColor" className="text-sm font-medium">
                  Lọc theo màu phù hiệu
                </Label>
                <Select
                  id="filterBadgeColor"
                  value={filterBadgeColor}
                  onChange={(e) => setFilterBadgeColor(e.target.value)}
                >
                  <option value="">Tất cả màu</option>
                  {badgeColors.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center text-base">Số phù hiệu</TableHead>
              <TableHead className="text-center text-base">Biển số xe</TableHead>
              <TableHead className="text-center text-base">Loại phù hiệu</TableHead>
              <TableHead className="text-center text-base">Màu phù hiệu</TableHead>
              <TableHead className="text-center text-base">Ngày cấp</TableHead>
              <TableHead className="text-center text-base">Ngày hết hạn</TableHead>
              <TableHead className="text-center text-base">Trạng thái</TableHead>
              <TableHead className="text-center text-base">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {effectiveLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredBadges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              paginatedBadges.map((badge) => (
                <TableRow key={badge.id}>
                  <TableCell className="font-medium text-center text-base">
                    {badge.badge_number}
                  </TableCell>
                  <TableCell className="text-center text-base">
                    {badge.license_plate_sheet || "N/A"}
                  </TableCell>
                  <TableCell className="text-center text-base">
                    {badge.badge_type || "N/A"}
                  </TableCell>
                  <TableCell className="text-center text-base">
                    {badge.badge_color || "N/A"}
                  </TableCell>
                  <TableCell className="text-center text-base">
                    {formatDate(badge.issue_date)}
                  </TableCell>
                  <TableCell className="text-center text-base">
                    {formatDate(badge.expiry_date)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge
                      status={getStatusVariant(badge.status)}
                      label={badge.status || "N/A"}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <ActionMenu
                        items={[
                          {
                            label: "Xem chi tiết",
                            onClick: () => handleView(badge),
                            variant: "info",
                          },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {filteredBadges.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredBadges.length)} trong tổng số {filteredBadges.length.toLocaleString()} phù hiệu
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Trang trước
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      )
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px]"
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Detail Dialog */}
      <BadgeDetailDialog open={viewDialogOpen} onOpenChange={handleViewDialogChange} badge={selectedBadge} />

      {/* Form Dialog (Create/Edit) */}
      <Dialog open={formDialogOpen} onOpenChange={handleFormDialogChange}>
        <DialogContent className="max-w-2xl w-full max-h-[95vh] overflow-y-auto p-6">
          <DialogClose onClose={() => handleFormDialogChange(false)} />
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {formMode === "create" ? "Thêm phù hiệu mới" : "Chỉnh sửa phù hiệu"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="badge_number">Số phù hiệu *</Label>
                <Input
                  id="badge_number"
                  value={formData.badge_number}
                  onChange={(e) => setFormData({ ...formData, badge_number: e.target.value })}
                  placeholder="Nhập số phù hiệu"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_plate_sheet">Biển số xe *</Label>
                <Input
                  id="license_plate_sheet"
                  value={formData.license_plate_sheet}
                  onChange={(e) => setFormData({ ...formData, license_plate_sheet: e.target.value })}
                  placeholder="VD: 51B-12345"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge_type">Loại phù hiệu</Label>
                <Select
                  id="badge_type"
                  value={formData.badge_type}
                  onChange={(e) => setFormData({ ...formData, badge_type: e.target.value })}
                >
                  <option value="">Chọn loại phù hiệu</option>
                  {badgeTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  <option value="Xe khách cố định">Xe khách cố định</option>
                  <option value="Xe hợp đồng">Xe hợp đồng</option>
                  <option value="Xe du lịch">Xe du lịch</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge_color">Màu phù hiệu</Label>
                <Select
                  id="badge_color"
                  value={formData.badge_color}
                  onChange={(e) => setFormData({ ...formData, badge_color: e.target.value })}
                >
                  <option value="">Chọn màu phù hiệu</option>
                  {badgeColors.map((color) => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                  <option value="Xanh">Xanh</option>
                  <option value="Vàng">Vàng</option>
                  <option value="Đỏ">Đỏ</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue_date">Ngày cấp</Label>
                <DatePicker
                  date={formData.issue_date}
                  onDateChange={(date: Date | undefined) => setFormData({ ...formData, issue_date: date || null })}
                  placeholder="Chọn ngày cấp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Ngày hết hạn</Label>
                <DatePicker
                  date={formData.expiry_date}
                  onDateChange={(date: Date | undefined) => setFormData({ ...formData, expiry_date: date || null })}
                  placeholder="Chọn ngày hết hạn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Trạng thái</Label>
                <Select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Còn hiệu lực">Còn hiệu lực</option>
                  <option value="Hết hạn">Hết hạn</option>
                  <option value="Thu hồi">Thu hồi</option>
                  <option value="Cấp mới">Cấp mới</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue_type">Loại cấp</Label>
                <Select
                  id="issue_type"
                  value={formData.issue_type}
                  onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
                >
                  <option value="Cấp mới">Cấp mới</option>
                  <option value="Cấp đổi">Cấp đổi</option>
                  <option value="Cấp lại">Cấp lại</option>
                  <option value="Gia hạn">Gia hạn</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file_code">Mã hồ sơ</Label>
                <Input
                  id="file_code"
                  value={formData.file_code}
                  onChange={(e) => setFormData({ ...formData, file_code: e.target.value })}
                  placeholder="Nhập mã hồ sơ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_type">Loại xe</Label>
                <Input
                  id="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  placeholder="VD: Xe khách 45 chỗ"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="bus_route_ref">Tuyến đường</Label>
                <Input
                  id="bus_route_ref"
                  value={formData.bus_route_ref}
                  onChange={(e) => setFormData({ ...formData, bus_route_ref: e.target.value })}
                  placeholder="VD: Sài Gòn - Nha Trang"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Nhập ghi chú (nếu có)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => handleFormDialogChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : formMode === "create" ? "Thêm mới" : "Cập nhật"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
        <DialogContent className="max-w-md">
          <DialogClose onClose={() => handleDeleteDialogChange(false)} />
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Bạn có chắc chắn muốn xóa phù hiệu <strong>{badgeToDelete?.badge_number}</strong>?</p>
            <p className="text-sm text-gray-500 mt-2">Biển số xe: {badgeToDelete?.license_plate_sheet}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleDeleteDialogChange(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={handleImportDialogChange}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <DialogClose onClose={() => handleImportDialogChange(false)} />
          <DialogHeader>
            <DialogTitle className="text-xl">Xem trước dữ liệu import</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <p className="text-sm text-gray-600 mb-4">
              Tìm thấy <strong>{importData.length}</strong> phù hiệu sẽ được import. Vui lòng kiểm tra trước khi xác nhận.
            </p>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center w-12">STT</TableHead>
                    <TableHead className="text-center">Số phù hiệu</TableHead>
                    <TableHead className="text-center">Biển số xe</TableHead>
                    <TableHead className="text-center">Loại PH</TableHead>
                    <TableHead className="text-center">Màu PH</TableHead>
                    <TableHead className="text-center">Ngày cấp</TableHead>
                    <TableHead className="text-center">Ngày hết hạn</TableHead>
                    <TableHead className="text-center">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.slice(0, 100).map((badge, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="text-center font-medium">{badge.badge_number}</TableCell>
                      <TableCell className="text-center">{badge.license_plate_sheet}</TableCell>
                      <TableCell className="text-center">{badge.badge_type || "-"}</TableCell>
                      <TableCell className="text-center">{badge.badge_color || "-"}</TableCell>
                      <TableCell className="text-center">{badge.issue_date || "-"}</TableCell>
                      <TableCell className="text-center">{badge.expiry_date || "-"}</TableCell>
                      <TableCell className="text-center">{badge.status || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {importData.length > 100 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                ...và {importData.length - 100} phù hiệu khác
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                handleImportDialogChange(false)
                setImportData([])
              }}
              disabled={isImporting}
            >
              Hủy
            </Button>
            <Button onClick={handleImportConfirm} disabled={isImporting}>
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang import...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import {importData.length} phù hiệu
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}

