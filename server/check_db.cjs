require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { Client } = require('pg')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required')
}

const client = new Client({ connectionString })

async function run() {
  await client.connect()
  console.log('Connected to DB')

  const res = await client.query(`SELECT * FROM routes WHERE name ILIKE '%Quế Võ - Cao Bằng%'`)
  console.log('Routes:', res.rows)

  if (res.rows.length > 0) {
    const routeId = res.rows[0].id
    const sch = await client.query(`SELECT * FROM schedules WHERE route_id = $1`, [routeId])
    console.log('Schedules:', sch.rows.length, 'entries')
    console.log(sch.rows)
  }

  await client.end()
}

run().catch(console.error)
