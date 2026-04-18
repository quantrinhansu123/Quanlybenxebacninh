import { createApp, type RouteMount } from '../src/app-factory.js'

let appInstance: ReturnType<typeof createApp> | null = null

export default async function handler(req: any, res: any) {
  try {
    if (!appInstance) {
      const [
        { default: vehicleRoutes },
        { default: driverRoutes },
        { default: operatorRoutes },
        { default: vehicleBadgeRoutes },
        { default: vehicleTypeRoutes },
      ] = await Promise.all([
        import('../src/modules/fleet/vehicle.routes.js'),
        import('../src/modules/fleet/driver.routes.js'),
        import('../src/routes/operator.routes.js'),
        import('../src/routes/vehicle-badge.routes.js'),
        import('../src/routes/vehicle-type.routes.js'),
      ])

      const routes: RouteMount[] = [
        { path: '/api/vehicles', router: vehicleRoutes },
        { path: '/api/drivers', router: driverRoutes },
        { path: '/api/operators', router: operatorRoutes },
        { path: '/api/vehicle-badges', router: vehicleBadgeRoutes },
        { path: '/api/vehicle-types', router: vehicleTypeRoutes },
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
