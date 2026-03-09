import 'dotenv/config';
import { db } from '../db/drizzle.js';
import { sql } from 'drizzle-orm';

async function main() {
  if (!db) {
    console.error('Database not initialized');
    process.exit(1);
  }

  console.log('Running additional migration...\n');

  const statements = [
    // Operators missing columns
    `ALTER TABLE operators ADD COLUMN IF NOT EXISTS representative_position VARCHAR(100)`,
    `ALTER TABLE operators ADD COLUMN IF NOT EXISTS province VARCHAR(100)`,
    `ALTER TABLE operators ADD COLUMN IF NOT EXISTS district VARCHAR(100)`,
    `ALTER TABLE operators ADD COLUMN IF NOT EXISTS is_ticket_delegated BOOLEAN DEFAULT FALSE`,

    // Dispatch records missing columns
    `ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS schedule_id UUID`,
    `ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS entry_by UUID REFERENCES users(id)`,
    `ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS passengers_arrived INTEGER`,
    `ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS boarding_permit_time TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12, 2)`,
    `ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS departure_order_time TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS exit_by UUID REFERENCES users(id)`,
    `ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS vehicle_operator_id UUID`,
    `ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS route_type VARCHAR(50)`,
    `ALTER TABLE dispatch_records ADD COLUMN IF NOT EXISTS driver_full_name VARCHAR(255)`,

    // Create indexes
    `CREATE INDEX IF NOT EXISTS dispatch_permit_status_idx ON dispatch_records(permit_status)`,
    `CREATE INDEX IF NOT EXISTS dispatch_boarding_permit_time_idx ON dispatch_records(boarding_permit_time)`,
  ];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 70);
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      await db.execute(sql.raw(stmt));
      console.log('    ✓ OK');
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.code === '42701') {
        console.log('    ⊘ Already exists (skipped)');
      } else {
        console.error(`    ✗ Error: ${err.message}`);
      }
    }
  }

  console.log('\n✓ Additional migration completed!');
  process.exit(0);
}

main().catch(console.error);
