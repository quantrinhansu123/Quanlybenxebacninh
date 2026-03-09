/**
 * Import Vehicle Badges from JSON file exported from old Firebase
 *
 * Usage:
 *   1. Place the exported JSON file as: ./data/PHUHIEUXE.json
 *   2. Run: npx tsx src/scripts/import-vehicle-badges-json.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

dotenv.config()

// Configuration
const CONFIG = {
  // Path to the exported JSON file from old Firebase
  JSON_FILE_PATH: './data/PHUHIEUXE.json',

  // Destination path in new Firebase
  DESTINATION_PATH: 'datasheet/PHUHIEUXE',

  // New Firebase config
  DATABASE_URL: process.env.RTDB_URL || 'https://benxe-management-20251218-default-rtdb.asia-southeast1.firebasedatabase.app/',
  SERVICE_ACCOUNT_PATH: process.env.SERVICE_ACCOUNT_PATH || './benxe-management-20251218-firebase-adminsdk.json',

  // Batch size
  BATCH_SIZE: 500,
}

async function main() {
  console.log('='.repeat(50))
  console.log('IMPORT VEHICLE BADGES FROM JSON')
  console.log('='.repeat(50))
  console.log('')

  // Check if JSON file exists
  const jsonFilePath = resolve(process.cwd(), CONFIG.JSON_FILE_PATH)
  if (!existsSync(jsonFilePath)) {
    console.error(`File not found: ${jsonFilePath}`)
    console.log('')
    console.log('Please place the exported JSON file at:')
    console.log(`  ${jsonFilePath}`)
    console.log('')
    console.log('Or update JSON_FILE_PATH in the script.')
    process.exit(1)
  }

  // Read JSON file
  console.log(`Reading: ${jsonFilePath}`)
  const jsonContent = readFileSync(jsonFilePath, 'utf-8')
  const data = JSON.parse(jsonContent)

  const keys = Object.keys(data)
  console.log(`Found ${keys.length.toLocaleString()} records`)
  console.log('')

  // Initialize Firebase
  const serviceAccountPath = resolve(process.cwd(), CONFIG.SERVICE_ACCOUNT_PATH)
  if (!existsSync(serviceAccountPath)) {
    console.error(`Service account not found: ${serviceAccountPath}`)
    process.exit(1)
  }

  if (!getApps().length) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: CONFIG.DATABASE_URL
    })
  }

  const db = getDatabase()
  console.log(`Connected to: ${CONFIG.DATABASE_URL}`)
  console.log(`Destination: ${CONFIG.DESTINATION_PATH}`)
  console.log('')

  // Import in batches
  console.log('Starting import...')
  console.log('-'.repeat(50))

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

    // Small delay
    if (i + CONFIG.BATCH_SIZE < keys.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Summary
  console.log('')
  console.log('='.repeat(50))
  console.log('RESULT')
  console.log('='.repeat(50))
  console.log(`Success: ${success.toLocaleString()}`)
  console.log(`Failed: ${failed.toLocaleString()}`)
  console.log('')

  // Verify
  const snapshot = await db.ref(CONFIG.DESTINATION_PATH).once('value')
  const newData = snapshot.val()
  const newCount = newData ? Object.keys(newData).length : 0
  console.log(`Verification: ${newCount.toLocaleString()} records in database`)

  if (newCount === keys.length) {
    console.log('Import completed successfully!')
  } else {
    console.log('Warning: Record count mismatch')
  }

  process.exit(0)
}

main().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})
