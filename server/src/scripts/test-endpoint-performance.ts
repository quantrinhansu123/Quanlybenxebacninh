/**
 * Test endpoint performance
 * Run: npx tsx server/src/scripts/test-endpoint-performance.ts
 */

const BASE_URL = 'http://localhost:3000';

const endpoints = [
  '/api/health',
  '/api/dashboard',
  '/api/vehicles',
  '/api/drivers',
  '/api/routes',
  '/api/operators',
  '/api/vehicle-badges',
];

async function testEndpoint(path: string): Promise<{ path: string; time: number; status: number; size: number }> {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    const data = await res.text();
    const time = performance.now() - start;
    return { path, time: Math.round(time), status: res.status, size: data.length };
  } catch (err: any) {
    return { path, time: -1, status: 0, size: 0 };
  }
}

async function main() {
  console.log('Testing endpoint performance...\n');
  console.log('Endpoint                     | Time (ms) | Status | Size');
  console.log('-'.repeat(60));

  for (const path of endpoints) {
    const result = await testEndpoint(path);
    const pathPadded = path.padEnd(28);
    const timePadded = result.time.toString().padStart(9);
    const statusPadded = result.status.toString().padStart(6);
    const sizePadded = (result.size / 1024).toFixed(1).padStart(8) + ' KB';

    // Color code based on time
    let indicator = '✓';
    if (result.time > 500) indicator = '⚠️';
    if (result.time > 1000) indicator = '❌';
    if (result.time < 0) indicator = '💥';

    console.log(`${indicator} ${pathPadded} | ${timePadded} | ${statusPadded} | ${sizePadded}`);
  }

  console.log('\nLegend: ✓ <500ms | ⚠️ 500-1000ms | ❌ >1000ms | 💥 Error');
}

main();
