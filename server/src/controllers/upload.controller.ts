/**
 * Upload Controller
 * Handles file uploads using Supabase Storage
 * Includes server-side image compression for egress optimization
 */
import { Request, Response } from 'express'
import { storageService } from '../services/storage.service.js'
import { imageCompressionService } from '../services/image-compression.service.js'
import fs from 'fs'

/**
 * Check storage service health
 * GET /api/upload/health
 */
export const checkStorageHealth = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const health = await storageService.checkHealth()
    return res.status(health.ok ? 200 : 503).json(health)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Upload] Health check error:', message)
    return res.status(503).json({
      ok: false,
      hasRequiredBucket: false,
      error: message
    })
  }
}

/**
 * Upload dispatch entry image
 * POST /api/upload/image
 */
export const uploadImage = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log('[Upload] Starting image upload request')

    if (!req.file) {
      console.error('[Upload] No file in request')
      return res.status(400).json({ message: 'No file uploaded' })
    }

    console.log('[Upload] File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      hasBuffer: !!req.file.buffer,
      hasPath: !!req.file.path
    })

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(req.file.mimetype)) {
      console.error('[Upload] Invalid file type:', req.file.mimetype)
      // Clean up temp file if exists
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(400).json({ message: 'Invalid file type. Only JPEG, PNG, WebP allowed.' })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (req.file.size > maxSize) {
      console.error('[Upload] File too large:', req.file.size, 'bytes')
      // Clean up temp file if exists
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
      }
      return res.status(400).json({ message: 'File too large. Maximum 5MB allowed.' })
    }

    // If file is on disk (not memory), read it to buffer
    if (req.file.path && !req.file.buffer) {
      console.log('[Upload] Reading file from disk to buffer')
      req.file.buffer = fs.readFileSync(req.file.path)
      // Clean up temp file after reading
      fs.unlinkSync(req.file.path)
    }

    console.log('[Upload] Uploading to Supabase storage...')

    // Compress image before upload (target: ~50KB)
    console.log('[Upload] Compressing image...')
    const compressedFile = await imageCompressionService.compressUploadedFile(req.file, {
      maxWidth: 1200,
      maxHeight: 1200,
      targetSizeKB: 50,
      quality: 65
    })
    console.log('[Upload] Compression complete:', {
      originalSize: `${(req.file.size / 1024).toFixed(1)}KB`,
      compressedSize: `${(compressedFile.size / 1024).toFixed(1)}KB`
    })

    // Upload compressed image to Supabase Storage
    const imageUrl = await storageService.upload(compressedFile, 'entries')

    console.log('[Upload] Upload successful:', imageUrl)
    return res.status(200).json({
      url: imageUrl,
      fileName: imageUrl.split('/').pop() || '',
    })
  } catch (error: unknown) {
    console.error('[Upload] Error during upload:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'no file'
    })

    // Try to remove temp file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      message: 'Image upload failed',
      error: message
    })
  }
}

/**
 * Delete uploaded image
 * DELETE /api/upload/image
 */
export const deleteImage = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ message: 'No URL provided' })
    }

    await storageService.delete(url)

    return res.json({ success: true })
  } catch (error: unknown) {
    console.error('[Upload] Delete error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({
      message: 'Failed to delete image',
      error: message
    })
  }
}
