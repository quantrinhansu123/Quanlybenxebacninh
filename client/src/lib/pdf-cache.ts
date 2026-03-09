/** In-memory PDF blob cache with prefetch support */
const cache = new Map<string, string>()
const pending = new Map<string, Promise<string>>()

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/** Build proxy URL to bypass CORS for external PDF files */
function getProxyUrl(fileUrl: string): string {
  return `${API_BASE}/operation-notices/proxy-pdf?url=${encodeURIComponent(fileUrl)}`
}

/** Fetch PDF via backend proxy and return a blob URL (cached) */
export async function fetchPdfBlob(url: string): Promise<string> {
  const cached = cache.get(url)
  if (cached) return cached

  // Deduplicate concurrent requests for the same URL
  const inflight = pending.get(url)
  if (inflight) return inflight

  const token = localStorage.getItem('auth_token')
  const proxyUrl = getProxyUrl(url)

  const promise = fetch(proxyUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((res) => {
      if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`)
      return res.blob()
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob)
      cache.set(url, blobUrl)
      pending.delete(url)
      return blobUrl
    })
    .catch((err) => {
      pending.delete(url)
      throw err
    })

  pending.set(url, promise)
  return promise
}

/** Prefetch PDF into cache (fire-and-forget) */
export function prefetchPdf(url: string): void {
  if (!url || cache.has(url) || pending.has(url)) return
  fetchPdfBlob(url).catch(() => {})
}
