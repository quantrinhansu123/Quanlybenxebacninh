import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { routeService } from "@/services/route.service"
import { provinceService, type Province } from "@/services/province.service"
import type { Route, RouteInput, Location } from "@/types"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const routeSchema = z.object({
  originProvince: z.string().min(1, "Vui lòng chọn tỉnh đi"),
  originId: z.string().uuid("Vui lòng chọn bến đi"),
  destinationProvince: z.string().min(1, "Vui lòng chọn tỉnh đến"),
  destinationId: z.string().uuid("Vui lòng chọn bến đến"),
  routeCode: z.string().min(1, "Mã tuyến là bắt buộc"),
  distanceKm: z.number().min(0, "Cự ly phải lớn hơn hoặc bằng 0").optional(),
  plannedFrequency: z.string().min(1, "Lưu lượng quy hoạch là bắt buộc"),
  boardingPoint: z.string().optional(),
  journeyDescription: z.string().optional(),
}).refine((data) => data.originId !== data.destinationId, {
  message: "Bến đi và bến đến phải khác nhau",
  path: ["destinationId"],
})

type RouteFormData = z.infer<typeof routeSchema>

interface RouteFormProps {
  route: Route | null
  locations: Location[]
  mode: "create" | "edit"
  onClose: () => void
}

// Helper function to extract province from location address
const getProvinceFromLocation = (location: Location): string => {
  if (!location.address) return ""
  const parts = location.address.split(",").map(s => s.trim()).filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1] : ""
}

export function RouteForm({
  route,
  locations,
  mode,
  onClose,
}: RouteFormProps) {
  const [departureTimes, setDepartureTimes] = useState<Array<{ id: string; time: string }>>([])
  const [restStops, setRestStops] = useState<string[]>([])
  const [newRestStop, setNewRestStop] = useState("")
  const [selectedOriginProvince, setSelectedOriginProvince] = useState("")
  const [selectedDestinationProvince, setSelectedDestinationProvince] = useState("")
  const [provinces, setProvinces] = useState<Province[]>([])
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false)

  // Generate time options (every 30 minutes from 00:00 to 23:30)
  const timeOptions: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      timeOptions.push(timeString)
    }
  }

  // Load provinces from API
  const loadProvinces = async () => {
    setIsLoadingProvinces(true)
    try {
      const data = await provinceService.getProvincesV1()
      setProvinces(data)
    } catch (error) {
      console.error("Failed to load provinces:", error)
      toast.error("Không thể tải danh sách tỉnh thành. Vui lòng thử lại sau.")
    } finally {
      setIsLoadingProvinces(false)
    }
  }

  useEffect(() => {
    loadProvinces()
  }, [])

  // Remove duplicates and filter by province
  const uniqueLocations = Array.from(
    new Map(locations.map(loc => [loc.id, loc])).values()
  )

  const originLocations = selectedOriginProvince
    ? uniqueLocations.filter(loc => {
        const province = getProvinceFromLocation(loc)
        return province === selectedOriginProvince || loc.province === selectedOriginProvince
      })
    : uniqueLocations

  const destinationLocations = selectedDestinationProvince
    ? uniqueLocations.filter(loc => {
        const province = getProvinceFromLocation(loc)
        return province === selectedDestinationProvince || loc.province === selectedDestinationProvince
      })
    : uniqueLocations

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema),
    defaultValues: route
      ? {
        originProvince: route.origin ? getProvinceFromLocation(route.origin) : "",
        originId: route.originId,
        destinationProvince: route.destination ? getProvinceFromLocation(route.destination) : "",
        destinationId: route.destinationId,
        routeCode: route.routeCode,
        distanceKm: route.distanceKm || undefined,
        plannedFrequency: route.plannedFrequency || undefined,
        boardingPoint: route.boardingPoint || undefined,
        journeyDescription: route.journeyDescription || undefined,
      }
      : undefined,
  })

  const originId = watch("originId")
  const destinationId = watch("destinationId")

  useEffect(() => {
    if (route) {
      // Parse departure times from departureTimesDescription or schedules
      if (route.departureTimesDescription) {
        const times = route.departureTimesDescription.split(",").map(t => t.trim()).filter(Boolean)
        setDepartureTimes(times.map((time, index) => ({
          id: `departure-${index}-${Date.now()}`,
          time: time
        })))
      }
      // Parse rest stops
      if (route.restStops) {
        const stops = route.restStops.split(",").map(s => s.trim()).filter(Boolean)
        setRestStops(stops)
      }
      // Set provinces
      if (route.origin) {
        const province = getProvinceFromLocation(route.origin)
        setSelectedOriginProvince(province)
      }
      if (route.destination) {
        const province = getProvinceFromLocation(route.destination)
        setSelectedDestinationProvince(province)
      }
    }
  }, [route])

  // Update province when location changes
  useEffect(() => {
    const originLocation = locations.find(loc => loc.id === originId)
    if (originLocation) {
      const province = getProvinceFromLocation(originLocation)
      setSelectedOriginProvince(province)
      setValue("originProvince", province)
    }
  }, [originId, locations, setValue])

  useEffect(() => {
    const destinationLocation = locations.find(loc => loc.id === destinationId)
    if (destinationLocation) {
      const province = getProvinceFromLocation(destinationLocation)
      setSelectedDestinationProvince(province)
      setValue("destinationProvince", province)
    }
  }, [destinationId, locations, setValue])

  const addDepartureTime = () => {
    const newId = `departure-${Date.now()}-${Math.random()}`
    setDepartureTimes([...departureTimes, { id: newId, time: timeOptions[0] }])
  }

  const updateDepartureTime = (id: string, time: string) => {
    setDepartureTimes(departureTimes.map(dt =>
      dt.id === id ? { ...dt, time } : dt
    ))
  }

  const removeDepartureTime = (id: string) => {
    setDepartureTimes(departureTimes.filter(dt => dt.id !== id))
  }

  const addRestStop = () => {
    if (!newRestStop.trim()) {
      toast.warning("Vui lòng nhập tên điểm dừng nghỉ")
      return
    }
    if (restStops.includes(newRestStop.trim())) {
      toast.warning("Điểm dừng nghỉ này đã được thêm")
      return
    }
    setRestStops([...restStops, newRestStop.trim()])
    setNewRestStop("")
  }

  const removeRestStop = (index: number) => {
    setRestStops(restStops.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: RouteFormData) => {
    try {
      const originLocation = locations.find(loc => loc.id === data.originId)
      const destinationLocation = locations.find(loc => loc.id === data.destinationId)
      const originName = originLocation?.name || ""
      const destinationName = destinationLocation?.name || ""
      const routeName = originName && destinationName ? `${originName} - ${destinationName}` : ""

      const routeData: RouteInput = {
        routeCode: data.routeCode,
        routeName: routeName || data.routeCode,
        originId: data.originId,
        destinationId: data.destinationId,
        distanceKm: data.distanceKm,
        plannedFrequency: data.plannedFrequency,
        boardingPoint: data.boardingPoint,
        journeyDescription: data.journeyDescription,
        departureTimesDescription: departureTimes.length > 0 ? departureTimes.map(dt => dt.time).join(", ") : undefined,
        restStops: restStops.length > 0 ? restStops.join(", ") : undefined,
      }

      if (mode === "create") {
        await routeService.create(routeData)
        toast.success("Thêm tuyến thành công")
      } else if (route) {
        await routeService.update(route.id, routeData)
        toast.success("Cập nhật tuyến thành công")
      }
      onClose()
    } catch (error: any) {
      console.error("Failed to save route:", error)
      toast.error(
        error.response?.data?.error || "Không thể lưu tuyến. Vui lòng thử lại sau."
      )
    }
  }

  return (
    <form id="route-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Thông tin chính */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Thông tin chính</h3>
        <div className="grid grid-cols-2 gap-6">
          {/* Cột trái */}
          <div className="space-y-4">
            {/* Tỉnh đi */}
            <div className="space-y-2">
              <Label htmlFor="originProvince" className="text-base font-semibold">
                Tỉnh đi *
              </Label>
              <Select
                id="originProvince"
                value={selectedOriginProvince}
                onChange={(e) => {
                  setSelectedOriginProvince(e.target.value)
                  setValue("originProvince", e.target.value)
                  setValue("originId", "") // Reset bến đi khi đổi tỉnh
                }}
                className="h-11"
                disabled={isLoadingProvinces}
              >
                <option value="">
                  {isLoadingProvinces ? "Đang tải..." : "Chọn tỉnh đi"}
                </option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.name}>
                    {province.name}
                  </option>
                ))}
              </Select>
              {errors.originProvince && (
                <p className="text-sm text-red-600 mt-1">{errors.originProvince.message}</p>
              )}
            </div>

            {/* Tỉnh đến */}
            <div className="space-y-2">
              <Label htmlFor="destinationProvince" className="text-base font-semibold">
                Tỉnh đến *
              </Label>
              <Select
                id="destinationProvince"
                value={selectedDestinationProvince}
                onChange={(e) => {
                  setSelectedDestinationProvince(e.target.value)
                  setValue("destinationProvince", e.target.value)
                  setValue("destinationId", "") // Reset bến đến khi đổi tỉnh
                }}
                className="h-11"
                disabled={isLoadingProvinces}
              >
                <option value="">
                  {isLoadingProvinces ? "Đang tải..." : "Chọn tỉnh đến"}
                </option>
                {provinces.map((province) => (
                  <option key={province.code} value={province.name}>
                    {province.name}
                  </option>
                ))}
              </Select>
              {errors.destinationProvince && (
                <p className="text-sm text-red-600 mt-1">{errors.destinationProvince.message}</p>
              )}
            </div>

            {/* Mã tuyến và Cự ly - cùng hàng */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="routeCode" className="text-base font-semibold">
                  Mã tuyến *
                </Label>
                <Input
                  id="routeCode"
                  className="h-11"
                  {...register("routeCode")}
                />
                {errors.routeCode && (
                  <p className="text-sm text-red-600 mt-1">{errors.routeCode.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="distanceKm" className="text-base font-semibold">
                  Cự ly *
                </Label>
                <Input
                  id="distanceKm"
                  type="number"
                  step="0.1"
                  className="h-11"
                  {...register("distanceKm", { valueAsNumber: true })}
                />
                {errors.distanceKm && (
                  <p className="text-sm text-red-600 mt-1">{errors.distanceKm.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Cột phải */}
          <div className="space-y-4">
            {/* Bến đi */}
            <div className="space-y-2">
              <Label htmlFor="originId" className="text-base font-semibold">
                Bến đi *
              </Label>
              <Select
                id="originId"
                className="h-11"
                disabled={!selectedOriginProvince}
                {...register("originId")}
              >
                <option value="">Chọn bến đi</option>
                {originLocations
                  .filter((loc, index, self) => 
                    index === self.findIndex(l => l.id === loc.id)
                  )
                  .map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
              </Select>
              {errors.originId && (
                <p className="text-sm text-red-600 mt-1">{errors.originId.message}</p>
              )}
            </div>

            {/* Bến đến */}
            <div className="space-y-2">
              <Label htmlFor="destinationId" className="text-base font-semibold">
                Bến đến *
              </Label>
              <Select
                id="destinationId"
                className="h-11"
                disabled={!selectedDestinationProvince}
                {...register("destinationId")}
              >
                <option value="">Chọn bến đến</option>
                {destinationLocations
                  .filter((loc, index, self) => 
                    index === self.findIndex(l => l.id === loc.id) && loc.id !== originId
                  )
                  .map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
              </Select>
              {errors.destinationId && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.destinationId.message}
                </p>
              )}
            </div>

            {/* Lưu lượng quy hoạch và Vị trí đỗ đón khách - cùng hàng */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plannedFrequency" className="text-base font-semibold">
                  Lưu lượng quy hoạch *
                </Label>
                <Input
                  id="plannedFrequency"
                  type="number"
                  className="h-11"
                  defaultValue={0}
                  {...register("plannedFrequency")}
                />
                {errors.plannedFrequency && (
                  <p className="text-sm text-red-600 mt-1">{errors.plannedFrequency.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="boardingPoint" className="text-base font-semibold">
                  Vị trí đỗ đón khách của tuyến
                </Label>
                <Input
                  id="boardingPoint"
                  className="h-11"
                  {...register("boardingPoint")}
                />
                {errors.boardingPoint && (
                  <p className="text-sm text-red-600 mt-1">{errors.boardingPoint.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hành trình chạy */}
      <div className="space-y-2 border-t pt-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="journeyDescription" className="text-base font-semibold">
            Hành trình chạy
          </Label>
        </div>
        <Textarea
          id="journeyDescription"
          rows={4}
          className="w-full"
          placeholder="Nhập mô tả hành trình chạy..."
          {...register("journeyDescription")}
        />
        {errors.journeyDescription && (
          <p className="text-sm text-red-600 mt-1">{errors.journeyDescription.message}</p>
        )}
      </div>

      {/* Hai card bên dưới */}
      <div className="grid grid-cols-2 gap-6">
        {/* Card trái: Giờ xuất bến */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Giờ xuất bến</CardTitle>
              <Button type="button" onClick={addDepartureTime} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Thêm
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {departureTimes.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">STT</TableHead>
                      <TableHead>Giờ xuất bến</TableHead>
                      <TableHead className="w-28">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departureTimes.map((dt, index) => (
                      <TableRow key={dt.id}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell>
                          <Select
                            value={dt.time}
                            onChange={(e) => updateDepartureTime(dt.id, e.target.value)}
                            className="h-9"
                          >
                            {timeOptions.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDepartureTime(dt.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Không có dữ liệu</p>
            )}
            <div className="text-sm text-gray-500 text-center pt-2 border-t">
              Tổng: {departureTimes.length}
            </div>
          </CardContent>
        </Card>

        {/* Card phải: Tên điểm dừng nghỉ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Tên điểm dừng nghỉ</CardTitle>
              <Button
                type="button"
                onClick={addRestStop}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={newRestStop}
              onChange={(e) => setNewRestStop(e.target.value)}
              placeholder="Nhập tên điểm dừng nghỉ"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addRestStop()
                }
              }}
            />
            {restStops.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">STT</TableHead>
                      <TableHead>Tên điểm dừng nghỉ</TableHead>
                      <TableHead className="w-20">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restStops.map((stop, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell>{stop}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRestStop(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Không có dữ liệu</p>
            )}
            <div className="text-sm text-gray-500 text-center pt-2 border-t">
              Tổng: {restStops.length}
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
