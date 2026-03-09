import { useState, useEffect, useCallback } from "react"
import { X, ExternalLink, Loader2 } from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"
import { fetchPdfBlob } from "@/lib/pdf-cache"
import type { OperationNotice } from "@/types"

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

interface OperationNoticePdfViewerProps {
  notice: OperationNotice | null
  open: boolean
  onClose: () => void
}

const PANEL_WIDTH = 520
const PAGE_PADDING = 32

export function OperationNoticePdfViewer({ notice, open, onClose }: OperationNoticePdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [numPages, setNumPages] = useState(0)

  const fileUrl = notice?.fileUrl || ""

  // Fetch PDF blob when fileUrl changes
  useEffect(() => {
    if (!fileUrl) {
      setBlobUrl(null)
      return
    }
    setLoading(true)
    setError(false)
    fetchPdfBlob(fileUrl)
      .then(setBlobUrl)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [fileUrl])

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n)
  }, [])

  const handleOpenNewTab = () => {
    if (fileUrl) window.open(fileUrl, "_blank", "noopener,noreferrer")
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-[520px] max-w-[90vw] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-blue-50 border-b border-blue-200">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-800 truncate">
              {notice ? `TB: ${notice.noticeNumber}` : "Đang tải..."}
            </h3>
            <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-gray-600">
              {notice?.issueDate && <span>Ngày BH: {notice.issueDate}</span>}
              {notice?.issuingAuthority && <span>{notice.issuingAuthority}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors ml-2"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Body - continuous scroll for all pages */}
        <div className="flex-1 relative overflow-auto bg-gray-200">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Đang tải PDF...</span>
            </div>
          )}

          {error ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <p className="text-sm text-gray-600 mb-4">
                Không thể hiển thị PDF trực tiếp. Vui lòng mở trong tab mới.
              </p>
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Mở trong tab mới
              </button>
            </div>
          ) : blobUrl ? (
            <Document
              file={blobUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={() => setError(true)}
              loading={null}
            >
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i} className="flex justify-center py-2">
                  <div className="shadow-md">
                    <Page
                      pageNumber={i + 1}
                      width={PANEL_WIDTH - PAGE_PADDING}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={null}
                    />
                  </div>
                </div>
              ))}
            </Document>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Mở tab mới
          </button>

          {numPages > 0 && (
            <span className="text-xs text-gray-500">{numPages} trang</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
