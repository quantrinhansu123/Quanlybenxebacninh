import { describe, it, expect } from '@jest/globals'
import { normalizeGtvtRoutes } from '../gtvt-normalize-routes.service.js'
import { normalizeGtvtSchedules } from '../gtvt-normalize-schedules.service.js'

describe('GTVT Route/Schedule Sync Service', () => {
  describe('normalizeGtvtRoutes', () => {
    it('should normalize bus route code with BUS prefix', () => {
      const result = normalizeGtvtRoutes([
        {
          ID_TUYEN: 'route-001',
          SoHieuTuyen: '86',
          BenDi: 'Bến A',
          BenDen: 'Bến B',
        },
      ])

      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]).toMatchObject({
        firebaseId: 'route-001',
        routeCode: 'BUS-86',
        routeCodeOld: '86',
        routeType: 'bus',
      })
    })

    it('should return error for route without firebase id', () => {
      const result = normalizeGtvtRoutes([
        {
          route_code: 'TEST-01',
        },
      ])

      expect(result.rows).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('firebase id')
    })
  })

  describe('normalizeGtvtSchedules', () => {
    it('should normalize schedule with inferred defaults', () => {
      const result = normalizeGtvtSchedules([
        {
          ID_NutChay: 'schedule-001',
          Ref_Tuyen: 'route-001',
          Ref_DonVi: 'operator-001',
          GioXuatBen: '06:30:00',
          Chieu: 'Đi',
          NgayBanHanh: '23/02/2026',
        },
      ])

      expect(result.errors).toHaveLength(0)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]).toMatchObject({
        firebaseId: 'schedule-001',
        routeFirebaseId: 'route-001',
        operatorFirebaseId: 'operator-001',
        departureTime: '06:30',
        frequencyType: 'daily',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        effectiveFrom: '2026-02-23',
      })
    })

    it('should return error for invalid departure time', () => {
      const result = normalizeGtvtSchedules([
        {
          ID_NutChay: 'schedule-002',
          GioXuatBen: 'invalid-time',
        },
      ])

      expect(result.rows).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('departure time')
    })
  })
})

