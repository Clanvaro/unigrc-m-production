/**
 * SMOKE TEST - Post-Deployment Validation
 * 
 * This script runs basic checks to ensure the application is working
 * after deployment or restart. Run this before considering a deployment successful.
 * 
 * Usage:
 *   npm run smoke-test
 *   or
 *   tsx scripts/smoke-test.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({
      name,
      passed: true,
      duration: Date.now() - start
    });
    console.log(`✅ ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start
    });
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchJSON(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function runSmokeTests() {
  console.log('🔥 Starting smoke tests...');
  console.log(`   Base URL: ${BASE_URL}\n`);

  // Test 1: Health check
  await test('Health endpoint responds', async () => {
    const data = await fetchJSON('/health');
    if (data.status !== 'healthy') {
      throw new Error(`Expected status 'healthy', got '${data.status}'`);
    }
    if (!data.services?.database || !data.services?.objectStorage) {
      throw new Error('Missing service health information');
    }
  });

  // Test 2: Version endpoint
  await test('Version endpoint responds', async () => {
    const data = await fetchJSON('/version');
    if (!data.version) {
      throw new Error('Missing version information');
    }
  });

  // Test 3: Metrics endpoint
  await test('Metrics endpoint responds', async () => {
    const data = await fetchJSON('/metrics');
    if (!data.global || typeof data.global.totalRequests !== 'number') {
      throw new Error('Missing or invalid metrics data');
    }
  });

  // Test 4: Static frontend loads
  await test('Frontend loads', async () => {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      throw new Error(`Frontend returned ${response.status}`);
    }
    const html = await response.text();
    if (!html.includes('<!DOCTYPE html') && !html.includes('<!doctype html')) {
      throw new Error('Response does not appear to be HTML');
    }
  });

  // Test 5: API endpoint (unauthenticated but should return proper error)
  await test('API responds to requests', async () => {
    const response = await fetch(`${BASE_URL}/api/risks`);
    // Should return 401 (unauthorized) or 200 (if public), but not 500
    if (response.status >= 500) {
      throw new Error(`API returned server error: ${response.status}`);
    }
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SMOKE TEST RESULTS');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`\n✅ Passed: ${passed}/${total}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${total}`);
  }
  
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  console.log(`⏱️  Total time: ${totalDuration}ms\n`);

  // Exit with error code if any test failed
  if (failed > 0) {
    console.error('❌ Smoke tests FAILED!');
    process.exit(1);
  }

  console.log('✅ All smoke tests passed!');
  process.exit(0);
}

// Run tests
runSmokeTests().catch((error) => {
  console.error('💥 Unexpected error during smoke tests:', error);
  process.exit(1);
});
