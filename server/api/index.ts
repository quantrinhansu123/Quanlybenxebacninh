/**
 * Vercel Serverless Function Handler
 * 
 * This file exports the Express app as a Vercel serverless function.
 * Vercel will automatically route all requests to this handler.
 * 
 * Note: Vercel will compile this TypeScript file automatically.
 * Make sure the server is built before deploying (npm run build).
 */

import { app } from '../src/index.js'

// Export the Express app as the default handler for Vercel
// Vercel's @vercel/node runtime will automatically handle Express apps
export default app
