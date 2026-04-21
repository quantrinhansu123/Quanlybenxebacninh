/**
 * Express App Factory
 * Creates a configured Express app with base middleware and specified routes.
 * Used by Vercel serverless function splitting to load only the routes each function needs.
 */
import express, { Request, Response, NextFunction } from 'express'
import compression from 'compression'
import bodyParser from 'body-parser'
import cors from 'cors'
import { errorHandler } from './middleware/errorHandler.js'

export interface RouteMount {
  path: string
  router: ReturnType<typeof express.Router>
}

const isProduction = process.env.NODE_ENV === 'production'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://quanlybenxebacninhclient.vercel.app',
  'https://quanlybenxebacninh-client.vercel.app',
]

export function createApp(routes: RouteMount[]) {
  const app = express()

  app.use(compression())

  // Manual CORS preflight handling for robustness on Vercel
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    }
    
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
      res.setHeader('Access-Control-Max-Age', '86400')
      res.status(204).end()
      return
    }
    next()
  })

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true)
      }

      const normalizedOrigin = origin.replace(/\/$/, '')

      if (ALLOWED_ORIGINS.includes(normalizedOrigin)) {
        return callback(null, true)
      }

      if (!isProduction) {
        if (normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1')) {
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

      console.warn(`[CORS] Origin not explicitly allowed, but allowing to avoid breakage: ${origin}`);
      return callback(null, true)
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
