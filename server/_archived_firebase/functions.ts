/**
 * Firebase Cloud Functions Entry Point
 *
 * This file exports the Express app as a Firebase Cloud Function.
 * Deploy using: firebase deploy --only functions
 */

import { onRequest } from 'firebase-functions/v2/https'
import { app } from './index.js'

// Export Express app as Firebase Function
// The function will be available at: https://<region>-<project-id>.cloudfunctions.net/api
// Note: JWT_SECRET is now loaded from .env file instead of Firebase Secrets
export const api = onRequest(
  {
    // Function configuration
    region: 'asia-southeast1', // Singapore region for Vietnam
    memory: '512MiB',
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    // Allow unauthenticated access (API handles its own auth)
    invoker: 'public',
  },
  // Cast Express app to request handler - Firebase Functions accepts Express apps
  app as unknown as (req: any, res: any) => void | Promise<void>
)
