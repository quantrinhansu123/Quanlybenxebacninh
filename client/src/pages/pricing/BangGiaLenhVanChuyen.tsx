import { Link } from "react-router-dom"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function BangGiaLenhVanChuyen() {
  return (
    <div className="w-full bg-gray-50 py-6 lg:py-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            BẢNG GIÁ LỆNH VẬN CHUYỂN ĐIỆN TỬ
          </h1>
        </div>

        {/* Pricing Card */}
        <div className="max-w-5xl mx-auto">
          <Card className="border-2 border-blue-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white pb-4">
              <div className="text-center">
                <h2 className="text-3xl lg:text-4xl font-bold mb-2">Trọn gói L-MAX</h2>
              </div>
            </CardHeader>
            <CardContent className="p-6">

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl lg:text-6xl font-bold text-blue-600">600.000</span>
                  <span className="text-2xl font-bold text-gray-600">Đồng/xe/năm</span>
                </div>
                <p className="text-base text-gray-500 italic">Không giới hạn số lượng lệnh vận chuyển ký phát hành trong 01 năm</p>
              </div>

              {/* Features */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-base">
                      <span className="font-bold text-lg">Miễn phí</span> phần mền quản lý và app SLaiXe
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-base">
                      <span className="font-bold text-lg">Miễn phí</span> hỗ trợ khởi tạo dữ liệu xe khách
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-base">
                      Lưu trữ tối thiểu <span className="font-bold text-lg">03 năm</span> theo quy định
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-base">
                      Kết nối hơn <span className="font-bold text-lg">500 bến xe</span> tiếp nhận và ký lệnh điện tử
                    </span>
                  </li>
                </ul>
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <p className="text-gray-600 text-sm italic mb-4">Cài đặt ngay. Hoàn tiền nếu không hài lòng.</p>
                <Link to="/lien-he">
                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg rounded-lg shadow-lg transition-all hover:shadow-xl"
                  >
                    Liên hệ tư vấn ngay
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm">
              * Giá trên chưa bao gồm VAT. Vui lòng liên hệ để được tư vấn chi tiết về gói dịch vụ phù hợp với nhu cầu của bạn.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

