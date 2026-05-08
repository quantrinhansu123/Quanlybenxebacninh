import { db } from '../db/drizzle.js'
import { routes, schedules } from '../db/schema/index.js'
import { appsheetFind } from '../services/gtvt-appsheet.client.js'
import { sql } from 'drizzle-orm'

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

async function main() {
  if (!db) throw new Error('Database not initialized')

  console.log('=== Compare AppSheet vs Supabase (routes + schedules) ===')

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

  console.log(`Routes: AppSheet=${appsheetRouteCodes.size}, DB=${dbRouteCodes.size}`)
  console.log(`  Only in AppSheet: ${onlyInAppSheetRoutes.length}`)
  console.log(`  Only in DB: ${onlyInDbRoutes.length}`)
  console.log(`  Sample only-in-AppSheet: ${onlyInAppSheetRoutes.slice(0, 10).join(', ')}`)
  console.log(`  Sample only-in-DB: ${onlyInDbRoutes.slice(0, 10).join(', ')}`)

  // Schedules compare: use (route_code, time) from AppSheet join via notification route ref
  const notifMap = new Map<string, { routeRef?: string }>()
  for (const n of notifRows as any[]) {
    const id = pick(n, ['ID_TB', 'id', 'Id', 'firebaseId'])
    if (!id) continue
    notifMap.set(id, { routeRef: pick(n, ['Ref_Tuyen', 'routeRef', 'RouteRef']) })
  }

  const appsheetSchedKeys = new Set<string>()
  for (const s of scheduleRows as any[]) {
    const notifId = pick(s, ['Ref_ThongBaoKhaiThac', 'ThongBao', 'RefTB', 'notificationRef'])
    const routeCode = (notifId ? notifMap.get(notifId)?.routeRef : undefined) || pick(s, ['Ref_Tuyen', 'routeCode', 'RouteCode'])
    const time = normalizeTime(pick(s, ['GioXuatBen', 'GioChay', 'departureTime', 'Time']))
    if (!routeCode || !time) continue
    appsheetSchedKeys.add(`${routeCode.trim().toUpperCase()}|${time}`)
  }

  const dbSchedRows = await db.execute(
    // eslint-disable-next-line drizzle/enforce-query-usage
    sql`SELECT r.route_code as route_code, s.departure_time as departure_time FROM schedules s JOIN routes r ON r.id = s.route_id`,
  )
  const dbSchedKeys = new Set(
    (dbSchedRows as any[]).map((x) => `${String(x.route_code || '').trim().toUpperCase()}|${String(x.departure_time || '').slice(0, 5)}`),
  )

  const onlyInAppSheetSched = [...appsheetSchedKeys].filter((k) => !dbSchedKeys.has(k))
  const onlyInDbSched = [...dbSchedKeys].filter((k) => !appsheetSchedKeys.has(k))

  console.log(`Schedules(keys route|time): AppSheet=${appsheetSchedKeys.size}, DB=${dbSchedKeys.size}`)
  console.log(`  Only in AppSheet: ${onlyInAppSheetSched.length}`)
  console.log(`  Only in DB: ${onlyInDbSched.length}`)
  console.log(`  Sample only-in-AppSheet: ${onlyInAppSheetSched.slice(0, 10).join(', ')}`)
  console.log(`  Sample only-in-DB: ${onlyInDbSched.slice(0, 10).join(', ')}`)

  console.log('=== Done ===')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

