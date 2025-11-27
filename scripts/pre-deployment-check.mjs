#!/usr/bin/env node
/**
 * Pre-Deployment Validation Script
 * Runs critical checks before deployment to prevent common errors
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'CSRF_SECRET',
  'PORT'
];

const INSECURE_DEFAULTS = {
  'SESSION_SECRET': 'your-secret-key-here',
  'CSRF_SECRET': 'csrf-secret-key-change-in-production'
};

let errors = [];
let warnings = [];
let passed = [];

console.log('\n🔍 Pre-Deployment Validation\n');
console.log('═'.repeat(50));

// Check 1: NODE_ENV
console.log('\n📋 Checking Environment Configuration...');
const nodeEnv = process.env.NODE_ENV;
if (nodeEnv === 'production') {
  passed.push('✓ NODE_ENV set to production');
} else {
  warnings.push(`⚠ NODE_ENV is "${nodeEnv}" - should be "production" for deployment`);
}

// Check 2: Required Environment Variables
console.log('\n📋 Checking Required Environment Variables...');
for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    errors.push(`✗ Missing required environment variable: ${envVar}`);
  } else {
    // Check for insecure defaults
    if (INSECURE_DEFAULTS[envVar] && process.env[envVar] === INSECURE_DEFAULTS[envVar]) {
      errors.push(`✗ ${envVar} is using insecure default value`);
    } else {
      passed.push(`✓ ${envVar} is configured`);
    }
  }
}

// Check 3: Database URL Format
console.log('\n📋 Validating Database Connection...');
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
    passed.push('✓ DATABASE_URL format is valid');
    
    // Check for password in URL
    if (!dbUrl.includes(':') || !dbUrl.includes('@')) {
      warnings.push('⚠ DATABASE_URL might be missing credentials');
    }
  } else {
    errors.push('✗ DATABASE_URL must start with postgres:// or postgresql://');
  }
}

// Check 4: PORT Configuration
console.log('\n📋 Checking Port Configuration...');
const port = process.env.PORT || '5000';
if (port === '5000') {
  passed.push('✓ PORT is set to 5000 (Replit default)');
} else {
  warnings.push(`⚠ PORT is set to ${port} - Replit expects 5000`);
}

// Check 5: Build artifacts (WARNING only, not ERROR)
console.log('\n📋 Checking Build Artifacts...');
try {
  const distPath = join(__dirname, '..', 'dist', 'index.js');
  readFileSync(distPath);
  passed.push('✓ Build artifacts exist (dist/index.js)');
} catch (error) {
  warnings.push('⚠ Build artifacts not found - run "npm run build" before deploying');
}

// Check 6: Package.json scripts
console.log('\n📋 Validating Package.json Scripts...');
try {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
  );
  
  if (packageJson.scripts?.start) {
    passed.push('✓ "start" script is defined');
  } else {
    errors.push('✗ Missing "start" script in package.json');
  }
  
  if (packageJson.scripts?.build) {
    passed.push('✓ "build" script is defined');
  } else {
    errors.push('✗ Missing "build" script in package.json');
  }
} catch (error) {
  errors.push('✗ Failed to read package.json');
}

// Check 7: .replit configuration
console.log('\n📋 Checking .replit Configuration...');
try {
  const replitConfig = readFileSync(join(__dirname, '..', '.replit'), 'utf-8');
  
  // Count port configurations
  const portMatches = replitConfig.match(/\[\[ports\]\]/g);
  const portCount = portMatches ? portMatches.length : 0;
  
  if (portCount === 1) {
    passed.push('✓ Only one port is exposed (Replit requirement)');
  } else if (portCount > 1) {
    errors.push(`✗ Multiple ports (${portCount}) are exposed - Replit Autoscale/VM only supports ONE external port`);
  }
  
  // Check if port 5000 is configured
  if (replitConfig.includes('localPort = 5000')) {
    passed.push('✓ Port 5000 is configured');
  } else {
    warnings.push('⚠ Port 5000 not found in .replit - verify configuration');
  }
  
  // Check deployment config
  if (replitConfig.includes('[deployment]')) {
    passed.push('✓ Deployment configuration exists');
  } else {
    warnings.push('⚠ No deployment configuration found in .replit');
  }
} catch (error) {
  warnings.push('⚠ Could not read .replit file');
}

// Print Results
console.log('\n' + '═'.repeat(50));
console.log('\n📊 VALIDATION RESULTS\n');

if (passed.length > 0) {
  console.log('✅ Passed Checks:');
  passed.forEach(msg => console.log(`   ${msg}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(msg => console.log(`   ${msg}`));
}

if (errors.length > 0) {
  console.log('\n❌ Critical Errors:');
  errors.forEach(msg => console.log(`   ${msg}`));
}

console.log('\n' + '═'.repeat(50));

// Exit with appropriate code
if (errors.length > 0) {
  console.log('\n❌ PRE-DEPLOYMENT VALIDATION FAILED');
  console.log('   Fix the errors above before deploying\n');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️  PRE-DEPLOYMENT VALIDATION PASSED WITH WARNINGS');
  console.log('   Review warnings before deploying\n');
  process.exit(0);
} else {
  console.log('\n✅ PRE-DEPLOYMENT VALIDATION PASSED');
  console.log('   Ready for deployment!\n');
  process.exit(0);
}
