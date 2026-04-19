import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = "postgresql://postgres.vzeidlzossqjtadmjfgf:Tranvandung2001%40@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require";
const client = postgres(connectionString);

async function check() {
  try {
    const routeCode = '0424.1812.A';
    
    // 1. Get schedule operators
    console.log(`--- Checking Route: ${routeCode} ---`);
    const schedules = await client`SELECT DISTINCT operator_id FROM schedules WHERE route_id = (SELECT id FROM routes WHERE route_code = ${routeCode})`;
    
    if (schedules.length === 0) {
      console.log("No schedules found for this route.");
    } else {
      for (const row of schedules) {
        const ops = await client`SELECT id, name FROM operators WHERE id = ${row.operator_id}`;
        console.log(`Schedule belongs to Operator: ${ops[0]?.name} (ID: ${ops[0]?.id})`);
      }
    }

    // 2. See what vehicles might be operating this route (via vehicle_badges)
    console.log('\n--- Checking Vehicles mapped to this Route via Badges ---');
    const badges = await client`SELECT vehicle_id, plate_number FROM vehicle_badges WHERE route_code = ${routeCode} OR route_id = (SELECT id FROM routes WHERE route_code = ${routeCode})`;
    
    if (badges.length === 0) {
      console.log("No vehicles found mapped to this route via badges.");
    } else {
      for (const b of badges) {
        if (b.vehicle_id) {
            const v = await client`SELECT id, plate_number, operator_id, operator_name FROM vehicles WHERE id = ${b.vehicle_id}`;
            if (v.length > 0) {
              const op = await client`SELECT id, name FROM operators WHERE id = ${v[0].operator_id}`;
              console.log(`Vehicle ${v[0].plate_number}: belongs to Operator: ${op[0] ? op[0].name : v[0].operator_name} (ID: ${v[0].operator_id})`);
            } else {
              console.log(`Vehicle mapped in badge not found in vehicles table, plate in badge: ${b.plate_number}`);
            }
        } else {
            console.log(`Badge without vehicle_id, plate: ${b.plate_number}`);
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

check();
