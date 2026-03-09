import { useState, useRef, useEffect } from "react"
import { MoreVertical, Eye, Edit, Trash2, X, Plus } from "lucide-react"
import { Button } from "./button"

export interface ActionMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: "default" | "danger" | "warning" | "info"
  disabled?: boolean
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  className?: string
}

export function ActionMenu({ items, className = "" }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleItemClick = (item: ActionMenuItem) => {
    if (!item.disabled) {
      item.onClick()
      setIsOpen(false)
    }
  }

  const getItemStyles = (variant?: string) => {
    switch (variant) {
      case "danger":
        return "text-red-600 hover:bg-red-50"
      case "warning":
        return "text-amber-600 hover:bg-amber-50"
      case "info":
        return "text-blue-600 hover:bg-blue-50"
      default:
        return "text-slate-600 hover:bg-slate-50"
    }
  }

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="h-8 w-8 p-0"
        aria-label="Thao tác"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  handleItemClick(item)
                }}
                disabled={item.disabled}
                className={`
                  w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors
                  ${getItemStyles(item.variant)}
                  ${item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                {item.icon || (
                  item.label === "Xem" ? <Eye className="h-4 w-4" /> :
                  item.label === "Sửa" ? <Edit className="h-4 w-4" /> :
                  item.label === "Xóa" ? <Trash2 className="h-4 w-4" /> :
                  item.label.includes("Vô hiệu") || item.label.includes("Kích hoạt") ? (
                    item.label.includes("Vô hiệu") ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />
                  ) : null
                )}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
