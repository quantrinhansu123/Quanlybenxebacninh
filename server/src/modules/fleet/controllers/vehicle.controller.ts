/**
 * Vehicle Controller
 * Handles HTTP requests for vehicle operations
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../../../middleware/auth.js';
import { db } from '../../../db/drizzle.js';
import { vehicles, vehicleDocuments, operators, vehicleTypes, auditLogs, users, vehicleBadges, dispatchRecords } from '../../../db/schema/index.js';
import { eq, and, inArray, desc, or } from 'drizzle-orm';
import { syncVehicleChanges } from '../../../utils/denormalization-sync.js';
import { validateCreateVehicle, validateUpdateVehicle } from '../fleet-validation.js';
import { mapVehicleToAPI, mapAuditLogToAPI } from '../fleet-mappers.js';
import { vehicleService } from '../services/vehicle.service.js';
import { vehicleCacheService } from '../services/vehicle-cache.service.js';
import type { VehicleDocumentDB, DocumentType } from '../fleet-types.js';

const DOCUMENT_TYPES: DocumentType[] = ['registration', 'inspection', 'insurance', 'operation_permit', 'emblem'];

// ========== Document Helpers ==========

async function fetchVehicleDocuments(vehicleId: string): Promise<VehicleDocumentDB[]> {
  if (!db) throw new Error('Database not initialized')
  const docs = await db.select().from(vehicleDocuments).where(eq(vehicleDocuments.vehicleId, vehicleId));
  return docs as unknown as VehicleDocumentDB[];
}

async function upsertDocuments(
  vehicleId: string,
  documents: Record<string, { number: string; issueDate: string; expiryDate: string; issuingAuthority?: string; documentUrl?: string; notes?: string }>,
  userId?: string
): Promise<void> {
  if (!db) throw new Error('Database not initialized')

  for (const type of DOCUMENT_TYPES) {
    const doc = documents[type];
    if (!doc) continue;

    const [existingDoc] = await db
      .select({ id: vehicleDocuments.id })
      .from(vehicleDocuments)
      .where(and(
        eq(vehicleDocuments.vehicleId, vehicleId),
        eq(vehicleDocuments.documentType, type)
      ));

    const docData = {
      documentNumber: doc.number,
      issueDate: doc.issueDate,
      expiryDate: doc.expiryDate,
      issuingAuthority: doc.issuingAuthority || null,
      documentUrl: doc.documentUrl || null,
      notes: doc.notes || null,
    };

    if (existingDoc) {
      await db
        .update(vehicleDocuments)
        .set({ ...docData, updatedBy: userId || null, updatedAt: new Date() })
        .where(eq(vehicleDocuments.id, existingDoc.id));
    } else {
      await db
        .insert(vehicleDocuments)
        .values({ vehicleId: vehicleId, documentType: type, ...docData, updatedBy: userId || null });
    }
  }
}

// ========== Controller Handlers ==========

export const getAllVehicles = async (req: Request, res: Response) => {
  try {
    const { operatorId, isActive, includeLegacy } = req.query;
    const vehicles = await vehicleService.getAll({
      operatorId: operatorId as string | undefined,
      isActive: isActive === 'all' ? 'all' : isActive === 'false' ? false : undefined,
      includeLegacy: includeLegacy !== 'false',
    });
    return res.json(vehicles);
  } catch (error: unknown) {
    const err = error as { message?: string };
    return res.status(500).json({ error: err.message || 'Failed to fetch vehicles' });
  }
};

export const getVehicleById = async (req: Request, res: Response) => {
  try {
    const vehicle = await vehicleService.getById(req.params.id);
    return res.json(vehicle);
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'Failed to fetch vehicle' });
  }
};

export const createVehicle = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const validated = validateCreateVehicle(req.body);

    const [vehicle] = await db
      .insert(vehicles)
      .values({
        plateNumber: validated.plateNumber,
        vehicleTypeId: validated.vehicleTypeId || null,
        operatorId: validated.operatorId || null,
        seatCount: validated.seatCapacity,
        bedCapacity: validated.bedCapacity || 0,
        chassisNumber: validated.chassisNumber || null,
        engineNumber: validated.engineNumber || null,
        imageUrl: validated.imageUrl || null,
        insuranceExpiry: validated.insuranceExpiryDate || null,
        roadWorthinessExpiry: validated.inspectionExpiryDate || null,
        cargoLength: validated.cargoLength || null,
        cargoWidth: validated.cargoWidth || null,
        cargoHeight: validated.cargoHeight || null,
        gpsProvider: validated.gpsProvider || null,
        gpsUsername: validated.gpsUsername || null,
        gpsPassword: validated.gpsPassword || null,
        province: validated.province || null,
        notes: validated.notes || null,
        isActive: true,
      })
      .returning();

    // Fetch relations in parallel
    const [operator, vehicleType] = await Promise.all([
      vehicle.operatorId
        ? db.select({ id: operators.id, name: operators.name, code: operators.code })
            .from(operators)
            .where(eq(operators.id, vehicle.operatorId))
            .then(r => r[0] || null)
        : Promise.resolve(null),
      vehicle.vehicleTypeId
        ? db.select({ id: vehicleTypes.id, name: vehicleTypes.name })
            .from(vehicleTypes)
            .where(eq(vehicleTypes.id, vehicle.vehicleTypeId))
            .then(r => r[0] || null)
        : Promise.resolve(null)
    ]);

    if (validated.documents) {
      await upsertDocuments(vehicle.id, validated.documents as Record<string, { number: string; issueDate: string; expiryDate: string; issuingAuthority?: string; documentUrl?: string; notes?: string }>);
    }

    const documents = await fetchVehicleDocuments(vehicle.id);
    return res.status(201).json(mapVehicleToAPI(vehicle as any, documents, operator as any, vehicleType as any));
  } catch (error: unknown) {
    const err = error as { code?: string; name?: string; errors?: Array<{ message: string }>; message?: string };
    if (err.code === '23505') return res.status(409).json({ error: 'Vehicle with this plate number already exists' });
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors?.[0]?.message });
    return res.status(500).json({ error: err.message || 'Failed to create vehicle' });
  }
};

export const updateVehicle = async (req: AuthRequest, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id } = req.params;
    const userId = req.user?.id;
    const validated = validateUpdateVehicle(req.body);

    const updateData: Record<string, unknown> = {};
    if (validated.plateNumber) updateData.plateNumber = validated.plateNumber;
    if (validated.vehicleTypeId !== undefined) updateData.vehicleTypeId = validated.vehicleTypeId || null;
    if ('operatorId' in req.body) {
      updateData.operatorId = req.body.operatorId?.trim() || null;
    } else if (validated.operatorId !== undefined) {
      updateData.operatorId = validated.operatorId || null;
    }
    if (validated.seatCapacity) updateData.seatCount = validated.seatCapacity;
    if (validated.bedCapacity !== undefined) updateData.bedCapacity = validated.bedCapacity || 0;
    if (validated.chassisNumber !== undefined) updateData.chassisNumber = validated.chassisNumber || null;
    if (validated.engineNumber !== undefined) updateData.engineNumber = validated.engineNumber || null;
    if (validated.imageUrl !== undefined) updateData.imageUrl = validated.imageUrl || null;
    if (validated.insuranceExpiryDate !== undefined) updateData.insuranceExpiry = validated.insuranceExpiryDate || null;
    if (validated.inspectionExpiryDate !== undefined) updateData.roadWorthinessExpiry = validated.inspectionExpiryDate || null;
    if (validated.cargoLength !== undefined) updateData.cargoLength = validated.cargoLength || null;
    if (validated.cargoWidth !== undefined) updateData.cargoWidth = validated.cargoWidth || null;
    if (validated.cargoHeight !== undefined) updateData.cargoHeight = validated.cargoHeight || null;
    if (validated.gpsProvider !== undefined) updateData.gpsProvider = validated.gpsProvider || null;
    if (validated.gpsUsername !== undefined) updateData.gpsUsername = validated.gpsUsername || null;
    if (validated.gpsPassword !== undefined) updateData.gpsPassword = validated.gpsPassword || null;
    if (validated.province !== undefined) updateData.province = validated.province || null;
    if (validated.notes !== undefined) updateData.notes = validated.notes || null;

    if (Object.keys(updateData).length > 0) {
      await db.update(vehicles).set(updateData).where(eq(vehicles.id, id));
    }

    if (validated.documents) {
      await upsertDocuments(id, validated.documents as Record<string, { number: string; issueDate: string; expiryDate: string; issuingAuthority?: string; documentUrl?: string; notes?: string }>, userId);
    }

    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found after update' });

    // Fetch relations in parallel
    const [operator, vehicleType] = await Promise.all([
      vehicle.operatorId
        ? db.select({ id: operators.id, name: operators.name, code: operators.code })
            .from(operators)
            .where(eq(operators.id, vehicle.operatorId))
            .then(r => r[0] || null)
        : Promise.resolve(null),
      vehicle.vehicleTypeId
        ? db.select({ id: vehicleTypes.id, name: vehicleTypes.name })
            .from(vehicleTypes)
            .where(eq(vehicleTypes.id, vehicle.vehicleTypeId))
            .then(r => r[0] || null)
        : Promise.resolve(null)
    ]);

    if (updateData.plateNumber || updateData.operatorId !== undefined) {
      syncVehicleChanges(id, {
        plateNumber: vehicle.plateNumber,
        operatorId: vehicle.operatorId,
        operatorName: operator?.name || null,
        operatorCode: operator?.code || null,
      }).catch((err) => console.error('[Vehicle Update] Sync failed:', err));
    }

    // Clear cache to ensure fresh data
    vehicleCacheService.clearCache();

    const documents = await fetchVehicleDocuments(id);
    return res.json(mapVehicleToAPI(vehicle as any, documents, operator as any, vehicleType as any));
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: Array<{ message: string }>; message?: string };
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors?.[0]?.message });
    return res.status(500).json({ error: err.message || 'Failed to update vehicle' });
  }
};

export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    // Check for active dispatch records
    const activeStatuses = ['entered', 'passengers_dropped', 'permit_issued', 'paid', 'departure_ordered'];
    const activeDispatches = await db
      .select({ id: dispatchRecords.id })
      .from(dispatchRecords)
      .where(and(
        eq(dispatchRecords.vehicleId, req.params.id),
        inArray(dispatchRecords.status, activeStatuses)
      ))
      .limit(1);

    if (activeDispatches.length > 0) {
      return res.status(400).json({
        error: 'Không thể xóa xe đang có lệnh điều độ chưa hoàn thành'
      });
    }

    const [data] = await db
      .update(vehicles)
      .set({ isActive: false })
      .where(eq(vehicles.id, req.params.id))
      .returning();

    if (!data) return res.status(404).json({ error: 'Vehicle not found' });

    // Clear cache to ensure fresh data
    vehicleCacheService.clearCache();

    return res.json({ id: data.id, isActive: data.isActive, message: 'Vehicle deleted successfully' });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return res.status(500).json({ error: err.message || 'Failed to delete vehicle' });
  }
};

export const getVehicleDocumentAuditLogs = async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    const { id: vehicleId } = req.params;
    if (!vehicleId) return res.status(400).json({ error: 'Vehicle ID is required' });

    const vehicleDocs = await db
      .select({ id: vehicleDocuments.id })
      .from(vehicleDocuments)
      .where(eq(vehicleDocuments.vehicleId, vehicleId));

    const docIds = vehicleDocs.map((doc) => doc.id);
    if (docIds.length === 0) return res.json([]);

    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        recordId: auditLogs.recordId,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        createdAt: auditLogs.createdAt,
        tableName: auditLogs.tableName,
        user: {
          id: users.id,
          fullName: users.name,
          username: users.email,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(
        eq(auditLogs.tableName, 'vehicle_documents'),
        inArray(auditLogs.recordId, docIds)
      ))
      .orderBy(desc(auditLogs.createdAt));

    return res.json(logs.map((log) => mapAuditLogToAPI(log as any)));
  } catch (error: unknown) {
    const err = error as { message?: string };
    return res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
};

/**
 * Get all document audit logs for all vehicles (optimized single query)
 */
export const getAllDocumentAuditLogs = async (_req: Request, res: Response) => {
  try {
    if (!db) throw new Error('Database not initialized')

    // Get all audit logs for both vehicle_documents and vehicle_badges
    const auditLogsData = await db
      .select()
      .from(auditLogs)
      .where(or(
        eq(auditLogs.tableName, 'vehicle_documents'),
        eq(auditLogs.tableName, 'vehicle_badges')
      ))
      .orderBy(desc(auditLogs.createdAt))
      .limit(500);

    if (!auditLogsData || auditLogsData.length === 0) return res.json([]);

    // Separate logs by table type
    const docLogs = auditLogsData.filter(log => log.tableName === 'vehicle_documents');
    const badgeLogs = auditLogsData.filter(log => log.tableName === 'vehicle_badges');

    // Get unique vehicle_document IDs
    const docIds = [...new Set(docLogs.map((log) => log.recordId))];

    // Fetch vehicle_documents to get vehicle_id
    const vehicleDocs = docIds.length > 0 ? await db
      .select({ id: vehicleDocuments.id, vehicleId: vehicleDocuments.vehicleId })
      .from(vehicleDocuments)
      .where(inArray(vehicleDocuments.id, docIds)) : [];

    const docToVehicleMap = new Map(
      vehicleDocs.map((doc) => [doc.id, doc.vehicleId])
    );

    // Get unique vehicle IDs from documents
    const vehicleIds = [...new Set(
      vehicleDocs.map((doc) => doc.vehicleId).filter(Boolean)
    )] as string[];

    // Fetch vehicles to get plate numbers
    const vehiclesData = vehicleIds.length > 0 ? await db
      .select({ id: vehicles.id, plateNumber: vehicles.plateNumber })
      .from(vehicles)
      .where(inArray(vehicles.id, vehicleIds)) : [];

    const vehicleMap = new Map(
      vehiclesData.map((v) => [v.id, v.plateNumber])
    );

    // Get unique badge IDs for plate number lookup
    const badgeIds = [...new Set(badgeLogs.map((log) => log.recordId))];

    // Fetch badges to get plate numbers directly
    const badgesData = badgeIds.length > 0 ? await db
      .select({ id: vehicleBadges.id, plateNumber: vehicleBadges.plateNumber })
      .from(vehicleBadges)
      .where(inArray(vehicleBadges.id, badgeIds)) : [];

    const badgeMap = new Map(
      badgesData.map((b) => [b.id, b.plateNumber])
    );

    // Fetch users for names
    const userIds = [...new Set(auditLogsData.map((log) => log.userId).filter(Boolean))] as string[];
    const usersData = userIds.length > 0 ? await db
      .select({ id: users.id, fullName: users.name, username: users.email })
      .from(users)
      .where(inArray(users.id, userIds)) : [];

    const userMap = new Map(
      usersData.map((u) => [u.id, u.fullName || u.username || 'Không xác định'])
    );

    // Format response
    const formattedLogs = auditLogsData.map((log) => {
      let plateNumber: string | null = null;

      if (log.tableName === 'vehicle_documents') {
        const vehicleId = docToVehicleMap.get(log.recordId);
        plateNumber = vehicleId ? vehicleMap.get(vehicleId) || null : null;
      } else if (log.tableName === 'vehicle_badges') {
        // For badges, get plate number from badge record or from newValues/oldValues
        plateNumber = badgeMap.get(log.recordId) || null;
        if (!plateNumber) {
          const newVals = log.newValues as any;
          const oldVals = log.oldValues as any;
          plateNumber = newVals?.plateNumber || oldVals?.plateNumber || null;
        }
      }

      // Add documentType for badges to display correctly in history table
      const newValues = log.newValues as any;
      const oldValues = log.oldValues as any;
      if (log.tableName === 'vehicle_badges') {
        if (newValues) newValues.documentType = 'emblem';
        if (oldValues) oldValues.documentType = 'emblem';
      }

      return {
        id: log.id,
        userId: log.userId,
        userName: log.userId ? userMap.get(log.userId) || 'Không xác định' : 'Không xác định',
        action: log.action,
        recordId: log.recordId,
        oldValues: oldValues,
        newValues: newValues,
        createdAt: log.createdAt,
        vehiclePlateNumber: plateNumber || '-',
      };
    });

    return res.json(formattedLogs);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error fetching all document audit logs:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
};
