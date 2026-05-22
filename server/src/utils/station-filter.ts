import { db } from '../db/drizzle.js';
import { users, locations, vehicleBadges, routes as routesTable, vehicles } from '../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';
import {
  isQuanLyAllowedBadgeType,
  QUANLY_BADGE_TYPE_BUS,
} from '../constants/quanly-badge-types.js';

interface StationAllowedPlatesCacheEntry {
  data: Set<string> | null;
  timestamp: number;
}

const stationAllowedPlatesCache = new Map<string, StationAllowedPlatesCacheEntry>();
const STATION_FILTER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cloneSet(data: Set<string> | null): Set<string> | null {
  return data ? new Set(data) : null;
}

function normalizePlate(value: string): string {
  return (value || '').replace(/[.\-\s]/g, '').toUpperCase();
}

function addPlateVariants(target: Set<string>, plate: string): void {
  const raw = (plate || '').trim().toUpperCase();
  if (!raw) return;
  target.add(raw);
  target.add(normalizePlate(raw));
}

export async function getStationAllowedPlates(userId: string): Promise<Set<string> | null> {
  if (!db) return null;

  const now = Date.now();
  const cached = stationAllowedPlatesCache.get(userId);
  if (cached && (now - cached.timestamp) < STATION_FILTER_CACHE_TTL_MS) {
    return cloneSet(cached.data);
  }

  const [user] = await db
    .select({ benPhuTrach: users.benPhuTrach, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    stationAllowedPlatesCache.set(userId, { data: null, timestamp: now });
    return null;
  }
  if (!user.benPhuTrach) {
    stationAllowedPlatesCache.set(userId, { data: null, timestamp: now });
    return null;
  }

  const [location] = await db
    .select({
      name: locations.name,
      code: locations.code,
      maBen: (locations as { maBen?: string | null }).maBen,
    })
    .from(locations)
    .where(eq(locations.id, user.benPhuTrach))
    .limit(1);

  if (!location) {
    stationAllowedPlatesCache.set(userId, { data: null, timestamp: now });
    return null;
  }

  const stationName = location.name.trim();
  const stationLower = stationName.toLowerCase();
  const stationCode = ((location.maBen || location.code || '') as string).trim();

  // 1) Buýt: id_tuyen — fallback routes khi không có danh_muc_tuyen_bus
  const allowedBusRouteIds = new Set<string>();
  if (stationCode) {
    try {
      const busRouteRows = await db.execute(
        sql`SELECT id_tuyen FROM danh_muc_tuyen_bus WHERE diem_dau = ${stationCode} OR diem_cuoi = ${stationCode} OR hanh_trinh ILIKE ${'%' + stationName + '%'}`,
      );
      for (const row of busRouteRows as { id_tuyen?: string }[]) {
        const id = (row.id_tuyen || '').trim();
        if (id) allowedBusRouteIds.add(id);
      }
    } catch (error) {
      console.warn('[StationFilter] danh_muc_tuyen_bus unavailable, using routes table fallback:', error);
    }
  }

  if (allowedBusRouteIds.size === 0 && stationName) {
    const allRoutes = await db
      .select({
        routeType: routesTable.routeType,
        departureStation: routesTable.departureStation,
        firebaseId: routesTable.firebaseId,
        routeCode: routesTable.routeCode,
      })
      .from(routesTable);
    for (const route of allRoutes) {
      const rt = (route.routeType || '').toLowerCase();
      const isBus =
        rt === 'bus' || rt.includes('buýt') || rt.includes('buyt') || rt.includes('xe buýt');
      if (!isBus) continue;
      const startPoint = (route.departureStation || '').trim().toLowerCase();
      if (startPoint === stationLower) {
        const fid = (route.firebaseId || '').trim();
        const rc = (route.routeCode || '').trim();
        if (fid) allowedBusRouteIds.add(fid);
        if (rc) allowedBusRouteIds.add(rc);
      }
    }
  }

  // 2) Tuyến cố định: bến đi = tên bến
  const allowedFixedRouteCodes = new Set<string>();
  if (stationName) {
    const allRoutes = await db
      .select({
        routeCode: routesTable.routeCode,
        routeCodeOld: routesTable.routeCodeOld,
        departureStation: routesTable.departureStation,
      })
      .from(routesTable);
    for (const route of allRoutes) {
      const startPoint = (route.departureStation || '').trim().toLowerCase();
      if (startPoint === stationLower) {
        const rc = (route.routeCode || '').trim().toUpperCase();
        if (rc) allowedFixedRouteCodes.add(rc);
        const old = (route.routeCodeOld || '').trim().toUpperCase();
        if (old) allowedFixedRouteCodes.add(old);
      }
    }
  }

  // vehicles.firebase_id ↔ vehicle_badges.plate_number → biển số thật cho dispatch_records
  const linkKeyToPlate = new Map<string, string>();
  const vehicleRows = await db
    .select({ firebaseId: vehicles.firebaseId, plateNumber: vehicles.plateNumber })
    .from(vehicles);
  for (const v of vehicleRows) {
    const fid = (v.firebaseId || '').trim();
    const plate = (v.plateNumber || '').trim();
    if (!fid || !plate) continue;
    linkKeyToPlate.set(fid, plate);
    linkKeyToPlate.set(normalizePlate(fid), plate);
  }

  const allBadges = await db
    .select({
      plateNumber: vehicleBadges.plateNumber,
      badgeType: vehicleBadges.badgeType,
      tuyenBusCode: vehicleBadges.tuyenBusCode,
      routeCode: vehicleBadges.routeCode,
    })
    .from(vehicleBadges);

  const allowedPlates = new Set<string>();

  for (const b of allBadges) {
    if (!isQuanLyAllowedBadgeType(b.badgeType)) continue;

    const badgeRef = (b.plateNumber || '').trim();
    if (!badgeRef) continue;

    let matchesStation = false;
    if (b.badgeType === QUANLY_BADGE_TYPE_BUS) {
      const id = (b.tuyenBusCode || '').trim();
      matchesStation = !!id && allowedBusRouteIds.has(id);
    } else {
      const rc = (b.routeCode || '').trim().toUpperCase();
      matchesStation = !!rc && allowedFixedRouteCodes.has(rc);
    }
    if (!matchesStation) continue;

    const displayPlate =
      linkKeyToPlate.get(badgeRef) ||
      linkKeyToPlate.get(normalizePlate(badgeRef)) ||
      badgeRef;
    addPlateVariants(allowedPlates, displayPlate);
    addPlateVariants(allowedPlates, badgeRef);
  }

  console.log(
    `[StationFilter] ${stationName} (code: ${stationCode}): ${allowedBusRouteIds.size} bus routes, ${allowedFixedRouteCodes.size} fixed routes, ${allowedPlates.size} plate keys`,
  );

  stationAllowedPlatesCache.set(userId, { data: allowedPlates, timestamp: now });
  return allowedPlates;
}
