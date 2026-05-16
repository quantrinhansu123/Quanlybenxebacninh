import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InlinePdfViewer } from "@/components/pdf/InlinePdfViewer"
import { isOpenableDocumentUrl, normalizePdfHref } from "@/utils/pdf-href"

export type NoticePdfSelection = {
  url: string
  title: string
} | null

type NoticePdfInlineViewProps = {
  selection: NoticePdfSelection
  onClose: () => void
  maxPageWidth?: number
}

/** Xem PDF ngay trong view (proxy + react-pdf), không mở tab mới */
export function NoticePdfInlineView({
  selection,
  onClose,
  maxPageWidth = 720,
}: NoticePdfInlineViewProps) {
  if (!selection) return null

  const href = isOpenableDocumentUrl(selection.url) ? normalizePdfHref(selection.url) : ""
  if (!href) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5 bg-slate-50">
        <span className="min-w-0 truncate text-sm font-medium text-slate-800">{selection.title}</span>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose} aria-label="Đóng PDF">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-h-[min(70vh,720px)] overflow-auto bg-slate-100 p-3">
        <InlinePdfViewer url={href} maxPageWidth={maxPageWidth} />
      </div>
    </div>
  )
}
