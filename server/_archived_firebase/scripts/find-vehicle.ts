import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

dotenv.config()

const serviceAccount = JSON.parse(readFileSync(resolve(process.cwd(), process.env.SERVICE_ACCOUNT_PATH!), 'utf-8'))

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.RTDB_URL
  })
}
const db = getDatabase()

const plateToFind = process.argv[2] || '98H07480'

async function find() {
  console.log(`Searching for plate: ${plateToFind}`)
  
  // Check in datasheet/Xe (migrated data)
  console.log('\n1. Checking datasheet/Xe...')
  const xeSnap = await db.ref('datasheet/Xe').once('value')
  const xeData = xeSnap.val()
  
  if (xeData) {
    let found = false
    for (const [key, xe] of Object.entries(xeData)) {
      const x = xe as any
      if (x.plate_number === plateToFind || x.BienSo === plateToFind) {
        console.log('Found in datasheet/Xe:', key)
        console.log(JSON.stringify(x, null, 2).slice(0, 800))
        found = true
        break
      }
    }
    if (!found) {
      console.log('Not found in datasheet/Xe')
    }
  }
  
  // Check in vehicles collection
  console.log('\n2. Checking vehicles...')
  const vehSnap = await db.ref('vehicles').once('value')
  const vehData = vehSnap.val()
  
  if (vehData) {
    let found = false
    for (const [key, veh] of Object.entries(vehData)) {
      const v = veh as any
      if (v.plate_number === plateToFind || v.plateNumber === plateToFind) {
        console.log('Found in vehicles:', key)
        console.log(JSON.stringify(v, null, 2).slice(0, 800))
        found = true
        break
      }
    }
    if (!found) {
      console.log('Not found in vehicles. Total vehicles:', Object.keys(vehData).length)
    }
  } else {
    console.log('vehicles collection is empty')
  }
  
  process.exit(0)
}

find().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
