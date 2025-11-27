#!/usr/bin/env node
/**
 * Post-Deployment Smoke Tests
 * Validates critical functionality after deployment
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TIMEOUT = 10000; // 10 seconds

let passed = 0;
let failed = 0;

console.log('\n🧪 Post-Deployment Smoke Tests\n');
console.log('═'.repeat(50));
console.log(`\n🌐 Testing: ${BASE_URL}\n`);

/**
 * Test helper with timeout
 */
async function testEndpoint(name, url, expectedStatus = 200, checks = []) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Smoke-Test/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    // Check status
    if (response.status !== expectedStatus) {
      console.log(`❌ ${name}`);
      console.log(`   Expected status ${expectedStatus}, got ${response.status}`);
      failed++;
      return false;
    }
    
    // Parse JSON if applicable
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }
    
    // Run additional checks
    for (const check of checks) {
      if (!check(data, response)) {
        console.log(`❌ ${name}`);
        console.log(`   Check failed: ${check.name || 'custom check'}`);
        failed++;
        return false;
      }
    }
    
    console.log(`✅ ${name}`);
    passed++;
    return true;
  } catch (error) {
    console.log(`❌ ${name}`);
    if (error.name === 'AbortError') {
      console.log(`   Timeout after ${TIMEOUT}ms`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    failed++;
    return false;
  }
}

// Run tests
(async () => {
  console.log('📋 Testing Critical Endpoints...\n');
  
  // Test 1: Health Check
  await testEndpoint(
    'Health Check (/health)',
    `${BASE_URL}/health`,
    200,
    [
      (data) => data?.status === 'healthy' || data?.status === 'degraded',
      (data) => !!data?.timestamp,
      (data) => !!data?.services
    ]
  );
  
  // Test 2: API Root
  await testEndpoint(
    'API Root (/api)',
    `${BASE_URL}/api`,
    404 // Expected - no route handler for /api
  );
  
  // Test 3: Auth Endpoint
  await testEndpoint(
    'Auth Check (/api/auth/me)',
    `${BASE_URL}/api/auth/me`,
    200,
    [
      (data) => typeof data?.authenticated === 'boolean'
    ]
  );
  
  // Test 4: Static Assets (index.html)
  await testEndpoint(
    'Frontend Root (/)',
    `${BASE_URL}/`,
    200,
    [
      (_, response) => {
        const contentType = response.headers.get('content-type');
        return contentType && contentType.includes('text/html');
      }
    ]
  );
  
  // Test 5: Metrics Endpoint
  await testEndpoint(
    'Metrics (/metrics)',
    `${BASE_URL}/metrics`,
    200,
    [
      (data) => !!data?.timestamp,
      (data) => !!data?.global
    ]
  );
  
  // Test 6: Database Connectivity (via health)
  const healthData = await fetch(`${BASE_URL}/health`).then(r => r.json());
  if (healthData?.services?.database === 'up') {
    console.log('✅ Database Connectivity');
    passed++;
  } else {
    console.log('❌ Database Connectivity');
    console.log(`   Status: ${healthData?.services?.database || 'unknown'}`);
    failed++;
  }
  
  // Test 7: Environment Variables (via health)
  if (healthData?.services?.envVars === 'configured') {
    console.log('✅ Environment Variables');
    passed++;
  } else {
    console.log('⚠️  Environment Variables');
    console.log(`   Status: ${healthData?.services?.envVars || 'unknown'}`);
    // Don't fail - just warn
    passed++;
  }
  
  // Print Results
  console.log('\n' + '═'.repeat(50));
  console.log('\n📊 SMOKE TEST RESULTS\n');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('\n' + '═'.repeat(50));
  
  if (failed === 0) {
    console.log('\n✅ ALL SMOKE TESTS PASSED');
    console.log('   Deployment is healthy!\n');
    process.exit(0);
  } else {
    console.log('\n❌ SOME SMOKE TESTS FAILED');
    console.log('   Check the deployment and logs\n');
    process.exit(1);
  }
})();
