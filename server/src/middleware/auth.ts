import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: {
    id: string
    username: string
    role: string
  }
  body: any
  headers: any
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)
    const jwtSecret = process.env.JWT_SECRET!

    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT secret not configured' })
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      id: string
      username: string
      role: string
    }

    // Validate payload structure
    if (!decoded.id || typeof decoded.id !== 'string') {
      return res.status(401).json({ error: 'Invalid token payload' })
    }
    if (!decoded.username || typeof decoded.username !== 'string') {
      return res.status(401).json({ error: 'Invalid token payload' })
    }
    if (!decoded.role || typeof decoded.role !== 'string') {
      return res.status(401).json({ error: 'Invalid token payload' })
    }

    req.user = decoded
    return next()
  } catch (error) {
    // Check error name for token-specific errors
    const err = error as Error
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' })
    }
    return res.status(500).json({ error: 'Authentication error' })
  }
}

/**
 * Authorization middleware - checks if user has required role
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    return next()
  }
}

