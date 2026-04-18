import { createApp, type RouteMount } from '../src/app-factory.js'

let appInstance: ReturnType<typeof createApp> | null = null

export default async function handler(req: any, res: any) {
  try {
    if (!appInstance) {
      const [
        { default: authRoutes },
        { default: userRoutes },
      ] = await Promise.all([
        import('../src/routes/auth.routes.js'),
        import('../src/routes/user.routes.js'),
      ])

      const routes: RouteMount[] = [
        { path: '/api/auth', router: authRoutes },
        { path: '/api/users', router: userRoutes },
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
