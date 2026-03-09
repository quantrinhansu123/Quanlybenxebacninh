import { useState, useEffect, useRef, useMemo } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "react-toastify"
import { QrCode, Search, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import { QRScanner } from "@/components/QRScanner"
import { DatePicker } from "@/components/DatePicker"
import { driverService } from "@/services/driver.service"
import { operatorService } from "@/services/operator.service"
import api from "@/lib/api"
import { prepareImageForUpload } from "@/lib/image-compression"
import { Driver, DriverInput, Operator } from "@/types"
import { provinceService, type Province, type District, type Ward } from "@/services/province.service"

const LICENSE_CLASSES = [
  "A", "A1", "A2", "A3", "A4", "B", "B1", "B2", "BE", "C", "C1", "C1E",
  "CE", "D", "D1", "D1E", "D2", "D2E", "DE", "D,FC", "E", "E,FC", "F",
  "FB2", "FC", "FD", "FE"
]

const driverSchema = z.object({
  operatorIds: z.array(z.string().min(1, "Invalid operator ID")).min(1, "Vui lòng chọn ít nhất một nhà xe"),
  fullName: z.string().min(1, "Họ tên là bắt buộc"),
  idNumber: z.string().min(1, "Số CMND/CCCD là bắt buộc"),
  phone: z.string().optional(),
  licenseNumber: z.string().min(1, "Số bằng lái là bắt buộc"),
  licenseClass: z.string().min(1, "Hạng bằng lái là bắt buộc"),
  licenseExpiryDate: z.string().min(1, "Ngày hết hạn bằng lái là bắt buộc"),
  province: z.string().optional(), // Optional - có thể không có khi edit
  district: z.string().optional(), // Optional - có thể không có khi edit
  ward: z.string().optional(), // Phường/Xã (chỉ dùng cho v1)
  address: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
})

type DriverFormData = z.infer<typeof driverSchema>

interface DriverFormProps {
  driver: Driver | null
  mode: "create" | "edit"
  onClose: () => void
}

export function DriverForm({ driver, mode, onClose }: DriverFormProps) {
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [operators, setOperators] = useState<Operator[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOperatorIds, setSelectedOperatorIds] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [licenseExpiryDate, setLicenseExpiryDate] = useState<Date | null>(
    driver?.licenseExpiryDate ? new Date(driver.licenseExpiryDate) : null
  )
  
  const [useApiV2, setUseApiV2] = useState(false) // false = v1 (trước sáp nhập), true = v2 (sau sáp nhập)
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [wards, setWards] = useState<Ward[]>([]) // Phường/Xã cho v1
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false)
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false)
  const [isLoadingWards, setIsLoadingWards] = useState(false)
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string | null>(null)
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string | null>(null)
  const isInitialMount = useRef(true)
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: driver
      ? {
          operatorIds: driver.operatorIds || (driver.operatorId ? [driver.operatorId] : []),
          fullName: driver.fullName,
          idNumber: driver.idNumber,
          phone: driver.phone || "",
          licenseNumber: driver.licenseNumber,
          licenseClass: driver.licenseClass,
          licenseExpiryDate: driver.licenseExpiryDate
            ? (() => {
                // Use local date to avoid timezone issues
                const d = new Date(driver.licenseExpiryDate)
                const year = d.getFullYear()
                const month = String(d.getMonth() + 1).padStart(2, '0')
                const day = String(d.getDate()).padStart(2, '0')
                return `${year}-${month}-${day}`
              })()
            : "",
          province: driver.province || "",
          district: driver.district || "",
          ward: "",
          address: driver.address || "",
          imageUrl: driver.imageUrl || "",
        }
      : undefined,
  })

  const watchProvince = watch("province")
  const watchDistrict = watch("district")

  // Load provinces từ API
  const loadProvinces = async (apiVersion: boolean): Promise<Province[]> => {
    setIsLoadingProvinces(true)
    try {
      const data = apiVersion
        ? await provinceService.getProvincesV2()
        : await provinceService.getProvincesV1()
      setProvinces(data)
      return data
    } catch (error) {
      console.error("Failed to load provinces:", error)
      toast.error("Không thể tải danh sách tỉnh thành. Vui lòng thử lại sau.")
      return []
    } finally {
      setIsLoadingProvinces(false)
    }
  }

  // Load districts khi chọn province
  const loadDistricts = async (provinceCode: string, apiVersion: boolean): Promise<District[]> => {
    if (!provinceCode) {
      setDistricts([])
      return []
    }

    setIsLoadingDistricts(true)
    try {
      let result: District[] = []
      if (apiVersion) {
        // V2: Lấy phường/xã trực tiếp từ province (không có cấp quận/huyện)
        const wards = await provinceService.getWardsByProvinceV2(provinceCode)
        result = wards.map(w => ({ code: w.code, name: w.name }))
        setDistricts(result)
      } else {
        // V1: Lấy quận/huyện từ province
        result = await provinceService.getDistrictsByProvinceV1(provinceCode)
        setDistricts(result)
      }
      return result
    } catch (error) {
      console.error("Failed to load districts:", error)
      toast.error("Không thể tải danh sách quận/huyện. Vui lòng thử lại sau.")
      setDistricts([])
      return []
    } finally {
      setIsLoadingDistricts(false)
    }
  }

  // Load wards khi chọn district (chỉ cho v1)
  // Sử dụng API từ addresskit.cas.so để lấy dữ liệu chính xác từ Cục Thống Kê
  const loadWards = async (provinceCode: string, districtCode: string) => {
    if (!provinceCode || !districtCode) {
      setWards([])
      return
    }

    setIsLoadingWards(true)
    try {
      const data = await provinceService.getWardsByDistrictV1(provinceCode, districtCode)
      setWards(data)
    } catch (error) {
      console.error("Failed to load wards:", error)
      toast.error("Không thể tải danh sách phường/xã. Vui lòng thử lại sau.")
      setWards([])
    } finally {
      setIsLoadingWards(false)
    }
  }

  useEffect(() => {
    // Load operators và provinces song song để tăng tốc
    const initData = async () => {
      // Start all loads in parallel - cần await cả hai
      const [loadedProvinces] = await Promise.all([
        loadProvinces(useApiV2),
        loadOperators()
      ])

      if (driver) {
        const operatorIds = driver.operatorIds || (driver.operatorId ? [driver.operatorId] : [])
        setSelectedOperatorIds(operatorIds)
        setValue("operatorIds", operatorIds)
        setImageUrl(driver.imageUrl || "")

        // Load districts và wards dựa trên dữ liệu driver đã có
        if (driver.province && loadedProvinces.length > 0) {
          const province = loadedProvinces.find(p => p.name === driver.province)
          if (province) {
            setSelectedProvinceCode(province.code)
            const loadedDistricts = await loadDistricts(province.code, useApiV2)

            // V1: Load wards nếu có district
            if (!useApiV2 && driver.district && loadedDistricts.length > 0) {
              const district = loadedDistricts.find(d => d.name === driver.district)
              if (district) {
                setSelectedDistrictCode(district.code)
                await loadWards(province.code, district.code)
              }
            }
          }
        }
      }
    }
    initData()
  }, [driver])

  // Reload provinces khi đổi API version (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    loadProvinces(useApiV2)
    setDistricts([])
    setWards([])
    setValue("province", "")
    setValue("district", "")
    setValue("ward", "")
    setSelectedProvinceCode(null)
    setSelectedDistrictCode(null)
  }, [useApiV2, setValue])

  // Khi chọn province từ dropdown
  useEffect(() => {
    if (watchProvince) {
      const province = provinces.find(p => p.name === watchProvince)
      if (province && province.code !== selectedProvinceCode) {
        setSelectedProvinceCode(province.code)
        loadDistricts(province.code, useApiV2)
        setValue("district", "")
        setValue("ward", "")
        setWards([])
        setSelectedDistrictCode(null)
      }
    } else {
      setDistricts([])
      setWards([])
      setSelectedProvinceCode(null)
      setSelectedDistrictCode(null)
    }
  }, [watchProvince, provinces, selectedProvinceCode, useApiV2, setValue])

  // Khi chọn district từ dropdown (chỉ cho v1)
  useEffect(() => {
    if (!useApiV2 && watchDistrict && selectedProvinceCode) {
      const district = districts.find(d => d.name === watchDistrict)
      if (district && district.code !== selectedDistrictCode) {
        setSelectedDistrictCode(district.code)
        loadWards(selectedProvinceCode, district.code)
        setValue("ward", "")
      }
    } else if (useApiV2) {
      setWards([])
      setSelectedDistrictCode(null)
    }
  }, [watchDistrict, selectedProvinceCode, districts, selectedDistrictCode, useApiV2, setValue])

  const loadOperators = async (): Promise<Operator[]> => {
    try {
      // Use legacy endpoint to get operators from RTDB (2943 records)
      // instead of Supabase (only 3 records)
      const data = await operatorService.getLegacy()
      setOperators(data)
      return data
    } catch (error) {
      console.error("Failed to load operators:", error)
      toast.error("Không thể tải danh sách đơn vị vận tải")
      return []
    }
  }

  const filteredOperators = useMemo(() => {
    if (!searchQuery) return operators
    const query = searchQuery.toLowerCase()
    return operators.filter((operator) =>
      operator.name.toLowerCase().includes(query) ||
      operator.code.toLowerCase().includes(query)
    )
  }, [operators, searchQuery])

  // Ref for virtualizer container
  const operatorListRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: filteredOperators.length,
    getScrollElement: () => operatorListRef.current,
    estimateSize: () => 40, // estimated row height
    overscan: 5, // render 5 extra items above/below viewport
  })

  const handleOperatorToggle = (operatorId: string) => {
    setSelectedOperatorIds(prev => {
      const isSelected = prev.includes(operatorId)
      const newIds = isSelected
        ? prev.filter(id => id !== operatorId)
        : [...prev, operatorId]
      setValue("operatorIds", newIds)
      return newIds
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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

    setUploading(true)
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
      setImageUrl(response.data.url)
      setValue("imageUrl", response.data.url)
      toast.success('Upload ảnh thành công')
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('Không thể upload ảnh. Vui lòng thử lại.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setImageUrl("")
    setValue("imageUrl", "")
  }

  const parseQRData = (qrText: string) => {
    try {
      const parts = qrText.split(";")
      if (parts.length < 7) {
        throw new Error("Định dạng QR code không hợp lệ")
      }

      const licenseNumber = parts[0].trim()
      const fullName = parts[1].trim()
      const licenseExpiryText = parts[5].trim()

      // Parse ngày hết hạn (có thể là "Không thời hạn" hoặc ddmmyyyy)
      let licenseExpiry = ""
      if (licenseExpiryText !== "Không thời hạn" && licenseExpiryText.length === 8) {
        // Convert ddmmyyyy to yyyy-mm-dd
        const day = licenseExpiryText.substring(0, 2)
        const month = licenseExpiryText.substring(2, 4)
        const year = licenseExpiryText.substring(4, 8)
        licenseExpiry = `${year}-${month}-${day}`
      } else if (licenseExpiryText === "Không thời hạn") {
        // Set a far future date for "no expiry"
        licenseExpiry = "2099-12-31"
      }

      // Điền vào form
      setValue("licenseNumber", licenseNumber)
      setValue("fullName", fullName)
      if (licenseExpiry) {
        setValue("licenseExpiryDate", licenseExpiry)
      }

      return true
    } catch (error) {
      console.error("Error parsing QR data:", error)
      toast.error("Không thể đọc dữ liệu từ QR code. Vui lòng thử lại.")
      return false
    }
  }

  const onSubmit = async (data: DriverFormData) => {
    try {
      // Ghép tất cả thành address theo format: "Địa chỉ cụ thể, phường xã, quận huyện, tỉnh thành phố"
      const addressParts: string[] = []
      
      if (data.address) {
        addressParts.push(data.address)
      }
      
      if (useApiV2) {
        // V2: district đã là phường/xã
        if (data.district) {
          addressParts.push(data.district)
        }
        if (data.province) {
          addressParts.push(data.province)
        }
      } else {
        // V1: có ward (phường/xã), district (quận/huyện), province (tỉnh)
        if (data.ward) {
          addressParts.push(data.ward)
        }
        if (data.district) {
          addressParts.push(data.district)
        }
        if (data.province) {
          addressParts.push(data.province)
        }
      }
      
      const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : undefined

      const driverData: DriverInput = {
        operatorIds: data.operatorIds,
        fullName: data.fullName,
        idNumber: data.idNumber,
        phone: data.phone || undefined,
        licenseNumber: data.licenseNumber,
        licenseClass: data.licenseClass,
        licenseExpiryDate: data.licenseExpiryDate,
        province: data.province || undefined,
        district: data.district || undefined,
        address: fullAddress,
        // Explicitly send null when image is removed to clear it in database
        imageUrl: data.imageUrl === "" ? null : (data.imageUrl || undefined),
      }

      if (mode === "create") {
        await driverService.create(driverData)
        driverService.clearCache() // Clear cache to show new data
        toast.success("Thêm lái xe thành công")
      } else if (driver) {
        await driverService.update(driver.id, driverData)
        driverService.clearCache() // Clear cache to show updated data
        toast.success("Cập nhật lái xe thành công")
      }
      onClose()
    } catch (error) {
      console.error("Failed to save driver:", error)
      toast.error("Có lỗi xảy ra khi lưu thông tin lái xe")
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6">
          {/* Header with title and QR button */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Thông tin lái xe</h3>
            {mode === "create" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setQrScannerOpen(true)}
                className="flex items-center gap-2"
              >
                <QrCode className="h-4 w-4" />
                Quét QR bằng lái
              </Button>
            )}
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
                    <Label htmlFor="idNumber">Số CMND/CCCD <span className="text-red-500">*</span></Label>
                    <Input
                      id="idNumber"
                      placeholder="Số CMND/CCCD"
                      {...register("idNumber")}
                    />
                    {errors.idNumber && (
                      <p className="text-sm text-red-600">{errors.idNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Họ tên <span className="text-red-500">*</span></Label>
                    <Input
                      id="fullName"
                      placeholder="Họ tên (*)"
                      {...register("fullName")}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-red-600">{errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại <span className="text-red-500">*</span></Label>
                    <Input
                      id="phone"
                      placeholder="Số điện thoại (*)"
                      {...register("phone")}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                </div>

                {/* Column 1b - License Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">Số GPLX <span className="text-red-500">*</span></Label>
                    <Input
                      id="licenseNumber"
                      placeholder="Số GPLX (*)"
                      {...register("licenseNumber")}
                    />
                    {errors.licenseNumber && (
                      <p className="text-sm text-red-600">{errors.licenseNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licenseClass">Hạng GPLX <span className="text-red-500">*</span></Label>
                    <Select 
                      id="licenseClass"
                      defaultValue={driver?.licenseClass || ""}
                      {...register("licenseClass")}
                      className="max-h-[200px]"
                    >
                      <option value="">Chọn hạng GPLX</option>
                      {LICENSE_CLASSES.map((license) => (
                        <option key={license} value={license}>
                          {license}
                        </option>
                      ))}
                    </Select>
                    {errors.licenseClass && (
                      <p className="text-sm text-red-600">{errors.licenseClass.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licenseExpiryDate">Hạn hiệu lực GPLX <span className="text-red-500">*</span></Label>
                    <DatePicker
                      date={licenseExpiryDate}
                      onDateChange={(date) => {
                        setLicenseExpiryDate(date || null)
                        if (date) {
                          // Use local date to avoid timezone issues (toISOString converts to UTC)
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          const dateString = `${year}-${month}-${day}`
                          setValue("licenseExpiryDate", dateString)
                        }
                      }}
                      placeholder="Chọn hạn GPLX"
                    />
                    {errors.licenseExpiryDate && (
                      <p className="text-sm text-red-600">{errors.licenseExpiryDate.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Địa chỉ với checkbox */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 border-b pb-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                    Thông tin địa chỉ
                  </h3>
                  {/* Checkbox chọn API version */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useApiV2"
                      checked={useApiV2}
                      onChange={(e) => setUseApiV2(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="useApiV2" className="cursor-pointer text-xs sm:text-sm">
                      Sử dụng dữ liệu sau sáp nhập.
                    </Label>
                  </div>
                </div>

                {useApiV2 ? (
                  // V2: 2 cột (Tỉnh và Phường/Xã)
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="province">
                        Tỉnh/Thành phố <span className="text-red-500">(*)</span>
                      </Label>
                      <Select
                        id="province"
                        {...register("province")}
                        disabled={isLoadingProvinces}
                        className={errors.province ? "border-red-500" : ""}
                      >
                        <option value="">
                          {isLoadingProvinces ? "Đang tải..." : "Tỉnh/Thành phố"}
                        </option>
                        {provinces.map((province) => (
                          <option key={province.code} value={province.name}>
                            {province.name}
                          </option>
                        ))}
                      </Select>
                      {errors.province && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.province.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="district">
                        Phường/Xã <span className="text-red-500">(*)</span>
                      </Label>
                      <Select
                        id="district"
                        {...register("district")}
                        disabled={!watchProvince || isLoadingDistricts}
                        className={errors.district ? "border-red-500" : ""}
                      >
                        <option value="">
                          {isLoadingDistricts ? "Đang tải..." : "Phường/Xã"}
                        </option>
                        {districts.map((district) => (
                          <option key={district.code} value={district.name}>
                            {district.name}
                          </option>
                        ))}
                      </Select>
                      {errors.district && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.district.message}
                        </p>
                      )}
                      {watchProvince && !isLoadingDistricts && districts.length === 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          Không có dữ liệu. Vui lòng thử lại hoặc nhập thủ công.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  // V1: 3 cột (Tỉnh, Quận/Huyện, Phường/Xã)
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="province">
                        Tỉnh/Thành phố <span className="text-red-500">(*)</span>
                      </Label>
                      <Select
                        id="province"
                        {...register("province")}
                        disabled={isLoadingProvinces}
                        className={errors.province ? "border-red-500" : ""}
                      >
                        <option value="">
                          {isLoadingProvinces ? "Đang tải..." : "Tỉnh/Thành phố"}
                        </option>
                        {provinces.map((province) => (
                          <option key={province.code} value={province.name}>
                            {province.name}
                          </option>
                        ))}
                      </Select>
                      {errors.province && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.province.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="district">
                        Quận/Huyện/Thị xã <span className="text-red-500">(*)</span>
                      </Label>
                      <Select
                        id="district"
                        {...register("district")}
                        disabled={!watchProvince || isLoadingDistricts}
                        className={errors.district ? "border-red-500" : ""}
                      >
                        <option value="">
                          {isLoadingDistricts ? "Đang tải..." : "Quận/Huyện/Thị xã"}
                        </option>
                        {districts.map((district) => (
                          <option key={district.code} value={district.name}>
                            {district.name}
                          </option>
                        ))}
                      </Select>
                      {errors.district && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.district.message}
                        </p>
                      )}
                      {watchProvince && !isLoadingDistricts && districts.length === 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          Không có dữ liệu. Vui lòng thử lại hoặc nhập thủ công.
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="ward">Phường/Xã</Label>
                      <Select
                        id="ward"
                        {...register("ward")}
                        disabled={!watchDistrict || isLoadingWards}
                      >
                        <option value="">
                          {isLoadingWards ? "Đang tải..." : "Phường/Xã"}
                        </option>
                        {wards.map((ward) => (
                          <option key={ward.code} value={ward.name}>
                            {ward.name}
                          </option>
                        ))}
                      </Select>
                      {watchDistrict && !isLoadingWards && wards.length === 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          Không có dữ liệu. Vui lòng thử lại hoặc nhập thủ công.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Địa chỉ cụ thể */}
                <div>
                  <Label htmlFor="fullAddress">Địa chỉ cụ thể</Label>
                  <Input
                    id="fullAddress"
                    placeholder="Địa chỉ cụ thể"
                    {...register("address")}
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Column 2a - Operator selection */}
              <div className="space-y-2">
                <Label>Doanh nghiệp vận tải <span className="text-red-500">*</span></Label>
                <div className="border rounded-md p-4 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm..."
                      className="w-full pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {/* Virtualized operator list */}
                  <div
                    ref={operatorListRef}
                    className="h-[300px] overflow-y-auto"
                  >
                    {filteredOperators.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Không có dữ liệu
                      </p>
                    ) : (
                      <div
                        style={{
                          height: `${virtualizer.getTotalSize()}px`,
                          width: '100%',
                          position: 'relative',
                        }}
                      >
                        {virtualizer.getVirtualItems().map((virtualRow) => {
                          const operator = filteredOperators[virtualRow.index]
                          return (
                            <div
                              key={operator.id}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                              className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                            >
                              <input
                                type="checkbox"
                                id={`operator-${operator.id}`}
                                className="h-4 w-4 flex-shrink-0"
                                checked={selectedOperatorIds.includes(operator.id)}
                                onChange={() => handleOperatorToggle(operator.id)}
                              />
                              <Label
                                htmlFor={`operator-${operator.id}`}
                                className="font-normal flex-1 cursor-pointer text-sm truncate"
                              >
                                {operator.name}
                                {operator.code && (
                                  <span className="text-gray-500 ml-2">({operator.code})</span>
                                )}
                              </Label>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t text-sm text-gray-600">
                    <div>Tổng: {filteredOperators.length}</div>
                    <div>Đã chọn: {selectedOperatorIds.length}</div>
                  </div>
                </div>
                {errors.operatorIds && (
                  <p className="text-sm text-red-600">{errors.operatorIds.message}</p>
                )}
              </div>

              {/* Column 2b - Image Upload */}
              <div className="space-y-2">
                <Label>Ảnh lái xe</Label>
                {imageUrl ? (
                  <div className="relative border rounded-md p-2 bg-gray-50">
                    <img 
                      src={imageUrl} 
                      alt="Driver" 
                      className="w-full aspect-[3/4] object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 bg-white/80 hover:bg-white"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-md p-4 text-center aspect-[3/4] flex flex-col items-center justify-center">
                    <input
                      type="file"
                      id="imageUpload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    <label htmlFor="imageUpload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                      <Upload className="h-8 w-8 mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {uploading ? "Đang upload..." : "Click để upload ảnh"}
                      </p>
                    </label>
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
          <Button type="submit" className="min-w-[100px]">
            Lưu
          </Button>
        </div>
      </form>

      {/* QR Scanner Dialog */}
      <Dialog open={qrScannerOpen} onOpenChange={setQrScannerOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[95vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Quét QR code bằng lái xe</DialogTitle>
          </DialogHeader>
        <div className="mt-4">
          <QRScanner
            onScanSuccess={(text) => {
              if (parseQRData(text)) {
                setQrScannerOpen(false)
              }
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
