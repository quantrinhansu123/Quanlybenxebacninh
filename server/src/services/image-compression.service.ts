/**
 * Image Compression Service
 * Server-side image optimization using Sharp
 * Target: ~50KB output with WebP format
 */
import sharp from 'sharp'

interface CompressionResult {
  buffer: Buffer
  format: 'webp' | 'jpeg'
  originalSize: number
  compressedSize: number
  compressionRatio: number
}

interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  targetSizeKB?: number
  quality?: number
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  targetSizeKB: 50,
  quality: 65
}

/**
 * Compress image buffer to target size
 * Uses WebP format for best compression, falls back to JPEG
 */
export async function compressImage(
  buffer: Buffer,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const targetBytes = opts.targetSizeKB * 1024
  const originalSize = buffer.length

  // Try WebP first (best compression)
  let compressed = await sharp(buffer)
    .resize(opts.maxWidth, opts.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({
      quality: opts.quality,
      effort: 6,
      smartSubsample: true
    })
    .toBuffer()

  // If still too large, reduce quality progressively
  if (compressed.length > targetBytes) {
    const qualitySteps = [55, 45, 35]

    for (const q of qualitySteps) {
      compressed = await sharp(buffer)
        .resize(opts.maxWidth, opts.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({
          quality: q,
          effort: 6,
          smartSubsample: true
        })
        .toBuffer()

      if (compressed.length <= targetBytes) break
    }

    // Last resort: reduce dimensions
    if (compressed.length > targetBytes) {
      compressed = await sharp(buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({
          quality: 40,
          effort: 6
        })
        .toBuffer()
    }
  }

  const compressionRatio = ((originalSize - compressed.length) / originalSize) * 100

  console.log('[Compression] Result:', {
    originalSize: `${(originalSize / 1024).toFixed(1)}KB`,
    compressedSize: `${(compressed.length / 1024).toFixed(1)}KB`,
    compressionRatio: `${compressionRatio.toFixed(1)}%`
  })

  return {
    buffer: compressed,
    format: 'webp',
    originalSize,
    compressedSize: compressed.length,
    compressionRatio
  }
}

/**
 * Compress image and return with metadata
 * Updates file object with compressed data
 */
export async function compressUploadedFile(
  file: Express.Multer.File,
  options: CompressionOptions = {}
): Promise<Express.Multer.File> {
  const result = await compressImage(file.buffer, options)

  // Update file with compressed data
  return {
    ...file,
    buffer: result.buffer,
    size: result.compressedSize,
    mimetype: 'image/webp',
    originalname: file.originalname.replace(/\.[^/.]+$/, '.webp')
  }
}

export const imageCompressionService = {
  compressImage,
  compressUploadedFile
}
