import { normalizeApiBase } from '@/lib/api'
import { normalizePdfHref } from '@/utils/pdf-href'

/** In-memory PDF blob cache with prefetch support */
const cache = new Map<string, string>()
const pending = new Map<string, Promise<string>>()

const getApiUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return normalizeApiBase(import.meta.env.VITE_API_URL)
  }
  if (import.meta.env.PROD) {
    return 'https://quanlybenxebacninh-server.vercel.app/api'
  }
  return 'http://localhost:3000/api'
}

const API_BASE = getApiUrl()

/** Build proxy URL to bypass CORS for external PDF files */
function getProxyUrl(fileUrl: string): string {
  return `${API_BASE}/operation-notices/proxy-pdf?url=${encodeURIComponent(fileUrl)}`
}

/** Fetch PDF via backend proxy and return a blob URL (cached) */
export async function fetchPdfBlob(url: string): Promise<string> {
  const resolved = normalizePdfHref(url.trim())
  if (!resolved) throw new Error('Empty PDF URL')

  const cached = cache.get(resolved)
  if (cached) return cached

  // Deduplicate concurrent requests for the same URL
  const inflight = pending.get(resolved)
  if (inflight) return inflight

  const token = localStorage.getItem('auth_token')
  const proxyUrl = getProxyUrl(resolved)

  const promise = fetch(proxyUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((res) => {
      if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`)
      return res.blob()
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob)
      cache.set(resolved, blobUrl)
      pending.delete(resolved)
      return blobUrl
    })
    .catch((err) => {
      pending.delete(resolved)
      throw err
    })

  pending.set(resolved, promise)
  return promise
}

/** Prefetch PDF into cache (fire-and-forget) */
export function prefetchPdf(url: string): void {
  if (!url?.trim()) return
  const resolved = normalizePdfHref(url.trim())
  if (!resolved || cache.has(resolved) || pending.has(resolved)) return
  fetchPdfBlob(url).catch(() => {})
}
