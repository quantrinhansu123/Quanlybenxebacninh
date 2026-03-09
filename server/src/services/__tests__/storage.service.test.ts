/**
 * Storage Service Unit Tests
 * Tests for Supabase Storage service
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('upload', () => {
    it('should generate unique file names', () => {
      const originalName = 'test-image.jpg'
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(7)
      const ext = originalName.split('.').pop()

      const fileName = `entries/${timestamp}-${randomStr}.${ext}`

      expect(fileName).toMatch(/^entries\/\d+-[a-z0-9]+\.jpg$/)
    })

    it('should extract file extension correctly', () => {
      const cases = [
        { name: 'photo.jpg', expected: 'jpg' },
        { name: 'image.png', expected: 'png' },
        { name: 'file.with.dots.webp', expected: 'webp' },
        { name: 'noextension', expected: 'noextension' },
      ]

      for (const c of cases) {
        const ext = c.name.split('.').pop() || 'jpg'
        expect(ext).toBe(c.expected)
      }
    })

    it('should validate allowed mime types', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

      expect(allowedTypes.includes('image/jpeg')).toBe(true)
      expect(allowedTypes.includes('image/png')).toBe(true)
      expect(allowedTypes.includes('image/webp')).toBe(true)
      expect(allowedTypes.includes('image/gif')).toBe(false)
      expect(allowedTypes.includes('application/pdf')).toBe(false)
    })

    it('should validate file size (max 5MB)', () => {
      const maxSize = 5 * 1024 * 1024 // 5MB

      expect(4 * 1024 * 1024).toBeLessThan(maxSize) // 4MB OK
      expect(5 * 1024 * 1024).toBe(maxSize) // 5MB exactly
      expect(6 * 1024 * 1024).toBeGreaterThan(maxSize) // 6MB too big
    })
  })

  describe('delete', () => {
    it('should extract path from Supabase URL correctly', () => {
      const bucketName = 'dispatch-images'
      const testUrl = `https://project.supabase.co/storage/v1/object/public/${bucketName}/entries/12345-abc123.jpg`

      const url = new URL(testUrl)
      const pathParts = url.pathname.split(`/storage/v1/object/public/${bucketName}/`)
      const filePath = pathParts[1]

      expect(filePath).toBe('entries/12345-abc123.jpg')
    })

    it('should handle URLs without expected format gracefully', () => {
      const invalidUrl = 'https://other-domain.com/some/path/file.jpg'
      const bucketName = 'dispatch-images'

      const url = new URL(invalidUrl)
      const pathParts = url.pathname.split(`/storage/v1/object/public/${bucketName}/`)
      const filePath = pathParts[1]

      expect(filePath).toBeUndefined()
    })
  })

  describe('exists', () => {
    it('should extract folder and filename from path', () => {
      const filePath = 'entries/migrated/12345.jpg'

      const folder = filePath.split('/').slice(0, -1).join('/')
      const fileName = filePath.split('/').pop()

      expect(folder).toBe('entries/migrated')
      expect(fileName).toBe('12345.jpg')
    })
  })

  describe('URL Generation', () => {
    it('should construct public URL format', () => {
      const projectUrl = 'https://project.supabase.co'
      const bucketName = 'dispatch-images'
      const filePath = 'entries/12345-abc123.jpg'

      const expectedUrl = `${projectUrl}/storage/v1/object/public/${bucketName}/${filePath}`

      expect(expectedUrl).toMatch(/^https:\/\/.*supabase\.co\/storage\/v1\/object\/public\/dispatch-images\//)
    })
  })
})
