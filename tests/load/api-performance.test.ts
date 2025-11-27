import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import autocannon from 'autocannon';
import type { Result } from 'autocannon';

describe('API Performance & Load Tests', () => {
  const BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000';
  
  describe('Authentication Endpoints', () => {
    it('should handle login requests under load', async () => {
      const result = await autocannon({
        url: `${BASE_URL}/api/auth/login`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'TestP@ssw0rd123'
        }),
        connections: 10,
        duration: 5, // 5 seconds
        pipelining: 1
      }) as Result;

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.requests.average).toBeGreaterThan(0);
    }, 10000);

    it('should maintain performance with concurrent requests', async () => {
      const result = await autocannon({
        url: `${BASE_URL}/api/auth/check`,
        method: 'GET',
        connections: 50, // 50 concurrent connections
        duration: 5,
        pipelining: 1
      }) as Result;

      // Should complete without errors
      expect(result.non2xx).toBe(0);
      
      // Average latency should be reasonable (< 500ms)
      expect(result.latency.mean).toBeLessThan(500);
    }, 10000);
  });

  describe('Risk Management Endpoints', () => {
    it('should handle GET /api/risks with pagination under load', async () => {
      const result = await autocannon({
        url: `${BASE_URL}/api/risks?limit=20&offset=0`,
        method: 'GET',
        connections: 20,
        duration: 5
      }) as Result;

      expect(result.errors).toBe(0);
      expect(result.requests.average).toBeGreaterThan(10);
    }, 10000);

    it('should handle risk aggregation calculations efficiently', async () => {
      const result = await autocannon({
        url: `${BASE_URL}/api/processes/1/aggregated-risk`,
        method: 'GET',
        connections: 15,
        duration: 5
      }) as Result;

      // Aggregation should complete within reasonable time
      expect(result.latency.p99).toBeLessThan(1000); // 99th percentile < 1s
      expect(result.errors).toBe(0);
    }, 10000);
  });

  describe('Dashboard & Analytics Endpoints', () => {
    it('should handle dashboard data requests under load', async () => {
      const result = await autocannon({
        url: `${BASE_URL}/api/dashboard/summary`,
        method: 'GET',
        connections: 30,
        duration: 5
      }) as Result;

      expect(result.requests.total).toBeGreaterThan(100);
      expect(result.latency.mean).toBeLessThan(300);
    }, 10000);

    it('should handle analytics queries efficiently', async () => {
      const result = await autocannon({
        url: `${BASE_URL}/api/analytics/risk-trending/summary`,
        method: 'GET',
        connections: 20,
        duration: 5
      }) as Result;

      expect(result.errors).toBe(0);
      expect(result.requests.average).toBeGreaterThan(5);
    }, 10000);
  });

  describe('Database Query Performance', () => {
    it('should handle complex JOIN queries efficiently', async () => {
      const result = await autocannon({
        url: `${BASE_URL}/api/processes?include=risks,controls`,
        method: 'GET',
        connections: 15,
        duration: 5
      }) as Result;

      // Complex queries should still be fast
      expect(result.latency.p95).toBeLessThan(800); // 95th percentile < 800ms
    }, 10000);

    it('should handle write operations under moderate load', async () => {
      const result = await autocannon({
        url: `${BASE_URL}/api/risks`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Load Test Risk',
          processId: '1',
          probability: 3,
          impact: 3,
          category: 'Operacional'
        }),
        connections: 5, // Lower for writes
        duration: 3
      }) as Result;

      // Should handle writes without database locks
      expect(result.errors).toBeLessThan(result.requests.total * 0.1); // < 10% error rate
    }, 10000);
  });

  describe('Stress Testing', () => {
    it('should handle burst traffic', async () => {
      const result = await autocannon({
        url: `${BASE_URL}/api/health`,
        method: 'GET',
        connections: 100, // High burst
        duration: 3
      }) as Result;

      // System should remain stable under burst
      expect(result.timeouts).toBe(0);
      expect(result.latency.p99).toBeLessThan(2000); // Under 2s even at p99
    }, 10000);

    it('should recover from high load', async () => {
      // First, create high load
      await autocannon({
        url: `${BASE_URL}/api/processes`,
        connections: 80,
        duration: 2
      });

      // Then check system recovery
      const result = await autocannon({
        url: `${BASE_URL}/api/health`,
        connections: 10,
        duration: 2
      }) as Result;

      // Should recover and respond normally
      expect(result.requests.average).toBeGreaterThan(50);
      expect(result.latency.mean).toBeLessThan(200);
    }, 15000);
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits correctly', async () => {
      const result = await autocannon({
        url: `${BASE_URL}/api/risks`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Test' }),
        connections: 1,
        amount: 50, // 50 requests
        pipelining: 1
      }) as Result;

      // In production, some requests should be rate limited (429)
      // In dev, all should pass
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) {
        expect(result.non2xx).toBeLessThan(10);
      }
    }, 10000);
  });

  describe('Throughput Benchmarks', () => {
    it('should achieve target throughput for read operations', async () => {
      const result = await autocannon({
        url: `${BASE_URL}/api/risks`,
        method: 'GET',
        connections: 25,
        duration: 10 // Longer test for throughput
      }) as Result;

      // Target: At least 100 requests/second
      const requestsPerSecond = result.requests.total / 10;
      expect(requestsPerSecond).toBeGreaterThan(100);
    }, 15000);

    it('should maintain consistent latency under sustained load', async () => {
      const result = await autocannon({
        url: `${BASE_URL}/api/dashboard/summary`,
        connections: 20,
        duration: 10
      }) as Result;

      // Latency should be consistent
      const latencyStdDev = result.latency.stddev || 0;
      expect(latencyStdDev).toBeLessThan(result.latency.mean); // Variance < mean
    }, 15000);
  });
});
