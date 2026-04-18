import { createApp, type RouteMount } from '../src/app-factory.js'

let appInstance: ReturnType<typeof createApp> | null = null

export default async function handler(req: any, res: any) {
  try {
    if (!appInstance) {
      const [
        { default: dispatchRoutes },
        { default: invoiceRoutes },
        { default: violationRoutes },
        { default: serviceChargeRoutes },
      ] = await Promise.all([
        import('../src/modules/dispatch/dispatch.routes.js'),
        import('../src/routes/invoice.routes.js'),
        import('../src/routes/violation.routes.js'),
        import('../src/routes/service-charge.routes.js'),
      ])

      const routes: RouteMount[] = [
        { path: '/api/dispatch', router: dispatchRoutes },
        { path: '/api/invoices', router: invoiceRoutes },
        { path: '/api/violations', router: violationRoutes },
        { path: '/api/service-charges', router: serviceChargeRoutes },
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
