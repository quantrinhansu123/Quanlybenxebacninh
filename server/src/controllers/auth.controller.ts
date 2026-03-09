import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { db } from '../db/drizzle.js'
import { users } from '../db/schema/users.js'
import { eq, ilike } from 'drizzle-orm'
import { loginSchema, registerSchema } from '../utils/validation.js'

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      console.error('❌ Database not initialized')
      res.status(500).json({ error: 'Database not initialized' })
      return
    }

    // Log incoming request for debugging
    console.log(`📥 Login request received`)
    console.log(`   Body:`, JSON.stringify(req.body))
    console.log(`   Headers:`, JSON.stringify(req.headers))

    // ========================================
    // 1. Validate input
    // ========================================
    let validated
    try {
      validated = loginSchema.parse(req.body)
    } catch (error: any) {
      console.error('❌ Validation error:', error.errors || error.message)
      res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors || error.message 
      })
      return
    }

    const { usernameOrEmail, password } = validated
    const normalizedLogin = usernameOrEmail.trim().toLowerCase()
    console.log(`📝 Login attempt: ${normalizedLogin}`)

    // ========================================
    // 2. Query user directly from users table (case-insensitive)
    // ========================================
    console.log(`🔍 Querying users table WHERE email (case-insensitive) = '${normalizedLogin}'`)
    let userResult
    try {
      // Use ilike for case-insensitive exact match (no wildcards = exact match)
      userResult = await db
        .select()
        .from(users)
        .where(ilike(users.email, normalizedLogin))
        .limit(1)
    } catch (dbError: any) {
      console.error('❌ Database query error:', dbError)
      console.error('   Error code:', dbError?.code)
      console.error('   Error message:', dbError?.message)
      console.error('   Error stack:', dbError?.stack)
      // Re-throw with more context
      const errorMessage = dbError?.message || 'Unknown database error'
      const errorCode = dbError?.code || 'UNKNOWN'
      throw new Error(`Database query failed [${errorCode}]: ${errorMessage}`)
    }
    
    const user = userResult[0]

    if (!user) {
      console.error(`❌ User not found: ${normalizedLogin}`)
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    console.log(`✅ User found: ${user.email} (ID: ${user.id})`)
    console.log(`   Name: ${user.name}, Role: ${user.role}, Active: ${user.isActive}`)

    // ========================================
    // 3. Check if account is active
    // ========================================
    if (!user.isActive) {
      console.error(`❌ Account disabled: ${user.email}`)
      res.status(403).json({ error: 'Account is disabled' })
      return
    }

    // ========================================
    // 4. Verify password against password_hash
    // ========================================
    if (!user.passwordHash) {
      console.error(`❌ No password hash found for: ${user.email}`)
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    console.log(`🔐 Comparing password with password_hash (bcrypt)...`)
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    
    if (!isPasswordValid) {
      console.error(`❌ Invalid password: ${user.email}`)
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    console.log(`✅ Password verified successfully`)

    // ========================================
    // 5. Generate JWT token
    // ========================================
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET not configured')
      res.status(500).json({ error: 'JWT secret not configured' })
      return
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.email, // Use email as username for compatibility
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      } as SignOptions
    )

    console.log(`🎫 JWT token generated, expires in: ${process.env.JWT_EXPIRES_IN || '7d'}`)

    // ========================================
    // 6. Return success response
    // ========================================
    console.log(`✅ Login successful: ${user.email}`)
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    })
  } catch (error) {
    console.error('❌ Login error:', error)
    
    // Check if response was already sent
    if (res.headersSent) {
      console.error('❌ Response already sent, cannot send error response')
      return
    }
    
    if (error instanceof Error) {
      // Check if it's a Zod validation error
      if (error.name === 'ZodError' || (error as any).issues) {
        res.status(400).json({ 
          error: 'Validation failed',
          details: (error as any).issues || error.message 
        })
        return
      }
      
      // Check for database connection errors
      if (error.message?.includes('Database') || 
          error.message?.includes('connection') ||
          error.message?.includes('DATABASE_URL') ||
          (error as any).code?.startsWith?.('ECONNREFUSED') ||
          (error as any).code?.startsWith?.('ENOTFOUND')) {
        console.error('❌ Database connection error:', error.message)
        res.status(500).json({ 
          error: 'Database connection failed',
          details: process.env.NODE_ENV === 'production' ? undefined : error.message
        })
        return
      }
      
      // Check for PostgreSQL errors
      if ((error as any).code && typeof (error as any).code === 'string') {
        console.error('❌ PostgreSQL error:', (error as any).code, error.message)
        res.status(500).json({ 
          error: 'Database error',
          details: process.env.NODE_ENV === 'production' ? undefined : error.message
        })
        return
      }
      
      // For other errors, return 500 (not 400)
      console.error('❌ Unexpected error:', error.message)
      res.status(500).json({ 
        error: 'Login failed',
        details: process.env.NODE_ENV === 'production' ? undefined : error.message
      })
      return
    }
    
    // Unknown error type
    console.error('❌ Unknown error type:', error)
    res.status(500).json({ error: 'Login failed' })
  }
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(500).json({ error: 'Database not initialized' })
      return
    }

    const validated = registerSchema.parse(req.body)
    const { username, password, fullName, email, phone, role } = validated

    // Set default role to 'user' if not provided
    const userRole = role || 'user'

    // Use email as username if not provided (compatibility)
    const userEmail = email || username

    // Check if email already exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, userEmail))

    if (existingUser) {
      res.status(409).json({ error: 'Email already exists' })
      return
    }

    // Hash password
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Create user in Drizzle
    const [newUser] = await db.insert(users).values({
      email: userEmail,
      passwordHash: passwordHash,
      name: fullName,
      phone: phone || null,
      role: userRole,
      isActive: true,
      emailVerified: false,
    }).returning()

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET!
    if (!jwtSecret) {
      res.status(500).json({ error: 'JWT secret not configured' })
      return
    }
    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.email,
        role: newUser.role,
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      } as SignOptions
    )

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.email,
        fullName: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    if (error instanceof Error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Registration failed' })
  }
}

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(500).json({ error: 'Database not initialized' })
      return
    }

    const authReq = req as any
    const userId = authReq.user?.id

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    // Query user by ID
    const [user] = await db.select().from(users).where(eq(users.id, userId))

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.json({
      id: user.id,
      username: user.email,
      fullName: user.name,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({ error: 'Failed to get user' })
  }
}


export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!db) {
      res.status(500).json({ error: 'Database not initialized' })
      return
    }

    const authReq = req as any
    const userId = authReq.user?.id

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, userId))

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Validate and prepare update data
    const { fullName, email, phone } = req.body
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (fullName !== undefined) {
      updateData.name = fullName
    }

    if (email !== undefined && email !== user.email) {
      // Check if new email already exists
      const [emailExists] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1)

      if (emailExists && emailExists.id !== userId) {
        res.status(409).json({ error: 'Email da ton tai' })
        return
      }

      updateData.email = email.toLowerCase()
    }

    if (phone !== undefined) {
      updateData.phone = phone || null
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning()

    res.json({
      id: updatedUser.id,
      username: updatedUser.email,
      fullName: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
}
