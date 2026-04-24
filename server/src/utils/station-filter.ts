import { db } from '../db/drizzle.js';
import { users, locations, vehicleBadges, routes as routesTable } from '../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';

interface StationAllowedPlatesCacheEntry {
  data: Set<string> | null;
  timestamp: number;
}

const stationAllowedPlatesCache = new Map<string, StationAllowedPlatesCacheEntry>();
const STATION_FILTER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cloneSet(data: Set<string> | null): Set<string> | null {
  return data ? new Set(data) : null;
}

export async function getStationAllowedPlates(userId: string): Promise<Set<string> | null> {
  if (!db) return null;

  const now = Date.now();
  const cached = stationAllowedPlatesCache.get(userId);
  if (cached && (now - cached.timestamp) < STATION_FILTER_CACHE_TTL_MS) {
    return cloneSet(cached.data);
  }

  // Returns null if no user or no station filter applies. Returns Set of allowed plate numbers if filter applies.
  const [user] = await db
    .select({ benPhuTrach: users.benPhuTrach, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    stationAllowedPlatesCache.set(userId, { data: null, timestamp: now });
    return null;
  }
  // If user is assigned to a specific station, always scope data to that station.
  // This applies to every role, including admin accounts tied to a station.
  if (!user.benPhuTrach) {
    stationAllowedPlatesCache.set(userId, { data: null, timestamp: now });
    return null;
  }

  const [location] = await db
    .select({
      name: locations.name,
      code: locations.code,
      maBen: (locations as any).maBen,
    })
    .from(locations)
    .where(eq(locations.id, user.benPhuTrach))
    .limit(1);

  if (!location) {
    stationAllowedPlatesCache.set(userId, { data: null, timestamp: now });
    return null;
  }

  const stationName = location.name.trim();
  const rawMaBen = (location as any).maBen as string | null | undefined;
  const stationCode = (rawMaBen || location.code || '').trim();

  // 1) Buýt: allowed id_tuyen
  const allowedBusRouteIds = new Set<string>();
  if (stationCode) {
    try {
      const busRouteRows = await db.execute(
        sql`SELECT id_tuyen FROM danh_muc_tuyen_bus WHERE diem_dau = ${stationCode} OR diem_cuoi = ${stationCode} OR hanh_trinh ILIKE ${'%' + stationName + '%'}`
      );
      for (const row of busRouteRows as any[]) {
        const id = (row.id_tuyen || '').trim();
        if (id) allowedBusRouteIds.add(id);
      }
    } catch (error) {
      console.error('[StationFilter] Failed to load Buýt route ids:', error);
    }
  }

  // 2) Tuyến cố định: allowed route codes
  const allowedFixedRouteCodes = new Set<string>();
  if (stationName) {
    const stationLower = stationName.trim().toLowerCase();
    const allRoutes = await db.select().from(routesTable);
    for (const route of allRoutes) {
      const startPoint = (route.departureStation || '').trim().toLowerCase();
      const endPoint = (route.arrivalStation || '').trim().toLowerCase();
      const itinerary = (route.itinerary || '').trim().toLowerCase();
      if (startPoint === stationLower || endPoint === stationLower || itinerary.includes(stationLower)) {
        const rc = (route.routeCode || '').trim().toUpperCase();
        if (rc) allowedFixedRouteCodes.add(rc);
      }
    }
  }

  // 3) Filter badges
  const allBadges = await db.select({
    plateNumber: vehicleBadges.plateNumber,
    badgeType: vehicleBadges.badgeType,
    tuyenBusCode: vehicleBadges.tuyenBusCode,
    routeCode: vehicleBadges.routeCode,
  }).from(vehicleBadges);

  const allowedPlates = new Set<string>();

  for (const b of allBadges) {
    const rawPlate = (b.plateNumber || '').trim().toUpperCase();
    const normalizedPlate = rawPlate.replace(/[.\-\s]/g, '');
    if (!rawPlate) continue;

    if (b.badgeType === 'Buýt') {
      const id = (b.tuyenBusCode || '').trim();
      if (id && allowedBusRouteIds.has(id)) {
        allowedPlates.add(rawPlate);
        allowedPlates.add(normalizedPlate);
      }
    } else if (b.badgeType === 'Tuyến cố định') {
      const rc = (b.routeCode || '').trim().toUpperCase();
      if (rc && allowedFixedRouteCodes.has(rc)) {
        allowedPlates.add(rawPlate);
        allowedPlates.add(normalizedPlate);
      }
    }
  }

  stationAllowedPlatesCache.set(userId, { data: new Set(allowedPlates), timestamp: now });
  return allowedPlates;
}
