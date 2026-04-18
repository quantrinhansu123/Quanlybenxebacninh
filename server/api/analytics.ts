import { createApp, type RouteMount } from '../src/app-factory.js'

let appInstance: ReturnType<typeof createApp> | null = null

export default async function handler(req: any, res: any) {
  try {
    if (!appInstance) {
      const [
        { default: dashboardRoutes },
        { default: reportRoutes },
      ] = await Promise.all([
        import('../src/routes/dashboard.routes.js'),
        import('../src/routes/report.routes.js'),
      ])

      const routes: RouteMount[] = [
        { path: '/api/dashboard', router: dashboardRoutes },
        { path: '/api/reports', router: reportRoutes },
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
