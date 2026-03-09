import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Route } from "@/types"
import { RouteForm } from "./RouteForm"
import { RouteView } from "./RouteView"

interface RouteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit" | "view"
  route: Route | null
  locations: any[]
  onSuccess: () => void
}

export function RouteDialog({
  open,
  onOpenChange,
  mode,
  route,
  locations,
  onSuccess,
}: RouteDialogProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (open) {
      setIsAnimating(true)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onOpenChange(false)
      onSuccess()
    }, 300)
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={handleClose}
    >
      <div
        className={`bg-white w-full h-full overflow-y-auto overflow-x-hidden transition-all duration-300 ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-[1920px] mx-auto p-8">
          {/* Header Section */}
          <div className="flex items-center justify-between pb-5 border-b mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "create" && "Thêm tuyến mới"}
              {mode === "edit" && "Sửa thông tin tuyến"}
              {mode === "view" && "Chi tiết tuyến"}
            </h1>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="text-blue-600 border-blue-600 hover:bg-blue-50 px-6"
              >
                HỦY
              </Button>
              {mode !== "view" && (
                <Button
                  type="submit"
                  form="route-form"
                  className="bg-blue-600 hover:bg-blue-700 px-6"
                >
                  LƯU
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div>
            {mode === "view" && route ? (
              <RouteView route={route} />
            ) : (
              <RouteForm
                route={route}
                locations={locations}
                mode={mode === "view" ? "create" : mode}
                onClose={handleClose}
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
