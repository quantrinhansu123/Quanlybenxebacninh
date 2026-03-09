import { Request, Response } from 'express'

// API Base URL - addresskit.cas.so (Dữ liệu từ Tổng cục Thống kê)
const API_BASE_URL = 'https://production.cas.so/address-kit'

// Type definitions for API responses
interface ProvincesResponse {
  provinces?: Array<{ code: string; name: string }>
}

interface CommunesResponse {
  communes?: Array<{
    code: string
    name: string
    districtCode?: string
    districtName?: string
  }>
}

// Effective dates
const V1_EFFECTIVE_DATE = '2024-01-01' // Trước sáp nhập - 63 tỉnh
const V2_EFFECTIVE_DATE = 'latest'      // Sau sáp nhập 2025 - 34 tỉnh

// Cache for API responses (server-side cache)
interface CacheEntry {
  data: any
  timestamp: number
}

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours - dữ liệu địa chính ít thay đổi
const cache: Map<string, CacheEntry> = new Map()

function getCached(key: string): any | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data
  }
  return null
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

// ============= V1 ENDPOINTS (Trước sáp nhập - 63 tỉnh) =============

// GET /provinces/v1 - Lấy danh sách tỉnh/thành phố
export const getProvincesV1 = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'provinces_v1'
    const cached = getCached(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }

    const response = await fetch(`${API_BASE_URL}/${V1_EFFECTIVE_DATE}/provinces`)

    if (!response.ok) {
      throw new Error(`Provinces API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as ProvincesResponse
    const provinces = (data.provinces || []).map((p) => ({
      code: p.code,
      name: p.name,
    }))

    setCache(cacheKey, provinces)
    res.json(provinces)
  } catch (error) {
    console.error('Error fetching provinces V1:', error)
    res.status(500).json({
      error: 'Failed to fetch provinces',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// GET /provinces/v1/:code/districts - Lấy quận/huyện của tỉnh
export const getDistrictsByProvinceV1 = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params

    if (!code) {
      res.status(400).json({ error: 'Province code is required' })
      return
    }

    const cacheKey = `districts_v1_${code}`
    const cached = getCached(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }

    // Fetch all communes for the province
    const response = await fetch(`${API_BASE_URL}/${V1_EFFECTIVE_DATE}/provinces/${code}/communes`)

    if (!response.ok) {
      throw new Error(`Districts API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as CommunesResponse
    const communes = data.communes || []

    // Extract unique districts from communes
    const districtMap = new Map<string, { code: string; name: string }>()
    for (const commune of communes) {
      if (commune.districtCode && commune.districtName && !districtMap.has(commune.districtCode)) {
        districtMap.set(commune.districtCode, {
          code: commune.districtCode,
          name: commune.districtName,
        })
      }
    }

    const districts = Array.from(districtMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'vi')
    )

    setCache(cacheKey, districts)
    res.json(districts)
  } catch (error) {
    console.error('Error fetching districts:', error)
    res.status(500).json({
      error: 'Failed to fetch districts',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// GET /provinces/v1/:provinceCode/districts/:districtCode/wards - Lấy phường/xã của quận/huyện
export const getWardsByDistrictV1 = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provinceCode, districtCode } = req.params

    if (!provinceCode || !districtCode) {
      res.status(400).json({ error: 'Province code and district code are required' })
      return
    }

    const cacheKey = `wards_v1_${provinceCode}_${districtCode}`
    const cached = getCached(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }

    // Fetch all communes for the province
    const response = await fetch(`${API_BASE_URL}/${V1_EFFECTIVE_DATE}/provinces/${provinceCode}/communes`)

    if (!response.ok) {
      throw new Error(`Wards API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as CommunesResponse
    const communes = data.communes || []

    // Filter wards by district code
    const wards = communes
      .filter((c) => c.districtCode === districtCode)
      .map((c) => ({
        code: c.code,
        name: c.name,
      }))

    setCache(cacheKey, wards)
    res.json(wards)
  } catch (error) {
    console.error('Error fetching wards:', error)
    res.status(500).json({
      error: 'Failed to fetch wards',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// ============= V2 ENDPOINTS (Sau sáp nhập 2025 - 34 tỉnh) =============

// GET /provinces/v2 - Lấy danh sách tỉnh/thành phố (sau sáp nhập)
export const getProvincesV2 = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'provinces_v2'
    const cached = getCached(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }

    const response = await fetch(`${API_BASE_URL}/${V2_EFFECTIVE_DATE}/provinces`)

    if (!response.ok) {
      throw new Error(`Provinces API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as ProvincesResponse
    const provinces = (data.provinces || []).map((p) => ({
      code: p.code,
      name: p.name,
    }))

    setCache(cacheKey, provinces)
    res.json(provinces)
  } catch (error) {
    console.error('Error fetching provinces V2:', error)
    res.status(500).json({
      error: 'Failed to fetch provinces',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// GET /provinces/v2/:code/wards - Lấy phường/xã trực tiếp từ tỉnh (V2 không có cấp quận/huyện)
export const getWardsByProvinceV2 = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params

    if (!code) {
      res.status(400).json({ error: 'Province code is required' })
      return
    }

    const cacheKey = `wards_v2_${code}`
    const cached = getCached(cacheKey)
    if (cached) {
      res.json(cached)
      return
    }

    const response = await fetch(`${API_BASE_URL}/${V2_EFFECTIVE_DATE}/provinces/${code}/communes`)

    if (!response.ok) {
      throw new Error(`Wards API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as CommunesResponse
    const wards = (data.communes || []).map((c) => ({
      code: c.code,
      name: c.name,
    }))

    setCache(cacheKey, wards)
    res.json(wards)
  } catch (error) {
    console.error('Error fetching wards V2:', error)
    res.status(500).json({
      error: 'Failed to fetch wards',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// ============= UTILITY =============

// Clear cache (for admin use)
export const clearCache = (_req: Request, res: Response): void => {
  cache.clear()
  res.json({ message: 'Cache cleared successfully' })
}
