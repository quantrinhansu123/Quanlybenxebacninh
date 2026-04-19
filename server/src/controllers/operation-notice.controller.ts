import { Request, Response } from 'express'
import { db } from '../db/drizzle.js'
import { operationNotices } from '../db/schema/index.js'
import { eq, and, isNotNull, ne, ilike } from 'drizzle-orm'

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

    const baseConditions = [
      eq(operationNotices.routeCode, routeCode),
      isNotNull(operationNotices.fileUrl),
      ne(operationNotices.fileUrl, ''),
    ]

    // If noticeNumber is provided, try exact match first, then filePath fuzzy match.
    // schedules.notification_number sometimes stores a file-ID prefix (e.g. "6acde563")
    // which appears in operation_notices.file_path as "THONGBAO_KHAITHAC_Files_/6acde563.File.*.pdf"
    if (noticeNumber && typeof noticeNumber === 'string') {
      const nn = noticeNumber.trim()

      // 1) Exact match on notice_number
      const exact = await db
        .select()
        .from(operationNotices)
        .where(and(...baseConditions, eq(operationNotices.noticeNumber, nn)))
        .orderBy(operationNotices.issueDate)

      if (exact.length > 0) return res.json(exact)

      // 2) filePath fuzzy: notice whose file_path contains the noticeNumber token
      const byFilePath = await db
        .select()
        .from(operationNotices)
        .where(and(...baseConditions, ilike(operationNotices.filePath, `%${nn}%`)))
        .orderBy(operationNotices.issueDate)

      if (byFilePath.length > 0) return res.json(byFilePath)

      // 3) Normalized partial match on notice_number (different separators / spacing)
      const norm = nn.replace(/[\s\/\-\.]/g, '')
      const all = await db
        .select()
        .from(operationNotices)
        .where(and(...baseConditions))
        .orderBy(operationNotices.issueDate)

      const fuzzy = all.filter(n => {
        const normDb = (n.noticeNumber || '').replace(/[\s\/\-\.]/g, '')
        return normDb === norm ||
          normDb.includes(norm) ||
          norm.includes(normDb)
      })
      return res.json(fuzzy)
    }

    // No noticeNumber — return all for route
    const data = await db
      .select()
      .from(operationNotices)
      .where(and(...baseConditions))
      .orderBy(operationNotices.issueDate)

    return res.json(data)
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch operation notices' })
  }
}
