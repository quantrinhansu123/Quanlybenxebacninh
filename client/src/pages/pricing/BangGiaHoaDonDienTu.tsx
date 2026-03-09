import { Link } from "react-router-dom"
import { Monitor, Heart, PenTool, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function BangGiaHoaDonDienTu() {
  const features = [
    {
      icon: Monitor,
      title: "Xuất hóa đơn ngay khi điều độ",
      description: "Xuất hóa đơn ngay trong phiên điều độ, giảm thiểu sai sót.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Heart,
      title: "Lưu trữ, tra cứu tiện lợi",
      description: "Dữ liệu lưu vết tại hệ thống để nhà xe, kế toán kiểm tra & tra cứu",
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
    {
      icon: PenTool,
      title: "Cấu hình đúng pháp luật Việt Nam",
      description: "ABC đã cấu hình các chuẩn thông tin theo NĐ70/2025, mẫu vé đa dạng, gán logo nhà xe, DNVT trên mẫu vé",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: Gift,
      title: "Tích hợp đa kênh",
      description: "Tích hợp các phần mềm bán vé, tích hợp tự động vào phần mềm kế toán như MISA, hạch toán và khai báo doanh thu tự động",
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
  ]

  return (
    <div className="w-full bg-white py-6 lg:py-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            BẢNG GIÁ SẢN PHẨM HÓA ĐƠN ĐIỆN TỬ
          </h1>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <Card key={index} className="border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <div className={`${feature.bgColor} rounded-full p-4 mb-4`}>
                        <IconComponent className={`h-8 w-8 ${feature.color}`} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-gray-700 text-base leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Link to="/lien-he">
              <Button 
                size="lg" 
                className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-4 text-lg rounded-lg shadow-lg transition-all hover:shadow-xl"
              >
                Khám phá tất cả tính năng
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

