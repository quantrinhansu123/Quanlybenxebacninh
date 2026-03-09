/**
 * Vehicle Service
 * Business logic layer for Vehicle entity with legacy/badge support
 */

import { VehicleAPI } from '../../../shared/mappers/entity-mappers.js';
import { AlreadyExistsError, ValidationError } from '../../../shared/errors/app-error.js';
import { vehicleRepository, VehicleRepository } from '../repositories/vehicle.repository.js';
import { vehicleCacheService, LegacyVehicleData, BadgeVehicleData } from './vehicle-cache.service.js';
import { db } from '../../../db/drizzle.js';
import { vehicleDocuments, vehicleBadges, operators } from '../../../db/schema/index.js';
import { eq, desc } from 'drizzle-orm';

export interface CreateVehicleDTO {
  plateNumber: string;
  vehicleTypeId?: string;
  operatorId?: string;
  seatCapacity: number;
  bedCapacity?: number;
  chassisNumber?: string;
  engineNumber?: string;
  imageUrl?: string;
  insuranceExpiryDate?: string;
  inspectionExpiryDate?: string;
  cargoLength?: number;
  cargoWidth?: number;
  cargoHeight?: number;
  gpsProvider?: string;
  gpsUsername?: string;
  gpsPassword?: string;
  province?: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateVehicleDTO extends Partial<CreateVehicleDTO> {}

export interface VehicleFilters {
  operatorId?: string;
  isActive?: boolean | 'all';
  includeLegacy?: boolean;
}

export type CombinedVehicle = VehicleAPI | LegacyVehicleData | BadgeVehicleData;

export class VehicleService {
  constructor(private repository: VehicleRepository) {}

  async getAll(filters?: VehicleFilters): Promise<CombinedVehicle[]> {
    const { operatorId, isActive, includeLegacy = true } = filters || {};
    const isLegacyOperator = operatorId?.startsWith('legacy_');

    // For legacy operators, skip DB queries
    let dbVehicles: VehicleAPI[] = [];
    if (!isLegacyOperator) {
      dbVehicles = await this.getDbVehicles(operatorId, isActive);
    }

    // Build plate set for deduplication (normalize: remove dots, dashes, spaces, uppercase)
    const normalizeplate = (plate: string) => plate.replace(/[.\-\s]/g, '').toUpperCase();
    const existingPlates = new Set(dbVehicles.map((v) => normalizeplate(v.plateNumber)));

    // Merge with legacy/badge if needed
    let result: CombinedVehicle[] = [...dbVehicles];

    if (includeLegacy && (!operatorId || isLegacyOperator)) {
      // Add badge vehicles FIRST (they have phù hiệu - more authoritative)
      if (!isLegacyOperator) {
        const badgeVehicles = await this.getBadgeVehicles(existingPlates);
        result = [...result, ...badgeVehicles];
      }

      // Then add legacy vehicles (dedup against badge plates too)
      const legacyVehicles = await this.getLegacyVehicles(operatorId, isLegacyOperator ?? false, existingPlates);
      result = [...result, ...legacyVehicles];
    }

    // Sort by plate number for consistent display
    result.sort((a, b) => a.plateNumber.localeCompare(b.plateNumber));

    return result;
  }

  private async getDbVehicles(operatorId?: string, isActive?: boolean | 'all'): Promise<VehicleAPI[]> {
    let vehicles = await this.repository.findAllWithRelations();

    // Filter out test/invalid vehicles (plate number should be 7-10 chars with proper format)
    vehicles = vehicles.filter((v) => {
      const plate = v.plateNumber?.trim();
      if (!plate) return false;
      // Valid Vietnamese plate: 2 digits + letter(s) + dash/hyphen + 4-5 digits (e.g., 98H-02514, 29A-12345)
      // or old format without dash
      const isValidFormat = /^\d{2}[A-Z]{1,2}[-.]?\d{4,5}$/.test(plate.toUpperCase());
      return isValidFormat;
    });

    if (operatorId) {
      const byFK = vehicles.filter((v) => v.operatorId === operatorId);
      if (byFK.length > 0) {
        vehicles = byFK;
      } else if (db) {
        // Fallback: some vehicles have operatorName set but operator_id FK is NULL
        // Lookup operator name and match by denormalized operatorName field
        const operatorRows = await db.select({ name: operators.name })
          .from(operators)
          .where(eq(operators.id, operatorId))
          .limit(1);
        if (operatorRows.length > 0) {
          const normalizedName = operatorRows[0].name.trim().toUpperCase();
          vehicles = vehicles.filter((v) =>
            v.operatorName?.trim().toUpperCase() === normalizedName
          );
        } else {
          vehicles = [];
        }
      } else {
        vehicles = [];
      }
    }

    if (isActive !== 'all' && isActive !== undefined) {
      vehicles = vehicles.filter((v) => v.isActive === isActive);
    } else if (isActive === undefined) {
      // Default: only active vehicles
      vehicles = vehicles.filter((v) => v.isActive === true);
    }

    return vehicles;
  }

  private async getLegacyVehicles(
    operatorId: string | undefined,
    isLegacyOperator: boolean,
    existingPlates: Set<string>
  ): Promise<LegacyVehicleData[]> {
    const legacyVehicles = await vehicleCacheService.getLegacyVehicles();
    const result: LegacyVehicleData[] = [];
    const normalizePlate = (plate: string) => plate.replace(/[.\-\s]/g, '').toUpperCase();

    if (isLegacyOperator && operatorId) {
      const operatorName = await vehicleCacheService.getLegacyOperatorName(operatorId);
      if (operatorName) {
        const filtered = vehicleCacheService.filterLegacyByOperator(legacyVehicles, operatorName);
        for (const v of filtered) {
          const plate = normalizePlate(v.plateNumber);
          if (!existingPlates.has(plate)) {
            result.push(v);
            existingPlates.add(plate);
          }
        }
      }
    } else {
      for (const v of legacyVehicles) {
        const plate = normalizePlate(v.plateNumber);
        if (!existingPlates.has(plate)) {
          result.push(v);
          existingPlates.add(plate);
        }
      }
    }

    return result;
  }

  private async getBadgeVehicles(existingPlates: Set<string>): Promise<BadgeVehicleData[]> {
    const badgeVehicles = await vehicleCacheService.getBadgeVehicles();
    const result: BadgeVehicleData[] = [];
    const normalizePlate = (plate: string) => plate.replace(/[.\-\s]/g, '').toUpperCase();

    for (const v of badgeVehicles) {
      const plate = normalizePlate(v.plateNumber);
      if (!existingPlates.has(plate)) {
        result.push(v);
        existingPlates.add(plate);
      }
    }

    return result;
  }

  async getById(id: string): Promise<CombinedVehicle> {
    // Handle legacy vehicles
    if (id.startsWith('legacy_')) {
      const key = id.replace('legacy_', '');
      const vehicle = await vehicleCacheService.getLegacyVehicleById(key);
      if (!vehicle) {
        throw new ValidationError('Legacy vehicle not found');
      }
      return vehicle;
    }

    // Handle badge vehicles
    if (id.startsWith('badge_')) {
      const key = id.replace('badge_', '');
      const vehicle = await vehicleCacheService.getBadgeVehicleById(key);
      if (!vehicle) {
        throw new ValidationError('Badge vehicle not found');
      }
      return vehicle;
    }

    // Normal vehicle
    const vehicle = await this.repository.findByIdWithRelations(id);
    if (!vehicle) {
      throw new ValidationError(`Vehicle with ID '${id}' not found`);
    }

    // Load documents + badges
    if (db) {
      const docsMap: Record<string, any> = {};
      const today = new Date().toISOString().split('T')[0];

      // Load vehicle_documents
      const docs = await db.select().from(vehicleDocuments).where(eq(vehicleDocuments.vehicleId, id));
      docs.forEach((doc: any) => {
        docsMap[doc.documentType] = {
          number: doc.documentNumber,
          issueDate: doc.issueDate,
          expiryDate: doc.expiryDate,
          issuingAuthority: doc.issuingAuthority,
          documentUrl: doc.documentUrl,
          notes: doc.notes,
          isValid: doc.expiryDate >= today,
        };
      });

      // Load badges (phù hiệu) from vehicle_badges → map to operation_permit
      const badges = await db.select().from(vehicleBadges)
        .where(eq(vehicleBadges.vehicleId, id))
        .orderBy(desc(vehicleBadges.expiryDate));
      if (badges.length > 0) {
        const latestBadge = badges[0];
        const allRoutes = badges
          .map(b => `${b.badgeNumber || ''} (${b.routeCode || ''})`.trim())
          .filter(Boolean)
          .join(', ');
        docsMap['operation_permit'] = {
          number: latestBadge.badgeNumber,
          issueDate: latestBadge.issueDate,
          expiryDate: latestBadge.expiryDate,
          notes: badges.length > 1 ? `${badges.length} phù hiệu: ${allRoutes}` : (latestBadge.routeCode ? `Tuyến: ${latestBadge.routeCode}` : undefined),
          isValid: latestBadge.expiryDate ? latestBadge.expiryDate >= today : false,
        };
      }

      if (Object.keys(docsMap).length > 0) {
        vehicle.documents = docsMap;
      }
    }

    return vehicle;
  }

  async create(data: CreateVehicleDTO): Promise<VehicleAPI> {
    if (!data.plateNumber?.trim()) {
      throw new ValidationError('Plate number is required');
    }
    if (data.seatCapacity === undefined || data.seatCapacity < 0) {
      throw new ValidationError('Valid seat capacity is required');
    }

    const plateExists = await this.repository.plateNumberExists(data.plateNumber);
    if (plateExists) {
      throw new AlreadyExistsError('Vehicle', 'plateNumber', data.plateNumber);
    }

    return this.repository.createFromAPI({
      ...data,
      isActive: data.isActive ?? true,
    });
  }

  async update(id: string, data: UpdateVehicleDTO): Promise<VehicleAPI> {
    await this.getById(id);

    if (data.plateNumber) {
      const plateExists = await this.repository.plateNumberExists(data.plateNumber, id);
      if (plateExists) {
        throw new AlreadyExistsError('Vehicle', 'plateNumber', data.plateNumber);
      }
    }

    await this.repository.updateById(id, data);
    const vehicle = await this.repository.findByIdWithRelations(id);
    if (!vehicle) {
      throw new ValidationError('Vehicle not found after update');
    }
    return vehicle;
  }

  async delete(id: string): Promise<void> {
    await this.repository.deleteById(id);
  }

  async toggleActive(id: string): Promise<VehicleAPI> {
    const vehicle = await this.getById(id);
    if ('source' in vehicle) {
      throw new ValidationError('Cannot toggle active status of legacy/badge vehicles');
    }
    await this.repository.updateById(id, { isActive: !vehicle.isActive });
    const updated = await this.repository.findByIdWithRelations(id);
    if (!updated) {
      throw new ValidationError('Vehicle not found after update');
    }
    return updated;
  }

  async getByOperator(operatorId: string): Promise<VehicleAPI[]> {
    return this.repository.findByOperatorId(operatorId);
  }
}

export const vehicleService = new VehicleService(vehicleRepository);
