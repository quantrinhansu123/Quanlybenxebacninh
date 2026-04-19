import { Router, Request, Response } from 'express'

const router = Router()

// Health check cho webhook
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'webhook' })
})

export default router
