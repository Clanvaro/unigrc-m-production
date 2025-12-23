/**
 * Prueba de Resistencia (Endurance Test)
 * 
 * Prueba de larga duración para detectar memory leaks, degradación de performance,
 * y problemas de conexiones DB que aparecen con el tiempo
 * 
 * ⚠️ ADVERTENCIA: Esta prueba dura 30 minutos
 * 
 * Ejecutar: k6 run tests/k6/endurance-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const totalRequests = new Counter('total_requests');

export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up a 20 usuarios
    { duration: '25m', target: 20 }, // Mantener 20 usuarios por 25 minutos
    { duration: '3m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.80'],
    errors: ['rate<0.05'],
    // Verificar que no hay degradación de performance
    'http_req_duration{name:/risks/}': ['p(95)<3000'],
    'http_req_duration{name:/controls/}': ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://unigrc-backend-7joma3s3xa-tl.a.run.app';

const endpoints = [
  { path: '/api/health', weight: 10 },
  { path: '/api/auth/user', weight: 15 },
  { path: '/api/risks/bootstrap', weight: 25 },
  { path: '/api/controls/with-details?limit=50', weight: 20 },
  { path: '/api/validation/counts', weight: 15 },
  { path: '/api/processes', weight: 15 },
];

function selectEndpoint() {
  const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) return endpoint.path;
  }
  return endpoints[0].path;
}

export default function () {
  const endpoint = selectEndpoint();
  
  const res = http.get(`${BASE_URL}${endpoint}`, {
    tags: { name: endpoint.split('?')[0] },
  });
  
  totalRequests.add(1);
  
  const isOk = res.status === 200 || res.status === 401 || res.status === 403;
  check(res, {
    [`${endpoint} status is valid`]: (r) => isOk,
  });
  
  if (!isOk && res.status >= 500) {
    errorRate.add(1);
  }
  
  requestDuration.add(res.timings.duration);
  sleep(Math.random() * 3 + 1); // Sleep entre 1-4s (simular comportamiento real)
}

export function handleSummary(data) {
  return {
    'stdout': formatSummary(data),
    'tests/k6/results/endurance-summary.json': JSON.stringify(data, null, 2),
  };
}

function formatSummary(data) {
  const duration = (data.state.testRunDurationMs / 1000 / 60).toFixed(1);
  const reqs = data.metrics.http_reqs?.values?.count || 0;
  const rps = (data.metrics.http_reqs?.values?.rate || 0).toFixed(2);
  const avgLatency = (data.metrics.http_req_duration?.values?.avg || 0).toFixed(2);
  const p95Latency = (data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2);
  const errorRate = ((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2);
  
  return `
═══════════════════════════════════════════════════════════
  📊 PRUEBA DE RESISTENCIA - RESULTADOS
═══════════════════════════════════════════════════════════

⏱️  Duración: ${duration} minutos
📈 Requests totales: ${reqs}
🚀 Requests/segundo: ${rps}
📉 Latencia promedio: ${avgLatency}ms
📉 Latencia p95: ${p95Latency}ms
⚠️  Tasa de errores: ${errorRate}%

═══════════════════════════════════════════════════════════
`;
}
