import { db } from '../db/drizzle.js';
import { users, locations, vehicleBadges, routes as routesTable } from '../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';

export async function getStationAllowedPlates(userId: string): Promise<Set<string> | null> {
  if (!db) return null;

  // Returns null if no user or no station filter applies. Returns Set of allowed plate numbers if filter applies.
  const [user] = await db
    .select({ benPhuTrach: users.benPhuTrach, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;
  if (user.role === 'admin') return null;
  if (!user.benPhuTrach) return null;

  const [location] = await db
    .select({
      name: locations.name,
      code: locations.code,
      maBen: (locations as any).maBen,
    })
    .from(locations)
    .where(eq(locations.id, user.benPhuTrach))
    .limit(1);

  if (!location) return null;

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
    const normalizePlate = (p: string) => (p || '').replace(/[.\-\s]/g, '').toUpperCase();
    const plate = normalizePlate(b.plateNumber || '');
    if (!plate) continue;

    if (b.badgeType === 'Buýt') {
      const id = (b.tuyenBusCode || '').trim();
      if (id && allowedBusRouteIds.has(id)) {
        allowedPlates.add(plate);
      }
    } else if (b.badgeType === 'Tuyến cố định') {
      const rc = (b.routeCode || '').trim().toUpperCase();
      if (rc && allowedFixedRouteCodes.has(rc)) {
        allowedPlates.add(plate);
      }
    } else {
      // Other badge types: allow
      allowedPlates.add(plate);
    }
  }

  return allowedPlates;
}
