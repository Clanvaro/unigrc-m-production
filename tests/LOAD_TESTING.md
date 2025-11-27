# Load Testing Guide

## Overview

This guide explains how to run load tests on the Unigrc application to validate performance optimizations, particularly for batch processing and database-level pagination.

## Prerequisites

- Application must be running (`npm run dev` or deployed)
- autocannon package is already installed in the project

## Running Load Tests

### Quick Start

```bash
# Start the application (if not already running)
npm run dev

# In a new terminal, run load tests
npx tsx tests/load-test.ts
```

### Custom Base URL

To test against a deployed instance:

```bash
BASE_URL=https://your-domain.replit.app npx tsx tests/load-test.ts
```

## Test Configuration

The load tests are configured to:
- Use **10 concurrent connections**
- Run for **10 seconds** per endpoint
- Test multiple optimized endpoints

### Tested Endpoints

1. **Risks List (Paginated)** - `/api/risks?page=1&limit=20`
   - Tests database-level pagination
   - Validates memory efficiency

2. **Audits List (Paginated)** - `/api/audits?page=1&limit=20`
   - Tests database-level filtering
   - Validates query performance

3. **Admin Dashboard** - `/api/dashboard/admin`
   - Tests aggregated metrics
   - Validates complex query optimization

4. **Process Owners** - `/api/process-owners`
   - Tests cached data retrieval
   - Used by notification scheduler

5. **Health Check** - `/health`
   - Tests observability endpoint
   - No authentication required

6. **Metrics** - `/metrics`
   - Tests performance monitoring
   - Validates metrics collection

## Performance Benchmarks

### Latency Targets

| Metric | Excellent | Good | Needs Improvement |
|--------|-----------|------|-------------------|
| Avg Latency | < 200ms | < 500ms | > 500ms |
| P95 Latency | < 1000ms | < 2000ms | > 2000ms |
| Error Rate | < 1% | < 5% | > 5% |

### Expected Results

With the optimizations implemented:

1. **Paginated Endpoints**: Should handle 10 concurrent connections with avg latency < 200ms
2. **Dashboard**: May show higher latency (500-1000ms) due to aggregation, but should remain stable
3. **Health/Metrics**: Should respond in < 50ms consistently

## Interpreting Results

### Sample Output

```
📊 Results:
   Total Requests: 1234
   Duration: 10s
   Avg Latency: 145.32ms
   P95 Latency: 287.45ms
   Requests/sec: 123.40
   Throughput: 2.45 MB/s
   Errors: 0 (0.00%)
```

### Key Metrics

- **Total Requests**: Higher is better (indicates throughput)
- **Avg Latency**: Lower is better (user experience)
- **P95 Latency**: 95% of requests complete within this time
- **Requests/sec**: Server throughput capacity
- **Errors**: Should be 0% or very low

## Optimizations Validated

The load tests validate the following optimizations:

### 1. Database-Level Pagination
- **Before**: Load all records → filter in memory → slice → return
- **After**: Apply filters and pagination at SQL level
- **Benefit**: O(1) memory usage, faster response times

### 2. Batch Processing (notification-scheduler.ts)
- **Before**: Sequential database calls for each notification
- **After**: Batch queries, cached owner map, parallel notification creation
- **Benefit**: Reduced database round-trips, faster processing

### 3. Whistleblower Workflow Optimization
- **Before**: Sequential case processing
- **After**: Batch processing (20 cases), parallel Promise.all
- **Benefit**: Faster workflow execution, reduced latency

## Troubleshooting

### Authentication Errors (401)

Some endpoints require authentication. To test authenticated endpoints:

1. Login to the application
2. Get session cookie from browser DevTools
3. Update the test script headers:

```typescript
headers: {
  'Content-Type': 'application/json',
  'Cookie': 'connect.sid=YOUR_SESSION_COOKIE'
}
```

### Connection Refused

Ensure the application is running:

```bash
# Check if server is running
curl http://localhost:5000/health

# If not, start the application
npm run dev
```

### High Error Rates

If you see high error rates (> 5%):

1. Check server logs for errors
2. Verify database connectivity
3. Reduce concurrent connections in test config
4. Check for rate limiting issues

## Advanced Testing

### Custom Test Configuration

Edit `tests/load-test.ts` to customize:

```typescript
const instance = autocannon({
  url: config.url,
  method: config.method,
  connections: 20,    // Increase for stress testing
  duration: 30,       // Longer duration
  pipelining: 1,      // HTTP pipelining
});
```

### Stress Testing

To find breaking points:

```bash
# Gradually increase connections
connections: 50
connections: 100
connections: 200
```

## Performance Monitoring

After running load tests, check:

1. **Metrics Endpoint**: `GET /metrics` for P95 latency trends
2. **Neon Dashboard**: Check database connection pool usage
3. **Server Logs**: Look for slow query warnings

## Best Practices

1. **Run tests during development** - Catch performance regressions early
2. **Test before deployment** - Validate optimizations work in production
3. **Compare results** - Track performance improvements over time
4. **Monitor in production** - Use `/metrics` endpoint for real-world data

## Related Documentation

- `replit.md` - Project architecture and optimizations
- `server/notification-scheduler.ts` - Batch processing implementation
- `server/storage.ts` - Pagination methods
