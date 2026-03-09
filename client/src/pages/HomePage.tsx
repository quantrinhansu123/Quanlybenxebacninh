import { Link } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import {
  CheckCircle,
  ArrowRight,
  Play,
  Shield,
  Building2,
  FileCheck,
  CreditCard,
  Smartphone,
  ChevronRight,
  Quote,
  Star,
  Bus,
  FileText,
  Lock,
  Layers,
  TrendingUp,
  Globe
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Animated counter hook
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true)
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted) return

    let startTime: number
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }
    requestAnimationFrame(step)
  }, [hasStarted, end, duration])

  return { count, ref }
}

// Data
const stats = [
  { value: 600, suffix: "+", label: "Doanh nghiệp vận tải", icon: Building2 },
  { value: 500, suffix: "+", label: "Bến xe kết nối", icon: Bus },
  { value: 10000, suffix: "+", label: "Xe khách trong hệ thống", icon: TrendingUp },
  { value: 9000, suffix: "+", label: "Lệnh điện tử/ngày", icon: FileText }
]

const features = [
  {
    icon: FileCheck,
    title: "Lệnh vận chuyển điện tử",
    description: "Ký số lệnh vận chuyển theo chuẩn pháp lý, lưu trữ 3 năm, không giới hạn số lượng.",
    color: "bg-emerald-600"
  },
  {
    icon: CreditCard,
    title: "Thanh toán tự động",
    description: "Hệ thống thanh toán điện tử đa kênh, tích hợp mọi phương thức thanh toán hiện đại.",
    color: "bg-teal-600"
  },
  {
    icon: Shield,
    title: "Cổng vào ra tự động",
    description: "Nhận diện biển số, kiểm tra lệnh điện tử real-time, quản lý xe vào ra tự động.",
    color: "bg-emerald-700"
  },
  {
    icon: Smartphone,
    title: "Vé xe điện tử",
    description: "Vé điện tử hợp pháp, kết nối 400+ bến xe, đồng bộ dữ liệu lệnh điện tử tức thì.",
    color: "bg-teal-700"
  }
]

const solutions = [
  {
    title: "Phần mềm Quản lý Bến xe",
    subtitle: "Giải pháp toàn diện",
    description: "Hệ thống quản lý vận hành bến xe hiện đại, tự động hóa quy trình từ điều độ đến thanh toán.",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80",
    features: ["Điều độ xe tự động", "Quản lý lệnh điện tử", "Báo cáo real-time", "Tích hợp API"]
  },
  {
    title: "Hệ thống Bán vé Ủy thác",
    subtitle: "Mở rộng kênh bán",
    description: "Kết nối mạng lưới bán vé rộng khắp, tăng doanh thu thông qua hệ sinh thái đại lý.",
    image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&q=80",
    features: ["400+ điểm bán", "Đối soát tự động", "Hoa hồng linh hoạt", "App đại lý"]
  }
]

const testimonials = [
  {
    content: "ABC C&T đã giúp chúng tôi số hóa hoàn toàn quy trình vận hành. Hiệu quả tăng 40%, chi phí giảm đáng kể.",
    author: "Nguyễn Văn Minh",
    role: "Giám đốc Bến xe Miền Đông",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
  },
  {
    content: "Hệ thống lệnh điện tử hoạt động ổn định, hỗ trợ kỹ thuật nhanh chóng. Rất hài lòng với dịch vụ.",
    author: "Trần Thị Hương",
    role: "Phó GĐ Công ty Vận tải Phương Trang",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
  }
]

const pricingPlans = [
  {
    name: "Lệnh vận chuyển điện tử",
    price: "500.000",
    unit: "₫/tháng",
    description: "Dành cho doanh nghiệp vận tải",
    features: [
      "Ký số lệnh vận chuyển",
      "Lưu trữ dữ liệu 03 năm",
      "Miễn phí phần mềm",
      "Không giới hạn số lượng",
      "Hỗ trợ kỹ thuật 24/7"
    ],
    popular: false,
    cta: "Bắt đầu ngay"
  },
  {
    name: "Vé xe khách điện tử",
    price: "100.000",
    unit: "₫/vé",
    description: "Giải pháp bán vé hiện đại",
    features: [
      "Đảm bảo yêu cầu pháp lý",
      "Đồng bộ lệnh điện tử",
      "Kết nối 400+ bến xe",
      "Tích hợp kế toán",
      "Hệ sinh thái bán vé"
    ],
    popular: true,
    cta: "Đăng ký ngay"
  },
  {
    name: "Chữ ký số HSM",
    price: "600.000",
    unit: "₫/năm",
    description: "Chứng thư số server",
    features: [
      "Không giới hạn lần ký",
      "Truy cập mọi lúc mọi nơi",
      "Tốc độ ký cao",
      "Bảo mật chuẩn quốc tế",
      "Dùng cho lệnh và vé"
    ],
    popular: false,
    cta: "Tìm hiểu thêm"
  }
]

// Floating Dashboard Mockup Component
export default function HomePage() {
  return (
    <div className="w-full overflow-x-hidden bg-stone-50 pt-16 lg:pt-[72px]">
      {/* Hero Section - Modern Cinematic */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Professional Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&q=80"
            alt="City skyline transportation"
            className="w-full h-full object-cover"
          />
          {/* Gradient Overlay - Sage Green Tint */}
          <div className="absolute inset-0 bg-gradient-to-r from-stone-900/95 via-stone-900/80 to-stone-900/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-stone-900/30" />
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10 py-24 lg:py-32">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-8">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm text-white/90 font-medium">
                10 vạn+ doanh nghiệp đang sử dụng
              </span>
            </div>

            {/* Heading - Elegant Serif Typography */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-medium text-white tracking-tight mb-8 space-y-2">
              <span className="block leading-tight">Giải pháp</span>
              <span className="block leading-tight italic text-emerald-300">Chuyển đổi số</span>
              <span className="block leading-tight">cho Bến xe.</span>
            </h1>

            <p className="text-lg lg:text-xl text-white/70 max-w-xl leading-relaxed mb-10">
              Nền tảng công nghệ toàn diện giúp bến xe và doanh nghiệp vận tải
              tối ưu vận hành, tăng doanh thu.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link to="/lien-he">
                <Button size="lg" className="bg-white text-stone-900 hover:bg-white/90 px-8 h-14 text-base font-semibold shadow-2xl rounded-full group">
                  Bắt đầu miễn phí
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/products">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 h-14 text-base rounded-full bg-transparent backdrop-blur-sm">
                  <Play className="mr-2 w-5 h-5 fill-white" />
                  Xem demo
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-8">
              <div className="flex -space-x-3">
                {[
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop',
                  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop'
                ].map((img, i) => (
                  <img key={i} src={img} alt="" className="w-10 h-10 rounded-full border-2 border-stone-900 object-cover" />
                ))}
              </div>
              <div className="text-white/80">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                  <span className="font-semibold text-white ml-2">4.9</span>
                </div>
                <span className="text-sm text-white/60">12,000+ đánh giá</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50">
          <span className="text-xs uppercase tracking-widest">Cuộn xuống</span>
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-12 bg-white border-y border-stone-100">
        <div className="container mx-auto px-4 lg:px-8">
          <p className="text-center text-sm text-stone-500 mb-8">Được tin tưởng bởi các đối tác hàng đầu</p>
          <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-16 opacity-60 grayscale">
            {['Bến xe Miền Đông', 'Phương Trang', 'Thành Bưởi', 'Mai Linh', 'Hoàng Long'].map((name, i) => (
              <div key={i} className="flex items-center gap-2 text-stone-600 font-semibold">
                <Building2 className="w-5 h-5" />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section - Clean Cards */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const { count, ref } = useCountUp(stat.value)
              return (
                <div
                  key={index}
                  ref={ref}
                  className="bg-stone-50 rounded-2xl p-6 border border-stone-100 hover:shadow-lg hover:shadow-stone-200/50 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl lg:text-4xl font-bold text-stone-900 mb-1">
                    {count.toLocaleString()}
                    <span className="text-emerald-500">{stat.suffix}</span>
                  </div>
                  <p className="text-stone-500 text-sm">{stat.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section - Card Grid */}
      <section className="py-24 bg-stone-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full mb-6 border border-emerald-100">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">Tính năng nổi bật</span>
            </div>
            <h2 className="font-display text-3xl lg:text-5xl font-medium text-stone-800 mb-4">
              Công nghệ <span className="italic">dẫn đầu</span> ngành
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Các giải pháp được thiết kế riêng cho bến xe và doanh nghiệp vận tải Việt Nam
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110",
                  feature.color
                )}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-3">{feature.title}</h3>
                <p className="text-stone-600 leading-relaxed text-sm">{feature.description}</p>
                <div className="mt-5 flex items-center text-emerald-600 font-medium text-sm group-hover:text-emerald-700">
                  Tìm hiểu thêm
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-700 font-medium">Về ABC C&T</span>
              </div>

              <h2 className="font-display text-3xl lg:text-5xl font-medium text-stone-800 leading-tight">
                Đồng hành cùng ngành
                <span className="italic"> vận tải Việt Nam</span>
              </h2>

              <div className="space-y-4 text-stone-600 text-lg leading-relaxed">
                <p>
                  Công ty ABC C&T bắt đầu hành trình với sự thấu hiểu sâu sắc các khó khăn
                  và nhu cầu của lĩnh vực bến xe khách và vận tải hành khách.
                </p>
                <p>
                  Bằng cách đặt khách hàng làm trung tâm, chúng tôi đã đưa ra những giải pháp
                  công nghệ tối ưu để nâng cao hiệu quả vận hành.
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Link to="/products">
                  <Button size="lg" className="bg-stone-900 hover:bg-stone-800 text-white rounded-xl">
                    Khám phá giải pháp
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-stone-300/30">
                <img
                  src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80"
                  alt="Team meeting"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 to-transparent" />

                {/* Floating Card */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white" />
                      ))}
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">500+ đối tác tin cậy</p>
                      <p className="text-sm text-stone-500">Bến xe & Doanh nghiệp vận tải</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-100 rounded-2xl -z-10" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-orange-100 rounded-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section className="py-24 bg-stone-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6 border border-stone-100">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-stone-600 font-medium">Giải pháp toàn diện</span>
            </div>
            <h2 className="font-display text-3xl lg:text-5xl font-medium text-stone-800 mb-4">
              Hệ sinh thái <span className="italic">hoàn chỉnh</span>
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Các giải pháp được thiết kế riêng cho bến xe và doanh nghiệp vận tải Việt Nam
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {solutions.map((solution, index) => (
              <div
                key={index}
                className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-500 border border-stone-100"
              >
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={solution.image}
                    alt={solution.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 to-transparent" />
                  <div className="absolute bottom-6 left-6">
                    <span className="text-emerald-400 text-sm font-semibold">{solution.subtitle}</span>
                    <h3 className="text-2xl font-bold text-white mt-1">{solution.title}</h3>
                  </div>
                </div>
                <div className="p-8">
                  <p className="text-stone-600 mb-6">{solution.description}</p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {solution.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm text-stone-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link to="/products">
                    <Button variant="outline" className="w-full rounded-xl border-stone-200 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-colors">
                      Tìm hiểu chi tiết
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-stone-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl lg:text-5xl font-medium text-white mb-4">
              Khách hàng nói gì về <span className="italic">chúng tôi</span>
            </h2>
            <p className="text-lg text-white/60">
              Hơn 500 bến xe và doanh nghiệp vận tải đã tin tưởng
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors"
              >
                <Quote className="w-10 h-10 text-emerald-400/30 mb-4" />
                <p className="text-white/80 text-lg leading-relaxed mb-6">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30"
                  />
                  <div>
                    <p className="font-semibold text-white">{testimonial.author}</p>
                    <p className="text-sm text-white/50">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mt-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-full mb-6 border border-orange-100">
              <CreditCard className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-700 font-medium">Bảng giá minh bạch</span>
            </div>
            <h2 className="font-display text-3xl lg:text-5xl font-medium text-stone-800 mb-4">
              Chọn gói phù hợp <span className="italic">với bạn</span>
            </h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Các giải pháp linh hoạt, phù hợp mọi quy mô doanh nghiệp
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={cn(
                  "relative rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2",
                  plan.popular
                    ? "bg-stone-900 text-white shadow-2xl shadow-stone-400/20 scale-105"
                    : "bg-stone-50 hover:shadow-xl border border-stone-100"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-full shadow-lg">
                    Phổ biến nhất
                  </div>
                )}

                <h3 className={cn(
                  "text-xl font-bold mb-2",
                  plan.popular ? "text-white" : "text-stone-900"
                )}>
                  {plan.name}
                </h3>
                <p className={cn(
                  "text-sm mb-6",
                  plan.popular ? "text-white/60" : "text-stone-500"
                )}>
                  {plan.description}
                </p>

                <div className="mb-6">
                  <span className={cn(
                    "text-4xl font-bold",
                    plan.popular ? "text-white" : "text-stone-900"
                  )}>
                    {plan.price}
                  </span>
                  <span className={cn(
                    "text-lg ml-1",
                    plan.popular ? "text-white/60" : "text-stone-500"
                  )}>
                    {plan.unit}
                  </span>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className={cn(
                        "w-5 h-5 flex-shrink-0 mt-0.5",
                        plan.popular ? "text-emerald-400" : "text-emerald-500"
                      )} />
                      <span className={plan.popular ? "text-white/80" : "text-stone-600"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link to="/lien-he">
                  <Button
                    className={cn(
                      "w-full h-12 font-semibold rounded-xl",
                      plan.popular
                        ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
                        : "bg-stone-900 hover:bg-stone-800 text-white"
                    )}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6bTAtMThjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6bTE4IDBjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')]" />
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-3xl lg:text-5xl font-medium text-white mb-6">
              Sẵn sàng <span className="italic">chuyển đổi số?</span>
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Hơn 500 bến xe và 20.000+ phương tiện đã tin tưởng sử dụng.
              Hãy là người tiếp theo tham gia cuộc cách mạng số.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/lien-he">
                <Button size="lg" className="bg-white text-emerald-600 hover:bg-white/90 px-8 h-14 text-base font-semibold shadow-xl rounded-xl">
                  Liên hệ tư vấn ngay
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 h-14 text-base bg-transparent rounded-xl">
                  Xem bảng giá
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
      `}</style>
    </div>
  )
}
