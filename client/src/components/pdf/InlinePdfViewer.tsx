import { useState, useEffect, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"
import { fetchPdfBlob } from "@/lib/pdf-cache"
import { normalizePdfHref } from "@/utils/pdf-href"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

export interface InlinePdfViewerProps {
  url: string
  /** Chiều rộng tối đa mỗi trang (px) */
  maxPageWidth?: number
}

/** PDF trong trang — tải qua API proxy (CORS), không mở tab mới */
export function InlinePdfViewer({ url, maxPageWidth = 520 }: InlinePdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [numPages, setNumPages] = useState(0)

  const fileUrl = normalizePdfHref(url.trim())

  useEffect(() => {
    if (!fileUrl) {
      setBlobUrl(null)
      setLoading(false)
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

  if (error) {
    return (
      <p className="py-6 text-center text-xs text-destructive">
        Không tải được PDF. Thử đăng nhập lại hoặc kiểm tra quyền truy cập file.
      </p>
    )
  }

  if (loading || !blobUrl) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
        <span className="text-sm">Đang tải PDF…</span>
      </div>
    )
  }

  return (
    <Document
      file={blobUrl}
      onLoadSuccess={onDocumentLoadSuccess}
      onLoadError={() => setError(true)}
      loading={null}
    >
      {Array.from({ length: numPages }, (_, i) => (
        <div key={i} className="flex justify-center py-1.5">
          <div className="shadow-sm">
            <Page
              pageNumber={i + 1}
              width={maxPageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={null}
            />
          </div>
        </div>
      ))}
    </Document>
  )
}
