import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { User, Mail, Phone, UserCircle, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuthStore } from "@/store/auth.store"

const profileSchema = z.object({
  fullName: z.string().min(1, "Họ tên là bắt buộc").max(100, "Họ tên không được quá 100 ký tự"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  phone: z.string().max(20, "Số điện thoại không được quá 20 ký tự").optional().or(z.literal("")),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function Profile() {
  const { user, updateProfile } = useAuthStore()
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  })

  useEffect(() => {
    if (user) {
      reset({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
      })
    }
  }, [user, reset])

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true)
      setError("")
      setSuccess("")
      
      await updateProfile({
        fullName: data.fullName,
        email: data.email || undefined,
        phone: data.phone || undefined,
      })
      
      setSuccess("Cập nhật thông tin thành công!")
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Cập nhật thông tin thất bại. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: "Quản trị viên",
      dispatcher: "Điều độ viên",
      accountant: "Kế toán",
      reporter: "Báo cáo viên",
    }
    return roleLabels[role] || role
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Header Section */}
        <div className="mb-8 lg:mb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg">
            <UserCircle className="h-10 w-10 lg:h-12 lg:w-12 text-white" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Thông tin cá nhân
          </h1>
          <p className="text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
            Quản lý và cập nhật thông tin tài khoản của bạn
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
          {/* Thông tin tài khoản - Left Column */}
          <div className="lg:col-span-1">
            <Card className="h-full shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <UserCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  Thông tin tài khoản
                </CardTitle>
                <CardDescription className="text-sm">
                  Thông tin đăng nhập và quyền truy cập
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Tên đăng nhập
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-white border border-gray-200">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <p className="text-sm lg:text-base font-semibold text-gray-900">
                      {user?.username}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Vai trò
                  </Label>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md">
                      {getRoleLabel(user?.role || "")}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    ID người dùng
                  </Label>
                  <p className="mt-1 text-xs lg:text-sm text-gray-600 font-mono bg-white px-3 py-2 rounded border border-gray-200 break-all">
                    {user?.id}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form cập nhật thông tin - Right Column (2/3 width) */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg lg:text-xl">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Save className="h-5 w-5 text-green-600" />
                  </div>
                  Cập nhật thông tin
                </CardTitle>
                <CardDescription className="text-sm">
                  Chỉnh sửa thông tin cá nhân của bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-600 text-xs">!</span>
                      </div>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800 flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 text-xs">✓</span>
                      </div>
                      {success}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">
                      Họ và tên <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Nhập họ và tên"
                        className="pl-11 h-11 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        {...register("fullName")}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-sm text-red-600 mt-1">{errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Nhập email (tùy chọn)"
                        className="pl-11 h-11 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        {...register("email")}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                      Số điện thoại
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Nhập số điện thoại (tùy chọn)"
                        className="pl-11 h-11 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        {...register("phone")}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-5 w-5" />
                          Lưu thay đổi
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

