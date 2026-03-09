/**
 * Vercel Serverless Function Handler
 * 
 * This file exports the Express app as a Vercel serverless function.
 * Vercel will automatically route all requests to this handler.
 */

// Lazy load the app to avoid initialization errors
let appInstance: any = null

async function getApp() {
  if (!appInstance) {
    try {
      console.log('[Vercel Handler] Loading Express app...')
      const { app } = await import('../src/index.js')
      appInstance = app
      console.log('[Vercel Handler] Express app loaded successfully')
    } catch (error) {
      console.error('[Vercel Handler] Failed to load app:', error)
      throw error
    }
  }
  return appInstance
}

// Export handler function for Vercel
export default async function handler(req: any, res: any) {
  try {
    const app = await getApp()
    return app(req, res)
  } catch (error) {
    console.error('[Vercel Handler] Error in handler:', error)
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      })
    }
  }
}
