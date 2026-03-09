import type { Response } from 'express'
import type { AuthRequest } from '../../middleware/auth.js'
import { GtvtConfigError, GtvtSourceError, GtvtInternalError } from '../../types/gtvt-sync.types.js'

const mockSyncGtvtRoutesAndSchedules = jest.fn()
const mockGetGtvtLastSyncStatus = jest.fn()
const mockInvalidateQuanLyCache = jest.fn()

jest.mock('../../services/gtvt-route-schedule-sync.service.js', () => ({
  syncGtvtRoutesAndSchedules: (...args: unknown[]) => mockSyncGtvtRoutesAndSchedules(...args),
  getGtvtLastSyncStatus: (...args: unknown[]) => mockGetGtvtLastSyncStatus(...args),
}))

jest.mock('../quanly-data.controller.js', () => ({
  invalidateQuanLyCache: (...args: unknown[]) => mockInvalidateQuanLyCache(...args),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { syncGtvtRoutesSchedules, getGtvtLastSync } = require('../gtvt-sync.controller.js')

describe('GTVT Sync Controller', () => {
  let req: Partial<AuthRequest>
  let res: Partial<Response>

  beforeEach(() => {
    req = {
      body: {},
      user: {
        id: 'admin-001',
        username: 'admin',
        role: 'admin',
      },
    }
    res = {
      status: jest.fn().mockReturnThis() as unknown as Response['status'],
      json: jest.fn().mockReturnThis() as unknown as Response['json'],
    }
    jest.clearAllMocks()
  })

  it('should sync successfully and invalidate cache on live mode', async () => {
    const syncResult = {
      mode: 'live',
      source: 'gtvt_appsheet_manual',
      startedAt: '2026-02-23T00:00:00.000Z',
      finishedAt: '2026-02-23T00:00:05.000Z',
      durationMs: 5000,
      summary: {
        incomingRoutes: 1,
        incomingSchedules: 1,
        insertedRoutes: 1,
        updatedRoutes: 0,
        disabledRoutes: 0,
        insertedSchedules: 1,
        updatedSchedules: 0,
        disabledSchedules: 0,
        failed: 0,
      },
      errors: [],
    }
    mockSyncGtvtRoutesAndSchedules.mockResolvedValue(syncResult)

    await syncGtvtRoutesSchedules(req as AuthRequest, res as Response)

    expect(mockSyncGtvtRoutesAndSchedules).toHaveBeenCalledWith({
      dryRun: false,
      triggeredBy: 'admin-001',
    })
    expect(mockInvalidateQuanLyCache).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(syncResult)
  })

  it('should not invalidate cache in dry-run mode', async () => {
    req.body = { dryRun: true }
    const syncResult = {
      mode: 'dry-run',
      source: 'gtvt_appsheet_manual',
      startedAt: '2026-02-23T00:00:00.000Z',
      finishedAt: '2026-02-23T00:00:01.000Z',
      durationMs: 1000,
      summary: {
        incomingRoutes: 0,
        incomingSchedules: 0,
        insertedRoutes: 0,
        updatedRoutes: 0,
        disabledRoutes: 0,
        insertedSchedules: 0,
        updatedSchedules: 0,
        disabledSchedules: 0,
        failed: 0,
      },
      errors: [],
    }
    mockSyncGtvtRoutesAndSchedules.mockResolvedValue(syncResult)

    await syncGtvtRoutesSchedules(req as AuthRequest, res as Response)

    expect(mockSyncGtvtRoutesAndSchedules).toHaveBeenCalledWith({
      dryRun: true,
      triggeredBy: 'admin-001',
    })
    expect(mockInvalidateQuanLyCache).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(syncResult)
  })

  it('should return 400 on config error', async () => {
    mockSyncGtvtRoutesAndSchedules.mockRejectedValue(new GtvtConfigError('Missing config'))

    await syncGtvtRoutesSchedules(req as AuthRequest, res as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'GTVT sync configuration is invalid' })
  })

  it('should return 502 on source error', async () => {
    mockSyncGtvtRoutesAndSchedules.mockRejectedValue(new GtvtSourceError('Upstream failed'))

    await syncGtvtRoutesSchedules(req as AuthRequest, res as Response)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch data from GTVT upstream API' })
  })

  it('should return 409 when a sync is already in progress', async () => {
    mockSyncGtvtRoutesAndSchedules.mockRejectedValue(new GtvtInternalError('Another sync operation is already in progress'))

    await syncGtvtRoutesSchedules(req as AuthRequest, res as Response)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'GTVT sync is already in progress' })
  })

  it('should get last sync info successfully', async () => {
    const lastSync = {
      source: 'gtvt_appsheet_manual',
      lastRouteSyncAt: '2026-02-23T00:00:05.000Z',
      lastScheduleSyncAt: '2026-02-23T00:00:05.000Z',
    }
    mockGetGtvtLastSyncStatus.mockResolvedValue(lastSync)

    await getGtvtLastSync(req as AuthRequest, res as Response)

    expect(mockGetGtvtLastSyncStatus).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(lastSync)
  })

  it('should return generic 500 error when last sync fails', async () => {
    mockGetGtvtLastSyncStatus.mockRejectedValue(new Error('database crashed'))

    await getGtvtLastSync(req as AuthRequest, res as Response)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch last sync info' })
  })
})
