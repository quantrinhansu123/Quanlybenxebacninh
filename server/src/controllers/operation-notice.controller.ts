import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { operationNotices } from '../db/schema/index.js'
import { eq, and, isNotNull, ne } from 'drizzle-orm'

/** Proxy PDF file to bypass CORS restrictions from external hosts */
export const proxyPdf = async (req: Request, res: Response) => {
  try {
    const { url } = req.query
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url query parameter is required' })
    }

    // Only allow HTTP(S) URLs
    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: 'Invalid URL' })
    }

    const response = await fetch(url)
    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream returned ${response.status}` })
    }

    const contentType = response.headers.get('content-type') || 'application/pdf'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400') // cache 24h

    const buffer = Buffer.from(await response.arrayBuffer())
    return res.send(buffer)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to proxy PDF' })
  }
}

export const getOperationNotices = async (req: Request, res: Response) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const { routeCode, noticeNumber } = req.query

    if (!routeCode || typeof routeCode !== 'string') {
      return res.status(400).json({ error: 'routeCode is required' })
    }

    const conditions = [
      eq(operationNotices.routeCode, routeCode),
      isNotNull(operationNotices.fileUrl),
      ne(operationNotices.fileUrl, ''),
    ]

    if (noticeNumber && typeof noticeNumber === 'string') {
      conditions.push(eq(operationNotices.noticeNumber, noticeNumber))
    }

    const data = await db
      .select()
      .from(operationNotices)
      .where(and(...conditions))
      .orderBy(operationNotices.issueDate)

    return res.json(data)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch operation notices' })
  }
}
