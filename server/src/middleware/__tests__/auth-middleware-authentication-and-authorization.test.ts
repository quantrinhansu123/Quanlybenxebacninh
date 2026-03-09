/**
 * Auth Middleware Tests
 * Tests for authentication and authorization middleware
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import type { Request, Response, NextFunction } from 'express'

// Mock jwt module
jest.unstable_mockModule('jsonwebtoken', () => ({
  verify: jest.fn(),
}))

// Dynamic import AFTER mock registration
const { authenticate, authorize } = await import('../auth.js')
const jwt = await import('jsonwebtoken')

export interface AuthRequest extends Request {
  user?: {
    id: string
    username: string
    role: string
  }
  body: any
  headers: any
}

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthRequest>
  let mockRes: Partial<Response>
  let nextFunction: NextFunction

  beforeEach(() => {
    mockReq = {
      headers: {},
      body: {},
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    nextFunction = jest.fn()
    jest.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
  })

  describe('authenticate', () => {
    it('should reject request without token', () => {
      authenticate(mockReq as AuthRequest, mockRes as Response, nextFunction)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should reject request with invalid token format', () => {
      mockReq.headers = { authorization: 'InvalidFormat' }

      authenticate(mockReq as AuthRequest, mockRes as Response, nextFunction)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should accept valid token and set user', () => {
      const mockPayload = {
        id: 'user-123',
        username: 'testuser',
        role: 'admin',
      }

      mockReq.headers = { authorization: 'Bearer valid-token' }
      ;(jwt.verify as jest.Mock).mockReturnValue(mockPayload)

      authenticate(mockReq as AuthRequest, mockRes as Response, nextFunction)

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret')
      expect(mockReq.user).toEqual(mockPayload)
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should reject expired token', () => {
      mockReq.headers = { authorization: 'Bearer expired-token' }
      const error = new Error('Token expired')
      error.name = 'TokenExpiredError'
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw error
      })

      authenticate(mockReq as AuthRequest, mockRes as Response, nextFunction)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should reject invalid token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' }
      const error = new Error('Invalid token')
      error.name = 'JsonWebTokenError'
      ;(jwt.verify as jest.Mock).mockImplementation(() => {
        throw error
      })

      authenticate(mockReq as AuthRequest, mockRes as Response, nextFunction)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should reject token with invalid payload structure', () => {
      const mockPayload = {
        id: 'user-123',
        // Missing username and role
      }

      mockReq.headers = { authorization: 'Bearer valid-token' }
      ;(jwt.verify as jest.Mock).mockReturnValue(mockPayload)

      authenticate(mockReq as AuthRequest, mockRes as Response, nextFunction)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token payload' })
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })

  describe('authorize', () => {
    it('should reject request without user (not authenticated)', () => {
      const middleware = authorize('admin')

      middleware(mockReq as AuthRequest, mockRes as Response, nextFunction)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authenticated' })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should reject user without required role', () => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        role: 'reporter',
      }

      const middleware = authorize('admin')
      middleware(mockReq as AuthRequest, mockRes as Response, nextFunction)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authorized' })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should allow user with exact required role', () => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        role: 'admin',
      }

      const middleware = authorize('admin')
      middleware(mockReq as AuthRequest, mockRes as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should allow user with any of multiple allowed roles', () => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        role: 'dispatcher',
      }

      const middleware = authorize('admin', 'dispatcher')
      middleware(mockReq as AuthRequest, mockRes as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should reject user role not in multiple allowed roles', () => {
      mockReq.user = {
        id: 'user-123',
        username: 'testuser',
        role: 'accountant',
      }

      const middleware = authorize('admin', 'dispatcher')
      middleware(mockReq as AuthRequest, mockRes as Response, nextFunction)

      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authorized' })
      expect(nextFunction).not.toHaveBeenCalled()
    })
  })
})
