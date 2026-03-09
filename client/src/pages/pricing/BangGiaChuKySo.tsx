import { Link } from "react-router-dom"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function BangGiaChuKySo() {
  return (
    <div className="w-full bg-gray-50 py-6 lg:py-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            BẢNG GIÁ CHỮ KÝ SỐ HSM KÝ LỆNH VÀ VÉ ĐIỆN TỬ
          </h1>
        </div>

        {/* Pricing Card */}
        <div className="max-w-5xl mx-auto">
          <Card className="border-2 border-purple-200 shadow-xl">
            {/* Package Header */}
            <div className="bg-gray-100 py-3 px-4 border-b border-gray-200">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 text-center">
                GÓI HỢP TÁC ĐẶC BIỆT HILO - CA
              </h2>
            </div>
            
            <CardContent className="p-6">
              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl lg:text-6xl font-bold text-purple-600">500.000</span>
                  <span className="text-2xl text-gray-600">đ</span>
                </div>
                <p className="text-lg text-gray-600">/đơn vị sử dụng</p>
              </div>

              {/* Features */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 pb-3 border-b border-gray-100">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-base">
                      Chứng thư số server lưu khóa trên thiết bị HSM tốc độ ký cao
                    </span>
                  </li>
                  <li className="flex items-start gap-3 pb-3 border-b border-gray-100">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-base">
                      <span className="font-bold text-lg">Không giới hạn</span> số lượng lượt ký cho Lệnh vận chuyển điện, vé xe điện tử trên hệ thống của ABC trong 01 năm
                    </span>
                  </li>
                  <li className="flex items-start gap-3 pb-3 border-b border-gray-100">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-base">
                      <span className="font-bold text-lg">Tích hợp sẵn</span> để ký Lệnh vận chuyển điện tử và Vé xe khách điện tử
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-base">
                      <span className="font-bold text-lg">Miễn phí</span> sử dụng thử phần mềm Hợp đồng điện tử Hilo - Econtract
                    </span>
                  </li>
                </ul>
              </div>

              {/* Info Text */}
              <div className="text-center mb-6">
                <p className="text-gray-700 text-base">
                  Cài đặt ngay để sử dụng cùng giải pháp Lệnh và Vé điện tử.
                </p>
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <Link to="/lien-he">
                  <Button 
                    size="lg" 
                    className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-4 text-lg rounded-lg shadow-lg transition-all hover:shadow-xl"
                  >
                    Liên hệ đăng ký
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

