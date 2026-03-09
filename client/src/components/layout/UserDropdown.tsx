import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronDown, User, LogOut, LayoutDashboard, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth.store"

interface UserDropdownProps {
  variant?: "desktop" | "mobile"
  onMenuClose?: () => void
  homeLink?: string
  homeLabel?: string
  homeIcon?: React.ReactNode
}

export function UserDropdown({
  variant = "desktop",
  onMenuClose,
  homeLink = "/dashboard",
  homeLabel = "Trang quản lý",
  homeIcon = <LayoutDashboard className="h-4 w-4" />,
}: UserDropdownProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    onMenuClose?.()
    navigate("/")
  }

  const handleMenuClose = () => {
    setUserMenuOpen(false)
    onMenuClose?.()
  }

  if (variant === "mobile") {
    return (
      <>
        <div className="px-4 py-2 border-b border-gray-200 mb-2">
          <p className="text-sm font-medium text-gray-900">
            {user?.fullName || user?.username}
          </p>
          <p className="text-xs text-gray-500">{user?.role}</p>
        </div>
        <Link
          to="/profile"
          onClick={handleMenuClose}
          className="w-full"
        >
          <Button variant="outline" className="w-full" size="sm">
            <UserCircle className="h-4 w-4 mr-2" />
            Thông tin cá nhân
          </Button>
        </Link>
        <Link
          to={homeLink}
          onClick={handleMenuClose}
          className="w-full"
        >
          <Button variant="outline" className="w-full" size="sm">
            {homeIcon && <span className="mr-2">{homeIcon}</span>}
            {homeLabel}
          </Button>
        </Link>
        <Button
          variant="outline"
          className="w-full text-red-600 hover:text-red-700"
          size="sm"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Đăng xuất
        </Button>
      </>
    )
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        onClick={() => setUserMenuOpen(!userMenuOpen)}
      >
        <User className="h-4 w-4" />
        <span>{user?.fullName || user?.username || "Người dùng"}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
      {userMenuOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
          onMouseLeave={() => setUserMenuOpen(false)}
        >
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">
              {user?.fullName || user?.username}
            </p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
          <Link
            to="/profile"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={handleMenuClose}
          >
            <UserCircle className="h-4 w-4" />
            Thông tin cá nhân
          </Link>
          <Link
            to={homeLink}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={handleMenuClose}
          >
            {homeIcon}
            {homeLabel}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}

