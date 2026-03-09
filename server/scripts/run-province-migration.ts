/**
 * Migration script: Backfill operator province/district from Firebase export
 * Run with: npx tsx scripts/run-province-migration.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../src/db/drizzle';
import * as fs from 'fs';
import * as path from 'path';

interface OperatorData {
  firebase_id: string;
  province: string;
  district: string;
}

function normalizeProvince(prov: string): string {
  if (!prov) return '';
  prov = prov.trim();
  while (prov.startsWith('Tỉnh Tỉnh')) {
    prov = prov.replace('Tỉnh Tỉnh', 'Tỉnh');
  }
  return prov;
}

async function loadFirebaseData(): Promise<OperatorData[]> {
  const firebasePath = process.env.FIREBASE_EXPORT_PATH ||
    'E:\\Tải Xuống\\benxe-management-20251218-default-rtdb-export (1).json';

  console.log(`Loading Firebase export from: ${firebasePath}`);
  const content = fs.readFileSync(firebasePath, 'utf-8');
  const data = JSON.parse(content);

  const dvvt = data?.datasheet?.DONVIVANTAI || {};
  const operators: OperatorData[] = [];

  for (const [key, value] of Object.entries(dvvt)) {
    const v = value as Record<string, unknown>;
    const fbId = (v.id as string) || key;
    const province = normalizeProvince((v.province as string) || '');
    const district = ((v.district as string) || '').trim();

    if (province) {
      operators.push({
        firebase_id: fbId,
        province,
        district,
      });
    }
  }

  console.log(`Found ${operators.length} operators with province data`);
  return operators;
}

async function runMigration() {
  console.log('='.repeat(60));
  console.log('Migration: Backfill operator province from Firebase');
  console.log('='.repeat(60));

  const operators = await loadFirebaseData();

  if (!db) {
    throw new Error('Database not initialized. Check DATABASE_URL.');
  }

  // Process in batches of 100
  const batchSize = 100;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < operators.length; i += batchSize) {
    const batch = operators.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(operators.length / batchSize);

    // Build VALUES list
    const values = batch.map(op =>
      `('${op.firebase_id}', '${op.province.replace(/'/g, "''")}', '${op.district.replace(/'/g, "''")}')`
    ).join(',\n  ');

    const query = `
      UPDATE operators o
      SET
        province = v.province,
        district = v.district,
        updated_at = NOW()
      FROM (VALUES
        ${values}
      ) AS v(firebase_id, province, district)
      WHERE o.firebase_id = v.firebase_id
    `;

    try {
      await db.execute(sql.raw(query));
      updated += batch.length;
      console.log(`Batch ${batchNum}/${totalBatches}: Updated ${batch.length} operators`);
    } catch (error) {
      console.error(`Batch ${batchNum} failed:`, error);
      failed += batch.length;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${operators.length}`);
}

// Run migration
runMigration()
  .then(() => {
    console.log('\nMigration finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
