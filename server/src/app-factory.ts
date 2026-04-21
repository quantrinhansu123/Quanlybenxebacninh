/**
 * Express App Factory
 * Creates a configured Express app with base middleware and specified routes.
 * Used by Vercel serverless function splitting to load only the routes each function needs.
 */
import express, { Request, Response } from 'express'
import compression from 'compression'
import bodyParser from 'body-parser'
import cors from 'cors'
import { errorHandler } from './middleware/errorHandler.js'

export interface RouteMount {
  path: string
  router: ReturnType<typeof express.Router>
}

const isProduction = process.env.NODE_ENV === 'production'

const DEV_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
]

export function createApp(routes: RouteMount[]) {
  const app = express()

  app.use(compression())

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true)
      }

      const normalizedOrigin = origin.replace(/\/$/, '')

      if (!isProduction) {
        if (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1')) {
          return callback(null, true)
        }
        if (DEV_ALLOWED_ORIGINS.includes(normalizedOrigin)) {
          return callback(null, true)
        }
      }

      const envOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(o => o)

      if (envOrigins.length > 0 && envOrigins.includes(normalizedOrigin)) {
        return callback(null, true)
      }

      if (normalizedOrigin.includes('.vercel.app')) {
        return callback(null, true)
      }

      if (normalizedOrigin.includes('.web.app') || normalizedOrigin.includes('.firebaseapp.com')) {
        return callback(null, true)
      }

      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400,
    optionsSuccessStatus: 204,
  }))

  app.use(bodyParser.json({ limit: '5mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  for (const { path, router } of routes) {
    app.use(path, router)
  }

  app.use(errorHandler)

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' })
  })

  return app
}
