import { GuideLayout } from "@/components/layout/GuideLayout"
import { ArticleImage } from "@/components/guide/ArticleImage"
import { ArticleBanner } from "@/components/guide/ArticleBanner"
import { ArticleContent } from "@/components/guide/ArticleContent"

const steps = [
  { label: "Bước 1: Truy Cập Trang Web", path: "/guide/bus-station/consignment", scrollId: "step1" },
  { label: "Bước 2: Mua Vé", path: "/guide/bus-station/consignment", scrollId: "step2" },
  { label: "Bước 3: Chọn điểm xuất phát và lưu điểm xuất phát", path: "/guide/bus-station/consignment", scrollId: "step3" },
  { label: "Bước 4: Thanh toán", path: "/guide/bus-station/consignment", scrollId: "step4" },
]

export default function HuongDanBanVeUyThac() {
  return (
    <GuideLayout title="HƯỚNG DẪN BÁN VÉ ỦY THÁC" steps={steps}>
      <div className="p-6 lg:p-8">
        {/* Main Title */}
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
          HƯỚNG DẪN BÁN VÉ ỦY THÁC
        </h1>

        {/* Introduction */}
        <ArticleContent>
          <p className="text-gray-700 leading-relaxed mb-8">
            Hiểu về quy trình bán vé ủy thác của bến xe. Trong bài viết này, ABC C&T sẽ hướng dẫn bạn bán vé ủy thác một cách chi tiết nhất.
          </p>
        </ArticleContent>

        {/* Step 1 */}
        <section id="step1" className="mb-8 scroll-mt-32">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Bước 1: Truy Cập Trang Web
          </h2>
          <ArticleContent>
            <p className="text-gray-700 leading-relaxed mb-4">
              Đầu tiên Anh/Chị truy cập vào trang web{" "}
              <a 
                href="https://banve.sbus.vn/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                https://banve.sbus.vn/
              </a>{" "}
              tại màn hình đăng nhập anh/chị nhập tài khoản và mật khẩu do ABC đã cung cấp rồi chọn Đăng Nhập.
            </p>
          </ArticleContent>
          
          <ArticleImage alt="Hình ảnh minh họa Bước 1: Truy cập trang web" />
        </section>

        {/* Step 2 */}
        <section id="step2" className="mb-8 scroll-mt-32">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Bước 2: Mua Vé
          </h2>
          <ArticleContent>
            <p className="text-gray-700 leading-relaxed mb-4">
              Sau khi đăng nhập thành công, bạn sẽ thấy giao diện chính của hệ thống. Tại đây, bạn có thể thực hiện các thao tác mua vé cho khách hàng.
            </p>
          </ArticleContent>
          
          <ArticleImage alt="Hình ảnh minh họa Bước 2: Mua vé" />
        </section>

        {/* Step 3 */}
        <section id="step3" className="mb-8 scroll-mt-32">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Bước 3: Chọn điểm xuất phát và lưu điểm xuất phát
          </h2>
          <ArticleContent>
            <p className="text-gray-700 leading-relaxed mb-4">
              Trong quá trình mua vé, bạn cần chọn điểm xuất phát cho chuyến xe. Hệ thống sẽ tự động lưu lại điểm xuất phát này để sử dụng cho các lần mua vé tiếp theo, giúp bạn tiết kiệm thời gian.
            </p>
          </ArticleContent>
          
          <ArticleImage alt="Hình ảnh minh họa Bước 3: Chọn điểm xuất phát" />
        </section>

        {/* Step 4 */}
        <section id="step4" className="mb-8 scroll-mt-32">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Bước 4: Thanh toán
          </h2>
          <ArticleContent>
            <p className="text-gray-700 leading-relaxed mb-4">
              Sau khi hoàn tất việc chọn vé, bạn sẽ được chuyển đến trang thanh toán. Tại đây, bạn có thể chọn phương thức thanh toán phù hợp và hoàn tất giao dịch.
            </p>
          </ArticleContent>
          
          <ArticleImage alt="Hình ảnh minh họa Bước 4: Thanh toán" />
        </section>

        {/* Additional Banner/Info Section */}
        <ArticleBanner title="Lưu ý quan trọng" variant="info">
          <ul className="list-disc list-inside space-y-2">
            <li>Đảm bảo bạn đã đăng nhập với tài khoản được cấp bởi ABC</li>
            <li>Kiểm tra thông tin vé trước khi thanh toán</li>
            <li>Liên hệ tổng đài 1900.4751 nếu gặp vấn đề</li>
          </ul>
        </ArticleBanner>
      </div>
    </GuideLayout>
  )
}

