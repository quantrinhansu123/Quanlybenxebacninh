import 'dotenv/config';
import { db } from '../db/drizzle.js';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!db) {
    console.error('Database not initialized');
    process.exit(1);
  }

  console.log('Running manual migration...\n');

  // Read the SQL file
  const sqlPath = resolve(__dirname, '../db/migrations/manual/001-add-missing-columns.sql');
  const sqlContent = readFileSync(sqlPath, 'utf-8');

  // Split by statement (simple split on semicolons outside of $$ blocks)
  const statements = sqlContent
    .split(/;\s*(?=(?:[^$]*\$\$[^$]*\$\$)*[^$]*$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      await db.execute(sql.raw(stmt + ';'));
      console.log('    ✓ OK');
    } catch (err: any) {
      // Ignore "already exists" errors
      if (err.message?.includes('already exists') || err.code === '42701') {
        console.log('    ⊘ Already exists (skipped)');
      } else {
        console.error(`    ✗ Error: ${err.message}`);
      }
    }
  }

  console.log('\n✓ Migration completed!');
  process.exit(0);
}

main().catch(console.error);
