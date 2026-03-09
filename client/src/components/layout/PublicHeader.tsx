import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { Menu, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth.store"
import { UserDropdown } from "./UserDropdown"
import logo from "@/assets/logo.png"

interface NavItem {
  label: string
  path: string
  hasDropdown?: boolean
  dropdownItems?: { label: string; path: string }[]
  dropdownCategories?: {
    title: string
    path: string
    items: { label: string; path: string }[]
    underlineColor: "gray" | "teal" | "purple" | "amber"
  }[]
}

const navItems: NavItem[] = [
  { label: "Trang chủ", path: "/" },
  {
    label: "Sản phẩm",
    path: "/products",
    hasDropdown: true,
    dropdownCategories: [
      {
        title: "CỔNG VÀO RA TỰ ĐỘNG",
        path: "/products/gate",
        underlineColor: "gray",
        items: [
          { label: "Phần mềm quản lý vào - ra", path: "/products/gate/management" },
          { label: "Vé điện tử tại vào ra cổng", path: "/products/gate/electronic-ticket" },
          { label: "Thiết bị điều khiển cổng vào ra", path: "/products/gate/equipment" },
        ],
      },
      {
        title: "BẾN XE KHÁCH",
        path: "/products/bus-station",
        underlineColor: "teal",
        items: [
          { label: "Phần mềm quản lý bến xe", path: "/products/bus-station/management" },
          { label: "Ký số & Lệnh vận chuyển điện tử", path: "/products/bus-station/digital-signature" },
          { label: "Phần mềm bán vé tại bến", path: "/products/bus-station/ticket-sales" },
          { label: "Giải pháp thanh toán điện tử", path: "/products/bus-station/payment" },
        ],
      },
      {
        title: "DOANH NGHIỆP VẬN TẢI",
        path: "/products/transport",
        underlineColor: "teal",
        items: [
          { label: "Vé xe khách điện tử", path: "/products/transport/electronic-ticket" },
          { label: "Phần mềm bán vé điện tử", path: "/products/transport/ticket-software" },
          { label: "Lệnh vận chuyển điện tử", path: "/products/transport/dispatch-order" },
          { label: "Phần mềm quản lý chuyến xe", path: "/products/transport/trip-management" },
          { label: "Moblie app Lái Xe", path: "/products/transport/driver-app" },
        ],
      },
      {
        title: "ĐỐI TÁC ABC",
        path: "/products/partner",
        underlineColor: "gray",
        items: [
          { label: "Hóa đơn điện tử - Hilo Invoice", path: "/products/partner/hilo-invoice" },
          { label: "Hợp đồng điện tử - Hilo Contract", path: "/products/partner/hilo-contract" },
          { label: "Chữ ký số - Hilo CA", path: "/products/partner/hilo-ca" },
          { label: "Kiosk bán vé tự phục vụ", path: "/products/partner/kiosk" },
        ],
      },
    ],
  },
  {
    label: "Bảng giá",
    path: "/pricing",
    hasDropdown: true,
    dropdownItems: [
      { label: "Bảng giá vé xe khách điện tử", path: "/pricing/electronic-ticket" },
      { label: "Bảng giá lệnh vận chuyển điện tử", path: "/pricing/dispatch-order" },
      { label: "Bảng giá chữ ký số ICORP", path: "/pricing/icorp-signature" },
      { label: "Bảng giá HĐĐT - ICORP", path: "/pricing/icorp-invoice" },
    ],
  },
  {
    label: "Hướng dẫn sử dụng",
    path: "/guide",
    hasDropdown: true,
    dropdownCategories: [
      {
        title: "DÀNH CHO BẾN XE KHÁCH",
        path: "/guide/bus-station",
        underlineColor: "teal",
        items: [
          { label: "Bán vé ủy thác", path: "/guide/bus-station/consignment" },
          { label: "Điều độ", path: "/guide/bus-station/dispatch" },
          { label: "Thanh toán", path: "/guide/bus-station/payment" },
          { label: "Báo cáo - thống kê", path: "/guide/bus-station/reports" },
        ],
      },
      {
        title: "DÀNH CHO DOANH NGHIỆP VẬN TẢI",
        path: "/guide/transport",
        underlineColor: "purple",
        items: [
          { label: "Lệnh điện tử", path: "/guide/transport/electronic-order" },
          { label: "Bán vé điện tử", path: "/guide/transport/electronic-ticket" },
          { label: "Khởi tạo thông tin", path: "/guide/transport/init-data" },
          { label: "Thiết lập kế hoạch hoạt động", path: "/guide/transport/activity-plan" },
          { label: "Báo cáo - thống kê", path: "/guide/transport/reports" },
        ],
      },
      {
        title: "DÀNH CHO LÁI XE",
        path: "/guide/driver",
        underlineColor: "amber",
        items: [
          { label: "Lệnh vận chuyển điện tử", path: "/guide/driver/dispatch-order" },
          { label: "Bán vé điện tử trên xe", path: "/guide/driver/onboard-ticket" },
          { label: "Cài đặt app SLaiXe", path: "/guide/driver/slaixe-app" },
        ],
      },
    ],
  },
  { label: "Trợ giúp", path: "/help" },
]

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()

  // Track scroll for header styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/"
    }
    return location.pathname.startsWith(path)
  }

  const handleDropdownToggle = (label: string) => {
    setOpenDropdown(openDropdown === label ? null : label)
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-stone-200/50"
          : "bg-white border-b border-stone-100"
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 lg:h-18 items-center justify-between">
          {/* Logo - Elegant Typography */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={logo}
              alt="ABC C&T"
              className="h-10 lg:h-11 w-auto transition-transform group-hover:scale-105"
            />
            <span className="font-display text-xl lg:text-2xl font-semibold text-stone-800 tracking-tight">
              ABC C&T
            </span>
          </Link>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden lg:flex items-center">
            {navItems.map((item) => (
              <div key={item.label} className="relative group">
                <Link
                  to={item.path}
                  className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "text-emerald-600"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                  onClick={() => !item.hasDropdown && setOpenDropdown(null)}
                  onMouseEnter={() => item.hasDropdown && setOpenDropdown(item.label)}
                >
                  {item.label}
                  {item.hasDropdown && (
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      openDropdown === item.label ? "rotate-180" : ""
                    }`} />
                  )}
                  {/* Active indicator */}
                  {isActive(item.path) && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full" />
                  )}
                </Link>

                {/* Mega Menu Dropdown */}
                {item.hasDropdown && item.dropdownCategories && (
                  <div
                    className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-100 py-6 transition-all duration-200 ${
                      openDropdown === item.label
                        ? "opacity-100 visible translate-y-0"
                        : "opacity-0 invisible -translate-y-2"
                    }`}
                    style={{ width: "max-content", minWidth: "720px" }}
                    onMouseEnter={() => setOpenDropdown(item.label)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <div className="grid grid-cols-4 gap-8 px-8">
                      {item.dropdownCategories.map((category) => (
                        <div key={category.path} className="min-w-[160px]">
                          <Link
                            to={category.path}
                            className={`block mb-3 pb-2 text-xs font-bold tracking-wide text-stone-400 uppercase border-b-2 transition-colors hover:text-stone-600 ${
                              category.underlineColor === "teal"
                                ? "border-emerald-400"
                                : category.underlineColor === "purple"
                                ? "border-violet-400"
                                : category.underlineColor === "amber"
                                ? "border-amber-400"
                                : "border-stone-300"
                            }`}
                            onClick={() => setOpenDropdown(null)}
                          >
                            {category.title}
                          </Link>
                          <ul className="space-y-2">
                            {category.items.map((subItem) => (
                              <li key={subItem.path}>
                                <Link
                                  to={subItem.path}
                                  className="block text-sm text-stone-600 hover:text-emerald-600 transition-colors"
                                  onClick={() => setOpenDropdown(null)}
                                >
                                  {subItem.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Simple Dropdown */}
                {item.hasDropdown && item.dropdownItems && !item.dropdownCategories && (
                  <div
                    className={`absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl shadow-stone-200/50 border border-stone-100 py-2 transition-all duration-200 ${
                      openDropdown === item.label
                        ? "opacity-100 visible translate-y-0"
                        : "opacity-0 invisible -translate-y-2"
                    }`}
                    onMouseEnter={() => setOpenDropdown(item.label)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    {item.dropdownItems.map((dropdownItem) => (
                      <Link
                        key={dropdownItem.path}
                        to={dropdownItem.path}
                        className="block px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 hover:text-emerald-600 transition-colors"
                        onClick={() => setOpenDropdown(null)}
                      >
                        {dropdownItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <UserDropdown variant="desktop" />
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="text-stone-600 hover:text-stone-900 hover:bg-stone-100 font-medium"
                  >
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/lien-he">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 rounded-full shadow-sm shadow-emerald-500/20">
                    Liên hệ
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-stone-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-100 py-4 bg-white">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <div key={item.label}>
                  <Link
                    to={item.path}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? "text-emerald-600 bg-emerald-50"
                        : "text-stone-700 hover:bg-stone-50"
                    }`}
                    onClick={() => {
                      if (item.hasDropdown) {
                        handleDropdownToggle(item.label)
                      } else {
                        setMobileMenuOpen(false)
                      }
                    }}
                  >
                    {item.label}
                    {item.hasDropdown && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          openDropdown === item.label ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </Link>
                  {item.hasDropdown &&
                    item.dropdownCategories &&
                    openDropdown === item.label && (
                      <div className="mt-1 ml-4 space-y-4 py-2">
                        {item.dropdownCategories.map((category) => (
                          <div key={category.path}>
                            <Link
                              to={category.path}
                              className={`block mb-2 pb-1 font-semibold text-xs tracking-wide text-stone-400 uppercase border-b ${
                                category.underlineColor === "teal"
                                  ? "border-emerald-300"
                                  : "border-stone-200"
                              }`}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {category.title}
                            </Link>
                            <ul className="ml-2 space-y-1">
                              {category.items.map((subItem) => (
                                <li key={subItem.path}>
                                  <Link
                                    to={subItem.path}
                                    className="block px-2 py-1.5 text-sm text-stone-600 rounded-md hover:bg-stone-50"
                                    onClick={() => setMobileMenuOpen(false)}
                                  >
                                    {subItem.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  {item.hasDropdown &&
                    item.dropdownItems &&
                    !item.dropdownCategories &&
                    openDropdown === item.label && (
                      <div className="mt-1 ml-4 space-y-1 py-2">
                        {item.dropdownItems.map((dropdownItem) => (
                          <Link
                            key={dropdownItem.path}
                            to={dropdownItem.path}
                            className="block px-4 py-2 text-sm text-stone-600 rounded-lg hover:bg-stone-50"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {dropdownItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-stone-100 flex flex-col gap-2 px-4">
                {isAuthenticated ? (
                  <UserDropdown
                    variant="mobile"
                    onMenuClose={() => setMobileMenuOpen(false)}
                  />
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-lg border-stone-200">
                        Đăng nhập
                      </Button>
                    </Link>
                    <Link to="/lien-he" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700">
                        Liên hệ
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
