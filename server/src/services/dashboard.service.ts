/**
 * Dashboard Service
 * Business logic for dashboard data aggregation
 * Optimized: Filtered queries + caching
 * Migrated to Drizzle ORM
 */

import { db } from '../db/drizzle.js';
import { dispatchRecords, vehicles, routes, drivers, vehicleBadges } from '../db/schema/index.js';
import { desc, gte, lte, lt, or, and, isNotNull, sql, eq, inArray } from 'drizzle-orm';
import type { DispatchRecord } from '../db/schema/dispatch-records.js';
import type { Vehicle } from '../db/schema/vehicles.js';
import type { Route } from '../db/schema/routes.js';
import type { Driver } from '../db/schema/drivers.js';
import type { VehicleBadge } from '../db/schema/vehicle-badges.js';

import { getStationAllowedPlates } from '../utils/station-filter.js';

// Cache structure
interface DashboardCache {
  data: DashboardAllData | null;
  timestamp: number;
}

interface DashboardAllData {
  stats: DashboardStats;
  chartData: ChartDataPoint[];
  recentActivity: RecentActivity[];
  warnings: Warning[];
  weeklyStats: WeeklyStat[];
  monthlyStats: MonthlyStat[];
  routeBreakdown: RouteBreakdown[];
}

// Cache with 1 minute TTL (dashboard needs fresh data)
const dashboardCaches = new Map<string, DashboardCache>();
const CACHE_TTL = 60 * 1000; // 1 minute

// Helper function to get Vietnam date strings for queries
function getVietnamDateRange(): { todayStr: string; weekAgoStr: string; thirtyDaysLaterStr: string } {
  const now = new Date();
  // Convert to Vietnam time (UTC+7)
  const vietnamTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
  const year = vietnamTime.getFullYear();
  const month = String(vietnamTime.getMonth() + 1).padStart(2, '0');
  const day = String(vietnamTime.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  // 7 days ago for weekly stats
  const weekAgo = new Date(vietnamTime);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;

  // 30 days later for warnings
  const thirtyDaysLater = new Date(vietnamTime);
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const thirtyDaysLaterStr = `${thirtyDaysLater.getFullYear()}-${String(thirtyDaysLater.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysLater.getDate()).padStart(2, '0')}`;

  return { todayStr, weekAgoStr, thirtyDaysLaterStr };
}

// Helper to check if a datetime string is from today (Vietnam time)
function isToday(dateTimeStr: string | undefined, todayStr: string): boolean {
  if (!dateTimeStr) return false;
  const dateStr = dateTimeStr.split('T')[0];
  return dateStr === todayStr;
}

function shouldUseRouteCodeOld(route?: Partial<Route>): boolean {
  if (!route) return false;
  const oldCode = (route.routeCodeOld || '').trim();
  if (!oldCode) return false;
  const routeType = (route.routeType || '').trim().toLowerCase();
  const routeCode = (route.routeCode || '').trim().toUpperCase();
  return routeType === 'bus' || routeCode.startsWith('BUS-');
}

function getDisplayRouteCode(route?: Partial<Route>): string {
  if (!route) return '';
  if (shouldUseRouteCodeOld(route)) {
    return (route.routeCodeOld || '').trim();
  }
  return (route.routeCode || route.departureStation || '').trim();
}

interface DashboardStats {
  totalVehiclesToday: number;
  vehiclesInStation: number;
  vehiclesDepartedToday: number;
  revenueToday: number;
  invalidVehicles: number;
}

interface ChartDataPoint {
  hour: string;
  count: number;
}

interface RecentActivity {
  id: string;
  vehiclePlateNumber: string;
  route: string;
  entryTime: string;
  status: string;
}

interface Warning {
  type: 'vehicle' | 'driver';
  plateNumber?: string;
  name?: string;
  document: string;
  expiryDate: string;
  badgeType?: string;
}

interface WeeklyStat {
  day: string;
  dayName: string;
  departed: number;
  inStation: number;
  total: number;
}

interface MonthlyStat {
  month: string;
  monthName: string;
  departed: number;
  waiting: number;
  other: number;
}

interface RouteBreakdown {
  routeId: string;
  routeName: string;
  count: number;
  percentage: number;
}

// Raw data from database
interface RawData {
  dispatchRecords: DispatchRecord[];
  vehicles: Record<string, Vehicle>;
  routes: Record<string, Route>;
  vehicleBadges: VehicleBadge[];
  vehicleExpiryDocs: Array<{ vehicleId: string; plateNumber: string; documentType: string; expiryDate: string; badgeType?: string }>;
  drivers: Driver[];
  todayStr: string;
}

export class DashboardService {
  /**
   * Load raw data from database with OPTIMIZED filtered queries
   * Only loads data needed for dashboard (not full tables)
   */
  private async loadRawData(allowedPlates: Set<string> | null): Promise<RawData> {
    if (!db) {
      throw new Error('[Dashboard] Database not initialized');
    }

    const { todayStr, weekAgoStr, thirtyDaysLaterStr } = getVietnamDateRange();
    const startTime = Date.now();

    // Create date for SQL queries (week ago timestamp)
    const weekAgoDate = new Date(weekAgoStr + 'T00:00:00+07:00');

    // Query tables in PARALLEL with FILTERS to reduce data transfer
    const [
      dispatchRecordsData,
      vehiclesWithExpiryData,
      routesData,
      vehicleBadgesData,
      driversWithExpiryData,
    ] = await Promise.all([
      // Only dispatch records from last 7 days (for weekly stats)
      db.select().from(dispatchRecords)
        .where(gte(dispatchRecords.entryTime, weekAgoDate))
        .orderBy(desc(dispatchRecords.entryTime)),
      // Only vehicles with expiry dates in warning range (next 30 days)
      db.select({
        id: vehicles.id,
        plateNumber: vehicles.plateNumber,
        registrationExpiry: vehicles.registrationExpiry,
        insuranceExpiry: vehicles.insuranceExpiry,
        roadWorthinessExpiry: vehicles.roadWorthinessExpiry,
      }).from(vehicles).where(
        or(
          and(isNotNull(vehicles.registrationExpiry), lte(vehicles.registrationExpiry, thirtyDaysLaterStr)),
          and(isNotNull(vehicles.insuranceExpiry), lte(vehicles.insuranceExpiry, thirtyDaysLaterStr)),
          and(isNotNull(vehicles.roadWorthinessExpiry), lte(vehicles.roadWorthinessExpiry, thirtyDaysLaterStr))
        )
      ),
      // Routes are small, load all
      db.select().from(routes),
      // Only badges with expiry dates in warning range
      db.select({
        id: vehicleBadges.id,
        vehicleId: vehicleBadges.vehicleId,
        plateNumber: vehicleBadges.plateNumber,
        expiryDate: vehicleBadges.expiryDate,
        badgeType: vehicleBadges.badgeType,
      }).from(vehicleBadges).where(
        and(isNotNull(vehicleBadges.expiryDate), lte(vehicleBadges.expiryDate, thirtyDaysLaterStr))
      ),
      // Only drivers with license expiry in warning range
      db.select({
        id: drivers.id,
        fullName: drivers.fullName,
        licenseExpiryDate: drivers.licenseExpiryDate,
      }).from(drivers).where(
        and(isNotNull(drivers.licenseExpiryDate), lte(drivers.licenseExpiryDate, thirtyDaysLaterStr))
      ),
    ]);

    // Convert to lookup maps
    const vehiclesMap: Record<string, Vehicle> = {};
    vehiclesWithExpiryData.forEach((v) => { vehiclesMap[v.id] = v as Vehicle; });

    const routesMap: Record<string, Route> = {};
    routesData.forEach((r) => { routesMap[r.id] = r; });

    // Filter by allowed plates if applicable
    let filteredDispatch = dispatchRecordsData;
    let filteredVehicles = vehiclesWithExpiryData;
    let filteredBadges = vehicleBadgesData;

    if (allowedPlates !== null) {
      filteredDispatch = filteredDispatch.filter(d => d.vehiclePlateNumber && allowedPlates.has(d.vehiclePlateNumber));
      filteredVehicles = filteredVehicles.filter(v => v.plateNumber && allowedPlates.has(v.plateNumber));
      filteredBadges = filteredBadges.filter(b => b.plateNumber && allowedPlates.has(b.plateNumber));
    }

    // Flatten vehicle expiry documents
    const vehicleExpiryDocs: Array<{ vehicleId: string; plateNumber: string; documentType: string; expiryDate: string; badgeType?: string }> = [];

    for (const vehicle of filteredVehicles) {
      if (vehicle.roadWorthinessExpiry) {
        vehicleExpiryDocs.push({
          vehicleId: vehicle.id,
          plateNumber: vehicle.plateNumber,
          documentType: 'registration',
          expiryDate: vehicle.roadWorthinessExpiry,
        });
      }
      if (vehicle.insuranceExpiry) {
        vehicleExpiryDocs.push({
          vehicleId: vehicle.id,
          plateNumber: vehicle.plateNumber,
          documentType: 'insurance',
          expiryDate: vehicle.insuranceExpiry,
        });
      }
    }

    // Add vehicle badges expiry dates
    // Include badges both with and without vehicleId (use badge.plateNumber directly)
    for (const badge of filteredBadges) {
      if (badge.expiryDate) {
        // Try to get plate number from linked vehicle, fallback to badge's plate number
        const vehicle = badge.vehicleId ? vehiclesMap[badge.vehicleId] : undefined;
        const plateNumber = vehicle?.plateNumber || badge.plateNumber;

        if (plateNumber) {
          vehicleExpiryDocs.push({
            vehicleId: badge.vehicleId || badge.id,
            plateNumber,
            documentType: 'emblem',
            expiryDate: badge.expiryDate,
            badgeType: badge.badgeType || undefined,
          });
        }
      }
    }

    console.log(`[Dashboard] Loaded filtered data in ${Date.now() - startTime}ms (${filteredDispatch.length} dispatch, ${filteredVehicles.length} vehicles, ${driversWithExpiryData.length} drivers)`);

    return {
      dispatchRecords: filteredDispatch,
      vehicles: vehiclesMap,
      routes: routesMap,
      vehicleBadges: filteredBadges as VehicleBadge[],
      vehicleExpiryDocs,
      drivers: driversWithExpiryData as Driver[],
      todayStr,
    };
  }

  /**
   * Get count of invalid vehicles (expired documents)
   * Runs both COUNT queries in parallel instead of sequentially
   */
  private async getInvalidVehiclesCount(todayStr: string, allowedPlates: Set<string> | null): Promise<number> {
    if (!db) throw new Error('[Dashboard] Database not initialized');

    if (allowedPlates !== null && allowedPlates.size === 0) {
      return 0;
    }

    const vehicleConditions: any[] = [
      or(
        and(isNotNull(vehicles.registrationExpiry), lt(vehicles.registrationExpiry, todayStr)),
        and(isNotNull(vehicles.insuranceExpiry), lt(vehicles.insuranceExpiry, todayStr)),
        and(isNotNull(vehicles.roadWorthinessExpiry), lt(vehicles.roadWorthinessExpiry, todayStr))
      )
    ];
    if (allowedPlates !== null) {
      vehicleConditions.push(inArray(vehicles.plateNumber, Array.from(allowedPlates)));
    }

    const badgeConditions: any[] = [
      and(isNotNull(vehicleBadges.expiryDate), lt(vehicleBadges.expiryDate, todayStr))
    ];
    if (allowedPlates !== null) {
      badgeConditions.push(inArray(vehicleBadges.plateNumber, Array.from(allowedPlates)));
    }

    // Run both counts in PARALLEL (was sequential - saved 1 DB round-trip)
    const [vehicleCount, badgeCount] = await Promise.all([
      db.select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(vehicles)
      .where(and(...vehicleConditions)),
      db.select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(vehicleBadges)
      .where(and(...badgeConditions)),
    ]);

    return (vehicleCount[0]?.count || 0) + (badgeCount[0]?.count || 0);
  }

  /**
   * Get chart data using SQL GROUP BY hour (OPTIMIZED)
   */
  private async getChartDataSQL(allowedPlates: Set<string> | null): Promise<ChartDataPoint[]> {
    if (!db) throw new Error('[Dashboard] Database not initialized');

    const { todayStr } = getVietnamDateRange();
    const todayStart = new Date(todayStr + 'T00:00:00+07:00');
    const todayEnd = new Date(todayStr + 'T23:59:59.999+07:00');

    const conditions: any[] = [
      gte(dispatchRecords.entryTime, todayStart),
      lte(dispatchRecords.entryTime, todayEnd)
    ];

    if (allowedPlates !== null) {
      if (allowedPlates.size === 0) {
        const hours = Array.from({ length: 12 }, (_, i) => i + 6);
        return hours.map(hour => ({
          hour: hour.toString().padStart(2, '0') + ':00',
          count: 0,
        }));
      }
      conditions.push(inArray(dispatchRecords.vehiclePlateNumber, Array.from(allowedPlates)));
    }

    const result = await db.select({
      hour: sql<string>`TO_CHAR(entry_time AT TIME ZONE 'Asia/Saigon', 'HH24:00')`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(dispatchRecords)
    .where(and(...conditions))
    .groupBy(sql`TO_CHAR(entry_time AT TIME ZONE 'Asia/Saigon', 'HH24:00')`)
    .orderBy(sql`1`);

    // Fill in missing hours (6:00 to 17:00)
    const hours = Array.from({ length: 12 }, (_, i) => i + 6);
    const chartMap = new Map(result.map(r => [r.hour, r.count]));

    return hours.map(hour => {
      const hourStr = hour.toString().padStart(2, '0') + ':00';
      return {
        hour: hourStr,
        count: chartMap.get(hourStr) || 0,
      };
    });
  }

  /**
   * Calculate recent activity from raw data (no DB query)
   */
  private calculateRecentActivity(raw: RawData): RecentActivity[] {
    const { dispatchRecords, vehicles, routes, todayStr } = raw;

    return dispatchRecords
      .filter((r) => {
        if (!r.entryTime) return false;
        const entryTimeStr = r.entryTime.toISOString();
        return isToday(entryTimeStr, todayStr);
      })
      .slice(0, 10)
      .map((record) => {
        const vehicle = record.vehicleId ? vehicles[record.vehicleId] : undefined;
        const route = record.routeId ? routes[record.routeId] : undefined;
        return {
          id: record.id,
          vehiclePlateNumber: vehicle?.plateNumber || record.vehiclePlateNumber || '',
          route: getDisplayRouteCode(route),
          entryTime: record.entryTime ? record.entryTime.toISOString() : '',
          status: record.status || '',
        };
      });
  }

  /**
   * Calculate warnings from raw data (no DB query)
   */
  private calculateWarnings(raw: RawData): Warning[] {
    const { vehicleExpiryDocs, vehicles: vehiclesData, drivers, todayStr } = raw;
    // Note: vehiclesData used below for vehicle lookups
    void vehiclesData; // silence unused warning for now
    const warnings: Warning[] = [];

    // Calculate 30 days from today
    const now = new Date();
    const vietnamTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    vietnamTime.setDate(vietnamTime.getDate() + 30);
    const thirtyDaysFromNowStr = `${vietnamTime.getFullYear()}-${String(vietnamTime.getMonth() + 1).padStart(2, '0')}-${String(vietnamTime.getDate()).padStart(2, '0')}`;

    const docTypeMap: Record<string, string> = {
      registration: 'Đăng kiểm',
      inspection: 'Đăng kiểm',
      insurance: 'Bảo hiểm',
      operation_permit: 'Phù hiệu',
      emblem: 'Phù hiệu',
    };

    for (const doc of vehicleExpiryDocs) {
      if (!doc.expiryDate) continue;
      const expiryDate = doc.expiryDate.split('T')[0] || doc.expiryDate;
      if (expiryDate >= todayStr && expiryDate <= thirtyDaysFromNowStr) {
        warnings.push({
          type: 'vehicle',
          plateNumber: doc.plateNumber || '',
          document: docTypeMap[doc.documentType] || doc.documentType,
          expiryDate,
          badgeType: doc.badgeType,
        });
      }
    }

    for (const driver of drivers) {
      if (!driver.licenseExpiryDate) continue;
      const expiryDate = driver.licenseExpiryDate.split('T')[0] || driver.licenseExpiryDate;
      if (expiryDate >= todayStr && expiryDate <= thirtyDaysFromNowStr) {
        warnings.push({
          type: 'driver',
          name: driver.fullName || '',
          document: 'Bằng lái',
          expiryDate,
        });
      }
    }

    return warnings.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }

  /**
   * Get weekly stats using SQL GROUP BY date (OPTIMIZED)
   */
  private async getWeeklyStatsSQL(allowedPlates: Set<string> | null): Promise<WeeklyStat[]> {
    if (!db) throw new Error('[Dashboard] Database not initialized');

    const { weekAgoStr } = getVietnamDateRange();
    const weekAgoDate = new Date(weekAgoStr + 'T00:00:00+07:00');

    const conditions: any[] = [
      gte(dispatchRecords.entryTime, weekAgoDate)
    ];

    if (allowedPlates !== null) {
      if (allowedPlates.size === 0) {
        // Return empty week stats
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const days: { dateStr: string; dayName: string }[] = [];
    
        for (let i = 6; i >= 0; i--) {
          const now = new Date();
          const vietnamTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
          vietnamTime.setDate(vietnamTime.getDate() - i);
          const dateStr = `${vietnamTime.getFullYear()}-${String(vietnamTime.getMonth() + 1).padStart(2, '0')}-${String(vietnamTime.getDate()).padStart(2, '0')}`;
          days.push({ dateStr, dayName: dayNames[vietnamTime.getDay()] });
        }
        return days.map(({ dateStr, dayName }) => ({
          day: dateStr,
          dayName,
          departed: 0,
          inStation: 0,
          total: 0,
        }));
      }
      conditions.push(inArray(dispatchRecords.vehiclePlateNumber, Array.from(allowedPlates)));
    }

    const result = await db.select({
      day: sql<string>`DATE(entry_time AT TIME ZONE 'Asia/Saigon')::text`,
      departed: sql<number>`COUNT(*) FILTER (WHERE status = 'departed' AND exit_time IS NOT NULL)::int`,
      inStation: sql<number>`COUNT(*) FILTER (WHERE status IN ('entered', 'passengers_dropped', 'permit_issued', 'paid', 'departure_ordered') AND exit_time IS NULL)::int`,
    })
    .from(dispatchRecords)
    .where(and(...conditions))
    .groupBy(sql`DATE(entry_time AT TIME ZONE 'Asia/Saigon')`)
    .orderBy(sql`1`);

    // Fill in missing days and add day names
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const days: { dateStr: string; dayName: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const now = new Date();
      const vietnamTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
      vietnamTime.setDate(vietnamTime.getDate() - i);
      const dateStr = `${vietnamTime.getFullYear()}-${String(vietnamTime.getMonth() + 1).padStart(2, '0')}-${String(vietnamTime.getDate()).padStart(2, '0')}`;
      days.push({ dateStr, dayName: dayNames[vietnamTime.getDay()] });
    }

    const statsMap = new Map(result.map(r => [r.day, r]));

    return days.map(({ dateStr, dayName }) => {
      const stats = statsMap.get(dateStr);
      const departed = stats?.departed || 0;
      const inStation = stats?.inStation || 0;
      return {
        day: dateStr,
        dayName,
        departed,
        inStation,
        total: departed + inStation,
      };
    });
  }

  /**
   * Calculate monthly stats from raw data (no DB query)
   */
  private calculateMonthlyStats(raw: RawData): MonthlyStat[] {
    const { dispatchRecords } = raw;
    const now = new Date();
    const vietnamTime = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    const currentYear = vietnamTime.getFullYear();
    const currentMonth = vietnamTime.getMonth();
    const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

    return monthNames.slice(0, currentMonth + 1).map((monthName, index) => {
      const yearMonthPrefix = `${currentYear}-${String(index + 1).padStart(2, '0')}`;
      const monthRecords = dispatchRecords.filter((r) => {
        if (!r.entryTime) return false;
        const entryTimeStr = r.entryTime.toISOString();
        return entryTimeStr.startsWith(yearMonthPrefix);
      });
      const departed = monthRecords.filter((r) => r.status === 'departed').length;
      const waiting = monthRecords.filter((r) => ['entered', 'passengers_dropped', 'permit_issued', 'paid'].includes(r.status || '')).length;
      const other = monthRecords.length - departed - waiting;
      return { month: yearMonthPrefix, monthName, departed, waiting, other: Math.max(0, other) };
    });
  }

  /**
   * Get stats using SQL aggregation (OPTIMIZED)
   */
  private async getStatsSQL(allowedPlates: Set<string> | null): Promise<DashboardStats> {
    if (!db) throw new Error('[Dashboard] Database not initialized');

    const { todayStr } = getVietnamDateRange();
    const todayStartStr = todayStr + ' 00:00:00+07';
    const todayEndStr = todayStr + ' 23:59:59.999+07';

    const conditions: any[] = [];

    if (allowedPlates !== null) {
      if (allowedPlates.size === 0) {
        return {
          totalVehiclesToday: 0,
          vehiclesInStation: 0,
          vehiclesDepartedToday: 0,
          revenueToday: 0,
          invalidVehicles: 0,
        };
      }
      conditions.push(inArray(dispatchRecords.vehiclePlateNumber, Array.from(allowedPlates)));
    }

    let query = db.select({
      totalVehiclesToday: sql<number>`COUNT(*) FILTER (WHERE entry_time >= ${todayStartStr}::timestamptz AND entry_time <= ${todayEndStr}::timestamptz)::int`,
      vehiclesInStation: sql<number>`COUNT(*) FILTER (WHERE status IN ('entered', 'passengers_dropped', 'permit_issued', 'paid', 'departure_ordered') AND (exit_time IS NULL OR exit_time >= ${todayStartStr}::timestamptz))::int`,
      vehiclesDepartedToday: sql<number>`COUNT(*) FILTER (WHERE status = 'departed' AND exit_time >= ${todayStartStr}::timestamptz AND exit_time <= ${todayEndStr}::timestamptz)::int`,
      revenueToday: sql<number>`COALESCE(SUM(CASE WHEN status IN ('paid', 'departed') AND payment_time >= ${todayStartStr}::timestamptz AND payment_time <= ${todayEndStr}::timestamptz THEN payment_amount ELSE 0 END), 0)::numeric`,
    })
    .from(dispatchRecords);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const result = await query;

    const stats = result[0] || {
      totalVehiclesToday: 0,
      vehiclesInStation: 0,
      vehiclesDepartedToday: 0,
      revenueToday: 0,
    };

    // Get invalid vehicles count separately
    const invalidVehicles = await this.getInvalidVehiclesCount(todayStr, allowedPlates);

    return {
      totalVehiclesToday: stats.totalVehiclesToday,
      vehiclesInStation: stats.vehiclesInStation,
      vehiclesDepartedToday: stats.vehiclesDepartedToday,
      revenueToday: parseFloat(String(stats.revenueToday)) || 0,
      invalidVehicles,
    };
  }

  /**
   * Get route breakdown using SQL GROUP BY route with JOIN (OPTIMIZED)
   */
  private async getRouteBreakdownSQL(allowedPlates: Set<string> | null): Promise<RouteBreakdown[]> {
    if (!db) throw new Error('[Dashboard] Database not initialized');

    const { todayStr } = getVietnamDateRange();
    const todayStart = new Date(todayStr + 'T00:00:00+07:00');
    const todayEnd = new Date(todayStr + 'T23:59:59.999+07:00');

    const conditions: any[] = [
      gte(dispatchRecords.entryTime, todayStart),
      lte(dispatchRecords.entryTime, todayEnd)
    ];

    if (allowedPlates !== null) {
      if (allowedPlates.size === 0) return [];
      conditions.push(inArray(dispatchRecords.vehiclePlateNumber, Array.from(allowedPlates)));
    }

    // Single query: get route breakdown + total via window function (was 2 sequential queries)
    const result = await db.select({
      routeId: sql<string>`COALESCE(${dispatchRecords.routeId}::text, 'unknown')`,
      routeName: sql<string>`
        CASE
          WHEN (LOWER(COALESCE(${routes.routeType}, '')) = 'bus' OR COALESCE(${routes.routeCode}, '') ILIKE 'BUS-%')
            AND COALESCE(${routes.routeCodeOld}, '') <> ''
          THEN ${routes.routeCodeOld}
          ELSE COALESCE(${routes.routeCode}, ${routes.departureStation}, 'Khác')
        END
      `,
      count: sql<number>`COUNT(*)::int`,
      total: sql<number>`SUM(COUNT(*)) OVER()::int`,
    })
    .from(dispatchRecords)
    .leftJoin(routes, eq(dispatchRecords.routeId, routes.id))
    .where(and(...conditions))
    .groupBy(dispatchRecords.routeId, routes.routeType, routes.routeCodeOld, routes.routeCode, routes.departureStation)
    .orderBy(sql`3 DESC`)
    .limit(6);

    const total = result[0]?.total || 1;

    return result.map(r => ({
      routeId: r.routeId,
      routeName: r.routeName,
      count: r.count,
      percentage: Math.round((r.count / total) * 100),
    }));
  }

  private isRevalidating = false;

  /**
   * Get all dashboard data - OPTIMIZED: SQL aggregation + caching
   * Uses stale-while-revalidate pattern to avoid blocking requests
   */
  async getAllData(userId?: string): Promise<DashboardAllData> {
    const now = Date.now();
    const cacheKey = userId || 'global';
    const dashboardCache = dashboardCaches.get(cacheKey) || { data: null, timestamp: 0 };

    // Return cached data if valid
    if (dashboardCache.data) {
      if ((now - dashboardCache.timestamp) < CACHE_TTL) {
        console.log(`[Dashboard] Returning cached data for ${cacheKey}`);
        return dashboardCache.data;
      }
      
      // Stale-while-revalidate (up to 5 minutes stale)
      if ((now - dashboardCache.timestamp) < CACHE_TTL * 5) {
        console.log(`[Dashboard] Returning stale cached data for ${cacheKey}, revalidating in background`);
        this.revalidateCache(userId).catch(e => console.error('[Dashboard] Background revalidation error:', e));
        return dashboardCache.data;
      }
    }

    // Cache is missing or too stale, fetch synchronously
    return this.fetchAndCacheData(userId);
  }

  private async revalidateCache(userId?: string) {
    if (this.isRevalidating) return;
    this.isRevalidating = true;
    try {
      await this.fetchAndCacheData(userId);
    } finally {
      this.isRevalidating = false;
    }
  }

  private async fetchAndCacheData(userId?: string): Promise<DashboardAllData> {
    const startTime = Date.now();
    const allowedPlates = userId ? await getStationAllowedPlates(userId) : null;
    const cacheKey = userId || 'global';

    // Use SQL aggregation for stats, charts, weekly, route (OPTIMIZED)
    // Keep loadRawData for warnings and recentActivity (need full records for formatting)
    const raw = await this.loadRawData(allowedPlates);

    const [stats, chartData, weeklyStats, routeBreakdown] = await Promise.all([
      this.getStatsSQL(allowedPlates),
      this.getChartDataSQL(allowedPlates),
      this.getWeeklyStatsSQL(allowedPlates),
      this.getRouteBreakdownSQL(allowedPlates),
    ]);

    // Calculate metrics that need raw data
    const data: DashboardAllData = {
      stats,
      chartData,
      recentActivity: this.calculateRecentActivity(raw),
      warnings: this.calculateWarnings(raw),
      weeklyStats,
      monthlyStats: this.calculateMonthlyStats(raw), // Keep monthly stats (not in main dashboard view)
      routeBreakdown,
    };

    // Update cache
    dashboardCaches.set(cacheKey, { data, timestamp: Date.now() });

    console.log(`[Dashboard] Generated all data for ${cacheKey} in ${Date.now() - startTime}ms (SQL aggregation)`);
    return data;
  }

  // Individual getters for backward compatibility (use cached data)
  async getStats(userId?: string): Promise<DashboardStats> {
    const data = await this.getAllData(userId);
    return data.stats;
  }

  async getChartData(userId?: string): Promise<ChartDataPoint[]> {
    const data = await this.getAllData(userId);
    return data.chartData;
  }

  async getRecentActivity(userId?: string): Promise<RecentActivity[]> {
    const data = await this.getAllData(userId);
    return data.recentActivity;
  }

  async getWarnings(userId?: string): Promise<Warning[]> {
    const data = await this.getAllData(userId);
    return data.warnings;
  }

  async getWeeklyStats(userId?: string): Promise<WeeklyStat[]> {
    const data = await this.getAllData(userId);
    return data.weeklyStats;
  }

  async getMonthlyStats(userId?: string): Promise<MonthlyStat[]> {
    const data = await this.getAllData(userId);
    return data.monthlyStats;
  }

  async getRouteBreakdown(userId?: string): Promise<RouteBreakdown[]> {
    const data = await this.getAllData(userId);
    return data.routeBreakdown;
  }

  // Clear cache (for manual refresh)
  clearCache(userId?: string): void {
    if (userId) {
      dashboardCaches.delete(userId);
    } else {
      dashboardCaches.clear();
    }
  }
}

export const dashboardService = new DashboardService();
