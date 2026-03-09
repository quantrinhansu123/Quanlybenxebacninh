import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { useUIStore } from "@/store/ui.store"
import { cn } from "@/lib/utils"

interface MainLayoutProps {
  children: React.ReactNode
  disablePadding?: boolean
}

export function MainLayout({ children, disablePadding = false }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed)

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={cn(
        "flex flex-col h-full transition-all duration-300",
        sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
      )}>
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className={`flex-1 overflow-auto ${disablePadding ? "" : "p-4 lg:p-6"}`}>{children}</main>
      </div>
    </div>
  )
}

