import { createApp, type RouteMount } from '../src/app-factory.js'

let appInstance: ReturnType<typeof createApp> | null = null

export default async function handler(req: any, res: any) {
  try {
    if (!appInstance) {
      const [
        { default: webhookRoutes },
        { default: gtvtSyncRoutes },
        { default: uploadRoutes },
        { default: operationNoticeRoutes },
      ] = await Promise.all([
        import('../src/routes/webhook.routes.js'),
        import('../src/routes/gtvt-sync.routes.js'),
        import('../src/routes/upload.routes.js'),
        import('../src/routes/operation-notice.routes.js'),
      ])

      const routes: RouteMount[] = [
        { path: '/api/webhooks', router: webhookRoutes },
        { path: '/api/integrations/gtvt', router: gtvtSyncRoutes },
        { path: '/api/upload', router: uploadRoutes },
        { path: '/api/operation-notices', router: operationNoticeRoutes },
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
