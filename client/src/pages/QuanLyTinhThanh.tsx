import { useState, useEffect, useMemo } from "react"
import { Map, Search, List, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/ui.store"
import { provinceService, type Province } from "@/services/province.service"
import { toast } from "react-toastify"

export default function QuanLyTinhThanh() {
  const [activeTab, setActiveTab] = useState<"v1" | "v2">("v1")
  const [provincesV1, setProvincesV1] = useState<Province[]>([])
  const [provincesV2, setProvincesV2] = useState<Province[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const setTitle = useUIStore((state) => state.setTitle)

  useEffect(() => {
    setTitle("Quản lý Tỉnh Thành phố")
    loadProvinces()
  }, [setTitle])

  const loadProvinces = async () => {
    setIsLoading(true)
    try {
      const [v1, v2] = await Promise.all([
        provinceService.getProvincesV1(),
        provinceService.getProvincesV2()
      ])
      
      // Sắp xếp theo tên
      setProvincesV1(v1.sort((a, b) => a.name.localeCompare(b.name)))
      setProvincesV2(v2.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      console.error("Failed to load provinces:", error)
      toast.error("Không thể tải danh sách tỉnh thành. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  const currentData = activeTab === "v1" ? provincesV1 : provincesV2
  const filteredProvinces = useMemo(() => {
    if (!searchQuery) return currentData
    const q = searchQuery.toLowerCase()
    return currentData.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.code.toLowerCase().includes(q)
    )
  }, [currentData, searchQuery])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-teal-50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-xl shadow-orange-500/30">
              <Map className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Danh sách Tỉnh / Thành phố
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Quản lý mã và tên các tỉnh trên toàn quốc
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1 w-max">
          <button
            onClick={() => setActiveTab("v1")}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "v1"
                ? "bg-slate-800 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Trước sáp nhập (63 tỉnh)
          </button>
          <button
            onClick={() => setActiveTab("v2")}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "v2"
                ? "bg-slate-800 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Sau sáp nhập 2025 (34 tỉnh)
          </button>
        </div>

        {/* Search */}
        <Card className="shadow-sm border-slate-100">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo mã hoặc tên tỉnh..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-sm border-slate-100">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center">STT</TableHead>
                  <TableHead className="w-[150px] text-center">Mã Tỉnh</TableHead>
                  <TableHead>Tên Tỉnh / Thành phố</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                      Đang tải danh sách...
                    </TableCell>
                  </TableRow>
                ) : filteredProvinces.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                      Không tìm thấy dữ liệu phù hợp
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProvinces.map((province, index) => (
                    <TableRow key={province.code} className="hover:bg-slate-50/50">
                      <TableCell className="text-center text-slate-500">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium text-center text-orange-600">
                        {province.code}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-slate-700">
                          <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                          <span className="font-medium">{province.name}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
