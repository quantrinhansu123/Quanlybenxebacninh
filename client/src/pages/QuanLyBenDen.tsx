import { useState, useEffect, useMemo } from "react"
import { toast } from "react-toastify"
import { Plus, Search, MapPin, Building, TrendingUp, CheckCircle, XCircle } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { StatusBadge } from "@/components/layout/StatusBadge"
import { ActionMenu } from "@/components/ui/ActionMenu"
import { locationService } from "@/services/location.service"
import type { Location, LocationInput } from "@/types"
import { useUIStore } from "@/store/ui.store"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { STATION_TYPES } from "@/constants/vietnam-locations"
import { provinceService, type Province, type District, type Ward } from "@/services/province.service"
import { useDialogHistory } from "@/hooks/useDialogHistory"

const locationSchema = z.object({
  code: z.string().min(1, "Mã bến là bắt buộc"),
  stationType: z.string().min(1, "Loại bến là bắt buộc"),
  name: z.string().min(1, "Tên bến là bắt buộc"),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  province: z.string().min(1, "Tỉnh/Thành phố là bắt buộc"),
  district: z.string().min(1, "Quận/Huyện/Thị xã là bắt buộc"),
  ward: z.string().optional(), // Phường/Xã (chỉ dùng cho v1)
  address: z.string().optional(),
  isActive: z.boolean().default(true),
})

type LocationFormData = z.infer<typeof locationSchema>

export default function QuanLyBenDen() {
  const [locations, setLocations] = useState<Location[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"create" | "edit" | "view">("create")
  const setTitle = useUIStore((state) => state.setTitle)

  // Handle browser back button for dialog
  const { handleDialogOpenChange } = useDialogHistory(dialogOpen, setDialogOpen, "locationDialogOpen")

  const [useApiV2, setUseApiV2] = useState(false) // false = v1 (trước sáp nhập), true = v2 (sau sáp nhập)
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [wards, setWards] = useState<Ward[]>([]) // Phường/Xã cho v1
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false)
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false)
  const [isLoadingWards, setIsLoadingWards] = useState(false)
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string | null>(null)
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      isActive: true,
    },
  })

  const watchProvince = watch("province")
  const watchDistrict = watch("district")

  // Load provinces từ API
  const loadProvinces = async (apiVersion: boolean) => {
    setIsLoadingProvinces(true)
    try {
      const data = apiVersion
        ? await provinceService.getProvincesV2()
        : await provinceService.getProvincesV1()
      setProvinces(data)
    } catch (error) {
      console.error("Failed to load provinces:", error)
      toast.error("Không thể tải danh sách tỉnh thành. Vui lòng thử lại sau.")
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
        // Convert wards to districts format for display
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
    setTitle("Quản lý bến đến")
    loadLocations()
    loadProvinces(useApiV2)
  }, [setTitle])

  // Reload provinces khi đổi API version
  useEffect(() => {
    loadProvinces(useApiV2)
    setDistricts([])
    setWards([])
    setValue("province", "")
    setValue("district", "")
    setValue("ward", "")
    setSelectedProvinceCode(null)
    setSelectedDistrictCode(null)
  }, [useApiV2, setValue])

  useEffect(() => {
    if (selectedLocation && (viewMode === "edit" || viewMode === "view")) {
      // Parse address theo format: "Địa chỉ cụ thể, phường xã, quận huyện, tỉnh thành phố"
      const addressValue = selectedLocation.address || ""
      const addressParts = addressValue.split(",").map(s => s.trim()).filter(Boolean)
      
      let addressDetail = ""
      let wardName = ""
      let districtName = ""
      let provinceName = ""
      
      if (addressParts.length > 0) {
        // Lấy tỉnh (phần cuối)
        if (addressParts.length >= 1) {
          provinceName = addressParts[addressParts.length - 1]
        }
        
        // Với v2: chỉ có 2 phần (phường/xã, tỉnh) hoặc 3 phần (địa chỉ, phường/xã, tỉnh)
        // Với v1: có 3 phần (phường/xã, quận/huyện, tỉnh) hoặc 4 phần (địa chỉ, phường/xã, quận/huyện, tỉnh)
        if (useApiV2) {
          if (addressParts.length >= 2) {
            wardName = addressParts[addressParts.length - 2] // Phường/Xã
            if (addressParts.length >= 3) {
              addressDetail = addressParts.slice(0, -2).join(", ") // Địa chỉ cụ thể
            }
          }
        } else {
          if (addressParts.length >= 3) {
            wardName = addressParts[addressParts.length - 3] // Phường/Xã
            districtName = addressParts[addressParts.length - 2] // Quận/Huyện
            if (addressParts.length >= 4) {
              addressDetail = addressParts.slice(0, -3).join(", ") // Địa chỉ cụ thể
            }
          } else if (addressParts.length === 2) {
            // Có thể chỉ có quận/huyện và tỉnh (không có phường/xã)
            districtName = addressParts[addressParts.length - 2]
          }
        }
      }
      
      // Tìm province code từ name
      const province = provinces.find(p => p.name === provinceName)
      if (province) {
        setSelectedProvinceCode(province.code)
        loadDistricts(province.code, useApiV2).then((loadedDistricts) => {
          if (useApiV2) {
            // V2: wardName là phường/xã
            reset({
              code: selectedLocation.code,
              stationType: selectedLocation.stationType || "",
              name: selectedLocation.name,
              phone: selectedLocation.phone || "",
              email: selectedLocation.email || "",
              province: provinceName,
              district: wardName, // V2: district là phường/xã
              ward: "",
              address: addressDetail,
              isActive: selectedLocation.isActive,
            })
          } else {
            // V1: tìm district và load wards
            const district = loadedDistricts.find(d => d.name === districtName)
            if (district) {
              setSelectedDistrictCode(district.code)
              loadWards(province.code, district.code).then(() => {
                reset({
                  code: selectedLocation.code,
                  stationType: selectedLocation.stationType || "",
                  name: selectedLocation.name,
                  phone: selectedLocation.phone || "",
                  email: selectedLocation.email || "",
                  province: provinceName,
                  district: districtName,
                  ward: wardName,
                  address: addressDetail,
                  isActive: selectedLocation.isActive,
                })
              })
              return
            }
            reset({
              code: selectedLocation.code,
              stationType: selectedLocation.stationType || "",
              name: selectedLocation.name,
              phone: selectedLocation.phone || "",
              email: selectedLocation.email || "",
              province: provinceName,
              district: districtName,
              ward: wardName,
              address: addressDetail,
              isActive: selectedLocation.isActive,
            })
          }
        })
      } else {
        reset({
          code: selectedLocation.code,
          stationType: selectedLocation.stationType || "",
          name: selectedLocation.name,
          phone: selectedLocation.phone || "",
          email: selectedLocation.email || "",
          province: provinceName,
          district: useApiV2 ? wardName : districtName,
          ward: useApiV2 ? "" : wardName,
          address: addressDetail,
          isActive: selectedLocation.isActive,
        })
      }
    } else {
      setDistricts([])
      setWards([])
      setSelectedProvinceCode(null)
      setSelectedDistrictCode(null)
      reset({
        code: "",
        stationType: "",
        name: "",
        phone: "",
        email: "",
        province: "",
        district: "",
        ward: "",
        address: "",
        isActive: true,
      })
    }
  }, [selectedLocation, viewMode, reset, provinces, useApiV2])

  // Khi chọn province từ dropdown
  useEffect(() => {
    if (watchProvince) {
      const province = provinces.find(p => p.name === watchProvince)
      if (province && province.code !== selectedProvinceCode) {
        setSelectedProvinceCode(province.code)
        loadDistricts(province.code, useApiV2)
        // Reset district and ward when province changes
        if (viewMode === "create") {
          setValue("district", "")
          setValue("ward", "")
        }
        setWards([])
        setSelectedDistrictCode(null)
      }
    } else {
      setDistricts([])
      setWards([])
      setSelectedProvinceCode(null)
      setSelectedDistrictCode(null)
    }
  }, [watchProvince, provinces, selectedProvinceCode, viewMode, selectedLocation, setValue, useApiV2])

  // Khi chọn district từ dropdown (chỉ cho v1)
  useEffect(() => {
    if (!useApiV2 && watchDistrict && selectedProvinceCode) {
      const district = districts.find(d => d.name === watchDistrict)
      if (district && district.code !== selectedDistrictCode) {
        setSelectedDistrictCode(district.code)
        loadWards(selectedProvinceCode, district.code)
        // Reset ward when district changes
        if (viewMode === "create") {
          setValue("ward", "")
        }
      }
    } else if (useApiV2) {
      setWards([])
      setSelectedDistrictCode(null)
    }
  }, [watchDistrict, selectedProvinceCode, districts, selectedDistrictCode, useApiV2, viewMode, selectedLocation, setValue])

  const loadLocations = async () => {
    setIsLoading(true)
    try {
      const data = await locationService.getAll()
      setLocations(data)
    } catch (error) {
      console.error("Failed to load locations:", error)
      toast.error("Không thể tải danh sách bến đến. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLocations = locations.filter((location) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        location.name.toLowerCase().includes(query) ||
        location.code.toLowerCase().includes(query) ||
        (location.address || "").toLowerCase().includes(query) ||
        (location.email || "").toLowerCase().includes(query)
      )
    }
    return true
  })

  const handleCreate = () => {
    setSelectedLocation(null)
    setViewMode("create")
    setDistricts([])
    setWards([])
    setSelectedProvinceCode(null)
    setSelectedDistrictCode(null)
    setDialogOpen(true)
  }

  const handleEdit = (location: Location) => {
    setSelectedLocation(location)
    setViewMode("edit")
    setDialogOpen(true)
  }

  const handleView = (location: Location) => {
    setSelectedLocation(location)
    setViewMode("view")
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    handleDialogOpenChange(open)
    if (!open) {
      setSelectedLocation(null)
      setDistricts([])
      setWards([])
      setSelectedProvinceCode(null)
      setSelectedDistrictCode(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bến đến này?")) {
      try {
        await locationService.delete(id)
        toast.success("Xóa bến đến thành công")
        loadLocations()
      } catch (error) {
        console.error("Failed to delete location:", error)
        toast.error("Không thể xóa bến đến. Có thể bến này đang được sử dụng.")
      }
    }
  }

  const onSubmit = async (data: LocationFormData) => {
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

      const locationData: LocationInput = {
        code: data.code,
        name: data.name,
        stationType: data.stationType || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: fullAddress,
      }

      if (viewMode === "create") {
        await locationService.create(locationData)
        toast.success("Thêm bến đến thành công")
      } else if (viewMode === "edit" && selectedLocation) {
        await locationService.update(selectedLocation.id, locationData)
        toast.success("Cập nhật bến đến thành công")
      }
      setDialogOpen(false)
      loadLocations()
    } catch (error: any) {
      console.error("Failed to save location:", error)
      toast.error(
        error.response?.data?.message ||
          `Không thể ${viewMode === "create" ? "thêm" : "cập nhật"} bến đến. Vui lòng thử lại.`
      )
    }
  }

  // Stats calculations
  const stats = useMemo(() => {
    const active = locations.filter(l => l.isActive).length
    const inactive = locations.length - active
    const uniqueProvinces = new Set(locations.map(l => {
      const parts = (l.address || "").split(",").map(s => s.trim()).filter(Boolean)
      return parts.length > 0 ? parts[parts.length - 1] : ""
    }).filter(Boolean)).size
    return { total: locations.length, active, inactive, uniqueProvinces }
  }, [locations])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-teal-50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-xl shadow-teal-500/30">
              <Building className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Quản lý bến đến
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Danh sách bến xe đến
              </p>
            </div>
          </div>

          <Button onClick={handleCreate} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold hover:from-teal-600 hover:to-cyan-600 shadow-lg shadow-teal-500/30">
            <Plus className="mr-2 h-4 w-4" />
            Thêm bến đến
          </Button>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-12 gap-4">
          {/* Primary Stat - Hero Card */}
          <div className="col-span-12 lg:col-span-5 bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-teal-100 mb-2">
                <Building className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Tổng số bến</span>
              </div>
              <p className="text-6xl font-bold tracking-tight">{stats.total.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-4 text-teal-100">
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
              <p className="text-sm text-slate-500 mt-1">Đang hoạt động</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Inactive */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-rose-100 group-hover:bg-rose-500 transition-colors">
                  <XCircle className="w-4 h-4 text-rose-600 group-hover:text-white transition-colors" />
                </div>
                <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                  {stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0}%
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.inactive.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Ngừng hoạt động</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.inactive / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Provinces */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-amber-100 group-hover:bg-amber-500 transition-colors">
                  <MapPin className="w-4 h-4 text-amber-600 group-hover:text-white transition-colors" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-800">{stats.uniqueProvinces.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">Tỉnh/Thành phố</p>
              <div className="mt-3 flex items-center gap-1">
                {Array.from({ length: Math.min(5, stats.uniqueProvinces) }).map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white -ml-2 first:ml-0" />
                ))}
                {stats.uniqueProvinces > 5 && (
                  <span className="text-xs text-slate-500 ml-1">+{stats.uniqueProvinces - 5}</span>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Tìm kiếm theo mã, tên bến xe, địa chỉ, email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Mã bến xe</TableHead>
              <TableHead className="text-center">Tên bến xe</TableHead>
              <TableHead className="text-center">Tỉnh thành</TableHead>
              <TableHead className="text-center">Loại bến</TableHead>
              <TableHead className="text-center">Địa chỉ</TableHead>
              <TableHead className="text-center">Email</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="text-center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredLocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              filteredLocations.map((location) => {
                // Parse tỉnh từ address (phần cuối cùng)
                const getProvinceFromAddress = (address?: string): string => {
                  if (!address) return "N/A"
                  const parts = address.split(",").map(s => s.trim()).filter(Boolean)
                  return parts.length > 0 ? parts[parts.length - 1] : "N/A"
                }

                return (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium text-center">
                      {location.code}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        {location.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getProvinceFromAddress(location.address)}
                    </TableCell>
                    <TableCell className="text-center">
                      {location.stationType || "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      {location.address || "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      {location.email || "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge
                        status={location.isActive ? "active" : "inactive"}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <ActionMenu
                          items={[
                            {
                              label: "Xem",
                              onClick: () => handleView(location),
                              variant: "info",
                            },
                            {
                              label: "Sửa",
                              onClick: () => handleEdit(location),
                              variant: "warning",
                            },
                            {
                              label: "Xóa",
                              onClick: () => handleDelete(location.id),
                              variant: "danger",
                            },
                          ]}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[800px] max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">
              {viewMode === "create" && "Thêm bến đến mới"}
              {viewMode === "edit" && "Sửa thông tin bến đến"}
              {viewMode === "view" && "Chi tiết bến đến"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4 sm:space-y-6">
            {/* Thông tin chung */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 border-b pb-2">
                Thông tin chung
              </h3>
              
              <div>
                <Label htmlFor="code">
                  Mã bến <span className="text-red-500">(*)</span>
                </Label>
                <Input
                  id="code"
                  placeholder="Mã bến"
                  {...register("code")}
                  disabled={viewMode === "view"}
                  className={errors.code ? "border-red-500" : ""}
                />
                {errors.code && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="stationType">
                  Loại bến <span className="text-red-500">(*)</span>
                </Label>
                <Select
                  id="stationType"
                  {...register("stationType")}
                  disabled={viewMode === "view"}
                  className={errors.stationType ? "border-red-500" : ""}
                >
                  <option value="">Loại bến</option>
                  {STATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
                {errors.stationType && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.stationType.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="name">
                  Tên bến <span className="text-red-500">(*)</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Tên bến"
                  {...register("name")}
                  disabled={viewMode === "view"}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  placeholder="Số điện thoại"
                  {...register("phone")}
                  disabled={viewMode === "view"}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  {...register("email")}
                  disabled={viewMode === "view"}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Thông tin địa chỉ bến xe */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 border-b pb-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  Thông tin địa chỉ bến xe
                </h3>
                {/* Checkbox chọn API version */}
                {viewMode !== "view" && (
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
                )}
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
                      disabled={viewMode === "view" || isLoadingProvinces}
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
                      disabled={viewMode === "view" || !watchProvince || isLoadingDistricts}
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
                      disabled={viewMode === "view" || isLoadingProvinces}
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
                      disabled={viewMode === "view" || !watchProvince || isLoadingDistricts}
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
                      disabled={viewMode === "view" || !watchDistrict || isLoadingWards}
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

              <div>
                <Label htmlFor="address">Địa chỉ cụ thể</Label>
                <Input
                  id="address"
                  placeholder="Địa chỉ cụ thể"
                  {...register("address")}
                  disabled={viewMode === "view"}
                />
              </div>
            </div>

            {viewMode !== "view" && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register("isActive")}
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Kích hoạt
                </Label>
              </div>
            )}

            {viewMode === "view" && (
              <div>
                <Label>Trạng thái</Label>
                <div className="mt-2">
                  <StatusBadge
                    status={selectedLocation?.isActive ? "active" : "inactive"}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                {viewMode === "view" ? "Đóng" : "Hủy"}
              </Button>
              {viewMode !== "view" && (
                <Button type="submit" className="w-full sm:w-auto">
                  {viewMode === "create" ? "Thêm" : "Cập nhật"}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}

