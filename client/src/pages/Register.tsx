import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { User, Lock, Mail, Phone, UserCircle, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/auth.store"
import logo from "@/assets/logo.png"

const registerSchema = z.object({
  username: z.string().min(3, "Tối thiểu 3 ký tự").max(50, "Tối đa 50 ký tự"),
  password: z.string().min(6, "Tối thiểu 6 ký tự"),
  confirmPassword: z.string().min(6, "Tối thiểu 6 ký tự"),
  fullName: z.string().min(1, "Bắt buộc").max(100, "Tối đa 100 ký tự"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  phone: z.string().max(20, "Tối đa 20 ký tự").optional().or(z.literal("")),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

// Same image as Login for consistency
const BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?w=1920&q=80"

const benefits = [
  "Quản lý xe và tài xế hiệu quả",
  "Theo dõi điều độ thời gian thực",
  "Báo cáo doanh thu tự động",
  "Hỗ trợ kỹ thuật 24/7"
]

export default function Register() {
  const navigate = useNavigate()
  const register = useAuthStore((state) => state.register)
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true)
      setError("")
      await register({
        username: data.username,
        password: data.password,
        fullName: data.fullName,
        email: data.email || undefined,
        phone: data.phone || undefined,
      })
      navigate("/dashboard")
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Đăng ký thất bại")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Cinematic Hero */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[55%] relative overflow-hidden">
        {/* Background Image */}
        <img
          src={BACKGROUND_IMAGE}
          alt="Bus interior"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900/95 via-stone-900/85 to-stone-800/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-stone-900/40" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-3 group">
            <img src={logo} alt="ABC C&T" className="h-12 w-auto" />
            <span className="font-display text-2xl text-white">ABC C&T</span>
          </Link>

          {/* Main Content */}
          <div className="max-w-md space-y-8">
            <div className="space-y-6">
              <h1 className="font-display text-4xl xl:text-5xl text-white leading-tight">
                <span className="block">Tham gia</span>
                <span className="block italic text-emerald-400">hệ sinh thái</span>
                <span className="block">số hóa.</span>
              </h1>
              <p className="text-lg text-stone-400 leading-relaxed">
                Đăng ký miễn phí và bắt đầu trải nghiệm giải pháp quản lý bến xe thông minh.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-stone-300 text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-stone-600">
            © 2025 ABC C&T. Đồng hành cùng ngành vận tải Việt Nam.
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full lg:w-[50%] xl:w-[45%] flex items-center justify-center p-6 sm:p-8 bg-stone-50 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src={logo} alt="ABC C&T" className="h-10 w-auto" />
              <span className="font-display text-xl text-stone-800">ABC C&T</span>
            </Link>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h2 className="font-display text-3xl text-stone-800 mb-2">
              Đăng ký
            </h2>
            <p className="text-stone-500">
              Tạo tài khoản mới để sử dụng hệ thống.
            </p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Username & Full Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-stone-700 text-sm font-medium">
                  Tên đăng nhập *
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="username"
                    className="pl-10 h-11 bg-white border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                    {...registerField("username")}
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-red-500">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-stone-700 text-sm font-medium">
                  Họ và tên *
                </Label>
                <div className="relative">
                  <UserCircle className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    className="pl-10 h-11 bg-white border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                    {...registerField("fullName")}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-xs text-red-500">{errors.fullName.message}</p>
                )}
              </div>
            </div>

            {/* Email & Phone Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-stone-700 text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    className="pl-10 h-11 bg-white border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                    {...registerField("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-stone-700 text-sm font-medium">
                  Số điện thoại
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0901234567"
                    className="pl-10 h-11 bg-white border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                    {...registerField("phone")}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Password Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-stone-700 text-sm font-medium">
                  Mật khẩu *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    className="pl-10 h-11 bg-white border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                    {...registerField("password")}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-stone-700 text-sm font-medium">
                  Xác nhận *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••"
                    className="pl-10 h-11 bg-white border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                    {...registerField("confirmPassword")}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-stone-800 hover:bg-stone-900 text-white font-medium rounded-xl transition-colors group mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Tạo tài khoản
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </Button>

            {/* Login Link */}
            <p className="text-center text-stone-500 text-sm">
              Đã có tài khoản?{" "}
              <Link
                to="/login"
                className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Đăng nhập
              </Link>
            </p>
          </form>

          {/* Footer - Mobile */}
          <div className="lg:hidden mt-8 pt-6 border-t border-stone-200 text-center text-xs text-stone-400">
            © 2025 ABC C&T. Bảo lưu mọi quyền.
          </div>
        </div>
      </div>
    </div>
  )
}
