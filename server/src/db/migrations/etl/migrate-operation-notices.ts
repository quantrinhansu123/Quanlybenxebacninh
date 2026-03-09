import 'dotenv/config'
import { db } from '../../drizzle.js'
import { sql } from 'drizzle-orm'

async function migrate() {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS operation_notices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      route_code VARCHAR(50) NOT NULL,
      operator_ref VARCHAR(50),
      notice_number VARCHAR(100) NOT NULL,
      issue_date VARCHAR(20),
      effective_date VARCHAR(20),
      file_path TEXT,
      file_url TEXT,
      issuing_authority VARCHAR(255),
      status VARCHAR(50) DEFAULT 'Con hieu luc',
      notice_type VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `))
  console.log('Table created')

  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS notices_route_code_idx ON operation_notices(route_code)`))
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS notices_notice_number_idx ON operation_notices(notice_number)`))
  await db.execute(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS notices_route_notice_unique_idx ON operation_notices(route_code, notice_number)`))
  console.log('Indexes created')

  // Verify
  const result = await db.execute(sql.raw(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'operation_notices' ORDER BY ordinal_position`))
  console.log('Columns:', (result as any).map((r: any) => `${r.column_name} (${r.data_type})`).join(', '))
}

migrate().catch(e => { console.error(e); process.exit(1) })
