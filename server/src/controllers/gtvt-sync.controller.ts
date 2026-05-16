import type { Request, Response } from 'express'
import { syncRoutesSchedulesFromAppSheet, importSchedulesFromAppSheet as importSchedulesFromAppSheetService } from '../services/gtvt-sync.service.js'
import { db } from '../db/drizzle.js'
import { routes, operators } from '../db/schema/index.js'
import { appsheetFind } from '../services/gtvt-appsheet.client.js'
import { inArray, sql } from 'drizzle-orm'

let lastSync: { at: string; summary: any } | null = null

function pick(row: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row?.[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

function normalizeTime(v: any): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  const hh = m[1]!.padStart(2, '0')
  const mm = m[2]!
  return `${hh}:${mm}`
}

export const syncRoutesSchedules = async (req: Request, res: Response) => {
  const dryRun = !!req.body?.dryRun
  const routeCode = typeof req.body?.routeCode === 'string' ? req.body.routeCode : undefined
  const summary = await syncRoutesSchedulesFromAppSheet(dryRun, routeCode)
  if (!dryRun) {
    lastSync = { at: new Date().toISOString(), summary }
  }
  return res.json({ dryRun, ...summary })
}

export const importSchedulesFromAppSheet = async (req: Request, res: Response) => {
  const dryRun = !!req.body?.dryRun
  const routeCode = typeof req.body?.routeCode === 'string' ? req.body.routeCode : undefined
  const summary = await importSchedulesFromAppSheetService(dryRun, routeCode)
  if (!dryRun) {
    lastSync = { at: new Date().toISOString(), summary }
  }
  return res.json({ dryRun, ...summary })
}

export const compareAppSheetSupabase = async (req: Request, res: Response) => {
  try {
    if (!db) return res.status(500).json({ error: 'Database not initialized' })
    const limitRaw = typeof req.query.limit === 'string' ? req.query.limit : undefined
    const limit = Math.max(20, Math.min(2000, Number(limitRaw || 200)))

    const [routeRows, scheduleRows, notifRows] = await Promise.all([
      appsheetFind('GTVT_APPSHEET_ROUTES_ENDPOINT'),
      appsheetFind('GTVT_APPSHEET_SCHEDULES_ENDPOINT'),
      appsheetFind('GTVT_APPSHEET_NOTIFICATIONS_ENDPOINT'),
    ])

  const appsheetRouteCodes = new Set(
    (routeRows as any[])
      .map((r) => (pick(r, ['MaSoTuyen', 'routeCode', 'RouteCode', 'SoHieuTuyen']) || '').trim().toUpperCase())
      .filter(Boolean),
  )
  const dbRoutes = await db.select({ routeCode: routes.routeCode }).from(routes)
  const dbRouteCodes = new Set(dbRoutes.map((r) => (r.routeCode || '').trim().toUpperCase()).filter(Boolean))

  const onlyInAppSheetRoutes = [...appsheetRouteCodes].filter((c) => !dbRouteCodes.has(c))
  const onlyInDbRoutes = [...dbRouteCodes].filter((c) => !appsheetRouteCodes.has(c))

  const notifMap = new Map<string, { routeRef?: string; operatorRef?: string }>()
  for (const n of notifRows as any[]) {
    const id = pick(n, ['ID_TB', 'id', 'Id', 'firebaseId'])
    if (!id) continue
    notifMap.set(id, {
      routeRef: pick(n, ['Ref_Tuyen', 'routeRef', 'RouteRef']),
      operatorRef: pick(n, ['Ref_DonVi', 'operatorRef', 'OperatorRef']),
    })
  }

  const appsheetSchedKeys = new Set<string>()
  const appsheetOperatorRefs = new Set<string>()
  for (const s of scheduleRows as any[]) {
    const notifId = pick(s, ['Ref_ThongBaoKhaiThac', 'ThongBao', 'RefTB', 'notificationRef'])
    const notif = notifId ? notifMap.get(notifId) : undefined
    const routeCode = (notif?.routeRef || pick(s, ['Ref_Tuyen', 'routeCode', 'RouteCode']) || '').trim().toUpperCase()
    const time = normalizeTime(pick(s, ['GioXuatBen', 'GioChay', 'departureTime', 'Time']))
    if (notif?.operatorRef) appsheetOperatorRefs.add(notif.operatorRef.trim())
    if (!routeCode || !time) continue
    appsheetSchedKeys.add(`${routeCode}|${time}`)
  }

  const dbSchedRows = await db.execute(
    // eslint-disable-next-line drizzle/enforce-query-usage
    sql`SELECT r.route_code as route_code, s."GioXuatBen" as departure_time FROM schedules s JOIN routes r ON r.id = s.route_id`,
  )
  const dbSchedKeys = new Set(
    (dbSchedRows as any[]).map((x) => `${String(x.route_code || '').trim().toUpperCase()}|${String(x.departure_time || '').slice(0, 5)}`),
  )

  const onlyInAppSheetSchedules = [...appsheetSchedKeys].filter((k) => !dbSchedKeys.has(k))
  const onlyInDbSchedules = [...dbSchedKeys].filter((k) => !appsheetSchedKeys.has(k))

  // Operator ref coverage (helps debug schedule upsert skip)
  const operatorRefs = Array.from(appsheetOperatorRefs)
  const ops = operatorRefs.length
    ? await db.select({ id: operators.id, firebaseId: operators.firebaseId }).from(operators).where(inArray(operators.firebaseId, operatorRefs))
    : []
  const missingOperatorRefs = operatorRefs.filter((ref) => !ops.some((o) => (o.firebaseId || '').trim() === ref))

    return res.json({
      routes: {
        appsheet: appsheetRouteCodes.size,
        supabase: dbRouteCodes.size,
        onlyInAppSheet: { count: onlyInAppSheetRoutes.length, items: onlyInAppSheetRoutes.slice(0, limit) },
        onlyInSupabase: { count: onlyInDbRoutes.length, items: onlyInDbRoutes.slice(0, limit) },
      },
      schedules: {
        appsheet: appsheetSchedKeys.size,
        supabase: dbSchedKeys.size,
        onlyInAppSheet: { count: onlyInAppSheetSchedules.length, items: onlyInAppSheetSchedules.slice(0, limit) },
        onlyInSupabase: { count: onlyInDbSchedules.length, items: onlyInDbSchedules.slice(0, limit) },
      },
      operatorRefs: {
        totalInNotices: operatorRefs.length,
        missingInSupabase: { count: missingOperatorRefs.length, items: missingOperatorRefs.slice(0, limit) },
      },
      limit,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[GTVT] compare failed:', msg)
    return res.status(502).json({ error: msg })
  }
}

export const getLastSync = async (_req: Request, res: Response) => {
  return res.json(lastSync || { at: null, summary: null })
}

export const getContractStatus = async (_req: Request, res: Response) => {
  // Placeholder: contract checks were removed in this codebase.
  return res.json({ ok: true })
}

