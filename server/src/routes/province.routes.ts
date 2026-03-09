import { Router } from 'express'
import {
  getProvincesV1,
  getProvincesV2,
  getDistrictsByProvinceV1,
  getWardsByDistrictV1,
  getWardsByProvinceV2,
  clearCache,
} from '../controllers/province.controller.js'

const router = Router()

// Public routes (no authentication required for provinces API)

// V1 endpoints (trước sáp nhập - 63 tỉnh)
router.get('/v1', getProvincesV1)
router.get('/v1/:code/districts', getDistrictsByProvinceV1)
router.get('/v1/:provinceCode/districts/:districtCode/wards', getWardsByDistrictV1)

// V2 endpoints (sau sáp nhập 2025 - 34 tỉnh)
router.get('/v2', getProvincesV2)
router.get('/v2/:code/wards', getWardsByProvinceV2)

// Utility
router.post('/clear-cache', clearCache)

export default router
