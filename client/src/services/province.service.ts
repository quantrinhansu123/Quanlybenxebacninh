// Province Service - Using backend proxy to fetch data from addresskit.cas.so
// Dữ liệu từ Tổng cục Thống kê, hỗ trợ cả trước và sau sáp nhập 2025

import api from '@/lib/api'

export interface Province {
  code: string
  name: string
}

export interface District {
  code: string
  name: string
}

export interface Ward {
  code: string
  name: string
}

// Cache for API responses
interface CacheEntry<T> {
  data: T
  timestamp: number
}

const CACHE_TTL = 60 * 60 * 1000 // 60 minutes - tăng cache để giảm API calls
let provincesV1Cache: CacheEntry<Province[]> | null = null
let provincesV2Cache: CacheEntry<Province[]> | null = null
const districtsCache: Map<string, CacheEntry<District[]>> = new Map()
const wardsCache: Map<string, CacheEntry<Ward[]>> = new Map()

function isCacheValid<T>(cache: CacheEntry<T> | null | undefined): cache is CacheEntry<T> {
  if (!cache) return false
  return Date.now() - cache.timestamp < CACHE_TTL
}

// ============= PROVINCE SERVICE =============

export const provinceService = {
  // ============= V1 METHODS (Trước sáp nhập - 63 tỉnh) =============

  // Lấy danh sách tỉnh/thành phố
  getProvincesV1: async (): Promise<Province[]> => {
    if (isCacheValid(provincesV1Cache)) {
      return provincesV1Cache.data
    }

    try {
      const response = await api.get<Province[]>('/provinces/v1')
      const provinces = response.data
      provincesV1Cache = { data: provinces, timestamp: Date.now() }
      return provinces
    } catch (error) {
      console.error('Error fetching provinces V1:', error)
      return []
    }
  },

  // Lấy quận/huyện của tỉnh
  getDistrictsByProvinceV1: async (provinceCode: string): Promise<District[]> => {
    if (!provinceCode) return []

    const cacheKey = `districts_${provinceCode}`
    const cached = districtsCache.get(cacheKey)
    if (isCacheValid(cached)) {
      return cached.data
    }

    try {
      const response = await api.get<District[]>(`/provinces/v1/${provinceCode}/districts`)
      const districts = response.data
      districtsCache.set(cacheKey, { data: districts, timestamp: Date.now() })
      return districts
    } catch (error) {
      console.error('Error fetching districts:', error)
      return []
    }
  },

  // Lấy phường/xã của quận/huyện
  getWardsByDistrictV1: async (provinceCode: string, districtCode: string): Promise<Ward[]> => {
    if (!provinceCode || !districtCode) return []

    const cacheKey = `wards_${provinceCode}_${districtCode}`
    const cached = wardsCache.get(cacheKey)
    if (isCacheValid(cached)) {
      return cached.data
    }

    try {
      const response = await api.get<Ward[]>(`/provinces/v1/${provinceCode}/districts/${districtCode}/wards`)
      const wards = response.data
      wardsCache.set(cacheKey, { data: wards, timestamp: Date.now() })
      return wards
    } catch (error) {
      console.error('Error fetching wards:', error)
      return []
    }
  },

  // ============= V2 METHODS (Sau sáp nhập 2025 - 34 tỉnh) =============

  // Lấy danh sách tỉnh/thành phố (sau sáp nhập)
  getProvincesV2: async (): Promise<Province[]> => {
    if (isCacheValid(provincesV2Cache)) {
      return provincesV2Cache.data
    }

    try {
      const response = await api.get<Province[]>('/provinces/v2')
      const provinces = response.data
      provincesV2Cache = { data: provinces, timestamp: Date.now() }
      return provinces
    } catch (error) {
      console.error('Error fetching provinces V2:', error)
      return []
    }
  },

  // Lấy phường/xã trực tiếp từ tỉnh (V2 không có cấp quận/huyện)
  getWardsByProvinceV2: async (provinceCode: string): Promise<Ward[]> => {
    if (!provinceCode) return []

    const cacheKey = `wards_v2_${provinceCode}`
    const cached = wardsCache.get(cacheKey)
    if (isCacheValid(cached)) {
      return cached.data
    }

    try {
      const response = await api.get<Ward[]>(`/provinces/v2/${provinceCode}/wards`)
      const wards = response.data
      wardsCache.set(cacheKey, { data: wards, timestamp: Date.now() })
      return wards
    } catch (error) {
      console.error('Error fetching wards V2:', error)
      return []
    }
  },

  // ============= SEARCH METHODS =============

  searchProvincesV1: async (query: string): Promise<Province[]> => {
    const provinces = await provinceService.getProvincesV1()
    const normalizedQuery = query.toLowerCase()
    return provinces.filter(p => p.name.toLowerCase().includes(normalizedQuery))
  },

  searchProvincesV2: async (query: string): Promise<Province[]> => {
    const provinces = await provinceService.getProvincesV2()
    const normalizedQuery = query.toLowerCase()
    return provinces.filter(p => p.name.toLowerCase().includes(normalizedQuery))
  },

  // ============= UTILITY METHODS =============

  clearCache: () => {
    provincesV1Cache = null
    provincesV2Cache = null
    districtsCache.clear()
    wardsCache.clear()
  },
}
