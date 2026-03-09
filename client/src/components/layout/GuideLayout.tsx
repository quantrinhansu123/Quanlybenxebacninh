import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { Search, Phone } from "lucide-react"
import { Input } from "@/components/ui/input"
import { PublicHeader } from "./PublicHeader"
import { PublicFooter } from "./PublicFooter"

interface GuideStep {
  label: string
  path: string
  scrollId?: string
}

interface GuideLayoutProps {
  title: string
  steps: GuideStep[]
  children: React.ReactNode
}

export function GuideLayout({ title, steps, children }: GuideLayoutProps) {
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState("")

  // Calculate offset for scroll (header + banner height)
  const getScrollOffset = () => {
    const header = document.querySelector("header") as HTMLElement | null
    const banner = document.querySelector(".guide-banner") as HTMLElement | null
    const headerHeight = header ? header.offsetHeight : 64 // Default header height
    const bannerHeight = banner ? banner.offsetHeight : 96 // Default banner height
    return headerHeight + bannerHeight + 20 // Add 20px extra padding
  }

  // Handle scroll to section when hash changes
  useEffect(() => {
    const hash = location.hash.replace("#", "")
    if (hash) {
      const element = document.getElementById(hash)
      if (element) {
        setTimeout(() => {
          const offset = getScrollOffset()
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
          const offsetPosition = elementPosition - offset

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          })
        }, 100)
      }
    }
  }, [location.hash])

  const handleStepClick = (e: React.MouseEvent<HTMLAnchorElement>, step: GuideStep) => {
    e.preventDefault()
    const scrollId = step.scrollId || step.path.split("/").pop() || ""
    if (scrollId) {
      const element = document.getElementById(scrollId)
      if (element) {
        const offset = getScrollOffset()
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
        const offsetPosition = elementPosition - offset

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        })
        
        // Update URL hash without scrolling
        window.history.pushState(null, "", `${location.pathname}#${scrollId}`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />
      
      {/* Banner with Search and Hotline */}
      <div className="guide-banner bg-gradient-to-r from-amber-700 via-orange-600 to-amber-600 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 max-w-md w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-0 shadow-md"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-white">
              <Phone className="h-5 w-5" />
              <span className="text-lg font-semibold">Tổng Đài Hỗ Trợ 1900.4751</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="bg-gray-50 rounded-lg p-4 sticky top-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
                <nav className="space-y-2">
                  {steps.map((step, index) => {
                    const scrollId = step.scrollId || step.path.split("/").pop() || ""
                    const isActive = location.hash === `#${scrollId}` || (index === 0 && !location.hash)
                    return (
                      <a
                        key={step.path}
                        href={`${location.pathname}#${scrollId}`}
                        onClick={(e) => handleStepClick(e, step)}
                        className={`block px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                          isActive
                            ? "bg-primary text-white font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {step.label}
                      </a>
                    )
                  })}
                </nav>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
              <div className="bg-white rounded-lg shadow-sm">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}

