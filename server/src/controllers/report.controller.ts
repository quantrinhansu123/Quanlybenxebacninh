import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { invoices, operators } from '../db/schema/index.js'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import * as reportRepository from '../modules/report/report.repository.js'

export const getInvoices = async (req: Request, res: Response) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' })
  }

  try {
    const { startDate, endDate, operatorId, paymentStatus } = req.query

    const conditions = [
      gte(invoices.invoiceDate, new Date(startDate as string)),
      lte(invoices.invoiceDate, new Date(endDate as string)),
    ]

    if (operatorId) {
      conditions.push(eq(invoices.operatorId, operatorId as string))
    }
    if (paymentStatus) {
      conditions.push(eq(invoices.paymentStatus, paymentStatus as string))
    }

    const results = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        dispatchId: invoices.dispatchRecordId,
        totalAmount: invoices.totalAmount,
        invoiceDate: invoices.invoiceDate,
        paymentStatus: invoices.paymentStatus,
        operatorId: invoices.operatorId,
        operatorName: operators.name,
        operatorCode: operators.code,
      })
      .from(invoices)
      .leftJoin(operators, eq(invoices.operatorId, operators.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.invoiceDate))

    const invoiceList = results.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      dispatchId: invoice.dispatchId,
      operatorName: invoice.operatorName || '',
      amount: parseFloat(invoice.totalAmount || '0') || 0,
      issueDate: invoice.invoiceDate,
      status: invoice.paymentStatus,
    }))

    return res.json(invoiceList)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return res.status(500).json({ error: 'Failed to fetch invoices' })
  }
}

export const getVehicleLogs = async (req: Request, res: Response) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' })
  }

  try {
    const { startDate, endDate, vehicleId } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' })
    }

    const logs = await reportRepository.getVehicleLogs({
      startDate: startDate as string,
      endDate: endDate as string,
      vehicleId: vehicleId as string | undefined,
    })

    return res.json(logs)
  } catch (error) {
    console.error('Error fetching vehicle logs:', error)
    return res.status(500).json({ error: 'Failed to fetch vehicle logs' })
  }
}

export const getStationActivity = async (req: Request, res: Response) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' })
  }

  try {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' })
    }

    const activity = await reportRepository.getStationActivity({
      startDate: startDate as string,
      endDate: endDate as string,
    })

    return res.json(activity)
  } catch (error) {
    console.error('Error fetching station activity:', error)
    return res.status(500).json({ error: 'Failed to fetch station activity' })
  }
}

export const getInvalidVehicles = async (req: Request, res: Response) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' })
  }

  try {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' })
    }

    const invalidVehicles = await reportRepository.getInvalidVehicles({
      startDate: startDate as string,
      endDate: endDate as string,
    })

    return res.json(invalidVehicles)
  } catch (error) {
    console.error('Error fetching invalid vehicles:', error)
    return res.status(500).json({ error: 'Failed to fetch invalid vehicles' })
  }
}

export const getRevenue = async (req: Request, res: Response) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' })
  }

  try {
    const { startDate, endDate, operatorId } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' })
    }

    const revenue = await reportRepository.getRevenueSummary({
      startDate: startDate as string,
      endDate: endDate as string,
      operatorId: operatorId as string | undefined,
    })

    return res.json(revenue)
  } catch (error) {
    console.error('Error fetching revenue:', error)
    return res.status(500).json({ error: 'Failed to fetch revenue' })
  }
}

export const exportExcel = async (req: Request, res: Response) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' })
  }

  try {
    const { type: _type } = req.params
    const { startDate: _startDate, endDate: _endDate } = req.query

    // For now, return JSON. In production, you would use a library like exceljs
    // to generate actual Excel files
    return res.status(501).json({
      error: 'Excel export not yet implemented',
      message: 'This endpoint will generate Excel files in the future'
    })
  } catch (error) {
    console.error('Error exporting Excel:', error)
    return res.status(500).json({ error: 'Failed to export Excel' })
  }
}
