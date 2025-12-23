/**
 * Prueba específica de Riesgos - Endpoint pesado
 * 
 * Enfocado en /api/risks/bootstrap que es uno de los endpoints más pesados
 * Útil para detectar problemas específicos de este endpoint
 * 
 * Ejecutar: k6 run tests/k6/risks-heavy.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const risksDuration = new Trend('risks_duration');

export const options = {
  stages: [
    { duration: '1m', target: 30 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // Thresholds específicos para risks/bootstrap
    risks_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.80'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://unigrc-backend-7joma3s3xa-tl.a.run.app';

export default function () {
  // Probar risks/bootstrap con diferentes parámetros
  const params = [
    '',
    '?limit=50',
    '?limit=100',
    '?offset=0&limit=50',
  ];
  
  const param = params[Math.floor(Math.random() * params.length)];
  const endpoint = `/api/risks/bootstrap${param}`;
  
  const res = http.get(`${BASE_URL}${endpoint}`, {
    tags: { name: 'Risks Bootstrap' },
  });
  
  const isOk = res.status === 200 || res.status === 401 || res.status === 403;
  check(res, {
    'risks bootstrap status is valid': (r) => isOk,
    'risks bootstrap response time < 5s': (r) => r.timings.duration < 5000,
  });
  
  if (!isOk && res.status >= 500) {
    errorRate.add(1);
  }
  
  risksDuration.add(res.timings.duration);
  sleep(2); // Sleep de 2s entre requests (simular uso real)
}

export function handleSummary(data) {
  const risksAvg = (data.metrics.risks_duration?.values?.avg || 0).toFixed(2);
  const risksP95 = (data.metrics.risks_duration?.values?.['p(95)'] || 0).toFixed(2);
  const risksP99 = (data.metrics.risks_duration?.values?.['p(99)'] || 0).toFixed(2);
  const totalReqs = data.metrics.http_reqs?.values?.count || 0;
  
  return {
    'stdout': `
═══════════════════════════════════════════════════════════
  📊 PRUEBA ESPECÍFICA: RISKS/BOOTSTRAP
═══════════════════════════════════════════════════════════

📈 Requests totales: ${totalReqs}
📉 Latencia promedio: ${risksAvg}ms
📉 Latencia p95: ${risksP95}ms
📉 Latencia p99: ${risksP99}ms

═══════════════════════════════════════════════════════════
`,
    'tests/k6/results/risks-heavy-summary.json': JSON.stringify(data, null, 2),
  };
}
