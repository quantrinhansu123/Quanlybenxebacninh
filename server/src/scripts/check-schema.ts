import 'dotenv/config';
import { db } from '../db/drizzle.js';
import { sql } from 'drizzle-orm';

async function main() {
  if (!db) {
    console.error('Database not initialized');
    process.exit(1);
  }

  // Get columns for dispatch_records
  const dispatchCols = await db.execute(sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'dispatch_records'
    ORDER BY ordinal_position
  `);
  console.log('\n=== dispatch_records columns ===');
  const dispatchRows = Array.isArray(dispatchCols) ? dispatchCols : [];
  dispatchRows.forEach((row: any) => console.log(`  ${row.column_name}: ${row.data_type}`));

  // Get columns for operators
  const operatorCols = await db.execute(sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'operators'
    ORDER BY ordinal_position
  `);
  console.log('\n=== operators columns ===');
  const operatorRows = Array.isArray(operatorCols) ? operatorCols : [];
  operatorRows.forEach((row: any) => console.log(`  ${row.column_name}: ${row.data_type}`));

  // Get CHECK constraints
  const checks = await db.execute(sql`
    SELECT conname, conrelid::regclass AS table_name
    FROM pg_constraint
    WHERE contype = 'c'
    AND connamespace = 'public'::regnamespace
  `);
  console.log('\n=== CHECK constraints ===');
  const checkRows = Array.isArray(checks) ? checks : [];
  checkRows.forEach((row: any) => console.log(`  ${row.table_name}: ${row.conname}`));

  process.exit(0);
}

main().catch(console.error);
