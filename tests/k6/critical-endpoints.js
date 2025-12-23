/**
 * Prueba de estrés - Endpoints críticos
 * 
 * Prueba los endpoints más importantes y pesados del sistema:
 * - /api/risks/bootstrap (endpoint principal de riesgos)
 * - /api/controls/with-details (endpoint optimizado de controles)
 * - /api/validation/counts (centro de validación)
 * 
 * Ejecutar: k6 run tests/k6/critical-endpoints.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Métricas personalizadas
const errorRate = new Rate('errors');
const risksDuration = new Trend('risks_bootstrap_duration');
const controlsDuration = new Trend('controls_with_details_duration');
const validationDuration = new Trend('validation_counts_duration');
const requestCounter = new Counter('total_requests');

// Configuración - Escenario más realista
export const options = {
  stages: [
    { duration: '1m', target: 30 },   // Ramp up suave
    { duration: '2m', target: 50 },   // Aumentar carga
    { duration: '3m', target: 100 },  // Carga máxima
    { duration: '2m', target: 100 },  // Mantener carga máxima
    { duration: '1m', target: 50 },   // Reducir gradualmente
    { duration: '30s', target: 0 },    // Finalizar
  ],
  thresholds: {
    // Thresholds específicos por endpoint
    'risks_bootstrap_duration': ['p(95)<2000', 'p(99)<5000'],
    'controls_with_details_duration': ['p(95)<1000', 'p(99)<3000'],
    'validation_counts_duration': ['p(95)<500', 'p(99)<1000'],
    
    // Thresholds globales
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const VUS = parseInt(__ENV.VUS) || 50;

// Simular sesión de usuario (cookies básicas)
function getSessionHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export default function () {
  // Test 1: Risks Bootstrap (endpoint más pesado)
  const risksStart = Date.now();
  const risksRes = http.get(`${BASE_URL}/api/risks/bootstrap`, {
    headers: getSessionHeaders(),
    tags: { name: 'Risks Bootstrap', endpoint: 'risks-bootstrap' },
  });
  
  const risksDurationMs = Date.now() - risksStart;
  risksDuration.add(risksDurationMs);
  requestCounter.add(1);
  
  const risksCheck = check(risksRes, {
    'risks bootstrap status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'risks bootstrap response time < 5s': (r) => r.timings.duration < 5000,
  });
  
  if (!risksCheck) {
    errorRate.add(1);
    console.error(`❌ Risks bootstrap failed: ${risksRes.status} - ${risksRes.url}`);
  }
  
  sleep(Math.random() * 2 + 1); // Sleep aleatorio entre 1-3s

  // Test 2: Controls with Details (endpoint optimizado recientemente)
  const controlsStart = Date.now();
  const controlsRes = http.get(`${BASE_URL}/api/controls/with-details?limit=50&offset=0`, {
    headers: getSessionHeaders(),
    tags: { name: 'Controls with Details', endpoint: 'controls-with-details' },
  });
  
  const controlsDurationMs = Date.now() - controlsStart;
  controlsDuration.add(controlsDurationMs);
  requestCounter.add(1);
  
  const controlsCheck = check(controlsRes, {
    'controls with details status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'controls with details response time < 3s': (r) => r.timings.duration < 3000,
  });
  
  if (!controlsCheck) {
    errorRate.add(1);
    console.error(`❌ Controls with details failed: ${controlsRes.status} - ${controlsRes.url}`);
  }
  
  sleep(Math.random() * 2 + 1);

  // Test 3: Validation Counts (centro de validación)
  const validationStart = Date.now();
  const validationRes = http.get(`${BASE_URL}/api/validation/counts`, {
    headers: getSessionHeaders(),
    tags: { name: 'Validation Counts', endpoint: 'validation-counts' },
  });
  
  const validationDurationMs = Date.now() - validationStart;
  validationDuration.add(validationDurationMs);
  requestCounter.add(1);
  
  const validationCheck = check(validationRes, {
    'validation counts status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'validation counts response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!validationCheck) {
    errorRate.add(1);
    console.error(`❌ Validation counts failed: ${validationRes.status} - ${validationRes.url}`);
  }
  
  sleep(Math.random() * 3 + 2); // Sleep aleatorio entre 2-5s
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    test: 'critical-endpoints',
    duration: `${(data.state.testRunDurationMs / 1000).toFixed(2)}s`,
    metrics: {
      total_requests: data.metrics.http_reqs?.values?.count || 0,
      requests_per_second: data.metrics.http_reqs?.values?.rate?.toFixed(2) || '0',
      errors: {
        rate: `${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`,
        count: data.metrics.http_req_failed?.values?.passes || 0,
      },
      latency: {
        avg: `${data.metrics.http_req_duration?.values?.avg?.toFixed(2)}ms`,
        p95: `${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2)}ms`,
        p99: `${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2)}ms`,
      },
      endpoints: {
        risks_bootstrap: {
          avg: `${data.metrics.risks_bootstrap_duration?.values?.avg?.toFixed(2)}ms`,
          p95: `${data.metrics.risks_bootstrap_duration?.values?.['p(95)']?.toFixed(2)}ms`,
          p99: `${data.metrics.risks_bootstrap_duration?.values?.['p(99)']?.toFixed(2)}ms`,
        },
        controls_with_details: {
          avg: `${data.metrics.controls_with_details_duration?.values?.avg?.toFixed(2)}ms`,
          p95: `${data.metrics.controls_with_details_duration?.values?.['p(95)']?.toFixed(2)}ms`,
          p99: `${data.metrics.controls_with_details_duration?.values?.['p(99)']?.toFixed(2)}ms`,
        },
        validation_counts: {
          avg: `${data.metrics.validation_counts_duration?.values?.avg?.toFixed(2)}ms`,
          p95: `${data.metrics.validation_counts_duration?.values?.['p(95)']?.toFixed(2)}ms`,
          p99: `${data.metrics.validation_counts_duration?.values?.['p(99)']?.toFixed(2)}ms`,
        },
      },
    },
    thresholds: {
      passed: data.root_group?.checks?.filter(c => c.passes > 0).length || 0,
      failed: data.root_group?.checks?.filter(c => c.fails > 0).length || 0,
    },
  };

  return {
    'stdout': formatSummary(summary),
    'tests/k6/results/critical-summary.json': JSON.stringify(summary, null, 2),
  };
}

function formatSummary(summary) {
  let output = '\n';
  output += '═══════════════════════════════════════════════════════════\n';
  output += '  📊 RESUMEN DE PRUEBA DE ESTRÉS - ENDPOINTS CRÍTICOS\n';
  output += '═══════════════════════════════════════════════════════════\n\n';
  
  output += `⏱️  Duración: ${summary.duration}\n`;
  output += `📈 Requests totales: ${summary.metrics.total_requests}\n`;
  output += `🚀 Requests/segundo: ${summary.metrics.requests_per_second}\n\n`;
  
  output += '📉 LATENCIA GLOBAL:\n';
  output += `   Promedio: ${summary.metrics.latency.avg}\n`;
  output += `   p95: ${summary.metrics.latency.p95}\n`;
  output += `   p99: ${summary.metrics.latency.p99}\n\n`;
  
  output += '🎯 ENDPOINTS ESPECÍFICOS:\n';
  output += `   Risks Bootstrap:\n`;
  output += `     - Promedio: ${summary.metrics.endpoints.risks_bootstrap.avg}\n`;
  output += `     - p95: ${summary.metrics.endpoints.risks_bootstrap.p95}\n`;
  output += `     - p99: ${summary.metrics.endpoints.risks_bootstrap.p99}\n`;
  output += `   Controls with Details:\n`;
  output += `     - Promedio: ${summary.metrics.endpoints.controls_with_details.avg}\n`;
  output += `     - p95: ${summary.metrics.endpoints.controls_with_details.p95}\n`;
  output += `     - p99: ${summary.metrics.endpoints.controls_with_details.p99}\n`;
  output += `   Validation Counts:\n`;
  output += `     - Promedio: ${summary.metrics.endpoints.validation_counts.avg}\n`;
  output += `     - p95: ${summary.metrics.endpoints.validation_counts.p95}\n`;
  output += `     - p99: ${summary.metrics.endpoints.validation_counts.p99}\n\n`;
  
  output += `❌ Errores: ${summary.metrics.errors.rate} (${summary.metrics.errors.count} requests)\n\n`;
  
  output += `✅ Checks pasados: ${summary.thresholds.passed}\n`;
  output += `❌ Checks fallidos: ${summary.thresholds.failed}\n`;
  output += '═══════════════════════════════════════════════════════════\n';
  
  return output;
}
