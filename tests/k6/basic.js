/**
 * Prueba básica de estrés - Endpoints principales
 * 
 * Esta prueba verifica que los endpoints más usados puedan manejar carga básica
 * 
 * Ejecutar: k6 run tests/k6/basic.js
 * O con variables: BASE_URL=https://tu-backend.run.app k6 run tests/k6/basic.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas personalizadas
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');

// Configuración
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up: 0 a 20 usuarios en 30s
    { duration: '1m', target: 50 },   // Ramp up: 20 a 50 usuarios en 1m
    { duration: '2m', target: 50 },    // Mantener 50 usuarios por 2m
    { duration: '30s', target: 0 },    // Ramp down: 50 a 0 usuarios en 30s
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // 95% < 1s, 99% < 2s
    http_req_failed: ['rate<0.01'],                   // < 1% errores
    errors: ['rate<0.01'],                            // < 1% errores personalizados
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  // Test 1: Dashboard/Health check
  const healthRes = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'Health Check' },
  });
  
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  requestDuration.add(healthRes.timings.duration);
  sleep(1);

  // Test 2: Auth user (endpoint común)
  const authRes = http.get(`${BASE_URL}/api/auth/user`, {
    tags: { name: 'Auth User' },
  });
  
  check(authRes, {
    'auth user status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  }) || errorRate.add(1);
  
  requestDuration.add(authRes.timings.duration);
  sleep(1);

  // Test 3: Processes (catálogo básico)
  const processesRes = http.get(`${BASE_URL}/api/processes`, {
    tags: { name: 'Processes' },
  });
  
  check(processesRes, {
    'processes status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  }) || errorRate.add(1);
  
  requestDuration.add(processesRes.timings.duration);
  sleep(2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/k6/results/basic-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n';
  summary += `${indent}✓ Test completado\n`;
  summary += `${indent}  Duración total: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  summary += `${indent}  Requests totales: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Requests/segundo: ${data.metrics.http_reqs.values.rate.toFixed(2)}\n`;
  summary += `${indent}  Latencia promedio: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Latencia p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  Latencia p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `${indent}  Errores: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  
  return summary;
}
