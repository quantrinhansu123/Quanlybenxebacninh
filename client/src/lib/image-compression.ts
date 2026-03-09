/**
 * Client-side Image Compression Utility
 * Pre-compresses images before upload to reduce bandwidth
 * Uses browser-image-compression library
 */
import imageCompression from 'browser-image-compression'

interface CompressionOptions {
  /** Maximum file size in MB (default: 0.2 = 200KB for upload) */
  maxSizeMB?: number
  /** Maximum width or height in pixels (default: 1200) */
  maxWidthOrHeight?: number
  /** Use web worker for background processing (default: true) */
  useWebWorker?: boolean
  /** Initial quality 0-1 (default: 0.7) */
  initialQuality?: number
}

interface CompressionResult {
  file: File
  originalSize: number
  compressedSize: number
  compressionRatio: number
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxSizeMB: 0.2, // 200KB - server will further compress to 50KB
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  initialQuality: 0.7
}

/**
 * Compress image file before upload
 * Reduces file size while maintaining acceptable quality
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const originalSize = file.size

  // Skip compression if already small enough
  if (originalSize <= opts.maxSizeMB * 1024 * 1024) {
    console.log('[Compression] File already small enough, skipping')
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0
    }
  }

  try {
    console.log('[Compression] Starting client-side compression...', {
      originalSize: `${(originalSize / 1024).toFixed(1)}KB`,
      targetSize: `${(opts.maxSizeMB * 1024).toFixed(0)}KB`
    })

    const compressed = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight,
      useWebWorker: opts.useWebWorker,
      initialQuality: opts.initialQuality,
      fileType: 'image/webp' // Modern format for best compression
    })

    const compressedSize = compressed.size
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100

    console.log('[Compression] Complete:', {
      originalSize: `${(originalSize / 1024).toFixed(1)}KB`,
      compressedSize: `${(compressedSize / 1024).toFixed(1)}KB`,
      compressionRatio: `${compressionRatio.toFixed(1)}%`
    })

    return {
      file: compressed,
      originalSize,
      compressedSize,
      compressionRatio
    }
  } catch (error) {
    console.error('[Compression] Failed, using original file:', error)

    // Fallback: try JPEG if WebP fails
    try {
      const jpegCompressed = await imageCompression(file, {
        ...opts,
        fileType: 'image/jpeg'
      })

      return {
        file: jpegCompressed,
        originalSize,
        compressedSize: jpegCompressed.size,
        compressionRatio: ((originalSize - jpegCompressed.size) / originalSize) * 100
      }
    } catch {
      // Return original if all compression fails
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0
      }
    }
  }
}

/**
 * Validate image file before compression
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const maxSize = 10 * 1024 * 1024 // 10MB max input

  if (!supportedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Định dạng không hỗ trợ: ${file.type}. Vui lòng sử dụng JPEG, PNG, WebP hoặc GIF.`
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 10MB.`
    }
  }

  return { valid: true }
}

/**
 * Compress and validate image for upload
 * Combined utility function
 */
export async function prepareImageForUpload(
  file: File,
  options: CompressionOptions = {}
): Promise<{ file: File; error?: string }> {
  // Validate first
  const validation = validateImageFile(file)
  if (!validation.valid) {
    return { file, error: validation.error }
  }

  // Compress
  const result = await compressImage(file, options)
  return { file: result.file }
}
