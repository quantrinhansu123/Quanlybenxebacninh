import { useState } from "react"
import { Menu, Home, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserDropdown } from "./UserDropdown"
import { useUIStore } from "@/store/ui.store"
import { ShiftSelectionDialog } from "./ShiftSelectionDialog"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { title, currentShift } = useUIStore()
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="hidden lg:flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
              <span>Ca trực: <span className="font-medium text-gray-900">{currentShift}</span></span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 hover:bg-gray-200 rounded-full ml-1"
                onClick={() => setShiftDialogOpen(true)}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <UserDropdown
            variant="desktop"
            homeLink="/"
            homeLabel="Trang chủ"
            homeIcon={<Home className="h-4 w-4" />}
          />
        </div>
      </div>
      <ShiftSelectionDialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen} />
    </header>
  )
}

