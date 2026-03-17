import { useState, useRef, useEffect, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { MoreVertical, Eye, Edit, Trash2, X, Plus } from "lucide-react"
import { Button } from "./button"

/** Chọn icon theo label — hỗ trợ "Xem chi tiết", "Chỉnh sửa", "Xóa" */
function getIconForLabel(label: string): React.ReactNode {
  if (label.includes("Xem") || label.includes("chi tiết")) return <Eye className="h-4 w-4" />
  if (label.includes("Sửa") || label.includes("Chỉnh")) return <Edit className="h-4 w-4" />
  if (label.includes("Xóa")) return <Trash2 className="h-4 w-4" />
  if (label.includes("Vô hiệu")) return <X className="h-4 w-4" />
  if (label.includes("Kích hoạt")) return <Plus className="h-4 w-4" />
  return null
}

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
  const portalRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const menuW = 192
      const left = Math.max(8, Math.min(rect.right - menuW, window.innerWidth - menuW - 8))
      const spaceBelow = window.innerHeight - rect.bottom
      const menuH = Math.min(items.length * 40 + 16, 200)
      const top = spaceBelow >= menuH ? rect.bottom + 4 : rect.top - menuH - 4
      setMenuPosition({ top, left })
    }
  }, [isOpen, items.length])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const inTrigger = menuRef.current?.contains(target)
      const inPortal = portalRef.current?.contains(target)
      if (!inTrigger && !inPortal) setIsOpen(false)
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

  const menuContent = isOpen && (
    <div ref={portalRef}>
      <div
        className="fixed inset-0 z-[9998]"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      <div
        className="fixed w-48 bg-white rounded-xl shadow-2xl border border-slate-200 z-[9999] py-2"
        style={{ top: menuPosition.top, left: menuPosition.left }}
      >
        {items.map((item, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation()
              handleItemClick(item)
            }}
            disabled={item.disabled}
            className={`w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors ${getItemStyles(item.variant)} ${item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {item.icon || getIconForLabel(item.label)}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )

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

      {menuContent && createPortal(menuContent, document.body)}
    </div>
  )
}
