import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { User, Lock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuthStore } from "@/store/auth.store"
import logo from "@/assets/logo.png"

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
  rememberMe: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

// Modern transportation - highway with vehicles
const BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?w=1920&q=80"

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      setError("")
      await login(data.usernameOrEmail.trim(), data.password, data.rememberMe)
      navigate("/dashboard")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Thông tin đăng nhập không chính xác"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Cinematic Hero */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative overflow-hidden">
        {/* Background Image */}
        <img
          src={BACKGROUND_IMAGE}
          alt="Modern architecture"
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
          <div className="max-w-lg space-y-8">
            <div className="space-y-6">
              <h1 className="font-display text-4xl xl:text-5xl text-white leading-tight">
                <span className="block">Hệ thống</span>
                <span className="block italic text-emerald-400">Quản lý Bến xe</span>
                <span className="block">thông minh.</span>
              </h1>
              <p className="text-lg text-stone-400 leading-relaxed">
                Nền tảng số hóa toàn diện cho vận hành bến xe và doanh nghiệp vận tải hành khách.
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-12 pt-8 border-t border-stone-700/50">
              <div>
                <div className="text-3xl font-semibold text-white">600<span className="text-emerald-400">+</span></div>
                <div className="text-sm text-stone-500 mt-1">Doanh nghiệp</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-white">500<span className="text-emerald-400">+</span></div>
                <div className="text-sm text-stone-500 mt-1">Bến xe</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-white">99.9<span className="text-emerald-400">%</span></div>
                <div className="text-sm text-stone-500 mt-1">Uptime</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-stone-600">
            © 2025 ABC C&T. Đồng hành cùng ngành vận tải Việt Nam.
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex items-center justify-center p-6 sm:p-12 bg-stone-50">
        <div className="w-full max-w-[400px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src={logo} alt="ABC C&T" className="h-10 w-auto" />
              <span className="font-display text-xl text-stone-800">ABC C&T</span>
            </Link>
          </div>

          {/* Form Header */}
          <div className="mb-10">
            <h2 className="font-display text-3xl text-stone-800 mb-2">
              Đăng nhập
            </h2>
            <p className="text-stone-500">
              Chào mừng trở lại. Vui lòng nhập thông tin.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Username/Email */}
              <div className="space-y-2">
                <Label htmlFor="usernameOrEmail" className="text-stone-700 text-sm font-medium">
                  Tên đăng nhập
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" />
                  <Input
                    id="usernameOrEmail"
                    type="text"
                    placeholder="Nhập tên đăng nhập hoặc email"
                    className="pl-11 h-12 bg-white border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    {...register("usernameOrEmail")}
                  />
                </div>
                {errors.usernameOrEmail && (
                  <p className="text-sm text-red-500">{errors.usernameOrEmail.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-stone-700 text-sm font-medium">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Nhập mật khẩu"
                    className="pl-11 h-12 bg-white border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    {...register("password")}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="rememberMe"
                  className="border-stone-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  {...register("rememberMe")}
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm text-stone-600 cursor-pointer"
                >
                  Ghi nhớ đăng nhập
                </Label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-stone-800 hover:bg-stone-900 text-white font-medium rounded-xl transition-colors group"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Đăng nhập
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </Button>

            {/* Register Link */}
            <p className="text-center text-stone-500 text-sm">
              Chưa có tài khoản?{" "}
              <Link
                to="/register"
                className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Đăng ký ngay
              </Link>
            </p>
          </form>

          {/* Footer - Mobile */}
          <div className="lg:hidden mt-12 pt-6 border-t border-stone-200 text-center text-xs text-stone-400">
            © 2025 ABC C&T. Bảo lưu mọi quyền.
          </div>
        </div>
      </div>
    </div>
  )
}
