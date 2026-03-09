// Load environment variables FIRST before any other imports
import dotenv from 'dotenv'
dotenv.config()

import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { errorHandler } from './middleware/errorHandler.js'

// Routes
import authRoutes from './routes/auth.routes.js'
import driverRoutes from './modules/fleet/driver.routes.js'
import vehicleRoutes from './modules/fleet/vehicle.routes.js'
import operatorRoutes from './routes/operator.routes.js'
import locationRoutes from './routes/location.routes.js'
import routeRoutes from './routes/route.routes.js'
import scheduleRoutes from './routes/schedule.routes.js'
import vehicleTypeRoutes from './routes/vehicle-type.routes.js'
import shiftRoutes from './routes/shift.routes.js'
import dispatchRoutes from './modules/dispatch/dispatch.routes.js'
import violationRoutes from './routes/violation.routes.js'
import invoiceRoutes from './routes/invoice.routes.js'
import serviceChargeRoutes from './routes/service-charge.routes.js'
import serviceRoutes from './routes/service.routes.js'
import serviceFormulaRoutes from './routes/service-formula.routes.js'
import reportRoutes from './routes/report.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import uploadRoutes from './routes/upload.routes.js'
import vehicleBadgeRoutes from './routes/vehicle-badge.routes.js'
import provinceRoutes from './routes/province.routes.js'
import chatRoutes from './modules/chat/chat.routes.js'
import quanlyDataRoutes from './routes/quanly-data.routes.js'
import operationNoticeRoutes from './routes/operation-notice.routes.js'
import gtvtSyncRoutes from './routes/gtvt-sync.routes.js'
import userRoutes from './routes/user.routes.js'
import webhookRoutes from './routes/webhook.routes.js'

const app = express()
// Use APP_PORT instead of PORT (reserved in Firebase Functions)
const PORT = Number(process.env.APP_PORT) || 3000

// CORS Configuration - Allow common domains
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  // Firebase Hosting (legacy)
  'https://benxe-management-20251218.web.app',
  'https://benxe-management-20251218.firebaseapp.com',
]

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) {
      return callback(null, true)
    }

    // Normalize request origin (remove trailing slash)
    const normalizedOrigin = origin.replace(/\/$/, '')

    // Allow localhost in any environment
    if (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1')) {
      return callback(null, true)
    }

    // Allow Firebase Hosting domains
    if (normalizedOrigin.includes('.web.app') || normalizedOrigin.includes('.firebaseapp.com')) {
      return callback(null, true)
    }

    // Allow Vercel domains
    if (normalizedOrigin.includes('.vercel.app')) {
      return callback(null, true)
    }

    // Check explicit allowed origins
    if (ALLOWED_ORIGINS.includes(normalizedOrigin)) {
      return callback(null, true)
    }

    // Allow any origin from env CORS_ORIGIN
    const envOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim())
    if (envOrigins.includes(normalizedOrigin)) {
      return callback(null, true)
    }

    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(bodyParser.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/operators', operatorRoutes)
app.use('/api/locations', locationRoutes)
app.use('/api/routes', routeRoutes)
app.use('/api/schedules', scheduleRoutes)
app.use('/api/vehicle-types', vehicleTypeRoutes)
app.use('/api/shifts', shiftRoutes)
app.use('/api/dispatch', dispatchRoutes)
app.use('/api/violations', violationRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/service-charges', serviceChargeRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/service-formulas', serviceFormulaRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/vehicle-badges', vehicleBadgeRoutes)
app.use('/api/provinces', provinceRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/quanly-data', quanlyDataRoutes)
app.use('/api/operation-notices', operationNoticeRoutes)
app.use('/api/integrations/gtvt', gtvtSyncRoutes)
app.use('/api/users', userRoutes)
app.use('/api/webhooks', webhookRoutes)

// Error handling
app.use(errorHandler)

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// Export app for Firebase Functions
export { app }

// Start server only when running directly (not as Cloud Function or being analyzed)
// Check multiple environment variables that indicate we're in a Cloud Function context
const isCloudFunction = process.env.FUNCTION_TARGET ||
                        process.env.K_SERVICE ||
                        process.env.FUNCTIONS_EMULATOR ||
                        process.env.GCLOUD_PROJECT ||
                        process.env.FIREBASE_CONFIG

// Also check if this module is being required/imported (not run directly)
const isMainModule = process.argv[1]?.includes('index.js') || process.argv[1]?.includes('index.ts')

if (!isCloudFunction && isMainModule) {
  const startTime = Date.now()

  // Start server IMMEDIATELY - no blocking operations before listen
  app.listen(PORT, () => {
    const listenTime = Date.now() - startTime
    console.log(`Server is running on http://localhost:${PORT} (started in ${listenTime}ms)`)
    console.log(`API available at http://localhost:${PORT}/api`)
    console.log(`Health check: http://localhost:${PORT}/health`)

    // All initialization runs in background AFTER server is ready
    setImmediate(async () => {
      try {
        // Test Drizzle connection (non-blocking, just for logging)
        const { testDrizzleConnection } = await import('./db/drizzle.js')
        const isConnected = await testDrizzleConnection()
        if (!isConnected) {
          console.warn('[DB] Drizzle connection failed - check DATABASE_URL')
        }

        // Import cache services (lazy import for faster startup)
        const [
          { vehicleCacheService },
          { cachedData },
          { chatCacheService }
        ] = await Promise.all([
          import('./modules/fleet/services/vehicle-cache.service.js'),
          import('./services/cached-data.service.js'),
          import('./modules/chat/services/chat-cache.service.js')
        ])

        // Chat cache is lightweight (~10ms in-memory) - keep blocking for immediate availability
        await chatCacheService.preWarm()

        // Heavy caches run in background (non-blocking for Dashboard)
        // preWarmQuanLyCache REMOVED - Dashboard doesn't use it, lazy loads on first /api/quanly-data request
        const cacheStart = Date.now()
        cachedData.preloadCommonData()
          .then(() => console.log(`[Startup] Background cache preload complete in ${Date.now() - cacheStart}ms`))
          .catch(e => console.error('[Startup] Background cache preload FAILED:', e))

        // Schedule background vehicle cache warm after 5s (if no requests yet)
        vehicleCacheService.scheduleBackgroundWarm(5000)

        console.log(`[Startup] Initialization complete in ${Date.now() - startTime}ms`)
        console.log(`[Startup] Vehicle cache will warm on first request or after 5s`)
      } catch (error) {
        console.warn('[Startup] Background initialization failed:', error)
      }
    })
  })
}

