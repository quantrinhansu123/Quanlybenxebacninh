/**
 * Badge AppSheet Sync Controller
 * POST /api/vehicles/badges/appsheet-sync
 * Receives normalized badge data from frontend polling, upserts to vehicle_badges table
 */
import { Request, Response } from 'express'
import { vehicleBadges } from '../../../db/schema/vehicle-badges.js'
import { operators } from '../../../db/schema/operators.js'
import { routes } from '../../../db/schema/routes.js'
import { db } from '../../../db/drizzle.js'
import { sql, inArray } from 'drizzle-orm'

const MAX_BATCH_SIZE = 25_000
const MAX_STRING_LENGTH = 255
const BATCH_CHUNK_SIZE = 1000

interface SyncBadgePayload {
  badgeNumber: string
  plateNumber: string
  badgeType?: string
  fileNumber?: string
  operatorRef?: string
  issueDate?: string
  expiryDate?: string
  status?: string
  badgeColor?: string
  issueType?: string
  routeRef?: string
  busRouteRef?: string
  routeCode?: string
  routeName?: string
  oldBadgeNumber?: string
  renewalReason?: string
  revokeDecision?: string
  revokeReason?: string
  revokeDate?: string
  notes?: string
}

/** Sanitize string: trim + truncate */
const sanitize = (val: unknown, maxLen = MAX_STRING_LENGTH): string | undefined => {
  if (typeof val !== 'string') return undefined
  const trimmed = val.trim()
  return trimmed ? trimmed.slice(0, maxLen) : undefined
}

/** Normalize plate: remove dots, dashes, spaces → uppercase */
const normPlate = (raw: string): string =>
  (raw || '').replace(/[\s.\-]/g, '').toUpperCase()

export async function syncBadgesFromAppSheet(req: Request, res: Response) {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const payload = req.body?.badges as SyncBadgePayload[] | undefined
    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ error: 'badges array required' })
    }

    if (payload.length > MAX_BATCH_SIZE) {
      return res.status(400).json({ error: `Max ${MAX_BATCH_SIZE} badges per batch` })
    }

    const validRecords: (typeof vehicleBadges.$inferInsert)[] = []
    const errors: string[] = []

    // Build operatorRef → operator.id lookup map for FK resolution
    const allOperatorRefs = [...new Set(
      payload.filter(b => b.operatorRef).map(b => b.operatorRef!)
    )]
    const operatorRefToId = new Map<string, string>()
    if (allOperatorRefs.length > 0) {
      // Query in chunks of 1000 to avoid query size limits
      for (let i = 0; i < allOperatorRefs.length; i += 1000) {
        const chunk = allOperatorRefs.slice(i, i + 1000)
        const ops = await db
          .select({ id: operators.id, firebaseId: operators.firebaseId })
          .from(operators)
          .where(inArray(operators.firebaseId, chunk))
        for (const op of ops) {
          if (op.firebaseId) operatorRefToId.set(op.firebaseId, op.id)
        }
      }
    }

    // Build route lookups for FK resolution
    // routeRef (Ref_Tuyen) → routes.route_code (fixed routes)
    // busRouteRef (Ref_TuyenBuyt) → routes.firebase_id (bus routes)
    interface RouteInfo { id: string; routeCode: string; routeName: string }
    const routeByCode = new Map<string, RouteInfo>()
    const routeByFid = new Map<string, RouteInfo>()

    const allRouteRefs = [...new Set(
      payload.filter(b => b.routeRef).map(b => b.routeRef!)
    )]
    const allBusRouteRefs = [...new Set(
      payload.filter(b => b.busRouteRef).map(b => b.busRouteRef!)
    )]

    // Fetch fixed routes by route_code
    if (allRouteRefs.length > 0) {
      for (let i = 0; i < allRouteRefs.length; i += 1000) {
        const chunk = allRouteRefs.slice(i, i + 1000)
        const found = await db
          .select({
            id: routes.id,
            routeCode: routes.routeCode,
            depStation: routes.departureStation,
            arrStation: routes.arrivalStation,
          })
          .from(routes)
          .where(inArray(routes.routeCode, chunk))
        for (const r of found) {
          const name = [r.depStation, r.arrStation].filter(Boolean).join(' - ')
          routeByCode.set(r.routeCode, { id: r.id, routeCode: r.routeCode, routeName: name })
        }
      }
    }

    // Fetch bus routes by firebase_id
    if (allBusRouteRefs.length > 0) {
      for (let i = 0; i < allBusRouteRefs.length; i += 1000) {
        const chunk = allBusRouteRefs.slice(i, i + 1000)
        const found = await db
          .select({
            id: routes.id,
            routeCode: routes.routeCode,
            firebaseId: routes.firebaseId,
            depStation: routes.departureStation,
            arrStation: routes.arrivalStation,
          })
          .from(routes)
          .where(inArray(routes.firebaseId, chunk))
        for (const r of found) {
          if (!r.firebaseId) continue
          const name = [r.depStation, r.arrStation].filter(Boolean).join(' - ')
          routeByFid.set(r.firebaseId, { id: r.id, routeCode: r.routeCode, routeName: name })
        }
      }
    }

    // Build badge_number → existing firebase_id lookup
    // ETL records have firebase_id = hex (e.g., "bcf84a2e"), NOT badgeNumber
    // Must adopt existing firebase_id to avoid duplicate inserts
    const allBadgeNumbers = [...new Set(
      payload.filter(b => b.badgeNumber).map(b => b.badgeNumber)
    )]
    const badgeNumberToFirebaseId = new Map<string, string>()
    if (allBadgeNumbers.length > 0) {
      for (let i = 0; i < allBadgeNumbers.length; i += 1000) {
        const chunk = allBadgeNumbers.slice(i, i + 1000)
        const existing = await db
          .select({ badgeNumber: vehicleBadges.badgeNumber, firebaseId: vehicleBadges.firebaseId })
          .from(vehicleBadges)
          .where(inArray(vehicleBadges.badgeNumber, chunk))
        for (const row of existing) {
          if (row.badgeNumber && row.firebaseId) {
            badgeNumberToFirebaseId.set(row.badgeNumber, row.firebaseId)
          }
        }
      }
    }

    for (const b of payload) {
      if (!b.badgeNumber || typeof b.badgeNumber !== 'string') {
        errors.push(`Missing badgeNumber`)
        continue
      }

      const plate = b.plateNumber ? normPlate(b.plateNumber) : ''

      // Build metadata JSONB with extended fields
      const metadataObj: Record<string, string> = {}
      if (b.operatorRef) metadataObj.issuing_authority_ref = b.operatorRef
      if (b.fileNumber) metadataObj.file_number = b.fileNumber
      if (b.badgeColor) metadataObj.badge_color = b.badgeColor
      if (b.issueType) metadataObj.issue_type = b.issueType
      if (b.routeRef) metadataObj.route_ref = b.routeRef
      if (b.busRouteRef) metadataObj.bus_route_ref = b.busRouteRef
      if (b.oldBadgeNumber) metadataObj.old_badge_number = b.oldBadgeNumber
      if (b.renewalReason) metadataObj.renewal_reason = b.renewalReason
      if (b.revokeDecision) metadataObj.revoke_decision = b.revokeDecision
      if (b.revokeReason) metadataObj.revoke_reason = b.revokeReason
      if (b.revokeDate) metadataObj.revoke_date = b.revokeDate
      if (b.notes) metadataObj.notes = b.notes

      // Resolve route FK: routeRef → routeByCode, busRouteRef → routeByFid
      const resolvedRoute = b.routeRef ? routeByCode.get(b.routeRef)
        : b.busRouteRef ? routeByFid.get(b.busRouteRef)
        : undefined

      validRecords.push({
        // Adopt existing firebase_id if badge already exists in DB (ETL records use hex IDs)
        // Otherwise use badgeNumber as firebaseId for new records
        firebaseId: badgeNumberToFirebaseId.get(b.badgeNumber) || sanitize(b.badgeNumber, 100) || null,
        badgeNumber: sanitize(b.badgeNumber, 50) || null,
        plateNumber: plate || '',
        badgeType: sanitize(b.badgeType, 50) || null,
        // Resolve operator FK from operatorRef → operators.firebase_id
        operatorId: b.operatorRef ? operatorRefToId.get(b.operatorRef) || null : null,
        // Resolve route FK from routeRef/busRouteRef
        routeId: resolvedRoute?.id || null,
        routeCode: resolvedRoute?.routeCode || sanitize(b.routeCode, 50) || null,
        routeName: resolvedRoute?.routeName || sanitize(b.routeName) || null,
        issueDate: sanitize(b.issueDate, 10) || null,
        expiryDate: sanitize(b.expiryDate, 10) || null,
        status: sanitize(b.status, 50) || 'active',
        metadata: metadataObj,
        source: 'appsheet',
        syncedAt: new Date(),
        isActive: true,
      })
    }

    // Batch upsert on firebaseId (badge number as unique key)
    let upserted = 0
    for (let i = 0; i < validRecords.length; i += BATCH_CHUNK_SIZE) {
      const chunk = validRecords.slice(i, i + BATCH_CHUNK_SIZE)
      try {
        await db
          .insert(vehicleBadges)
          .values(chunk)
          .onConflictDoUpdate({
            target: vehicleBadges.firebaseId,
            set: {
              badgeNumber: sql`excluded.badge_number`,
              plateNumber: sql`excluded.plate_number`,
              badgeType: sql`excluded.badge_type`,
              // Preserve existing operatorId if new one is null
              operatorId: sql`COALESCE(excluded.operator_id, ${vehicleBadges.operatorId})`,
              // Preserve existing routeId if new one is null
              routeId: sql`COALESCE(excluded.route_id, ${vehicleBadges.routeId})`,
              routeCode: sql`COALESCE(excluded.route_code, ${vehicleBadges.routeCode})`,
              routeName: sql`COALESCE(excluded.route_name, ${vehicleBadges.routeName})`,
              issueDate: sql`excluded.issue_date`,
              expiryDate: sql`excluded.expiry_date`,
              status: sql`excluded.status`,
              syncedAt: sql`excluded.synced_at`,
              source: sql`excluded.source`,
              // JSONB shallow merge: preserves existing keys
              metadata: sql`COALESCE(${vehicleBadges.metadata}, '{}'::jsonb) || excluded.metadata::jsonb`,
              updatedAt: sql`now()`,
            },
          })
        upserted += chunk.length
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Batch ${i}-${i + chunk.length}: ${msg}`)
      }
    }

    return res.json({ upserted, errors })
  } catch (error) {
    console.error('[badge-appsheet-sync] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
