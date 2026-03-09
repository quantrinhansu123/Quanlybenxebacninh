/**
 * Migrate Vehicle Badges from old Firebase (public) to new Firebase
 *
 * Old Firebase has public rules, so we can fetch directly via REST API.
 *
 * Usage:
 *   npx tsx src/scripts/migrate-vehicle-badges.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

dotenv.config()

// Configuration
const CONFIG = {
  // Old Firebase (public access)
  OLD_DATABASE_URL: 'https://webbenxe-default-rtdb.asia-southeast1.firebasedatabase.app',
  SOURCE_PATH: 'datasheet/PHUHIEUXE',

  // New Firebase
  NEW_DATABASE_URL: process.env.RTDB_URL || 'https://benxe-management-20251218-default-rtdb.asia-southeast1.firebasedatabase.app/',
  SERVICE_ACCOUNT_PATH: process.env.SERVICE_ACCOUNT_PATH || './benxe-management-20251218-firebase-adminsdk.json',
  DESTINATION_PATH: 'datasheet/PHUHIEUXE',

  // Batch size
  BATCH_SIZE: 500,
}

async function main() {
  console.log('='.repeat(60))
  console.log('MIGRATE VEHICLE BADGES')
  console.log('From: webbenxe (public)')
  console.log('To:   benxe-management-20251218')
  console.log('='.repeat(60))
  console.log('')

  // Step 1: Fetch from old Firebase (public REST API)
  const sourceUrl = `${CONFIG.OLD_DATABASE_URL}/${CONFIG.SOURCE_PATH}.json`
  console.log(`Fetching from: ${sourceUrl}`)
  console.log('Please wait...')
  console.log('')

  const response = await fetch(sourceUrl)

  if (!response.ok) {
    console.error(`Failed to fetch: ${response.status} ${response.statusText}`)
    process.exit(1)
  }

  const data = await response.json() as Record<string, any>

  if (!data) {
    console.log('No data found!')
    process.exit(1)
  }

  const keys = Object.keys(data)
  console.log(`Found ${keys.length.toLocaleString()} records`)
  console.log('')

  // Step 2: Connect to new Firebase
  const serviceAccountPath = resolve(process.cwd(), CONFIG.SERVICE_ACCOUNT_PATH)
  if (!existsSync(serviceAccountPath)) {
    console.error(`Service account not found: ${serviceAccountPath}`)
    console.log('Please check SERVICE_ACCOUNT_PATH in .env')
    process.exit(1)
  }

  if (!getApps().length) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: CONFIG.NEW_DATABASE_URL
    })
  }

  const db = getDatabase()
  console.log(`Connected to: ${CONFIG.NEW_DATABASE_URL}`)
  console.log(`Destination: ${CONFIG.DESTINATION_PATH}`)
  console.log('')

  // Step 3: Import in batches
  console.log('Starting import...')
  console.log('-'.repeat(60))

  let success = 0
  let failed = 0
  const totalBatches = Math.ceil(keys.length / CONFIG.BATCH_SIZE)

  for (let i = 0; i < keys.length; i += CONFIG.BATCH_SIZE) {
    const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1
    const batchKeys = keys.slice(i, i + CONFIG.BATCH_SIZE)
    const batchData: Record<string, any> = {}

    for (const key of batchKeys) {
      batchData[key] = data[key]
    }

    try {
      await db.ref(CONFIG.DESTINATION_PATH).update(batchData)
      success += batchKeys.length

      const progress = ((i + batchKeys.length) / keys.length * 100).toFixed(1)
      console.log(`Batch ${batchNum}/${totalBatches}: ${batchKeys.length} records (${progress}%)`)
    } catch (error: any) {
      failed += batchKeys.length
      console.error(`Batch ${batchNum} FAILED: ${error.message}`)
    }

    // Small delay to avoid rate limiting
    if (i + CONFIG.BATCH_SIZE < keys.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Summary
  console.log('')
  console.log('='.repeat(60))
  console.log('RESULT')
  console.log('='.repeat(60))
  console.log(`Success: ${success.toLocaleString()}`)
  console.log(`Failed: ${failed.toLocaleString()}`)
  console.log('')

  // Verify
  console.log('Verifying...')
  const snapshot = await db.ref(CONFIG.DESTINATION_PATH).once('value')
  const newData = snapshot.val()
  const newCount = newData ? Object.keys(newData).length : 0
  console.log(`Old database: ${keys.length.toLocaleString()} records`)
  console.log(`New database: ${newCount.toLocaleString()} records`)
  console.log('')

  if (newCount >= keys.length) {
    console.log('Migration completed successfully!')
  } else {
    console.log('Warning: Some records may be missing')
  }

  process.exit(0)
}

main().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})
