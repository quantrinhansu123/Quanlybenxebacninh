// Load environment variables FIRST before any other imports
import dotenv from 'dotenv'
dotenv.config()

import { createApp, type RouteMount } from './app-factory.js'

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
import userRoutes from './routes/user.routes.js'
import webhookRoutes from './routes/webhook.routes.js'

const allRoutes: RouteMount[] = [
  { path: '/api/auth', router: authRoutes },
  { path: '/api/drivers', router: driverRoutes },
  { path: '/api/vehicles', router: vehicleRoutes },
  { path: '/api/operators', router: operatorRoutes },
  { path: '/api/locations', router: locationRoutes },
  { path: '/api/routes', router: routeRoutes },
  { path: '/api/schedules', router: scheduleRoutes },
  { path: '/api/vehicle-types', router: vehicleTypeRoutes },
  { path: '/api/shifts', router: shiftRoutes },
  { path: '/api/dispatch', router: dispatchRoutes },
  { path: '/api/violations', router: violationRoutes },
  { path: '/api/invoices', router: invoiceRoutes },
  { path: '/api/service-charges', router: serviceChargeRoutes },
  { path: '/api/services', router: serviceRoutes },
  { path: '/api/service-formulas', router: serviceFormulaRoutes },
  { path: '/api/reports', router: reportRoutes },
  { path: '/api/dashboard', router: dashboardRoutes },
  { path: '/api/upload', router: uploadRoutes },
  { path: '/api/vehicle-badges', router: vehicleBadgeRoutes },
  { path: '/api/provinces', router: provinceRoutes },
  { path: '/api/chat', router: chatRoutes },
  { path: '/api/quanly-data', router: quanlyDataRoutes },
  { path: '/api/operation-notices', router: operationNoticeRoutes },
  { path: '/api/users', router: userRoutes },
  { path: '/api/webhooks', router: webhookRoutes },
]

const app = createApp(allRoutes)

// Re-export route groups for Vercel function splitting
export const routeGroups = {
  fleet: [
    { path: '/api/vehicles', router: vehicleRoutes },
    { path: '/api/drivers', router: driverRoutes },
    { path: '/api/operators', router: operatorRoutes },
    { path: '/api/vehicle-badges', router: vehicleBadgeRoutes },
    { path: '/api/vehicle-types', router: vehicleTypeRoutes },
  ] as RouteMount[],
  dispatch: [
    { path: '/api/dispatch', router: dispatchRoutes },
    { path: '/api/invoices', router: invoiceRoutes },
    { path: '/api/violations', router: violationRoutes },
    { path: '/api/service-charges', router: serviceChargeRoutes },
  ] as RouteMount[],
  analytics: [
    { path: '/api/dashboard', router: dashboardRoutes },
    { path: '/api/reports', router: reportRoutes },
  ] as RouteMount[],
  chat: [
    { path: '/api/chat', router: chatRoutes },
  ] as RouteMount[],
  config: [
    { path: '/api/schedules', router: scheduleRoutes },
    { path: '/api/shifts', router: shiftRoutes },
    { path: '/api/routes', router: routeRoutes },
    { path: '/api/locations', router: locationRoutes },
    { path: '/api/provinces', router: provinceRoutes },
    { path: '/api/services', router: serviceRoutes },
    { path: '/api/service-formulas', router: serviceFormulaRoutes },
  ] as RouteMount[],
  auth: [
    { path: '/api/auth', router: authRoutes },
    { path: '/api/users', router: userRoutes },
  ] as RouteMount[],
  webhooks: [
    { path: '/api/webhooks', router: webhookRoutes },
    { path: '/api/upload', router: uploadRoutes },
    { path: '/api/operation-notices', router: operationNoticeRoutes },
  ] as RouteMount[],
  data: [
    { path: '/api/quanly-data', router: quanlyDataRoutes },
  ] as RouteMount[],
}

export { app }

// Start server only when running directly (not as Cloud Function or being analyzed)
const isCloudFunction = process.env.FUNCTION_TARGET ||
  process.env.K_SERVICE ||
  process.env.FUNCTIONS_EMULATOR ||
  process.env.GCLOUD_PROJECT ||
  process.env.FIREBASE_CONFIG

const isMainModule = process.argv[1]?.includes('index.js') || process.argv[1]?.includes('index.ts')

if (!isCloudFunction && isMainModule) {
  const PORT = Number(process.env.APP_PORT) || 3000
  const startTime = Date.now()

  app.listen(PORT, () => {
    const listenTime = Date.now() - startTime
    console.log(`Server is running on http://localhost:${PORT} (started in ${listenTime}ms)`)
    console.log(`API available at http://localhost:${PORT}/api`)
    console.log(`Health check: http://localhost:${PORT}/health`)

    if (process.env.VERCEL) {
      console.log('[Startup] Running on Vercel — skipping cache warm-up (on-demand only)')
      return
    }

    setImmediate(async () => {
      try {
        const { testDrizzleConnection } = await import('./db/drizzle.js')
        const isConnected = await testDrizzleConnection()
        if (!isConnected) {
          console.warn('[DB] Drizzle connection failed - check DATABASE_URL')
        }

        const [
          { vehicleCacheService },
          { cachedData },
          { chatCacheService }
        ] = await Promise.all([
          import('./modules/fleet/services/vehicle-cache.service.js'),
          import('./services/cached-data.service.js'),
          import('./modules/chat/services/chat-cache.service.js')
        ])

        await chatCacheService.preWarm()

        const cacheStart = Date.now()
        cachedData.preloadCommonData()
          .then(() => console.log(`[Startup] Background cache preload complete in ${Date.now() - cacheStart}ms`))
          .catch(e => console.error('[Startup] Background cache preload FAILED:', e))

        vehicleCacheService.scheduleBackgroundWarm(5000)

        console.log(`[Startup] Initialization complete in ${Date.now() - startTime}ms`)
      } catch (error) {
        console.warn('[Startup] Background initialization failed:', error)
      }
    })
  })
}
