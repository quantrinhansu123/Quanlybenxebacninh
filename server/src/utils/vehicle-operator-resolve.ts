/**
 * Resolve đơn vị vận tải từ phù hiệu (sau migration 023 — vehicles không còn operator_id).
 * Link: vehicles.firebase_id ↔ vehicle_badges.plate_number
 */
import { db } from '../db/drizzle.js'
import { vehicleBadges } from '../db/schema/vehicle-badges.js'
import { operators } from '../db/schema/operators.js'
import { eq } from 'drizzle-orm'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function normalizeVehicleLinkKey(value: string): string {
  return (value || '').replace(/[.\-\s]/g, '').toUpperCase()
}

export async function resolveOperatorForVehicle(vehicle: {
  firebaseId?: string | null
  plateNumber?: string | null
}): Promise<{
  operatorId: string | null
  operatorName: string | null
  operatorCode: string | null
}> {
  if (!db) {
    return { operatorId: null, operatorName: null, operatorCode: null }
  }

  const fid = (vehicle.firebaseId || '').trim()
  const plate = (vehicle.plateNumber || '').trim()
  const lookupKeys = [...new Set([fid, plate, normalizeVehicleLinkKey(fid), normalizeVehicleLinkKey(plate)].filter(Boolean))]

  let badge: { operatorId: string | null; refDonViCapPhuHieu: string | null } | undefined
  for (const key of lookupKeys) {
    const rows = await db
      .select({
        operatorId: vehicleBadges.operatorId,
        refDonViCapPhuHieu: vehicleBadges.refDonViCapPhuHieu,
      })
      .from(vehicleBadges)
      .where(eq(vehicleBadges.plateNumber, key))
      .limit(1)
    if (rows[0]) {
      badge = rows[0]
      break
    }
  }

  const opRef = (badge?.operatorId || badge?.refDonViCapPhuHieu || '').trim()
  if (!opRef) {
    return { operatorId: null, operatorName: null, operatorCode: null }
  }

  // badge.operator_id thường là firebase_id (8 hex), không phải uuid — không so sánh operators.id
  const operatorCondition = UUID_REGEX.test(opRef)
    ? eq(operators.id, opRef)
    : eq(operators.firebaseId, opRef)

  const [op] = await db
    .select({
      id: operators.id,
      name: operators.name,
      code: operators.code,
    })
    .from(operators)
    .where(operatorCondition)
    .limit(1)

  if (!op) {
    return { operatorId: null, operatorName: null, operatorCode: null }
  }

  return {
    operatorId: op.id,
    operatorName: op.name,
    operatorCode: op.code,
  }
}
