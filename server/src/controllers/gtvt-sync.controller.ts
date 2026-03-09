import { Response } from 'express'
import { z } from 'zod'
import { invalidateQuanLyCache } from './quanly-data.controller.js'
import { getGtvtLastSyncStatus, syncGtvtRoutesAndSchedules } from '../services/gtvt-route-schedule-sync.service.js'
import { getContractStatus } from '../services/gtvt-contract-status.service.js'
import { GtvtConfigError, GtvtSourceError, GtvtInternalError } from '../types/gtvt-sync.types.js'
import type { AuthRequest } from '../middleware/auth.js'

const syncRequestSchema = z.object({
  dryRun: z.boolean().optional().default(false),
})

const SYNC_CONFIG_ERROR_MESSAGE = 'GTVT sync configuration is invalid'
const SYNC_SOURCE_ERROR_MESSAGE = 'Failed to fetch data from GTVT upstream API'
const SYNC_CONFLICT_ERROR_MESSAGE = 'GTVT sync is already in progress'
const SYNC_INTERNAL_ERROR_MESSAGE = 'Failed to sync GTVT data'
const LAST_SYNC_INTERNAL_ERROR_MESSAGE = 'Failed to fetch last sync info'

export const syncGtvtRoutesSchedules = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const parsed = syncRequestSchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid request payload' })
    }

    const result = await syncGtvtRoutesAndSchedules({
      dryRun: parsed.data.dryRun,
      triggeredBy: req.user?.id,
    })

    if (!parsed.data.dryRun) {
      invalidateQuanLyCache()
    }

    return res.json(result)
  } catch (error) {
    if (error instanceof GtvtConfigError) {
      console.error('[GTVT Sync] configuration error', error)
      return res.status(400).json({ error: SYNC_CONFIG_ERROR_MESSAGE })
    }
    if (error instanceof GtvtInternalError) {
      console.error('[GTVT Sync] internal error', error)
      if (error.message.includes('already in progress')) {
        return res.status(409).json({ error: SYNC_CONFLICT_ERROR_MESSAGE })
      }
      return res.status(503).json({ error: SYNC_INTERNAL_ERROR_MESSAGE })
    }
    if (error instanceof GtvtSourceError) {
      console.error('[GTVT Sync] upstream source error', error)
      return res.status(502).json({ error: SYNC_SOURCE_ERROR_MESSAGE })
    }
    console.error('[GTVT Sync] unexpected error', error)
    return res.status(500).json({ error: SYNC_INTERNAL_ERROR_MESSAGE })
  }
}

export const getGtvtLastSync = async (_req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const result = await getGtvtLastSyncStatus()
    return res.json(result)
  } catch (error) {
    console.error('[GTVT Sync] get last sync error', error)
    return res.status(500).json({ error: LAST_SYNC_INTERNAL_ERROR_MESSAGE })
  }
}

export const getGtvtContractStatus = (_req: AuthRequest, res: Response): Response => {
  try {
    const result = getContractStatus()
    return res.json(result)
  } catch (error) {
    console.error('[GTVT Contract] status check error', error)
    return res.status(500).json({ error: 'Failed to check contract status' })
  }
}
