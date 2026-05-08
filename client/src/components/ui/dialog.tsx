import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

function ensurePortalRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null
  const existing = document.getElementById("app-portal-root")
  if (existing) return existing
  const el = document.createElement("div")
  el.id = "app-portal-root"
  document.body.appendChild(el)
  return el
}

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  /** Merged into the content wrapper (around DialogContent); default includes max-w-[95vw] */
  className?: string
  /** Merged into the fixed inset-0 overlay (e.g. p-0 items-stretch for full-screen) */
  overlayClassName?: string
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children, className, overlayClassName }) => {
  if (!open) return null

  const portalRoot = ensurePortalRoot()
  if (!portalRoot) return null

  return createPortal(
    <div className={cn("fixed inset-0 z-[100] flex items-center justify-center p-4", overlayClassName)}>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn("relative z-[101] max-w-[95vw]", className)}
      >
        {children}
      </div>
    </div>,
    portalRoot
  )
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative z-50 bg-white rounded-lg shadow-lg p-4 sm:p-6",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
DialogContent.displayName = "DialogContent"

const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}
    {...props}
  />
)

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-500", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogClose: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Button
    variant="ghost"
    size="icon"
    className="absolute right-4 top-4"
    onClick={onClose}
    aria-label="Close"
  >
    <X className="h-4 w-4" />
  </Button>
)

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
}

