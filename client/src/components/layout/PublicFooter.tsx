import { Link } from "react-router-dom"
import { Facebook, Youtube, Linkedin, Instagram, Mail, Phone, MapPin, Bus, ArrowRight } from "lucide-react"

export function PublicFooter() {
  return (
    <footer className="bg-stone-900 text-stone-400">
      {/* Newsletter Section */}
      <div className="border-b border-stone-800">
        <div className="container mx-auto px-4 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Cập nhật tin tức mới nhất</h3>
              <p className="text-stone-500">Đăng ký nhận bản tin về giải pháp và ưu đãi từ ABC C&T</p>
            </div>
            <div className="flex gap-3 w-full lg:w-auto">
              <input
                type="email"
                placeholder="Email của bạn"
                className="flex-1 lg:w-72 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder:text-stone-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2">
                Đăng ký
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-2xl text-white">ABC C&T</span>
            </Link>
            <p className="text-stone-500 leading-relaxed mb-6 max-w-sm">
              Giải pháp công nghệ toàn diện cho bến xe và doanh nghiệp vận tải.
              Đồng hành cùng ngành vận tải Việt Nam trong kỷ nguyên số.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Facebook, href: 'https://facebook.com' },
                { icon: Youtube, href: 'https://youtube.com' },
                { icon: Linkedin, href: 'https://linkedin.com' },
                { icon: Instagram, href: 'https://instagram.com' }
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-stone-800 hover:bg-emerald-500 rounded-xl flex items-center justify-center text-stone-400 hover:text-white transition-all duration-300"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Khám phá */}
          <div>
            <h4 className="text-white font-semibold mb-5">Khám phá</h4>
            <ul className="space-y-3 text-sm">
              {[
                { label: 'Trang chủ', to: '/home' },
                { label: 'Về chúng tôi', to: '/about' },
                { label: 'Case study', to: '/case-study' },
                { label: 'Blog', to: '/blog' },
                { label: 'Tuyển dụng', to: '/careers' }
              ].map((link, i) => (
                <li key={i}>
                  <Link
                    to={link.to}
                    className="text-stone-500 hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Giải pháp */}
          <div>
            <h4 className="text-white font-semibold mb-5">Giải pháp</h4>
            <ul className="space-y-3 text-sm">
              {[
                { label: 'Lệnh điện tử', to: '/products' },
                { label: 'Vé xe điện tử', to: '/products' },
                { label: 'Chữ ký số HSM', to: '/products' },
                { label: 'Bán vé ủy thác', to: '/products' },
                { label: 'Bảng giá', to: '/pricing' }
              ].map((link, i) => (
                <li key={i}>
                  <Link
                    to={link.to}
                    className="text-stone-500 hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Liên hệ */}
          <div>
            <h4 className="text-white font-semibold mb-5">Liên hệ</h4>
            <ul className="space-y-4 text-sm">
              <li>
                <a
                  href="mailto:abctn@gmail.com"
                  className="flex items-center gap-3 text-stone-500 hover:text-emerald-400 transition-colors"
                >
                  <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  abctn@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:19004751"
                  className="flex items-center gap-3 text-stone-500 hover:text-emerald-400 transition-colors"
                >
                  <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  1900.4751
                </a>
              </li>
              <li className="flex items-start gap-3 text-stone-500">
                <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>Trụ sở chính: ABC</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-stone-800">
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p className="text-stone-600">
              © {new Date().getFullYear()} ABC C&T. Tất cả quyền được bảo lưu.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-stone-500 hover:text-emerald-400 transition-colors">
                Chính sách bảo mật
              </Link>
              <Link to="/terms" className="text-stone-500 hover:text-emerald-400 transition-colors">
                Điều khoản sử dụng
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
