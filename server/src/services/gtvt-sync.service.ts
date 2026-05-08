import { db } from '../db/drizzle.js'
import { routes, schedules, operators } from '../db/schema/index.js'
import { appsheetFind } from './gtvt-appsheet.client.js'
import { inArray, sql } from 'drizzle-orm'

type SyncSummary = {
  routes: { fetched: number; upserted: number }
  schedules: { fetched: number; upserted: number; skipped: number }
  errors: string[]
}

function pick(row: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row?.[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

function toInt(v: any): number | null {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? Math.floor(n) : null
}

function normalizeTime(v: any): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  // Accept "HH:MM" or "H:MM"
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  const hh = m[1]!.padStart(2, '0')
  const mm = m[2]!
  return `${hh}:${mm}`
}

function buildScheduleCode(routeCode: string, direction: string | null, departureTime: string, firebaseId: string): string {
  const hhmm = departureTime.replace(':', '')
  const dir = (direction || '').trim() || 'NA'
  const base = `BDG-${routeCode}-${dir}-${hhmm}-${firebaseId}`.replace(/\s+/g, '')
  return base.slice(0, 50)
}

async function upsertRoutesFromAppSheet(rows: any[], dryRun: boolean, summary: SyncSummary) {
  const normalized = rows
    .map((r) => {
      const fixedCode = pick(r, ['MaSoTuyen', 'routeCode', 'RouteCode'])
      const busCodeRaw = pick(r, ['SoHieuTuyen'])
      const isBus = !fixedCode && !!busCodeRaw
      const routeCodeRaw = fixedCode || busCodeRaw
      if (!routeCodeRaw) return null

      const routeCode = isBus ? `BUS-${routeCodeRaw}` : routeCodeRaw
      const routeCodeOld = isBus ? routeCodeRaw : undefined

      // AppSheet (DANHMUCTUYENCODINH) columns:
      // - TinhDi/TinhDen: province
      // - BenDi/BenDen: station
      // - BenDi_Ref/BenDen_Ref: station ref
      const departureProvince = pick(r, ['TinhDi', 'DepartureProvince', 'departureProvince'])
      const arrivalProvince = pick(r, ['TinhDen', 'ArrivalProvince', 'arrivalProvince'])

      const departureStation = pick(r, ['BenDi', 'DepartureStation', 'Bến đi', 'BenDau'])
      const arrivalStation = pick(r, ['BenDen', 'ArrivalStation', 'Bến đến'])
      const departureStationRef = pick(r, ['BenDi_Ref', 'departureStationRef', 'DepartureStationRef'])
      const arrivalStationRef = pick(r, ['BenDen_Ref', 'arrivalStationRef', 'ArrivalStationRef'])

      const distanceKm = toInt(pick(r, ['CuLyTuyen_km', 'CuLy', 'DistanceKm', 'distanceKm', 'CuLyKm']))
      const itinerary = pick(r, ['HanhTrinh', 'itinerary', 'Hành trình'])

      const totalTripsPerMonth = toInt(pick(r, ['TongChuyenThang', 'totalTripsMonth', 'total_trips_month']))
      const tripsOperated = toInt(pick(r, ['ChuyenDaKhaiThac', 'tripsInOperation', 'trips_operated']))
      const remainingCapacity = toInt(pick(r, ['LuuLuongConLai', 'remainingCapacity', 'remaining_capacity']))
      const minIntervalMinutes = toInt(pick(r, ['GianCachToiThieu_phut', 'GianCachToiThieu', 'minIntervalMinutes', 'min_interval_minutes']))

      const decisionNumber = pick(r, ['SoQuyetDinh', 'DecisionNumber', 'so_quyet_dinh'])
      const decisionDate = pick(r, ['NgayBanHanh', 'DecisionDate', 'ngay_ban_hanh'])
      const issuingAuthority = pick(r, ['DonViBanHanh', 'IssuingAuthority', 'don_vi_ban_hanh'])

      // DANHMUCTUYENCODINH naming per user:
      const operationStatus = pick(r, ['TinhTrangKhaiThac', 'TinhTrang', 'OperationStatus', 'tinh_trang'])
      const routeTypeBase = pick(r, ['PhanLoaiTuyen', 'LoaiTuyen', 'RouteType', 'routeType'])
      const routeType = isBus ? (routeTypeBase || 'Xe buýt') : routeTypeBase

      const firebaseId = pick(r, ['ID_Tuyen', 'ID_TUYEN', 'ID', 'firebaseId']) || routeCode

      // Store extra columns (no direct schema fields) into metadata so they are not lost.
      const metadataExtra = {
        File: pick(r, ['File']),
        User: pick(r, ['User']),
        ThoiGianNhap: pick(r, ['ThoiGianNhap']),
        MaSoTuyen_Fix: pick(r, ['MaSoTuyen_Fix']),
        MaO: pick(r, ['MaO']),
        MaSoTuyen_Cu: pick(r, ['MaSoTuyen_Cu']),
        TinhDi_Cu: pick(r, ['TinhDi_Cu']),
        TinhDen_Cu: pick(r, ['TinhDen_Cu']),
        Kieulich: pick(r, ['Kieulich']),

        // "O/N/FO" variants
        TinhdiO: pick(r, ['TinhdiO']),
        TinhdiN: pick(r, ['TinhdiN']),
        TinhdenFO: pick(r, ['TinhdenFO']),
        TinhdenN: pick(r, ['TinhdenN']),
        BendiO: pick(r, ['BendiO']),
        BendiN: pick(r, ['BendiN']),
        BendenO: pick(r, ['BendenO']),
        BendenN: pick(r, ['BendenN']),
      }

      return {
        firebaseId,
        routeCode: routeCode.toUpperCase().slice(0, 50),
        // For fixed routes, prefer MaSoTuyen_Cu as routeCodeOld if present; fallback to bus old code.
        routeCodeOld: (pick(r, ['MaSoTuyen_Cu']) || routeCodeOld || '').trim()
          ? (pick(r, ['MaSoTuyen_Cu']) || routeCodeOld)!.trim().slice(0, 50)
          : null,
        departureProvince: departureProvince?.slice(0, 100) || null,
        arrivalProvince: arrivalProvince?.slice(0, 100) || null,
        departureStation: departureStation?.slice(0, 255) || null,
        departureStationRef: departureStationRef?.slice(0, 20) || null,
        arrivalStation: arrivalStation?.slice(0, 255) || null,
        arrivalStationRef: arrivalStationRef?.slice(0, 20) || null,
        distanceKm,
        itinerary: itinerary || null,
        routeType: routeType || null,
        totalTripsPerMonth,
        tripsOperated,
        remainingCapacity,
        minIntervalMinutes,
        decisionNumber: decisionNumber || null,
        decisionDate: decisionDate || null,
        issuingAuthority: issuingAuthority || null,
        operationStatus: operationStatus || null,
        isActive: true,
        source: 'appsheet',
        syncedAt: new Date(),
        metadata: { appsheet_row: r, ...metadataExtra },
      }
    })
    .filter(Boolean) as Array<any>

  summary.routes.fetched = rows.length

  if (dryRun) {
    summary.routes.upserted = normalized.length
    return
  }

  if (!db) throw new Error('[GTVT] Database not initialized')
  if (normalized.length === 0) return

  const result = await db
    .insert(routes)
    .values(normalized)
    .onConflictDoUpdate({
      target: routes.routeCode,
      set: {
        firebaseId: sql`excluded.firebase_id`,
        routeCodeOld: sql`excluded.route_code_old`,
        departureProvince: sql`excluded.departure_province`,
        arrivalProvince: sql`excluded.arrival_province`,
        departureStation: sql`excluded.departure_station`,
        departureStationRef: sql`excluded.departure_station_ref`,
        arrivalStation: sql`excluded.arrival_station`,
        arrivalStationRef: sql`excluded.arrival_station_ref`,
        distanceKm: sql`excluded.distance_km`,
        itinerary: sql`excluded.itinerary`,
        routeType: sql`excluded.route_type`,
        totalTripsPerMonth: sql`excluded.total_trips_per_month`,
        tripsOperated: sql`excluded.trips_operated`,
        remainingCapacity: sql`excluded.remaining_capacity`,
        minIntervalMinutes: sql`excluded.min_interval_minutes`,
        decisionNumber: sql`excluded.decision_number`,
        decisionDate: sql`excluded.decision_date`,
        issuingAuthority: sql`excluded.issuing_authority`,
        operationStatus: sql`excluded.operation_status`,
        isActive: sql`true`,
        source: sql`excluded.source`,
        syncedAt: sql`excluded.synced_at`,
        metadata: sql`COALESCE(${routes.metadata}, '{}'::jsonb) || COALESCE(excluded.metadata, '{}'::jsonb)`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: routes.id })

  summary.routes.upserted = result.length
}

async function upsertSchedulesFromAppSheet(scheduleRows: any[], notifRows: any[], dryRun: boolean, summary: SyncSummary) {
  summary.schedules.fetched = scheduleRows.length

  if (!db) throw new Error('[GTVT] Database not initialized')

  // notif join map: ID_TB -> { routeRef, operatorRef, notificationNumber, notificationFileUrl, displayText }
  const notifMap = new Map<string, {
    routeRef?: string;
    operatorRef?: string;
    notificationNumber?: string;
    notificationFileUrl?: string;
    displayText?: string;
  }>()
  for (const n of notifRows) {
    const id = pick(n, ['ID_TB', 'id', 'Id', 'firebaseId'])
    if (!id) continue
    notifMap.set(id, {
      routeRef: pick(n, ['Ref_Tuyen', 'routeRef', 'RouteRef']),
      operatorRef: pick(n, ['Ref_DonVi', 'operatorRef', 'OperatorRef']),
      notificationNumber: pick(n, ['SoThongBao', 'notificationNumber', 'NotificationNumber']),
      notificationFileUrl: pick(n, ['File', 'notificationFileUrl', 'NotificationFileUrl']),
      displayText: pick(n, ['ThongBaoHienThi', 'displayText']),
    })
  }

  // Preload operators by firebaseId for fast lookup
  const operatorRefs = Array.from(new Set(Array.from(notifMap.values()).map(v => v.operatorRef).filter(Boolean))) as string[]
  const ops = operatorRefs.length
    ? await db.select({ id: operators.id, firebaseId: operators.firebaseId }).from(operators).where(inArray(operators.firebaseId, operatorRefs))
    : []
  const opIdByFb = new Map(ops.map(o => [String(o.firebaseId || '').trim(), o.id]))

  // Preload routes by routeCode (Ref_Tuyen often maps to routeCode)
  const routeRefs = Array.from(new Set(Array.from(notifMap.values()).map(v => v.routeRef).filter(Boolean))) as string[]
  const rts = routeRefs.length
    ? await db.select({ id: routes.id, routeCode: routes.routeCode }).from(routes).where(inArray(routes.routeCode, routeRefs.map(r => r.toUpperCase())))
    : []
  const routeIdByCode = new Map(rts.map(r => [String(r.routeCode || '').trim().toUpperCase(), r.id]))

  const normalized: Array<any> = []
  let skipped = 0

  for (const s of scheduleRows) {
    const firebaseId = pick(s, ['ID_NutChay', 'ID', 'firebaseId', 'id'])
    const notifId = pick(s, ['Ref_ThongBaoKhaiThac', 'ThongBao', 'RefTB', 'notificationRef'])
    const notif = notifId ? notifMap.get(notifId) : undefined
    const routeCode = (notif?.routeRef || pick(s, ['Ref_Tuyen', 'routeCode', 'RouteCode']) || '').trim().toUpperCase()
    const operatorRef = (notif?.operatorRef || pick(s, ['Ref_DonVi', 'operatorRef']) || '').trim()

    const routeId = routeCode ? routeIdByCode.get(routeCode) : undefined
    const operatorId = operatorRef ? opIdByFb.get(operatorRef) : undefined

    const departureTime = normalizeTime(pick(s, ['GioXuatBen', 'GioChay', 'departureTime', 'Time']))
    if (!firebaseId || !routeId || !operatorId || !departureTime) {
      skipped += 1
      continue
    }

    const direction = pick(s, ['Chieu', 'direction', 'Huong'])
    const scheduleCode = buildScheduleCode(routeCode, direction || null, departureTime, firebaseId)

    // Extra fields from BieuDoChayXeChiTiet (for UI display)
    const scheduleExtra = {
      SoThongBao: pick(s, ['SoThongBao']),
      Chieu: direction || null,
      GioXuatBen: departureTime,
      NgayHoatDong: pick(s, ['NgayHoatDong']),
      LoaiNgay: pick(s, ['LoaiNgay']),
      TrangThaiChuyen: pick(s, ['TrangThaiChuyen', 'TinhTrangChuyen']),
      GhiChu: pick(s, ['GhiChu', 'Ghi chú']),
      SoChuyen_Thang_CT: pick(s, ['SoChuyen_Thang_CT']),
      NgayHoatDongGoc: pick(s, ['NgayHoatDongGoc']),
      NgayBiNgung: pick(s, ['NgayBiNgung']),
      TrangThaiTongHop: pick(s, ['TrangThaiTongHop']),
      // Keep firebaseId/ref for tracing
      Ref_ThongBaoKhaiThac: notifId || null,
    }

    normalized.push({
      firebaseId,
      scheduleCode,
      routeId,
      operatorId,
      departureTime,
      frequencyType: 'daily',
      daysOfWeek: [],
      daysOfMonth: [],
      effectiveFrom: pick(s, ['HieuLucTu', 'effectiveFrom', 'NgayHoatDong']) || new Date().toISOString().slice(0, 10),
      effectiveTo: pick(s, ['HieuLucDen', 'effectiveTo', 'NgayBiNgung']) || null,
      direction: direction || null,
      calendarType: pick(s, ['LoaiLich', 'calendarType', 'LoaiNgay']) || null,
      notificationNumber: (pick(s, ['SoThongBao']) || notif?.notificationNumber) || null,
      tripStatus: (pick(s, ['TrangThaiChuyen', 'TinhTrangChuyen', 'tripStatus']) || null),
      isActive: true,
      source: 'appsheet',
      syncedAt: new Date(),
      metadata: {
        appsheet_row: s,
        // Keep full notice row for "văn bản" display
        notice: notifId ? (notifRows.find((x: any) => pick(x, ['ID_TB', 'id', 'Id', 'firebaseId']) === notifId) || null) : null,
        notice_meta: {
          id: notifId || null,
          routeRef: notif?.routeRef || null,
          displayText: notif?.displayText || null,
          fileUrl: notif?.notificationFileUrl || null,
          number: notif?.notificationNumber || null,
        }
        ,
        schedule_meta: scheduleExtra,
      },
    })
  }

  summary.schedules.skipped = skipped

  if (dryRun) {
    summary.schedules.upserted = normalized.length
    return
  }

  if (normalized.length === 0) return

  const result = await db
    .insert(schedules)
    .values(normalized)
    .onConflictDoUpdate({
      target: schedules.firebaseId,
      set: {
        scheduleCode: sql`excluded.schedule_code`,
        routeId: sql`excluded.route_id`,
        operatorId: sql`excluded.operator_id`,
        departureTime: sql`excluded.departure_time`,
        frequencyType: sql`excluded.frequency_type`,
        daysOfWeek: sql`excluded.days_of_week`,
        effectiveFrom: sql`excluded.effective_from`,
        effectiveTo: sql`excluded.effective_to`,
        isActive: sql`true`,
        direction: sql`excluded.direction`,
        daysOfMonth: sql`excluded.days_of_month`,
        calendarType: sql`excluded.calendar_type`,
        notificationNumber: sql`excluded.notification_number`,
        tripStatus: sql`excluded.trip_status`,
        source: sql`excluded.source`,
        syncedAt: sql`excluded.synced_at`,
        metadata: sql`COALESCE(${schedules.metadata}, '{}'::jsonb) || COALESCE(excluded.metadata, '{}'::jsonb)`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: schedules.id })

  summary.schedules.upserted = result.length
}

export async function syncRoutesSchedulesFromAppSheet(dryRun: boolean, routeCode?: string): Promise<SyncSummary> {
  const summary: SyncSummary = {
    routes: { fetched: 0, upserted: 0 },
    schedules: { fetched: 0, upserted: 0, skipped: 0 },
    errors: [],
  }

  try {
    const [routeRows, scheduleRows, notifRows] = await Promise.all([
      appsheetFind('GTVT_APPSHEET_ROUTES_ENDPOINT'),
      appsheetFind('GTVT_APPSHEET_SCHEDULES_ENDPOINT'),
      appsheetFind('GTVT_APPSHEET_NOTIFICATIONS_ENDPOINT'),
    ])
    const codeFilter = (routeCode || '').trim().toUpperCase()
    const filteredRouteRows = codeFilter
      ? (routeRows as any[]).filter((r) => {
          const fixed = pick(r, ['MaSoTuyen', 'routeCode', 'RouteCode'])?.trim().toUpperCase()
          const bus = pick(r, ['SoHieuTuyen'])?.trim().toUpperCase()
          const busCode = bus ? `BUS-${bus}` : undefined
          return fixed === codeFilter || busCode === codeFilter
        })
      : (routeRows as any[])

    // Filter schedules by joined notification route ref (Ref_Tuyen)
    const filteredNotifRows = codeFilter
      ? (notifRows as any[]).filter((n) => {
          const ref = pick(n, ['Ref_Tuyen', 'routeRef', 'RouteRef'])?.trim().toUpperCase()
          return ref === codeFilter || (codeFilter.startsWith('BUS-') && ref === codeFilter.replace(/^BUS-/, ''))
        })
      : (notifRows as any[])

    const allowedNotifIds = codeFilter
      ? new Set(filteredNotifRows.map((n) => pick(n, ['ID_TB', 'id', 'Id', 'firebaseId'])).filter(Boolean) as string[])
      : null
    const filteredScheduleRows = allowedNotifIds
      ? (scheduleRows as any[]).filter((s) => {
          const notifId = pick(s, ['Ref_ThongBaoKhaiThac', 'ThongBao', 'RefTB', 'notificationRef'])
          return !!notifId && allowedNotifIds.has(notifId)
        })
      : (scheduleRows as any[])

    await upsertRoutesFromAppSheet(filteredRouteRows, dryRun, summary)
    await upsertSchedulesFromAppSheet(filteredScheduleRows, filteredNotifRows, dryRun, summary)
  } catch (e) {
    summary.errors.push(e instanceof Error ? e.message : String(e))
  }

  return summary
}

