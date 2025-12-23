/**
 * Prueba de carga completa - Todos los endpoints principales
 * 
 * Esta prueba simula un escenario real con múltiples usuarios
 * accediendo a diferentes endpoints simultáneamente.
 * 
 * ⚠️ ADVERTENCIA: Esta prueba genera carga significativa
 * Solo ejecutar en entornos de staging o con autorización
 * 
 * Ejecutar: k6 run tests/k6/full-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const endpointDurations = {};

// Configuración - Carga alta pero controlada
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up gradual
    { duration: '5m', target: 100 },  // Carga media
    { duration: '3m', target: 150 },   // Carga alta
    { duration: '2m', target: 150 }, // Mantener carga alta
    { duration: '1m', target: 100 },  // Reducir
    { duration: '1m', target: 50 },   // Reducir más
    { duration: '30s', target: 0 },   // Finalizar
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.02'], // < 2% errores permitidos en carga alta
    errors: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Lista de endpoints a probar
const endpoints = [
  { path: '/api/health', method: 'GET', weight: 5 },
  { path: '/api/auth/user', method: 'GET', weight: 10 },
  { path: '/api/risks/bootstrap', method: 'GET', weight: 20 },
  { path: '/api/controls/with-details?limit=50', method: 'GET', weight: 15 },
  { path: '/api/validation/counts', method: 'GET', weight: 10 },
  { path: '/api/processes', method: 'GET', weight: 10 },
  { path: '/api/macroprocesos', method: 'GET', weight: 10 },
  { path: '/api/gerencias', method: 'GET', weight: 5 },
  { path: '/api/process-owners', method: 'GET', weight: 5 },
  { path: '/api/risk-categories', method: 'GET', weight: 5 },
  { path: '/api/risks-overview', method: 'GET', weight: 5 },
];

// Crear métricas para cada endpoint
endpoints.forEach(endpoint => {
  const metricName = endpoint.path.replace(/[^a-zA-Z0-9]/g, '_');
  endpointDurations[metricName] = new Trend(`${metricName}_duration`);
});

function getSessionHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

// Seleccionar endpoint basado en peso (weighted random)
function selectEndpoint() {
  const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint;
    }
  }
  return endpoints[0];
}

export default function () {
  const endpoint = selectEndpoint();
  const url = `${BASE_URL}${endpoint.path}`;
  const metricName = endpoint.path.replace(/[^a-zA-Z0-9]/g, '_');
  
  const startTime = Date.now();
  let res;
  
  if (endpoint.method === 'GET') {
    res = http.get(url, {
      headers: getSessionHeaders(),
      tags: { name: endpoint.path, method: endpoint.method },
    });
  } else if (endpoint.method === 'POST') {
    res = http.post(url, JSON.stringify({}), {
      headers: getSessionHeaders(),
      tags: { name: endpoint.path, method: endpoint.method },
    });
  }
  
  const duration = Date.now() - startTime;
  endpointDurations[metricName].add(duration);
  
  const success = check(res, {
    [`${endpoint.path} status is 200 or 401`]: (r) => r.status === 200 || r.status === 401,
    [`${endpoint.path} response time < 5s`]: (r) => r.timings.duration < 5000,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  // Sleep aleatorio entre 1-4 segundos (simular comportamiento real)
  sleep(Math.random() * 3 + 1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'tests/k6/results/full-load-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  let summary = '\n';
  summary += '═══════════════════════════════════════════════════════════\n';
  summary += '  📊 PRUEBA DE CARGA COMPLETA\n';
  summary += '═══════════════════════════════════════════════════════════\n\n';
  
  summary += `⏱️  Duración: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  summary += `📈 Requests totales: ${data.metrics.http_reqs?.values?.count || 0}\n`;
  summary += `🚀 Requests/segundo: ${(data.metrics.http_reqs?.values?.rate || 0).toFixed(2)}\n\n`;
  
  summary += '📉 LATENCIA:\n';
  summary += `   Promedio: ${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms\n`;
  summary += `   p95: ${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += `   p99: ${(data.metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms\n\n`;
  
  summary += `❌ Tasa de errores: ${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  summary += `✅ Checks pasados: ${data.root_group?.checks?.filter(c => c.passes > 0).length || 0}\n`;
  summary += `❌ Checks fallidos: ${data.root_group?.checks?.filter(c => c.fails > 0).length || 0}\n`;
  summary += '═══════════════════════════════════════════════════════════\n';
  
  return summary;
}
