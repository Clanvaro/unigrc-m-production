/**
 * Quick Load Test
 * 
 * A simple, fast load test to quickly validate endpoint performance.
 * Run with: npx tsx tests/quick-load-test.ts
 */

import autocannon from 'autocannon';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function quickTest() {
  console.log('🚀 Running Quick Load Test...\n');
  console.log(`Target: ${BASE_URL}/health`);
  console.log('Duration: 5 seconds');
  console.log('Connections: 10\n');

  const result = await autocannon({
    url: `${BASE_URL}/health`,
    connections: 10,
    duration: 5,
  });

  console.log('\n📊 Results:');
  console.log(`   Requests: ${result.requests.total}`);
  console.log(`   Avg Latency: ${result.latency.mean.toFixed(2)}ms`);
  console.log(`   P95 Latency: ${result.latency.p95.toFixed(2)}ms`);
  console.log(`   Requests/sec: ${result.requests.mean.toFixed(2)}`);
  console.log(`   Throughput: ${(result.throughput.mean / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`   Errors: ${result.non2xx + result.timeouts}`);

  if (result.latency.mean < 50) {
    console.log('\n✅ Excellent performance!');
  } else if (result.latency.mean < 200) {
    console.log('\n✅ Good performance!');
  } else {
    console.log('\n⚠️  Performance could be improved');
  }

  console.log('\nRun full test suite with: npx tsx tests/load-test.ts\n');
}

quickTest().catch(console.error);
