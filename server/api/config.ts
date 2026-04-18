import { createApp, type RouteMount } from '../src/app-factory.js'

let appInstance: ReturnType<typeof createApp> | null = null

export default async function handler(req: any, res: any) {
  try {
    if (!appInstance) {
      const [
        { default: scheduleRoutes },
        { default: shiftRoutes },
        { default: routeRoutes },
        { default: locationRoutes },
        { default: provinceRoutes },
        { default: serviceRoutes },
        { default: serviceFormulaRoutes },
      ] = await Promise.all([
        import('../src/routes/schedule.routes.js'),
        import('../src/routes/shift.routes.js'),
        import('../src/routes/route.routes.js'),
        import('../src/routes/location.routes.js'),
        import('../src/routes/province.routes.js'),
        import('../src/routes/service.routes.js'),
        import('../src/routes/service-formula.routes.js'),
      ])

      const routes: RouteMount[] = [
        { path: '/api/schedules', router: scheduleRoutes },
        { path: '/api/shifts', router: shiftRoutes },
        { path: '/api/routes', router: routeRoutes },
        { path: '/api/locations', router: locationRoutes },
        { path: '/api/provinces', router: provinceRoutes },
        { path: '/api/services', router: serviceRoutes },
        { path: '/api/service-formulas', router: serviceFormulaRoutes },
      ]
      appInstance = createApp(routes)
    }
    return appInstance(req, res)
  } catch (error) {
    console.error('[Vercel Handler] Error:', error)
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
