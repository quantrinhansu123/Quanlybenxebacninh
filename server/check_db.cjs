const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.vzeidlzossqjtadmjfgf:Tranvandung2001%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require'
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  
  // Search for the route
  const res = await client.query(`SELECT * FROM routes WHERE name ILIKE '%Quế Võ - Cao Bằng%'`);
  console.log('Routes:', res.rows);
  
  if (res.rows.length > 0) {
    const routeId = res.rows[0].id;
    const sch = await client.query(`SELECT * FROM schedules WHERE route_id = $1`, [routeId]);
    console.log('Schedules:', sch.rows.length, 'entries');
    console.log(sch.rows);
  }
  
  await client.end();
}

run().catch(console.error);
