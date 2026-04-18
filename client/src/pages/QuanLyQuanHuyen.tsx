import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { MapPin, Search, ArrowLeft, Building2, Download } from "lucide-react"
import * as XLSX from "xlsx"
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
import { provinceService, type District, type Ward, type Province } from "@/services/province.service"
import { toast } from "react-toastify"

export default function QuanLyQuanHuyen() {
  const { provinceCode } = useParams<{ provinceCode: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const defaultTab = (searchParams.get("version") as "v1" | "v2") || "v1"
  const [activeTab, setActiveTab] = useState<"v1" | "v2">(defaultTab)
  const navigate = useNavigate()

  const [provinceData, setProvinceData] = useState<Province | null>(null)
  const [dataList, setDataList] = useState<Array<District | Ward>>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const setTitle = useUIStore((state) => state.setTitle)

  useEffect(() => {
    setTitle(`Danh sách ${activeTab === "v1" ? "Quận / Huyện" : "Phường / Xã"}`)
    if (provinceCode) {
      loadData(provinceCode, activeTab)
    }
  }, [setTitle, provinceCode, activeTab])

  const loadData = async (code: string, currentVersion: "v1" | "v2") => {
    setIsLoading(true)
    try {
      // Load province name first
      let provinces: Province[] = []
      if (currentVersion === "v2") {
        provinces = await provinceService.getProvincesV2()
      } else {
        provinces = await provinceService.getProvincesV1()
      }
      
      const p = provinces.find((x) => x.code === code)
      if (p) {
        setProvinceData(p)
      } else {
        setProvinceData({ code, name: `Mã tỉnh ${code}` })
      }

      // Load districts or wards
      if (currentVersion === "v2") {
        // V2 không có cấp quận/huyện, chỉ có phường/xã trực tiếp từ tỉnh
        const wards = await provinceService.getWardsByProvinceV2(code)
        setDataList(wards.sort((a, b) => a.name.localeCompare(b.name)))
      } else {
        // V1 là quận/huyện
        const districts = await provinceService.getDistrictsByProvinceV1(code)
        setDataList(districts.sort((a, b) => a.name.localeCompare(b.name)))
      }
    } catch (error) {
      console.error("Failed to load area data:", error)
      toast.error("Không thể tải danh sách. Vui lòng thử lại sau.")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredData = useMemo(() => {
    if (!searchQuery) return dataList
    const q = searchQuery.toLowerCase()
    return dataList.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.code.toLowerCase().includes(q)
    )
  }, [dataList, searchQuery])

  const handleExportExcel = () => {
    const areaType = activeTab === "v1" ? "Quan_Huyen" : "Phuong_Xa"
    const dataToExport = filteredData.map((item, index) => ({
      "STT": index + 1,
      "Tên": item.name
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSach")
    
    const maxWidths = [5, 40]
    worksheet["!cols"] = maxWidths.map(w => ({ wch: w }))

    XLSX.writeFile(workbook, `Danh_Sach_${areaType}_${provinceData?.name || provinceCode}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-teal-50">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-xl h-12 w-12 border-slate-200 text-slate-500 hover:text-slate-800"
              onClick={() => navigate("/quan-ly-tinh-thanh")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-xl shadow-blue-500/30">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                {activeTab === "v1" ? "Quận / Huyện" : "Phường / Xã"}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Thuộc tỉnh/thành phố: <span className="font-semibold text-slate-700">{provinceData?.name || "Đang tải..."}</span>
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0"
            onClick={handleExportExcel}
          >
            <Download className="h-4 w-4 mr-2" />
            Tải Excel
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1 w-max">
          <button
            onClick={() => {
              setActiveTab("v1")
              setSearchParams({ version: "v1" })
            }}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "v1"
                ? "bg-slate-800 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Trước sáp nhập (Quận / Huyện)
          </button>
          <button
            onClick={() => {
              setActiveTab("v2")
              setSearchParams({ version: "v2" })
            }}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "v2"
                ? "bg-slate-800 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Sau sáp nhập 2025 (Phường / Xã)
          </button>
        </div>

        {/* Search */}
        <Card className="shadow-sm border-slate-100">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo mã hoặc tên..."
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
                  <TableHead>Tên {activeTab === "v1" ? "Quận / Huyện" : "Phường / Xã"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-12 text-slate-500">
                      Đang tải danh sách...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-12 text-slate-500">
                      Không tìm thấy dữ liệu phù hợp
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <TableRow key={item.code} className="hover:bg-slate-50/50">
                      <TableCell className="text-center text-slate-500">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-slate-700">
                          <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                          <span className="font-medium">{item.name}</span>
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
