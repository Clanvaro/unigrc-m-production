import { beforeAll, afterAll, afterEach } from 'vitest';
import { config } from 'dotenv';

// Load environment variables for testing
config();

// Ensure test environment
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret-key-for-testing-only';
process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-csrf-secret-key-for-testing-only';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Test suite starting...');
});

afterAll(async () => {
  console.log('✅ Test suite completed');
});

// Clean up after each test
afterEach(() => {
  // Reset mocks if needed
});
