import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Autocomplete } from "@/components/ui/autocomplete"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { vehicleService } from "../api"
import { vehicleTypeService } from "../api/vehicleTypeApi"
import { operatorService } from "@/features/fleet/operators/api"
import { provinceService, type Province } from "@/services/province.service"
import { vehicleBadgeService, type VehicleBadge } from "@/services/vehicle-badge.service"
import type { Vehicle, VehicleInput, VehicleType } from "../types"
import type { Operator } from "@/features/fleet/operators/types"
import { Eye, EyeOff, Upload } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import api from "@/lib/api"
import { prepareImageForUpload } from "@/lib/image-compression"
import { quanlyDataService } from "@/services/quanly-data.service"

const vehicleSchema = z.object({
  plateNumber: z.string().min(1, "Biển số là bắt buộc"),
  operatorId: z.string().optional(),
  vehicleTypeId: z.string().optional(),
  seatCapacity: z.number().min(1, "Số ghế phải lớn hơn 0"),
  bedCapacity: z.number().min(0, "Số giường không hợp lệ"),
  chassisNumber: z.string().optional(),
  engineNumber: z.string().optional(),
  insuranceExpiryDate: z.string().optional(),
  inspectionExpiryDate: z.string().optional(),
  cargoLength: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined
      if (typeof val === 'number' && isNaN(val)) return undefined
      const num = Number(val)
      return isNaN(num) ? undefined : num
    },
    z.number().optional()
  ),
  cargoWidth: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined
      if (typeof val === 'number' && isNaN(val)) return undefined
      const num = Number(val)
      return isNaN(num) ? undefined : num
    },
    z.number().optional()
  ),
  cargoHeight: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined
      if (typeof val === 'number' && isNaN(val)) return undefined
      const num = Number(val)
      return isNaN(num) ? undefined : num
    },
    z.number().optional()
  ),
  gpsProvider: z.string().optional(),
  gpsUsername: z.string().optional(),
  gpsPassword: z.string().optional(),
  gpsUrl: z.string().optional(),
  province: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
})

type VehicleFormData = z.infer<typeof vehicleSchema>

interface VehicleFormProps {
  vehicle: Vehicle | null
  mode: "create" | "edit"
  onClose: () => void
}

export function VehicleForm({
  vehicle,
  mode,
  onClose,
}: VehicleFormProps) {
  const [autoRegister, setAutoRegister] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [vehicleImage, setVehicleImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [operators, setOperators] = useState<Operator[]>([])
  const [provinces, setProvinces] = useState<Province[]>([])
  const [vehicleBadges, setVehicleBadges] = useState<VehicleBadge[]>([])
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([])
  // In edit mode, only allow editing insurance, inspection, and GPS fields
  const isFieldLocked = mode === "edit"

  // State for "Thêm mới" vehicle type dialog
  const [showAddVehicleTypeDialog, setShowAddVehicleTypeDialog] = useState(false)
  const [newVehicleTypeName, setNewVehicleTypeName] = useState("")
  const [isCreatingVehicleType, setIsCreatingVehicleType] = useState(false)

  useEffect(() => {
    loadOperators()
    loadProvinces()
    loadVehicleBadges()
    loadVehicleTypes()
  }, [])

  useEffect(() => {
    if (vehicle) {
      setVehicleImage(vehicle.imageUrl || null)
    }
  }, [vehicle])

  const loadOperators = async () => {
    try {
      const data = await operatorService.getAll(true)
      setOperators(data)
    } catch (error) {
      console.error("Failed to load operators:", error)
    }
  }

  const loadProvinces = async () => {
    try {
      const data = await provinceService.getProvincesV2()
      setProvinces(data)
    } catch (error) {
      console.error("Failed to load provinces:", error)
      toast.error("Không thể tải danh sách tỉnh/thành phố")
    }
  }

  const loadVehicleBadges = async () => {
    try {
      // Try dedicated endpoint first
      let data = await vehicleBadgeService.getAll()

      // Fallback to quanlyDataService if dedicated endpoint returns empty
      // (this covers cases where dedicated API has issues or data is cached empty)
      if (!data || data.length === 0) {
        const quanlyData = await quanlyDataService.getAll(['badges'])
        if (quanlyData.badges && quanlyData.badges.length > 0) {
          // Map quanly badges to vehicleBadge format
          data = quanlyData.badges.map(b => ({
            id: b.id,
            badge_number: b.badge_number,
            license_plate_sheet: b.license_plate_sheet,
            badge_type: b.badge_type,
            badge_color: b.badge_color,
            issue_date: b.issue_date,
            expiry_date: b.expiry_date,
            status: b.status,
          })) as VehicleBadge[]
        }
      }

      setVehicleBadges(data)
    } catch (error) {
      console.error("Failed to load vehicle badges:", error)
    }
  }

  const loadVehicleTypes = async () => {
    try {
      const data = await vehicleTypeService.getAll()
      setVehicleTypes(data)
    } catch (error) {
      console.error("Failed to load vehicle types:", error)
    }
  }

  // Handle creating a new vehicle type
  const handleCreateVehicleType = async () => {
    if (!newVehicleTypeName.trim()) {
      toast.error("Vui lòng nhập tên loại xe")
      return
    }

    setIsCreatingVehicleType(true)
    try {
      const newType = await vehicleTypeService.create({ name: newVehicleTypeName.trim() })
      setVehicleTypes(prev => [...prev, newType])
      setValue("vehicleTypeId", newType.id)
      setShowAddVehicleTypeDialog(false)
      setNewVehicleTypeName("")
      toast.success("Thêm loại xe thành công")
    } catch (error) {
      console.error("Failed to create vehicle type:", error)
      toast.error("Không thể thêm loại xe. Vui lòng thử lại.")
    } finally {
      setIsCreatingVehicleType(false)
    }
  }

  // Handle vehicle type dropdown change
  const handleVehicleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === "__ADD_NEW__") {
      setShowAddVehicleTypeDialog(true)
      // Reset the select to previous value
      e.target.value = watch("vehicleTypeId") || ""
    } else {
      setValue("vehicleTypeId", value)
    }
  }

  // Convert operators to autocomplete options
  const operatorOptions = useMemo(() => {
    return operators.map(op => ({
      value: op.id,
      label: op.name
    }))
  }, [operators])

  // Get display name for selected operator (for edit mode when options haven't loaded)
  const selectedOperatorName = useMemo(() => {
    if (!vehicle?.operatorId) return undefined
    // If we have the operator in our loaded list, use its name
    const op = operators.find(o => o.id === vehicle.operatorId)
    if (op) return op.name
    // Otherwise use the operatorName from vehicle if available
    return (vehicle as any).operatorName || undefined
  }, [vehicle, operators])

  // Convert vehicle badges to plate number autocomplete options
  const plateNumberOptions = useMemo(() => {
    // Get unique plate numbers and include badge info in label
    const uniquePlates = new Map<string, VehicleBadge>()

    // Helper to validate plate number format (exclude UNKNOWN_ and UUID-like values)
    const isValidPlateNumber = (plate: string): boolean => {
      if (!plate || plate.trim() === '') return false
      // Filter out UNKNOWN_ prefix
      if (plate.startsWith('UNKNOWN_')) return false
      // Filter out UUID-like patterns (contains only hex chars and dashes, 36 chars)
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plate)) return false
      return true
    }

    vehicleBadges.forEach(badge => {
      const plate = badge.license_plate_sheet
      if (plate && isValidPlateNumber(plate) && !uniquePlates.has(plate)) {
        uniquePlates.set(plate, badge)
      }
    })

    return Array.from(uniquePlates.entries()).map(([plate, badge]) => ({
      value: plate,
      label: badge.badge_type
        ? `${plate} (${badge.badge_type}${badge.badge_color ? ' - ' + badge.badge_color : ''})`
        : plate
    }))
  }, [vehicleBadges])

  // Flag to show hint when no badge options available
  const showPlateNumberHint = vehicleBadges.length === 0

  // Helper function to format date for input type="date"
  const formatDateForInput = (dateString: string | undefined | null): string => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ""
      return date.toISOString().split("T")[0]
    } catch {
      return ""
    }
  }

  const handleImageClick = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error('Vui lòng chọn file ảnh')
          return
        }

        // Increased limit since compression will reduce size
        if (file.size > 10 * 1024 * 1024) {
          toast.error('Kích thước ảnh không được vượt quá 10MB')
          return
        }

        setIsUploading(true)
        try {
          // Compress image before upload
          const { file: compressedFile, error } = await prepareImageForUpload(file)
          if (error) {
            toast.error(error)
            return
          }

          const formData = new FormData()
          formData.append('image', compressedFile)

          const response = await api.post<{ url: string }>('/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })

          setVehicleImage(response.data.url)
          setValue("imageUrl", response.data.url)
          toast.success('Upload ảnh thành công')
        } catch (error) {
          console.error('Failed to upload image:', error)
          toast.error('Không thể tải ảnh lên. Vui lòng thử lại.')
        } finally {
          setIsUploading(false)
        }
      }
    }
    input.click()
  }

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle ? {
      plateNumber: vehicle.plateNumber || "",
      operatorId: vehicle.operatorId || "",
      vehicleTypeId: vehicle.vehicleTypeId || "",
      seatCapacity: vehicle.seatCapacity || 1,
      bedCapacity: vehicle.bedCapacity || 0,
      chassisNumber: vehicle.chassisNumber || "",
      engineNumber: vehicle.engineNumber || "",
      insuranceExpiryDate: formatDateForInput(vehicle.insuranceExpiryDate),
      inspectionExpiryDate: formatDateForInput(vehicle.inspectionExpiryDate),
      cargoLength: vehicle.cargoLength || undefined,
      cargoWidth: vehicle.cargoWidth || undefined,
      cargoHeight: vehicle.cargoHeight || undefined,
      gpsProvider: vehicle.gpsProvider || "",
      gpsUsername: vehicle.gpsUsername || "",
      gpsPassword: vehicle.gpsPassword || "",
      gpsUrl: (vehicle as any).gpsUrl || "",
      province: vehicle.province || "",
      imageUrl: vehicle.imageUrl || "",
    } : {
      operatorId: "",
      seatCapacity: 1,
      bedCapacity: 0,
      imageUrl: "",
    },
  })

  // Reset form values when vehicle prop changes (for edit mode)
  useEffect(() => {
    if (vehicle && mode === "edit") {
      const operatorId = vehicle.operatorId ? String(vehicle.operatorId) : ""
      const vehicleTypeId = vehicle.vehicleTypeId ? String(vehicle.vehicleTypeId) : ""

      const formValues = {
        plateNumber: vehicle.plateNumber || "",
        operatorId: operatorId,
        vehicleTypeId: vehicleTypeId,
        seatCapacity: vehicle.seatCapacity || 1,
        bedCapacity: vehicle.bedCapacity ?? 0,
        chassisNumber: vehicle.chassisNumber || "",
        engineNumber: vehicle.engineNumber || "",
        insuranceExpiryDate: formatDateForInput(vehicle.insuranceExpiryDate),
        inspectionExpiryDate: formatDateForInput(vehicle.inspectionExpiryDate),
        cargoLength: vehicle.cargoLength || undefined,
        cargoWidth: vehicle.cargoWidth || undefined,
        cargoHeight: vehicle.cargoHeight || undefined,
        gpsProvider: vehicle.gpsProvider || "",
        gpsUsername: vehicle.gpsUsername || "",
        gpsPassword: vehicle.gpsPassword || "",
        province: vehicle.province || "",
        imageUrl: vehicle.imageUrl || "",
      }

      // Reset form values
      reset(formValues)
      setVehicleImage(vehicle.imageUrl || null)

    } else if (!vehicle && mode === "create") {
      // Reset to default for create mode
      reset({
        operatorId: "",
        seatCapacity: 1,
        bedCapacity: 0,
        imageUrl: "",
      })
      setVehicleImage(null)
    }
  }, [vehicle, mode, reset])

  // Watch vehicleTypeId and auto-fill seat/bed capacity when changed (only in create mode)
  const watchedVehicleTypeId = watch("vehicleTypeId")
  useEffect(() => {
    // Only auto-fill in create mode to avoid overwriting user edits
    if (mode === "create" && watchedVehicleTypeId && vehicleTypes.length > 0) {
      const selectedType = vehicleTypes.find(vt => vt.id === watchedVehicleTypeId)
      if (selectedType) {
        if (selectedType.defaultSeatCapacity !== null && selectedType.defaultSeatCapacity !== undefined) {
          setValue("seatCapacity", selectedType.defaultSeatCapacity)
        }
        if (selectedType.defaultBedCapacity !== null && selectedType.defaultBedCapacity !== undefined) {
          setValue("bedCapacity", selectedType.defaultBedCapacity)
        }
      }
    }
  }, [watchedVehicleTypeId, vehicleTypes, mode, setValue])

  // Re-apply form values when operators load (for edit mode)
  // This ensures the Autocomplete can find the matching option
  useEffect(() => {
    if (vehicle && mode === "edit" && operators.length > 0 && vehicle.operatorId) {
      const operatorId = String(vehicle.operatorId)
      const currentValue = watch("operatorId")
      // Only set if not already set correctly
      if (!currentValue || currentValue !== operatorId) {
        setValue("operatorId", operatorId)
      }
    }
  }, [vehicle, mode, operators, setValue, watch])

  // Re-apply vehicleTypeId when vehicleTypes load (for edit mode)
  useEffect(() => {
    if (vehicle && mode === "edit" && vehicleTypes.length > 0 && vehicle.vehicleTypeId) {
      const vehicleTypeId = String(vehicle.vehicleTypeId)
      const currentValue = watch("vehicleTypeId")
      if (!currentValue || currentValue !== vehicleTypeId) {
        setValue("vehicleTypeId", vehicleTypeId)
      }
    }
  }, [vehicle, mode, vehicleTypes, setValue, watch])

  const onSubmit = async (data: VehicleFormData) => {
    try {
      // Clean up data: remove undefined values for optional fields
      const submitData: any = {
        ...data,
        imageUrl: vehicleImage || "",
      }

      // Remove undefined cargo dimensions
      if (submitData.cargoLength === undefined) delete submitData.cargoLength
      if (submitData.cargoWidth === undefined) delete submitData.cargoWidth
      if (submitData.cargoHeight === undefined) delete submitData.cargoHeight

      // Note: operatorId và vehicleTypeId cần được gửi đi kể cả khi rỗng để backend có thể cập nhật/xóa
      // Không xóa các field này như các optional fields khác

      // Remove empty strings for optional fields
      if (submitData.chassisNumber === "") delete submitData.chassisNumber
      if (submitData.engineNumber === "") delete submitData.engineNumber
      if (submitData.insuranceExpiryDate === "") delete submitData.insuranceExpiryDate
      if (submitData.inspectionExpiryDate === "") delete submitData.inspectionExpiryDate
      if (submitData.gpsProvider === "") delete submitData.gpsProvider
      if (submitData.gpsUsername === "") delete submitData.gpsUsername
      if (submitData.gpsPassword === "") delete submitData.gpsPassword
      if (submitData.gpsUrl === "") delete submitData.gpsUrl
      if (submitData.province === "") delete submitData.province

      if (mode === "create") {
        await vehicleService.create(submitData as VehicleInput)
        quanlyDataService.clearCache() // Clear cache to show new vehicle
        toast.success("Thêm xe thành công!")
      } else if (vehicle) {
        await vehicleService.update(vehicle.id, submitData)
        quanlyDataService.clearCache() // Clear cache to show updated vehicle
        toast.success("Cập nhật xe thành công!")
      }
      onClose()
    } catch (error: any) {
      console.error("Failed to save vehicle:", error)
      console.error("Error response:", error.response?.data)

      // Map English error messages to Vietnamese
      const serverError = error.response?.data?.message || error.response?.data?.error || ""
      let errorMsg = "Có lỗi xảy ra khi lưu thông tin xe"

      if (error.response?.status === 409 || serverError.includes("already exists")) {
        errorMsg = "Biển số xe đã tồn tại trong hệ thống!"
      } else if (serverError) {
        errorMsg = serverError
      }

      toast.error(errorMsg)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Cột trái - Form thông tin */}
        <div className="col-span-8 space-y-6">
          {/* Thông tin xe đăng ký */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-base font-semibold">Thông tin xe đăng ký</h3>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRegister}
                  onChange={(e) => setAutoRegister(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                Tiếp tục đăng ký hoạt động cho xe
              </label>
            </div>

            <div className="space-y-4">
              {/* Hàng 0: Nhà xe + Loại xe */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="operatorId" className="text-sm">
                    Nhà xe
                  </Label>
                  <Controller
                    name="operatorId"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        id="operatorId"
                        options={operatorOptions}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Chọn hoặc nhập tên nhà xe..."
                        className="h-11"
                        displayValue={selectedOperatorName}
                        disabled={isFieldLocked}
                      />
                    )}
                  />
                  {errors.operatorId && (
                    <p className="text-sm text-red-600">{errors.operatorId.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleTypeId" className="text-sm">
                    Loại xe
                  </Label>
                  <Select
                    id="vehicleTypeId"
                    className="h-11"
                    value={watch("vehicleTypeId") || ""}
                    onChange={handleVehicleTypeChange}
                    disabled={isFieldLocked}
                  >
                    <option value="">Chọn loại xe</option>
                    {vehicleTypes.map((vt) => (
                      <option key={vt.id} value={vt.id}>
                        {vt.name}
                      </option>
                    ))}
                    <option value="__ADD_NEW__" className="text-blue-600 font-medium">
                      ➕ Thêm mới...
                    </option>
                  </Select>
                  {errors.vehicleTypeId && (
                    <p className="text-sm text-red-600">{errors.vehicleTypeId.message}</p>
                  )}
                </div>
              </div>

              {/* Hàng 1: Biển kiểm soát, Số ghế, Số giường */}
              <div className="grid grid-cols-12 gap-4">
                {/* Biển kiểm soát - Autocomplete từ phù hiệu xe */}
                <div className="space-y-2 col-span-6">
                  <Label htmlFor="plateNumber" className="text-sm">
                    Biển kiểm soát (*)
                  </Label>
                  <Controller
                    name="plateNumber"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        id="plateNumber"
                        options={plateNumberOptions}
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Nhập hoặc chọn biển số..."
                        className="h-11"
                        displayValue={mode === "edit" && vehicle?.plateNumber ? vehicle.plateNumber : undefined}
                        disabled={isFieldLocked}
                      />
                    )}
                  />
                  {errors.plateNumber && (
                    <p className="text-sm text-red-600">{errors.plateNumber.message}</p>
                  )}
                  {showPlateNumberHint && mode === "create" && (
                    <p className="text-xs text-gray-500">
                      Nhập biển số xe trực tiếp. Nếu có phù hiệu đăng ký, biển số sẽ hiển thị để chọn.
                    </p>
                  )}
                </div>

                {/* Số ghế - nhỏ */}
                <div className="space-y-2 col-span-3">
                  <Label htmlFor="seatCapacity" className="text-sm">
                    Số ghế (*)
                  </Label>
                  <Input
                    id="seatCapacity"
                    type="number"
                    className="h-11"
                    placeholder="1"
                    disabled={isFieldLocked}
                    {...register("seatCapacity", { valueAsNumber: true })}
                  />
                  {errors.seatCapacity && (
                    <p className="text-sm text-red-600">{errors.seatCapacity.message}</p>
                  )}
                </div>

                {/* Số giường - nhỏ */}
                <div className="space-y-2 col-span-3">
                  <Label htmlFor="bedCapacity" className="text-sm">
                    Số giường (*)
                  </Label>
                  <Input
                    id="bedCapacity"
                    type="number"
                    className="h-11"
                    placeholder="0"
                    disabled={isFieldLocked}
                    {...register("bedCapacity", { valueAsNumber: true })}
                  />
                </div>
              </div>

              {/* Hàng 2: Số khung và Số máy */}
              <div className="grid grid-cols-2 gap-4">
                {/* Số khung */}
                <div className="space-y-2">
                  <Label htmlFor="chassisNumber" className="text-sm">
                    Số khung
                  </Label>
                  <Input
                    id="chassisNumber"
                    className="h-11"
                    placeholder="Số khung"
                    disabled={isFieldLocked}
                    {...register("chassisNumber")}
                  />
                </div>

                {/* Số máy */}
                <div className="space-y-2">
                  <Label htmlFor="engineNumber" className="text-sm">
                    Số máy
                  </Label>
                  <Input
                    id="engineNumber"
                    className="h-11"
                    placeholder="Số máy"
                    disabled={isFieldLocked}
                    {...register("engineNumber")}
                  />
                </div>
              </div>

              {/* Hàng 3: Tỉnh */}
              <div className="grid grid-cols-12 gap-4">
                <div className="space-y-2 col-span-6">
                  <Label htmlFor="province" className="text-sm">
                    Tỉnh/Thành phố
                  </Label>
                  <Select
                    id="province"
                    className="h-11"
                    disabled={isFieldLocked}
                    {...register("province")}
                  >
                    <option value="">Chọn tỉnh/thành phố</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.name}>
                        {province.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Thông tin hạn hiệu lực */}
          <div>
            <h3 className="text-base font-semibold mb-4">Thông tin hạn hiệu lực</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Hạn bảo hiểm xe */}
              <div className="space-y-2">
                <Label htmlFor="insuranceExpiryDate" className="text-sm">
                  Hạn bảo hiểm xe (*)
                </Label>
                <Input
                  id="insuranceExpiryDate"
                  type="date"
                  className="h-11"
                  placeholder="Hạn bảo hiểm xe (*)"
                  {...register("insuranceExpiryDate")}
                />
              </div>

              {/* Hạn đăng kiểm xe */}
              <div className="space-y-2">
                <Label htmlFor="inspectionExpiryDate" className="text-sm">
                  Hạn đăng kiểm xe (*)
                </Label>
                <Input
                  id="inspectionExpiryDate"
                  type="date"
                  className="h-11"
                  placeholder="Hạn đăng kiểm xe (*)"
                  {...register("inspectionExpiryDate")}
                />
              </div>
            </div>
          </div>

          {/* Khoang chứa hàng */}
          <div>
            <h3 className="text-base font-semibold mb-4">Khoang chứa hàng</h3>
            <div className="grid grid-cols-3 gap-4">
              {/* Chiều dài */}
              <div className="space-y-2">
                <Label htmlFor="cargoLength" className="text-sm">
                  Chiều dài (m)
                </Label>
                <Input
                  id="cargoLength"
                  type="number"
                  step="0.1"
                  className="h-11"
                  placeholder="Chiều dài (m)"
                  disabled={isFieldLocked}
                  {...register("cargoLength", { setValueAs: (v) => {
                    if (v === "" || v === null || v === undefined) return undefined
                    const num = Number(v)
                    return isNaN(num) ? undefined : num
                  }})}
                />
              </div>

              {/* Chiều rộng */}
              <div className="space-y-2">
                <Label htmlFor="cargoWidth" className="text-sm">
                  Chiều rộng (m)
                </Label>
                <Input
                  id="cargoWidth"
                  type="number"
                  step="0.1"
                  className="h-11"
                  placeholder="Chiều rộng (m)"
                  disabled={isFieldLocked}
                  {...register("cargoWidth", { setValueAs: (v) => {
                    if (v === "" || v === null || v === undefined) return undefined
                    const num = Number(v)
                    return isNaN(num) ? undefined : num
                  }})}
                />
              </div>

              {/* Chiều cao */}
              <div className="space-y-2">
                <Label htmlFor="cargoHeight" className="text-sm">
                  Chiều cao (m)
                </Label>
                <Input
                  id="cargoHeight"
                  type="number"
                  step="0.1"
                  className="h-11"
                  placeholder="Chiều cao (m)"
                  disabled={isFieldLocked}
                  {...register("cargoHeight", { setValueAs: (v) => {
                    if (v === "" || v === null || v === undefined) return undefined
                    const num = Number(v)
                    return isNaN(num) ? undefined : num
                  }})}
                />
              </div>
            </div>
          </div>

          {/* Thông tin giám sát hành trình */}
          <div>
            <h3 className="text-base font-semibold mb-4">Thông tin giám sát hành trình</h3>
            <div className="grid grid-cols-3 gap-4">
              {/* Hãng GSHT */}
              <div className="space-y-2">
                <Label htmlFor="gpsProvider" className="text-sm">
                  Hãng GSHT
                </Label>
                <Select
                  id="gpsProvider"
                  className="h-11"
                  {...register("gpsProvider")}
                >
                  <option value="">Hãng GSHT</option>
                  <option value="VietMap">VietMap</option>
                  <option value="NaviGo">NaviGo</option>
                  <option value="VIETTEL">VIETTEL</option>
                </Select>
              </div>

              {/* Tài khoản */}
              <div className="space-y-2">
                <Label htmlFor="gpsUsername" className="text-sm">
                  Tài khoản
                </Label>
                <Input
                  id="gpsUsername"
                  className="h-11"
                  placeholder="Tài khoản"
                  {...register("gpsUsername")}
                />
              </div>

              {/* Mật khẩu */}
              <div className="space-y-2">
                <Label htmlFor="gpsPassword" className="text-sm">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Input
                    id="gpsPassword"
                    type={showPassword ? "text" : "password"}
                    className="h-11 pr-10"
                    placeholder="Mật khẩu"
                    {...register("gpsPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Địa chỉ truy cập - full width row */}
            <div className="mt-4 space-y-2">
              <Label htmlFor="gpsUrl" className="text-sm">
                Địa chỉ truy cập
              </Label>
              <Input
                id="gpsUrl"
                className="h-11"
                placeholder="https://..."
                {...register("gpsUrl")}
              />
            </div>
          </div>
        </div>

        {/* Cột phải - Ảnh chụp của xe */}
        <div className="col-span-4">
          <div>
            <h3 className="text-base font-semibold mb-4">Ảnh chụp của xe</h3>
            <div
              className="w-full h-[300px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400 relative overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={handleImageClick}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-sm">Đang tải ảnh...</p>
                </div>
              ) : vehicleImage ? (
                <img src={vehicleImage} alt="Vehicle" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={40} className="text-gray-400" />
                  <p>Click để chọn ảnh</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose} className="min-w-[100px]">
          Hủy
        </Button>
        <Button type="submit" className="min-w-[100px]">Lưu</Button>
      </div>

      {/* Dialog thêm loại xe mới */}
      <Dialog open={showAddVehicleTypeDialog} onOpenChange={setShowAddVehicleTypeDialog}>
        <DialogContent className="max-w-md">
          <DialogClose onClose={() => setShowAddVehicleTypeDialog(false)} />
          <DialogHeader>
            <DialogTitle>Thêm loại xe mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newVehicleTypeName">Tên loại xe</Label>
              <Input
                id="newVehicleTypeName"
                value={newVehicleTypeName}
                onChange={(e) => setNewVehicleTypeName(e.target.value)}
                placeholder="Nhập tên loại xe..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleCreateVehicleType()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddVehicleTypeDialog(false)
                  setNewVehicleTypeName("")
                }}
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleCreateVehicleType}
                disabled={isCreatingVehicleType || !newVehicleTypeName.trim()}
              >
                {isCreatingVehicleType ? "Đang thêm..." : "Thêm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  )
}
