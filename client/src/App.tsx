import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { ProtectedRoute } from "@/features/auth"
import { MainLayout } from "@/components/layout/MainLayout"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { PageLoader } from "@/components/common/PageLoader"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { ChatWidget } from "@/features/chat"

// ============================================
// LAZY LOADED PAGES - Grouped by Feature Domain
// ============================================

// Auth Pages
const Login = lazy(() => import("@/pages/Login"))
const Register = lazy(() => import("@/pages/Register"))

// Public Pages
const HomePage = lazy(() => import("@/pages/HomePage"))
const LienHe = lazy(() => import("@/pages/LienHe"))

// Dashboard
const Dashboard = lazy(() => import("@/pages/Dashboard"))
const Profile = lazy(() => import("@/pages/Profile"))

// Dispatch (Dieu Do) Feature
const DieuDo = lazy(() => import("@/pages/DieuDo"))
const ThanhToan = lazy(() => import("@/pages/ThanhToan"))
const TaoMoiDonHang = lazy(() => import("@/pages/TaoMoiDonHang"))
const XeXuatBen = lazy(() => import("@/pages/XeXuatBen"))
const XeTraKhach = lazy(() => import("@/pages/XeTraKhach"))
const XeKhongDuDieuKien = lazy(() => import("@/pages/XeKhongDuDieuKien"))

// Fleet Management Feature
const QuanLyXe = lazy(() => import("@/pages/QuanLyXe"))
const QuanLyLaiXe = lazy(() => import("@/pages/QuanLyLaiXe"))
const QuanLyDonViVanTai = lazy(() => import("@/pages/QuanLyDonViVanTai"))
const QuanLyPhuHieuXe = lazy(() => import("@/pages/QuanLyPhuHieuXe"))

// Human Resources (Nhân sự)
const QuanLyNhanSu = lazy(() => import("@/pages/QuanLyNhanSu"))

// Route & Location Management
const QuanLyTuyen = lazy(() => import("@/pages/QuanLyTuyen"))
const QuanLyBenDen = lazy(() => import("@/pages/QuanLyBenDen"))

// Service & Formula Management
const QuanLyDichVu = lazy(() => import("@/pages/QuanLyDichVu"))
const QuanLyBieuThuc = lazy(() => import("@/pages/QuanLyBieuThuc"))

// Shift Management
const DanhSachCaTruc = lazy(() => import("@/pages/DanhSachCaTruc"))

// Reports Feature
const BaoCao = lazy(() => import("@/pages/BaoCao"))
const BaoCaoXeTraKhach = lazy(() => import("@/pages/BaoCaoXeTraKhach"))
const BaoCaoTheoDoiLenhXuatBen = lazy(() => import("@/pages/BaoCaoTheoDoiLenhXuatBen"))
const BaoCaoTongHopTuyen = lazy(() => import("@/pages/BaoCaoTongHopTuyen"))
const BaoCaoTongHop = lazy(() => import("@/pages/BaoCaoTongHop"))
const BaoCaoDoanhThuBenBanVe = lazy(() => import("@/pages/BaoCaoDoanhThuBenBanVe"))
const BaoCaoCapPhepRaBen = lazy(() => import("@/pages/BaoCaoCapPhepRaBen"))
const BaoCaoTheoDoiLenhTraKhach = lazy(() => import("@/pages/BaoCaoTheoDoiLenhTraKhach"))
const BaoCaoNhatTrinhXe = lazy(() => import("@/pages/BaoCaoNhatTrinhXe"))
const BaoCaoXeDiThay = lazy(() => import("@/pages/BaoCaoXeDiThay"))
const BaoCaoXeKhongDuDieuKien = lazy(() => import("@/pages/BaoCaoXeKhongDuDieuKien"))
const BaoCaoXeRaVaoBen = lazy(() => import("@/pages/BaoCaoXeRaVaoBen"))
const BaoCaoXeTangCuong = lazy(() => import("@/pages/BaoCaoXeTangCuong"))
const BaoCaoChamCongDangTai = lazy(() => import("@/pages/BaoCaoChamCongDangTai"))
const BaoCaoLichSuGiayTo = lazy(() => import("@/pages/BaoCaoLichSuGiayTo"))
const LapBaoCao = lazy(() => import("@/pages/LapBaoCao"))
const BaoCaoTinhHinhHoatDongMau1 = lazy(() => import("@/pages/BaoCaoTinhHinhHoatDongMau1"))
const BaoCaoTinhHinhHoatDongMau3 = lazy(() => import("@/pages/BaoCaoTinhHinhHoatDongMau3"))
const BangKeDoanhThu = lazy(() => import("@/pages/BangKeDoanhThu"))
const BangKeDoanhThu02 = lazy(() => import("@/pages/BangKeDoanhThu02"))
const BangKeHoaDon = lazy(() => import("@/pages/BangKeHoaDon"))

// Pricing Pages
const BangGiaVeDienTu = lazy(() => import("@/pages/pricing/BangGiaVeDienTu"))
const BangGiaLenhVanChuyen = lazy(() => import("@/pages/pricing/BangGiaLenhVanChuyen"))
const BangGiaChuKySo = lazy(() => import("@/pages/pricing/BangGiaChuKySo"))
const BangGiaHoaDonDienTu = lazy(() => import("@/pages/pricing/BangGiaHoaDonDienTu"))

// Guide Pages
const HuongDanBanVeUyThac = lazy(() => import("@/pages/guide/HuongDanBanVeUyThac"))

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={
          <Suspense fallback={<PageLoader />}>
            <Login />
          </Suspense>
        } />
        <Route path="/register" element={
          <Suspense fallback={<PageLoader />}>
            <Register />
          </Suspense>
        } />

        {/* Public Home */}
        <Route
          path="/"
          element={
            <PublicLayout>
              <Suspense fallback={<PageLoader />}>
                <HomePage />
              </Suspense>
            </PublicLayout>
          }
        />
        <Route
          path="/home"
          element={<Navigate to="/" replace />}
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Dispatch Feature */}
        <Route
          path="/dieu-do"
          element={
            <ProtectedRoute>
              <MainLayout disablePadding>
                <Suspense fallback={<PageLoader />}>
                  <DieuDo />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/thanh-toan"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <ThanhToan />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/thanh-toan/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <ThanhToan />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/thanh-toan/tao-moi"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <TaoMoiDonHang />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/truyen-tai/xe-xuat-ben"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <XeXuatBen />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/truyen-tai/xe-tra-khach"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <XeTraKhach />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/truyen-tai/xe-khong-du-dieu-kien"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <XeKhongDuDieuKien />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Fleet Management */}
        <Route
          path="/quan-ly-xe"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <QuanLyXe />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quan-ly-lai-xe"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <QuanLyLaiXe />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quan-ly-nhan-su"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <QuanLyNhanSu />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quan-ly-don-vi-van-tai"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <QuanLyDonViVanTai />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quan-ly-phu-hieu-xe"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <QuanLyPhuHieuXe />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Route & Location Management */}
        <Route
          path="/quan-ly-tuyen"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <QuanLyTuyen />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quan-ly-ben-den"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <QuanLyBenDen />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Service & Formula Management */}
        <Route
          path="/quan-ly-dich-vu"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <QuanLyDichVu />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quan-ly-bieu-thuc"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <QuanLyBieuThuc />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Shift Management */}
        <Route
          path="/danh-sach-ca-truc"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <DanhSachCaTruc />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Reports Feature */}
        <Route
          path="/bao-cao"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCao />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/xe-tra-khach"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoXeTraKhach />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/theo-doi-lenh-xuat-ben"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoTheoDoiLenhXuatBen />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/tong-hop-tuyen"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoTongHopTuyen />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/tong-hop"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoTongHop />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/doanh-thu-ben-ban-ve"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoDoanhThuBenBanVe />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/cap-phep-ra-ben"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoCapPhepRaBen />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/theo-doi-lenh-tra-khach"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoTheoDoiLenhTraKhach />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/nhat-trinh-xe"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoNhatTrinhXe />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/xe-di-thay"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoXeDiThay />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/xe-khong-du-dieu-kien"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoXeKhongDuDieuKien />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/xe-ra-vao-ben"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoXeRaVaoBen />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/xe-tang-cuong"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoXeTangCuong />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/cham-cong-dang-tai"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoChamCongDangTai />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/lich-su-giay-to"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoLichSuGiayTo />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/lap-bao-cao"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <LapBaoCao />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/tinh-hinh-hoat-dong-mau-1"
          element={
            <ProtectedRoute>
              <MainLayout disablePadding>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoTinhHinhHoatDongMau1 />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/tinh-hinh-hoat-dong-mau-3"
          element={
            <ProtectedRoute>
              <MainLayout disablePadding>
                <Suspense fallback={<PageLoader />}>
                  <BaoCaoTinhHinhHoatDongMau3 />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/bang-ke-doanh-thu"
          element={
            <ProtectedRoute>
              <MainLayout disablePadding>
                <Suspense fallback={<PageLoader />}>
                  <BangKeDoanhThu />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/bang-ke-doanh-thu-02-rut-gon"
          element={
            <ProtectedRoute>
              <MainLayout disablePadding>
                <Suspense fallback={<PageLoader />}>
                  <BangKeDoanhThu02 />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bao-cao/bang-ke-hoa-don"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<PageLoader />}>
                  <BangKeHoaDon />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <PublicLayout>
                <Suspense fallback={<PageLoader />}>
                  <Profile />
                </Suspense>
              </PublicLayout>
            </ProtectedRoute>
          }
        />

        {/* Pricing Pages */}
        <Route
          path="/pricing/electronic-ticket"
          element={
            <PublicLayout>
              <Suspense fallback={<PageLoader />}>
                <BangGiaVeDienTu />
              </Suspense>
            </PublicLayout>
          }
        />
        <Route
          path="/pricing/dispatch-order"
          element={
            <PublicLayout>
              <Suspense fallback={<PageLoader />}>
                <BangGiaLenhVanChuyen />
              </Suspense>
            </PublicLayout>
          }
        />
        <Route
          path="/pricing/icorp-signature"
          element={
            <PublicLayout>
              <Suspense fallback={<PageLoader />}>
                <BangGiaChuKySo />
              </Suspense>
            </PublicLayout>
          }
        />
        <Route
          path="/pricing/icorp-invoice"
          element={
            <PublicLayout>
              <Suspense fallback={<PageLoader />}>
                <BangGiaHoaDonDienTu />
              </Suspense>
            </PublicLayout>
          }
        />

        {/* Guide Pages */}
        <Route
          path="/guide/bus-station/consignment"
          element={
            <Suspense fallback={<PageLoader />}>
              <HuongDanBanVeUyThac />
            </Suspense>
          }
        />

        {/* Contact */}
        <Route
          path="/lien-he"
          element={
            <PublicLayout>
              <Suspense fallback={<PageLoader />}>
                <LienHe />
              </Suspense>
            </PublicLayout>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatWidget />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
