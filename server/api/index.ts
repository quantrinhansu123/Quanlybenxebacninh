import { createApp } from '../src/app-factory.js'

let appInstance: ReturnType<typeof createApp> | null = null

async function getApp() {
  if (!appInstance) {
    try {
      const [
        { default: authRoutes },
        { default: driverRoutes },
        { default: vehicleRoutes },
        { default: operatorRoutes },
        { default: locationRoutes },
        { default: routeRoutes },
        { default: scheduleRoutes },
        { default: vehicleTypeRoutes },
        { default: shiftRoutes },
        { default: dispatchRoutes },
        { default: violationRoutes },
        { default: invoiceRoutes },
        { default: serviceChargeRoutes },
        { default: serviceRoutes },
        { default: serviceFormulaRoutes },
        { default: reportRoutes },
        { default: dashboardRoutes },
        { default: uploadRoutes },
        { default: vehicleBadgeRoutes },
        { default: provinceRoutes },
        { default: chatRoutes },
        { default: quanlyDataRoutes },
        { default: operationNoticeRoutes },
        { default: userRoutes },
        { default: webhookRoutes },
      ] = await Promise.all([
        import('../src/routes/auth.routes.js'),
        import('../src/modules/fleet/driver.routes.js'),
        import('../src/modules/fleet/vehicle.routes.js'),
        import('../src/routes/operator.routes.js'),
        import('../src/routes/location.routes.js'),
        import('../src/routes/route.routes.js'),
        import('../src/routes/schedule.routes.js'),
        import('../src/routes/vehicle-type.routes.js'),
        import('../src/routes/shift.routes.js'),
        import('../src/modules/dispatch/dispatch.routes.js'),
        import('../src/routes/violation.routes.js'),
        import('../src/routes/invoice.routes.js'),
        import('../src/routes/service-charge.routes.js'),
        import('../src/routes/service.routes.js'),
        import('../src/routes/service-formula.routes.js'),
        import('../src/routes/report.routes.js'),
        import('../src/routes/dashboard.routes.js'),
        import('../src/routes/upload.routes.js'),
        import('../src/routes/vehicle-badge.routes.js'),
        import('../src/routes/province.routes.js'),
        import('../src/modules/chat/chat.routes.js'),
        import('../src/routes/quanly-data.routes.js'),
        import('../src/routes/operation-notice.routes.js'),
        import('../src/routes/user.routes.js'),
        import('../src/routes/webhook.routes.js'),
      ])

      appInstance = createApp([
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
      ])
      console.log('[Vercel Handler] Full app loaded successfully')
    } catch (error) {
      console.error('[Vercel Handler] Failed to load app:', error)
      throw error
    }
  }
  return appInstance
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp()
    return app(req, res)
  } catch (error) {
    console.error('[Vercel Handler] Error in handler:', error)
    if (!res.headersSent) {
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
